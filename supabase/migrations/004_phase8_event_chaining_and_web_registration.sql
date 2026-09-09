-- ==============================================================================
-- DIGNITY ADMIN COMMAND CENTER - MIGRATION 004
-- (PHASE 8: EVENT CHAINING, WEB REGISTRATION CONFIG & ATOMIC ANTI-DUPLICATION INTAKE)
-- LPK Indonesia Dignity in Collaboration with KLTC®
-- ==============================================================================
-- File ini menyatukan dan menyempurnakan:
-- 1. Struktur relasi rantai acara (parent_event_id, next_event_id, funnel_role, rebate vouchers)
-- 2. Konfigurasi pendaftaran web mandiri (web_registration_config JSONB) tanpa QRIS
-- 3. Proteksi anti-duplikasi mutlak pada tabel registrations: UNIQUE(event_id, person_id)
-- 4. Seeding 3 acara berantai resmi dalam portfolio Dignity
-- 5. Stored procedure atomik `submit_web_registration` (SECURITY DEFINER) untuk public intake aman
-- 6. Kebijakan RLS & Grants untuk akses publik aman tanpa mengekspos data privat
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. KOLOM RELASI EVENT CHAINING & FUNNEL PORTFOLIO
-- ==============================================================================
ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS parent_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS next_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS funnel_role TEXT DEFAULT 'CORE_BOOTCAMP',
  ADD COLUMN IF NOT EXISTS funnel_stage_name TEXT,
  ADD COLUMN IF NOT EXISTS funnel_tagline TEXT,
  ADD COLUMN IF NOT EXISTS rebate_voucher_code TEXT,
  ADD COLUMN IF NOT EXISTS rebate_voucher_amount NUMERIC(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS lead_target_count INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS enrolled_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_events_parent_next 
  ON events(parent_event_id, next_event_id);

CREATE INDEX IF NOT EXISTS idx_events_funnel_role 
  ON events(funnel_role);

-- ==============================================================================
-- 2. KOLOM WEB REGISTRATION CONFIG (NATIVE WEB FORM SETTINGS)
-- ==============================================================================
ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS web_registration_config JSONB DEFAULT '{
    "is_open": true,
    "close_message": "Pendaftaran untuk program ini saat ini ditutup. Pantau batch selanjutnya melalui Instagram @lpkdignity.",
    "intake_source": "WEB_NATIVE",
    "banks": [
      {
        "bank_name": "Bank Mandiri",
        "account_number": "138-00-2455891-2",
        "account_holder": "LPK INDONESIA DIGNITY"
      },
      {
        "bank_name": "BCA",
        "account_number": "015-3882-901",
        "account_holder": "LPK INDONESIA DIGNITY"
      }
    ],
    "gdrive_proof_folder_id": "",
    "payment_time_limit_hours": 24,
    "form_fields": {
      "institution_required": false,
      "job_title_enabled": true,
      "city_enabled": true,
      "proof_upload_required": true
    },
    "allow_mabar": true,
    "wa_group_url": "https://chat.whatsapp.com/LPK-Dignity-Alumni",
    "success_message": "Pendaftaran berhasil dicatat! Tiket & tautan akses webinar akan dikirimkan otomatis setelah verifikasi pembayaran oleh Admin."
  }'::jsonb;

-- ==============================================================================
-- 3. INDEKS ANTI-DUPLIKASI REGISTRATIONS (ATOMIC PER-EVENT PERSON UNIQUENESS)
-- ==============================================================================
-- Bersihkan duplikasi histori testing lama jika ada sebelum membuat indeks unik
DELETE FROM registrations
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY event_id, person_id 
      ORDER BY created_at DESC, id DESC
    ) as rn
    FROM registrations
    WHERE status != 'CANCELLED'
  ) t
  WHERE t.rn > 1
);

-- Mencegah seorang peserta terdaftar lebih dari 1 kali secara aktif di acara yang sama
CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_event_person_active 
  ON registrations (event_id, person_id) 
  WHERE status != 'CANCELLED';

-- ==============================================================================
-- 4. SEEDING / UPSERT 3 ACARA BERSERI DALAM FUNNEL PORTFOLIO DIGNITY
-- ==============================================================================
-- Menggunakan ON CONFLICT (slug) agar aman terhadap UUID apapun yang sudah
-- ada sebelumnya di database Supabase (mencegah error duplicate key events_slug_key).

