# 🏛️ ملكية المنصة والتطبيقات — ViP Yemen
## Site & Applications Ownership Record

> وثيقة إثبات ملكية رسمية للمنصة الرقمية **ViP Yemen** وتطبيقاتها الأصلية
> (Android APK/AAB و iOS)، وأصولها البصرية، وبرمجياتها، ومحتواها.
> **جهة الإصدار:** مالك المنصة. **الحالة:** سارية من تاريخ آخر تحديث أدناه.

---

## 1) المُعرّف القانوني والمالك (Ownership & Legal Identity)

| العنصر | البيان |
|---|---|
| الاسم التجاري / العلامة | **ViP Yemen** (ويُكتب أيضاً: VIP Yemen · vipservicesyemen) |
| المالك والمطوّر | **المهندس علي درهم الدحان** — Delta Stars |
| الصفة | مالك المنصة، مالك حقوق الملكية الفكرية، المسؤول عن النشر |
| البريد الرسمي | vipservicesyemen@gmail.com |
| الواتساب/الهاتف الرسمي | +967 711 780 999 |
| بلد التسجيل | الجمهورية اليمنية — صنعاء |
| معرّف تطبيق Android | `com.vip.yemen` |
| معرّف تطبيق iOS (Bundle ID) | `com.vip.yemen` |
| سنة بدء النشاط | 2026 |

**إقرار:** جميع الحقوق المادية والمعنوية في المنصة وتطبيقاتها — الاسم،
الشعار (الختم الذهبي)، الهوية البصرية، النصوص، قاعدة البيانات، الشيفرة
المصدرية، التصميمات، وحزم التوزيع — مملوكة حصراً للمالك المذكور أعلاه،
ما لم يُذكر خلاف ذلك صراحةً في القسم 6 (مكونات الطرف الثالث).

---

## 2) النطاقات والروابط الرسمية (Official Endpoints)

هذه هي الواجهات الرسمية الوحيدة المعتمدة للمنصة. أي موقع آخر ينتحل الاسم
ليس تابعاً للمالك ولا يُمثّله.

| النوع | العنوان |
|---|---|
| الموقع الأساسي (Vercel) | https://vi-p-yemen.vercel.app |
| مرآة Render | https://vipyemen.onrender.com |
| مرآة GitHub Pages | https://deltastars-com.github.io/ViPYemen-/ |
| الواجهة الخلفية (Convex) | https://notable-shepherd-367.convex.cloud |
| واجهة HTTP العامة | https://notable-shepherd-367.convex.site |
| المستودع الرسمي | https://github.com/deltastars-com/ViPYemen- |
| الإصدارات الرسمية | https://github.com/deltastars-com/ViPYemen-/releases |
| بوت تيليجرام | @vipyemen_bot · القناة @vipyemen77 |

### الروابط الاجتماعية الرسمية
| المنصة | الرابط |
|---|---|
| فيسبوك (الصفحة) | https://www.facebook.com/vipyemen1 |
| فيسبوك (المجموعة) | https://www.facebook.com/groups/346010664332427 |
| إنستغرام | https://www.instagram.com/vipyemen1 |
| تيك توك | https://www.tiktok.com/@vip_yemen7 |
| X (تويتر) | https://x.com/Vipyemen7 |
| لينكدإن | https://www.linkedin.com/in/ali-aldahan-57b5a2231 |
| يوتيوب | https://www.youtube.com/@vipyemen1 |
| واتساب (المجتمع) | https://chat.whatsapp.com/FWq6W6zHbDF8kgWlGHSMqb |
| Beacons | https://beacons.ai/vipyemen |
| AllMyLinks | https://allmylinks.com/vipyemen |
| Linkfly | https://linkfly.to/Vipyemen |
| Taplink | https://taplink.cc/vipservicesyemen |

> المصدر الوحيد للحقيقة لهذه الروابط داخل الكود هو `src/lib/socialLinks.ts`؛
> أي رابط يُعدّل هناك ينعكس تلقائياً على الفوتر وصفحة القنوات والإعدادات.

---

## 3) الأصول البصرية الرسمية (Brand Assets & Provenance)

