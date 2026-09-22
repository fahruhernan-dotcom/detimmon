-- ==============================================================================
-- DIGNITY ADMIN COMMAND CENTER - MIGRATION 015: REGISTRATION DEDUPLICATION & TRASH MANAGEMENT
-- LPK Indonesia Dignity (Hybrid Architecture: Google Workspace + Supabase)
-- ==============================================================================

-- 1. FIX PARTIAL UNIQUE INDEX (PENTING: DROP DULU SEBELUM CREATE AGAR TIDAK ERROR 42P07)
-- Indeks unik ini hanya berlaku untuk pendaftaran yang AKTIF (bukan CANCELLED dan bukan di TEMPAT SAMPAH).
-- Hal ini memungkinkan pendaftar yang berada di tempat sampah tidak lagi memblokir pendaftaran baru.
DROP INDEX IF EXISTS public.idx_registrations_event_person_active;

CREATE UNIQUE INDEX idx_registrations_event_person_active 
  ON public.registrations (event_id, person_id) 
  WHERE status != 'CANCELLED' AND deleted_at IS NULL;

-- 2. STANDARISASI FUNGSI NORMALISASI NOMOR WHATSAPP INDONESIA (DETERMINISTIK & SSOT)
CREATE OR REPLACE FUNCTION public.normalize_indonesia_phone(p_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_clean TEXT;
BEGIN
  IF p_phone IS NULL OR TRIM(p_phone) = '' THEN
    RETURN NULL;
  END IF;
  
  -- Hapus seluruh karakter non-angka
  v_clean := REGEXP_REPLACE(p_phone, '[^0-9]', '', 'g');
  
  -- Normalisasi format awalan nomor Indonesia ke 62
  IF v_clean LIKE '08%' THEN
    RETURN '62' || SUBSTRING(v_clean FROM 2);
  ELSIF v_clean LIKE '8%' THEN
    RETURN '62' || v_clean;
  ELSIF v_clean LIKE '62%' THEN
    RETURN v_clean;
  ELSE
    RETURN v_clean;
  END IF;
END;
$$;

-- 3. PERBARUI TRIGGER PADA TABEL PERSONS AGAR SELALU MEMAKAI normalize_indonesia_phone
CREATE OR REPLACE FUNCTION public.trigger_normalize_person_contacts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Normalisasi Email
  IF NEW.email IS NOT NULL AND TRIM(NEW.email) != '' THEN
    NEW.email_normalized := LOWER(TRIM(NEW.email));
  ELSE
    NEW.email_normalized := NULL;
  END IF;

  -- Normalisasi WhatsApp menggunakan SSOT function
  NEW.whatsapp_normalized := public.normalize_indonesia_phone(NEW.whatsapp);

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_person_contacts ON public.persons;
CREATE TRIGGER trg_normalize_person_contacts
  BEFORE INSERT OR UPDATE ON public.persons
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_normalize_person_contacts();

-- 4. HARD DELETE STORED PROCEDURE (HAPUS PERMANEN SATU PENDAFTAR CASCADE)
CREATE OR REPLACE FUNCTION public.hard_delete_registration(p_registration_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_reg RECORD;
BEGIN
  -- Ambil data registrasi untuk logging
  SELECT id, event_id, person_id INTO v_reg
  FROM public.registrations
  WHERE id = p_registration_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Data pendaftaran tidak ditemukan.');
  END IF;

  -- 1. Hapus tiket terkait
  DELETE FROM public.tickets WHERE registration_id = p_registration_id;

  -- 2. Hapus log pembayaran & penyesuaian
  DELETE FROM public.payment_adjustments WHERE registration_id = p_registration_id;
  DELETE FROM public.payments WHERE registration_id = p_registration_id;

  -- 3. Hapus pemakaian voucher
  DELETE FROM public.voucher_usages WHERE registration_id = p_registration_id;

  -- 4. Hapus anggota rombongan mabar
  DELETE FROM public.registration_members WHERE registration_id = p_registration_id;

  -- 5. Hapus registrasi fisik secara permanen
  DELETE FROM public.registrations WHERE id = p_registration_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Pendaftar dan seluruh data terkait berhasil dihapus permanen.',
    'registration_id', p_registration_id
  );
END;
$$;

-- 5. EMPTY TRASH STORED PROCEDURE (KOSONGKAN SELURUH TEMPAT SAMPAH EVENT SECARA ATOMIK)
CREATE OR REPLACE FUNCTION public.empty_event_trash(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted_count INT := 0;
  v_reg_ids UUID[];
BEGIN
  -- Ambil semua ID registrasi yang berada di tempat sampah pada event terkait
  SELECT ARRAY_AGG(id) INTO v_reg_ids
  FROM public.registrations
  WHERE event_id = p_event_id AND deleted_at IS NOT NULL;

  IF v_reg_ids IS NULL OR ARRAY_LENGTH(v_reg_ids, 1) = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Tempat sampah sudah kosong.',
      'deleted_count', 0
    );
  END IF;

  v_deleted_count := ARRAY_LENGTH(v_reg_ids, 1);

  -- Hapus relasi cascade
  DELETE FROM public.tickets WHERE registration_id = ANY(v_reg_ids);
  DELETE FROM public.payment_adjustments WHERE registration_id = ANY(v_reg_ids);
  DELETE FROM public.payments WHERE registration_id = ANY(v_reg_ids);
  DELETE FROM public.voucher_usages WHERE registration_id = ANY(v_reg_ids);
  DELETE FROM public.registration_members WHERE registration_id = ANY(v_reg_ids);

  -- Hapus data registrasi
  DELETE FROM public.registrations WHERE id = ANY(v_reg_ids);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Berhasil mengosongkan tempat sampah (' || v_deleted_count || ' pendaftar dihapus permanen).',
    'deleted_count', v_deleted_count
  );
