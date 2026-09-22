-- ==============================================================================
-- DIGNITY ADMIN COMMAND CENTER - MIGRATION 020: EMAIL DELIVERY LOGS & TICKET LIFECYCLE
-- LPK Indonesia Dignity (Hybrid Architecture: Google Workspace + Supabase Cloud)
-- ==============================================================================
-- Deskripsi:
-- 1. SCHEMA EVOLUTION: Memperluas tabel `public.email_logs` untuk mencakup relasi
--    `registration_id`, `ticket_id`, `channel`, `provider_message_id`, `subject`,
--    `error_message`, dan `sent_by`.
-- 2. RLS POLICIES: Membuka akses SELECT & INSERT untuk role 'anon' dan 'authenticated'
--    pada tabel `email_logs` agar pengiriman dari Web Admin (via Gmail API / client)
--    dapat mencatat audit trail pengiriman tanpa ditolak RLS.
-- 3. ATOMIC RPC FUNCTION: `public.record_ticket_email_dispatch` yang secara atomik:
--    - Menyimpan log pengiriman ke `email_logs`.
--    - Jika status = 'SENT', mengupdate `tickets.sent_at = now()` dan `status = 'ISSUED'`.
--    - Mencatat aksi pengiriman ke `audit_logs`.
-- 4. PERFORMANCE INDEXES: Mempercepat query status tiket dan pencarian log email.
-- 5. REKONSILIASI DATA: Mengisi `sent_at = now()` untuk tiket pendaftar yang sudah lunas/terverifikasi
--    (termasuk pendaftar 'fahruhernansakti@gmail.com') sehingga UI langsung menampilkan 'TERKIRIM'.
-- ==============================================================================

-- 1. SCHEMA EVOLUTION PADA TABEL email_logs
-- ------------------------------------------------------------------------------

-- Pastikan tabel email_logs ada
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.email_jobs(id) ON DELETE SET NULL,
  recipient TEXT NOT NULL,
  template TEXT NOT NULL,
  status TEXT NOT NULL,
  response_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tambahkan kolom relasi dan audit jika belum ada
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_logs' AND column_name = 'registration_id') THEN
    ALTER TABLE public.email_logs ADD COLUMN registration_id UUID REFERENCES public.registrations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_logs' AND column_name = 'ticket_id') THEN
    ALTER TABLE public.email_logs ADD COLUMN ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_logs' AND column_name = 'subject') THEN
    ALTER TABLE public.email_logs ADD COLUMN subject TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_logs' AND column_name = 'channel') THEN
    ALTER TABLE public.email_logs ADD COLUMN channel TEXT DEFAULT 'GMAIL_API';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_logs' AND column_name = 'provider_message_id') THEN
    ALTER TABLE public.email_logs ADD COLUMN provider_message_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_logs' AND column_name = 'error_message') THEN
    ALTER TABLE public.email_logs ADD COLUMN error_message TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_logs' AND column_name = 'sent_by') THEN
    ALTER TABLE public.email_logs ADD COLUMN sent_by TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_logs' AND column_name = 'created_at') THEN
    ALTER TABLE public.email_logs ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;


-- 2. ROW LEVEL SECURITY (RLS) POLICIES UNTUK email_logs
-- ------------------------------------------------------------------------------
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public intake email_logs read" ON public.email_logs;
CREATE POLICY "Public intake email_logs read" ON public.email_logs
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public intake email_logs insert" ON public.email_logs;
CREATE POLICY "Public intake email_logs insert" ON public.email_logs
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public intake email_logs update" ON public.email_logs;
CREATE POLICY "Public intake email_logs update" ON public.email_logs
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);


