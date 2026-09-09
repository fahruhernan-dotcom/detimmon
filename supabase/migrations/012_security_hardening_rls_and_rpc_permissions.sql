-- ==============================================================================
-- 012_security_hardening_rls_and_rpc_permissions.sql
-- Pengetatan Keamanan & Hak Akses (Strix Security Remediation)
-- 
-- 1. CWE-285: Revoke public execute on SECURITY DEFINER RPC 'shift_schedule_timeline'
-- 2. CWE-200: Prevent unauthenticated full-table dumping on 'certificates'
-- 3. Dedicated public RPC 'verify_certificate_public' for safe verification
-- ==============================================================================

-- 1. Hardening shift_schedule_timeline:
-- Cabut hak eksekusi dari PUBLIC dan role 'anon'
REVOKE EXECUTE ON FUNCTION public.shift_schedule_timeline(UUID, UUID, INT, BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.shift_schedule_timeline(UUID, UUID, INT, BOOLEAN) FROM anon;
GRANT EXECUTE ON FUNCTION public.shift_schedule_timeline(UUID, UUID, INT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shift_schedule_timeline(UUID, UUID, INT, BOOLEAN) TO service_role;

-- Re-create function with defense-in-depth authentication check inside body
CREATE OR REPLACE FUNCTION public.shift_schedule_timeline(
    p_schedule_id UUID,
    p_from_item_id UUID,
    p_offset_minutes INT,
    p_absorb_in_breaks BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_from_order INT;
    v_item RECORD;
    v_current_offset INT := p_offset_minutes;
    v_updated_count INT := 0;
    v_absorbed_total INT := 0;
    v_new_start TIME;
    v_new_end TIME;
    v_new_duration INT;
BEGIN
    -- Defense-in-depth authorization check:
    IF auth.role() IS DISTINCT FROM 'authenticated' AND (auth.jwt() ->> 'role') IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'Akses ditolak: Hanya staf terautentikasi yang dapat memodifikasi jadwal acara.';
    END IF;

    -- Get sort_order of starting item
    SELECT sort_order INTO v_from_order
    FROM public.schedule_items
    WHERE id = p_from_item_id AND schedule_id = p_schedule_id;

    IF v_from_order IS NULL THEN
        RAISE EXCEPTION 'Item starting point not found in schedule';
    END IF;

    -- Loop through all items from starting item onward
    FOR v_item IN
        SELECT *
        FROM public.schedule_items
        WHERE schedule_id = p_schedule_id AND sort_order >= v_from_order
        ORDER BY sort_order ASC
    LOOP
        -- Calculate shifted start time
        v_new_start := (v_item.start_time + (v_current_offset || ' minutes')::interval)::time;

        -- If absorb in breaks is active and this is a BREAK or MEAL, try to compress it
        IF p_absorb_in_breaks AND v_current_offset > 0 AND v_item.session_type IN ('BREAK', 'MEAL') THEN
            DECLARE
                v_min_dur INT := CASE WHEN v_item.session_type = 'MEAL' THEN 30 ELSE 15 END;
                v_can_absorb INT;
            BEGIN
                v_can_absorb := GREATEST(0, v_item.duration_minutes - v_min_dur);
                IF v_can_absorb > 0 THEN
                    DECLARE
                        v_absorbed INT := LEAST(v_can_absorb, v_current_offset);
                    BEGIN
                        v_new_duration := v_item.duration_minutes - v_absorbed;
                        v_new_end := (v_new_start + (v_new_duration || ' minutes')::interval)::time;
                        v_current_offset := v_current_offset - v_absorbed;
                        v_absorbed_total := v_absorbed_total + v_absorbed;

                        UPDATE public.schedule_items
                        SET start_time = v_new_start,
                            end_time = v_new_end,
                            duration_minutes = v_new_duration,
                            delay_minutes = delay_minutes + p_offset_minutes,
                            updated_at = now()
                        WHERE id = v_item.id;

                        v_updated_count := v_updated_count + 1;
                        CONTINUE;
                    END;
                END IF;
            END;
        END IF;

        -- Standard shift: preserve duration
        v_new_end := (v_new_start + (v_item.duration_minutes || ' minutes')::interval)::time;

        UPDATE public.schedule_items
        SET start_time = v_new_start,
            end_time = v_new_end,
            delay_minutes = delay_minutes + p_offset_minutes,
            updated_at = now()
        WHERE id = v_item.id;

        v_updated_count := v_updated_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'updated_count', v_updated_count,
        'offset_minutes', p_offset_minutes,
        'absorbed_minutes', v_absorbed_total,
        'remaining_offset', v_current_offset
    );
END;
$$;

-- 2. Hentikan Kebocoran Tabel Certificates (CWE-200 / Scraping)
-- Cabut policy permisif USING (true)
DROP POLICY IF EXISTS "Public read certificates by verification_code" ON public.certificates;
DROP POLICY IF EXISTS "Staff read certificates" ON public.certificates;

-- Buat policy ketat: Hanya staf berwenang yang dapat membaca dan memanipulasi tabel certificates secara langsung
CREATE POLICY "Staff read certificates" ON public.certificates
    FOR SELECT
    USING (public.is_staff());

-- 3. Sediakan RPC publik aman untuk verifikasi satu per satu (Zero Data Leakage)
CREATE OR REPLACE FUNCTION public.verify_certificate_public(p_code TEXT)
RETURNS TABLE (
    id UUID,
    certificate_no TEXT,
    verification_code TEXT,
    normalized_name TEXT,
    status TEXT,
    issued_at TIMESTAMPTZ,
    event_id UUID,
    event_title TEXT,
    event_type TEXT,
    date_start TIMESTAMPTZ,
    venue TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_code IS NULL OR trim(p_code) = '' THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        c.id,
        c.certificate_no,
        c.verification_code,
        c.normalized_name,
        c.status::TEXT,
        c.issued_at,
        e.id AS event_id,
        e.title AS event_title,
        e.event_type::TEXT,
        e.date_start,
        e.venue
    FROM public.certificates c
    LEFT JOIN public.events e ON e.id = c.event_id
    WHERE lower(c.verification_code) = lower(trim(p_code))
       OR lower(c.certificate_no) = lower(trim(p_code))
    LIMIT 1;
END;
$$;

-- Berikan izin eksekusi RPC verifikasi publik ke anon, authenticated, dan service_role
GRANT EXECUTE ON FUNCTION public.verify_certificate_public(TEXT) TO anon, authenticated, service_role;
