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

## 3️⃣ مفاتيح القنوات والبريد — أين تُضبط؟ (تحديث v6.7.40)

**القاعدة الجديدة**: كل مفاتيح النشر تُضبط **من بطاقات لوحة التحكم** (`/admin` ← الإعدادات)
وتُحفظ في جدول `settings` — بلا إعادة نشر ولا متغيرات بيئة. متغيرات بيئة GitHub
تبقى خياراً بديلاً احتياطياً فقط.

### قناة فيسبوك (موقوفة حالياً بانتظار توكن جديد)
| المفتاح / المتغير | أين يُضبط | ملاحظة |
|---|---|---|
| توكن الصفحة + `App ID` + `App Secret` | الإعدادات ← «ربط فيسبوك بتوكن طويل الأجل» (المفضّل) | يُبدَّل آلياً لتوكن لا ينتهي ويجدّد نفسه |
| `FACEBOOK_ACCESS_TOKEN` | GitHub Secrets — ⚠️ القيمة الحالية **قديم ومنتهي** | فقط إن اعتمدت مسار متغيرات البيئة |
| `FACEBOOK_PAGE_ID` = `102672588647591` | GitHub Secrets | ثابت |
| `FACEBOOK_GROUP_ID` = `346010664332427` | GitHub Secrets | النشر على المجموعات موقوف من Meta أصلاً |

> ⚠️ **خطوة إلزامية لتشغيل فيسبوك**: في Graph API Explorer اكتب `pages_manage_posts`
> في صندوق البحث «أدخل هنا» وأضِفها إلى الصلاحيات الحالية
> (`pages_show_list, ads_management, business_management, pages_read_engagement`)،
> ثم **أعد توليد التوكن**، وبعدها اربطه من بطاقة اللوحة (وضع التبديل مع App Secret).
> ما دام التوكن قديماً، القناتان `facebook_page` و`facebook_group` **متوقفتان آلياً**
> من «مفاتيح القنوات» فلا تحدث محاولات نشر فاشلة — وتعودان وحدهما عند ربط توكن صالح.

### قناة واتساب
| المفتاح (settings) | أين يُضبط |
|---|---|
| `whatsappAccessToken` · `whatsappPhoneNumberId` · `whatsappBroadcastTo` · `whatsappTemplateName/Lang` | الإعدادات ← «تشغيل قناة واتساب» |
| بديل بيئة: `WHATSAPP_ACCESS_TOKEN` · `WHATSAPP_PHONE_NUMBER_ID` · `WHATSAPP_BROADCAST_TO` | GitHub Secrets / Convex env (اختياري) |

### البريد الإلكتروني (جديد — محرك الحملات)
| المفتاح (settings) | أين يُضبط | الوظيفة |
|---|---|---|
| `emailProviderKey` | الإعدادات ← «إعداد البريد الإلكتروني» | مفتاح **Resend API** — تُرسَل به كل رسائل النشرة والحملات |
| `emailFromName` | نفس البطاقة | اسم المُرسل الظاهر (افتراضياً ViP Yemen) |
| `emailFromAddress` | نفس البطاقة | بريد المُرسل (From) |
| `emailReplyTo` | نفس البطاقة | بريد الرد (اختياري) |
| بديل بيئة: `RESEND_API_KEY` | GitHub Secrets / Convex env | يُستخدم فقط إن غاب `emailProviderKey` |

> للتسجيل الحقيقي على Resend: أنشئ حساباً مجانياً على resend.com، أضِف نطاقك
> (أو استخدم `onboarding@resend.dev` للاختبار)، ثم انسخ مفتاح `re_…` وألصقه في البطاقة.

### تلجرام (تعمل)
| المتغير | أين يُضبط |
|---|---|
| `TELEGRAM_BOT_TOKEN` · `TELEGRAM_CHAT_ID` | GitHub Secrets أو Convex env |

### مفاتيح إيقاف/تشغيل القنوات
- مفتاح settings واحد: `channelPaused` — يُكتب تلقائياً من بطاقة **«مفاتيح القنوات»**
  في الإعدادات، مع سجل كامل لكل تبديل في جدول `channelPauseLog`.

---

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

## 2️⃣ب ربط فيسبوك من لوحة التحكم (توكن طويل الأجل — بدون متغيرات)

صار ممكنًا إتمام ربط فيسبوك كاملاً من الواجهة: **لوحة التحكم ← الإعدادات ←
«ربط فيسبوك بتوكن طويل الأجل»**:

1. من `developers.facebook.com` ← تطبيقك ← Settings ← Basic: انسخ `App ID` و `App Secret`.
2. من `Tools → Graph API Explorer`: اختر تطبيقك، وأضف الصلاحيات
   `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`،
   ثم `Generate Access Token` ووافق على الصفحة، وانسخ التوكن.
