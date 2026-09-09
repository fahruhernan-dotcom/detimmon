-- ==============================================================================
-- Migration 010: Interactive Rundown, Timeline & Stage Management Engine (PRD 16)
-- Dignity Event Operations Command Center
-- ==============================================================================

-- 1. Create Enums if they do not exist
DO $$ BEGIN
    CREATE TYPE schedule_session_type AS ENUM (
        'CEREMONY', 'KEYNOTE', 'PRACTICE', 'DEMO', 'BREAK', 'MEAL', 'EVALUATION'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE schedule_session_status AS ENUM (
        'SCHEDULED', 'PREPARING', 'LIVE', 'OVERTIME', 'COMPLETED', 'SKIPPED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Table: event_schedules
CREATE TABLE IF NOT EXISTS public.event_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    day_number INT NOT NULL DEFAULT 1,
    schedule_date DATE,
    title VARCHAR(255) NOT NULL,
    location_room VARCHAR(255),
    track_name VARCHAR(100) DEFAULT 'Main Stage',
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Table: schedule_items
CREATE TABLE IF NOT EXISTS public.schedule_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES public.event_schedules(id) ON DELETE CASCADE,
    session_code VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 30,
    session_type VARCHAR(50) DEFAULT 'KEYNOTE',
    speaker_name VARCHAR(255),
    pic_team VARCHAR(255),
    equipment_checklist JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'SCHEDULED',
    delay_minutes INT DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    stage_cues TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create Indexes for High Performance
CREATE INDEX IF NOT EXISTS idx_event_schedules_event ON public.event_schedules(event_id, day_number);
CREATE INDEX IF NOT EXISTS idx_schedule_items_schedule ON public.schedule_items(schedule_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_schedule_items_status ON public.schedule_items(status);

-- 5. Stored Procedure: Dynamic Shift Schedule Timeline
CREATE OR REPLACE FUNCTION public.shift_schedule_timeline(
    p_schedule_id UUID,
    p_from_item_id UUID,
    p_offset_minutes INT,
    p_absorb_in_breaks BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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

-- 6. Row Level Security (RLS)
ALTER TABLE public.event_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_items ENABLE ROW LEVEL SECURITY;

-- Public can view published schedules
CREATE POLICY "Public read published event_schedules"
    ON public.event_schedules FOR SELECT
    USING (is_published = true);

CREATE POLICY "Public read schedule_items of published schedules"
    ON public.schedule_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.event_schedules
            WHERE public.event_schedules.id = schedule_items.schedule_id
            AND public.event_schedules.is_published = true
        )
    );

-- Authenticated users (admin/staff) have full access
CREATE POLICY "Staff manage event_schedules"
    ON public.event_schedules FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Staff manage schedule_items"
    ON public.schedule_items FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Service role bypass
CREATE POLICY "Service role full access event_schedules"
    ON public.event_schedules FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access schedule_items"
    ON public.schedule_items FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
