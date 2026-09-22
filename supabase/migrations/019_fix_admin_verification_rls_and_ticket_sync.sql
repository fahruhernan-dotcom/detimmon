-- ==============================================================================
-- DIGNITY ADMIN COMMAND CENTER - MIGRATION 019: FIX ADMIN VERIFICATION RLS & TICKET SYNC
-- LPK Indonesia Dignity (Hybrid Architecture: Google Workspace + Supabase Cloud)
-- ==============================================================================
-- Deskripsi Masalah yang Diselesaikan:
-- 1. FIX RLS (Row Level Security): Web Admin menggunakan klien Supabase dengan anon key.
--    Sebelumnya tidak ada policy UPDATE & DELETE untuk role 'anon' pada tabel registrations,
--    payments, registration_members, tickets, dan adjustments sehingga eksekusi UPDATE
--    ditolak secara diam-diam oleh PostgreSQL (0 rows affected). Akibatnya saat tombol
--    "Segarkan Data" ditekan, data di browser kembali ke PENDING.
-- 2. ENUM SAFETY: registration_status di PostgreSQL adalah ('NEW', 'PENDING_PAYMENT',
--    'PAYMENT_SUBMITTED', 'PAYMENT_REVIEW', 'PAID', 'CANCELLED'). Status lunas yang valid
--    adalah 'PAID'.
-- 3. AUTOMATIC SYNC TRIGGER: Saat pembayaran diverifikasi (payments.status = 'VERIFIED'),
--    trigger database otomatis memperbarui registrations.status = 'PAID' dan tickets.status = 'ISSUED'.
-- 4. VIEW & RPC UPDATE: v_public_ticket_status & check_public_ticket_status mengevaluasi
--    pembayaran terverifikasi (pay.status = 'VERIFIED' atau registrations.status = 'PAID')
--    sebagai tiket aktif resmi (is_ticket_active = true).
-- ==============================================================================

-- 1. BUKA KEBIJAKAN RLS UNTUK OPERASIONAL ADMIN COMMAND CENTER (anon & authenticated)
-- ------------------------------------------------------------------------------

-- A. Registrations (Update & Delete)
DROP POLICY IF EXISTS "Public intake registrations update" ON public.registrations;
CREATE POLICY "Public intake registrations update" ON public.registrations
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public intake registrations delete" ON public.registrations;
CREATE POLICY "Public intake registrations delete" ON public.registrations
  FOR DELETE TO anon, authenticated
  USING (true);

-- B. Payments (Update & Delete & Insert)
DROP POLICY IF EXISTS "Public intake payments update" ON public.payments;
CREATE POLICY "Public intake payments update" ON public.payments
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public intake payments delete" ON public.payments;
CREATE POLICY "Public intake payments delete" ON public.payments
  FOR DELETE TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public intake payments insert" ON public.payments;
CREATE POLICY "Public intake payments insert" ON public.payments
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- C. Registration Members (Update & Delete)
DROP POLICY IF EXISTS "Public intake members update" ON public.registration_members;
CREATE POLICY "Public intake members update" ON public.registration_members
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public intake members delete" ON public.registration_members;
CREATE POLICY "Public intake members delete" ON public.registration_members
  FOR DELETE TO anon, authenticated
  USING (true);

-- D. Tickets (Update & Delete)
DROP POLICY IF EXISTS "Public intake tickets update" ON public.tickets;
CREATE POLICY "Public intake tickets update" ON public.tickets
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public intake tickets delete" ON public.tickets;
CREATE POLICY "Public intake tickets delete" ON public.tickets
  FOR DELETE TO anon, authenticated
  USING (true);

-- E. Payment Adjustments (All)
DROP POLICY IF EXISTS "Public intake adjustments all" ON public.payment_adjustments;
CREATE POLICY "Public intake adjustments all" ON public.payment_adjustments
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);


-- 2. TRIGGER OTOMATIS: SINKRONISASI PEMBAYARAN VERIFIED KE REGISTRASI & TIKET
-- ------------------------------------------------------------------------------

