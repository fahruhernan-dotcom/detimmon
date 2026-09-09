-- ==============================================================================
-- DIGNITY ADMIN COMMAND CENTER - INITIAL DATABASE SCHEMA (MIGRATION 001)
-- LPK Indonesia Dignity (Hybrid Architecture: Google Workspace + Supabase)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUM TYPES
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('OWNER', 'ADMIN', 'FINANCE', 'CS', 'EVENT_MANAGER', 'VIEWER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE event_type AS ENUM ('WEBINAR', 'BOOTCAMP', 'WORKSHOP');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE event_status AS ENUM ('DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE registration_status AS ENUM ('NEW', 'PENDING_PAYMENT', 'PAYMENT_SUBMITTED', 'PAYMENT_REVIEW', 'PAID', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('BANK_TRANSFER', 'QRIS', 'MANUAL_CASH', 'WAIVED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE adjustment_type AS ENUM ('DISCOUNT', 'SURCHARGE', 'REFUND', 'WRITE_OFF', 'MANUAL_CORRECTION');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM ('ABSENT', 'REGISTERED', 'JOINED', 'ATTENDED', 'CERTIFICATE_ELIGIBLE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE certificate_status AS ENUM ('ELIGIBLE', 'GENERATED', 'SENT', 'FAILED', 'REVOKED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE conversion_status AS ENUM ('NONE', 'NOT_OFFERED', 'VOUCHER_ISSUED', 'INTERESTED', 'PAYMENT_PENDING', 'CONVERTED', 'LOST');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE job_status AS ENUM ('QUEUED', 'PROCESSING', 'SENT', 'FAILED', 'RETRYING');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE sync_action AS ENUM ('INSERTED', 'UPDATED', 'SKIPPED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE batch_status AS ENUM ('DRAFT', 'PREVIEW', 'PENDING_APPROVAL', 'APPROVED', 'QUEUED', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE recipient_delivery_status AS ENUM ('NOT_SENT', 'QUEUED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ==============================================================================
-- 3. GLOBAL TABLES
-- ==============================================================================

-- 3.1 Profiles (1:1 dengan auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.2 Roles Catalog
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name user_role UNIQUE NOT NULL,
  description TEXT NOT NULL
);

-- 3.3 User Roles (M:N)
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, role_id)
);

-- 3.4 Persons (Master Identity Deduplicated across all events)
CREATE TABLE IF NOT EXISTS persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  email_normalized TEXT,
  whatsapp TEXT,
  whatsapp_normalized TEXT,
  institution TEXT,
  city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.5 Speakers
CREATE TABLE IF NOT EXISTS speakers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  bio TEXT,
  default_honor NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.6 System Settings (Business parameters only)
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  is_sensitive BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 4. EVENT-SCOPED TABLES
-- ==============================================================================

-- 4.1 Events
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  event_type event_type NOT NULL DEFAULT 'WEBINAR',
  date_start TIMESTAMPTZ NOT NULL,
  date_end TIMESTAMPTZ NOT NULL,
  venue TEXT NOT NULL DEFAULT 'Zoom Cloud Meeting',
  base_price NUMERIC(12,2) NOT NULL DEFAULT 100000.00,
  promo_price NUMERIC(12,2) NOT NULL DEFAULT 100000.00,
  status event_status NOT NULL DEFAULT 'DRAFT',
  capacity INTEGER NOT NULL DEFAULT 500,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.2 Event Speakers (M:N with custom honor)
CREATE TABLE IF NOT EXISTS event_speakers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  speaker_id UUID NOT NULL REFERENCES speakers(id) ON DELETE RESTRICT,
  agreed_honor NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  role TEXT NOT NULL DEFAULT 'KEYNOTE_SPEAKER',
  UNIQUE (event_id, speaker_id)
);

-- 4.3 Message Templates (Global default if event_id is NULL; event override if set)
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'EMAIL',
  subject_template TEXT,
  body_template TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  UNIQUE (event_id, template_key, channel)
);

-- 4.4 Communication Batches (Campaign tracking)
CREATE TABLE IF NOT EXISTS communication_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  batch_code TEXT UNIQUE NOT NULL,
  template_id UUID NOT NULL REFERENCES message_templates(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'EMAIL',
  status batch_status NOT NULL DEFAULT 'DRAFT',
  total_recipients INTEGER NOT NULL DEFAULT 0,
  queued_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.5 Registrations
CREATE TABLE IF NOT EXISTS registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE RESTRICT,
  package_type TEXT NOT NULL DEFAULT 'INDIVIDU',
  is_mabar BOOLEAN NOT NULL DEFAULT false,
  total_due NUMERIC(12,2) NOT NULL DEFAULT 100000.00,
  status registration_status NOT NULL DEFAULT 'NEW',
  source_system TEXT NOT NULL DEFAULT 'google_form',
  source_row_id INTEGER,
  source_response_id TEXT,
  custom_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, source_row_id)
);

-- 4.6 Registration Members (MABAR support: each member links to persons)
CREATE TABLE IF NOT EXISTS registration_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE RESTRICT,
  member_role TEXT NOT NULL DEFAULT 'MEMBER',
  ticket_suffix TEXT NOT NULL DEFAULT 'A',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (registration_id, person_id),
  UNIQUE (registration_id, ticket_suffix)
);

