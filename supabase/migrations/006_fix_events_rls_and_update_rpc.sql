-- ==============================================================================
-- MIGRATION: 006_fix_events_rls_and_update_rpc.sql
-- TUJUAN: Mengizinkan Operasi UPDATE, INSERT, DELETE pada tabel 'events'
--         agar tersimpan permanen saat diedit dari Admin Command Center.
-- ==============================================================================

-- 1. Buka Policy RLS pada tabel 'events' agar admin aplikasi dapat mengubah data
DROP POLICY IF EXISTS "Admin manage events" ON events;
DROP POLICY IF EXISTS "Allow manage events" ON events;
DROP POLICY IF EXISTS "Allow staff update events" ON events;
DROP POLICY IF EXISTS "Public and staff read events" ON events;

-- Izinkan publik & admin membaca seluruh acara
CREATE POLICY "Public read events" 
  ON events FOR SELECT 
  USING (true);

-- Izinkan admin (baik via anon key dengan Google OAuth maupun authenticated) mengelola acara
CREATE POLICY "Admin manage events" 
  ON events FOR ALL 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

-- 2. Stored Procedure SECURITY DEFINER (Bypass RLS secara atomik untuk Edit Acara)
CREATE OR REPLACE FUNCTION public.update_event_details(
  p_id UUID,
  p_title TEXT,
  p_funnel_tagline TEXT,
  p_event_type TEXT,
  p_status TEXT,
  p_date_start TIMESTAMPTZ,
  p_date_end TIMESTAMPTZ,
  p_venue TEXT,
  p_base_price NUMERIC,
  p_promo_price NUMERIC,
  p_capacity INT,
  p_next_event_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Update data acara utama
  UPDATE events SET
    title = p_title,
    funnel_tagline = p_funnel_tagline,
    event_type = p_event_type,
    status = p_status,
    date_start = p_date_start,
    date_end = p_date_end,
    venue = p_venue,
    base_price = p_base_price,
    promo_price = p_promo_price,
    capacity = p_capacity,
    next_event_id = p_next_event_id,
    updated_at = NOW()
  WHERE id = p_id;

  -- Jika next_event_id diatur, update parent_event_id pada acara tujuan
  IF p_next_event_id IS NOT NULL THEN
    UPDATE events 
    SET parent_event_id = p_id 
    WHERE id = p_next_event_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'event_id', p_id,
    'message', 'Program pelatihan berhasil diperbarui'
  );
END;
$$;

-- Berikan izin eksekusi ke anon & authenticated
GRANT EXECUTE ON FUNCTION public.update_event_details TO anon, authenticated;

-- 3. Reset kode voucher rebate usang pada tabel events (karena voucher dikelola di modul Voucher)
UPDATE events 
SET 
  rebate_voucher_code = NULL,
  rebate_voucher_amount = 0.00
WHERE rebate_voucher_code IS NOT NULL;
