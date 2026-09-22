-- ==============================================================================
-- MIGRASI 016: SANITASI PESAN PUBLIK & SIKLUS HIDUP E-TIKET RESMI
-- Deskripsi:
-- 1. Menghilangkan seluruh frasa "tempat sampah" dari fungsi publik submit_web_registration
--    menjadi pesan profesional: "Data pendaftaran Anda berhasil diperbarui dan sedang menunggu verifikasi pembayaran."
-- 2. Mengubah status awal tiket baru menjadi 'PENDING' (bukan 'ACTIVE') sehingga tiket resmi
--    belum aktif sebelum pembayaran diverifikasi oleh Admin.
-- 3. Membuat trigger otomatis: Saat status registrasi diubah ke 'CONFIRMED' (Lunas),
--    seluruh tiket terkait yang berstatus 'PENDING' otomatis diaktifkan menjadi 'ISSUED'.
-- ==============================================================================

-- 1. UPDATE FUNGSI SUBMIT WEB REGISTRATION
CREATE OR REPLACE FUNCTION public.submit_web_registration(
  p_event_id UUID,
  p_nama TEXT,
  p_email TEXT,
  p_whatsapp TEXT,
  p_institution TEXT,
  p_city TEXT,
  p_package_type TEXT,
  p_gross_amount NUMERIC,
  p_net_amount NUMERIC,
  p_voucher_code TEXT DEFAULT NULL,
  p_proof_data TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_mabar_members JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_person_id UUID;
  v_new_reg_id UUID;
  v_ticket_no TEXT;
  v_clean_phone TEXT;
  v_clean_email TEXT;
  v_event RECORD;
  v_voucher_id UUID;
  v_discount NUMERIC := 0;
  v_gross_amount NUMERIC;
  v_net_amount NUMERIC;
  v_is_mabar BOOLEAN := false;
  v_member JSONB;
  v_member_person_id UUID;
  v_idx INT := 0;
  v_suffix_char CHAR(1);
  v_voucher_code_up TEXT := UPPER(TRIM(COALESCE(p_voucher_code, '')));
  v_existing_reg RECORD;
  v_trash_reg RECORD;
  v_existing_ticket TEXT;
BEGIN
  -- 1. VALIDASI EVENT
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Event tidak ditemukan atau tidak aktif.');
  END IF;

  -- 2. NORMALISASI IDENTITAS
  v_clean_phone := public.normalize_indonesia_phone(p_whatsapp);
  v_clean_email := LOWER(TRIM(COALESCE(p_email, '')));

  IF v_clean_phone IS NULL OR LENGTH(v_clean_phone) < 8 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Nomor WhatsApp tidak valid. Format: 08xx / 628xx.');
  END IF;

  IF v_clean_email IS NULL OR POSITION('@' IN v_clean_email) = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Format alamat email tidak valid.');
  END IF;

  -- 3. UPSERT / CARI DATA PERSON
  SELECT id INTO v_person_id
  FROM public.persons
  WHERE (email_normalized IS NOT NULL AND email_normalized = v_clean_email)
     OR (whatsapp_normalized IS NOT NULL AND whatsapp_normalized = v_clean_phone)
  LIMIT 1;

  IF v_person_id IS NULL THEN
    INSERT INTO public.persons (
      full_name, email, whatsapp, institution, city
    ) VALUES (
      TRIM(p_nama),
      v_clean_email,
      v_clean_phone,
      COALESCE(NULLIF(TRIM(p_institution), ''), '-'),
      COALESCE(NULLIF(TRIM(p_city), ''), 'Surakarta')
    ) RETURNING id INTO v_person_id;
  ELSE
    UPDATE public.persons
    SET
      full_name = TRIM(p_nama),
      email = v_clean_email,
      whatsapp = v_clean_phone,
      institution = COALESCE(NULLIF(TRIM(p_institution), ''), institution),
      city = COALESCE(NULLIF(TRIM(p_city), ''), city),
      updated_at = now()
    WHERE id = v_person_id;
  END IF;

  -- 4. HITUNG NOMINAL & VOUCHER
  v_gross_amount := COALESCE(p_gross_amount, 100000);
  v_net_amount   := COALESCE(p_net_amount, v_gross_amount);

  IF v_voucher_code_up != '' THEN
    SELECT id, discount_amount INTO v_voucher_id, v_discount
    FROM public.vouchers
    WHERE code = v_voucher_code_up
      AND is_active = true
      AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
      AND (max_uses IS NULL OR used_count < max_uses)
    LIMIT 1;

    IF v_voucher_id IS NOT NULL THEN
      v_discount := COALESCE(v_discount, 0);
      v_net_amount := GREATEST(0, v_gross_amount - v_discount);
    ELSE
      v_voucher_code_up := '';
      v_net_amount := v_gross_amount;
    END IF;
  END IF;

  -- 5. CEK APAKAH PENDAFTAR ADA DI TEMPAT SAMPAH (SOFT-DELETED) -> RESTORE OTOMATIS
  SELECT * INTO v_trash_reg
  FROM public.registrations
  WHERE event_id = p_event_id AND person_id = v_person_id AND deleted_at IS NOT NULL
  ORDER BY deleted_at DESC
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.registrations
    SET
      deleted_at = NULL,
      status = 'NEW',
      package_type = p_package_type,
      is_mabar = (p_package_type LIKE 'MABAR%' OR p_package_type = 'GROUP'),
      total_due = v_net_amount,
      gross_amount = v_gross_amount,
      discount_applied = v_discount,
      net_amount = v_net_amount,
      voucher_id = v_voucher_id,
      voucher_code_used = CASE WHEN v_voucher_id IS NOT NULL THEN v_voucher_code_up ELSE NULL END,
      custom_notes = p_notes,
      updated_at = now()
    WHERE id = v_trash_reg.id;

    -- Update bukti bayar jika ada
    IF p_proof_data IS NOT NULL AND LENGTH(p_proof_data) > 10 THEN
      UPDATE public.payments
      SET proof_drive_file_id = p_proof_data, status = 'PENDING', submitted_at = now()
      WHERE registration_id = v_trash_reg.id;
    END IF;

    SELECT ticket_code INTO v_existing_ticket FROM public.tickets WHERE registration_id = v_trash_reg.id LIMIT 1;

    -- Pastikan status tiket diset ke PENDING sebelum verifikasi
    IF v_existing_ticket IS NOT NULL THEN
      UPDATE public.tickets
      SET status = 'PENDING'
      WHERE registration_id = v_trash_reg.id;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'is_duplicate', true,
      'restored_from_trash', true,
      'status', 'PENDING',
      'registration_id', v_trash_reg.id,
      'ticket_number', COALESCE(v_existing_ticket, 'REG-DIGNITY-' || UPPER(SUBSTRING(v_trash_reg.id::TEXT FROM 1 FOR 6))),
      'message', 'Data pendaftaran Anda berhasil diperbarui dan sedang menunggu verifikasi pembayaran.',
      'wa_group_url', COALESCE(v_event.web_registration_config->>'wa_group_url', '')
    );
  END IF;

  -- 6. CEK DUPLIKASI PENDAFTARAN AKTIF
  SELECT * INTO v_existing_reg
  FROM public.registrations
  WHERE event_id = p_event_id AND person_id = v_person_id AND status != 'CANCELLED' AND deleted_at IS NULL
  LIMIT 1;

  IF FOUND THEN
    SELECT ticket_code INTO v_existing_ticket FROM public.tickets WHERE registration_id = v_existing_reg.id LIMIT 1;

    IF v_existing_reg.status IN ('CONFIRMED', 'ATTENDED') THEN
      RETURN jsonb_build_object(
        'success', true,
        'is_duplicate', true,
        'status', 'PAID',
        'registration_id', v_existing_reg.id,
        'ticket_number', v_existing_ticket,
        'message', 'Anda sudah terdaftar resmi pada acara ini dan tiket resmi Anda telah terbit aktif.',
        'wa_group_url', COALESCE(v_event.web_registration_config->>'wa_group_url', '')
      );
    END IF;

    -- Jika status masih PENDING / NEW, perbarui bukti bayar jika ada
    IF p_proof_data IS NOT NULL AND LENGTH(p_proof_data) > 10 THEN
      UPDATE public.payments
      SET proof_drive_file_id = p_proof_data, submitted_at = now()
      WHERE registration_id = v_existing_reg.id;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'is_duplicate', true,
      'status', 'PENDING',
      'registration_id', v_existing_reg.id,
      'ticket_number', v_existing_ticket,
      'message', 'Data pendaftaran Anda sudah pernah tercatat dan sedang menunggu verifikasi pembayaran oleh panitia.',
      'wa_group_url', COALESCE(v_event.web_registration_config->>'wa_group_url', '')
    );
  END IF;

  -- 7. INSERT REGISTRASI BARU
  v_is_mabar  := (p_package_type LIKE 'MABAR%' OR p_package_type = 'GROUP');
  v_ticket_no := 'TICKET-DIGNITY-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 6));

  INSERT INTO public.registrations (
    event_id,
    person_id,
    package_type,
    is_mabar,
    status,
    total_due,
    gross_amount,
    discount_applied,
    net_amount,
    voucher_id,
    voucher_code_used,
    source_system,
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

  -- 8. SIMPAN BUKTI PEMBAYARAN JIKA ADA
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
      'TRANSFER_BANK',
      'PENDING',
      p_proof_data,
      now()
    );
  END IF;

  -- 9. CATAT PENGGUNAAN VOUCHER
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
    END IF;
  END IF;

  -- 10. PROSES ANGGOTA MABAR
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

        INSERT INTO public.registration_members (registration_id, person_id, member_role, ticket_suffix)
        VALUES (v_new_reg_id, v_member_person_id, 'MEMBER', v_suffix_char)
        ON CONFLICT (registration_id, person_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- 11. TERBITKAN DRAFT TIKET DENGAN STATUS PENDING (BELUM AKTIF SEBELUM LUNAS)
  INSERT INTO public.tickets (
    registration_id, ticket_code, qr_code_payload, status, is_mabar_leader
  ) VALUES (
    v_new_reg_id, v_ticket_no, v_ticket_no, 'PENDING', v_is_mabar
  );

  RETURN jsonb_build_object(
    'success',         true,
    'is_duplicate',    false,
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

-- 2. BUAT TRIGGER OTOMATIS AKTIVASI TIKET MENJADI 'ISSUED' SAAT PENDAFTARAN LUNAS (CONFIRMED)
CREATE OR REPLACE FUNCTION public.handle_registration_status_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'CONFIRMED' AND (OLD.status IS DISTINCT FROM 'CONFIRMED') THEN
    UPDATE public.tickets
    SET status = 'ISSUED', issued_at = COALESCE(issued_at, now())
    WHERE registration_id = NEW.id AND status = 'PENDING';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_activate_ticket_on_registration_confirmed ON public.registrations;
CREATE TRIGGER trg_activate_ticket_on_registration_confirmed
AFTER UPDATE OF status ON public.registrations
FOR EACH ROW
EXECUTE FUNCTION public.handle_registration_status_confirmed();

-- 3. PASTIKAN PERMISSIONS RPC TETAP TERJAMIN
GRANT EXECUTE ON FUNCTION public.submit_web_registration TO anon, authenticated, service_role;
