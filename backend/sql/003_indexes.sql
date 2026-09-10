-- ViP Yemen — Performance Indexes
-- Run AFTER 002_tables.sql

-- Submissions indexes
CREATE INDEX IF NOT EXISTS idx_submissions_category_status ON public.submissions(category, status);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON public.submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_full_name_trgm ON public.submissions USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_submissions_title_trgm ON public.submissions USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_submissions_search ON public.submissions
  USING gin (to_tsvector('arabic', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(full_name, '')));

-- Ads indexes
CREATE INDEX IF NOT EXISTS idx_ads_status ON public.ads(status);
CREATE INDEX IF NOT EXISTS idx_ads_priority ON public.ads(priority DESC);

-- Offers indexes
CREATE INDEX IF NOT EXISTS idx_offers_status ON public.offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_featured ON public.offers(is_featured) WHERE is_featured = true;

-- Releases indexes
CREATE INDEX IF NOT EXISTS idx_releases_created ON public.releases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_releases_version ON public.releases(version);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(is_read) WHERE is_read = false;

-- Finance indexes
CREATE INDEX IF NOT EXISTS idx_finance_created ON public.finance(created_at DESC);

-- Followups indexes
CREATE INDEX IF NOT EXISTS idx_followups_phone ON public.followups(phone);
CREATE INDEX IF NOT EXISTS idx_followups_status ON public.followups(status);
CREATE INDEX IF NOT EXISTS idx_followups_updated ON public.followups(updated_at DESC);

-- Phone OTP indexes
CREATE INDEX IF NOT EXISTS idx_phone_otp_phone ON public.phone_otp(phone);
CREATE INDEX IF NOT EXISTS idx_phone_otp_expires ON public.phone_otp(expires_at);

-- Channel publish log indexes
CREATE INDEX IF NOT EXISTS idx_channel_log_entity ON public.channel_publish_log(entity_type, entity_id);

-- Auto recovery log indexes
CREATE INDEX IF NOT EXISTS idx_recovery_log_created ON public.auto_recovery_log(created_at DESC);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);

SELECT 'Indexes created successfully' as status;