-- 4.7 Payments (1:M per registration; authoritative proof_drive_file_id)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 100000.00,
  payment_method payment_method NOT NULL DEFAULT 'BANK_TRANSFER',
  bank_destination TEXT,
  proof_drive_file_id TEXT,
  drive_filename TEXT,
  drive_mime_type TEXT,
  drive_size BIGINT,
  drive_modified_at TIMESTAMPTZ,
  status payment_status NOT NULL DEFAULT 'PENDING',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT
);

-- 4.8 Payment Adjustments (Financial ledger corrections by Finance)
CREATE TABLE IF NOT EXISTS payment_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL,
  adjustment_type adjustment_type NOT NULL,
  reason TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.9 Tickets
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  registration_member_id UUID REFERENCES registration_members(id) ON DELETE CASCADE,
  ticket_code TEXT UNIQUE NOT NULL,
  qr_code_payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ISSUED',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

-- 4.10 Attendances
CREATE TABLE IF NOT EXISTS attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE RESTRICT,
  join_time TIMESTAMPTZ,
  leave_time TIMESTAMPTZ,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  status attendance_status NOT NULL DEFAULT 'REGISTERED',
  checked_by UUID REFERENCES auth.users(id),
  UNIQUE (event_id, person_id)
);

-- 4.11 Certificates (Public verification mechanism)
CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE RESTRICT,
  certificate_no TEXT UNIQUE NOT NULL,
  verification_code TEXT UNIQUE NOT NULL,
  normalized_name TEXT NOT NULL,
  drive_file_id TEXT,
  status certificate_status NOT NULL DEFAULT 'ELIGIBLE',
  issued_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  UNIQUE (event_id, person_id)
);

-- 4.12 Vouchers (Rebate codes)
CREATE TABLE IF NOT EXISTS vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE RESTRICT,
  code TEXT UNIQUE NOT NULL,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 100000.00,
  valid_until TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  claimed_at TIMESTAMPTZ
);

-- 4.13 Conversions (Webinar to Bootcamp funnel)
CREATE TABLE IF NOT EXISTS conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  target_event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE RESTRICT,
  voucher_id UUID REFERENCES vouchers(id) ON DELETE SET NULL,
  status conversion_status NOT NULL DEFAULT 'NOT_OFFERED',
  converted_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE (source_event_id, target_event_id, person_id)
);

