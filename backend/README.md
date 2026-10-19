# ViP Yemen — Backend (Supabase)

This folder contains all Supabase database files that need to be manually imported into your Supabase project.

## 📁 Folder Structure

```
backend/
├── sql/                    # Seed data only — the schema lives in supabase/migrations/
│   └── 007_seed.sql        # Initial data (ads, offers, releases, settings)
├── seed/                   # Seed data JSON files
│   ├── ads.json            # Initial advertisements
│   ├── offers.json         # Initial offers
│   ├── releases.json       # Version history
│   └── settings.json       # Default settings
├── functions/              # Edge Functions (optional)
│   └── send-notification/  # Push notification handler
└── types/                  # TypeScript types
    └── database.ts         # Auto-generated types
```

> ⚠️ **مصدر واحد للحقيقة:** المخطط الكامل (الجداول، الفهارس، سياسات RLS،
> الدوال، العروض) موجود فقط في `supabase/migrations/`. الملفات القديمة
> `001`–`006` في `backend/sql/` كانت نسخاً مكرّرة منه وحُذفت لمنع تضارب
> النسخ. الدوال والعروض الإضافية (`cleanup_expired_otp`,
> `get_platform_stats`, `search_submissions`, `pending_reviews`,
> `monthly_revenue`) انتقلت إلى
> `supabase/migrations/20261019000000_utility_functions_views.sql`.

## 🚀 Quick Setup

### Option 1: Supabase CLI (Recommended)
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref etgkhpasgfgeofifditu

# Push all migrations (schema + utilities)
supabase db push
```

### Option 2: SQL Editor
1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Run every file in `supabase/migrations/` in chronological order
4. Run `backend/sql/007_seed.sql` for initial data (optional)
5. Import seed data from `seed/` folder (optional)

## 📊 Tables Overview

| Table | Description |
|-------|-------------|
| `users` | Admin accounts |
| `submissions` | All user requests (jobs, real estate, etc.) |
| `ads` | Promotional advertisements |
| `offers` | Deals and discounts |
| `releases` | App version history |
| `notifications` | Platform alerts |
| `settings` | Key-value configuration |
| `finance` | Revenue/expenses tracking |
| `followups` | Customer ledger |
| `phone_otp` | Verification codes |
| `channel_publish_log` | Auto-publish tracking |
| `auto_recovery_log` | Error tracking |
| `audit_log` | Admin action history |

## 🔐 Security

- **Row Level Security (RLS)** is enabled on all tables
- Public users can only read published content
- Service role has full access for backend operations
- Anonymous users can insert (for public forms)

## 🔄 Auto-Deploy

When you push changes to `supabase/migrations/` folder, GitHub Actions will automatically:
1. Run the migration on your Supabase project
2. Generate updated TypeScript types
3. Commit the types back to the repository

Pushes that only touch `backend/sql/` (seed data) are detected as
"no new migrations" and finish successfully without touching the database.