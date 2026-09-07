# Android Signing — ViP Yemen

This folder holds the **stable project signing keystore** used by the release
workflow so every APK/AAB is signed with the SAME key.

## Why this matters
When every build is signed with a different key, Android refuses to install a
new version over an old one ("app not installed" / signature mismatch) and the
user is forced to uninstall first. A single stable key enables **seamless
automatic upgrades**: each new version installs directly over the previous one.

## Files
| File | Purpose |
|---|---|
| `vipyemen-release.p12` | PKCS12 keystore (RSA 3072, self-signed, valid until 2054) |
| `../keystore.properties` | Build config consumed by `android/app/build.gradle` |
| subject | `C=YE, ST=Sanaa, L=Sanaa, O=ViP Yemen, OU=Mobile Development, CN=ViP Yemen` |
| alias | `vipyemen` |
| SHA-256 fingerprint | `FD:AE:0D:25:93:F7:96:46:DD:07:7C:23:52:D1:68:2C:BE:9F:CC:3D:27:17:2A:6D:8E:F9:15:3E:A7:65:F4:8B` |

## How the build signs
1. `android/keystore.properties` is checked out with the repo.
2. `android/app/build.gradle` sees the file and applies `signingConfigs.release`
   to the `release` build type.
3. CI runs `./gradlew assembleRelease bundleRelease` → both artifacts carry the
   stable signature.
4. Repo Secrets (`ANDROID_KEYSTORE_B64` + passwords) can override this file if
   you ever switch to a private key — the workflow prefers secrets when present.

## ⚠️ Security note (read before publishing to Google Play)
This key lives in the repository so builds work fully automatically. Anyone
with access to the repo could sign an update with it — fine for direct
distribution through GitHub Releases, but **Google Play requires a private
upload key that only you hold**. When you publish on Play:
1. Generate your own key and keep it secret (see `SIGNING-AND-OWNERSHIP.md`).
2. Set `ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_PASSWORD`,
   `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` in repo Secrets.
3. Re-upload the same signed APK to Play (upload key ≠ app signing key in Play).

Verify any build's signature locally:
```bash
keytool -printcert -jarfile app-release.apk   # shows the signing cert
openssl pkcs12 -in keystore/vipyemen-release.p12 -clcerts -nokeys -passin pass:ViPYemen2026@Sign | openssl x509 -noout -fingerprint -sha256
```