-- 4.14 Communication Recipients (Recipient-level tracking)
CREATE TABLE IF NOT EXISTS communication_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES communication_batches(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE RESTRICT,
  registration_id UUID REFERENCES registrations(id) ON DELETE SET NULL,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  certificate_id UUID REFERENCES certificates(id) ON DELETE SET NULL,
  recipient TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  status recipient_delivery_status NOT NULL DEFAULT 'NOT_SENT',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (batch_id, person_id)
);

-- ==============================================================================
-- 5. INTEGRATION & COMMUNICATION TABLES
-- ==============================================================================

-- 5.1 External Sources (Google Sheets & Drive folder binding per event)
CREATE TABLE IF NOT EXISTS external_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'GOOGLE_SHEETS',
  external_sheet_id TEXT NOT NULL,
  external_drive_folder_id TEXT,
  last_synced_at TIMESTAMPTZ
);

-- 5.2 Sync Jobs
CREATE TABLE IF NOT EXISTS sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES external_sources(id) ON DELETE CASCADE,
  status job_status NOT NULL DEFAULT 'PROCESSING',
  records_scanned INTEGER NOT NULL DEFAULT 0,
  records_inserted INTEGER NOT NULL DEFAULT 0,
  records_updated INTEGER NOT NULL DEFAULT 0,
  records_skipped INTEGER NOT NULL DEFAULT 0,
  records_failed INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 5.3 Sync Logs
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_job_id UUID NOT NULL REFERENCES sync_jobs(id) ON DELETE CASCADE,
  source_row_id INTEGER NOT NULL,
  action_taken sync_action NOT NULL,
  status TEXT NOT NULL DEFAULT 'SUCCESS',
  payload JSONB,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.4 Email Jobs (Async Queue with Idempotency Key & Batch Reference)
CREATE TABLE IF NOT EXISTS email_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES communication_batches(id) ON DELETE SET NULL,
  recipient_id UUID REFERENCES communication_recipients(id) ON DELETE SET NULL,
  idempotency_key TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  template TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status job_status NOT NULL DEFAULT 'QUEUED',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- 5.5 Email Logs
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES email_jobs(id) ON DELETE SET NULL,
  recipient TEXT NOT NULL,
  template TEXT NOT NULL,
  status TEXT NOT NULL,
  response_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.6 Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 6. INDEXES FOR PERFORMANCE & DEDUPLICATION