-- Acara 1: Pre-Event Webinar (Lead Magnet & Awareness)
INSERT INTO events (
  slug,
  title,
  event_type,
  date_start,
  date_end,
  venue,
  base_price,
  promo_price,
  status,
  capacity,
  funnel_role,
  funnel_stage_name,
  funnel_tagline,
  rebate_voucher_code,
  rebate_voucher_amount,
  lead_target_count,
  enrolled_count,
  web_registration_config
) VALUES (
  'msc-nov-2026',
  'Mastering Stage Confidence: Bicara Memikat, Karir Melesat',
  'WEBINAR',
  '2026-11-14 08:30:00+07',
  '2026-11-14 12:00:00+07',
  'Zoom Cloud Meeting',
  100000.00,
  100000.00,
  'PUBLISHED',
  500,
  'PRE_EVENT',
  '1. Pre-Event Lead Magnet & Awareness',
  'Penyaring antusiasme & pengantar keahlian panggung awal',
  'REBATE100K-ALUMNI',
  100000.00,
  100,
  52,
  '{
    "is_open": true,
    "close_message": "Pendaftaran untuk webinar ini saat ini ditutup. Pantau batch selanjutnya melalui Instagram @lpkdignity.",
    "intake_source": "WEB_NATIVE",
    "banks": [
      {
        "bank_name": "Bank Mandiri",
        "account_number": "138-00-2455891-2",
        "account_holder": "LPK INDONESIA DIGNITY"
      },
      {
        "bank_name": "BCA",
        "account_number": "015-3882-901",
        "account_holder": "LPK INDONESIA DIGNITY"
      }
    ],
    "gdrive_proof_folder_id": "",
    "payment_time_limit_hours": 24,
    "form_fields": {
      "institution_required": false,
      "job_title_enabled": true,
      "city_enabled": true,
      "proof_upload_required": true
    },
    "allow_mabar": true,
    "wa_group_url": "https://chat.whatsapp.com/LPK-Dignity-Webinar-Nov26",
    "success_message": "Pendaftaran berhasil dicatat! Tiket & tautan akses webinar akan dikirimkan otomatis setelah verifikasi pembayaran oleh Admin."
  }'::jsonb
) ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  event_type = EXCLUDED.event_type,
  date_start = EXCLUDED.date_start,
  date_end = EXCLUDED.date_end,
  venue = EXCLUDED.venue,
  base_price = EXCLUDED.base_price,
  promo_price = EXCLUDED.promo_price,
  status = EXCLUDED.status,
  capacity = EXCLUDED.capacity,
  funnel_role = EXCLUDED.funnel_role,
  funnel_stage_name = EXCLUDED.funnel_stage_name,
  funnel_tagline = EXCLUDED.funnel_tagline,
  rebate_voucher_code = EXCLUDED.rebate_voucher_code,
  rebate_voucher_amount = EXCLUDED.rebate_voucher_amount,
  lead_target_count = EXCLUDED.lead_target_count,
  enrolled_count = EXCLUDED.enrolled_count,
  web_registration_config = COALESCE(events.web_registration_config, EXCLUDED.web_registration_config);

