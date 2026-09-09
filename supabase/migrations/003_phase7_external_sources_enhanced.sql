-- ==============================================================================
-- DIGNITY BACKEND ENGINE - MIGRATION 003
-- Phase 7: Google Workspace Integration — Enhanced External Sources
-- LPK Indonesia Dignity in Collaboration with KLTC®
-- ==============================================================================

-- 1. Enhance external_sources with richer metadata
ALTER TABLE external_sources
  ADD COLUMN IF NOT EXISTS label TEXT,
  ADD COLUMN IF NOT EXISTS sheet_tab_registrasi TEXT,
  ADD COLUMN IF NOT EXISTS sheet_tab_presensi TEXT,
  ADD COLUMN IF NOT EXISTS column_mapping JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sync_direction TEXT NOT NULL DEFAULT 'BIDIRECTIONAL',
  ADD COLUMN IF NOT EXISTS auto_sync_interval_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2. Enhance sync_jobs — add event context and triggered_by
ALTER TABLE sync_jobs
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'SHEETS_TO_DB',
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Enhance sync_logs — add field-level detail
ALTER TABLE sync_logs
  ADD COLUMN IF NOT EXISTS field_name TEXT,
  ADD COLUMN IF NOT EXISTS old_value TEXT,
  ADD COLUMN IF NOT EXISTS new_value TEXT;

-- 4. Index for faster queries
CREATE INDEX IF NOT EXISTS idx_external_sources_event_id ON external_sources(event_id);
CREATE INDEX IF NOT EXISTS idx_external_sources_active ON external_sources(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sync_jobs_event_id ON sync_jobs(event_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_source_started ON sync_jobs(source_id, started_at DESC);

-- 5. Audit trigger for external_sources
DROP TRIGGER IF EXISTS trg_audit_external_sources ON external_sources;
CREATE TRIGGER trg_audit_external_sources
  AFTER INSERT OR UPDATE OR DELETE ON external_sources
  FOR EACH ROW EXECUTE FUNCTION fn_log_audit_change();

-- 6. RLS Policies for external_sources
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'external_sources' AND policyname = 'Staff read external_sources'
  ) THEN
    CREATE POLICY "Staff read external_sources" ON external_sources FOR SELECT USING (public.is_staff());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'external_sources' AND policyname = 'Owner manage external_sources'
  ) THEN
    CREATE POLICY "Owner manage external_sources" ON external_sources FOR ALL USING (public.is_owner());
  END IF;
  -- sync_jobs
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sync_jobs' AND policyname = 'Staff read sync_jobs'
  ) THEN
    CREATE POLICY "Staff read sync_jobs" ON sync_jobs FOR SELECT USING (public.is_staff());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sync_jobs' AND policyname = 'Staff insert sync_jobs'
  ) THEN
    CREATE POLICY "Staff insert sync_jobs" ON sync_jobs FOR INSERT WITH CHECK (public.is_staff());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sync_jobs' AND policyname = 'Staff update sync_jobs'
  ) THEN
    CREATE POLICY "Staff update sync_jobs" ON sync_jobs FOR UPDATE USING (public.is_staff());
  END IF;
  -- sync_logs
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sync_logs' AND policyname = 'Staff read sync_logs'
  ) THEN
    CREATE POLICY "Staff read sync_logs" ON sync_logs FOR SELECT USING (public.is_staff());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sync_logs' AND policyname = 'Staff insert sync_logs'
  ) THEN
    CREATE POLICY "Staff insert sync_logs" ON sync_logs FOR INSERT WITH CHECK (public.is_staff());
  END IF;
END $$;
