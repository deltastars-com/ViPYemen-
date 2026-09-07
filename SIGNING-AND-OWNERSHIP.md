# ViP Yemen — Signing, Ownership & Store Submission Record

**Package / Bundle ID:** `com.vip.yemen`
**App name:** ViP Yemen
**Developer/owner:** المهندس علي درهم الدحان — Delta Stars
**Official contact:** vipservicesyemen@gmail.com · WhatsApp +967711780999

---

## 1. App signing (Android)

Every release build is signed with a single stable key so **new versions
install automatically over the previous one — no uninstall needed**.

| Item | Value |
|---|---|
| Keystore file (project) | `android/keystore/vipyemen-release.p12` |
| Build config | `android/keystore.properties` |
| Store type | PKCS12 |
| Key alias | `vipyemen` |
| Key size / algorithm | RSA 3072 / SHA-256withRSA |
| Valid until | 23 Jan 2054 |
| Certificate subject | `C=YE, ST=Sanaa, L=Sanaa, O=ViP Yemen, OU=Mobile Development, CN=ViP Yemen, emailAddress=vipservicesyemen@gmail.com` |
| SHA-256 fingerprint | `FD:AE:0D:25:93:F7:96:46:DD:07:7C:23:52:D1:68:2C:BE:9F:CC:3D:27:17:2A:6D:8E:F9:15:3E:A7:65:F4:8B` |

The release workflow signs `assembleRelease` + `bundleRelease` with this key
on every tagged release. Repository Secrets
(`ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
`ANDROID_KEY_PASSWORD`) override it whenever you switch to a private key.

> ⚠️ **Google Play**: generate a private **upload key** in Play Console and keep
> it secret. Play re-signs with its own app-signing key for distribution; the
> upload key is only used to verify your uploads. Never lose it — Play cannot
> recover it for you.

### Verify an APK's signature
```bash
keytool -printcert -jarfile app-release.apk        # prints the signing cert
apksigner verify --print-certs app-release.apk      # Android SDK tool
```

## 2. iOS signing

iOS builds are produced with Codemagic (`codemagic.yaml` in the repo root).
You must provide, in Codemagic → Team settings → Environment variables:

| Variable | Purpose |
|---|---|
| `APP_STORE_CONNECT_PRIVATE_KEY` | App Store Connect API key (`.p8`) |
| `APP_STORE_CONNECT_KEY_ID` | API key ID |
| `APP_STORE_CONNECT_ISSUER_ID` | Issuer ID |
| `CERTIFICATE_PRIVATE_KEY` | Apple Distribution certificate `.p12` (base64) |
| `CERTIFICATE_PASSWORD` | Certificate password |
| `PROVISIONING_PROFILE_DATA` | App Store provisioning profile (base64) |

Bundle ID on Apple: `com.vip.yemen`. Create the app record in App Store
Connect first with the same bundle ID, then push "New build" from Codemagic.

## 3. Ownership / intellectual property

- Platform, brand, logo (gold seal), copy, and source code: © 2026 ViP Yemen —
  المهندس علي درهم الدحان. All rights reserved.
- Privacy policies (web + store submission) live at `PRIVACY-POLICY.md` and
  `PRIVACY-POLICY-APP.md`; the public policy page is served at
  `/privacy-policy` inside the app and must be reachable at your hosted
  domain for store review.
- Play Console / App Store ownership verification uses the developer name and
  the contact email above.

## 4. Store assets (in this repo)

| File | Used for |
|---|---|
| `store-graphics/feature-graphic-1024x500.png` | Google Play feature graphic (1024×500) |
| `store-graphics/icon-512.png` | Store listing icon (512×512) |
| `public/icons/apple-touch-icon.png` | iOS/PWA touch icon |
| `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` | iOS app icon (1024×1024) |
| `store-listing.json` | Play / App Store listing copy (AR/EN) |
| `PRIVACY-POLICY-APP.md` | Store privacy policy submission text |
| `PUBLISHING-GUIDE.md` / `RELEASE-GUIDE.md` | Step-by-step upload guides |

## 5. Auto-updates (users never re-download)

- **PWA**: the service worker checks for a new version every 30 minutes and on
  focus, and applies it automatically in the background.
- **Android APK/AAB**: stable signature above means installing vX+1 directly
  over vX replaces the old app and keeps all data — update straight from the
  new release file.
- **GitHub Actions**: every tagged release rebuilds automatically, so the
  latest version is always one download away in **Releases**.