-- Acara 2: Core Offline Bootcamp 2 Hari (Monetization & Mastery)
INSERT INTO events (
  slug,
  title,
  event_type,
  date_start,
  date_end,
  venue,
  base_price,
  promo_price,
  status,
  capacity,
  funnel_role,
  funnel_stage_name,
  funnel_tagline,
  rebate_voucher_code,
  rebate_voucher_amount,
  lead_target_count,
  enrolled_count,
  web_registration_config
) VALUES (
  'eb-solo-nov-2026',
  'Executive Bootcamp 2 Hari: Public Speaking & High-Impact Pitching',
  'BOOTCAMP',
  '2026-11-28 09:00:00+07',
  '2026-11-29 17:00:00+07',
  'Sala View Hotel Solo (Ballroom Lt. 2)',
  1500000.00,
  1400000.00,
  'PUBLISHED',
  50,
  'CORE_BOOTCAMP',
  '2. Core Intensive Offline Training',
  'Pelatihan tatap muka intensif 2 hari + simulasi live stage di hotel',
  'REBATE250K-CPSP',
  250000.00,
  50,
  18,
  '{
    "is_open": true,
    "close_message": "Pendaftaran untuk bootcamp offline di Sala View Hotel Solo saat ini telah penuh. Hubungi WhatsApp Admin untuk masuk waitlist.",
    "intake_source": "WEB_NATIVE",
    "banks": [
      {
        "bank_name": "Bank Mandiri",
        "account_number": "138-00-2455891-2",
        "account_holder": "LPK INDONESIA DIGNITY"
      },
      {
        "bank_name": "BCA",
        "account_number": "015-3882-901",
        "account_holder": "LPK INDONESIA DIGNITY"
      }
    ],
    "gdrive_proof_folder_id": "",
    "payment_time_limit_hours": 24,
    "form_fields": {
      "institution_required": true,
      "job_title_enabled": true,
      "city_enabled": true,
      "proof_upload_required": true
    },
    "allow_mabar": false,
    "wa_group_url": "https://chat.whatsapp.com/LPK-Bootcamp-Solo-Batch1",
    "success_message": "Pendaftaran Bootcamp berhasil dicatat! Konfirmasi reservasi hotel & jadwal rundown akan dikirimkan oleh Admin setelah verifikasi."
  }'::jsonb
) ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  event_type = EXCLUDED.event_type,
  date_start = EXCLUDED.date_start,
  date_end = EXCLUDED.date_end,
  venue = EXCLUDED.venue,
  base_price = EXCLUDED.base_price,
  promo_price = EXCLUDED.promo_price,
  status = EXCLUDED.status,
  capacity = EXCLUDED.capacity,
  funnel_role = EXCLUDED.funnel_role,
  funnel_stage_name = EXCLUDED.funnel_stage_name,
  funnel_tagline = EXCLUDED.funnel_tagline,
  rebate_voucher_code = EXCLUDED.rebate_voucher_code,
  rebate_voucher_amount = EXCLUDED.rebate_voucher_amount,
  lead_target_count = EXCLUDED.lead_target_count,
  enrolled_count = EXCLUDED.enrolled_count,
  web_registration_config = COALESCE(events.web_registration_config, EXCLUDED.web_registration_config);

-- Acara 3: Upsell Certification Masterclass CPSP® (Licensing)
INSERT INTO events (
  slug,
  title,
  event_type,
  date_start,
  date_end,
  venue,
  base_price,
  promo_price,
  status,
  capacity,
  funnel_role,
  funnel_stage_name,
  funnel_tagline,
  rebate_voucher_code,
  rebate_voucher_amount,
  lead_target_count,
  enrolled_count,
  web_registration_config
) VALUES (
  'cpsp-solo-des-2026',
  'Certified Professional Speaking Practitioner (CPSP®) Licensing Masterclass',
  'WORKSHOP',
  '2026-12-12 09:00:00+07',
  '2026-12-13 18:00:00+07',
  'Alila Hotel Solo (Executive Grand Ballroom)',
  3500000.00,
  3250000.00,
  'PUBLISHED',
  30,
  'UPSELL_CERTIFICATION',
  '3. High-Ticket Certification & Licensing',
  'Sertifikasi profesi resmi bersertifikat BNSP & gelar non-akademik CPSP®',
  NULL,
  0.00,
  30,
  8,
  '{
    "is_open": true,
    "close_message": "Pendaftaran ujian lisensi sertifikasi CPSP saat ini telah ditutup.",
    "intake_source": "WEB_NATIVE",
    "banks": [
      {
        "bank_name": "Bank Mandiri",
        "account_number": "138-00-2455891-2",
        "account_holder": "LPK INDONESIA DIGNITY"
      },
      {
        "bank_name": "BCA",
        "account_number": "015-3882-901",
        "account_holder": "LPK INDONESIA DIGNITY"
      }
    ],
    "gdrive_proof_folder_id": "",
    "payment_time_limit_hours": 24,
    "form_fields": {
      "institution_required": true,
      "job_title_enabled": true,
      "city_enabled": true,
      "proof_upload_required": true
    },
    "allow_mabar": false,
    "wa_group_url": "https://chat.whatsapp.com/LPK-CPSP-Alumni",
    "success_message": "Pendaftaran Masterclass CPSP berhasil dicatat! Tim asesor akan segera menghubungi Anda untuk verifikasi berkas prasyarat."
  }'::jsonb
) ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  event_type = EXCLUDED.event_type,
  date_start = EXCLUDED.date_start,
  date_end = EXCLUDED.date_end,
  venue = EXCLUDED.venue,
  base_price = EXCLUDED.base_price,
  promo_price = EXCLUDED.promo_price,
  status = EXCLUDED.status,
  capacity = EXCLUDED.capacity,
  funnel_role = EXCLUDED.funnel_role,
  funnel_stage_name = EXCLUDED.funnel_stage_name,
  funnel_tagline = EXCLUDED.funnel_tagline,
  rebate_voucher_code = EXCLUDED.rebate_voucher_code,
  rebate_voucher_amount = EXCLUDED.rebate_voucher_amount,
  lead_target_count = EXCLUDED.lead_target_count,
  enrolled_count = EXCLUDED.enrolled_count,
  web_registration_config = COALESCE(events.web_registration_config, EXCLUDED.web_registration_config);

