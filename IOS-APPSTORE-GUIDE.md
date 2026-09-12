# ViP Yemen — دليل بناء ونشر تطبيق iOS | iOS Build & App Store Guide

> الإصدار | Version: **6.7.5** · Bundle ID: `com.vip.yemen` · Xcode 16+ · iOS 15+

هذا الدليل يشرح كل ملفات iOS المطلوبة ومكانها، وكيفية رفع التطبيق إلى App Store Connect خطوة بخطوة.
This guide documents every iOS file in the project and the exact steps to publish to the App Store.

---

## 1) ملفات المشروع الكاملة | Complete iOS File Map

| الملف / File | الوصف / Purpose |
|---|---|
| `ios/App/App.xcodeproj/project.pbxproj` | مشروع Xcode — SPM، إعدادات التوقيع، الإصدارات (6.7.5 / 6070005) |
| `ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme` | مخطط البناء Archive/Release |
| `ios/App/App/AppDelegate.swift` | نقطة دخول Capacitor |
| `ios/App/App/SceneDelegate.swift` | إدارة نوافذ الـ Scene |
| `ios/App/App/Info.plist` | الأذونات (كاميرا/صور/Face ID)، التوطين ar+en، ITSAppUsesNonExemptEncryption=false |
| `ios/App/App/PrivacyInfo.xcprivacy` | **بيان خصوصية Apple المطلوب** (Required-Reason APIs، لا تتبع) |
| `ios/App/App/Assets.xcassets/AppIcon.appiconset/` | أيقونة 1024×1024 (iOS 18 single-size) |
| `ios/App/App/Assets.xcassets/Splash.imageset/` | شاشة البدء 2732×2732 |
| `ios/App/App/Base.lproj/LaunchScreen.storyboard` | شاشة الإطلاق (مطلوبة للمتجر) |
| `ios/App/App/public/` | أصول الويب المبنيّة (PWA bundle داخل التطبيق) |
| `ios/App/CapApp-SPM/` | حزمة Swift محلية تربط Capacitor 8 عبر SPM (بدون CocoaPods) |
| `ios/App/ExportOptions.plist` | خيارات التصدير App Store Connect (توقيع يدوي) |
| `ios/capacitor-cordova-ios-plugins/` | جسر إضافات Cordova المولّد |
| `ios/debug.xcconfig` | إعداد CAPACITOR_DEBUG |

---

## 2) ما يبنيه سير العمل تلقائياً | What CI Builds Automatically

عند دفع وسم `v*`، تُنتج مهمة **build-ios** في `.github/workflows/release.yml`:

| الملف | الوصف |
|---|---|
| `vip-yemen-ios-vX.Y.Z.ipa` | حزمة `Payload/App.app` — تُثبَّت جانبياً للتجربة (Xcode / Apple Configurator)، وتُعاد توقيعها قبل الرفع للمتجر |
| `vip-yemen-ios-metadata-vX.Y.Z.zip` | `ExportOptions.plist` + `PrivacyInfo.xcprivacy` + `Info.plist` + أيقونة 1024 + سياسة الخصوصية + بيانات القائمة |
| `build.log` | سجل البناء الكامل للتشخيص |

> **لماذا IPA غير موقّعة؟** لا توجد شهادات Apple في المستودع (ولا يجوز). التطبيق يُبنى بنجاح على كل إصدار لإثبات سلامة المشروع، ثم توقيعه استغلالياً يستغرق دقيقة واحدة (الخطوة 4).

---

## 3) المتطلبات المسبقة | Prerequisites

