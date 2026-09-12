# دليل النشر الكامل - ViP Yemen
# Complete Publishing Guide - ViP Yemen

**آخر تحديث:** أغسطس 2026

---

## 📋 نظرة عامة

هذا الدليل يحتوي على جميع المعلومات والإعدادات المطلوبة لنشر تطبيق ViP Yemen على متاجر التطبيقات (Google Play Store و Apple App Store).

---

## 🔐 معلومات الحزمة الرسمية

| العنصر | القيمة |
|--------|--------|
| **اسم الحزمة (Android)** | `com.vip.yemen` |
| **Bundle Identifier (iOS)** | `com.vip.yemen` |
| **اسم التطبيق** | ViP Yemen |
| **الإصدار الحالي** | 6.7.2 |
| **رمز الإصدار (Android)** | 6070002 |
| **الحد الأدنى** | Android 7.0 (API 24) / iOS 14.0 |

---

## 🔑 بيانات الدخول والتوثيق

### 1. حساب Google Play Console

| العنصر | القيمة |
|--------|--------|
| **البريد الإلكتروني** | ViPservicesYemen@gmail.com |
| **رابط Console** | https://play.google.com/console |
| **اسم المطور** | ViP Services Yemen |

### 2. حساب Apple Developer

| العنصر | القيمة |
|--------|--------|
| **البريد الإلكتروني** | ViPservicesYemen@gmail.com |
| **رابط Developer** | https://developer.apple.com |
| **Team ID** | يُضاف بعد التسجيل |

### 3. ملف التوقيع (Android Keystore)

| العنصر | القيمة |
|--------|--------|
| **ملف الـ Keystore** | `vipyemen-release.p12` (PKCS12) |
| **كلمة مرور الـ Keystore** | محفوظة في «الخزنة» داخل لوحة التحكم — وليست في المستودع |
| **الـ Key Alias** | `vipyemen` |
| **بصمة SHA-256** | `FD:AE:0D:25:93:F7:96:46:DD:07:7C:23:52:D1:68:2C:BE:9F:CC:3D:27:17:2A:6D:8E:F9:15:3E:A7:65:F4:8B` |
| **بصمة SHA-1** | `C6:F7:D4:A7:09:77:1E:DC:9B:B1:90:A6:CB:6E:5B:29:55:BD:11:3F` |
| **صالح حتى** | 23 يناير 2054 |

> ملف التوقيع الحقيقي: `android/keystore/vipyemen-release.p12` — متطابق مع كل الإصدارات السابقة،
> لذا تُثبَّت النسخ الجديدة فوق القديمة مباشرة دون حذف. كلمات المرور ومفاتيح التوقيع
> وأسرار Firebase وVercel تُدار من قسم «الخزنة» في لوحة التحكم فقط، ولا تُكتب في المستودع.

### 4. بيانات واتساب الأعمال

| العنصر | القيمة |
|--------|--------|
| **رقم واتساب** | 00967711780999 |
| **رقم الهاتف** | 773597404 |
| **البريد الإلكتروني** | ViPservicesYemen@gmail.com |

---

## 📱 إعداد Android للنشر

### 1. إنشاء ملف التوقيع

```bash
cd capacitor-app
sh generate-keystore.sh
```

### 2. بناء AAB للنشر

```bash
cd android
./gradlew bundleRelease
```

### 3. التحقق من التوقيع

```bash
$ANDROID_HOME/build-tools/*/apksigner verify --verbose \
  app/build/outputs/bundle/release/app-release.aab
```

### 4. رفع إلى Google Play Console

