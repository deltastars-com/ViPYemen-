-- ViP Yemen — Database Functions and Triggers
-- Run AFTER 004_rls.sql

-- =============================================================================
-- AUTO-UPDATE TIMESTAMP TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to tables with updated_at
CREATE TRIGGER set_updated_at_submissions
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_followups
  BEFORE UPDATE ON public.followups
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_settings
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- PHONE OTP CLEANUP (delete expired codes)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_otp()
RETURNS void AS $$
BEGIN
  DELETE FROM public.phone_otp
  WHERE expires_at < now() - interval '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- GET PLATFORM STATISTICS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS TABLE (
  submissions_count bigint,
  published_count bigint,
  pending_count bigint,
  ads_count bigint,
  offers_count bigint,
  releases_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT count(*) FROM public.submissions)::bigint,
    (SELECT count(*) FROM public.submissions WHERE status = 'published')::bigint,
    (SELECT count(*) FROM public.submissions WHERE status = 'pending')::bigint,
    (SELECT count(*) FROM public.ads WHERE status = 'active')::bigint,
    (SELECT count(*) FROM public.offers WHERE status = 'published')::bigint,
    (SELECT count(*) FROM public.releases)::bigint;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- SEARCH SUBMISSIONS (full-text)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.search_submissions(
  search_query text,
  result_limit integer DEFAULT 20
)
RETURNS SETOF public.submissions AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.submissions
  WHERE status = 'published'
    AND (
      title ILIKE '%' || search_query || '%'
      OR description ILIKE '%' || search_query || '%'
      OR full_name ILIKE '%' || search_query || '%'
    )
  ORDER BY created_at DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Functions created successfully' as status;