الشعار هو **الختم الذهبي الرسمي**: قرص ذهبي مصقول بحافة مُسنّنة، ونقشة
«زهرة الحياة» المحفورة، وتاج صغير وشيفرون كبير، وعبارة `VIP YEMEN`.
يُعاد إنتاجه آلياً من `scripts/generate-icons.mjs` (رسم برمجي حتمي بلا
اعتماد على ملفات خارجية)، فأي بناء يعطي الأيقونة ذاتها بكسلاً ببكسل.

| الملف | المقاس | الاستخدام | SHA-256 (للتحقق) |
|---|---|---|---|
| `public/icons/icon-512.png` | 512×512 | أيقونة المنصة/المتاجر/PWA | `987a95ab03752d5023cbebdb37b8f6cf4c2fbbded9f654b860e01314b16ff0b9` |
| `public/icons/icon-maskable-512.png` | 512×512 | أيقونة maskable (أندرويد) | `daf71e5692921550751c1ddeb0bf126b425ed4abf1cec50e6e25919afc151701` |
| `public/icons/icon-192.png` | 192×192 | PWA/الشاشة الرئيسية | يُولَّد مع كل بناء |
| `public/icons/apple-touch-icon.png` | 180×180 | iOS/PWA | `7b9a1d073fd0d87075235dfc68e105501897648d12c59ee9e935a27633286b1d` |
| `public/icons/favicon.svg` | متجه | تبويب المتصفح | يُولَّد مع كل بناء |
| `store-graphics/icon-512.png` | 512×512 | قائمة Google Play | مطابق لأيقونة المنصة |
| `store-graphics/feature-graphic-1024x500.png` | 1024×500 | الرسم الترويجي في Play | `35fad248c72e47044bc7e7a71fba9e2a0c4f213342e52d06b2120bfad9b1516d` |
| `ios/App/App/Assets.xcassets/AppIcon.appiconset/` | 1024 | أيقونة App Store | يُولَّد مع كل بناء |
| `android/app/src/main/res/mipmap-*` | 48→432 | أيقونات أندرويد المتكيّفة | يُولَّد مع كل بناء |

**الضغط بلا فقدان:** ملفات PNG تُرمَّز بأفضل مرشّح لكل سطر وبأصغر ترميز
متاح، وتُتحقَّق آلياً بمقارنة البكسلات قبل/بعد:

```bash
npm run icons          # أيقونات المنصة + أندرويد + iOS
npm run icons:store    # الأصول الخاصة بالمتاجر (1024×500 + 512)
node scripts/verify-icons.mjs <مرجع> <مجلد>   # إثبات تطابق البكسلات
```

> لا يجوز تعديل الشعار أو إعادة تلوينه أو تشويهه أو استخدامه في سياق يوحي
> بالارتباط بجهة أخرى دون إذن كتابي من المالك.

---

## 4) التطبيقات الأصلية (Native Applications)

| العنصر | Android | iOS |
|---|---|---|
| التقنية | Capacitor 8 + WebView مدمج | Capacitor 8 + WKWebView |
| المعرّف | `com.vip.yemen` | `com.vip.yemen` |
| الحد الأدنى للنظام | Android 7.0 (API 24) | iOS 14+ |
| الهدف الحالي | targetSdk 36 | أحدث SDK متاح في Codemagic |
| مفتاح التوقيع | `android/keystore/vipyemen-release.p12` (RSA 3072 · حتى 2054) | شهادة Apple Distribution (Codemagic) |
| البصمة SHA-256 | `FD:AE:0D:25:93:F7:96:46:DD:07:7C:23:52:D1:68:2C:BE:9F:CC:3D:27:17:2A:6D:8E:F9:15:3E:A7:65:F4:8B` | تُدار في App Store Connect |

- التطبيقات **أصلية وموثّقة ومتكاملة**: واجهتها مدمجة داخل الحزمة، وتعمل
  حتى لو تعطّل الموقع أو تغيّر مزوّد الاستضافة، مع قناة بيانات مستقلة
  (Convex) ونظام طلبات دون اتصال يُفرغ تلقائياً عند عودة الشبكة.
- تفاصيل التوقيع والنشر في `SIGNING-AND-OWNERSHIP.md` و`PUBLISHING-GUIDE.md`.

---

