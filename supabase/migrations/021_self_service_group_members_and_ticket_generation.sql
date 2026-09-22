-- ==============================================================================
-- DIGNITY ADMIN COMMAND CENTER - MIGRATION 021:
-- SELF-SERVICE GROUP MEMBER INGESTION & SUB-TICKET GENERATION (11 PAX & 6 PAX)
-- LPK Indonesia Dignity (Hybrid Architecture: Google Workspace + Supabase Cloud)
-- ==============================================================================
-- Deskripsi:
-- 1. Menghilangkan 100% beban input manual admin untuk pendaftaran rombongan
--    (Promo Komunitas 11 Pax • 10+1 seharga Rp 1.000.000 & Promo Mabar 6 Pax).
-- 2. Membangun RPC 'submit_group_members':
--    - Menerima input data anggota rombongan langsung dari web portal (self-service).
--    - Upsert ke tabel persons & registration_members secara atomik dan aman dari race condition.
--    - Otomatis menerbitkan sub-tiket resmi (-B s/d -K untuk 11 Pax, -B s/d -F untuk 6 Pax)
--      ke dalam tabel tickets dengan status ISSUED (jika sudah lunas) atau PENDING (jika belum lunas).
-- 3. Membangun RPC 'get_group_registration_details':
--    - Mengembalikan slot roster lengkap (A s/d K) beserta status terisi vs slot kosong
--      untuk dirender pada formulir publik dan Admin Command Center.
-- 4. Buka RLS & Permission eksekusi untuk anon, authenticated, dan service_role.
-- ==============================================================================

-- 1. FUNGSI UTAMA: SUBMIT GROUP MEMBERS (Self-Service Ingestion)
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.submit_group_members(UUID, JSONB, TEXT);

