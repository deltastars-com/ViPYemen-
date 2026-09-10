-- ViP Yemen — Analytics Views
-- Run AFTER 005_functions.sql

-- =============================================================================
-- SUBMISSIONS STATS
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

-- =============================================================================
-- DAILY SUBMISSIONS (last 30 days)
-- =============================================================================

CREATE OR REPLACE VIEW public.daily_submissions AS
SELECT
  date(created_at) as day,
  category,
  count(*) as count
FROM public.submissions
WHERE created_at > now() - interval '30 days'
GROUP BY date(created_at), category
ORDER BY day DESC;

-- =============================================================================
-- RECENT ACTIVITY (all entity types)
-- =============================================================================

CREATE OR REPLACE VIEW public.recent_activity AS
SELECT
  'submission' as entity_type,
  id::text,
  title,
  status,
  created_at
FROM public.submissions
UNION ALL
SELECT
  'ad' as entity_type,
  id::text,
  title,
  status,
  created_at
FROM public.ads
UNION ALL
SELECT
  'offer' as entity_type,
  id::text,
  title,
  status,
  created_at
FROM public.offers
ORDER BY created_at DESC
LIMIT 100;

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

SELECT 'Views created successfully' as status;