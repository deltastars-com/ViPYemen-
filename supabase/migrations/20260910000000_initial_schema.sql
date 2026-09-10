-- ViP Yemen Platform — Initial Supabase Schema
-- Mirrors the Convex backend tables for data redundancy, search, and analytics.
-- Run via: supabase db push (local) or GitHub Actions (production).

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA extensions;

-- =============================================================================
-- 1. USERS (admin accounts — backup of Convex auth)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'editor', 'viewer')),
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 2. SUBMISSIONS (all user requests across all sections)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  category TEXT NOT NULL CHECK (category IN ('jobs', 'real_estate', 'emarket', 'software')),
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'rejected', 'sold', 'archived')),
  title TEXT NOT NULL,
  description TEXT,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  price NUMERIC,
  currency TEXT DEFAULT 'YER',
  fields JSONB DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  admin_note TEXT,
  history JSONB DEFAULT '[]',
  phone_verified BOOLEAN NOT NULL DEFAULT false,
  sold_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  published_to JSONB DEFAULT '[]',
  last_channel_push TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submissions_category_status ON public.submissions(category, status);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON public.submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_full_name_trgm ON public.submissions USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_submissions_title_trgm ON public.submissions USING gin (title gin_trgm_ops);

-- =============================================================================
-- 3. ADS (promotional advertisements)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ads (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  priority INTEGER NOT NULL DEFAULT 5,
  link TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  published_to JSONB DEFAULT '[]',
  last_channel_push TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ads_status ON public.ads(status);
CREATE INDEX IF NOT EXISTS idx_ads_priority ON public.ads(priority DESC);

-- =============================================================================
-- 4. OFFERS (promotional offers and deals)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.offers (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  original_price NUMERIC,
  offer_price NUMERIC,
  discount_percent INTEGER,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_to JSONB DEFAULT '[]',
  last_channel_push TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offers_status ON public.offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_featured ON public.offers(is_featured) WHERE is_featured = true;

-- =============================================================================
-- 5. RELEASES (app version history)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.releases (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web', 'docs')),
  file_url TEXT,
  size TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_releases_created ON public.releases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_releases_version ON public.releases(version);

-- =============================================================================
-- 6. NOTIFICATIONS (platform alerts)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(is_read) WHERE is_read = false;

-- =============================================================================
-- 7. SETTINGS (key-value store)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 8. FINANCE (revenue/expenses tracking)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.finance (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finance_created ON public.finance(created_at DESC);

-- =============================================================================
-- 9. FOLLOWUPS (customer ledger)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.followups (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  category TEXT,
  source TEXT NOT NULL DEFAULT 'submission' CHECK (source IN ('submission', 'manual', 'whatsapp')),
  last_submission_title TEXT,
  submission_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'resolved', 'unreachable')),
  reason TEXT,
  note TEXT,
  history JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_followups_phone ON public.followups(phone);
CREATE INDEX IF NOT EXISTS idx_followups_status ON public.followups(status);
CREATE INDEX IF NOT EXISTS idx_followups_updated ON public.followups(updated_at DESC);

-- =============================================================================
-- 10. PHONE_OTP (verification codes)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.phone_otp (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phone_otp_phone ON public.phone_otp(phone);
CREATE INDEX IF NOT EXISTS idx_phone_otp_expires ON public.phone_otp(expires_at);

-- =============================================================================
-- 11. CHANNEL_PUBLISH_LOG (auto-publish tracking)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.channel_publish_log (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('submission', 'ad', 'offer')),
  entity_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('telegram', 'whatsapp', 'both')),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_channel_log_entity ON public.channel_publish_log(entity_type, entity_id);

-- =============================================================================
-- 12. AUTO_RECOVERY_LOG (crash/error tracking)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.auto_recovery_log (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  device_id TEXT,
  origin TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'error' CHECK (severity IN ('warning', 'error', 'critical')),
  app_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recovery_log_created ON public.auto_recovery_log(created_at DESC);

-- =============================================================================
-- 13. AUDIT_LOG (admin action tracking)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  admin_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);

-- =============================================================================
-- 14. UPDATED_AT TRIGGER (auto-update timestamp)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to tables with updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.followups
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 15. FULL-TEXT SEARCH INDEX
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_submissions_search ON public.submissions
  USING gin (
    to_tsvector('arabic', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(full_name, ''))
  );

-- =============================================================================
-- 16. ROW LEVEL SECURITY (RLS)
-- =============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_otp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_publish_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_recovery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Public read access for published content
CREATE POLICY "Public can view published submissions" ON public.submissions
  FOR SELECT USING (status = 'published');

CREATE POLICY "Public can view active ads" ON public.ads
  FOR SELECT USING (status = 'active');

CREATE POLICY "Public can view published offers" ON public.offers
  FOR SELECT USING (status = 'published');

CREATE POLICY "Public can view releases" ON public.releases
  FOR SELECT USING (true);

-- Service role (backend) has full access
CREATE POLICY "Service role full access" ON public.users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.submissions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.ads
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.offers
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.releases
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.notifications
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.settings
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.finance
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.followups
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.phone_otp
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.channel_publish_log
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.auto_recovery_log
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON public.audit_log
  FOR ALL USING (auth.role() = 'service_role');

-- Anon can insert (for public forms, recovery logs)
CREATE POLICY "Anon can insert submissions" ON public.submissions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anon can insert recovery logs" ON public.auto_recovery_log
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anon can insert phone OTP" ON public.phone_otp
  FOR INSERT WITH CHECK (true);

-- =============================================================================
-- 17. VIEWS (analytics and dashboard)
-- =============================================================================
CREATE OR REPLACE VIEW public.submissions_stats AS
SELECT
  category,
  status,
  count(*) as count,
  min(created_at) as oldest,
  max(created_at) as newest
FROM public.submissions
GROUP BY category, status;

CREATE OR REPLACE VIEW public.daily_submissions AS
SELECT
  date(created_at) as day,
  category,
  count(*) as count
FROM public.submissions
WHERE created_at > now() - interval '30 days'
GROUP BY date(created_at), category
ORDER BY day DESC;

CREATE OR REPLACE VIEW public.recent_activity AS
SELECT
  'submission' as entity_type,
  id,
  title,
  status,
  created_at
FROM public.submissions
UNION ALL
SELECT
  'ad' as entity_type,
  id,
  title,
  status,
  created_at
FROM public.ads
UNION ALL
SELECT
  'offer' as entity_type,
  id,
  title,
  status,
  created_at
FROM public.offers
ORDER BY created_at DESC
LIMIT 100;

-- =============================================================================
-- Done! Schema ready for ViP Yemen platform.
-- =============================================================================
COMMENT ON SCHEMA public IS 'ViP Yemen platform database — mirrors Convex backend for redundancy and search';