CREATE OR REPLACE FUNCTION public.submit_group_members(
  p_registration_id UUID,
  p_members JSONB,
  p_submitted_by TEXT DEFAULT 'SELF_SERVICE'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg RECORD;
  v_event RECORD;
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
  v_city TEXT;
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
      'message', 'Data registrasi tidak ditemukan atau telah dihapus.'
    );
  END IF;

  SELECT * INTO v_event FROM public.events WHERE id = v_reg.event_id;

  -- B. Tentukan Kapasitas Rombongan Berdasarkan Paket / Nominal
  IF v_reg.package_type IN ('KOMUNITAS_11', 'MABAR_11', 'GROUP_11') 
     OR v_reg.total_due >= 1000000 
     OR COALESCE(v_reg.custom_notes, '') ILIKE '%11%' 
     OR COALESCE(v_reg.custom_notes, '') ILIKE '%komunitas%' THEN
    v_max_pax := 11;
  ELSE
    v_max_pax := 6;
  END IF;

  -- C. Cari Nomor Tiket Induk (Base Ticket)
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

  -- Bersihkan suffix jika base ticket memiliki '-A'
  IF v_base_ticket LIKE '%-A' THEN
    v_base_ticket_prefix := SUBSTRING(v_base_ticket FROM 1 FOR LENGTH(v_base_ticket) - 2);
  ELSE
    v_base_ticket_prefix := v_base_ticket;
  END IF;

  -- D. Evaluasi Status Keaktifan Tiket (PAID / VERIFIED)
  v_is_active := (v_reg.status::TEXT IN ('PAID', 'CONFIRMED', 'ATTENDED', 'VERIFIED'))
    OR EXISTS (
      SELECT 1 FROM public.payments p 
      WHERE p.registration_id = p_registration_id AND p.status = 'VERIFIED'
    );
  
  v_ticket_status := CASE WHEN v_is_active THEN 'ISSUED' ELSE 'PENDING' END;

  -- Pastikan tiket pendaftar utama (Leader - Slot A) ada dan sesuai
  INSERT INTO public.tickets (
    registration_id, registration_member_id, ticket_code, qr_code_payload, status, is_mabar_leader, issued_at
  ) VALUES (
    p_registration_id, NULL, v_base_ticket_prefix, v_base_ticket_prefix, v_ticket_status, TRUE, now()
  )
  ON CONFLICT (ticket_code) DO UPDATE
  SET status = EXCLUDED.status,
      is_mabar_leader = TRUE;

  -- E. Iterasi dan Proses Tiap Anggota dalam Array JSONB
  IF p_members IS NOT NULL AND jsonb_typeof(p_members) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_members) LOOP
      -- Ekstrak Data Slot
      v_suffix := UPPER(TRIM(COALESCE(v_item->>'suffix', '')));
      v_nama := TRIM(COALESCE(v_item->>'nama', v_item->>'full_name', ''));
      v_email := LOWER(TRIM(COALESCE(v_item->>'email', '')));
      v_clean_wa := public.normalize_indonesia_phone(v_item->>'whatsapp');
      v_institution := COALESCE(NULLIF(TRIM(v_item->>'institution'), ''), '-');
      v_city := COALESCE(NULLIF(TRIM(v_item->>'city'), ''), 'Surakarta');

      -- Hanya proses suffix B s/d K (Slot A dicadangkan untuk Pemesan/Leader)
      IF v_suffix >= 'B' AND v_suffix <= CHR(64 + v_max_pax) THEN
        v_sub_ticket_code := v_base_ticket_prefix || '-' || v_suffix;

        -- Kasus 1: Slot Dikosongkan / Dihapus
        IF v_nama = '' OR LENGTH(v_nama) < 2 THEN
          DELETE FROM public.tickets
          WHERE registration_id = p_registration_id AND ticket_code = v_sub_ticket_code;

          DELETE FROM public.registration_members
          WHERE registration_id = p_registration_id AND ticket_suffix = v_suffix;

          v_deleted_count := v_deleted_count + 1;
        ELSE
          -- Kasus 2: Slot Diisi / Diperbarui
          v_person_id := NULL;

          -- Cari orang yang cocok berdasarkan email atau nomor telepon
          SELECT id INTO v_person_id
          FROM public.persons
          WHERE (v_email != '' AND email_normalized = v_email)
             OR (v_clean_wa IS NOT NULL AND whatsapp_normalized = v_clean_wa)
          LIMIT 1;

          IF v_person_id IS NULL THEN
            INSERT INTO public.persons (
              full_name, email, whatsapp, institution, city
            ) VALUES (
              v_nama,
              NULLIF(v_email, ''),
              v_clean_wa,
              v_institution,
              v_city
            ) RETURNING id INTO v_person_id;
          ELSE
            UPDATE public.persons
            SET
              full_name = v_nama,
              email = COALESCE(NULLIF(v_email, ''), email),
              whatsapp = COALESCE(v_clean_wa, whatsapp),
              institution = CASE WHEN v_institution != '-' THEN v_institution ELSE institution END,
              city = CASE WHEN v_city != 'Surakarta' THEN v_city ELSE city END,
              updated_at = now()
            WHERE id = v_person_id;
          END IF;

          -- Upsert ke registration_members
          v_member_id := NULL;
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
            -- Pastikan person_id belum terpakai di suffix lain dalam rombongan ini
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

