-- ==============================================================================
-- DIGNITY ADMIN COMMAND CENTER - MIGRATION 022:
-- ENFORCE LEADER IMMUTABLE EMAIL LOCK & GROUP AUTHORIZATION GUARD
-- LPK Indonesia Dignity (Hybrid Architecture: Google Workspace + Supabase Cloud)
-- ==============================================================================
-- Deskripsi:
-- 1. Mengunci identitas Ketua Rombongan secara permanen pada email terdaftar
--    (registrations.person_id -> persons.email_normalized), tidak dapat diubah (immutable).
-- 2. Membedakan Ketua vs Anggota berdasarkan relasi person_id induk & kolom 'city' (Asal Kota).
-- 3. Membatasi hak pengisian/perubahan data anggota (Slot B s/d K) HANYA untuk Ketua Rombongan
--    atau Admin Console. Akses unauthorized ditolak atomik dengan kode FORBIDDEN_NOT_LEADER.
-- 4. Slot A diproteksi permanen dari penimpaan (overwriting).
-- 5. RPC get_group_registration_details menyertakan flag 'auth_is_leader' dan data kota ketua.
-- ==============================================================================

-- 1. FUNGSI UTAMA: SUBMIT GROUP MEMBERS DENGAN OTORISASI KETUA
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.submit_group_members(UUID, JSONB, TEXT);
DROP FUNCTION IF EXISTS public.submit_group_members(UUID, JSONB, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.submit_group_members(
  p_registration_id UUID,
  p_members JSONB,
  p_submitted_by TEXT DEFAULT 'SELF_SERVICE',
  p_auth_credential TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg RECORD;
  v_event RECORD;
  v_leader RECORD;
  v_clean_auth TEXT;
  v_clean_phone TEXT;
  
  v_base_ticket TEXT;
  v_base_ticket_prefix TEXT;
  v_max_pax INT := 6;
  v_is_active BOOLEAN := false;
  v_ticket_status TEXT := 'PENDING';
  
  v_item JSONB;
  v_suffix TEXT;
  v_nama TEXT;
  v_email TEXT;
  v_clean_wa TEXT;
  v_institution TEXT;
  v_person_id UUID;
  v_member_id UUID;
  v_sub_ticket_code TEXT;
  
  v_processed_count INT := 0;
  v_deleted_count INT := 0;
  v_slot_char CHAR(1);
BEGIN
  -- A. Validasi ID Registrasi
  SELECT * INTO v_reg
  FROM public.registrations
  WHERE id = p_registration_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'NOT_FOUND',
      'message', 'Data registrasi tidak ditemukan atau telah dihapus.'
    );
  END IF;

  SELECT * INTO v_event FROM public.events WHERE id = v_reg.event_id;
  SELECT * INTO v_leader FROM public.persons WHERE id = v_reg.person_id;

  IF v_leader IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'LEADER_NOT_FOUND',
      'message', 'Data profil ketua rombongan tidak ditemukan.'
    );
  END IF;

  -- B. Enforcement Hak Otorisasi: HANYA KETUA YANG BISA MENGISI
  IF p_submitted_by != 'ADMIN_CONSOLE' THEN
    v_clean_auth := LOWER(TRIM(COALESCE(p_auth_credential, '')));
    v_clean_phone := public.normalize_indonesia_phone(COALESCE(p_auth_credential, ''));

    IF v_clean_auth = '' OR (
      v_clean_auth != v_leader.email_normalized 
      AND (v_clean_phone IS NULL OR v_clean_phone != v_leader.whatsapp_normalized)
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'FORBIDDEN_NOT_LEADER',
        'message', 'Akses Ditolak: Hanya Ketua Rombongan (' || v_leader.full_name || ' / ' || v_leader.email || ') yang memiliki hak untuk mengisi atau memperbarui data anggota.'
      );
    END IF;
  END IF;

  -- C. Tentukan Kapasitas Rombongan Berdasarkan Paket / Nominal
  IF v_reg.package_type IN ('KOMUNITAS_11', 'MABAR_11', 'GROUP_11') 
     OR v_reg.total_due >= 1000000 
     OR COALESCE(v_reg.custom_notes, '') ILIKE '%11%' 
     OR COALESCE(v_reg.custom_notes, '') ILIKE '%komunitas%' THEN
    v_max_pax := 11;
  ELSE
    v_max_pax := 6;
  END IF;

  -- D. Cari Nomor Tiket Induk (Base Ticket)
  SELECT ticket_code INTO v_base_ticket
  FROM public.tickets
  WHERE registration_id = p_registration_id
    AND (registration_member_id IS NULL OR is_mabar_leader = TRUE)
  ORDER BY issued_at ASC, id ASC
  LIMIT 1;

  IF v_base_ticket IS NULL THEN
    SELECT ticket_code INTO v_base_ticket
    FROM public.tickets
    WHERE registration_id = p_registration_id
    ORDER BY issued_at ASC, id ASC
    LIMIT 1;
  END IF;

  IF v_base_ticket IS NULL THEN
    v_base_ticket := 'TICKET-DIGNITY-' || UPPER(SUBSTRING(p_registration_id::TEXT FROM 1 FOR 6));
  END IF;

  -- Bersihkan suffix jika ada
  v_base_ticket_prefix := REGEXP_REPLACE(v_base_ticket, '-[A-Z]$', '');

  -- E. Status Tiket & Pembayaran
  v_is_active := (v_reg.status::TEXT IN ('PAID', 'CONFIRMED', 'ATTENDED', 'VERIFIED'));
  IF v_is_active THEN
    v_ticket_status := 'ISSUED';
  ELSE
    v_ticket_status := 'PENDING';
  END IF;

  -- F. Iterasi Setiap Anggota yang Disubmit
  IF p_members IS NOT NULL AND jsonb_typeof(p_members) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_members)
    LOOP
      v_suffix := UPPER(TRIM(COALESCE(v_item->>'suffix', '')));
      v_nama := TRIM(COALESCE(v_item->>'nama', v_item->>'full_name', ''));
      v_email := LOWER(TRIM(COALESCE(v_item->>'email', '')));
      v_clean_wa := public.normalize_indonesia_phone(COALESCE(v_item->>'whatsapp', v_item->>'phone', ''));
      v_institution := TRIM(COALESCE(v_item->>'institution', v_leader.institution, ''));

      -- 1. Proteksi Mutlak: Slot A adalah Ketua yang terkunci permanen, tidak boleh diubah
      IF v_suffix = 'A' THEN
        CONTINUE;
      END IF;

      -- 2. Validasi Suffix Berada dalam Batas Kapasitas Pax
      IF v_suffix ~ '^[B-K]$' THEN
        v_slot_char := v_suffix::CHAR(1);
        
        -- Cek apakah suffix melebihi batas (misal F untuk 6 pax, K untuk 11 pax)
        IF (v_max_pax = 6 AND ASCII(v_slot_char) > ASCII('F')) OR
           (v_max_pax = 11 AND ASCII(v_slot_char) > ASCII('K')) THEN
          CONTINUE;
        END IF;

        v_sub_ticket_code := v_base_ticket_prefix || '-' || v_suffix;

        -- Jika nama dikosongkan, artinya slot ini direset/dihapus
        IF v_nama = '' THEN
          SELECT id INTO v_member_id
          FROM public.registration_members
          WHERE registration_id = p_registration_id AND ticket_suffix = v_suffix
          LIMIT 1;

          IF v_member_id IS NOT NULL THEN
            DELETE FROM public.tickets WHERE registration_member_id = v_member_id;
            DELETE FROM public.registration_members WHERE id = v_member_id;
            v_deleted_count := v_deleted_count + 1;
          END IF;
        ELSE
          -- Upsert Person Anggota
          v_person_id := NULL;
          IF v_email != '' THEN
            SELECT id INTO v_person_id FROM public.persons WHERE email_normalized = v_email LIMIT 1;
          END IF;
          IF v_person_id IS NULL AND v_clean_wa IS NOT NULL AND v_clean_wa != '' THEN
            SELECT id INTO v_person_id FROM public.persons WHERE whatsapp_normalized = v_clean_wa LIMIT 1;
          END IF;

          IF v_person_id IS NOT NULL THEN
            UPDATE public.persons
            SET full_name = v_nama,
                email = COALESCE(NULLIF(v_email, ''), email),
                email_normalized = COALESCE(NULLIF(v_email, ''), email_normalized),
                whatsapp = COALESCE(NULLIF(v_clean_wa, ''), whatsapp),
                whatsapp_normalized = COALESCE(NULLIF(v_clean_wa, ''), whatsapp_normalized),
                institution = COALESCE(NULLIF(v_institution, ''), institution),
                updated_at = now()
            WHERE id = v_person_id;
          ELSE
            INSERT INTO public.persons (
              full_name, email, email_normalized, whatsapp, whatsapp_normalized, institution, city
            ) VALUES (
              v_nama,
              NULLIF(v_email, ''),
              NULLIF(v_email, ''),
              NULLIF(v_clean_wa, ''),
              NULLIF(v_clean_wa, ''),
              NULLIF(v_institution, ''),
              NULL -- Anggota tidak wajib memiliki data kota, membedakan dari ketua
            ) RETURNING id INTO v_person_id;
          END IF;

          -- Upsert Registration Member
          SELECT id INTO v_member_id
          FROM public.registration_members
          WHERE registration_id = p_registration_id AND ticket_suffix = v_suffix
          LIMIT 1;

          IF v_member_id IS NOT NULL THEN
            UPDATE public.registration_members
            SET person_id = v_person_id,
                member_role = 'MEMBER'
            WHERE id = v_member_id;
          ELSE
            DELETE FROM public.registration_members
            WHERE registration_id = p_registration_id AND person_id = v_person_id;

            INSERT INTO public.registration_members (
              registration_id, person_id, member_role, ticket_suffix
            ) VALUES (
              p_registration_id, v_person_id, 'MEMBER', v_suffix
            ) RETURNING id INTO v_member_id;
          END IF;

          -- Upsert Sub-Tiket di tabel tickets
          INSERT INTO public.tickets (
            registration_id, registration_member_id, ticket_code, qr_code_payload, status, is_mabar_leader, issued_at
          ) VALUES (
            p_registration_id, v_member_id, v_sub_ticket_code, v_sub_ticket_code, v_ticket_status, FALSE, now()
          )
          ON CONFLICT (ticket_code) DO UPDATE
          SET registration_member_id = EXCLUDED.registration_member_id,
              qr_code_payload = EXCLUDED.qr_code_payload,
              status = EXCLUDED.status,
              is_mabar_leader = FALSE,
              issued_at = COALESCE(public.tickets.issued_at, now());

          v_processed_count := v_processed_count + 1;
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Data anggota rombongan berhasil disimpan. E-Tiket otomatis diterbitkan.',
    'registration_id', p_registration_id,
    'base_ticket_code', v_base_ticket_prefix,
    'max_pax', v_max_pax,
    'processed_count', v_processed_count,
    'deleted_count', v_deleted_count,
    'is_ticket_active', v_is_active
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_group_members(UUID, JSONB, TEXT, TEXT) TO anon, authenticated, service_role;


