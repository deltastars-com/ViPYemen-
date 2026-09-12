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

## 3️⃣ Vercel — Environment Variables

أضِف نفس المتغيرات `VITE_*` من الخزنة في Project → Settings → Environment Variables
(بيئة Production). تكامل Supabase ← Vercel موجود في حسابك ويضيف مفاتيحه تلقائياً.

## 4️⃣ Google Play Console

- مفتاح الرفع: `android/keystore/vipyemen-release.p12` — كلمة المرور من الخزنة.
- أضف بصمة SHA-1 وSHA-256 من الخزنة في Firebase وPlay App Signing.

## 5️⃣ Firebase (vipyemen-c715b)

- سجّل تطبيق Android بالحزمة `com.vip.yemen` وأضف بصمتي SHA-1 وSHA-256 من الخزنة.
- حمّل `google-services.json` وضعه في `android/app/` (متجاهل في Git).
- App ID وبريد حساب الخدمة وKey Pair محفوظة في الخزنة → تصنيف Firebase.

## 6️⃣ Codemagic (iOS)

المجموعتان في Codemagic → Teams → Environment variables:
- `app_store_credentials`: متغيرات Apple من الخزنة → تصنيف Apple/iOS
- `vite_env`: متغيرات `VITE_*` من الخزنة

خطوات الربط الكاملة: قسم Codemagic في `PUBLISHING-GUIDE.md`.

## 7️⃣ استيراد المستندات إلى الخزنة

الملف `vault-import.local.json` في جذر المشروع (متجاهل في Git ولا يُرفع أبداً)
يحتوي كل المستندات المعيارية بقيمها. لاستيرادها دفعة واحدة:

```bash
sh scripts/vault-import.sh
```

يتطلب تسجيل دخول Convex مرة واحدة (`bunx convex login`) أو وجود
`CONVEX_DEPLOY_KEY` في البيئة. بعد الاستيراد احتفظ بالملف محلياً أو احذفه —
الخزنة هي النسخة الدائمة.

---

## 8️⃣ الحسابات الرسمية للتوثيق والملكية

| العنصر | القيمة |
|---|---|
| البريد الرسمي | `vipservicesyemen@gmail.com` |
| واتساب الأعمال | `+967 711 780 999` |
| المطور / المالك | المهندس علي درهم الدحان — Delta Stars |
| iOS Bundle ID | `com.vip.yemen` |
| صفحة الخصوصية | `https://vi-p-yemen.vercel.app/privacy-policy` |

© 2026 ViP Yemen — جميع الحقوق محفوظة.
