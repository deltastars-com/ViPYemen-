-- ViP Yemen — Utility functions and analytics views
-- These objects previously lived only in `backend/sql/005_functions.sql` and
-- `backend/sql/006_views.sql`, which were seed/reference copies that CI never
-- applied. Moving them here makes `supabase/migrations/` the single source of
-- truth for the schema (the duplicated copies were removed).
-- `handle_updated_at`, `submissions_stats`, `daily_submissions`, and
-- `recent_activity` already exist in the initial schema migration.

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

-- =============================================================================
-- PENDING REVIEWS
-- =============================================================================

CREATE OR REPLACE VIEW public.pending_reviews AS
SELECT
  'submission' as entity_type,
  id::text,
  title,
  full_name,
  phone,
  category,
  created_at
FROM public.submissions
WHERE status = 'pending'
ORDER BY created_at ASC;

-- =============================================================================
-- MONTHLY REVENUE
-- =============================================================================

CREATE OR REPLACE VIEW public.monthly_revenue AS
SELECT
  date_trunc('month', created_at) as month,
  type,
  sum(amount) as total,
  count(*) as transactions
FROM public.finance
WHERE created_at > now() - interval '12 months'
GROUP BY date_trunc('month', created_at), type
ORDER BY month DESC;