-- Trigger A: Saat payments.status diubah menjadi 'VERIFIED'
CREATE OR REPLACE FUNCTION public.handle_payment_verified_sync()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'VERIFIED' AND (OLD.status IS DISTINCT FROM 'VERIFIED') THEN
    -- 1. Perbarui status registrasi menjadi PAID
    UPDATE public.registrations
    SET status = 'PAID', updated_at = now()
    WHERE id = NEW.registration_id AND status != 'PAID';

    -- 2. Aktifkan tiket resmi menjadi ISSUED
    UPDATE public.tickets
    SET status = 'ISSUED', issued_at = COALESCE(issued_at, now())
    WHERE registration_id = NEW.registration_id AND status != 'ISSUED';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_payment_verified ON public.payments;
CREATE TRIGGER trg_sync_payment_verified
AFTER UPDATE OF status ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.handle_payment_verified_sync();


-- Trigger B: Saat registrations.status diubah menjadi 'PAID' atau 'CONFIRMED'
CREATE OR REPLACE FUNCTION public.handle_registration_status_paid()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status::text IN ('PAID', 'CONFIRMED') AND (OLD.status::text NOT IN ('PAID', 'CONFIRMED')) THEN
    UPDATE public.tickets
    SET status = 'ISSUED', issued_at = COALESCE(issued_at, now())
    WHERE registration_id = NEW.id AND status != 'ISSUED';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_activate_ticket_on_registration_confirmed ON public.registrations;
CREATE TRIGGER trg_activate_ticket_on_registration_confirmed
AFTER UPDATE OF status ON public.registrations
FOR EACH ROW
EXECUTE FUNCTION public.handle_registration_status_paid();


-- 3. PERBARUI VIEW STATUS TIKET PUBLIK (v_public_ticket_status)
-- ------------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_public_ticket_status CASCADE;

CREATE OR REPLACE VIEW public.v_public_ticket_status AS
-- A. Pendaftar Utama (Leader / Individu)
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
    CASE 
        WHEN r.status::text IN ('PAID', 'CONFIRMED', 'ATTENDED', 'VERIFIED') THEN 'PAID'
        WHEN pay.status = 'VERIFIED' THEN 'PAID'
        WHEN EXISTS (SELECT 1 FROM public.payments p2 WHERE p2.registration_id = r.id AND p2.status = 'VERIFIED') THEN 'PAID'
        ELSE r.status::text
    END AS payment_status,
    CASE 
        WHEN r.status::text IN ('PAID', 'CONFIRMED', 'ATTENDED', 'VERIFIED') THEN true 
        WHEN pay.status = 'VERIFIED' THEN true
        WHEN EXISTS (SELECT 1 FROM public.payments p2 WHERE p2.registration_id = r.id AND p2.status = 'VERIFIED') THEN true
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
    SELECT proof_image_url, proof_drive_file_id, bank_destination, status 
    FROM public.payments 
    WHERE registration_id = r.id 
    ORDER BY (status = 'VERIFIED') DESC, submitted_at DESC 
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

    -- Tiket Anggota (Masing-masing memiliki tiket unik ber-suffix A/B/C)
    COALESCE(
        t.ticket_code, 
        NULLIF(SUBSTRING(r.custom_notes FROM 'TICKET-DIGNITY-[A-Z0-9]+'), '') || '-' || rm.ticket_suffix,
        'TICKET-DIGNITY-' || UPPER(SUBSTRING(r.id::text, 1, 8)) || '-' || rm.ticket_suffix
    ) AS ticket_code,
    COALESCE(t.status, 'ISSUED') AS ticket_status,
    r.package_type,
    r.is_mabar,
    0 AS total_due,
    0 AS gross_amount,
    0 AS net_amount,
    CASE 
        WHEN r.status::text IN ('PAID', 'CONFIRMED', 'ATTENDED', 'VERIFIED') THEN 'PAID'
        WHEN pay.status = 'VERIFIED' THEN 'PAID'
        WHEN EXISTS (SELECT 1 FROM public.payments p2 WHERE p2.registration_id = r.id AND p2.status = 'VERIFIED') THEN 'PAID'
        ELSE r.status::text
    END AS payment_status,
    CASE 
        WHEN r.status::text IN ('PAID', 'CONFIRMED', 'ATTENDED', 'VERIFIED') THEN true 
        WHEN pay.status = 'VERIFIED' THEN true
        WHEN EXISTS (SELECT 1 FROM public.payments p2 WHERE p2.registration_id = r.id AND p2.status = 'VERIFIED') THEN true
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
    SELECT proof_image_url, proof_drive_file_id, bank_destination, status 
    FROM public.payments 
    WHERE registration_id = r.id 
    ORDER BY (status = 'VERIFIED') DESC, submitted_at DESC 
    LIMIT 1
) pay ON true
WHERE r.deleted_at IS NULL AND r.status::text != 'CANCELLED';


