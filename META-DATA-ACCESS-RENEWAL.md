# 🔄 تجديد صلاحية الوصول إلى البيانات — Meta (المطلوب قبل ١٣ نوفمبر ٢٠٢٦)

> **هذا هو الشرط الذي يحكم صلاحيات تطبيقك — ومنه `pages_manage_posts` التي يحتاجها النشر التلقائي على صفحة فيسبوك.**

## بياناتك كما تظهر في لوحة Meta (من لقطة «الإجراءات المطلوبة»)

| البند | القيمة |
|---|---|
| التطبيق | **Vipyemen** |
| معرّف التطبيق (App ID) | `1142667409976840` *(معرّف عام — موجود في الكود كافتراضي، وليس سرّاً)* |
| النشاط التجاري | VIP للتوظيف والتسويق الإلكتروني والخدمات العامة |
| معرّف النشاط التجاري | `835348854001681` |
| الإجراء المطلوب | **تجديد صلاحية الوصول إلى البيانات** |
| معرّف الإجراء | `2118214879088750` |
| الاستحقاق | **13 نوفمبر 2026** — الحالة `Due` |
| حالة التطبيق | **نشط** ✅ |

## لماذا هذا هو سبب رفض النشر `(#200)`؟

الصلاحيات المتقدّمة (Advanced Access) — ومنها `pages_manage_posts` و`pages_read_engagement` —
تُمنح لفترة، وMeta تطلب **تجديداً دورياً** لها. وعندما يكون التجديد مستحقاً:
- قد يُنتج Graph API توكناً/توكن صفحة **بلا الصلاحية الفعلية**، فيرد النشر:
  `(#200) ... requires both pages_read_engagement and pages_manage_posts permission with page token`
  — وهذا بالحرف ما سجّله **اختبار النشر الفعلي** في منصتك (`/channels` ← `facebookRenewal.probeDetail`).
- ولا يُصلح ذلك أي توكن جديد، ولا أي App Secret — لأن السبب في التطبيق نفسه لا في التوكن.

## الخطوات (٥–١٠ دقائق، مرة كل سنة)

1. افتح <https://developers.facebook.com/apps/1142667409976840/> ← في الأعلى **الإجراءات المطلوبة**
   ← اضغط سطر **تجديد صلاحية الوصول إلى البيانات** (المعرّف `2118214879088750`).
2. في **إعدادات التطبيق ← أساسي** تأكد من العناوين التالية (كلها تعمل الآن في منصتك):
   - **Privacy Policy URL** → `https://vi-p-yemen.vercel.app/privacy-policy`
   - **Terms of Service URL** → `https://vi-p-yemen.vercel.app/terms`
   - **Data Deletion Instructions URL** → `https://vi-p-yemen.vercel.app/data-deletion` *(صفحة أنشئت لهذا الشرط بالتحديد)*
   - **App Domains** → `vi-p-yemen.vercel.app`
   - **Category** → Business and Pages / Employment
   - **App Icon** (1024×1024) و**Business Verification** إن ظهر مطلوباً.
3. أكمل **Data Use Checkup**: راجع كل صلاحية مستخدمة.
   ⚠️ **مهم:** لا تُزل `pages_manage_posts` ولا `pages_read_engagement` — هما مطلوبتا النشر
   التلقائي. ويمكنك إزالة أي صلاحية أخرى لا تستخدمها (`publish_to_groups` مثلاً — فالنشر
   على المجموعات موقوف من Meta أصلاً).
4. أرسل للمراجعة (**Submit for review**) وانتظر الموافقة (عادةً من ساعات إلى أيام).
5. بعد الموافقة:
   - أعد توليد توكن من Graph API Explorer مع `pages_manage_posts` + `pages_read_engagement`
     + `pages_show_list`، واختر **الصفحة** من قائمة «User or Page» ← انسخ توكن الصفحة.
   - الصقه في **متغيرات Convex** باسم **`FACEBOOK_PAGE_ACCESS_TOKEN`**، أو اربطه مباشرة من
     **لوحة التحكم ← الإعدادات ← ربط فيسبوك** (وضع «لديّ توكن جاهز»).
6. **لا حاجة لأي خطوة إضافية:** النظام يفحص آلياً كل ٥ دقائق، ويُجري **اختبار نشر فعلي** (منشور
   مخفي يُحذف فوراً)، وبمجرد أن تنجح الصلاحية **تُرفع قناة فيسبوك من الإيقاف تلقائياً**.
   للتأكد فوراً: `/channels` ← `facebookRenewal.canPost = true` و`probeDetail` خالية من `#200`.

## تحقّق سريع من أن التجديد مكتمل

```bash
curl -sS https://notable-shepherd-367.convex.site/channels
# المطلوب بعد نجاح التجديد وربط التوكن:
#   facebookRenewal.canPost      == true
#   facebookRenewal.probeDetail  == "✅ تأكدت صلاحية النشر باختبار فعلي..."
#   facebook_page                == ok
```

---

## مراجع داخل المستودع
- `PLATFORM-GUIDE.md` §7.2 — مسارات التوكن الدائم + قائمة التحقق الحيّة.
- `ENV-VARIABLES.md` — متغيرات فيسبوك وtelجرام وأين تُدار فعلياً (Convex فقط).
- `SECRETS-SETUP.md` — تشغيل القنوات وتبديل توكن تلجرام المسرّب.
- `PRIVACY-POLICY.md` · `PRIVACY-POLICY-APP.md` — نص السياسة المعروض على الرابط العام.

© 2026 ViP Yemen — جميع الحقوق محفوظة.
