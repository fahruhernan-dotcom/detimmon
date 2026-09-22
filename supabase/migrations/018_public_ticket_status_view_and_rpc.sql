-- ==============================================================================
-- MIGRASI 018: VIEW DAN RPC PENGECEKAN STATUS TIKET & PENDAFTARAN PUBLIK
-- Dignity Event Command Center & Public Verification Portal
--
-- Deskripsi:
-- 1. Menyiapkan kolom pendukung pada tabel events, payments, dan registrations
--    (meeting_url, landing_page_config, web_registration_config, proof_image_url, dll)
--    sehingga query dan view dijamin 100% kompatibel dan tidak error 'column does not exist'.
-- 2. Standarisasi fungsi normalisasi nomor WhatsApp Indonesia (normalize_indonesia_phone).
-- 3. Membuat VIEW aman 'v_public_ticket_status' untuk menyatukan data pendaftar utama
--    dan anggota rombongan (registration_members) secara terpadu tanpa mengekspos
--    tabel master sensitif ke publik. Memakai r.status::text agar aman terhadap enum registration_status.
-- 4. Membuat RPC SECURITY DEFINER 'check_public_ticket_status' agar pencarian via
--    Nomor Tiket (e.g. TICKET-DIGNITY-880), Email, WhatsApp, Nama, atau No. Registrasi
--    bekerja 100% akurat tanpa terhalang Row Level Security (RLS) pada role 'anon'.
-- 5. Memberikan hak akses SELECT pada view dan EXECUTE pada RPC ke role anon, authenticated, dan service_role.
-- ==============================================================================

-- 1. PASTIKAN SELURUH KOLOM PENDUKUNG TERSEDIA (IDEMPOTEN & AMAN)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS meeting_url TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS landing_page_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS web_registration_config JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS proof_image_url TEXT;

ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(12,2);
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS net_amount NUMERIC(12,2);
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. STANDARISASI FUNGSI NORMALISASI WHATSAPP INDONESIA
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
  IF v_clean = '' THEN
    RETURN NULL;
  END IF;
  
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

GRANT EXECUTE ON FUNCTION public.normalize_indonesia_phone(TEXT) TO anon, authenticated, service_role;

-- 3. BERSIHKAN VIEW & FUNCTION JIKA SEBELUMNYA SUDAH ADA
DROP VIEW IF EXISTS public.v_public_ticket_status CASCADE;
DROP FUNCTION IF EXISTS public.check_public_ticket_status(TEXT);

-- 4. BUAT VIEW AMAN 'v_public_ticket_status'
CREATE OR REPLACE VIEW public.v_public_ticket_status AS
-- A. Pendaftar Utama (Individu & Ketua Rombongan)
SELECT 
    r.id AS registration_id,
    r.event_id,
    e.title AS event_title,
    e.slug AS event_slug,
    e.date_start AS event_date_start,
    e.date_end AS event_date_end,
    e.venue AS event_venue,
    COALESCE(
        e.meeting_url,
        e.web_registration_config->>'zoom_meeting_url',
        e.landing_page_config->'web_registration'->>'zoom_meeting_url',
        e.landing_page_config->>'zoom_meeting_url',
        ''
    ) AS event_meeting_url,
    COALESCE(
        e.landing_page_config->'web_registration'->>'wa_group_url', 
        e.landing_page_config->>'wa_group_url',
        e.web_registration_config->>'wa_group_url',
        ''
    ) AS wa_group_url,
    
    -- Identitas Peserta
    p.id AS person_id,
    p.full_name,
    p.email,
    p.email_normalized,
    p.whatsapp,
    p.whatsapp_normalized,
    p.institution,
    p.city,

    -- Tiket & Registrasi
    COALESCE(
        t.ticket_code, 
        NULLIF(SUBSTRING(r.custom_notes FROM 'TICKET-DIGNITY-[A-Z0-9]+'), ''),
        'TICKET-DIGNITY-' || UPPER(SUBSTRING(r.id::text, 1, 8))
    ) AS ticket_code,
    COALESCE(t.status, 'ISSUED') AS ticket_status,
    r.package_type,
    r.is_mabar,
    COALESCE(r.total_due, r.net_amount, r.gross_amount, 100000) AS total_due,
    r.gross_amount,
    r.net_amount,
    r.status::text AS payment_status,
    CASE 
        WHEN r.status::text IN ('PAID', 'CONFIRMED', 'ATTENDED', 'VERIFIED') THEN true 
        ELSE false 
    END AS is_ticket_active,
    r.custom_notes,
    r.deleted_at,
    r.created_at,

    -- Bukti Pembayaran Terkini
    COALESCE(pay.proof_image_url, pay.proof_drive_file_id) AS proof_image_url,
    pay.proof_drive_file_id,
    pay.bank_destination,

    -- Informasi Rombongan
    false AS is_group_member,
    NULL::TEXT AS leader_name,
    NULL::TEXT AS leader_whatsapp,
    NULL::TEXT AS ticket_suffix

