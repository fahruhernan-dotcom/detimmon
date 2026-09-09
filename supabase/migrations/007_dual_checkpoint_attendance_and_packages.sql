-- ==============================================================================
-- MIGRATION: 007_dual_checkpoint_attendance_and_packages.sql
-- TUJUAN: Menyiapkan Dual-Checkpoint Presensi (Masuk & Selesai) Anti-Fraud
--         dengan validasi email database dan pencegahan duplikasi.
-- ==============================================================================

-- 1. Tambahkan kolom pendukung di tabel 'attendances'
ALTER TABLE attendances
  ADD COLUMN IF NOT EXISTS registration_id UUID REFERENCES registrations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'CHECK_IN',
  ADD COLUMN IF NOT EXISTS zoom_display_name TEXT,
  ADD COLUMN IF NOT EXISTS screenshot_url TEXT,
  ADD COLUMN IF NOT EXISTS drive_file_id TEXT,
  ADD COLUMN IF NOT EXISTS attended_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Hapus constraint lama UNIQUE (event_id, person_id) agar peserta bisa absen Sesi Awal & Sesi Akhir
ALTER TABLE attendances 
  DROP CONSTRAINT IF EXISTS attendances_event_id_person_id_key;

-- 3. Pastikan CHECK constraint untuk session_type (CHECK_IN = Awal, CHECK_OUT = Akhir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendances_session_type_check'
  ) THEN
    ALTER TABLE attendances 
      ADD CONSTRAINT attendances_session_type_check 
      CHECK (session_type IN ('CHECK_IN', 'CHECK_OUT', 'MANUAL'));
  END IF;
END $$;

-- 4. Indeks Anti-Duplikasi: Mencegah peserta absen lebih dari 1 kali per sesi
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendances_event_person_session
  ON attendances (event_id, person_id, session_type);

-- 5. Izinkan read & write tabel attendances untuk admin/anonim
DROP POLICY IF EXISTS "Staff read attendances" ON attendances;
DROP POLICY IF EXISTS "Allow all read attendances" ON attendances;
CREATE POLICY "Allow all read attendances" 
  ON attendances FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Staff manage attendances" ON attendances;
DROP POLICY IF EXISTS "Allow manage attendances" ON attendances;
CREATE POLICY "Allow manage attendances" 
  ON attendances FOR ALL 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

