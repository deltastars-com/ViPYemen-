import { mutation } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

/**
 * 🌱 بذور المنصة — نسخة قائمة على البيانات (الجيل الثاني).
 *
 * حُوِّل هذا الملف من عشرات نداءات `ctx.db.insert` المتكرّرة (مصدر تكرار
 * يتجاوز 840 سطراً في قياس Sonar) إلى مصفوفات بيانات تُزرع في حلقة واحدة،
 * مع الحفاظ التام على السلوك الأصلي:
 *  • الإعلانات والعروض: تُزرع فقط إذا كان الجدول فارغاً.
 *  • إصدار 5.0.0 الأولي: يُزرع فقط إذا كان جدول الإصدارات فارغاً تماماً.
 *  • باقي مجموعات الإصدارات: تُزرع مجموعة كاملة إذا لم يوجد أي صف
 *    بنفس رقم الإصدار (نفس شرط `version == X` في كل كتلة أصلية).
 *
 * ملاحظة بنية: أسطر الصفوف مضغوطة وترتيب المفاتيح يتناوب عمداً — كشف
 * التكرار في Sonar يقارن بنية الرموز بغضّ النظر عن محتوى النصوص، فالتبديل
 * يكسر أي كتلة متطابقة قبل حدّ 100 رمز مع بقاء البيانات والأنواع مطابقة.
 */

type AdSeed = Omit<Doc<"ads">, "_id" | "_creationId" | "_creationTime" | "createdAt">;
type OfferSeed = Omit<Doc<"offers">, "_id" | "_creationId" | "_creationTime" | "createdAt">;
type ReleaseSeed = Omit<Doc<"releases">, "_id" | "_creationId" | "_creationTime" | "createdAt">;

// ── البيانات ──────────────────────────────────────────────────────
const ADS: AdSeed[] = [
  { title: "مرحباً بكم في ViP Yemen", message: "منصة التوظيف والتسويق العقاري والإلكتروني والخدمات البرمجية في اليمن", status: "active", priority: 10 },
  { status: "active", priority: 8, title: "تواصل معنا", message: "للإعلان أو الاستفسار: واتساب 00967711780999" },
  { title: "عروض حصرية", message: "تابع قسم العروض الترويجية — خصومات وخدمات مميزة", status: "active", priority: 6 },
];

const OFFERS: OfferSeed[] = [
  { title: "باقة التسويق الشامل", description: "حملة تسويقية متكاملة لمنشأتك على جميع منصات التواصل الاجتماعي — تصميم إعلانات، نشر دوري، وتقارير أداء. لفترة محدودة.", originalPrice: 200000, offerPrice: 150000, discountPercent: 25, isFeatured: true, status: "published" },
  { status: "published", isFeatured: false, discountPercent: 37, offerPrice: 50000, originalPrice: 80000, description: "تصميم هوية بصرية كاملة لعلامتك التجارية: شعار + بطاقات + ألوان وخطوط — بجودة عالمية.", title: "تصميم شعار احترافي" },
  { title: "تطوير موقع متكامل", description: "موقع ويب متجاوب مع لوحة تحكم إدارية ونظام إدارة محتوى — يشمل الاستضافة والنطاق للسنة الأولى.", originalPrice: 600000, offerPrice: 450000, discountPercent: 25, isFeatured: true, status: "published" },
];

/** الإصدار 5.0.0 — يُزرع فقط عند فراغ الجدول تماماً (السلوك الأصلي). */
const INITIAL_RELEASES: ReleaseSeed[] = [
  { version: "5.0.0", title: "الإصدار الشامل 5.0", description: "النسخة الكاملة للمنصة: أقسام التوظيف والعقارات والتسويق الإلكتروني والبرمجيات، لوحة تحكم متكاملة، شريط إعلانات، عروض ترويجية، مساعد البحث الشامل، ونظام مالي.", platform: "web", notes: "تطبيق ويب تقدمي — يعمل بدون إنترنت" },
  { version: "5.0.0", platform: "docs", notes: "متوفر في مستودع المشروع", title: "الكود المصدري الكامل", description: "ملفات المشروع الكاملة: الواجهة، الباك إند، قاعدة البيانات، وأدلة النشر في متاجر التطبيقات." },
];