-- ==============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_persons_email_norm ON persons(email_normalized) WHERE email_normalized IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_persons_wa_norm ON persons(whatsapp_normalized) WHERE whatsapp_normalized IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_cert_no ON certificates(certificate_no);
CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_verify_code ON certificates(verification_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_code ON tickets(ticket_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_jobs_idempotency ON email_jobs(idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_communication_batches_code ON communication_batches(batch_code);

CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_person_id ON registrations(person_id);
CREATE INDEX IF NOT EXISTS idx_payments_registration_id ON payments(registration_id);
CREATE INDEX IF NOT EXISTS idx_tickets_registration_id ON tickets(registration_id);
CREATE INDEX IF NOT EXISTS idx_attendances_event_person ON attendances(event_id, person_id);
CREATE INDEX IF NOT EXISTS idx_certificates_event_person ON certificates(event_id, person_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_job_id ON sync_logs(sync_job_id);
CREATE INDEX IF NOT EXISTS idx_communication_recipients_batch ON communication_recipients(batch_id);
CREATE INDEX IF NOT EXISTS idx_communication_recipients_status ON communication_recipients(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- ==============================================================================
-- 7. TRIGGERS: CONTACT NORMALIZATION & AUDIT LOGGING
-- ==============================================================================

-- 7.1 Contact Normalization Trigger
CREATE OR REPLACE FUNCTION fn_normalize_person_contacts()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS NOT NULL AND TRIM(NEW.email) != '' THEN
    NEW.email_normalized := LOWER(TRIM(NEW.email));
  ELSE
    NEW.email_normalized := NULL;
  END IF;

  IF NEW.whatsapp IS NOT NULL AND TRIM(NEW.whatsapp) != '' THEN
    NEW.whatsapp_normalized := REGEXP_REPLACE(NEW.whatsapp, '[^0-9]', '', 'g');
    IF NEW.whatsapp_normalized LIKE '08%' THEN
      NEW.whatsapp_normalized := '62' || SUBSTRING(NEW.whatsapp_normalized FROM 2);
    ELSIF NEW.whatsapp_normalized LIKE '8%' THEN
      NEW.whatsapp_normalized := '62' || NEW.whatsapp_normalized;
    END IF;
  ELSE
    NEW.whatsapp_normalized := NULL;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalize_person_contacts ON persons;
CREATE TRIGGER trg_normalize_person_contacts
BEFORE INSERT OR UPDATE ON persons
FOR EACH ROW
EXECUTE FUNCTION fn_normalize_person_contacts();

-- 7.2 Audit Log Trigger
CREATE OR REPLACE FUNCTION fn_log_audit_change()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
  v_actor_email TEXT;
  v_entity_id TEXT;
  v_old_values JSONB := NULL;
  v_new_values JSONB := NULL;
BEGIN
  v_actor_id := auth.uid();
  
  IF TG_OP = 'DELETE' THEN
    v_entity_id := OLD.id::text;
    v_old_values := to_jsonb(OLD);
  ELSE
    v_entity_id := NEW.id::text;
    v_new_values := to_jsonb(NEW);
    IF TG_OP = 'UPDATE' THEN
      v_old_values := to_jsonb(OLD);
    END IF;
  END IF;

  INSERT INTO audit_logs (
    actor_id,
    actor_email,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values
  ) VALUES (
    v_actor_id,
    v_actor_email,
    TG_OP,
    TG_TABLE_NAME,
    v_entity_id,
    v_old_values,
    v_new_values
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach Audit Triggers to Key Operational Tables
DROP TRIGGER IF EXISTS trg_audit_registrations ON registrations;
CREATE TRIGGER trg_audit_registrations
AFTER INSERT OR UPDATE OR DELETE ON registrations
FOR EACH ROW EXECUTE FUNCTION fn_log_audit_change();

DROP TRIGGER IF EXISTS trg_audit_payments ON payments;
CREATE TRIGGER trg_audit_payments
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION fn_log_audit_change();

DROP TRIGGER IF EXISTS trg_audit_payment_adjustments ON payment_adjustments;
CREATE TRIGGER trg_audit_payment_adjustments
AFTER INSERT OR UPDATE OR DELETE ON payment_adjustments
FOR EACH ROW EXECUTE FUNCTION fn_log_audit_change();

DROP TRIGGER IF EXISTS trg_audit_certificates ON certificates;
CREATE TRIGGER trg_audit_certificates
AFTER INSERT OR UPDATE OR DELETE ON certificates
FOR EACH ROW EXECUTE FUNCTION fn_log_audit_change();

DROP TRIGGER IF EXISTS trg_audit_system_settings ON system_settings;
CREATE TRIGGER trg_audit_system_settings
AFTER INSERT OR UPDATE OR DELETE ON system_settings
FOR EACH ROW EXECUTE FUNCTION fn_log_audit_change();

DROP TRIGGER IF EXISTS trg_audit_comm_batches ON communication_batches;
CREATE TRIGGER trg_audit_comm_batches
AFTER INSERT OR UPDATE OR DELETE ON communication_batches
FOR EACH ROW EXECUTE FUNCTION fn_log_audit_change();

-- ==============================================================================
-- 8. CALCULATED REGISTRATION LEDGER VIEW
-- ==============================================================================

CREATE OR REPLACE VIEW v_registration_ledger AS
SELECT 
  r.id AS registration_id,
  r.event_id,
  r.person_id,
  r.total_due,
  COALESCE(p.paid_amount, 0) + COALESCE(a.adj_amount, 0) AS total_paid,
  r.total_due - (COALESCE(p.paid_amount, 0) + COALESCE(a.adj_amount, 0)) AS balance_due,
  CASE 
    WHEN (r.total_due - (COALESCE(p.paid_amount, 0) + COALESCE(a.adj_amount, 0))) <= 0 
         AND COALESCE(p.paid_amount, 0) > 0 THEN 'PAID'
    WHEN COALESCE(p.paid_amount, 0) > 0 THEN 'PAYMENT_REVIEW'
    WHEN p.has_pending THEN 'PAYMENT_SUBMITTED'
    ELSE r.status::text
  END AS computed_payment_state
FROM registrations r
LEFT JOIN (
  SELECT 
    registration_id,
    SUM(CASE WHEN status = 'VERIFIED' THEN amount ELSE 0 END) AS paid_amount,
    BOOL_OR(status = 'PENDING') AS has_pending
  FROM payments
  GROUP BY registration_id
) p ON p.registration_id = r.id
LEFT JOIN (
  SELECT 
    registration_id,
    SUM(amount) AS adj_amount
  FROM payment_adjustments
  GROUP BY registration_id
) a ON a.registration_id = r.id;

-- ==============================================================================
-- 9. SECURITY FUNCTIONS & ROW LEVEL SECURITY (RLS)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT r.name 
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_owner() RETURNS BOOLEAN AS $$
  SELECT COALESCE(public.get_user_role() = 'OWNER', false);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_finance() RETURNS BOOLEAN AS $$
  SELECT COALESCE(public.get_user_role() IN ('OWNER', 'FINANCE'), false);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_staff() RETURNS BOOLEAN AS $$
  SELECT COALESCE(public.get_user_role() IN ('OWNER', 'ADMIN', 'FINANCE', 'CS', 'EVENT_MANAGER'), false);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Enable RLS on All Tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 9.1 RLS Policies for Staff
CREATE POLICY "Staff read profiles" ON profiles FOR SELECT USING (public.is_staff() OR auth.uid() = id);
CREATE POLICY "Staff update self profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Staff read roles" ON roles FOR SELECT USING (true);
CREATE POLICY "Staff read user_roles" ON user_roles FOR SELECT USING (public.is_staff());
CREATE POLICY "Owner manage user_roles" ON user_roles FOR ALL USING (public.is_owner());

CREATE POLICY "Staff read persons" ON persons FOR SELECT USING (public.is_staff());
CREATE POLICY "Staff edit persons" ON persons FOR ALL USING (public.is_staff());

CREATE POLICY "Public and staff read events" ON events FOR SELECT USING (true);
CREATE POLICY "Admin manage events" ON events FOR ALL USING (public.is_staff());

CREATE POLICY "Staff read registrations" ON registrations FOR SELECT USING (public.is_staff());
CREATE POLICY "Staff update registrations" ON registrations FOR UPDATE USING (public.is_staff());
CREATE POLICY "Owner delete registrations" ON registrations FOR DELETE USING (public.is_owner());

CREATE POLICY "Staff read payments" ON payments FOR SELECT USING (public.is_staff());
CREATE POLICY "Finance manage payments" ON payments FOR ALL USING (public.is_finance());

CREATE POLICY "Staff read adjustments" ON payment_adjustments FOR SELECT USING (public.is_staff());
CREATE POLICY "Finance manage adjustments" ON payment_adjustments FOR ALL USING (public.is_finance());

CREATE POLICY "Staff read comm batches" ON communication_batches FOR SELECT USING (public.is_staff());
CREATE POLICY "Staff manage comm batches" ON communication_batches FOR ALL USING (public.is_staff());

CREATE POLICY "Staff read comm recipients" ON communication_recipients FOR SELECT USING (public.is_staff());
CREATE POLICY "Staff manage comm recipients" ON communication_recipients FOR ALL USING (public.is_staff());

CREATE POLICY "Staff read message templates" ON message_templates FOR SELECT USING (public.is_staff());
CREATE POLICY "Staff manage message templates" ON message_templates FOR ALL USING (public.is_staff());

-- 9.2 Public Certificate Verification Policy (Unauthenticated QR scan)
CREATE POLICY "Public read certificates by verification_code" ON certificates 
FOR SELECT USING (true);

CREATE POLICY "Staff manage certificates" ON certificates 
FOR ALL USING (public.is_staff());

-- 9.3 System Settings & Audit Logs (Owner only)
CREATE POLICY "Staff read settings" ON system_settings FOR SELECT USING (public.is_staff());
CREATE POLICY "Owner manage settings" ON system_settings FOR ALL USING (public.is_owner());

CREATE POLICY "Owner read audit logs" ON audit_logs FOR SELECT USING (public.is_owner());

-- ==============================================================================
-- 10. SEED DATA (INITIAL ROLES, DEFAULT EVENT, SPEAKERS, SETTINGS, TEMPLATES)
-- ==============================================================================

-- 10.1 Seed Roles
INSERT INTO roles (name, description) VALUES
  ('OWNER', 'Pemilik & Direktur LPK Indonesia Dignity - Akses Penuh Sistem & Audit'),
  ('ADMIN', 'Administrator Operasional - Kelola Pendaftar, Tiket, & Presensi'),
  ('FINANCE', 'Staf Keuangan - Verifikasi Pembayaran, Rekonsiliasi Kas & P&L'),
  ('CS', 'Customer Service - Komunikasi Peserta & Pembaruan Kontak'),
  ('EVENT_MANAGER', 'Manajer Acara - Presensi Zoom, Pembicara, & Sertifikat'),
  ('VIEWER', 'Akses Lihat Saja / Tamu Auditor')
ON CONFLICT (name) DO NOTHING;

-- 10.2 Seed Default Event: Mastering Stage Confidence (14 Nov 2026)
INSERT INTO events (
  slug,
  title,
  event_type,
  date_start,
  date_end,
  venue,
  base_price,
  promo_price,
  status,
  capacity
) VALUES (
  'msc-nov-2026',
  'Mastering Stage Confidence: Bicara Memikat, Karir Melesat',
  'WEBINAR',
  '2026-11-14 09:00:00+07',
  '2026-11-14 12:00:00+07',
  'Zoom Cloud Meeting',
  100000.00,
  100000.00,
  'PUBLISHED',
  500
) ON CONFLICT (slug) DO NOTHING;

-- 10.3 Seed Speakers
INSERT INTO speakers (name, title, bio, default_honor) VALUES
  ('Juctitio Fatah Andri Nugroho, S.H.', 'Professional Public Speaking Coach & Founder KLTC®', 'Praktisi public speaking dan legal trainer terkemuka', 2500000.00),
  ('Donies Daily', 'Host & Co-Founder LPK Indonesia Dignity', 'Moderator eksekutif dan event director', 0.00)
ON CONFLICT DO NOTHING;

-- 10.4 Seed Business System Settings
INSERT INTO system_settings (setting_key, setting_value, category, description) VALUES
  ('ticket_regular_price', '100000', 'FINANCE', 'Harga standar tiket individu webinar'),
  ('ticket_mabar_price', '500000', 'FINANCE', 'Harga paket promo rombongan MABAR (6 pax)'),
  ('voucher_rebate_amount', '100000', 'FINANCE', 'Nilai voucher rebate potongan pendaftaran Bootcamp'),
  ('zoom_license_cost', '250000', 'FINANCE', 'Biaya operasional sewa ruang Zoom Pro per event'),
  ('speaker_budget_diyah', '2500000', 'FINANCE', 'Alokasi honor pembicara utama'),
  ('speaker_budget_willy', '3500000', 'FINANCE', 'Alokasi honor pembicara tamu bootcamp')
ON CONFLICT (setting_key) DO NOTHING;

-- 10.5 Seed Production Message Templates
INSERT INTO message_templates (template_key, name, channel, subject_template, body_template, variables, version, status) VALUES
  (
    'BOOTCAMP_TICKET_V1',
    'Tiket Resmi Webinar & Bootcamp',
    'EMAIL',
    'E-Ticket Resmi: {{event_title}} - LPK Indonesia Dignity',
    '<h2>Halo, {{full_name}}!</h2><p>Pendaftaran Anda untuk <strong>{{event_title}}</strong> telah terkonfirmasi.</p><p>Kode Tiket Resmi Anda: <strong style="color: #2563eb; font-size: 18px;">{{ticket_code}}</strong></p><p>Jadwal: {{event_date}}<br>Lokasi: {{venue}}</p><p>Simpan tiket ini untuk presensi kehadiran.</p>',
    '["full_name", "ticket_code", "event_title", "event_date", "venue"]'::jsonb,
    1,
    'ACTIVE'
  ),
  (
    'PAYMENT_VERIFIED_V1',
    'Konfirmasi Pembayaran Diterima',
    'EMAIL',
    'Pembayaran Terverifikasi: {{event_title}}',
    '<h2>Pembayaran Anda Berhasil Diverifikasi!</h2><p>Halo {{full_name}}, pembayaran Anda sebesar <strong>Rp {{amount}}</strong> telah diverifikasi oleh tim Finance LPK Indonesia Dignity.</p><p>E-Ticket Anda sedang disiapkan dan akan dikirimkan pada email terpisah.</p>',
    '["full_name", "amount", "event_title"]'::jsonb,
    1,
    'ACTIVE'
  ),
  (
    'WEBINAR_REMINDER_H1',
    'Pengingat Webinar H-1',
    'EMAIL',
    '[PENGINGAT BESOK] Webinar: {{event_title}}',
    '<h2>Besok Acara Dimulai!</h2><p>Halo {{full_name}}, jangan lupa besok kita akan belajar bersama di <strong>{{event_title}}</strong> pukul 09.00 WIB.</p><p>Tautan Zoom: {{zoom_link}}<br>Passcode: {{zoom_passcode}}</p>',
    '["full_name", "event_title", "zoom_link", "zoom_passcode"]'::jsonb,
    1,
    'ACTIVE'
  ),
  (
    'CERTIFICATE_READY_V1',
    'E-Sertifikat & Voucher Rebate Rp 100.000',
    'EMAIL',
    'E-Sertifikat Resmi & Voucher Rebate Rp 100.000 - {{event_title}}',
    '<h2>Selamat, {{full_name}}!</h2><p>Anda telah menyelesaikan pelatihan <strong>{{event_title}}</strong>.</p><p>Nomor Sertifikat: <strong>{{certificate_no}}</strong><br>Cek keaslian sertifikat Anda di: <a href="https://dignity.id/verify/{{verification_code}}">https://dignity.id/verify/{{verification_code}}</a></p><p>Sebagai apresiasi, Anda mendapatkan Voucher Rebate Rp 100.000 untuk Bootcamp Offline dengan kode: <strong>{{voucher_code}}</strong>.</p>',
    '["full_name", "certificate_no", "verification_code", "voucher_code", "event_title"]'::jsonb,
    1,
    'ACTIVE'
  ),
  (
    'VOUCHER_V1',
    'Klaim Voucher Diskon Spesial',
    'EMAIL',
    'Voucher Diskon Rp 100.000 untuk Alumni {{event_title}}',
    '<h2>Voucher Spesial Khusus Anda!</h2><p>Halo {{full_name}}, gunakan kode <strong>{{voucher_code}}</strong> untuk mendapatkan potongan Rp 100.000 saat pendaftaran Bootcamp Stage Mastery.</p>',
    '["full_name", "voucher_code", "event_title"]'::jsonb,
    1,
    'ACTIVE'
  )
ON CONFLICT DO NOTHING;