END;
$$;

-- 6. STORED PROCEDURE 'submit_web_registration' (SECURITY DEFINER) - VERSI REVISI SEMPURNA
CREATE OR REPLACE FUNCTION public.submit_web_registration(
  p_event_id         UUID,
  p_full_name        TEXT,
  p_email            TEXT,
  p_whatsapp         TEXT,
  p_institution      TEXT        DEFAULT NULL,
  p_job_title        TEXT        DEFAULT NULL,
  p_city             TEXT        DEFAULT NULL,
  p_package_type     TEXT        DEFAULT 'INDIVIDU',
  p_total_due        NUMERIC     DEFAULT 0,
  p_bank_destination TEXT        DEFAULT 'Bank Mandiri',
  p_proof_data       TEXT        DEFAULT NULL,
  p_notes            TEXT        DEFAULT NULL,
  p_mabar_members    JSONB       DEFAULT '[]'::jsonb,
  p_voucher_code     TEXT        DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event            public.events%ROWTYPE;
  v_person_id        UUID;
  v_new_reg_id       UUID;
  v_existing_reg     public.registrations%ROWTYPE;
  v_trash_reg        public.registrations%ROWTYPE;
  v_ticket_no        TEXT;
  v_existing_ticket  TEXT;
  v_clean_name       TEXT;
  v_clean_email      TEXT;
  v_clean_wa         TEXT;
  v_is_mabar         BOOLEAN;
  v_member           JSONB;
  v_member_person_id UUID;
  v_suffix_char      CHAR(1);
  v_idx              INT := 0;

  -- Voucher
  v_voucher_result   JSONB;
  v_voucher_id       UUID          := NULL;
  v_discount         NUMERIC(12,2) := 0;
  v_gross_amount     NUMERIC(12,2);
  v_net_amount       NUMERIC(12,2);
  v_voucher_code_up  TEXT;
BEGIN
  -- 1. Validasi Event
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'EVENT_NOT_FOUND',
      'message', 'Acara tidak ditemukan atau ID acara tidak valid.');
  END IF;

  IF (v_event.web_registration_config->>'is_open')::boolean IS FALSE THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'REGISTRATION_CLOSED',
      'message', COALESCE(v_event.web_registration_config->>'close_message',
        'Pendaftaran untuk acara ini saat ini telah ditutup.'));
  END IF;

  -- 2. Hitung Nominal Dasar (Gross) Sesuai Paket
  IF p_package_type LIKE 'MABAR%' OR p_package_type = 'GROUP' THEN
    IF v_event.event_type = 'WEBINAR' OR v_event.slug LIKE '%msc%' OR v_event.slug LIKE '%webinar%' THEN
      v_gross_amount := COALESCE(v_event.promo_price, v_event.base_price, 100000) * 10;
    ELSE
      v_gross_amount := COALESCE(v_event.promo_price, v_event.base_price, 500000) * 5;
    END IF;
  ELSE
    v_gross_amount := COALESCE(NULLIF(p_total_due, 0), v_event.promo_price, v_event.base_price, 100000);
  END IF;

  -- 3. Validasi & Hitung Potongan Voucher Atomik
  v_voucher_code_up := UPPER(TRIM(COALESCE(p_voucher_code, '')));

  IF v_voucher_code_up != '' AND p_package_type = 'INDIVIDU' THEN
    BEGIN
      v_voucher_result := public.validate_voucher(
        p_voucher_code := v_voucher_code_up,
        p_event_id     := p_event_id,
        p_gross_amount := v_gross_amount
      );

      IF (v_voucher_result->>'valid')::boolean IS TRUE THEN
        v_voucher_id := (v_voucher_result->>'voucher_id')::UUID;
        v_discount   := (v_voucher_result->>'discount_applied')::NUMERIC;
        v_net_amount := (v_voucher_result->>'net_amount')::NUMERIC;
      ELSE
        RETURN jsonb_build_object(
          'success',    false,
          'error_code', v_voucher_result->>'error_code',
          'message',    'Voucher tidak valid: ' || (v_voucher_result->>'message')
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_discount   := 0;
      v_net_amount := v_gross_amount;
    END;
  ELSE
    v_discount   := 0;
    v_net_amount := v_gross_amount;
  END IF;

  -- 4. Normalisasi Kontak Person Menggunakan Fungsi SSOT
  v_clean_name  := TRIM(p_full_name);
  v_clean_email := LOWER(TRIM(p_email));
  v_clean_wa    := public.normalize_indonesia_phone(p_whatsapp);

  IF v_clean_name = '' OR v_clean_email = '' OR v_clean_wa IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_INPUT',
      'message', 'Nama lengkap, email, dan nomor WhatsApp valid wajib diisi.');
  END IF;

  -- Cari person berdasarkan email_normalized atau whatsapp_normalized
  SELECT id INTO v_person_id
  FROM public.persons
  WHERE email_normalized = v_clean_email OR whatsapp_normalized = v_clean_wa
  LIMIT 1;

  IF v_person_id IS NULL THEN
    INSERT INTO public.persons (full_name, email, whatsapp, institution, city)
    VALUES (
      v_clean_name,
      v_clean_email,
      v_clean_wa,
      COALESCE(NULLIF(TRIM(p_institution), ''), '-'),
      COALESCE(NULLIF(TRIM(p_city), ''), 'Surakarta')
    ) RETURNING id INTO v_person_id;
  ELSE
    UPDATE public.persons
    SET
      full_name = v_clean_name,
      institution = COALESCE(NULLIF(TRIM(p_institution), ''), institution),
      city = COALESCE(NULLIF(TRIM(p_city), ''), city),
      updated_at = now()
    WHERE id = v_person_id;
  END IF;

  -- 5. CEK APAKAH ADA DI TEMPAT SAMPAH (SOFT DELETED)
  -- Jika pendaftar sebelumnya dimasukkan ke trash, otomatis pulihkan (restore) pendaftarannya!
  SELECT * INTO v_trash_reg
  FROM public.registrations
  WHERE event_id = p_event_id AND person_id = v_person_id AND deleted_at IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.registrations
    SET
      deleted_at = NULL,
      status = 'NEW',
      package_type = p_package_type,
      total_due = v_net_amount,
      gross_amount = v_gross_amount,
      discount_applied = v_discount,
      net_amount = v_net_amount,
      voucher_id = v_voucher_id,
      voucher_code_used = CASE WHEN v_voucher_id IS NOT NULL THEN v_voucher_code_up ELSE NULL END,
      custom_notes = p_notes,
      updated_at = now()
    WHERE id = v_trash_reg.id;

    -- Update atau tambahkan pembayaran
    IF p_proof_data IS NOT NULL AND LENGTH(p_proof_data) > 10 THEN
      UPDATE public.payments
      SET proof_drive_file_id = p_proof_data, status = 'PENDING', submitted_at = now()
      WHERE registration_id = v_trash_reg.id;
    END IF;

    SELECT ticket_code INTO v_existing_ticket FROM public.tickets WHERE registration_id = v_trash_reg.id LIMIT 1;

    RETURN jsonb_build_object(
      'success', true,
      'is_duplicate', true,
      'restored_from_trash', true,
      'status', 'PENDING',
      'registration_id', v_trash_reg.id,
      'ticket_number', COALESCE(v_existing_ticket, 'TICKET-DIGNITY-RESTORED'),
      'message', 'Data pendaftaran Anda telah berhasil dipulihkan dari tempat sampah dan menunggu verifikasi pembayaran.',
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
        'message', 'Anda sudah terdaftar resmi pada acara ini dan status tiket Anda sudah aktif.',
        'wa_group_url', COALESCE(v_event.web_registration_config->>'wa_group_url', '')
      );
    END IF;

    -- Jika status masih PENDING / NEW, perbarui bukti bayar jika ada bukti baru
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
      'message', 'Data pendaftaran Anda sudah pernah tercatat dan sedang menunggu verifikasi pembayaran.',
      'wa_group_url', COALESCE(v_event.web_registration_config->>'wa_group_url', '')
    );
  END IF;

  -- 7. INSERT REGISTRASI BARU
  v_is_mabar  := (p_package_type LIKE 'MABAR%' OR p_package_type = 'GROUP');
  v_ticket_no := 'TICKET-DIGNITY-' || LPAD((FLOOR(RANDOM() * 900) + 100)::TEXT, 3, '0') || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 2));

  INSERT INTO public.registrations (
    event_id, person_id, package_type, is_mabar,
    total_due,
    gross_amount, discount_applied, net_amount,
    voucher_id, voucher_code_used,
    status, source_system, custom_notes
  ) VALUES (
    p_event_id, v_person_id, p_package_type, v_is_mabar,
    v_net_amount,
    v_gross_amount, v_discount, v_net_amount,
    v_voucher_id,
    CASE WHEN v_voucher_id IS NOT NULL THEN v_voucher_code_up ELSE NULL END,
    'NEW', 'WEB_NATIVE', p_notes
  ) RETURNING id INTO v_new_reg_id;

  -- 8. INSERT PAYMENT
  INSERT INTO public.payments (
    registration_id, amount, payment_method, bank_destination,
    proof_drive_file_id, status, submitted_at
  ) VALUES (
    v_new_reg_id, v_net_amount, 'BANK_TRANSFER',
    COALESCE(p_bank_destination, 'Bank Mandiri'),
    p_proof_data, 'PENDING', now()
  );

  -- 9. CATAT VOUCHER USAGE & INCREMENT used_count
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

  -- 11. TERBITKAN TIKET PENDAFTAR UTAMA
  INSERT INTO public.tickets (
    registration_id, ticket_code, qr_code_payload, status, is_mabar_leader
  ) VALUES (
    v_new_reg_id, v_ticket_no, v_ticket_no, 'ACTIVE', v_is_mabar
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

-- 7. BERIKAN HAK EKSEKUSI KE ANON, AUTHENTICATED, & SERVICE_ROLE
GRANT EXECUTE ON FUNCTION public.normalize_indonesia_phone(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.hard_delete_registration(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.empty_event_trash(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_web_registration(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, JSONB, TEXT
) TO anon, authenticated, service_role;
