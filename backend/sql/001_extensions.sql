-- ViP Yemen — Required PostgreSQL Extensions
-- Run this FIRST before other migrations.

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- Password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- Full-text search (trigram for fuzzy matching)
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA extensions;

-- Page rank (for search ranking)
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA extensions;

-- Confirm extensions are installed
SELECT 'Extensions installed successfully' as status;