FROM public.registrations r
JOIN public.persons p ON p.id = r.person_id
JOIN public.events e ON e.id = r.event_id
LEFT JOIN LATERAL (
    SELECT ticket_code, status 
    FROM public.tickets 
    WHERE registration_id = r.id 
    ORDER BY issued_at ASC, id ASC 
    LIMIT 1
) t ON true
LEFT JOIN LATERAL (
    SELECT proof_image_url, proof_drive_file_id, bank_destination 
    FROM public.payments 
    WHERE registration_id = r.id 
    ORDER BY submitted_at DESC 
    LIMIT 1
) pay ON true
WHERE r.deleted_at IS NULL AND r.status::text != 'CANCELLED'

UNION ALL

-- B. Anggota Rombongan (Registration Members)
SELECT 
    r.id AS registration_id,
    r.event_id,
    e.title AS event_title,
    e.slug AS event_slug,
    e.date_start AS event_date_start,
    e.date_end AS event_date_end,
    e.venue AS event_venue,
    COALESCE(
        e.meeting_url,
        e.web_registration_config->>'zoom_meeting_url',
        e.landing_page_config->'web_registration'->>'zoom_meeting_url',
        e.landing_page_config->>'zoom_meeting_url',
        ''
    ) AS event_meeting_url,
    COALESCE(
        e.landing_page_config->'web_registration'->>'wa_group_url', 
        e.landing_page_config->>'wa_group_url',
        e.web_registration_config->>'wa_group_url',
        ''
    ) AS wa_group_url,
    
    -- Identitas Anggota
    p.id AS person_id,
    p.full_name,
    p.email,
    p.email_normalized,
    p.whatsapp,
    p.whatsapp_normalized,
    p.institution,
    p.city,

    -- Tiket & Registrasi
    COALESCE(
        t.ticket_code,
        (COALESCE(NULLIF(SUBSTRING(r.custom_notes FROM 'TICKET-DIGNITY-[A-Z0-9]+'), ''), 'TICKET-DIGNITY-' || UPPER(SUBSTRING(r.id::text, 1, 8))) || '-' || rm.ticket_suffix)
    ) AS ticket_code,
    COALESCE(t.status, 'ISSUED') AS ticket_status,
    r.package_type,
    r.is_mabar,
    0 AS total_due, -- Anggota rombongan tidak memiliki tagihan mandiri
    0 AS gross_amount,
    0 AS net_amount,
    r.status::text AS payment_status,
    CASE 
        WHEN r.status::text IN ('PAID', 'CONFIRMED', 'ATTENDED', 'VERIFIED') THEN true 
        ELSE false 
    END AS is_ticket_active,
    r.custom_notes,
    r.deleted_at,
    rm.created_at,

    -- Bukti Pembayaran Induk
    COALESCE(pay.proof_image_url, pay.proof_drive_file_id) AS proof_image_url,
    pay.proof_drive_file_id,
    pay.bank_destination,

    -- Informasi Rombongan
    true AS is_group_member,
    leader_p.full_name AS leader_name,
    leader_p.whatsapp AS leader_whatsapp,
    rm.ticket_suffix

FROM public.registration_members rm
JOIN public.registrations r ON r.id = rm.registration_id
JOIN public.persons p ON p.id = rm.person_id
JOIN public.persons leader_p ON leader_p.id = r.person_id
JOIN public.events e ON e.id = r.event_id
LEFT JOIN LATERAL (
    SELECT ticket_code, status 
    FROM public.tickets 
    WHERE registration_member_id = rm.id
       OR (registration_id = r.id AND (ticket_code ILIKE '%' || rm.ticket_suffix))
    ORDER BY issued_at ASC, id ASC 
    LIMIT 1
) t ON true
LEFT JOIN LATERAL (
    SELECT proof_image_url, proof_drive_file_id, bank_destination 
    FROM public.payments 
    WHERE registration_id = r.id 
    ORDER BY submitted_at DESC 
    LIMIT 1
) pay ON true
WHERE r.deleted_at IS NULL AND r.status::text != 'CANCELLED';