3. الصقه في البطاقة مع `App ID` و `App Secret` واضغط «ابدأ التبديل والربط».

النتيجة: توكن مستخدم طويل الأجل (٦٠ يوماً) ← توكن صفحة **لا ينتهي** ← حفظ
تلقائي + **تجديد ذاتي** قبل الانتهاء + فحص فوري للقنوات. (اختياري: يمكن بدلاً
من ذلك وضع `FACEBOOK_ACCESS_TOKEN` في بيئة Convex كما هو موضح أدناه.)

---

## 3️⃣ Convex Dashboard — متغيرات قنوات النشر

أضِفها في: **Convex Dashboard → Project → Settings → Environment Variables**

| المتغير | القيمة |
|---|---|
| `TELEGRAM_BOT_TOKEN` | `8876814738:AAFEpkzzC0g__-xGz9JE_sqvq0JMM1kHVWM` |
| `TELEGRAM_CHAT_ID` | `@vipyemen77` |
| `FACEBOOK_ACCESS_TOKEN` | *(اختياري — الأفضل: ربط من لوحة التحكم ← الإعدادات ← «ربط فيسبوك»)* |
| `FACEBOOK_PAGE_ID` | `102672588647591` *(اختياري)* |
| `FACEBOOK_GROUP_ID` | `346010664332427` *(اختياري)* |
| `WHATSAPP_ACCESS_TOKEN` | *(رمز WhatsApp Cloud API — اختياري: يُضبط عادةً من لوحة التحكم)* |
| `WHATSAPP_PHONE_NUMBER_ID` | *(معرّف رقم الأعمال — اختياري: يُضبط من لوحة التحكم)* |
| `WHATSAPP_BROADCAST_TO` | *(أرقام المستلمين مفصولة بفواصل — اختياري)* |

> **الأفضل اليوم:** لا تحتاج هذه المتغيرات — افتح **لوحة التحكم ← الإعدادات** واضبط:
> «تشغيل قناة واتساب» (توكن + معرّف الرقم + المستلمون + القالب) و«ربط فيسبوك» (تبديل توكن ← توكن صفحة دائم).
> يتحقق النظام من البيانات فعلياً ويحفظها في قاعدة الإعدادات ويشغّل القناة فوراً — بلا إعادة نشر وبلا لمس أي متغير بيئة.

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

## 1️⃣2️⃣ السيرفرات المجانية الإضافية (اختيارية — لا توقف أي شيء عند غيابها)

المنصة تعمل بالفعل على ثلاث مرايا مستقلة (Vercel · Render · GitHub Pages)
بالإضافة إلى الباك اند، ونبضات إبقاء التشغيل كل 10 دقائق. لزيادة التوزيع
المجاني يمكنك (كلها اختيارية ويُتخطى ما لم تُضبط مفاتيحه بسلاسة):

### أ) Netlify (مرآة مجانية إضافية)

أسرار المستودع: `NETLIFY_AUTH_TOKEN` و `NETLIFY_SITE_ID`

من Netlify: `User settings → Applications → Personal access tokens` لإنشاء
التوكن، ومن إعدادات الموقع (Site configuration → Site ID) تأخذ رقم الموقع.

### ب) Cloudflare Pages (مرآة مجانية إضافية)

أسرار المستودع: `CLOUDFLARE_API_TOKEN` و `CLOUDFLARE_ACCOUNT_ID`

أنشئ التوكن من `My Profile → API Tokens` بصلاحية `Cloudflare Pages: Edit`
و رقم الحساب من صفحة الحساب الرئيسية.

### ج) تحديث التبعيات مع التحقق الكامل (اختياري)

سرّ `CONVEX_DEPLOY_KEY` يجعل سير `Auto dependency refresh` يتحقق من البناء
كاملًا قبل فتح طلب التحديث. بدونه لا يزال السير يعمل مع فحص الأنواع والبناء.

### د) مرايا إضافية بلا تعديل كود

متغير المستودع `EXTRA_MIRROR_URLS` بصيغة
`اسم|https://example.com,اسم2|https://example2.com` — تُضاف تلقائياً إلى
شريط التنبيهات داخل التطبيق وسجل `/mirrors` وسير النشر والمراقبة.

> بعد إضافة أي مرآة، سجّل رابطها في خدمة مراقبة مجانية (UptimeRobot /
> cron-job.org) على النقطة `https://notable-shepherd-367.convex.site/health`
> لتصلك تنبيهات فورية إضافة إلى التذكرة التلقائية.

التفاصيل الكاملة لكل سيرفر: انظر `FREE-SERVERS.md`.

---

© 2026 ViP Yemen — جميع الحقوق محفوظة.
