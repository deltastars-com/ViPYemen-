#!/bin/bash
# =============================================================================
# ViP Yemen - Build & Package Script
# =============================================================================
# Builds the web PWA (dist/) and packages release artifacts.
# Android APK/AAB require the android-native project (see PUBLISHING-GUIDE.md).
# Prerequisites: Bun (Node.js 22+), Java 17 + Android SDK only for APK builds.
#
# Usage:
#   sh ./build-apk.sh          # build web PWA + package artifacts
#   sh ./build-apk.sh android  # also build APK/AAB (needs android-native/)
# =============================================================================

set -e

echo "🚀 ViP Yemen Build & Package"
echo "============================"
echo ""

# ---------- Step 1: Web PWA ----------
echo "📦 Step 1: Installing dependencies..."
bun install --frozen-lockfile || bun install

echo "🏗️  Step 2: Generating icons..."
bun run icons

echo "✅ Step 3: Typecheck..."
bun run typecheck

echo "🔨 Step 4: Building web PWA..."
bun run build

# ---------- Step 5: Package artifacts ----------
echo "📋 Step 5: Packaging release artifacts..."
mkdir -p release

VERSION=$(node -e "console.log(require('./package.json').version)")
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Web PWA (static hosting-ready)
cp -r dist "release/vip-yemen-web-pwa-${VERSION}"
(cd release && zip -r "vip-yemen-web-pwa-${VERSION}.zip" "vip-yemen-web-pwa-${VERSION}" > /dev/null)
echo "✅ Web PWA: release/vip-yemen-web-pwa-${VERSION}.zip"

# Source archive (excluding deps/build)
zip -r "release/vip-yemen-source-${VERSION}.zip" \
  src index.html package.json bun.lock vite.config.ts convex.json public scripts \
  .github PRIVACY-POLICY.md PUBLISHING-GUIDE.md RELEASE-GUIDE.md README.md \
  > /dev/null
echo "✅ Source: release/vip-yemen-source-${VERSION}.zip"

# Docs
cp PRIVACY-POLICY.md PUBLISHING-GUIDE.md RELEASE-GUIDE.md README.md release/

# ---------- Optional: Android ----------
if [ "$1" = "android" ]; then
  echo ""
  echo "📱 Building Android APK/AAB..."
  if [ ! -d "android-native" ]; then
    echo "❌ android-native/ project not found."
    echo "   APK/AAB builds require the native Android project — see PUBLISHING-GUIDE.md."
    echo "   Web PWA artifacts were still produced in release/."
    exit 0
  fi
  if [ -z "$ANDROID_HOME" ] && [ -d "$HOME/Android/Sdk" ]; then
    export ANDROID_HOME="$HOME/Android/Sdk"
  fi
  cd android-native
  if [ ! -f gradlew ]; then
    gradle wrapper --gradle-version 8.10.2
  fi
  ./gradlew assembleDebug bundleRelease --no-daemon
  cp app/build/outputs/apk/debug/app-debug.apk "../release/ViP-Yemen-${VERSION}-debug.apk"
  cp app/build/outputs/bundle/release/app-release.aab "../release/ViP-Yemen-${VERSION}-release.aab"
  cd ..
  echo "✅ APK/AAB saved to release/"
fi

echo ""
echo "🎉 Build complete! Files in release/:"
ls -lh release/
echo ""
echo "📥 PWA install: host release/vip-yemen-web-pwa-${VERSION}/ on any static host."
echo "📤 Google Play: upload the .aab to Play Console (package com.vip.yemen)."