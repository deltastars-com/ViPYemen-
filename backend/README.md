# ViP Yemen — Backend (Supabase)

This folder contains all Supabase database files that need to be manually imported into your Supabase project.

## 📁 Folder Structure

```
backend/
├── sql/                    # SQL migrations (run in order)
│   ├── 001_extensions.sql  # Required PostgreSQL extensions
│   ├── 002_tables.sql      # All table definitions
│   ├── 003_indexes.sql     # Performance indexes
│   ├── 004_rls.sql         # Row Level Security policies
│   ├── 005_functions.sql   # Database functions and triggers
│   ├── 006_views.sql       # Analytics views
│   └── 007_seed.sql        # Initial data
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

## 🚀 Quick Setup

### Option 1: SQL Editor (Recommended)
1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Run each file in order: `001` → `007`
4. Import seed data from `seed/` folder

### Option 2: Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref etgkhpasgfgeofifditu

# Push all migrations
supabase db push
```

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

When you push changes to `backend/sql/` folder, GitHub Actions will automatically:
1. Run the migration on your Supabase project
2. Generate updated TypeScript types
3. Commit the types back to the repository