GRANT EXECUTE ON FUNCTION public.submit_group_members TO anon, authenticated, service_role;


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
    v_base_ticket := 'TICKET-DIGNITY-' || UPPER(SUBSTRING(v_reg.id::TEXT FROM 1 FOR 6));
  END IF;

  IF v_base_ticket LIKE '%-A' THEN
    v_base_ticket_prefix := SUBSTRING(v_base_ticket FROM 1 FOR LENGTH(v_base_ticket) - 2);
  ELSE
    v_base_ticket_prefix := v_base_ticket;
  END IF;

  -- 5. Evaluasi Status Keaktifan Tiket
  v_is_active := (v_reg.status::TEXT IN ('PAID', 'CONFIRMED', 'ATTENDED', 'VERIFIED'))
    OR EXISTS (
      SELECT 1 FROM public.payments p 
      WHERE p.registration_id = v_reg.id AND p.status = 'VERIFIED'
    );

  -- 6. Bangun Roster Slot (A s/d K atau A s/d F)
  -- Slot A: Pemesan / Leader
  SELECT sent_at INTO v_slot_ticket_sent
  FROM public.tickets
  WHERE registration_id = v_reg.id AND ticket_code = v_base_ticket_prefix
  LIMIT 1;

  v_slots := v_slots || jsonb_build_object(
    'suffix', 'A',
    'role', 'LEADER',
    'is_filled', true,
    'full_name', v_leader.full_name,
    'email', v_leader.email,
    'whatsapp', v_leader.whatsapp,
    'institution', v_leader.institution,
    'city', v_leader.city,
    'ticket_code', v_base_ticket_prefix,
    'status', CASE WHEN v_is_active THEN 'ISSUED' ELSE 'PENDING' END,
    'sent_at', v_slot_ticket_sent
  );

  -- Slot B s/d K (Anggota)
  IF v_max_pax > 1 THEN
    FOR v_slot_idx IN 2..v_max_pax LOOP
      v_suffix_char := CHR(64 + v_slot_idx); -- 66='B', 67='C', dst.
      v_slot_ticket_code := v_base_ticket_prefix || '-' || v_suffix_char;

      SELECT rm.*, p.full_name, p.email, p.whatsapp, p.institution, p.city, t.status AS ticket_status, t.sent_at
      INTO v_member_rec
      FROM public.registration_members rm
      JOIN public.persons p ON p.id = rm.person_id
      LEFT JOIN public.tickets t ON (t.registration_member_id = rm.id OR t.ticket_code = v_slot_ticket_code)
      WHERE rm.registration_id = v_reg.id AND rm.ticket_suffix = v_suffix_char
      LIMIT 1;

      IF FOUND AND NULLIF(TRIM(v_member_rec.full_name), '') IS NOT NULL THEN
        v_filled_count := v_filled_count + 1;
        v_slots := v_slots || jsonb_build_object(
          'suffix', v_suffix_char,
          'role', 'MEMBER',
          'is_filled', true,
          'full_name', v_member_rec.full_name,
          'email', v_member_rec.email,
          'whatsapp', v_member_rec.whatsapp,
          'institution', v_member_rec.institution,
          'city', v_member_rec.city,
          'ticket_code', v_slot_ticket_code,
          'status', CASE WHEN v_is_active THEN 'ISSUED' ELSE 'PENDING' END,
          'sent_at', v_member_rec.sent_at
        );
      ELSE
        v_slots := v_slots || jsonb_build_object(
          'suffix', v_suffix_char,
          'role', 'MEMBER',
          'is_filled', false,
          'full_name', NULL,
          'email', NULL,
          'whatsapp', NULL,
          'institution', NULL,
          'city', NULL,
          'ticket_code', v_slot_ticket_code,
          'status', 'UNFILLED',
          'sent_at', NULL
        );
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'registration_id', v_reg.id,
    'event_id', v_reg.event_id,
    'event_title', COALESCE(v_event.title, 'Pelatihan Publik Speaking Dignity'),
    'event_date_start', v_event.date_start,
    'base_ticket_code', v_base_ticket_prefix,
    'package_type', v_reg.package_type,
    'package_label', v_package_label,
    'total_pax', v_max_pax,
    'filled_count', v_filled_count,
    'pending_count', GREATEST(0, v_max_pax - v_filled_count),
    'is_all_filled', v_filled_count >= v_max_pax,
    'is_ticket_active', v_is_active,
    'total_due', COALESCE(v_reg.total_due, v_reg.net_amount, v_reg.gross_amount),
    'leader', jsonb_build_object(
      'full_name', v_leader.full_name,
      'email', v_leader.email,
      'whatsapp', v_leader.whatsapp
    ),
    'slots', v_slots
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_group_registration_details TO anon, authenticated, service_role;
