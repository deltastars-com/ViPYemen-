#!/bin/sh
# Vercel production build for ViP Yemen.
#
# The production backend URL must ALWAYS be the real Convex deployment, or
# the dashboard and every data-driven section ship dead. So before building:
#   1. If CONVEX_DEPLOY_KEY is present in the Vercel environment, deploy the
#      backend functions to the user's Convex deployment and read the exact
#      deployment URL from Convex's own output.
#   2. Otherwise fall back to the VITE_CONVEX_URL environment variable (and
#      warn loudly if neither is set).
set -e

if [ -n "$CONVEX_DEPLOY_KEY" ]; then
  echo "==> Deploying Convex backend with CONVEX_DEPLOY_KEY..."
  DEPLOY_OUT=$(npx convex deploy 2>&1) || {
    echo "$DEPLOY_OUT"
    echo "!! Convex deploy failed — check CONVEX_DEPLOY_KEY in Vercel env. Falling back to VITE_CONVEX_URL."
  }
  URL=$(printf '%s' "$DEPLOY_OUT" | grep -oE 'https://[a-z0-9-]+\.convex\.(site|cloud)' | head -1 || true)
  if [ -n "$URL" ]; then
    export VITE_CONVEX_URL="$URL"
    echo "==> VITE_CONVEX_URL=$URL"
  else
    echo "!! No deployment URL found in Convex output — using VITE_CONVEX_URL from env if set."
  fi
fi

if [ -z "$VITE_CONVEX_URL" ]; then
  echo "!! WARNING: VITE_CONVEX_URL is not set anywhere — the dashboard will show the offline notice."
fi

bun run build