## 5) حقوق المحتوى (Content Rights)

- **محتوى المنصة** (النصوص، الوصف، التصميم، بنية الأقسام، الأسئلة الشائعة،
  الشعارات): © 2026 ViP Yemen — جميع الحقوق محفوظة.
- **بيانات المستخدمين** (إعلانات، طلبات، عروض، صور، ملفات): تبقى ملكاً
  لأصحابها. بإرسالها يمنح صاحبها المنصة **ترخيصاً غير حصري** لعرضها داخل
  المنصة وقنواتها المرتبطة (تيليجرام/فيسبوك/واتساب) بغرض نشر الطلب فقط.
- **المراجعة الإدارية**: لا يُنشر أي طلب قبل تدقيقه؛ ويُزال فوراً عند ثبوت
  مخالفته أو طلب صاحبه.
- **سياسات البيانات**: `PRIVACY-POLICY.md` (الموقع) و`PRIVACY-POLICY-APP.md`
  (المتاجر)، وصفحة الحذف `/data-deletion`، والشروط `/terms`.

---

## 6) مكونات الطرف الثالث (Third-Party Components)

المنصة مبنية على مكونات مفتوحة المصدر مرخّصة، وتبقى حقوقها لأصحابها:

| المكوّن | الترخيص |
|---|---|
| React / React DOM | MIT |
| Convex (backend) | Apache-2.0 |
| Vite / Tailwind CSS / shadcn-style UI | MIT |
| Framer Motion | MIT |
| lucide-react (icons) | ISC |
| Cairo (خط) | SIL Open Font License 1.1 |
| Capacitor (Android/iOS) | MIT |

لا تُغيّر هذه التراخيص ملكية المالك للاسم التجاري والشعار والهوية والمحتوى.

---

## 7) إثباتات الملكية لدى الجهات (Ownership Verification)

عند الحاجة لإثبات الملكية (Google Search Console، Meta، متاجر التطبيقات):

1. **Google Search Console** — أضف ملف التحقق أو وسم `<meta name="google-site-verification">`
   في `index.html`، أو استخدم سجل DNS من نوع TXT.
2. **Meta / Facebook Domain Verification** — وسم `facebook-domain-verification`
   في `index.html` أو سجل TXT.
3. **Google Play / App Store** — حساب المطوّر مسجّل بالبريد الرسمي أعلاه،
   والحزمة موقّعة بالمفتاح الموثّق في القسم 4.
4. **GitHub** — المستودع تحت ملكية الحساب/المنظمة `deltastars-com`، وسجل
   الإصدارات (`Releases`) يحتوي كل حزمة معتمدة بأسمائها وتواريخها.

> أي جهة تحتاج إثباتاً رسمياً إضافياً (خطاب ملكية موقّع) تتواصل على البريد
> الرسمي ويُرسل لها خلال يومي عمل.

---

## 8) سياسة الإبلاغ عن الانتحال أو انتهاك الحقوق (Takedown)

لإبلاغ عن موقع/حساب/تطبيق ينتحل هوية ViP Yemen أو يستخدم أصولها بلا إذن:

1. أرسل إلى **vipservicesyemen@gmail.com** بعنوان: `[IP NOTICE] <الرابط>`.
2. أرفق: الرابط المخالف، وصف الانتهاك، وصورة/لقطة شاشة، وبيانات المُبلِّغ.
3. يُتَّخذ إجراء أولي (رد + إشعار للمزوّد) خلال **48 ساعة**، وتُتابع الإزالة
   عبر قنوات الاستضافة/المتاجر الرسمية.
4. المنصة تلتزم كذلك بإزالة أي محتوى يخالف حقوق طرف ثالث بعد التحقق.

---

## 9) سجل الوثيقة (Document Control)

| الإصدار | التاريخ | التغيير |
|---|---|---|
| 1.0 | 2026-10-17 | إصدار أولي موثّق: الملكية، النطاقات، الأصول والبصمات، التطبيقات، الترخيص، الإبلاغ |

**الجهة المُصدِرة:** إدارة ViP Yemen — المهندس علي درهم الدحان.
**النطاق:** المنصة (الموقع/PWA) + تطبيقات Android و iOS + قنوات التواصل الرسمية.