-- 2. FUNGSI STATUS & ROSTER DETAIL: GET GROUP REGISTRATION DETAILS
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_group_registration_details(TEXT);

CREATE OR REPLACE FUNCTION public.get_group_registration_details(p_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_search TEXT;
  v_clean_phone TEXT;
  v_reg RECORD;
  v_event RECORD;
  v_leader RECORD;
  v_base_ticket TEXT;
  v_base_ticket_prefix TEXT;
  v_max_pax INT := 6;
  v_is_active BOOLEAN := false;
  v_package_label TEXT;
  v_auth_is_leader BOOLEAN := false;
  
  v_slots JSONB := '[]'::JSONB;
  v_slot_idx INT;
  v_suffix_char CHAR(1);
  v_member_rec RECORD;
  v_slot_ticket_code TEXT;
  v_slot_ticket_status TEXT;
  v_slot_ticket_sent TIMESTAMPTZ;
  v_filled_count INT := 1; -- Leader selalu dihitung 1
BEGIN
  v_clean_search := TRIM(COALESCE(p_query, ''));
  v_clean_phone := public.normalize_indonesia_phone(v_clean_search);

  IF v_clean_search = '' THEN
    RETURN jsonb_build_object('found', false, 'message', 'Kata kunci pencarian tidak boleh kosong.');
  END IF;

  -- 1. Cari Registrasi Induk
  SELECT r.* INTO v_reg
  FROM public.registrations r
  JOIN public.persons p ON p.id = r.person_id
  LEFT JOIN public.tickets t ON t.registration_id = r.id
  WHERE r.deleted_at IS NULL AND r.status::TEXT != 'CANCELLED'
    AND (
      r.id::TEXT = v_clean_search
      OR t.ticket_code ILIKE v_clean_search
      OR p.email_normalized = LOWER(v_clean_search)
      OR (v_clean_phone IS NOT NULL AND p.whatsapp_normalized = v_clean_phone)
    )
  ORDER BY r.created_at DESC
  LIMIT 1;

  -- Jika tidak ditemukan di registrasi induk, cek apakah dia anggota rombongan
  IF NOT FOUND THEN
    SELECT r.* INTO v_reg
    FROM public.registration_members rm
    JOIN public.registrations r ON r.id = rm.registration_id
    JOIN public.persons p ON p.id = rm.person_id
    LEFT JOIN public.tickets t ON t.registration_member_id = rm.id
    WHERE r.deleted_at IS NULL AND r.status::TEXT != 'CANCELLED'
      AND (
        t.ticket_code ILIKE v_clean_search
        OR p.email_normalized = LOWER(v_clean_search)
        OR (v_clean_phone IS NOT NULL AND p.whatsapp_normalized = v_clean_phone)
      )
    ORDER BY r.created_at DESC
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false, 'message', 'Data pendaftaran rombongan tidak ditemukan.');
  END IF;

  -- 2. Ambil Data Event & Leader
  SELECT * INTO v_event FROM public.events WHERE id = v_reg.event_id;
  SELECT * INTO v_leader FROM public.persons WHERE id = v_reg.person_id;

  -- Evaluasi apakah query pencarian cocok dengan kredensial ketua
  IF v_leader IS NOT NULL THEN
    v_auth_is_leader := (
      LOWER(v_clean_search) = v_leader.email_normalized 
      OR (v_clean_phone IS NOT NULL AND v_clean_phone = v_leader.whatsapp_normalized)
    );
  END IF;

  -- 3. Tentukan Kapasitas Pax & Label Paket
  IF v_reg.package_type IN ('KOMUNITAS_11', 'MABAR_11', 'GROUP_11') 
     OR v_reg.total_due >= 1000000 
     OR COALESCE(v_reg.custom_notes, '') ILIKE '%11%' 
     OR COALESCE(v_reg.custom_notes, '') ILIKE '%komunitas%' THEN
    v_max_pax := 11;
    v_package_label := 'Promo Komunitas (11 Orang • 10+1)';
  ELSIF v_reg.package_type IN ('MABAR_6', 'MABAR', 'GROUP') OR v_reg.total_due = 500000 THEN
    v_max_pax := 6;
    v_package_label := 'Promo Mabar (6 Orang • 5+1)';
  ELSE
    v_max_pax := 1;
    v_package_label := 'Tiket Individu (1 Pax)';
  END IF;

  -- 4. Ambil Base Ticket Code
  SELECT ticket_code INTO v_base_ticket
  FROM public.tickets
  WHERE registration_id = v_reg.id
    AND (registration_member_id IS NULL OR is_mabar_leader = TRUE)
  ORDER BY issued_at ASC, id ASC
  LIMIT 1;

  IF v_base_ticket IS NULL THEN
    SELECT ticket_code INTO v_base_ticket
    FROM public.tickets
    WHERE registration_id = v_reg.id
    ORDER BY issued_at ASC, id ASC
    LIMIT 1;
  END IF;

  IF v_base_ticket IS NULL THEN
    v_base_ticket := 'TICKET-DIGNITY-' || UPPER(SUBSTRING(v_reg.id::TEXT FROM 1 FOR 6));
  END IF;

  v_base_ticket_prefix := REGEXP_REPLACE(v_base_ticket, '-[A-Z]$', '');

  -- 5. Susun Roster Lengkap
  -- Slot A: Leader (Selalu Terisi, Terkunci Permanen pada Email Terdaftar & Memiliki Data Kota)
  SELECT sent_at INTO v_slot_ticket_sent
  FROM public.tickets
  WHERE registration_id = v_reg.id AND (registration_member_id IS NULL OR is_mabar_leader = TRUE)
  LIMIT 1;

  v_slots := jsonb_build_array(
    jsonb_build_object(
      'suffix', 'A',
      'role', 'LEADER',
      'is_leader', true,
      'is_immutable', true,
      'ticket_code', v_base_ticket_prefix,
      'full_name', v_leader.full_name,
      'email', v_leader.email,
      'whatsapp', v_leader.whatsapp,
      'institution', v_leader.institution,
      'city', v_leader.city, -- Pembeda unik ketua
      'status', 'ISSUED',
      'sent_at', v_slot_ticket_sent,
      'is_filled', true
    )
  );

  -- Slot B s/d Kapasitas Maksimal
  FOR v_slot_idx IN 2..v_max_pax LOOP
    v_suffix_char := CHR(ASCII('A') + v_slot_idx - 1);
    v_slot_ticket_code := v_base_ticket_prefix || '-' || v_suffix_char;
    
    SELECT 
      p.full_name,
      p.email,
      p.whatsapp,
      p.institution,
      p.city,
      t.ticket_code,
      t.status AS ticket_status,
      t.sent_at AS ticket_sent_at
    INTO v_member_rec
    FROM public.registration_members rm
    JOIN public.persons p ON p.id = rm.person_id
    LEFT JOIN public.tickets t ON t.registration_member_id = rm.id
    WHERE rm.registration_id = v_reg.id AND rm.ticket_suffix = v_suffix_char
    LIMIT 1;

    IF FOUND THEN
      v_filled_count := v_filled_count + 1;
      v_slots := v_slots || jsonb_build_object(
        'suffix', v_suffix_char,
        'role', 'MEMBER',
        'is_leader', false,
        'is_immutable', false,
        'ticket_code', COALESCE(v_member_rec.ticket_code, v_slot_ticket_code),
        'full_name', v_member_rec.full_name,
        'email', v_member_rec.email,
        'whatsapp', v_member_rec.whatsapp,
        'institution', v_member_rec.institution,
        'city', v_member_rec.city,
        'status', COALESCE(v_member_rec.ticket_status, 'ISSUED'),
        'sent_at', v_member_rec.ticket_sent_at,
        'is_filled', true
      );
    ELSE
      v_slots := v_slots || jsonb_build_object(
        'suffix', v_suffix_char,
        'role', 'MEMBER',
        'is_leader', false,
        'is_immutable', false,
        'ticket_code', v_slot_ticket_code,
        'full_name', NULL,
        'email', NULL,
        'whatsapp', NULL,
        'institution', NULL,
        'city', NULL,
        'status', 'UNFILLED',
        'sent_at', NULL,
        'is_filled', false
      );
    END IF;
  END LOOP;

  v_is_active := (v_reg.status::TEXT IN ('PAID', 'CONFIRMED', 'ATTENDED', 'VERIFIED'));

  RETURN jsonb_build_object(
    'found', true,
    'registration_id', v_reg.id,
    'event_id', v_reg.event_id,
    'event_title', v_event.title,
    'event_date_start', v_event.date_start,
    'package_type', v_reg.package_type,
    'package_label', v_package_label,
    'total_due', v_reg.total_due,
    'total_pax', v_max_pax,
    'filled_count', v_filled_count,
    'pending_count', (v_max_pax - v_filled_count),
    'is_all_filled', (v_filled_count >= v_max_pax),
    'is_ticket_active', v_is_active,
    'base_ticket_code', v_base_ticket_prefix,
    'auth_is_leader', v_auth_is_leader,
    'leader', jsonb_build_object(
      'full_name', v_leader.full_name,
      'email', v_leader.email,
      'whatsapp', v_leader.whatsapp,
      'institution', v_leader.institution,
      'city', v_leader.city,
      'is_leader', true
    ),
    'slots', v_slots
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_group_registration_details(TEXT) TO anon, authenticated, service_role;
