-- ==============================================================================
-- DIGNITY BACKEND ENGINE - MIGRATION 002
-- Phase 3: Payment & Ledger Foundation + Phase 18 Template Studio Versioning
-- LPK Indonesia Dignity in Collaboration with KLTC®
-- ==============================================================================

-- 1. Table: payment_accounts (Dinamis, tidak di-hardcode di kode)
CREATE TABLE IF NOT EXISTS payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE, -- NULL = Global
  account_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  qr_code TEXT, -- URL gambar QRIS atau payment reference
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for payment_accounts
ALTER TABLE payment_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read active payment accounts"
  ON payment_accounts FOR SELECT
  USING (active = true);

CREATE POLICY "Finance and Owner manage payment accounts"
  ON payment_accounts FOR ALL
  USING (public.is_finance() OR public.is_owner());

-- 2. Table: template_versions (Histori Immutable untuk Phase 18 Template Studio)
CREATE TABLE IF NOT EXISTS template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES message_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  design_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, TESTING, ACTIVE, ARCHIVED
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_id, version)
);

-- RLS for template_versions
ALTER TABLE template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read template versions"
  ON template_versions FOR SELECT
  USING (public.is_staff());

CREATE POLICY "Staff insert template versions"
  ON template_versions FOR INSERT
  WITH CHECK (public.is_staff());

CREATE POLICY "Owner manage template versions"
  ON template_versions FOR ALL
  USING (public.is_owner());

-- 3. Audit Trigger on payment_accounts & template_versions
DROP TRIGGER IF EXISTS trg_audit_payment_accounts ON payment_accounts;
CREATE TRIGGER trg_audit_payment_accounts
  AFTER INSERT OR UPDATE OR DELETE ON payment_accounts
  FOR EACH ROW EXECUTE FUNCTION fn_log_audit_change();

DROP TRIGGER IF EXISTS trg_audit_template_versions ON template_versions;
CREATE TRIGGER trg_audit_template_versions
  AFTER INSERT OR UPDATE OR DELETE ON template_versions
  FOR EACH ROW EXECUTE FUNCTION fn_log_audit_change();

-- 4. Initial seed of active templates into template_versions (v1 baseline)
INSERT INTO template_versions (template_id, version, subject, body, design_blocks, variables, status)
SELECT 
  id,
  version,
  subject_template,
  body_template,
  '[]'::jsonb,
  variables,
  status
FROM message_templates
ON CONFLICT (template_id, version) DO NOTHING;
