-- ==============================================================================
-- MIGRATION 009: FIX PUBLIC REGISTRATION RLS & TICKETS SCHEMA
-- Deskripsi: 
-- 1. Menambahkan kolom 'is_mabar_leader' ke tabel 'tickets' dan melepas NOT NULL pada 'qr_code_payload'.
-- 2. Memperbaiki Stored Procedure 'submit_web_registration' (SECURITY DEFINER) agar penerbitan tiket utama sukses 100%.
-- 3. Membuka Policy RLS pada tabel 'persons', 'registrations', 'payments', 'registration_members', dan 'tickets'
--    untuk role 'anon' dan 'authenticated' agar formulir pendaftaran publik mandiri dapat melakukan insert tanpa ditolak database.
-- ==============================================================================

-- 1. Penyesuaian Kolom Tabel Tickets, Registrations & Payments
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS is_mabar_leader BOOLEAN DEFAULT FALSE;
ALTER TABLE public.tickets ALTER COLUMN qr_code_payload DROP NOT NULL;

ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(12,2);
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS discount_applied NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS net_amount NUMERIC(12,2);
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS voucher_id UUID;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS voucher_code_used TEXT;

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS proof_drive_file_id TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS bank_destination TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT now();

-- 2. Kebijakan RLS untuk Pendaftaran Publik (Role: anon & authenticated)

-- A. Tabel Persons (Master Kontak & Peserta)
DROP POLICY IF EXISTS "Public intake persons insert" ON public.persons;
CREATE POLICY "Public intake persons insert" ON public.persons
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public intake persons select" ON public.persons;
CREATE POLICY "Public intake persons select" ON public.persons
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public intake persons update" ON public.persons;
CREATE POLICY "Public intake persons update" ON public.persons
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- B. Tabel Registrations
DROP POLICY IF EXISTS "Public intake registrations insert" ON public.registrations;
CREATE POLICY "Public intake registrations insert" ON public.registrations
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public intake registrations select" ON public.registrations;
CREATE POLICY "Public intake registrations select" ON public.registrations
  FOR SELECT TO anon, authenticated
  USING (true);

-- C. Tabel Payments
DROP POLICY IF EXISTS "Public intake payments insert" ON public.payments;
CREATE POLICY "Public intake payments insert" ON public.payments
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public intake payments select" ON public.payments;
CREATE POLICY "Public intake payments select" ON public.payments
  FOR SELECT TO anon, authenticated
  USING (true);

-- D. Tabel Registration Members (MABAR)
DROP POLICY IF EXISTS "Public intake members insert" ON public.registration_members;
CREATE POLICY "Public intake members insert" ON public.registration_members
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public intake members select" ON public.registration_members;
CREATE POLICY "Public intake members select" ON public.registration_members
  FOR SELECT TO anon, authenticated
  USING (true);

-- E. Tabel Tickets
DROP POLICY IF EXISTS "Public intake tickets insert" ON public.tickets;
CREATE POLICY "Public intake tickets insert" ON public.tickets
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public intake tickets select" ON public.tickets;
CREATE POLICY "Public intake tickets select" ON public.tickets
  FOR SELECT TO anon, authenticated
  USING (true);


