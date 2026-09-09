-- ==============================================================================
-- DIGNITY ADMIN COMMAND CENTER - MIGRATION 005
-- (PHASE 9: SCALABLE VOUCHER SYSTEM — SERVER-SIDE VALIDATION & AUDIT)
-- LPK Indonesia Dignity in Collaboration with KLTC®
-- ==============================================================================
-- Menggantikan sistem voucher hardcoded di frontend dengan:
-- 1. Tabel `vouchers` — Admin bisa buat/edit/revoke kode dari UI tanpa deploy
-- 2. Tabel `voucher_usages` — Audit log setiap klaim (siapa, kapan, berapa)
-- 3. Kolom baru di `registrations` — gross_amount, discount_applied, net_amount, voucher_id
-- 4. RPC `validate_voucher` — Server validasi & kalkulasi diskon (anti-manipulasi)
-- 5. RPC `submit_web_registration` v2 — Atomik: validasi + insert + catat usage
-- 6. View `v_voucher_stats` — Dashboard admin real-time
-- 7. Auto-seeding 2 voucher dari funnel yang sudah ada
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. TABEL VOUCHERS
-- ==============================================================================
-- Drop tabel lama jika skemanya tidak kompatibel (development stage — belum ada data produksi)
-- Ini aman karena voucher_usages pun belum ada saat ini
DROP TABLE IF EXISTS public.voucher_usages CASCADE;
DROP TABLE IF EXISTS public.vouchers CASCADE;

-- Buat tabel bersih dengan skema yang benar
CREATE TABLE public.vouchers (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL
);