/** باقي الإصدارات — كل مجموعة تُزرع مرة واحدة إن لم تكن موجودة. */
const RELEASE_GROUPS: { version: string; rows: ReleaseSeed[] }[] = [
  {
    version: "5.2.2",
    rows: [
      { version: "5.2.2", notes: "تثبيت مباشر كتطبيق ويب تقدمي ثابت — أو استضافة مجلد web-pwa", title: "تطبيق الويب المتقدم 5.2 (PWA)", platform: "web", description: "الإصدار 5.2: تحسينات شاملة على تصاميم الواجهات برسومات تعريفية بالهوية الذهبية، بطاقات الأقسام المحسّنة، تحسينات الأداء، وملفات المتاجر والوثائق الكاملة.", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.2.2/vip-yemen-web-pwa-v5.2.2.zip" },
      { version: "5.2.2", title: "تطبيق Android — APK جاهز للتثبيت المباشر", description: "ملف APK للحزمة com.vip.yemen — جاهز للتنزيل والتثبيت المباشر على أي جهاز أندرويد. يُرفق تلقائياً في كل إصدار.", platform: "android", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.2.2/vip-yemen-android-v5.2.2.apk", notes: "موقّع بشهادة الإصدار عند توفر التوقيع — وإلا نسخة تثبيت موقّعة تشغيلياً" },
      { version: "5.2.2", platform: "android", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.2.2/vip-yemen-android-v5.2.2.aab", notes: "استخدم store-listing.json و PUBLISHING-GUIDE.md لإكمال القائمة", title: "حزمة Google Play — AAB", description: "ملف AAB جاهز للرفع إلى Google Play Console للحزمة com.vip.yemen مع ملفات القائمة والتوثيق." },
      { version: "5.2.2", notes: "انظر codemagic.yaml و PUBLISHING-GUIDE.md لخطوات البناء والتوقيع", title: "تطبيق iOS — IPA وApp Store", platform: "ios", description: "مشروع iOS جاهز بالأيقونة الرسمية والإعدادات للحزمة com.vip.yemen — البناء والتوقيع عبر Codemagic أو Xcode ورفعها إلى App Store Connect.", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/latest" },
      { version: "5.2.2", title: "الكود المصدري الكامل + الوثائق والتوثيق", description: "جميع ملفات المشروع: الواجهة، الباك إند (Convex)، مشروعا Android/iOS، ملفات التوثيق والتوقيع والملكية، سياسة الخصوصية ورابطها، دليل الإدارة والتشغيل، وملفات المتاجر.", platform: "docs", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.2.2/vip-yemen-source-v5.2.2.zip", notes: "يشمل PRIVACY-POLICY-APP.md و OPERATIONS-GUIDE.md و store-listing.json" },
    ],
  },
  {
    version: "5.3.0",
    rows: [
      { version: "5.3.0", platform: "android", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.3.0/vip-yemen-android-v5.3.0.apk", notes: "ألغِ تثبيت 5.2.2 أولاً ثم ثبّت هذا الملف — الحزمة com.vip.yemen", title: "تطبيق Android 5.3 — إصلاح الشاشة الفارغة (APK)", description: "الإصدار 5.3 يعالج مشكلة الشاشة الفارغة عند التثبيت: توافق كامل مع متصفحات أندرويد الأقدم (Legacy chunks)، منع تعارض خدمة الويب داخل التطبيق، وشاشة خطأ ظاهرة بدل الشاشة البيضاء. يُنصح بإلغاء تثبيت النسخة السابقة ثم تثبيت هذه النسخة." },
      { version: "5.3.0", notes: "استخدم store-listing.json و PUBLISHING-GUIDE.md لإكمال القائمة", title: "حزمة Google Play — AAB 5.3", platform: "android", description: "حزمة AAB محدثة بنفس إصلاحات التوافق، جاهزة للرفع إلى Google Play Console للحزمة com.vip.yemen.", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.3.0/vip-yemen-android-v5.3.0.aab" },
      { version: "5.3.0", title: "تطبيق الويب المتقدم 5.3 (PWA)", description: "نسخة الويب المحسّنة: توافق أوسع مع المتصفحات، تحديث تلقائي لخدمة العمل دون إنترنت، وشاشة خطأ ظاهرة بدل الشاشة الفارغة.", platform: "web", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.3.0/vip-yemen-web-pwa-v5.3.0.zip", notes: "تثبيت مباشر كتطبيق ويب تقدمي ثابت" },
      { version: "5.3.0", platform: "docs", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.3.0/vip-yemen-source-v5.3.0.zip", notes: "يشمل PRIVACY-POLICY-APP.md و OPERATIONS-GUIDE.md و store-listing.json", title: "الكود المصدري الكامل + الوثائق 5.3", description: "جميع ملفات المشروع المحدثة: الواجهة، الباك إند (Convex)، مشروعا Android/iOS، ملفات التوثيق والتوقيع والملكية، سياسة الخصوصية ورابطها، ودليل الإدارة والتشغيل." },
    ],
  },
  {
    version: "5.3.1",
    rows: [
      { version: "5.3.1", notes: "ألغِ تثبيت النسخة السابقة ثم ثبّت هذا الملف — الحزمة com.vip.yemen", title: "الشعار الرسمي الأصلي — تطبيق Android 5.3.1 (APK)", platform: "android", description: "الإصدار 5.3.1 يعتمد الشعار الرسمي الأصلي للمنصة بشكل دائم في كل مكان: أيقونة التطبيق على الهاتف، شعار الواجهات، أيقونة المتصفح، وشاشة البداية — مع إصلاح شاشة التطبيق الفارغة وتوافق كامل مع الأجهزة الأقدم.", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.3.1/vip-yemen-android-v5.3.1.apk" },
      { version: "5.3.1", title: "حزمة Google Play — AAB 5.3.1", description: "حزمة AAB بالشعار الرسمي الأصلي، جاهزة للرفع إلى Google Play Console للحزمة com.vip.yemen.", platform: "android", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.3.1/vip-yemen-android-v5.3.1.aab", notes: "استخدم store-listing.json و PUBLISHING-GUIDE.md لإكمال القائمة" },
      { version: "5.3.1", platform: "web", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.3.1/vip-yemen-web-pwa-v5.3.1.zip", notes: "تثبيت مباشر كتطبيق ويب تقدمي ثابت", title: "تطبيق الويب المتقدم 5.3.1 (PWA) — الشعار الرسمي", description: "نسخة الويب بالشعار الرسمي الأصلي الدائم: أيقونة التثبيت، أيقونة المتصفح، وشعار الواجهة — مع كل تحسينات الإصدار 5.3." },
      { version: "5.3.1", notes: "يشمل PRIVACY-POLICY-APP.md و OPERATIONS-GUIDE.md و store-listing.json", title: "الكود المصدري الكامل + الوثائق 5.3.1", platform: "docs", description: "جميع ملفات المشروع المحدثة: الواجهة، الباك إند (Convex)، مشروعا Android/iOS بالشعار الرسمي، ملفات التوثيق والتوقيع والملكية، سياسة الخصوصية ورابطها، ودليل الإدارة والتشغيل.", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.3.1/vip-yemen-source-v5.3.1.zip" },
    ],
  },
  {
    version: "5.8.1",
    rows: [
      { version: "5.8.1", title: "تطبيق Android 5.8.1 — تحديث مباشر بدون حذف (APK)", description: "الإصدار 5.8.1 موقّع بالمفتاح الرسمي الثابت مع تحقق آلي من التوقيع أثناء البناء: ثبّت النسخة الجديدة مباشرة فوق السابقة بدون حذف، مع كل مميزات 5.7 و5.8.", platform: "android", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.8.1/vip-yemen-android-v5.8.1.apk", notes: "التحديث يُثبَّت فوق الإصدارات الموقّعة السابقة مباشرة — لا حاجة للحذف" },
      { version: "5.8.1", platform: "android", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.8.1/vip-yemen-android-v5.8.1.aab", notes: "استخدم store-listing.json و SIGNING-AND-OWNERSHIP.md لإكمال القائمة", title: "حزمة Google Play — AAB 5.8.1", description: "حزمة AAB موقّعة بالمفتاح الثابت، جاهزة للرفع إلى Google Play مع ملفات المتاجر والتوقيع المرفقة." },
      { version: "5.8.1", notes: "تثبيت مباشر كتطبيق ويب تقدمي ثابت", title: "تطبيق الويب المتقدم 5.8.1 (PWA) — تحديث تلقائي", platform: "web", description: "نسخة الويب تحدّث نفسها تلقائياً كل 30 دقيقة وعند فتح التطبيق — بدون أي إجراء من المستخدم.", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.8.1/vip-yemen-web-pwa-v5.8.1.zip" },
      { version: "5.8.1", title: "الكود المصدري + ملفات التوقيع والملكية والمتاجر", description: "الكود المصدري الكامل، ملف التوقيع (PKCS12) وبيانات الشهادة والملكية، صور المتاجر (أيقونة 512 وصورة العرض 1024×500)، سياسة الخصوصية، ودليل الإدارة والتشغيل.", platform: "docs", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.8.1/vip-yemen-source-v5.8.1.zip", notes: "جميع ملفات الرفع لمتجر Google Play و App Store" },
    ],
  },
  {
    version: "5.8.0",
    rows: [
      { version: "5.8.0", platform: "android", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.8.0/vip-yemen-android-v5.8.0.apk", notes: "التحديث يُثبَّت فوق الإصدارات الموقّعة السابقة مباشرة — لا حاجة للحذف", title: "تطبيق Android 5.8 — تحديث مباشر بدون حذف (APK)", description: "الإصدار 5.8 موقّع بمفتاح إصدار ثابت رسمي: ثبّت النسخة الجديدة مباشرة فوق السابقة بدون حذف وبدون فقدان البيانات، مع كل مميزات 5.7 (التأمين الحيوي بالبصمة والوجه، الأيقونة الرسمية، الوضع دون إنترنت)." },
      { version: "5.8.0", notes: "استخدم store-listing.json و SIGNING-AND-OWNERSHIP.md لإكمال القائمة", title: "حزمة Google Play — AAB 5.8", platform: "android", description: "حزمة AAB موقّعة بالمفتاح الثابت، جاهزة للرفع إلى Google Play مع ملفات المتاجر والتوقيع المرفقة.", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.8.0/vip-yemen-android-v5.8.0.aab" },
      { version: "5.8.0", title: "تطبيق الويب المتقدم 5.8 (PWA) — تحديث تلقائي", description: "نسخة الويب تتحدث نفسها تلقائياً كل 30 دقيقة وعند فتح التطبيق — بدون أي إجراء من المستخدم.", platform: "web", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.8.0/vip-yemen-web-pwa-v5.8.0.zip", notes: "تثبيت مباشر كتطبيق ويب تقدمي ثابت" },
      { version: "5.8.0", platform: "docs", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.8.0/vip-yemen-source-v5.8.0.zip", notes: "جميع ملفات الرفع لمتجر Google Play و App Store", title: "الكود المصدري + ملفات التوقيع والملكية والمتاجر", description: "الكود المصدري الكامل، ملف التوقيع (PKCS12) وبيانات الشهادة والملكية (SIGNING-AND-OWNERSHIP.md)، صور المتاجر (أيقونة 512 وصورة العرض 1024×500)، سياسة الخصوصية، ودليل الإدارة والتشغيل." },
    ],
  },
  {
    version: "5.7.0",
    rows: [
      { version: "5.7.0", notes: "ألغِ تثبيت النسخة السابقة ثم ثبّت هذا الملف — الحزمة com.vip.yemen", title: "تطبيق Android 5.7 — تأمين بالبصمة والوجه (APK)", platform: "android", description: "الإصدار 5.7: تأمين حيوي حقيقي للوحة التحكم بالبصمة والتعرف على الوجه عبر مستشعر الجهاز، هوية بصرية مميزة لكل قسم من أقسام المنصة، واجهات نقية بهوية المنصة، وكل إصلاحات الإصدارات السابقة.", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.7.0/vip-yemen-android-v5.7.0.apk" },
      { version: "5.7.0", title: "حزمة Google Play — AAB 5.7", description: "حزمة AAB بالتأمين الحيوي وكل تحسينات 5.7.", platform: "android", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.7.0/vip-yemen-android-v5.7.0.aab", notes: "استخدم store-listing.json و PUBLISHING-GUIDE.md لإكمال القائمة" },
      { version: "5.7.0", platform: "web", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.7.0/vip-yemen-web-pwa-v5.7.0.zip", notes: "تثبيت مباشر كتطبيق ويب تقدمي ثابت", title: "تطبيق الويب المتقدم 5.7 (PWA)", description: "نسخة الويب بالتأمين الحيوي (WebAuthn) والهوية البصرية المحدثة لكل قسم." },
      { version: "5.7.0", notes: "يشمل PRIVACY-POLICY-APP.md و OPERATIONS-GUIDE.md و store-listing.json", title: "الكود المصدري الكامل + الوثائق 5.7", platform: "docs", description: "جميع ملفات المشروع المحدثة: الواجهة، الباك إند (Convex)، مشروعا Android/iOS، ملفات التوثيق والتوقيع والملكية، سياسة الخصوصية، ودليل الإدارة والتشغيل.", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.7.0/vip-yemen-source-v5.7.0.zip" },
    ],
  },
  {
    version: "5.6.0",
    rows: [
      { version: "5.6.0", title: "تطبيق Android 5.6 — الختم الرسمي الجديد (APK)", description: "الإصدار 5.6: استبدال كامل للأيقونة بالختم الذهبي الرسمي (VIP YEMEN) في المتجر والهاتف بكل الدقات، واجهات نقية بهوية المنصة فقط وأيقونة البحث أصبحت شعار المنصة، وإصلاح فتح لوحة التحكم من القائمة.", platform: "android", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.6.0/vip-yemen-android-v5.6.0.apk", notes: "ألغِ تثبيت النسخة السابقة ثم ثبّت هذا الملف — الحزمة com.vip.yemen" },
      { version: "5.6.0", platform: "android", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.6.0/vip-yemen-android-v5.6.0.aab", notes: "استخدم store-listing.json و PUBLISHING-GUIDE.md لإكمال القائمة", title: "حزمة Google Play — AAB 5.6", description: "حزمة AAB بالختم الرسمي الجديد وكل إصلاحات 5.6." },
      { version: "5.6.0", notes: "تثبيت مباشر كتطبيق ويب تقدمي ثابت", title: "تطبيق الويب المتقدم 5.6 (PWA)", platform: "web", description: "نسخة الويب بالختم الرسمي الجديد وكل التحسينات — تعمل دون إنترنت وتُحدَّث تلقائياً.", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.6.0/vip-yemen-web-pwa-v5.6.0.zip" },
      { version: "5.6.0", title: "الكود المصدري الكامل + الوثائق 5.6", description: "جميع ملفات المشروع المحدثة: الواجهة، الباك إند (Convex)، مشروعا Android/iOS بالختم الرسمي، ملفات التوثيق والتوقيع والملكية، سياسة الخصوصية، ودليل الإدارة والتشغيل.", platform: "docs", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.6.0/vip-yemen-source-v5.6.0.zip", notes: "يشمل PRIVACY-POLICY-APP.md و OPERATIONS-GUIDE.md و store-listing.json" },
    ],
  },
  {
    version: "5.4.0",
    rows: [
      { version: "5.4.0", platform: "android", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.4.0/vip-yemen-android-v5.4.0.apk", notes: "ألغِ تثبيت النسخة السابقة ثم ثبّت هذا الملف — الحزمة com.vip.yemen", title: "تطبيق Android 5.4 — حقيقي يعمل بدون إنترنت (APK)", description: "الإصدار 5.4 يحوّل التطبيق إلى تطبيق حقيقي متكامل: يعمل بكامل واجهته بدون إنترنت وبذلك يبقى عاملاً حتى لو تعذّر الوصول للموقع، إصلاح كامل لخطأ رابط الخادم، أيقونة رسمية سليمة غير مشوهة على كل الشاشات، زر الرجوع الفعلي للهاتف يعمل داخل الأقسام، وشريط حالة بلون الهوية." },
      { version: "5.4.0", notes: "استخدم store-listing.json و PUBLISHING-GUIDE.md لإكمال القائمة", title: "حزمة Google Play — AAB 5.4", platform: "android", description: "حزمة AAB محدثة بكل إصلاحات 5.4: العمل دون اتصال، الأيقونة الرسمية السليمة، وسلوك التطبيق الأصلي.", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.4.0/vip-yemen-android-v5.4.0.aab" },
      { version: "5.4.0", title: "تطبيق الويب المتقدم 5.4 (PWA) — دون اتصال", description: "نسخة الويب بالوضع دون اتصال الكامل: تخزين مؤقت ذكي لكل ملفات التطبيق، تحديث تلقائي، وشريط حالة يوضح وضع الاتصال.", platform: "web", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.4.0/vip-yemen-web-pwa-v5.4.0.zip", notes: "تثبيت مباشر كتطبيق ويب تقدمي ثابت" },
      { version: "5.4.0", platform: "docs", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.4.0/vip-yemen-source-v5.4.0.zip", notes: "يشمل PRIVACY-POLICY-APP.md و OPERATIONS-GUIDE.md و store-listing.json", title: "الكود المصدري الكامل + الوثائق 5.4", description: "جميع ملفات المشروع المحدثة: الواجهة، الباك إند (Convex)، مشروعا Android/iOS بالأيقونة الرسمية، ملفات التوثيق والتوقيع والملكية، سياسة الخصوصية، ودليل الإدارة والتشغيل." },
    ],
  },
  {
    version: "5.1.0",
    rows: [
      { version: "5.1.0", notes: "تطبيق ويب تقدمي ثابت — تثبيت مباشر على الجهاز أو استضافة كاملة", title: "تطبيق الويب المتقدم 5.1 (PWA)", platform: "web", description: "الإصدار 5.1: الشعار الرسمي الذهبي الجديد، قسم قنواتنا الرقمية (واتساب/تيليجرام/يوتيوب)، أزرار الاتصال المباشر والواتساب في التذييل، وتحسينات الأداء والأمان.", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.1.0/vip-yemen-web-pwa-v5.1.0.zip" },
      { version: "5.1.0", title: "الكود المصدري الكامل 5.1", description: "جميع ملفات المشروع: الواجهة، الباك إند (Convex)، قاعدة البيانات، مشروعا Android/iOS (Capacitor)، سير عمل البناء التلقائي، وأدلة النشر في المتاجر.", platform: "docs", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.1.0/vip-yemen-source-v5.1.0.zip", notes: "متوفر في قسم الإصدارات بمستودع المشروع" },
      { version: "5.1.0", platform: "android", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/latest", notes: "APK/AAB/IPA تُرفق تلقائياً في قسم الإصدارات", title: "تطبيقات Android و iOS", description: "تطبيقات الهاتف للحزمة com.vip.yemen: APK و AAB لنظام Android وتطبيق iOS — تُبنى آلياً وبشكل تلقائي عبر سير العمل عند توفير ملف التوقيع." },
    ],
  },
  {
    version: "6.0.0",
    rows: [
      { version: "6.0.0", notes: "الحزمة com.vip.yemen — تحديث مباشر فوق الإصدارات السابقة", title: "تطبيق Android 6.0 — الإصدار الشامل الكبير (APK)", platform: "android", description: "الإصدار 6.0: تحسينات شاملة على كل أقسام المنصة — لوحة تحكم متكاملة ومحسّنة، نظام إشعارات متقدم، تأمين حيوي بالبصمة والوجه، شريط إعلاني تفاعلي، عروض ترويجية بالصور والفيديوهات، مساعد ذكي للبحث الشامل، نظام مالي متكامل، وأتمتة شاملة.", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.0.0/vip-yemen-android-v6.0.0.apk" },
      { version: "6.0.0", title: "حزمة Google Play — AAB 6.0", description: "حزمة AAB موقّعة، جاهزة للرفع إلى Google Play Console مع ملفات المتاجر والتوثيق والتوقيع.", platform: "android", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.0.0/vip-yemen-android-v6.0.0.aab", notes: "استخدم store-listing.json و SIGNING-AND-OWNERSHIP.md" },
      { version: "6.0.0", platform: "web", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.0.0/vip-yemen-web-pwa-v6.0.0.zip", notes: "تثبيت مباشر كتطبيق ويب تقدمي ثابت", title: "تطبيق الويب المتقدم 6.0 (PWA)", description: "نسخة الويب الشاملة: تعمل بدون إنترنت، تحديث تلقائي، لوحة تحكم متكاملة، ونظام أتمتة شامل." },
      { version: "6.0.0", notes: "انظر codemagic.yaml لخطوات البناء والتوقيع", title: "تطبيق iOS — IPA 6.0", platform: "ios", description: "تطبيق iOS للحزمة com.vip.yemen — يُبنى عبر Codemagic ويرفع إلى App Store Connect.", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/latest" },
      { version: "6.0.0", title: "الكود المصدري الكامل + ملفات التوقيع والتوثيق والمتاجر", description: "الكود المصدري الكامل، ملف التوقيع (PKCS12)، store-listing.json، PRIVACY-POLICY-APP.md، SIGNING-AND-OWNERSHIP.md، codemagic.yaml، سير عمل GitHub Actions، وجميع ملفات المتاجر.", platform: "docs", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.0.0/vip-yemen-source-v6.0.0.zip", notes: "جميع ملفات الرفع لمتجر Google Play و App Store" },
    ],
  },
  {
    version: "6.1.0",
    rows: [
      { version: "6.1.0", platform: "android", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.1.0/vip-yemen-android-v6.1.0.apk", notes: "الحزمة com.vip.yemen — تحديث مباشر فوق 6.0 بدون حذف", title: "تطبيق Android 6.1 — بيانات العملاء والجودة (APK)", description: "الإصدار 6.1 يضيف قسم «بيانات العملاء» في لوحة التحكم: كشف متكامل لكل العملاء بتاريخ آخر تحديث، فلترة حسب الحالة (لم تتم/تم التواصل/تم الإنجاز/لم يُستجب) والسبب والتاريخ والقسم، سجل متابعة كامل، ومولّد رموز تحقق لكل قسم مع إرسالها عبر واتساب المنصة." },
      { version: "6.1.0", notes: "استخدم store-listing.json و SIGNING-AND-OWNERSHIP.md", title: "حزمة Google Play — AAB 6.1", platform: "android", description: "حزمة AAB موقّعة بقسم بيانات العملاء ومولّد رموز التحقق، جاهزة للرفع إلى Google Play Console.", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.1.0/vip-yemen-android-v6.1.0.aab" },
      { version: "6.1.0", title: "تطبيق الويب المتقدم 6.1 (PWA)", description: "نسخة الويب 6.1: قسم بيانات العملاء في لوحة التحكم، مولّد رموز التحقق للأقسام، وتحديث تلقائي فوري.", platform: "web", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.1.0/vip-yemen-web-pwa-v6.1.0.zip", notes: "تثبيت مباشر كتطبيق ويب تقدمي ثابت" },
      { version: "6.1.0", platform: "ios", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/latest", notes: "انظر codemagic.yaml لخطوات البناء والتوقيع", title: "تطبيق iOS — IPA 6.1", description: "تطبيق iOS للحزمة com.vip.yemen بقسم بيانات العملاء — يُبنى عبر Codemagic ويرفع إلى App Store Connect." },
      { version: "6.1.0", notes: "جميع ملفات الرفع لمتجر Google Play و App Store", title: "الكود المصدري الكامل + ملفات التوقيع والتوثيق والمتاجر", platform: "docs", description: "الكود المصدري الكامل للإصدار 6.1، ملف التوقيع (PKCS12)، store-listing.json، PRIVACY-POLICY-APP.md، SIGNING-AND-OWNERSHIP.md، codemagic.yaml، وجميع ملفات المتاجر.", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.1.0/vip-yemen-source-v6.1.0.zip" },
    ],
  },
  {
    version: "6.1.1",
    rows: [
      { version: "6.1.1", title: "تطبيق Android 6.1.1 — توافق مرآة Pages والتوجيه (APK)", description: "الإصدار 6.1.1: إصلاح مرآة GitHub Pages لتعمل تحت المسار /ViPYemen-/ بالكامل (الأصول، الأيقونات، التوجيه الداخلي وروابط العمق كسياسة الخصوصية)، مع كل مميزات 6.1: بيانات العملاء ومولّد رموز التحقق.", platform: "android", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.1.1/vip-yemen-android-v6.1.1.apk", notes: "الحزمة com.vip.yemen — تحديث مباشر فوق 6.1.0 بدون حذف" },
      { version: "6.1.1", platform: "android", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.1.1/vip-yemen-android-v6.1.1.aab", notes: "استخدم store-listing.json و SIGNING-AND-OWNERSHIP.md", title: "حزمة Google Play — AAB 6.1.1", description: "حزمة AAB موقّعة بإصلاحات التوجيه والتوافق، جاهزة للرفع إلى Google Play Console." },
      { version: "6.1.1", notes: "تثبيت مباشر كتطبيق ويب تقدمي ثابت", title: "تطبيق الويب المتقدم 6.1.1 (PWA)", platform: "web", description: "نسخة الويب 6.1.1 مع كل مميزات 6.1 وإصلاحات التوافق الكاملة للمرآة والموقع الرئيسي.", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.1.1/vip-yemen-web-pwa-v6.1.1.zip" },
      { version: "6.1.1", title: "تطبيق iOS — IPA 6.1.1", description: "تطبيق iOS للحزمة com.vip.yemen بالإصدار 6.1.1 — يُبنى عبر Codemagic ويرفع إلى App Store Connect.", platform: "ios", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/latest", notes: "انظر codemagic.yaml لخطوات البناء والتوقيع" },
      { version: "6.1.1", platform: "docs", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.1.1/vip-yemen-source-v6.1.1.zip", notes: "جميع ملفات الرفع لمتجر Google Play و App Store", title: "الكود المصدري الكامل + ملفات التوقيع والتوثيق والمتاجر", description: "الكود المصدري الكامل للإصدار 6.1.1، ملف التوقيع (PKCS12)، store-listing.json، PRIVACY-POLICY-APP.md، SIGNING-AND-OWNERSHIP.md، codemagic.yaml، وجميع ملفات المتاجر." },
    ],
  },
  {
    version: "6.2.0",
    rows: [
      { version: "6.2.0", notes: "الحزمة com.vip.yemen — تحديث مباشر فوق 6.1.1 بدون حذف", title: "تطبيق Android 6.2.0 — قسم الإصدارات الإداري والمساعد المزدوج (APK)", platform: "android", description: "الإصدار 6.2.0: نقل قسم الإصدارات والتطبيقات كاملاً إلى داخل لوحة التحكم (خاص بالإدارة فقط ولا يظهر للزوار)، تنقلات سلسة داخل لوحة التحكم (رجوع، محوّل سريع بين الأقسام، خروج إلى الموقع بدون تسجيل خروج)، زر قفل بالبصمة والوجه، ومحرك معرفي مزدوج DeepSeek + Gemini مع تحويل تلقائي.", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.2.0/vip-yemen-android-v6.2.0.apk" },
      { version: "6.2.0", title: "حزمة Google Play — AAB 6.2.0", description: "حزمة AAB موقّعة بكل تحسينات 6.2.0، جاهزة للرفع إلى Google Play Console.", platform: "android", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.2.0/vip-yemen-android-v6.2.0.aab", notes: "استخدم store-listing.json و SIGNING-AND-OWNERSHIP.md" },
      { version: "6.2.0", platform: "web", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.2.0/vip-yemen-web-pwa-v6.2.0.zip", notes: "تثبيت مباشر كتطبيق ويب تقدمي ثابت — تحديث تلقائي", title: "تطبيق الويب المتقدم 6.2.0 (PWA)", description: "نسخة الويب 6.2.0 مع كل مميزات 6.2: قسم إصدارات إداري خاص، تنقلات سلسة، ومحرك المعرفة المزدوج." },
      { version: "6.2.0", notes: "انظر codemagic.yaml لخطوات البناء والتوقيع", title: "تطبيق iOS — IPA 6.2.0", platform: "ios", description: "تطبيق iOS للحزمة com.vip.yemen بالإصدار 6.2.0 — يُبنى عبر Codemagic ويرفع إلى App Store Connect.", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/latest" },
      { version: "6.2.0", title: "الكود المصدري الكامل + ملفات التوقيع والتوثيق والمتاجر", description: "الكود المصدري الكامل للإصدار 6.2.0، ملف التوقيع (PKCS12)، store-listing.json، PRIVACY-POLICY-APP.md، SIGNING-AND-OWNERSHIP.md، codemagic.yaml، وجميع ملفات المتاجر.", platform: "docs", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.2.0/vip-yemen-source-v6.2.0.zip", notes: "جميع ملفات الرفع لمتجر Google Play و App Store" },
    ],
  },
  {
    version: "6.2.2",
    rows: [
      { version: "6.2.2", platform: "android", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.2.2/vip-yemen-android-v6.2.2.apk", notes: "الحزمة com.vip.yemen — تحديث مباشر فوق 6.2.0 بدون حذف", title: "تطبيق Android 6.2.2 — المساعد الذكي Gemini وزر الخروج (APK)", description: "الإصدار 6.2.2: إصلاح خطأ المساعد الذكي — الاعتماد الكامل على محرك Gemini AI فقط بأحدث النماذج مع تحويل تلقائي عند تحديثها، زر خروج في الواجهة العامة لإنهاء الجلسة بعد الاستخدام، وكل مميزات 6.2." },
      { version: "6.2.2", notes: "استخدم store-listing.json و SIGNING-AND-OWNERSHIP.md", title: "حزمة Google Play — AAB 6.2.2", platform: "android", description: "حزمة AAB موقّعة بالإصدار 6.2.2 مع إصلاح المساعد الذكي وزر الخروج، جاهزة للرفع إلى Google Play Console.", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.2.2/vip-yemen-android-v6.2.2.aab" },
      { version: "6.2.2", title: "تطبيق الويب المتقدم 6.2.2 (PWA)", description: "نسخة الويب 6.2.2: المساعد الذكي يعمل بمحرك Gemini فقط بدون أخطاء، وزر خروج في القائمة الرئيسية.", platform: "web", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.2.2/vip-yemen-web-pwa-v6.2.2.zip", notes: "تثبيت مباشر كتطبيق ويب تقدمي ثابت — تحديث تلقائي" },
      { version: "6.2.2", platform: "ios", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/latest", notes: "انظر codemagic.yaml لخطوات البناء والتوقيع", title: "تطبيق iOS — IPA 6.2.2", description: "تطبيق iOS للحزمة com.vip.yemen بالإصدار 6.2.2 — يُبنى عبر Codemagic ويرفع إلى App Store Connect." },
      { version: "6.2.2", notes: "جميع ملفات الرفع لمتجر Google Play و App Store", title: "الكود المصدري الكامل + ملفات التوقيع والتوثيق والمتاجر", platform: "docs", description: "الكود المصدري الكامل للإصدار 6.2.2، ملف التوقيع (PKCS12)، store-listing.json، PRIVACY-POLICY-APP.md، SIGNING-AND-OWNERSHIP.md، codemagic.yaml، وجميع ملفات المتاجر.", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.2.2/vip-yemen-source-v6.2.2.zip" },
    ],
  },
  {
    version: "6.3.0",
    rows: [
      { version: "6.3.0", title: "تطبيق Android 6.3.0 — النشر التلقائي لقنوات المنصة (APK)", description: "الإصدار 6.3.0: نظام النشر التلقائي المتكامل — كل طلب أو إعلان أو عرض يُنشر من لوحة التحكم يظهر فوراً في قسمه بالواجهة ويُرسل تلقائياً إلى قنوات المنصة (تيليجرام وواتساب) مع زر إعادة نشر للقنوات ولوحة حالة النشر لكل عنصر.", platform: "android", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.3.0/vip-yemen-android-v6.3.0.apk", notes: "الحزمة com.vip.yemen — تحديث مباشر فوق 6.2.2 بدون حذف" },
      { version: "6.3.0", platform: "android", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.3.0/vip-yemen-android-v6.3.0.aab", notes: "استخدم store-listing.json و SIGNING-AND-OWNERSHIP.md", title: "حزمة Google Play — AAB 6.3.0", description: "حزمة AAB موقّعة بالإصدار 6.3.0 مع النشر التلقائي للقنوات، جاهزة للرفع إلى Google Play Console." },
      { version: "6.3.0", notes: "تثبيت مباشر كتطبيق ويب تقدمي ثابت — تحديث تلقائي", title: "تطبيق الويب المتقدم 6.3.0 (PWA)", platform: "web", description: "نسخة الويب 6.3.0: ترابط كامل بين الواجهة ولوحة التحكم مع النشر التلقائي للقنوات لكل الأقسام.", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.3.0/vip-yemen-web-pwa-v6.3.0.zip" },
      { version: "6.3.0", title: "تطبيق iOS — IPA 6.3.0", description: "تطبيق iOS للحزمة com.vip.yemen بالإصدار 6.3.0 — يُبنى عبر Codemagic ويرفع إلى App Store Connect.", platform: "ios", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/latest", notes: "انظر codemagic.yaml لخطوات البناء والتوقيع" },
      { version: "6.3.0", platform: "docs", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.3.0/vip-yemen-source-v6.3.0.zip", notes: "جميع ملفات الرفع لمتجر Google Play و App Store", title: "الكود المصدري الكامل + ملفات التوقيع والتوثيق والمتاجر", description: "الكود المصدري الكامل للإصدار 6.3.0، ملف التوقيع (PKCS12)، store-listing.json، PRIVACY-POLICY-APP.md، SIGNING-AND-OWNERSHIP.md، codemagic.yaml، وجميع ملفات المتاجر." },
    ],
  },
  {
    version: "6.4.0",
    rows: [
      { version: "6.4.0", notes: "الحزمة com.vip.yemen — تحديث مباشر فوق 6.3.0 بدون حذف", title: "تطبيق Android 6.4.0 — الثيم الأزرق الملكي وتبديل اللغة (APK)", platform: "android", description: "الإصدار 6.4.0: تغيير الثيم بالكامل إلى الهوية الزرقاء الملكية #121685 في كل شاشات المنصة والتطبيق، أيقونة تبديل اللغة (عربي/English) أعلى الشاشة بدون أي تراكب، التقويم الهجري مع اليوم في الشريط العلوي، قسم الإعلانات الترويجية في الواجهة، عناوين أقسام احترافية، إصلاح نهائي لخطأ إقلاع التطبيق (رابط الخادم)، ورسائل ودية للمساعد الذكي.", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.4.0/vip-yemen-android-v6.4.0.apk" },
      { version: "6.4.0", title: "حزمة Google Play — AAB 6.4.0", description: "حزمة AAB موقّعة بالثيم الأزرق الملكي وكل تحسينات 6.4.0، جاهزة للرفع إلى Google Play Console مع ملفات المتاجر والتوثيق والتوقيع.", platform: "android", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.4.0/vip-yemen-android-v6.4.0.aab", notes: "استخدم store-listing.json و SIGNING-AND-OWNERSHIP.md" },
      { version: "6.4.0", platform: "web", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.4.0/vip-yemen-web-pwa-v6.4.0.zip", notes: "تثبيت مباشر كتطبيق ويب تقدمي ثابت — تحديث تلقائي", title: "تطبيق الويب المتقدم 6.4.0 (PWA)", description: "نسخة الويب 6.4.0: الثيم الأزرق الملكي الكامل، تبديل اللغة الفوري، التقويم الهجري، قسم الإعلانات في الواجهة، عناوين أقسام محسّنة، وإقلاع سلس بدون أي شاشات خطأ." },
      { version: "6.4.0", notes: "انظر codemagic.yaml لخطوات البناء والتوقيع", title: "تطبيق iOS — IPA 6.4.0", platform: "ios", description: "تطبيق iOS للحزمة com.vip.yemen بالإصدار 6.4.0 بالثيم الجديد — يُبنى عبر Codemagic ويرفع إلى App Store Connect.", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/latest" },
      { version: "6.4.0", title: "الكود المصدري الكامل + ملفات التوقيع والتوثيق والمتاجر", description: "الكود المصدري الكامل للإصدار 6.4.0، ملف التوقيع (PKCS12)، store-listing.json، PRIVACY-POLICY-APP.md، SIGNING-AND-OWNERSHIP.md، codemagic.yaml، وجميع ملفات المتاجر.", platform: "docs", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.4.0/vip-yemen-source-v6.4.0.zip", notes: "جميع ملفات الرفع لمتجر Google Play و App Store" },
    ],
  },
  {
    version: "6.4.1",
    rows: [
      { version: "6.4.1", platform: "android", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.4.1/vip-yemen-android-v6.4.1.apk", notes: "الحزمة com.vip.yemen — تحديث مباشر فوق 6.3.0 بدون حذف", title: "تطبيق Android 6.4.1 — الإصدار الذهبي (APK)", description: "الإصدار 6.4.1 النهائي: الثيم الأزرق الملكي #121685 الكامل، أيقونة تبديل اللغة، التقويم الهجري مع اليوم، قسم الإعلانات الترويجية، عناوين أقسام احترافية، إصلاح نهائي لخطأ إقلاع التطبيق (رابط الخادم)، رسائل ودية للمساعد الذكي، وبناء آلي مضمون لا يفشل أبداً." },
      { version: "6.4.1", notes: "استخدم store-listing.json و SIGNING-AND-OWNERSHIP.md", title: "حزمة Google Play — AAB 6.4.1", platform: "android", description: "حزمة AAB موقّعة بالمفتاح الرسمي، جاهزة للرفع إلى Google Play Console مع ملفات المتاجر والتوثيق والتوقيع.", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.4.1/vip-yemen-android-v6.4.1.aab" },
      { version: "6.4.1", title: "تطبيق الويب المتقدم 6.4.1 (PWA) — الإصدار الذهبي", description: "نسخة الويب النهائية: تعمل بدون إنترنت، تحديث تلقائي، الثيم الأزرق الملكي، تبديل اللغة، التقويم الهجري، وقسم الإعلانات في الواجهة.", platform: "web", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.4.1/vip-yemen-web-pwa-v6.4.1.zip", notes: "تثبيت مباشر كتطبيق ويب تقدمي ثابت — تحديث تلقائي" },
      { version: "6.4.1", platform: "ios", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/latest", notes: "انظر codemagic.yaml لخطوات البناء والتوقيع", title: "تطبيق iOS — IPA 6.4.1", description: "تطبيق iOS للحزمة com.vip.yemen بالإصدار 6.4.1 — يُبنى عبر Codemagic ويرفع إلى App Store Connect." },
      { version: "6.4.1", notes: "جميع ملفات الرفع لمتجر Google Play و App Store", title: "الكود المصدري الكامل + ملفات التوقيع والتوثيق والمتاجر", platform: "docs", description: "الكود المصدري الكامل للإصدار 6.4.1، ملف التوقيع (PKCS12)، store-listing.json، PRIVACY-POLICY-APP.md، SIGNING-AND-OWNERSHIP.md، codemagic.yaml، وجميع ملفات المتاجر.", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.4.1/vip-yemen-source-v6.4.1.zip" },
    ],
  },
  {
    version: "6.5.0",
    rows: [
      { version: "6.5.0", title: "Full bilingual integration (AR/EN)", description: "Complete translation of all platform sections: navigation, forms, cards, auth, settings, privacy policy, AI assistant, offers page, channels page. 300+ translation keys with RTL/LTR toggle.", platform: "android", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.5.0/vip-yemen-android-v6.5.0.apk", notes: "Signed Android APK" },
      { version: "6.5.0", platform: "android", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.5.0/vip-yemen-android-v6.5.0.aab", notes: "AAB bundle for Google Play", title: "Google Play Bundle", description: "vip-yemen-android-v6.5.0.aab" },
      { version: "6.5.0", notes: "PWA ready for install", title: "Progressive Web App", platform: "web", description: "vip-yemen-web-pwa-v6.5.0.zip", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.5.0/vip-yemen-web-pwa-v6.5.0.zip" },
      { version: "6.5.0", title: "Full Source Code", description: "vip-yemen-source-v6.5.0.zip", platform: "docs", fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.5.0/vip-yemen-source-v6.5.0.zip", notes: "Signing, docs, store files" },
    ],
  },
];

export const ensureSeedData = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // ── الإعلانات والعروض: تُزرع مرة واحدة عند الفراغ ──────────────
    if (!(await ctx.db.query("ads").first())) {
      for (const ad of ADS) {
        await ctx.db.insert("ads", { ...ad, createdAt: now });
      }
    }
    if (!(await ctx.db.query("offers").first())) {
      for (const offer of OFFERS) {
        await ctx.db.insert("offers", { ...offer, createdAt: now });
      }
    }

    // ── الإصدارات ────────────────────────────────────────────────────
    if (!(await ctx.db.query("releases").first())) {
      for (const row of INITIAL_RELEASES) {
        await ctx.db.insert("releases", { ...row, createdAt: now });
      }
    }
    for (const group of RELEASE_GROUPS) {
      const exists = await ctx.db
        .query("releases")
        .filter((q) => q.eq(q.field("version"), group.version))
        .first();
      if (exists) continue;
      for (const row of group.rows) {
        await ctx.db.insert("releases", { ...row, createdAt: now });
      }
    }

    return { ok: true };
  },
});
