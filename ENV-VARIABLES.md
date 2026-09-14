# ViP Yemen Platform — Environment Variables Reference
# ====================================================
# This file documents all required environment variables.
# Actual values are set in Vercel, GitHub Secrets, Supabase, and Convex Dashboard.
# NEVER commit actual secrets to the repository.

## CONVEX (Primary Backend)
- `VITE_CONVEX_URL` — Backend URL (e.g., `https://xxx.convex.cloud`)
- `CONVEX_DEPLOY_KEY` — Deploy key for CI/CD (server-side only)

## SUPABASE (Secondary Backend — Storage, Search, Analytics)
- `VITE_SUPABASE_URL` — Project URL (e.g., `https://xxx.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` — Public anon key (safe for client)
- `SUPABASE_SERVICE_ROLE_KEY` — Admin key (server-side only)

## AI ENGINE
- `VITE_GEMINI_KEY` — Google Gemini API key for assistant

## TELEGRAM (Channel Auto-Publishing) — Bot: @vipyemen_bot
- `TELEGRAM_BOT_TOKEN` — Bot token (default: built-in for @vipyemen_bot)
- `TELEGRAM_CHAT_ID` — Channel: `@vipyemen77` (comma-separated for several chats)

## WHATSAPP (Channel Auto-Publishing)
- `WHATSAPP_ACCESS_TOKEN` — Cloud API access token
- `WHATSAPP_PHONE_NUMBER_ID` — Business phone number ID
- `WHATSAPP_BROADCAST_TO` — Recipient phone numbers, comma-separated

## FACEBOOK (Page + Group Auto-Publishing)
- `FACEBOOK_ACCESS_TOKEN` — Permanent **Page** Access Token with `pages_manage_posts` + `publish_to_groups` permissions
- `FACEBOOK_PAGE_ID` — Page numeric ID: `102672588647591` (https://facebook.com/vipyemen1)
- `FACEBOOK_GROUP_ID` — Group ID: `346010664332427` (https://facebook.com/groups/346010664332427/)

### How to get the Facebook Access Token:
1. Go to https://developers.facebook.com/apps → Create App → Business type
2. Add Product: Facebook Login + Pages
3. Permissions needed: `pages_manage_posts` + `pages_read_engagement` + `publish_to_groups`
4. Open Graph API Explorer → Select app **Vipyemen**
5. **IMPORTANT**: From the "User or Page" dropdown → Select **page Vipservicesyemen** (not User Token!)
6. Check all permissions → Generate token → Must include `pages_manage_posts` and `publish_to_groups`
7. Extend token: paste into https://developers.facebook.com/tools/debug/accesstoken → Extend Access Token

## ANDROID SIGNING (CI/CD)
- `ANDROID_KEYSTORE_B64` — Base64-encoded keystore
- `ANDROID_KEYSTORE_PASSWORD` — Keystore password
- `ANDROID_KEY_ALIAS` — Key alias (default: vipyemen)
- `ANDROID_KEY_PASSWORD` — Key password

## iOS SIGNING (Codemagic CI/CD)
- `APP_STORE_CONNECT_PRIVATE_KEY` — App Store Connect API key (.p8)
- `APP_STORE_CONNECT_KEY_ID` — API key ID
- `APP_STORE_CONNECT_ISSUER_ID` — Issuer ID
- `CERTIFICATE_PRIVATE_KEY` — Distribution certificate (.p12, base64)
- `CERTIFICATE_PASSWORD` — Certificate password
- `PROVISIONING_PROFILE_DATA` — Provisioning profile (base64)

---

## Convex Dashboard Setup
Set these in **Convex Dashboard → Settings → Environment Variables**:

| Variable | Value |
|---|---|
| `TELEGRAM_BOT_TOKEN` | `8876814738:AAFEpkzzC0g__-xGz9JE_sqvq0JMM1kHVWM` |
| `TELEGRAM_CHAT_ID` | `@vipyemen77` |
| `FACEBOOK_ACCESS_TOKEN` | *(your permanent PAGE token — see above. Must be Page Token, not User Token!)* |
| `FACEBOOK_PAGE_ID` | `102672588647591` (numeric ID for Vipservicesyemen page) |
| `FACEBOOK_GROUP_ID` | `346010664332427` |
| `WHATSAPP_ACCESS_TOKEN` | *(your WhatsApp Cloud API token)* |
| `WHATSAPP_PHONE_NUMBER_ID` | *(your WhatsApp phone number ID)* |
| `WHATSAPP_BROADCAST_TO` | *(comma-separated phone numbers)* |
