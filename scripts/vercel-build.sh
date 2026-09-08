#!/bin/sh
# Vercel production build for ViP Yemen.
#
# The production backend URL must ALWAYS be the real Convex deployment, or
# the dashboard and every data-driven section ship dead. Resolution order:
#   1. VITE_CONVEX_URL from the Vercel environment (if set)
#   2. CONVEX_DEPLOY_KEY present → try `convex deploy` (time-bounded,
#      non-interactive) and read the deployment URL from Convex's own output
#   3. Otherwise the client bundle falls back to the live production
#      deployment baked into src/lib/convex.ts
# This script NEVER blocks or fails the build — the worst case is the
# built-in production fallback, so every Vercel build ships a connected app.
set -e

if [ -n "$VITE_CONVEX_URL" ]; then
  echo "==> Using VITE_CONVEX_URL from Vercel env: $VITE_CONVEX_URL"
elif [ -n "$CONVEX_DEPLOY_KEY" ]; then
  echo "==> Deploying Convex backend with CONVEX_DEPLOY_KEY..."
  DEPLOY_OUT=$(timeout 150 npx --yes convex@1.45.0 deploy 2>&1 || true)
  URL=$(printf '%s' "$DEPLOY_OUT" | grep -oE 'https://[a-z0-9-]+\.convex\.(site|cloud)' | head -1 || true)
  if [ -n "$URL" ]; then
    export VITE_CONVEX_URL="$URL"
    echo "==> Deployed and resolved VITE_CONVEX_URL=$URL"
  else
    echo "!! No deployment URL resolved — client fallback will be used."
  fi
else
  echo "!! Neither VITE_CONVEX_URL nor CONVEX_DEPLOY_KEY set — client fallback will be used."
fi

bun run build