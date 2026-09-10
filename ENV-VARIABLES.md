# ViP Yemen Platform — Environment Variables Reference
# ====================================================
# This file documents all required environment variables.
# Actual values are set in Vercel, GitHub Secrets, and Supabase Dashboard.
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

## TELEGRAM (Channel Auto-Publishing)
- `TELEGRAM_BOT_TOKEN` — Bot token from @BotFather
- `TELEGRAM_CHAT_ID` — Channel/group ID(s), comma-separated

## WHATSAPP (Channel Auto-Publishing)
- `WHATSAPP_ACCESS_TOKEN` — Cloud API access token
- `WHATSAPP_PHONE_NUMBER_ID` — Business phone number ID
- `WHATSAPP_BROADCAST_TO` — Recipient phone numbers, comma-separated

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