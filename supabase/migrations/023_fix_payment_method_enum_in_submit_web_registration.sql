-- ==============================================================================
-- MIGRASI 023: FIX ENUM PAYMENT_METHOD PADA RPC SUBMIT_WEB_REGISTRATION
-- Deskripsi:
-- Memperbaiki nilai enum payment_method saat mencatat bukti transfer dari 'TRANSFER_BANK'
-- menjadi 'BANK_TRANSFER' sesuai tipe enum resmi Postgres ('BANK_TRANSFER', 'QRIS', 'MANUAL_CASH', 'WAIVED').
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.submit_web_registration(
  p_event_id UUID,
  p_nama TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_whatsapp TEXT DEFAULT NULL,
  p_institution TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_package_type TEXT DEFAULT 'INDIVIDU',
  p_gross_amount NUMERIC DEFAULT NULL,
  p_net_amount NUMERIC DEFAULT NULL,
  p_voucher_code TEXT DEFAULT NULL,
  p_proof_data TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_mabar_members JSONB DEFAULT '[]'::JSONB,
  -- Backward-compatibility aliases
  p_full_name TEXT DEFAULT NULL,
  p_job_title TEXT DEFAULT NULL,
  p_total_due NUMERIC DEFAULT NULL,
  p_bank_destination TEXT DEFAULT 'Bank Mandiri'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_person_id UUID;
  v_new_reg_id UUID;
  v_event RECORD;
  v_ticket_no TEXT;
  v_email_norm TEXT;
  v_wa_norm TEXT;
  v_nama_clean TEXT;
  v_existing_reg RECORD;
  v_is_mabar BOOLEAN := FALSE;
  v_voucher_id UUID := NULL;
  v_discount NUMERIC := 0;
  v_gross_amount NUMERIC;
  v_net_amount NUMERIC;
  v_voucher_code_up TEXT := '';
  v_idx INT := 0;
  v_member JSONB;
  v_member_person_id UUID;
  v_suffix_char CHAR(1);
  v_active_membership RECORD;
  v_conflict_leader_id UUID;
  v_conflict_leader_name TEXT;
  v_conflict_leader_wa TEXT;
  v_conflict_pkg TEXT;
BEGIN
  -- 1. NORMALISASI INPUT
  v_nama_clean := TRIM(COALESCE(p_nama, p_full_name, ''));
  v_email_norm := LOWER(TRIM(COALESCE(p_email, '')));
  v_wa_norm := public.normalize_indonesia_phone(p_whatsapp);
  v_voucher_code_up := UPPER(TRIM(COALESCE(p_voucher_code, '')));

  IF v_nama_clean = '' THEN
    RAISE EXCEPTION 'Nama lengkap wajib diisi.';
  END IF;

  IF v_wa_norm IS NULL OR LENGTH(v_wa_norm) < 9 THEN
    RAISE EXCEPTION 'Nomor WhatsApp tidak valid.';
  END IF;

  -- 2. PASTIKAN EVENT AKTIF & VALID
  SELECT * INTO v_event
  FROM public.events
  WHERE id = p_event_id AND status != 'CANCELLED';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Acara tidak ditemukan atau telah dibatalkan.';
  END IF;

  -- 3. DETEKSI DEDUP PERSON
  SELECT id INTO v_person_id
  FROM public.persons
  WHERE (email_normalized IS NOT NULL AND email_normalized = v_email_norm)
     OR (whatsapp_normalized IS NOT NULL AND whatsapp_normalized = v_wa_norm)
  LIMIT 1;

  IF v_person_id IS NULL THEN
    INSERT INTO public.persons (
      full_name, email, whatsapp, institution, city, job_title
    ) VALUES (
      v_nama_clean,
      NULLIF(v_email_norm, ''),
      v_wa_norm,
      COALESCE(NULLIF(TRIM(p_institution), ''), '-'),
      COALESCE(NULLIF(TRIM(p_city), ''), 'Surakarta'),
      NULLIF(TRIM(p_job_title), '')
    ) RETURNING id INTO v_person_id;
  ELSE
    UPDATE public.persons
    SET
      full_name = v_nama_clean,
      institution = COALESCE(NULLIF(TRIM(p_institution), ''), institution),
      city = COALESCE(NULLIF(TRIM(p_city), ''), city),
      job_title = COALESCE(NULLIF(TRIM(p_job_title), ''), job_title),
      updated_at = now()
    WHERE id = v_person_id;
  END IF;

  -- 4. CEK DUPLIKASI LAYER 1: Registran Utama
  SELECT r.id, r.status, r.package_type, r.net_amount, t.ticket_code
  INTO v_existing_reg
  FROM public.registrations r
  LEFT JOIN public.tickets t ON t.registration_id = r.id
  WHERE r.event_id = p_event_id
    AND r.person_id = v_person_id
    AND r.deleted_at IS NULL
  ORDER BY r.created_at DESC
  LIMIT 1;

  IF v_existing_reg.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success',         false,
      'is_duplicate',    true,
      'is_group_member', false,
      'registration_id', v_existing_reg.id,
      'ticket_number',   v_existing_reg.ticket_code,
      'status',          v_existing_reg.status,
      'package_type',    v_existing_reg.package_type,
      'total_due',       v_existing_reg.net_amount,
      'message',         'Data pendaftaran Anda sudah pernah tercatat pada sistem kami untuk acara ini.'
    );
  END IF;

  -- 5. CEK DUPLIKASI LAYER 2: Anggota Rombongan Komunitas
  SELECT 
    rm.registration_id,
    r.package_type,
    p_leader.full_name AS leader_name,
    p_leader.whatsapp  AS leader_whatsapp,
    t.ticket_code
  INTO v_active_membership
  FROM public.registration_members rm
  JOIN public.registrations r ON r.id = rm.registration_id
  JOIN public.persons p_leader ON p_leader.id = r.person_id
  LEFT JOIN public.tickets t ON t.registration_id = r.id AND t.ticket_suffix = rm.ticket_suffix
  WHERE rm.person_id = v_person_id
    AND r.event_id = p_event_id
    AND r.deleted_at IS NULL
  ORDER BY rm.created_at DESC
  LIMIT 1;

  IF v_active_membership.registration_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success',          false,
      'is_duplicate',     true,
      'is_group_member',  true,
      'registration_id',  v_active_membership.registration_id,
      'ticket_number',    v_active_membership.ticket_code,
      'leader_name',      v_active_membership.leader_name,
      'leader_whatsapp',  v_active_membership.leader_whatsapp,
      'parent_package',   v_active_membership.package_type,
      'message',          'Anda telah didaftarkan dalam rombongan ' || 
                          COALESCE(v_active_membership.leader_name, 'Ketua Rombongan') || 
                          ' (' || COALESCE(v_active_membership.parent_package, 'Promo Komunitas') || ').'
    );
  END IF;

  -- 6. TENTUKAN PAKET & FLAG MABAR
  IF p_package_type IN ('MABAR_6', 'MABAR_11', 'GROUP_11', 'GROUP') THEN
    v_is_mabar := TRUE;
  END IF;

  -- Hitung nominal
  v_gross_amount := COALESCE(p_gross_amount, p_total_due, 100000);
  v_net_amount := COALESCE(p_net_amount, v_gross_amount);

  -- 7. GENERATE NOMOR TIKET DRAFT
  v_ticket_no := 'TICKET-DIGNITY-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 6));

  -- 8. INSERT REGISTRASI
  INSERT INTO public.registrations (
    event_id,
    person_id,
    package_type,
    is_mabar,
    status,
    total_due,
    gross_amount,
    discount_amount,
    net_amount,
    voucher_id,
    voucher_code_applied,
    intake_source,
    custom_notes
  ) VALUES (
    p_event_id,
    v_person_id,
    p_package_type,
    v_is_mabar,
    'NEW',
    v_net_amount,
    v_gross_amount,
    v_discount,
    v_net_amount,
    v_voucher_id,
    CASE WHEN v_voucher_id IS NOT NULL THEN v_voucher_code_up ELSE NULL END,
    'WEB_NATIVE',
    p_notes
  ) RETURNING id INTO v_new_reg_id;

  -- 9. SIMPAN BUKTI PEMBAYARAN JIKA ADA (DENGAN ENUM VALID 'BANK_TRANSFER')
  IF p_proof_data IS NOT NULL AND LENGTH(p_proof_data) > 10 THEN
    INSERT INTO public.payments (
      registration_id,
      amount,
      payment_method,
      status,
      proof_drive_file_id,
      submitted_at
    ) VALUES (
      v_new_reg_id,
      v_net_amount,
      'BANK_TRANSFER',
      'PENDING',
      p_proof_data,
      now()
    );
  END IF;

  -- 10. CATAT PENGGUNAAN VOUCHER JIKA ADA
  IF v_voucher_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.voucher_usages (
        voucher_id, registration_id, person_id, event_id,
        gross_amount, discount_applied, net_amount
      ) VALUES (
        v_voucher_id, v_new_reg_id, v_person_id, p_event_id,
        v_gross_amount, v_discount, v_net_amount
      );

      UPDATE public.vouchers
      SET used_count = used_count + 1
      WHERE id = v_voucher_id;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- 11. PROSES ANGGOTA MABAR
  IF v_is_mabar AND jsonb_array_length(p_mabar_members) > 0 THEN
    FOR v_member IN SELECT * FROM jsonb_array_elements(p_mabar_members) LOOP
      IF NULLIF(TRIM(v_member->>'nama'), '') IS NOT NULL THEN
        v_idx := v_idx + 1;
        v_suffix_char := CHR(65 + v_idx);

        SELECT id INTO v_member_person_id
        FROM public.persons
        WHERE (email_normalized IS NOT NULL AND email_normalized = LOWER(TRIM(COALESCE(v_member->>'email', ''))))
           OR (whatsapp_normalized IS NOT NULL AND whatsapp_normalized = public.normalize_indonesia_phone(v_member->>'whatsapp'))
        LIMIT 1;

        IF v_member_person_id IS NULL THEN
          INSERT INTO public.persons (full_name, email, whatsapp, institution, city)
          VALUES (
            TRIM(v_member->>'nama'),
            LOWER(NULLIF(TRIM(v_member->>'email'), '')),
            public.normalize_indonesia_phone(v_member->>'whatsapp'),
            COALESCE(NULLIF(TRIM(p_institution), ''), '-'),
            COALESCE(NULLIF(TRIM(p_city), ''), 'Surakarta')
          ) RETURNING id INTO v_member_person_id;
        END IF;

        -- Insert ke registration_members
        INSERT INTO public.registration_members (registration_id, person_id, member_role, ticket_suffix)
        VALUES (v_new_reg_id, v_member_person_id, 'MEMBER', v_suffix_char)
        ON CONFLICT (registration_id, person_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- 12. TERBITKAN DRAFT TIKET DENGAN STATUS PENDING
  INSERT INTO public.tickets (
    registration_id, ticket_code, qr_code_payload, status, is_mabar_leader
  ) VALUES (
    v_new_reg_id, v_ticket_no, v_ticket_no, 'PENDING', v_is_mabar
  );

  RETURN jsonb_build_object(
    'success',         true,
    'is_duplicate',    false,
    'is_group_member', false,
    'registration_id', v_new_reg_id,
    'ticket_number',   v_ticket_no,
    'status',          'NEW',
    'gross_amount',    v_gross_amount,
    'discount',        v_discount,
    'net_amount',      v_net_amount,
    'voucher_applied', v_voucher_code_up != '' AND v_voucher_id IS NOT NULL,
    'wa_group_url',    COALESCE(v_event.web_registration_config->>'wa_group_url', '')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_web_registration TO anon, authenticated, service_role;
