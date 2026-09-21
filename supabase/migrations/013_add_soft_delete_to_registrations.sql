-- ==============================================================================
-- DIGNITY ADMIN COMMAND CENTER - MIGRATION 013: SOFT DELETE FOR REGISTRATIONS
-- LPK Indonesia Dignity (Hybrid Architecture: Google Workspace + Supabase)
-- ==============================================================================

-- 1. ADD deleted_at COLUMN TO registrations TABLE
ALTER TABLE public.registrations 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. CREATE INDEX FOR EFFICIENT ACTIVE vs DELETED FILTERING
CREATE INDEX IF NOT EXISTS idx_registrations_deleted_at 
  ON public.registrations(deleted_at);

-- 3. SECURE RPC TO SOFT DELETE A REGISTRATION
CREATE OR REPLACE FUNCTION public.soft_delete_registration(p_registration_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg RECORD;
BEGIN
  -- Verify record exists
  SELECT id, event_id, status, deleted_at 
  INTO v_reg 
  FROM public.registrations 
  WHERE id = p_registration_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Registrasi tidak ditemukan');
  END IF;

  IF v_reg.deleted_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'message', 'Registrasi sudah berada di tempat sampah', 'deleted_at', v_reg.deleted_at);
  END IF;

  -- Perform atomic soft delete
  UPDATE public.registrations
  SET 
    deleted_at = now(),
    updated_at = now()
  WHERE id = p_registration_id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Pendaftar berhasil dipindahkan ke tempat sampah',
    'registration_id', p_registration_id, 
    'deleted_at', now()
  );
END;
$$;

-- 4. SECURE RPC TO RESTORE A SOFT-DELETED REGISTRATION
CREATE OR REPLACE FUNCTION public.restore_registration(p_registration_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg RECORD;
BEGIN
  -- Verify record exists
  SELECT id, event_id, status, deleted_at 
  INTO v_reg 
  FROM public.registrations 
  WHERE id = p_registration_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Registrasi tidak ditemukan');
  END IF;

  -- Perform atomic restore
  UPDATE public.registrations
  SET 
    deleted_at = NULL,
    updated_at = now()
  WHERE id = p_registration_id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Pendaftar berhasil dipulihkan dari tempat sampah',
    'registration_id', p_registration_id
  );
END;
$$;

-- 5. PERMISSIONS FOR AUTHENTICATED STAFF & OPERATOR PASSKEY (ANON)
GRANT EXECUTE ON FUNCTION public.soft_delete_registration(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.restore_registration(UUID) TO anon, authenticated, service_role;

COMMENT ON COLUMN public.registrations.deleted_at IS 'Timestamp soft delete. Jika NULL berarti aktif, jika berisi timestamp berarti berada di tempat sampah (trash).';
