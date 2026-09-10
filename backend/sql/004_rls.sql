-- ViP Yemen — Row Level Security (RLS)
-- Run AFTER 003_indexes.sql

-- Enable RLS on all tables
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

-- =============================================================================
-- PUBLIC READ ACCESS (for published content)
-- =============================================================================

-- Public can view published submissions
CREATE POLICY "Public can view published submissions" ON public.submissions
  FOR SELECT USING (status = 'published');

-- Public can view active ads
CREATE POLICY "Public can view active ads" ON public.ads
  FOR SELECT USING (status = 'active');

-- Public can view published offers
CREATE POLICY "Public can view published offers" ON public.offers
  FOR SELECT USING (status = 'published');

-- Public can view all releases
CREATE POLICY "Public can view releases" ON public.releases
  FOR SELECT USING (true);

-- =============================================================================
-- SERVICE ROLE (backend) — FULL ACCESS
-- =============================================================================

CREATE POLICY "Service role full access" ON public.users FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.submissions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.ads FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.offers FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.releases FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.notifications FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.settings FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.finance FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.followups FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.phone_otp FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.channel_publish_log FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.auto_recovery_log FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.audit_log FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- ANON INSERT (for public forms)
-- =============================================================================

CREATE POLICY "Anon can insert submissions" ON public.submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon can insert recovery logs" ON public.auto_recovery_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon can insert phone OTP" ON public.phone_otp FOR INSERT WITH CHECK (true);

SELECT 'RLS policies created successfully' as status;