1. سجّل الدخول إلى [Google Play Console](https://play.google.com/console)
2. أنشئ تطبيقاً جديداً بحزمة `com.vip.yemen`
3. اذهب إلى "إصدارات التطبيقات" → "إنشاء إصدار جديد"
4. ارفع ملف `app-release.aab`
5. أكمل معلومات الإصدار
6. انشر الإصدار

---

## 🍎 إعداد iOS للنشر

### 1. إعداد Capacitor iOS

```bash
cd capacitor-app
npx cap sync ios
```

### 2. بناء التطبيق

```bash
cd ios/App
xcodebuild -workspace App.xcworkspace \
  -scheme App \
  -configuration Release \
  -archivePath build/App.xcarchive archive
```

### 3. تصدير للـ IPA

```bash
xcodebuild -exportArchive \
  -archivePath build/App.xcarchive \
  -exportOptionsPlist ExportOptions.plist \
  -exportPath build/output
```

### 4. رفع إلى App Store Connect

1. سجّل الدخول إلى [App Store Connect](https://appstoreconnect.apple.com)
2. أنشئ تطبيقاً جديداً بـ Bundle ID: `com.vip.yemen`
3. استخدم Xcode أو Transporter لرفع الـ IPA
4. أكمل معلومات المتجر
5. أرسل للمراجعة

---

## 🖼️ ملفات المتجر المطلوبة

### Google Play Store

| الملف | الحجم | الوصف |
|-------|-------|-------|
| **أيقونة التطبيق** | 512x512 PNG | أيقونة عالية الدقة |
| **Feature Graphic** | 1024x500 PNG | صورة مميزة |
| **لقطات شاشة** | 16:9 ratio | 2-8 لقطات |
| **سياسة الخصوصية** | URL | رابط صفحة الخصوصية |

### Apple App Store

| الملف | الحجم | الوصف |
|-------|-------|-------|
| **أيقونة التطبيق** | 1024x1024 PNG | أيقونة بدون زوايا مدورة |
| **لقطات شاشة iPhone** | 1290x2796 | 6.7" iPhone |
| **لقطات شاشة iPad** | 2048x2732 | iPad Pro 12.9" |
| **سياسة الخصوصية** | URL | رابط صفحة الخصوصية |
| **App Privacy Details** | في App Store Connect | تفاصيل الخصوصية |

---

## 📝 وصف التطبيق (للمتاجر)

### الإصدار المختصر (80 حرف):
```
منصة يمنية شاملة للتوظيف والتسويق العقاري والبرمجيات
```

### الإصدار الكامل:
```
🚀 ViP Yemen - منصتك الشاملة للفرص والخدمات

ViP Yemen هي منصة يمنية شاملة متعددة الخدمات تهدف إلى ربط أصحاب الأعمال والخدمات بالباحثين عن الفرص في اليمن.

✨ المميزات الرئيسية:

📋 قسم التوظيف
- سجّل بياناتك كباحث عن عمل
- اعرض وظائفك لآلاف الباحثين
- ارفع السيرة الذاتية والشهادات
- تواصل مباشر مع أصحاب العمل

🏠 قسم التسويق العقاري
- اعرض عقاراتك للبيع أو الإيجار
- ابحث عن العقارات المناسبة
- صور تفصيلية ومواصفات دقيقة
- ربط مباشر مع واتساب الأعمال

🛒 قسم التسويق الإلكتروني
- سوق إلكتروني شامل للمنتجات
- عرض وطلب المنتجات والسلع
- التحقق من رقم الهاتف الحقيقي
- إشارة "تم البيع" للمنتجات المباعة

💻 قسم البرمجيات
- تطوير تطبيقات الهاتف
- تصميم مواقع الويب
- أنظمة إدارة محتوى
- حلول تقنية متكاملة

🎯 قسم العروض
- عروض ترويجية حصرية
- خصومات ومميزات خاصة
- تحديثات لحظية

🔐 أمان وخصوصية:
- جميع البيانات مشفرة ومؤمنة
- مراجعة إدارية قبل النشر
- حماية كاملة للخصوصية

📱 تحديث تلقائي:
- تحديث التطبيق بدون حذف النسخة القديمة
- إصدارات منتظمة مع تحسينات مستمرة

🌐 ثنائي اللغة:
- دعم كامل للعربية والإنجليزية
- واجهة مستخدم متوافقة مع RTL

📞 تواصل معنا:
- البريد: ViPservicesYemen@gmail.com
- واتساب: 00967711780999
- الهاتف: 773597404

© 2026 ViP Yemen. جميع الحقوق محفوظة.
المهندس علي درهم الدحان
```

---

## 🏷️ كلمات المفتاح للـ ASO

### Android (Google Play):
```
yemen, jobs, employment, real estate, marketing, software, apps, ViP, business, freelance, وظائف, عقارات, تسويق, برمجيات, تطبيقات, فيب, أعمال, مستقل
```

### iOS (App Store):
```
yemen,jobs,employment,real,estate,marketing,software,ViP,business,freelance,وظائف,عقارات,تسويق,برمجيات,تطبيقات,فيب,أعمال,مستقل
```

---

## 🔄 سير العمل للإصدار الجديد

### 1. تحديث الإصدار

```bash
# تحديث إصدار Android
node scripts/set-android-version.mjs 1.2.0

# تحديث إصدار capacitor-app
cd capacitor-app
npm version 1.2.0 --no-git-tag-version
```

### 2. الالتزام بالتغييرات

```bash
git add .
git commit -m "chore: update version to 1.2.0"
```

### 3. إنشاء وسم (Tag)

```bash
git tag v1.2.0
```

### 4. الرفع التلقائي

```bash
git push origin main
git push origin v1.2.0
```

### 5. البناء التلقائي

سيقوم GitHub Actions تلقائياً بـ:
1. بناء تطبيق الويب
2. مزامنة Capacitor Android
3. بناء APK و AAB
4. إنشاء إصدار GitHub مع الملفات

---

## 📊 هيكل أرقام الإصدار

```
versionCode = Major × 1,000,000 + Minor × 1,000 + Patch

أمثلة:
1.0.0 → 1000000
1.0.1 → 1000001
1.1.0 → 1010000
1.1.1 → 1010001
1.2.0 → 1020000
2.0.0 → 2000000
```

---

## 🛡️ حماية التوقيع

### ⚠️ تحذيرات مهمة:

1. **لا ترفع ملف الـ Keystore إلى GitHub**
2. **لا تشارك كلمة المرور مع أي شخص**
3. **احفظ نسخة احتياطية في مكان آمن**
4. **لا تحذف ملف الـ Keystore أبداً**

### حماية الملفات:

```bash
# تأكد من وجود هذه الملفات في .gitignore:
capacitor-app/keystore.properties
capacitor-app/*.jks
capacitor-app/*.keystore
```

---

## 📞 معلومات الاتصال

### للمستخدمين:
- **البريد:** ViPservicesYemen@gmail.com
- **واتساب:** 00967711780999
- **الهاتف:** 773597404

### للمطورين:
- **GitHub:** https://github.com/deltastars/vip-yemen
- **Issues:** https://github.com/deltastars/vip-yemen/issues

---

## 📝 ملاحظات نهائية

1. **تثبيت التطبيق**: المستخدم لا يحتاج لحذف النسخة القديمة عند التحديث
2. **توقيع واحد**: نفس التوقيع لكل الإصدارات لضمان التوافق
3. **النشر التلقائي**: GitHub Actions يبني ويرفع التطبيق تلقائياً
4. **الخصوصية**: جميع البيانات مشفرة ومؤمنة

---

**جميع الحقوق محفوظة © 2026 ViP Yemen**
**المهندس علي درهم الدحان**