1. حساب Apple Developer Program (فرد 99$/سنة أو مؤسسة).
2. App ID: أنشئ في [developer.apple.com → Identifiers](https://developer.apple.com/account/resources/identifiers/list) — **Explicit**، Bundle ID: `com.vip.yemen`.
3. تفعيل Capabilities: **Associated Domains** (اختياري)، **Push** (إن فعّلت الإشعارات لاحقاً).
4. App Store Connect → My Apps → **+** → New App:
   - Name: `ViP Yemen` · Primary Language: `Arabic (Yemen)` · Bundle ID: `com.vip.yemen` · SKU: `VIPIEMEN001`

---

## 4) التوقيع ورفع التطبيق | Sign & Upload (10 دقائق)

```bash
# أ) حمّل IPA من صفحة الإصدار وفكّها
unzip vip-yemen-ios-v6.7.5.ipa -d work && cd work

# ب) افتح المشروع وحدّث Team
open ios/App/App.xcodeproj   # من الكود المصدري
# Xcode → Target App → Signing & Capabilities → Team: <حسابك>
# Signing Certificate: Apple Distribution

# ج) صدّر حزمة App Store موقّعة
xcodebuild -project ios/App/App.xcodeproj -scheme App \
  -configuration Release -destination 'generic/platform=iOS' \
  -derivedDataPath ios/build archive -archivePath ios/build/App.xcarchive

xcodebuild -exportArchive \
  -archivePath ios/build/App.xcarchive \
  -exportOptionsPlist ios/App/ExportOptions.plist \
  -exportPath ios/build/export \
  -allowProvisioningUpdates

# د) ارفع إلى App Store Connect
xcrun altool --upload-app -f ios/build/export/App.ipa \
  -u "vipservicesyemen@gmail.com" -p "@keychain:AC_PASSWORD"
# أو عبر Transporter / Xcode Organizer
```

> ملف `ExportOptions.plist` جاهز: method `app-store-connect`، توقيع يدوي، اسم البروفايل `ViP Yemen App Store`.
> أنشئ البروفايل مرة واحدة في App Store Connect → Profiles وحمّله في Xcode.

---

## 5) متطلبات المراجعة | App Review Checklist

| البند | الحالة |
|---|---|
| أيقونة 1024×1024 بدون شفافية | ✅ `AppIcon-512@2x.png` |
| LaunchScreen storyboard | ✅ |
| سياسة خصوصية URL | ✅ `https://vi-p-yemen.vercel.app/privacy-policy` |
| Privacy Manifest (May 2024) | ✅ `PrivacyInfo.xcprivacy` |
| وصف أذونات Usage Descriptions | ✅ كاميرا/صور/ميكروفون/Face ID بالعربية والإنجليزية |
| ITSAppUsesNonExemptEncryption | ✅ `false` (HTTPS فقط → لا يحتاج تصدير فرنسي) |
| لغتان عربي/إنجليزي كاملتان | ✅ `CFBundleLocalizations: ar, en` |
| بيانات القائمة | ✅ `store-listing.json` |

---

## 6) حقول القائمة للمتجر | Store Listing

انسخ من `store-listing.json` (مترجمة عربي/إنجليزي):
- **الاسم**: ViP Yemen — فيب آيمن
- **العنوان الفرعي**: توظيف · عقار · تسويق · برمجيات
- **الأقسام**: Business / Productivity
- **الكلمات المفتاحية** (100 حرف): `وظائف,عقارات,تسويق,برمجة,اليمن,employment,real estate,marketing,software,Yemen`
- **رابط الدعم**: `https://vi-p-yemen.vercel.app` · **رابط الخصوصية**: `https://vi-p-yemen.vercel.app/privacy-policy`

---

## 7) اختبار قبل الرفع | TestFlight & Testing

1. بعد الرفع: App Store Connect → TestFlight → يظهر الإصدار بعد المعالجة (~10 دقائق).
2. أضف Internal Testers (حتى 100 مستخدم) أو External (تحتاج مراجعة سريعة لبيتا).
3. تأكد: التطبيق يفتح → المساعد الذكي يجيب → الأقسام الأربعة تسجّل بيانات → الوضع الليلي سليم.

---

## 8) التحديثات | Shipping Updates

- ارفع `MARKETING_VERSION` و`CURRENT_PROJECT_VERSION` في `project.pbxproj` لكل إصدار (تحدثها وسم جديد تلقائياً عبر سير العمل).
- إصدارات جديدة تُبنى تلقائياً عند دفع وسم `v*` — لا حاجة لأي خطوة يدوية سوى التوقيع والرفع.