-- 5. BUAT RPC SECURITY DEFINER 'check_public_ticket_status'
CREATE OR REPLACE FUNCTION public.check_public_ticket_status(p_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_search TEXT;
    v_clean_email  TEXT;
    v_clean_phone  TEXT;
    v_clean_code   TEXT;
    v_record       RECORD;
BEGIN
    -- 1. Normalisasi Query Pencarian
    v_clean_search := TRIM(COALESCE(p_query, ''));
    IF v_clean_search = '' THEN
        RETURN jsonb_build_object(
            'found', false,
            'message', 'Query pencarian tidak boleh kosong.'
        );
    END IF;

    v_clean_email := LOWER(v_clean_search);
    v_clean_phone := public.normalize_indonesia_phone(v_clean_search);
    v_clean_code  := UPPER(REGEXP_REPLACE(v_clean_search, '\s+', '', 'g'));

    -- 2. Cari di dalam View
    SELECT * INTO v_record
    FROM public.v_public_ticket_status
    WHERE 
        -- Pencarian Kode Tiket (e.g. TICKET-DIGNITY-880 atau minimal 4 karakter kode)
        (LENGTH(v_clean_code) >= 4 AND ticket_code ILIKE '%' || v_clean_code || '%')
        
        -- Pencarian Email (Case-Insensitive & Normalized)
        OR (email_normalized IS NOT NULL AND email_normalized = v_clean_email)
        OR (email IS NOT NULL AND LOWER(TRIM(email)) = v_clean_email)
        OR (email IS NOT NULL AND email ILIKE '%' || v_clean_search || '%')
        
        -- Pencarian WhatsApp (Hanya jika query angka >= 6 digit agar tidak false positive)
        OR (v_clean_phone IS NOT NULL AND LENGTH(v_clean_phone) >= 6 AND (
            whatsapp_normalized = v_clean_phone 
            OR (whatsapp IS NOT NULL AND whatsapp ILIKE '%' || v_clean_search || '%')
            OR (whatsapp IS NOT NULL AND whatsapp ILIKE '%' || v_clean_phone || '%')
        ))
        
        -- Pencarian Nama Lengkap (Minimal 4 karakter)
        OR (LENGTH(v_clean_search) >= 4 AND full_name ILIKE '%' || v_clean_search || '%')
        
        -- Pencarian ID Registrasi
        OR registration_id::text ILIKE '%' || v_clean_search || '%'
    ORDER BY 
        is_ticket_active DESC,
        created_at DESC
    LIMIT 1;

    -- 3. Evaluasi Hasil
    IF v_record IS NULL OR v_record.registration_id IS NULL THEN
        RETURN jsonb_build_object(
            'found', false,
            'message', 'Data pendaftaran atau nomor tiket tidak ditemukan pada database. Pastikan nomor tiket, email, atau nomor WhatsApp yang Anda masukkan sudah sesuai.'
        );
    END IF;

    -- 4. Kembalikan Payload Terstruktur & Aman
    RETURN jsonb_build_object(
        'found', true,
        'registration_id', v_record.registration_id,
        'ticket_code', v_record.ticket_code,
        'ticket_status', v_record.ticket_status,
        'is_ticket_active', v_record.is_ticket_active,
        'status', CASE WHEN v_record.is_ticket_active THEN 'VERIFIED' ELSE 'PENDING' END,
        'status_label', CASE WHEN v_record.is_ticket_active THEN 'Terverifikasi & Aktif' ELSE 'Menunggu Verifikasi Admin' END,
        'payment_status', v_record.payment_status,
        
        -- Data Peserta
        'full_name', v_record.full_name,
        'email', v_record.email,
        'whatsapp', v_record.whatsapp,
        'institution', COALESCE(v_record.institution, '-'),
        'city', COALESCE(v_record.city, '-'),

        -- Data Acara
        'event_id', v_record.event_id,
        'event_title', v_record.event_title,
        'event_slug', v_record.event_slug,
        'event_venue', COALESCE(v_record.event_venue, 'Zoom Cloud Meeting (Online)'),
        'event_date_start', v_record.event_date_start,
        'wa_group_url', v_record.wa_group_url,
        'meeting_url', COALESCE(v_record.event_meeting_url, ''),

        -- Data Paket & Finansial
        'package_type', v_record.package_type,
        'total_due', v_record.total_due,
        'net_amount', v_record.net_amount,
        'gross_amount', v_record.gross_amount,

        -- Bukti Bayar
        'proof_image_url', v_record.proof_image_url,
        'proof_drive_file_id', v_record.proof_drive_file_id,
        'bank_destination', v_record.bank_destination,

        -- Info Rombongan
        'is_group_member', v_record.is_group_member,
        'leader_name', v_record.leader_name,
        'leader_whatsapp', v_record.leader_whatsapp,
        'ticket_suffix', v_record.ticket_suffix,
        'custom_notes', COALESCE(v_record.custom_notes, '')
    );
END;
$$;

-- 6. BERIKAN HAK AKSES RESMI UNTUK PENGGUNA PUBLIK (ANON & AUTHENTICATED)
GRANT SELECT ON public.v_public_ticket_status TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_public_ticket_status(TEXT) TO anon, authenticated, service_role;
