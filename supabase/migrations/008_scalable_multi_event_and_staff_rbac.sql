-- ==============================================================================
-- MIGRATION: 008_scalable_multi_event_and_staff_rbac.sql
-- TUJUAN: Menyiapkan tabel staff_access untuk kontrol akses admin (RBAC dinamis)
--         dan mendukung konfigurasi multi-event tanpa buka VS Code lagi.
-- ==============================================================================

-- 1. Pastikan ekstensi uuid tersedia
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Pastikan enum user_role mencakup peran staf operasional
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('OWNER', 'ADMIN', 'FINANCE', 'CS', 'EVENT_MANAGER', 'VIEWER');
  END IF;
END $$;

-- 3. Tabel staff_access (Daftar email staf resmi yang diizinkan mengakses dashboard)
CREATE TABLE IF NOT EXISTS public.staff_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'CS',
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  invited_by TEXT DEFAULT 'Owner',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pencarian cepat berdasarkan email ter-normalisasi
CREATE INDEX IF NOT EXISTS idx_staff_access_email ON public.staff_access (LOWER(email));

-- 4. Seed Data Awal Staf Resmi (Owner & Tim)
INSERT INTO public.staff_access (email, full_name, role, is_active, notes)
VALUES 
  ('doniesdaily@gmail.com', 'Donie Kurniawan (Owner)', 'OWNER', true, 'Pemilik & Master Administrator'),
  ('finance@dignity.id', 'Tim Keuangan LPK', 'FINANCE', true, 'Verifikasi Mutasi Bank & Rekonsiliasi Pembayaran'),
  ('cs@dignity.id', 'Helpdesk CS Dignity', 'CS', true, 'Layanan Informasi Peserta & Resend Tiket'),
  ('event@dignity.id', 'Event Coordinator', 'EVENT_MANAGER', true, 'Manajemen Rundown & Presensi Acara')
ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  full_name = EXCLUDED.full_name;

-- 5. RLS Policies untuk staff_access
ALTER TABLE public.staff_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read staff_access" ON public.staff_access;
CREATE POLICY "Allow read staff_access" 
  ON public.staff_access FOR SELECT 
  TO anon, authenticated 
  USING (true);

DROP POLICY IF EXISTS "Allow write staff_access" ON public.staff_access;
CREATE POLICY "Allow write staff_access" 
  ON public.staff_access FOR ALL 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

-- 6. Tambahkan kolom konfigurasi multi-event di tabel events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS landing_page_config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS attendance_config JSONB DEFAULT '{}'::jsonb;

-- Pastikan web_registration_config memiliki default jsonb jika null
UPDATE public.events 
SET web_registration_config = '{}'::jsonb 
WHERE web_registration_config IS NULL;

-- 7. Stored Procedure untuk Verifikasi Otorisasi Login Staf (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.check_staff_authorization(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean_email TEXT;
  v_staff public.staff_access%ROWTYPE;
BEGIN
  v_clean_email := LOWER(TRIM(COALESCE(p_email, '')));
  
  IF v_clean_email = '' THEN
    RETURN jsonb_build_object('authorized', false, 'message', 'Email wajib diisi.');
  END IF;

  SELECT * INTO v_staff
  FROM public.staff_access
  WHERE LOWER(email) = v_clean_email
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'authorized', false, 
      'message', 'Akses ditolak. Email "' || p_email || '" belum terdaftar di whitelist staf LPK Dignity.'
    );
  END IF;

  IF v_staff.is_active IS NOT TRUE THEN
    RETURN jsonb_build_object(
      'authorized', false, 
      'message', 'Akses dinonaktifkan. Akun staf Anda sedang ditangguhkan oleh Administrator.'
    );
  END IF;

  -- Update timestamp login terakhir
  UPDATE public.staff_access
  SET last_login_at = now()
  WHERE id = v_staff.id;

  RETURN jsonb_build_object(
    'authorized', true,
    'staff_id', v_staff.id,
    'email', v_staff.email,
    'full_name', v_staff.full_name,
    'role', v_staff.role,
    'message', 'Otorisasi staf berhasil.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_staff_authorization TO anon, authenticated;