-- Tambah SEMUA kolom dengan ADD COLUMN IF NOT EXISTS
-- Aman dijalankan berulang kali, tidak peduli state tabel yang ada
ALTER TABLE public.vouchers
  ADD COLUMN IF NOT EXISTS description       TEXT,
  ADD COLUMN IF NOT EXISTS discount_type     TEXT          NOT NULL DEFAULT 'FIXED',
  ADD COLUMN IF NOT EXISTS discount_value    NUMERIC(12,2) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_discount_cap  NUMERIC(12,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS min_purchase      NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_event_id   UUID          REFERENCES public.events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_event_id   UUID          REFERENCES public.events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS max_uses          INTEGER       DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS used_count        INTEGER       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valid_from        TIMESTAMPTZ   DEFAULT now(),
  ADD COLUMN IF NOT EXISTS valid_until       TIMESTAMPTZ   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_active         BOOLEAN       NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by        TEXT          DEFAULT 'ADMIN',
  ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now();

-- CHECK constraint discount_type (dibungkus DO EXCEPTION agar idempotent)
DO $$ BEGIN
  ALTER TABLE public.vouchers
    ADD CONSTRAINT vouchers_discount_type_check
    CHECK (discount_type IN ('FIXED', 'PERCENT'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.vouchers
    ADD CONSTRAINT vouchers_discount_value_check
    CHECK (discount_value > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.vouchers
    ADD CONSTRAINT vouchers_used_count_check
    CHECK (used_count >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- UNIQUE per-event: kode harus unik dalam satu event tertentu
CREATE UNIQUE INDEX IF NOT EXISTS idx_vouchers_code_per_event
  ON public.vouchers (code, target_event_id)
  WHERE target_event_id IS NOT NULL;

-- UNIQUE global: kode harus unik jika ditandai global (target_event_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_vouchers_code_global
  ON public.vouchers (code)
  WHERE target_event_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_vouchers_code         ON public.vouchers (code);
CREATE INDEX IF NOT EXISTS idx_vouchers_target_event ON public.vouchers (target_event_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_source_event ON public.vouchers (source_event_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_is_active    ON public.vouchers (is_active);
CREATE INDEX IF NOT EXISTS idx_vouchers_valid_until  ON public.vouchers (valid_until);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_vouchers_updated_at ON public.vouchers;
CREATE TRIGGER trg_vouchers_updated_at
  BEFORE UPDATE ON public.vouchers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- ==============================================================================
-- 2. TABEL VOUCHER_USAGES — Audit log setiap pemakaian
-- ==============================================================================
CREATE TABLE public.voucher_usages (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id       UUID          NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  registration_id  UUID          NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  person_id        UUID          NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  event_id         UUID          NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,

  -- Snapshot finansial saat klaim
  gross_amount     NUMERIC(12,2) NOT NULL,
  discount_applied NUMERIC(12,2) NOT NULL,
  net_amount       NUMERIC(12,2) NOT NULL,

  used_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- Satu registrasi hanya boleh pakai satu voucher
  UNIQUE (registration_id)
);

CREATE INDEX IF NOT EXISTS idx_voucher_usages_voucher_id     ON public.voucher_usages (voucher_id);
CREATE INDEX IF NOT EXISTS idx_voucher_usages_person_id      ON public.voucher_usages (person_id);
CREATE INDEX IF NOT EXISTS idx_voucher_usages_event_id       ON public.voucher_usages (event_id);
CREATE INDEX IF NOT EXISTS idx_voucher_usages_used_at        ON public.voucher_usages (used_at DESC);


-- ==============================================================================
-- 3. KOLOM TAMBAHAN DI REGISTRATIONS
-- ==============================================================================
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS voucher_id        UUID          REFERENCES public.vouchers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS voucher_code_used TEXT          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS gross_amount      NUMERIC(12,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS discount_applied  NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount        NUMERIC(12,2) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_registrations_voucher_id ON public.registrations (voucher_id);

-- Backfill: registrasi lama tanpa voucher → gross = net = total_due, discount = 0
UPDATE public.registrations
SET
  gross_amount     = total_due,
  net_amount       = total_due,
  discount_applied = 0
WHERE gross_amount IS NULL;


-- ==============================================================================
-- 4. RPC: validate_voucher
-- Validasi & kalkulasi diskon dari sisi server (PURE READ — tidak ubah state)
-- Dipanggil frontend sebelum submit untuk preview diskon.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.validate_voucher(
  p_voucher_code  TEXT,
  p_event_id      UUID,
  p_gross_amount  NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_voucher       public.vouchers%ROWTYPE;
  v_discount_calc NUMERIC(12,2);
  v_net_amount    NUMERIC(12,2);
  v_code_upper    TEXT;
BEGIN
  v_code_upper := UPPER(TRIM(p_voucher_code));

  -- Cari voucher: kode cocok DAN (spesifik event ini ATAU global)
  -- Prioritaskan voucher spesifik event di atas global
  SELECT * INTO v_voucher
  FROM public.vouchers
  WHERE code = v_code_upper
    AND (target_event_id = p_event_id OR target_event_id IS NULL)
    AND is_active = true
  ORDER BY (target_event_id = p_event_id) DESC NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid',      false,
      'error_code', 'VOUCHER_NOT_FOUND',
      'message',    'Kode voucher tidak valid atau tidak berlaku untuk acara ini.'
    );
  END IF;

  -- Cek masa berlaku (valid_from)
  IF v_voucher.valid_from IS NOT NULL AND now() < v_voucher.valid_from THEN
    RETURN jsonb_build_object(
      'valid',      false,
      'error_code', 'VOUCHER_NOT_YET_ACTIVE',
      'message',    'Voucher ini belum aktif. Berlaku mulai ' ||
                    TO_CHAR(v_voucher.valid_from AT TIME ZONE 'Asia/Jakarta', 'DD Mon YYYY HH24:MI') || ' WIB.'
    );
  END IF;

  -- Cek masa berlaku (valid_until)
  IF v_voucher.valid_until IS NOT NULL AND now() > v_voucher.valid_until THEN
    RETURN jsonb_build_object(
      'valid',      false,
      'error_code', 'VOUCHER_EXPIRED',
      'message',    'Masa berlaku voucher ini sudah berakhir pada ' ||
                    TO_CHAR(v_voucher.valid_until AT TIME ZONE 'Asia/Jakarta', 'DD Mon YYYY') || '.'
    );
  END IF;

  -- Cek kuota
  IF v_voucher.max_uses IS NOT NULL AND v_voucher.used_count >= v_voucher.max_uses THEN
    RETURN jsonb_build_object(
      'valid',      false,
      'error_code', 'VOUCHER_QUOTA_EXHAUSTED',
      'message',    'Kuota voucher ini sudah habis (' || v_voucher.used_count ||
                    '/' || v_voucher.max_uses || ' klaim terpakai).'
    );
  END IF;

  -- Cek minimal pembelian
  IF p_gross_amount < v_voucher.min_purchase THEN
    RETURN jsonb_build_object(
      'valid',      false,
      'error_code', 'BELOW_MIN_PURCHASE',
      'message',    'Minimum pembelian untuk voucher ini adalah Rp ' ||
                    TO_CHAR(v_voucher.min_purchase, 'FM999G999G999') || '.'
    );
  END IF;

  -- Hitung diskon
  IF v_voucher.discount_type = 'FIXED' THEN
    v_discount_calc := LEAST(v_voucher.discount_value, p_gross_amount);
  ELSIF v_voucher.discount_type = 'PERCENT' THEN
    v_discount_calc := ROUND((p_gross_amount * v_voucher.discount_value / 100.0), 0);
    IF v_voucher.max_discount_cap IS NOT NULL THEN
      v_discount_calc := LEAST(v_discount_calc, v_voucher.max_discount_cap);
    END IF;
  ELSE
    v_discount_calc := 0;
  END IF;

  v_net_amount := GREATEST(0, p_gross_amount - v_discount_calc);

  RETURN jsonb_build_object(
    'valid',            true,
    'voucher_id',       v_voucher.id,
    'code',             v_voucher.code,
    'description',      v_voucher.description,
    'discount_type',    v_voucher.discount_type,
    'discount_value',   v_voucher.discount_value,
    'discount_applied', v_discount_calc,
    'gross_amount',     p_gross_amount,
    'net_amount',       v_net_amount,
    'remaining_uses',   CASE
                          WHEN v_voucher.max_uses IS NULL THEN 'Tidak Terbatas'
                          ELSE (v_voucher.max_uses - v_voucher.used_count)::TEXT || ' sisa'
                        END,
    'message',          'Voucher valid! Potongan Rp ' ||
                        TO_CHAR(v_discount_calc, 'FM999G999G999') || ' berhasil diterapkan.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_voucher TO anon, authenticated;


-- ==============================================================================
-- 5. RPC: submit_web_registration v2
-- Identik dengan v1 + tambahan parameter p_voucher_code.
-- Server re-validasi voucher secara atomik dan catat penggunaan.
-- ==============================================================================
-- Hapus versi lama (13 param, dari migration 004) agar tidak ada overload ambigu
DROP FUNCTION IF EXISTS public.submit_web_registration(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, JSONB
);

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
  p_voucher_code     TEXT        DEFAULT NULL       -- [NEW v2]
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

  -- 2. Normalisasi Input
  v_clean_name  := TRIM(REGEXP_REPLACE(p_full_name, '\s+', ' ', 'g'));
  v_clean_email := LOWER(TRIM(p_email));
  v_clean_wa    := REGEXP_REPLACE(p_whatsapp, '[^0-9]', '', 'g');
  IF v_clean_wa LIKE '08%' THEN
    v_clean_wa := '628' || SUBSTRING(v_clean_wa FROM 3);
  END IF;

  IF LENGTH(v_clean_name) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_NAME',
      'message', 'Nama lengkap minimal 3 karakter.');
  END IF;

  -- 3. [NEW v2] Server-Side Voucher Re-Validation
  v_gross_amount := p_total_due;
  v_net_amount   := p_total_due;

  IF p_voucher_code IS NOT NULL AND TRIM(p_voucher_code) != '' THEN
    v_voucher_code_up := UPPER(TRIM(p_voucher_code));
    v_voucher_result  := public.validate_voucher(v_voucher_code_up, p_event_id, v_gross_amount);

    IF (v_voucher_result->>'valid')::boolean THEN
      v_voucher_id := (v_voucher_result->>'voucher_id')::UUID;
      v_discount   := (v_voucher_result->>'discount_applied')::NUMERIC;
      v_net_amount := (v_voucher_result->>'net_amount')::NUMERIC;
    END IF;
    -- Jika tidak valid: lanjut tanpa diskon (tidak block pendaftaran)
  END IF;

  -- 4. Upsert Person
  SELECT id INTO v_person_id
  FROM public.persons
  WHERE email_normalized = v_clean_email
     OR (v_clean_wa != '' AND whatsapp_normalized = v_clean_wa)
  ORDER BY created_at ASC LIMIT 1;

  IF v_person_id IS NULL THEN
    INSERT INTO public.persons (full_name, email, whatsapp, institution, city)
    VALUES (v_clean_name, v_clean_email, v_clean_wa,
            COALESCE(NULLIF(TRIM(p_institution), ''), '-'),
            COALESCE(NULLIF(TRIM(p_city), ''), 'Surakarta'))
    RETURNING id INTO v_person_id;
  ELSE
    UPDATE public.persons SET
      full_name   = CASE WHEN LENGTH(full_name) < LENGTH(v_clean_name) THEN v_clean_name ELSE full_name END,
      institution = CASE WHEN institution = '-' AND p_institution IS NOT NULL THEN p_institution ELSE institution END,
      city        = CASE WHEN city = 'Surakarta' AND p_city IS NOT NULL THEN p_city ELSE city END
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

  -- 6. Insert Registrasi Baru
  v_is_mabar  := (p_package_type = 'MABAR_6');
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

  -- 8. [NEW v2] Catat Voucher Usage & Increment used_count (Atomik)
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

  -- 10. Return Sukses
  RETURN jsonb_build_object(
    'success',          true,
    'is_duplicate',     false,
    'status',           'NEW',
    'registration_id',  v_new_reg_id,
    'ticket_number',    v_ticket_no,
    'voucher_applied',  v_voucher_id IS NOT NULL,
    'discount_applied', v_discount,
    'gross_amount',     v_gross_amount,
    'net_amount',       v_net_amount,
    'message',          COALESCE(
                          v_event.web_registration_config->>'success_message',
                          'Pendaftaran berhasil dicatat! Tiket & tautan akses akan dikirimkan setelah verifikasi pembayaran.'
                        ),
    'wa_group_url',     COALESCE(v_event.web_registration_config->>'wa_group_url', '')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_web_registration(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, JSONB, TEXT
) TO anon, authenticated;


-- ==============================================================================
-- 6. RLS — Row Level Security
-- ==============================================================================
ALTER TABLE public.vouchers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_usages ENABLE ROW LEVEL SECURITY;

-- Publik bisa baca voucher aktif (untuk validasi di form publik)
DROP POLICY IF EXISTS "Public read active vouchers"  ON public.vouchers;
CREATE POLICY "Public read active vouchers"
  ON public.vouchers FOR SELECT
  USING (is_active = true);

-- Staf bisa baca & tulis semua voucher
DROP POLICY IF EXISTS "Staff full access vouchers" ON public.vouchers;
CREATE POLICY "Staff full access vouchers"
  ON public.vouchers FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Voucher usages: hanya staf yang bisa baca (audit)
DROP POLICY IF EXISTS "Staff read voucher usages" ON public.voucher_usages;
CREATE POLICY "Staff read voucher usages"
  ON public.voucher_usages FOR SELECT
  USING (public.is_staff());

-- GRANT akses untuk admin UI
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vouchers        TO authenticated;
GRANT SELECT                          ON public.voucher_usages TO authenticated;
GRANT SELECT                          ON public.vouchers       TO anon;


-- ==============================================================================
-- 7. SEEDING
-- ==============================================================================
-- Tidak ada seeding hardcoded. Voucher dibuat melalui Admin UI (VoucherManagementView).
-- Gunakan panel admin untuk membuat voucher sesuai kebutuhan event.


-- ==============================================================================
-- 8. VIEW: v_voucher_stats — Dashboard admin real-time
-- ==============================================================================
CREATE OR REPLACE VIEW public.v_voucher_stats AS
SELECT
  v.id,
  v.code,
  v.description,
  v.discount_type,
  v.discount_value,
  v.max_discount_cap,
  v.min_purchase,
  v.max_uses,
  v.used_count,
  v.is_active,
  v.valid_from,
  v.valid_until,
  v.created_by,
  v.created_at,
  te.title    AS target_event_title,
  te.slug     AS target_event_slug,
  se.title    AS source_event_title,
  se.slug     AS source_event_slug,

  -- Statistik finansial dari klaim
  COUNT(vu.id)                              AS total_claims,
  COALESCE(SUM(vu.discount_applied), 0)    AS total_discount_given,
  COALESCE(SUM(vu.gross_amount), 0)        AS total_gross_revenue,
  COALESCE(SUM(vu.net_amount), 0)          AS total_net_revenue,

  -- Label kuota & status efektif
  CASE
    WHEN v.max_uses IS NULL THEN 'Tidak Terbatas'
    ELSE (v.max_uses - v.used_count)::TEXT || ' sisa dari ' || v.max_uses::TEXT
  END AS quota_label,

  CASE
    WHEN NOT v.is_active                                                THEN 'NONAKTIF'
    WHEN v.valid_until IS NOT NULL AND now() > v.valid_until            THEN 'EXPIRED'
    WHEN v.max_uses IS NOT NULL AND v.used_count >= v.max_uses          THEN 'HABIS KUOTA'
    ELSE 'AKTIF'
  END AS effective_status

FROM public.vouchers v
LEFT JOIN public.events         te ON te.id = v.target_event_id
LEFT JOIN public.events         se ON se.id = v.source_event_id
LEFT JOIN public.voucher_usages vu ON vu.voucher_id = v.id
GROUP BY v.id, te.title, te.slug, se.title, se.slug
ORDER BY v.created_at DESC;

GRANT SELECT ON public.v_voucher_stats TO authenticated;

COMMIT;
