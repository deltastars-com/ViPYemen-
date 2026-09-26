# ViP Yemen — الخزنة: دليل إدارة الوثائق والأسرار
# Vault Guide: Signing, Secrets & Integrations

**الحزمة / Package:** `com.vip.yemen`
**آخر تحديث:** سبتمبر 2026

> 🔐 **كل القيم الحساسة (كلمات المرور، ملف التوقيع Base64، مفاتيح Firebase،
> مفتاح Play Key Pair) تُدار الآن من قسم «الخزنة — الوثائق والأسرار» داخل
> لوحة التحكم `/admin` فقط — بعد تسجيل الدخول ببريد الإدارة.**
> لا تُكتب أي قيمة سرّية في المستودع أو في أي ملف داخل هذا المستودع.

---

## 1️⃣ الخزنة داخل لوحة التحكم (المصدر الرسمي)

افتح: **لوحة التحكم → الخزنة — الوثائق والأسرار**

- كل مستند يظهر باسمه ووصفه وتصنيفه، والقيم السرّية **مخفية** حتى الضغط على «إظهار».
- زر **نسخ** يضع القيمة مباشرة في الحافظة — جاهزة للّصق في GitHub أو Vercel أو Play Console.
- التصنيفات: التوقيع والتوثيق · Firebase · Google Play · Vercel · Supabase · Apple/iOS · عام.
- الإضافة والتعديل والحذف من نفس الشاشة، وكل عمليات القراءة محمية بجلسة الإدارة.

### المستندات المعيارية المحفوظة في الخزنة

**التصنيف: التوقيع والتوثيق (signing)**
- `ANDROID_KEYSTORE_B64` — ملف `vipyemen-release.p12` كاملاً بصيغة Base64
- `ANDROID_KEYSTORE_PASSWORD` / `ANDROID_KEY_PASSWORD`
- `ANDROID_KEY_ALIAS` — `vipyemen`
- `EXPECTED_SIGNATURE_SHA1` — بصمة SHA-1 لشهادة التوقيع (تتحقق منها CI مع كل APK)
- بصمة SHA-256 لشهادة التوقيع (مرجع لـ Play/Firebase)

**التصنيف: Firebase**
- App ID لتطبيق Android (`1:…:android:…`)
- Key Pair الخاص بالرفع والتحديث
- بريد حساب الخدمة `firebase-adminsdk-fbsvc@…`

**التصنيف: Google Play / Vercel / Supabase**
- مفاتيح ومتغيرات البيئة: `VITE_CONVEX_URL`، `VITE_SUPABASE_URL`، `VITE_SUPABASE_ANON_KEY`، `VITE_GEMINI_KEY`، رمز الوصول لـ Supabase

**التصنيف: Apple / iOS**
- متغيرات Codemagic: `APP_STORE_CONNECT_PRIVATE_KEY` / `_KEY_ID` / `_ISSUER_ID`، `CERTIFICATE_PRIVATE_KEY`، `CERTIFICATE_PASSWORD`، `PROVISIONING_PROFILE_DATA`

---

## 2️⃣ GitHub — Secrets (انسخ القيم من الخزنة)

أضِفها في: **المستودع → Settings → Secrets and variables → Actions**

| Secret | المصدر |
|---|---|
| `ANDROID_KEYSTORE_B64` | الخزنة → التوقيع |
| `ANDROID_KEYSTORE_PASSWORD` | الخزنة → التوقيع |
| `ANDROID_KEY_ALIAS` | الخزنة → التوقيع |
| `ANDROID_KEY_PASSWORD` | الخزنة → التوقيع |
| `EXPECTED_SIGNATURE_SHA1` | الخزنة → التوقيع |
| `VITE_CONVEX_URL` *(Variable)* | الخزنة → Supabase/Vercel |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | الخزنة |
| `VITE_GEMINI_KEY` | الخزنة |
| `CONVEX_DEPLOY_KEY` *(اختياري)* | Convex Dashboard → Deploy Keys |

> سير عمل الإصدار يوقّع APK/AAB بمفتاح المستودع المدمج عند غياب هذه الأسرار،
> ويستخدمها تلقائياً فور إضافتها — مع تحقق إجباري من بصمة التوقيع في الحالتين.

## 3️⃣ Convex Dashboard — متغيرات قنوات النشر

أضِفها في: **Convex Dashboard → Project → Settings → Environment Variables**

| المتغير | القيمة |
|---|---|
| `TELEGRAM_BOT_TOKEN` | `8876814738:AAFEpkzzC0g__-xGz9JE_sqvq0JMM1kHVWM` |
| `TELEGRAM_CHAT_ID` | `@vipyemen77` |
| `FACEBOOK_ACCESS_TOKEN` | *(رمز الصفحة الدائم — من developers.facebook.com)* |
| `FACEBOOK_PAGE_ID` | `vipyemen1` |
| `FACEBOOK_GROUP_ID` | `346010664332427` |
| `WHATSAPP_ACCESS_TOKEN` | *(رمز WhatsApp Cloud API)* |
| `WHATSAPP_PHONE_NUMBER_ID` | *(رقم هاتف الأعمال)* |
| `WHATSAPP_BROADCAST_TO` | *(أرقامフザل مفصولة بفواصل)* |

> **قنوات النشر التلقائي:** عند نشر أي إعلان أو عرض من لوحة التحكم،
> ينشر تلقائياً إلى: تليجرام (@vipyemen77) · فيسبوك (صفحة + جروب) · واتساب.