-- 3. Stored Procedure 'submit_web_registration' (SECURITY DEFINER) Versi Sempurna
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
  v_ticket_no        TEXT;
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

  -- 2. Hitung Nilai Tagihan Awal
  v_gross_amount := COALESCE(p_total_due, 0);
  IF v_gross_amount <= 0 THEN
    v_gross_amount := COALESCE(v_event.promo_price, v_event.base_price, 100000);
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
      -- Abaikan jika fungsi validate_voucher belum ada
      v_discount   := 0;
      v_net_amount := v_gross_amount;
    END;
  ELSE
    v_discount   := 0;
    v_net_amount := v_gross_amount;
  END IF;

  -- 4. Normalisasi Person
  v_clean_name  := TRIM(p_full_name);
  v_clean_email := LOWER(TRIM(p_email));
  v_clean_wa    := REGEXP_REPLACE(COALESCE(p_whatsapp, ''), '[^0-9]', '', 'g');

  IF v_clean_name = '' OR v_clean_email = '' OR v_clean_wa = '' THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_INPUT',
      'message', 'Nama lengkap, email, dan nomor WhatsApp wajib diisi.');
  END IF;

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

  -- 5. Cek Duplikasi
  SELECT * INTO v_existing_reg
  FROM public.registrations
  WHERE event_id = p_event_id AND person_id = v_person_id AND status != 'CANCELLED'
  LIMIT 1;

  IF FOUND THEN
    IF v_existing_reg.status IN ('CONFIRMED', 'ATTENDED') THEN
      RETURN jsonb_build_object('success', true, 'is_duplicate', true, 'status', 'PAID',
        'registration_id', v_existing_reg.id,
        'message', 'Anda sudah terdaftar resmi pada acara ini dan status tiket Anda sudah aktif.',
        'wa_group_url', COALESCE(v_event.web_registration_config->>'wa_group_url', ''));
    END IF;

    IF p_proof_data IS NOT NULL AND LENGTH(p_proof_data) > 20 THEN
      UPDATE public.payments
      SET proof_drive_file_id = p_proof_data, submitted_at = now()
      WHERE registration_id = v_existing_reg.id;
    END IF;

    RETURN jsonb_build_object('success', true, 'is_duplicate', true, 'status', 'PENDING',
      'registration_id', v_existing_reg.id,
      'message', 'Data pendaftaran Anda sudah pernah tercatat dan sedang menunggu verifikasi pembayaran.',
      'wa_group_url', COALESCE(v_event.web_registration_config->>'wa_group_url', ''));
  END IF;

  -- 6. Insert Registrasi Baru (Fleksibel MABAR_11, MABAR_6, dsb)
  v_is_mabar  := (p_package_type LIKE 'MABAR%' OR p_package_type = 'GROUP');
  v_ticket_no := 'TICKET-DIGNITY-' || LPAD((FLOOR(RANDOM() * 900) + 100)::TEXT, 3, '0');

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

  -- 7. Insert Payment
  INSERT INTO public.payments (
    registration_id, amount, payment_method, bank_destination,
    proof_drive_file_id, status, submitted_at
  ) VALUES (
    v_new_reg_id, v_net_amount, 'BANK_TRANSFER',
    COALESCE(p_bank_destination, 'Bank Mandiri'),
    p_proof_data, 'PENDING', now()
  );

  -- 8. Catat Voucher Usage & Increment used_count (Atomik)
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
      NULL; -- Lanjutkan pendaftaran jika tabel voucher belum lengkap
    END;
  END IF;

  -- 9. Proses Anggota MABAR
  IF v_is_mabar AND jsonb_array_length(p_mabar_members) > 0 THEN
    FOR v_member IN SELECT * FROM jsonb_array_elements(p_mabar_members) LOOP
      IF NULLIF(TRIM(v_member->>'nama'), '') IS NOT NULL THEN
        v_idx := v_idx + 1;
        v_suffix_char := CHR(65 + v_idx);

        SELECT id INTO v_member_person_id
        FROM public.persons
        WHERE email_normalized = LOWER(TRIM(COALESCE(v_member->>'email', '')))
           OR whatsapp_normalized = REGEXP_REPLACE(COALESCE(v_member->>'whatsapp', ''), '[^0-9]', '', 'g')
        LIMIT 1;

        IF v_member_person_id IS NULL THEN
          INSERT INTO public.persons (full_name, email, whatsapp, institution, city)
          VALUES (
            TRIM(v_member->>'nama'),
            LOWER(NULLIF(TRIM(v_member->>'email'), '')),
            NULLIF(REGEXP_REPLACE(COALESCE(v_member->>'whatsapp', ''), '[^0-9]', '', 'g'), ''),
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

  -- 10. Terbitkan Tiket Pendaftar Utama (Lengkap dengan qr_code_payload dan is_mabar_leader)
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

-- 4. Berikan Hak Eksekusi ke Publik (anon & authenticated)
GRANT EXECUTE ON FUNCTION public.submit_web_registration TO anon, authenticated;