-- 6. Stored Procedure Anti-Fraud Presensi Mandiri Peserta (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.submit_participant_attendance(
  p_event_id UUID,
  p_email TEXT,
  p_session_type TEXT,
  p_zoom_display_name TEXT,
  p_screenshot_url TEXT,
  p_drive_file_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean_email TEXT;
  v_person_id UUID;
  v_full_name TEXT;
  v_reg_id UUID;
  v_reg_status TEXT;
  v_new_att_id UUID;
  v_event_title TEXT;
BEGIN
  -- 1. Normalisasi email
  v_clean_email := LOWER(TRIM(p_email));
  IF v_clean_email IS NULL OR v_clean_email = '' THEN
    RAISE EXCEPTION 'Email pendaftaran wajib diisi untuk melakukan presensi.';
  END IF;

  -- 2. Validasi format sesi
  IF p_session_type NOT IN ('CHECK_IN', 'CHECK_OUT') THEN
    RAISE EXCEPTION 'Tipe sesi presensi tidak valid. Pilih CHECK_IN (Sesi Awal) atau CHECK_OUT (Sesi Akhir).';
  END IF;

  -- 3. Cek keberadaan acara
  SELECT title INTO v_event_title FROM events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Acara pelatihan tidak ditemukan di database.';
  END IF;

  -- 4. Cari identitas peserta berdasarkan email
  SELECT id, full_name INTO v_person_id, v_full_name
  FROM persons 
  WHERE LOWER(email) = v_clean_email 
  LIMIT 1;

  IF v_person_id IS NULL THEN
    RAISE EXCEPTION 'Email "%" tidak ditemukan pada database peserta. Pastikan menggunakan email yang Anda daftarkan.', p_email;
  END IF;

  -- 5. Cari pendaftaran pada event ini (baik pendaftar utama atau anggota grup MABAR)
  SELECT r.id, r.status::TEXT
  INTO v_reg_id, v_reg_status
  FROM registrations r
  LEFT JOIN registration_members rm ON rm.registration_id = r.id
  WHERE r.event_id = p_event_id 
    AND (r.person_id = v_person_id OR rm.person_id = v_person_id)
    AND r.status != 'CANCELLED'
  ORDER BY (r.person_id = v_person_id) DESC
  LIMIT 1;

  IF v_reg_id IS NULL THEN
    RAISE EXCEPTION 'Peserta "%" tidak terdaftar pada program "%".', v_full_name, v_event_title;
  END IF;

  -- 6. Wajib berstatus LUNAS (registrations.status IN ('PAID', 'CONFIRMED', 'ATTENDED') atau ada pembayaran terverifikasi)
  IF v_reg_status NOT IN ('PAID', 'CONFIRMED', 'ATTENDED') AND NOT EXISTS (
    SELECT 1 FROM payments p WHERE p.registration_id = v_reg_id AND p.status = 'VERIFIED'
  ) THEN
    RAISE EXCEPTION 'Status pendaftaran atas nama "%" belum terverifikasi LUNAS oleh Admin. Presensi ditolak.', v_full_name;
  END IF;

  -- 7. Proteksi Anti-Duplikasi: Cek apakah sudah pernah absen di sesi ini
  IF EXISTS (
    SELECT 1 FROM attendances 
    WHERE event_id = p_event_id 
      AND person_id = v_person_id 
      AND session_type = p_session_type
  ) THEN
    RAISE EXCEPTION 'Anda ("%") sudah melakukan presensi untuk % sebelumnya. Presensi hanya diizinkan 1 kali per sesi.', 
      v_full_name, 
      CASE WHEN p_session_type = 'CHECK_IN' THEN 'Sesi 1 (Awal)' ELSE 'Sesi 2 (Akhir)' END;
  END IF;

  -- 8. Catat presensi ke database
  v_new_att_id := gen_random_uuid();
  INSERT INTO attendances (
    id,
    event_id,
    person_id,
    registration_id,
    session_type,
    zoom_display_name,
    screenshot_url,
    drive_file_id,
    attended_at,
    status,
    notes
  ) VALUES (
    v_new_att_id,
    p_event_id,
    v_person_id,
    v_reg_id,
    p_session_type,
    TRIM(p_zoom_display_name),
    p_screenshot_url,
    p_drive_file_id,
    NOW(),
    'ATTENDED',
    CASE WHEN p_session_type = 'CHECK_IN' THEN 'Presensi Mandiri Sesi Awal' ELSE 'Presensi Mandiri Sesi Akhir' END
  );

  -- 9. Return konfirmasi sukses
  RETURN jsonb_build_object(
    'success', true,
    'attendance_id', v_new_att_id,
    'full_name', v_full_name,
    'email', v_clean_email,
    'session_type', p_session_type,
    'event_title', v_event_title,
    'attended_at', NOW(),
    'message', 'Presensi ' || CASE WHEN p_session_type = 'CHECK_IN' THEN 'Sesi Awal' ELSE 'Sesi Akhir' END || ' berhasil diverifikasi!'
  );
END;
$$;

-- Izinkan akses publik (anon & authenticated) untuk submit presensi
GRANT EXECUTE ON FUNCTION public.submit_participant_attendance TO anon, authenticated;

-- ==============================================================================
-- 6. Dukungan Paket Rombongan Dinamis (Webinar MABAR_11 & Bootcamp MABAR_6)
--    Memperbarui submit_web_registration agar v_is_mabar aktif untuk semua tipe paket rombongan
-- ==============================================================================
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

  -- 10. Terbitkan Tiket Pendaftar Utama
  INSERT INTO public.tickets (
    registration_id, ticket_code, status, is_mabar_leader
  ) VALUES (
    v_new_reg_id, v_ticket_no, 'ACTIVE', v_is_mabar
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

GRANT EXECUTE ON FUNCTION public.submit_web_registration TO anon, authenticated;