## 4️⃣ Vercel — Environment Variables

أضِف نفس المتغيرات `VITE_*` من الخزنة في Project → Settings → Environment Variables
(بيئة Production). تكامل Supabase ← Vercel موجود في حسابك ويضيف مفاتيحه تلقائياً.

## 5️⃣ Google Play Console

- مفتاح الرفع: `android/keystore/vipyemen-release.p12` — كلمة المرور من الخزنة.
- أضف بصمة SHA-1 وSHA-256 من الخزنة في Firebase وPlay App Signing.

## 6️⃣ Firebase (vipyemen-c715b)

- سجّل تطبيق Android بالحزمة `com.vip.yemen` وأضف بصمتي SHA-1 وSHA-256 من الخزنة.
- حمّل `google-services.json` وضعه في `android/app/` (متجاهل في Git).
- App ID وبريد حساب الخدمة وKey Pair محفوظة في الخزنة → تصنيف Firebase.

## 7️⃣ Codemagic (iOS)

المجموعتان في Codemagic → Teams → Environment variables:
- `app_store_credentials`: متغيرات Apple من الخزنة → تصنيف Apple/iOS
- `vite_env`: متغيرات `VITE_*` من الخزنة

خطوات الربط الكاملة: قسم Codemagic في `PUBLISHING-GUIDE.md`.

## 8️⃣ استيراد المستندات إلى الخزنة

الملف `vault-import.local.json` في جذر المشروع (متجاهل في Git ولا يُرفع أبداً)
يحتوي كل المستندات المعيارية بقيمها. لاستيرادها دفعة واحدة:

```bash
sh scripts/vault-import.sh
```

يتطلب تسجيل دخول Convex مرة واحدة (`bunx convex login`) أو وجود
`CONVEX_DEPLOY_KEY` في البيئة. بعد الاستيراد احتفظ بالملف محلياً أو احذفه —
الخزنة هي النسخة الدائمة.

---

## 9️⃣ الحسابات الرسمية للتوثيق والملكية

| العنصر | القيمة |
|---|---|
| البريد الرسمي | `vipservicesyemen@gmail.com` |
| واتساب الأعمال | `+967 711 780 999` |
| المطور / المالك | المهندس علي درهم الدحان — Delta Stars |
| iOS Bundle ID | `com.vip.yemen` |
| صفحة الخصوصية | `https://vi-p-yemen.vercel.app/privacy-policy` |

---

## 🔟 توقيع iOS التلقائي للنشر في App Store (اختياري)

الافتراضي: كل إصدار يُنتج **IPA غير موقّع** (يُعاد توقيعه بحسابك خلال ثوانٍ —
انظر `IOS-APPSTORE-GUIDE.md`). لتفعيل **بناء IPA موقّع جاهز للرفع مباشرة**
إلى App Store Connect، أضف الأسرار التالية في
`Settings → Secrets and variables → Actions → Secrets`:

| السر | القيمة |
|---|---|
| `APPLE_CERTIFICATE_B64` | شهادة التوزيع `.p12` بترميز base64: `base64 -i cert.p12 \| pbcopy` |
| `APPLE_CERTIFICATE_PASSWORD` | كلمة مرور ملف الـ p12 |
| `APPLE_PROVISIONING_PROFILE_B64` | بروفايل التوزيع `.mobileprovision` بترميز base64 |
| `APPLE_TEAM_ID` | معرّف فريق Apple (10 خانات) |

ثم أنشئ **Variable** (وليس Secret) بنفس الصفحة تحت تبويب
`Variables`:

| المتغير | القيمة |
|---|---|
| `APPLE_SIGNING_ENABLED` | `true` |

النتيجة: وظيفة إضافية `Build SIGNED iOS (App Store Connect)` تعمل تلقائياً على
كل وسم إصدار وتضيف ملفاً باسم
`vip-yemen-ios-signed-<الإصدار>.ipa` إلى صفحة الإصدارات، **دون أي تأثير** على
بناء الـ IPA غير الموقّع (يبقى موجوداً دائماً).

> ℹ️ ما دام المتغير غير مضبوط (أو قيمته ليست `true`) لا يتغير شيء إطلاقاً — أي
> أن غياب شهادات Apple لا يمكن أن يُعطّل أي إصدار.

---

## 1️⃣1️⃣ مراقبة الاستمرارية التلقائية (Uptime watchdog)

سير عمل مجاني `Uptime watchdog` يفحص **كل** قنوات التشغيل العامّة كل 6 ساعات:

- Vercel · Render · GitHub Pages · خادم Convex

- عند أي تعطّل: **يفتح Issue واحداً متتبعاً** فيه القناة المتعثرة وزمن الفحص
  ورابط التشغيل — ويُحدّثه في كل فحص تالٍ.
- عند عودة كل القنوات: يعلّق بالتعافي ويغلق الـ Issue تلقائياً.
- لا يحتاج أي إعداد أو مفاتيح — يعمل فوراً. والتطبيقات الأصلية
  (APK/AAB/iOS) لا تتأثر بأي تعطّل في هذه القنوات أصلاً لأن واجهتها مدمجة
  داخل الحزمة.

يمكن تشغيله يدوياً في أي وقت من
`Actions → Uptime watchdog → Run workflow`.

---

© 2026 ViP Yemen — جميع الحقوق محفوظة.