-- Relasi Event Chaining Berseri (Dihubungkan secara dinamis via subquery slug agar aman terhadap UUID apapun)
UPDATE events
SET next_event_id = (SELECT id FROM events WHERE slug = 'eb-solo-nov-2026' LIMIT 1)
WHERE slug = 'msc-nov-2026';

UPDATE events
SET parent_event_id = (SELECT id FROM events WHERE slug = 'msc-nov-2026' LIMIT 1),
    next_event_id = (SELECT id FROM events WHERE slug = 'cpsp-solo-des-2026' LIMIT 1)
WHERE slug = 'eb-solo-nov-2026';

UPDATE events
SET parent_event_id = (SELECT id FROM events WHERE slug = 'eb-solo-nov-2026' LIMIT 1),
    next_event_id = NULL
WHERE slug = 'cpsp-solo-des-2026';

-- ==============================================================================
-- 5. STORED PROCEDURE: submit_web_registration (ATOMIC ANTI-DUPLICATION INTAKE)
-- ==============================================================================
-- Function ini beroperasi dengan SECURITY DEFINER agar publik ('anon') dapat
-- mendaftar dengan aman tanpa harus diberikan hak INSERT/SELECT langsung ke tabel sensitif.
CREATE OR REPLACE FUNCTION public.submit_web_registration(
  p_event_id UUID,
  p_full_name TEXT,
  p_email TEXT,
  p_whatsapp TEXT,
  p_institution TEXT DEFAULT NULL,
  p_job_title TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_package_type TEXT DEFAULT 'INDIVIDU',
  p_total_due NUMERIC DEFAULT 100000.00,
  p_bank_destination TEXT DEFAULT 'Bank Mandiri',
  p_proof_data TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_mabar_members JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event RECORD;
  v_person_id UUID;
  v_existing_reg RECORD;
  v_new_reg_id UUID;
  v_ticket_no TEXT;
  v_clean_name TEXT;
  v_clean_email TEXT;
  v_clean_wa TEXT;
  v_is_mabar BOOLEAN;
  v_member JSONB;
  v_member_person_id UUID;
  v_suffix_char CHAR(1);
  v_idx INT := 0;
BEGIN
  -- 1. Validasi Keberadaan dan Status Event
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'EVENT_NOT_FOUND',
      'message', 'Acara tidak ditemukan atau ID acara tidak valid.'
    );
  END IF;

  -- 2. Cek apakah form ditutup oleh admin
  IF (v_event.web_registration_config->>'is_open')::boolean IS FALSE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'REGISTRATION_CLOSED',
      'message', COALESCE(v_event.web_registration_config->>'close_message', 'Pendaftaran untuk acara ini saat ini telah ditutup.')
    );
  END IF;

  -- 3. Normalisasi Input Kontak & Nama
  v_clean_name := TRIM(REGEXP_REPLACE(p_full_name, '\s+', ' ', 'g'));
  v_clean_email := LOWER(TRIM(p_email));
  v_clean_wa := REGEXP_REPLACE(p_whatsapp, '[^0-9]', '', 'g');
  IF v_clean_wa LIKE '08%' THEN
    v_clean_wa := '628' || SUBSTRING(v_clean_wa FROM 3);
  END IF;

  IF LENGTH(v_clean_name) < 3 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_NAME',
      'message', 'Nama lengkap minimal 3 karakter.'
    );
  END IF;

  -- 4. Deduplikasi Person (Cari berdasarkan email atau whatsapp ternormalisasi)
  SELECT id INTO v_person_id 
  FROM persons 
  WHERE email_normalized = v_clean_email 
     OR (v_clean_wa != '' AND whatsapp_normalized = v_clean_wa)
  ORDER BY created_at ASC 
  LIMIT 1;

  IF v_person_id IS NULL THEN
    INSERT INTO persons (
      full_name,
      email,
      whatsapp,
      institution,
      city
    ) VALUES (
      v_clean_name,
      v_clean_email,
      v_clean_wa,
      COALESCE(NULLIF(TRIM(p_institution), ''), '-'),
      COALESCE(NULLIF(TRIM(p_city), ''), 'Surakarta')
    ) RETURNING id INTO v_person_id;
  ELSE
    -- Perbarui informasi profil jika sebelumnya kosong
    UPDATE persons SET
      full_name = CASE WHEN LENGTH(full_name) < LENGTH(v_clean_name) THEN v_clean_name ELSE full_name END,
      institution = CASE WHEN institution = '-' AND p_institution IS NOT NULL THEN p_institution ELSE institution END,
      city = CASE WHEN city = 'Surakarta' AND p_city IS NOT NULL THEN p_city ELSE city END
    WHERE id = v_person_id;
  END IF;

  -- 5. PENCEGAHAN DUPLIKASI PENDAFTARAN PADA EVENT YANG SAMA
  SELECT * INTO v_existing_reg 
  FROM registrations 
  WHERE event_id = p_event_id 
    AND person_id = v_person_id 
    AND status != 'CANCELLED'
  LIMIT 1;

  IF FOUND THEN
    -- Kasus A: Jika status sudah terverifikasi / lunas
    IF v_existing_reg.status IN ('CONFIRMED', 'ATTENDED') THEN
      RETURN jsonb_build_object(
        'success', true,
        'is_duplicate', true,
        'status', 'PAID',
        'registration_id', v_existing_reg.id,
        'message', 'Anda sudah terdaftar resmi pada acara ini dan status tiket Anda sudah aktif.',
        'wa_group_url', COALESCE(v_event.web_registration_config->>'wa_group_url', '')
      );
    END IF;

    -- Kasus B: Jika status masih menunggu verifikasi / pending
    -- Update berkas bukti transfer jika peserta mengunggah bukti baru
    IF p_proof_data IS NOT NULL AND LENGTH(p_proof_data) > 20 THEN
      UPDATE payments 
      SET proof_drive_file_id = p_proof_data,
          submitted_at = now()
      WHERE registration_id = v_existing_reg.id;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'is_duplicate', true,
      'status', 'PENDING',
      'registration_id', v_existing_reg.id,
      'message', 'Data pendaftaran Anda sudah pernah tercatat sebelumnya dan saat ini sedang menunggu verifikasi pembayaran oleh Admin.',
      'wa_group_url', COALESCE(v_event.web_registration_config->>'wa_group_url', '')
    );
  END IF;

  -- 6. PENDAFTARAN BARU (Atomic Insert)
  v_is_mabar := (p_package_type = 'MABAR_6');
  v_ticket_no := 'TICKET-DIGNITY-' || LPAD((FLOOR(RANDOM() * 900) + 100)::TEXT, 3, '0');

  INSERT INTO registrations (
    event_id,
    person_id,
    package_type,
    is_mabar,
    total_due,
    status,
    source_system,
    custom_notes
  ) VALUES (
    p_event_id,
    v_person_id,
    p_package_type,
    v_is_mabar,
    p_total_due,
    'NEW',
    'WEB_NATIVE',
    p_notes
  ) RETURNING id INTO v_new_reg_id;

  -- 7. Catat Entri Pembayaran Awal (Status PENDING)
  INSERT INTO payments (
    registration_id,
    amount,
    payment_method,
    bank_destination,
    proof_drive_file_id,
    status,
    submitted_at
  ) VALUES (
    v_new_reg_id,
    p_total_due,
    'BANK_TRANSFER',
    COALESCE(p_bank_destination, 'Bank Mandiri'),
    p_proof_data,
    'PENDING',
    now()
  );

  -- 8. Proses Anggota MABAR (Jika paket adalah MABAR 6)
  IF v_is_mabar AND jsonb_array_length(p_mabar_members) > 0 THEN
    FOR v_member IN SELECT * FROM jsonb_array_elements(p_mabar_members) LOOP
      IF NULLIF(TRIM(v_member->>'nama'), '') IS NOT NULL THEN
        v_idx := v_idx + 1;
        v_suffix_char := CHR(65 + v_idx); -- 'B', 'C', 'D', dst. (A = Leader)

        -- Cari atau buat person anggota
        SELECT id INTO v_member_person_id 
        FROM persons 
        WHERE email_normalized = LOWER(TRIM(COALESCE(v_member->>'email', '')))
           OR whatsapp_normalized = REGEXP_REPLACE(COALESCE(v_member->>'whatsapp', ''), '[^0-9]', '', 'g')
        LIMIT 1;

        IF v_member_person_id IS NULL THEN
          INSERT INTO persons (
            full_name,
            email,
            whatsapp,
            institution,
            city
          ) VALUES (
            TRIM(v_member->>'nama'),
            LOWER(NULLIF(TRIM(v_member->>'email'), '')),
            NULLIF(REGEXP_REPLACE(COALESCE(v_member->>'whatsapp', ''), '[^0-9]', '', 'g'), ''),
            COALESCE(NULLIF(TRIM(p_institution), ''), '-'),
            COALESCE(NULLIF(TRIM(p_city), ''), 'Surakarta')
          ) RETURNING id INTO v_member_person_id;
        END IF;

        -- Daftarkan ke registration_members
        INSERT INTO registration_members (
          registration_id,
          person_id,
          member_role,
          ticket_suffix
        ) VALUES (
          v_new_reg_id,
          v_member_person_id,
          'MEMBER',
          v_suffix_char
        ) ON CONFLICT (registration_id, person_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- Berikan respon sukses pendaftaran baru
  RETURN jsonb_build_object(
    'success', true,
    'is_duplicate', false,
    'status', 'NEW',
    'registration_id', v_new_reg_id,
    'ticket_number', v_ticket_no,
    'message', COALESCE(v_event.web_registration_config->>'success_message', 'Pendaftaran berhasil dicatat! Tiket & tautan akses webinar akan dikirimkan otomatis setelah verifikasi pembayaran.'),
    'wa_group_url', COALESCE(v_event.web_registration_config->>'wa_group_url', '')
  );
END;
$$;

-- ==============================================================================
-- 6. KEBIJAKAN KEAMANAN & HAK AKSES PUBLIK (RLS & GRANTS)
-- ==============================================================================
-- Izinkan anonim dan authenticated mengeksekusi function intake pendaftaran
GRANT EXECUTE ON FUNCTION public.submit_web_registration TO anon, authenticated;

-- Izinkan publik membaca acara berstatus 'PUBLISHED' agar formulir web bisa render
DROP POLICY IF EXISTS "Public and staff read events" ON events;
CREATE POLICY "Public and staff read events" 
  ON events FOR SELECT 
  USING (status = 'PUBLISHED' OR public.is_staff());

-- ==============================================================================
-- 7. STORED PROCEDURE: delete_event_cascade (SAFE CASCADE EVENT DELETION)
-- ==============================================================================
-- Function ini beroperasi dengan SECURITY DEFINER agar admin/staf dapat
-- menghapus acara beserta seluruh relasi terkait tanpa melanggar foreign key.
CREATE OR REPLACE FUNCTION public.delete_event_cascade(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_title TEXT;
BEGIN
  -- 1. Validasi keberadaan acara
  SELECT title INTO v_title FROM events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Acara tidak ditemukan atau ID tidak valid.'
    );
  END IF;

  -- 2. Lepaskan keterkaitan chaining dari acara lain
  UPDATE events SET parent_event_id = NULL WHERE parent_event_id = p_event_id;
  UPDATE events SET next_event_id = NULL WHERE next_event_id = p_event_id;

  -- 3. Hapus data anak pendaftaran acara ini (tiket, pembayaran, penyesuaian, anggota)
  DELETE FROM tickets WHERE registration_id IN (SELECT id FROM registrations WHERE event_id = p_event_id);
  DELETE FROM payments WHERE registration_id IN (SELECT id FROM registrations WHERE event_id = p_event_id);
  DELETE FROM payment_adjustments WHERE registration_id IN (SELECT id FROM registrations WHERE event_id = p_event_id);
  DELETE FROM registration_members WHERE registration_id IN (SELECT id FROM registrations WHERE event_id = p_event_id);

  -- 4. Hapus pendaftaran acara
  DELETE FROM registrations WHERE event_id = p_event_id;

  -- 5. Hapus absensi & sertifikat langsung acara
  DELETE FROM attendances WHERE event_id = p_event_id;
  DELETE FROM certificates WHERE event_id = p_event_id;

  -- 6. Hapus relasi speaker & message templates acara
  DELETE FROM event_speakers WHERE event_id = p_event_id;
  DELETE FROM message_templates WHERE event_id = p_event_id;

  -- 7. Hapus acara utama
  DELETE FROM events WHERE id = p_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_event_id', p_event_id,
    'message', 'Acara "' || v_title || '" beserta data terkait berhasil dihapus permanen.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_event_cascade TO anon, authenticated;

COMMIT;