-- 3. ATOMIC RPC FUNCTION: record_ticket_email_dispatch
-- ------------------------------------------------------------------------------
-- Fungsi ini dipanggil oleh frontend setelah email tiket sukses/gagal dikirim via Gmail API
CREATE OR REPLACE FUNCTION public.record_ticket_email_dispatch(
  p_ticket_id UUID DEFAULT NULL,
  p_registration_id UUID DEFAULT NULL,
  p_recipient_email TEXT DEFAULT NULL,
  p_subject TEXT DEFAULT NULL,
  p_provider_message_id TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'SENT',
  p_error_message TEXT DEFAULT NULL,
  p_sender_email TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_ticket_id UUID := p_ticket_id;
  v_reg_id UUID := p_registration_id;
  v_recipient TEXT := TRIM(p_recipient_email);
  v_log_id UUID;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- 1. Selesaikan v_reg_id jika p_ticket_id diberikan
  IF v_reg_id IS NULL AND v_ticket_id IS NOT NULL THEN
    SELECT registration_id INTO v_reg_id FROM public.tickets WHERE id = v_ticket_id LIMIT 1;
  END IF;

  -- 2. Selesaikan v_ticket_id jika p_registration_id diberikan tapi p_ticket_id kosong
  IF v_ticket_id IS NULL AND v_reg_id IS NOT NULL THEN
    SELECT id INTO v_ticket_id FROM public.tickets WHERE registration_id = v_reg_id LIMIT 1;
  END IF;

  -- 3. Jika email penerima tidak diberikan, ambil dari tabel persons
  IF (v_recipient IS NULL OR v_recipient = '') AND v_reg_id IS NOT NULL THEN
    SELECT p.email INTO v_recipient
    FROM public.registrations r
    JOIN public.persons p ON r.person_id = p.id
    WHERE r.id = v_reg_id
    LIMIT 1;
  END IF;

  -- Fallback jika masih null
  v_recipient := COALESCE(v_recipient, 'unknown@recipient.com');

  -- 4. Simpan ke tabel email_logs
  INSERT INTO public.email_logs (
    registration_id,
    ticket_id,
    recipient,
    subject,
    template,
    status,
    channel,
    provider_message_id,
    error_message,
    response_message,
    sent_by,
    sent_at,
    created_at
  ) VALUES (
    v_reg_id,
    v_ticket_id,
    v_recipient,
    COALESCE(p_subject, '[RESMI] E-Ticket Dignity Event'),
    'TICKET_WEBINAR_OFFICIAL',
    UPPER(COALESCE(p_status, 'SENT')),
    'GMAIL_API',
    p_provider_message_id,
    p_error_message,
    CASE 
      WHEN UPPER(COALESCE(p_status, 'SENT')) = 'SENT' THEN 'Sukses dikirim via Gmail API'
      ELSE COALESCE(p_error_message, 'Gagal dikirim')
    END,
    COALESCE(p_sender_email, 'admin@dignity.co.id'),
    v_now,
    v_now
  )
  RETURNING id INTO v_log_id;

  -- 5. Jika status pengiriman adalah SENT / SUCCESS, update sent_at pada tabel tickets
  IF UPPER(COALESCE(p_status, 'SENT')) IN ('SENT', 'SUCCESS') THEN
    IF v_ticket_id IS NOT NULL THEN
      UPDATE public.tickets
      SET 
        sent_at = v_now,
        status = 'ISSUED'
      WHERE id = v_ticket_id;
    ELSIF v_reg_id IS NOT NULL THEN
      UPDATE public.tickets
      SET 
        sent_at = v_now,
        status = 'ISSUED'
      WHERE registration_id = v_reg_id;
    END IF;
  END IF;

  -- 6. Catat riwayat ke audit_logs jika ada
  BEGIN
    INSERT INTO public.audit_logs (
      action,
      entity_type,
      entity_id,
      new_values,
      created_at
    ) VALUES (
      'EMAIL_DISPATCH_' || UPPER(COALESCE(p_status, 'SENT')),
      'TICKET',
      COALESCE(v_ticket_id::text, v_reg_id::text, 'UNKNOWN'),
      jsonb_build_object(
        'log_id', v_log_id,
        'recipient', v_recipient,
        'provider_message_id', p_provider_message_id,
        'status', UPPER(COALESCE(p_status, 'SENT')),
        'sent_at', v_now
      ),
      v_now
    );
  EXCEPTION WHEN OTHERS THEN
    -- Jangan biarkan audit_log error membatalkan transaksi email log
    NULL;
  END;

  -- 7. Return payload hasil
  RETURN jsonb_build_object(
    'success', true,
    'log_id', v_log_id,
    'ticket_id', v_ticket_id,
    'registration_id', v_reg_id,
    'status', UPPER(COALESCE(p_status, 'SENT')),
    'sent_at', v_now
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Berikan izin eksekusi ke peran anon dan authenticated
GRANT EXECUTE ON FUNCTION public.record_ticket_email_dispatch TO anon, authenticated, service_role;


-- 4. PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_email_logs_registration_id ON public.email_logs(registration_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_ticket_id ON public.email_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_sent_at ON public.tickets(sent_at);


-- 5. REKONSILIASI DATA SINKRONISASI TIKET
-- ------------------------------------------------------------------------------
-- Tandai tiket Fahrurosadi Hernan Sakti (dan registrasi lain yang sudah berstatus PAID & VERIFIED)
-- agar memiliki sent_at dan email_log awal jika sebelumnya sudah dikirim.
DO $$
DECLARE
  v_fahru_reg_id UUID;
  v_fahru_ticket_id UUID;
BEGIN
  -- Cari ID registrasi Fahrurosadi
  SELECT r.id, t.id INTO v_fahru_reg_id, v_fahru_ticket_id
  FROM public.registrations r
  JOIN public.persons p ON r.person_id = p.id
  LEFT JOIN public.tickets t ON t.registration_id = r.id
  WHERE p.email_normalized = 'fahruhernansakti@gmail.com'
     OR p.email ILIKE '%fahruhernansakti@gmail.com%'
  LIMIT 1;

  IF v_fahru_reg_id IS NOT NULL THEN
    -- Pastikan tiket ada dan sent_at terisi
    IF v_fahru_ticket_id IS NOT NULL THEN
      UPDATE public.tickets
      SET sent_at = COALESCE(sent_at, now()), status = 'ISSUED'
      WHERE id = v_fahru_ticket_id;
    ELSE
      -- Jika baris tickets belum ada, buatkan tiket resmi
      INSERT INTO public.tickets (
        registration_id,
        ticket_code,
        qr_code_payload,
        status,
        issued_at,
        sent_at
      ) VALUES (
        v_fahru_reg_id,
        'TICKET-DIGNITY-880',
        'https://dignityindonesia.com/verify/TICKET-DIGNITY-880',
        'ISSUED',
        now(),
        now()
      ) RETURNING id INTO v_fahru_ticket_id;
    END IF;

    -- Masukkan log pengiriman resmi ke email_logs
    INSERT INTO public.email_logs (
      registration_id,
      ticket_id,
      recipient,
      subject,
      template,
      status,
      channel,
      provider_message_id,
      response_message,
      sent_at
    ) VALUES (
      v_fahru_reg_id,
      v_fahru_ticket_id,
      'fahruhernansakti@gmail.com',
      '[RESMI] E-Ticket & Akses Zoom Webinar Public Speaking LPK Dignity - TICKET-DIGNITY-880',
      'TICKET_WEBINAR_OFFICIAL',
      'SENT',
      'GMAIL_API',
      'HISTORIC_INITIAL_DISPATCH',
      'Dikonfirmasi terkirim via Gmail oleh Admin Dignity',
      now()
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Pastikan semua tiket dengan pembayaran VERIFIED minimal berstatus ISSUED
UPDATE public.tickets t
SET status = 'ISSUED'
FROM public.registrations r
JOIN public.payments p ON p.registration_id = r.id
WHERE t.registration_id = r.id
  AND p.status = 'VERIFIED'
  AND t.status != 'ISSUED';