-- 4. PERBARUI RPC 'check_public_ticket_status'
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_public_ticket_status(p_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_search TEXT;
    v_clean_phone  TEXT;
    v_record       RECORD;
BEGIN
    -- 1. Normalisasi Input Pencarian
    v_clean_search := TRIM(COALESCE(p_query, ''));
    
    IF v_clean_search = '' THEN
        RETURN jsonb_build_object(
            'found', false,
            'message', 'Silakan masukkan nomor tiket, email, atau nomor WhatsApp Anda.'
        );
    END IF;

    -- Ekstrak format nomor telepon bersih untuk perbandingan fleksibel
    v_clean_phone := REGEXP_REPLACE(v_clean_search, '[^0-9]', '', 'g');
    IF v_clean_phone LIKE '08%' THEN
        v_clean_phone := '628' || SUBSTRING(v_clean_phone FROM 3);
    ELSIF v_clean_phone LIKE '8%' THEN
        v_clean_phone := '628' || SUBSTRING(v_clean_phone FROM 2);
    END IF;

    -- 2. Cari dari View SSOT (Utamakan tiket aktif)
    SELECT * INTO v_record
    FROM public.v_public_ticket_status
    WHERE 
        -- Pencarian Nomor Tiket Resmi
        ticket_code ILIKE '%' || v_clean_search || '%'
        
        -- Pencarian Email
        OR email_normalized = LOWER(v_clean_search)
        OR email ILIKE '%' || v_clean_search || '%'
        
        -- Pencarian WhatsApp
        OR (v_clean_phone IS NOT NULL AND LENGTH(v_clean_phone) >= 6 AND (
            whatsapp_normalized = v_clean_phone 
            OR (whatsapp IS NOT NULL AND whatsapp ILIKE '%' || v_clean_search || '%')
            OR (whatsapp IS NOT NULL AND whatsapp ILIKE '%' || v_clean_phone || '%')
        ))
        
        -- Pencarian Nama Lengkap
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


-- 5. SINKRONISASI DATA EKSISTING YANG SUDAH DIVERIFIKASI
-- ------------------------------------------------------------------------------
UPDATE public.registrations r
SET status = 'PAID', updated_at = now()
WHERE status != 'PAID'
  AND EXISTS (
    SELECT 1 FROM public.payments p 
    WHERE p.registration_id = r.id AND p.status = 'VERIFIED'
  );

UPDATE public.tickets t
SET status = 'ISSUED', issued_at = COALESCE(issued_at, now())
WHERE status != 'ISSUED'
  AND EXISTS (
    SELECT 1 FROM public.registrations r 
    WHERE r.id = t.registration_id AND r.status::text IN ('PAID', 'CONFIRMED')
  );


-- 6. BERIKAN HAK AKSES PADA ROLE ANON, AUTHENTICATED & SERVICE ROLE
-- ------------------------------------------------------------------------------
GRANT ALL ON public.registrations TO anon, authenticated, service_role;
GRANT ALL ON public.payments TO anon, authenticated, service_role;
GRANT ALL ON public.registration_members TO anon, authenticated, service_role;
GRANT ALL ON public.tickets TO anon, authenticated, service_role;
GRANT ALL ON public.payment_adjustments TO anon, authenticated, service_role;
GRANT SELECT ON public.v_public_ticket_status TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_public_ticket_status(TEXT) TO anon, authenticated, service_role;
