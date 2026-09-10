-- ViP Yemen — Table Definitions
-- Run AFTER 001_extensions.sql

-- =============================================================================
-- 1. USERS (admin accounts)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'editor', 'viewer')),
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 2. SUBMISSIONS (all user requests)
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

-- =============================================================================
-- 3. ADS (advertisements)
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

-- =============================================================================
-- 4. OFFERS (promotional offers)
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

-- =============================================================================
-- 5. RELEASES (app versions)
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

-- =============================================================================
-- 6. NOTIFICATIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 7. SETTINGS (key-value)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 8. FINANCE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.finance (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

-- =============================================================================
-- 10. PHONE_OTP
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.phone_otp (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 11. CHANNEL_PUBLISH_LOG
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

-- =============================================================================
-- 12. AUTO_RECOVERY_LOG
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

-- =============================================================================
-- 13. AUDIT_LOG
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

-- Confirm tables created
SELECT 'Tables created successfully' as status;