import { mutation } from "./_generated/server";

export const ensureSeedData = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const adsCount = await ctx.db.query("ads").collect();
    if (adsCount.length === 0) {
      await ctx.db.insert("ads", {
        title: "مرحباً بكم في ViP Yemen",
        message: "منصة التوظيف والتسويق العقاري والإلكتروني والخدمات البرمجية في اليمن",
        status: "active",
        priority: 10,
        createdAt: now,
      });
      await ctx.db.insert("ads", {
        title: "تواصل معنا",
        message: "للإعلان أو الاستفسار: واتساب 00967711780999",
        status: "active",
        priority: 8,
        createdAt: now,
      });
      await ctx.db.insert("ads", {
        title: "عروض حصرية",
        message: "تابع قسم العروض الترويجية — خصومات وخدمات مميزة",
        status: "active",
        priority: 6,
        createdAt: now,
      });
    }

    const offersCount = await ctx.db.query("offers").collect();
    if (offersCount.length === 0) {
      await ctx.db.insert("offers", {
        title: "باقة التسويق الشامل",
        description:
          "حملة تسويقية متكاملة لمنشأتك على جميع منصات التواصل الاجتماعي — تصميم إعلانات، نشر دوري، وتقارير أداء. لفترة محدودة.",
        originalPrice: 200000,
        offerPrice: 150000,
        discountPercent: 25,
        isFeatured: true,
        status: "published",
        createdAt: now,
      });
      await ctx.db.insert("offers", {
        title: "تصميم شعار احترافي",
        description:
          "تصميم هوية بصرية كاملة لعلامتك التجارية: شعار + بطاقات + ألوان وخطوط — بجودة عالمية.",
        originalPrice: 80000,
        offerPrice: 50000,
        discountPercent: 37,
        isFeatured: false,
        status: "published",
        createdAt: now,
      });
      await ctx.db.insert("offers", {
        title: "تطوير موقع متكامل",
        description:
          "موقع ويب متجاوب مع لوحة تحكم إدارية ونظام إدارة محتوى — يشمل الاستضافة والنطاق للسنة الأولى.",
        originalPrice: 600000,
        offerPrice: 450000,
        discountPercent: 25,
        isFeatured: true,
        status: "published",
        createdAt: now,
      });
    }

    const releasesCount = await ctx.db.query("releases").collect();
    if (releasesCount.length === 0) {
      await ctx.db.insert("releases", {
        version: "5.0.0",
        title: "الإصدار الشامل 5.0",
        description:
          "النسخة الكاملة للمنصة: أقسام التوظيف والعقارات والتسويق الإلكتروني والبرمجيات، لوحة تحكم متكاملة، شريط إعلانات، عروض ترويجية، مساعد البحث الشامل، ونظام مالي.",
        platform: "web",
        notes: "تطبيق ويب تقدمي — يعمل بدون إنترنت",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "5.0.0",
        title: "الكود المصدري الكامل",
        description:
          "ملفات المشروع الكاملة: الواجهة، الباك إند، قاعدة البيانات، وأدلة النشر في متاجر التطبيقات.",
        platform: "docs",
        notes: "متوفر في مستودع المشروع",
        createdAt: now,
      });
    }

    // الإصدار 5.2 — تحسينات الواجهات والرسومات وملفات المتاجر والتطبيقات الجاهزة
    const v520 = await ctx.db
      .query("releases")
      .filter((q) => q.eq(q.field("version"), "5.2.2"))
      .first();
    if (!v520) {
      await ctx.db.insert("releases", {
        version: "5.2.2",
        title: "تطبيق الويب المتقدم 5.2 (PWA)",
        description:
          "الإصدار 5.2: تحسينات شاملة على تصاميم الواجهات برسومات تعريفية بالهوية الذهبية، بطاقات الأقسام المحسّنة، تحسينات الأداء، وملفات المتاجر والوثائق الكاملة.",
        platform: "web",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.2.2/vip-yemen-web-pwa-v5.2.2.zip",
        notes: "تثبيت مباشر كتطبيق ويب تقدمي ثابت — أو استضافة مجلد web-pwa",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "5.2.2",
        title: "تطبيق Android — APK جاهز للتثبيت المباشر",
        description:
          "ملف APK للحزمة com.vip.yemen — جاهز للتنزيل والتثبيت المباشر على أي جهاز أندرويد. يُرفق تلقائياً في كل إصدار.",
        platform: "android",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.2.2/vip-yemen-android-v5.2.2.apk",
        notes: "موقّع بشهادة الإصدار عند توفر التوقيع — وإلا نسخة تثبيت موقّعة تشغيلياً",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "5.2.2",
        title: "حزمة Google Play — AAB",
        description:
          "ملف AAB جاهز للرفع إلى Google Play Console للحزمة com.vip.yemen مع ملفات القائمة والتوثيق.",
        platform: "android",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.2.2/vip-yemen-android-v5.2.2.aab",
        notes: "استخدم store-listing.json و PUBLISHING-GUIDE.md لإكمال القائمة",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "5.2.2",
        title: "تطبيق iOS — IPA وApp Store",
        description:
          "مشروع iOS جاهز بالأيقونة الرسمية والإعدادات للحزمة com.vip.yemen — البناء والتوقيع عبر Codemagic أو Xcode ورفعها إلى App Store Connect.",
        platform: "ios",
        fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/latest",
        notes: "انظر codemagic.yaml و PUBLISHING-GUIDE.md لخطوات البناء والتوقيع",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "5.2.2",
        title: "الكود المصدري الكامل + الوثائق والتوثيق",
        description:
          "جميع ملفات المشروع: الواجهة، الباك إند (Convex)، مشروعا Android/iOS، ملفات التوثيق والتوقيع والملكية، سياسة الخصوصية ورابطها، دليل الإدارة والتشغيل، وملفات المتاجر.",
        platform: "docs",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.2.2/vip-yemen-source-v5.2.2.zip",
        notes: "يشمل PRIVACY-POLICY-APP.md و OPERATIONS-GUIDE.md و store-listing.json",
        createdAt: now,
      });
    }

    // الإصدار 5.3 — إصلاح شاشة التطبيق الفارغة وتوافق الأجهزة الأقدم
    const v530 = await ctx.db
      .query("releases")
      .filter((q) => q.eq(q.field("version"), "5.3.0"))
      .first();
    if (!v530) {
      await ctx.db.insert("releases", {
        version: "5.3.0",
        title: "تطبيق Android 5.3 — إصلاح الشاشة الفارغة (APK)",
        description:
          "الإصدار 5.3 يعالج مشكلة الشاشة الفارغة عند التثبيت: توافق كامل مع متصفحات أندرويد الأقدم (Legacy chunks)، منع تعارض خدمة الويب داخل التطبيق، وشاشة خطأ ظاهرة بدل الشاشة البيضاء. يُنصح بإلغاء تثبيت النسخة السابقة ثم تثبيت هذه النسخة.",
        platform: "android",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.3.0/vip-yemen-android-v5.3.0.apk",
        notes: "ألغِ تثبيت 5.2.2 أولاً ثم ثبّت هذا الملف — الحزمة com.vip.yemen",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "5.3.0",
        title: "حزمة Google Play — AAB 5.3",
        description:
          "حزمة AAB محدثة بنفس إصلاحات التوافق، جاهزة للرفع إلى Google Play Console للحزمة com.vip.yemen.",
        platform: "android",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.3.0/vip-yemen-android-v5.3.0.aab",
        notes: "استخدم store-listing.json و PUBLISHING-GUIDE.md لإكمال القائمة",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "5.3.0",
        title: "تطبيق الويب المتقدم 5.3 (PWA)",
        description:
          "نسخة الويب المحسّنة: توافق أوسع مع المتصفحات، تحديث تلقائي لخدمة العمل دون إنترنت، وشاشة خطأ ظاهرة بدل الشاشة الفارغة.",
        platform: "web",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.3.0/vip-yemen-web-pwa-v5.3.0.zip",
        notes: "تثبيت مباشر كتطبيق ويب تقدمي ثابت",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "5.3.0",
        title: "الكود المصدري الكامل + الوثائق 5.3",
        description:
          "جميع ملفات المشروع المحدثة: الواجهة، الباك إند (Convex)، مشروعا Android/iOS، ملفات التوثيق والتوقيع والملكية، سياسة الخصوصية ورابطها، ودليل الإدارة والتشغيل.",
        platform: "docs",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.3.0/vip-yemen-source-v5.3.0.zip",
        notes: "يشمل PRIVACY-POLICY-APP.md و OPERATIONS-GUIDE.md و store-listing.json",
        createdAt: now,
      });
    }

    // الإصدار 5.3.1 — الشعار الرسمي الأصلي الدائم
    const v531 = await ctx.db
      .query("releases")
      .filter((q) => q.eq(q.field("version"), "5.3.1"))
      .first();
    if (!v531) {
      await ctx.db.insert("releases", {
        version: "5.3.1",
        title: "الشعار الرسمي الأصلي — تطبيق Android 5.3.1 (APK)",
        description:
          "الإصدار 5.3.1 يعتمد الشعار الرسمي الأصلي للمنصة بشكل دائم في كل مكان: أيقونة التطبيق على الهاتف، شعار الواجهات، أيقونة المتصفح، وشاشة البداية — مع إصلاح شاشة التطبيق الفارغة وتوافق كامل مع الأجهزة الأقدم.",
        platform: "android",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.3.1/vip-yemen-android-v5.3.1.apk",
        notes: "ألغِ تثبيت النسخة السابقة ثم ثبّت هذا الملف — الحزمة com.vip.yemen",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "5.3.1",
        title: "حزمة Google Play — AAB 5.3.1",
        description:
          "حزمة AAB بالشعار الرسمي الأصلي، جاهزة للرفع إلى Google Play Console للحزمة com.vip.yemen.",
        platform: "android",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.3.1/vip-yemen-android-v5.3.1.aab",
        notes: "استخدم store-listing.json و PUBLISHING-GUIDE.md لإكمال القائمة",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "5.3.1",
        title: "تطبيق الويب المتقدم 5.3.1 (PWA) — الشعار الرسمي",
        description:
          "نسخة الويب بالشعار الرسمي الأصلي الدائم: أيقونة التثبيت، أيقونة المتصفح، وشعار الواجهة — مع كل تحسينات الإصدار 5.3.",
        platform: "web",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.3.1/vip-yemen-web-pwa-v5.3.1.zip",
        notes: "تثبيت مباشر كتطبيق ويب تقدمي ثابت",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "5.3.1",
        title: "الكود المصدري الكامل + الوثائق 5.3.1",
        description:
          "جميع ملفات المشروع المحدثة: الواجهة، الباك إند (Convex)، مشروعا Android/iOS بالشعار الرسمي، ملفات التوثيق والتوقيع والملكية، سياسة الخصوصية ورابطها، ودليل الإدارة والتشغيل.",
        platform: "docs",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.3.1/vip-yemen-source-v5.3.1.zip",
        notes: "يشمل PRIVACY-POLICY-APP.md و OPERATIONS-GUIDE.md و store-listing.json",
        createdAt: now,
      });
    }

    // الإصدار 5.8.1 — تحسين إصدار الملفات الموقّعة والتسمية الرسمية
    const v581 = await ctx.db
      .query("releases")
      .filter((q) => q.eq(q.field("version"), "5.8.1"))
      .first();
    if (!v581) {
      await ctx.db.insert("releases", {
        version: "5.8.1",
        title: "تطبيق Android 5.8.1 — تحديث مباشر بدون حذف (APK)",
        description:
          "الإصدار 5.8.1 موقّع بالمفتاح الرسمي الثابت مع تحقق آلي من التوقيع أثناء البناء: ثبّت النسخة الجديدة مباشرة فوق السابقة بدون حذف، مع كل مميزات 5.7 و5.8.",
        platform: "android",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.8.1/vip-yemen-android-v5.8.1.apk",
        notes: "التحديث يُثبَّت فوق الإصدارات الموقّعة السابقة مباشرة — لا حاجة للحذف",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "5.8.1",
        title: "حزمة Google Play — AAB 5.8.1",
        description: "حزمة AAB موقّعة بالمفتاح الثابت، جاهزة للرفع إلى Google Play مع ملفات المتاجر والتوقيع المرفقة.",
        platform: "android",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.8.1/vip-yemen-android-v5.8.1.aab",
        notes: "استخدم store-listing.json و SIGNING-AND-OWNERSHIP.md لإكمال القائمة",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "5.8.1",
        title: "تطبيق الويب المتقدم 5.8.1 (PWA) — تحديث تلقائي",
        description: "نسخة الويب تحدّث نفسها تلقائياً كل 30 دقيقة وعند فتح التطبيق — بدون أي إجراء من المستخدم.",
        platform: "web",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.8.1/vip-yemen-web-pwa-v5.8.1.zip",
        notes: "تثبيت مباشر كتطبيق ويب تقدمي ثابت",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "5.8.1",
        title: "الكود المصدري + ملفات التوقيع والملكية والمتاجر",
        description:
          "الكود المصدري الكامل، ملف التوقيع (PKCS12) وبيانات الشهادة والملكية، صور المتاجر (أيقونة 512 وصورة العرض 1024×500)، سياسة الخصوصية، ودليل الإدارة والتشغيل.",
        platform: "docs",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.8.1/vip-yemen-source-v5.8.1.zip",
        notes: "جميع ملفات الرفع لمتجر Google Play و App Store",
        createdAt: now,
      });
    }

    // الإصدار 5.8 — توقيع ثابت (تحديث بدون حذف)، ملفات متاجر كاملة
    const v580 = await ctx.db
      .query("releases")
      .filter((q) => q.eq(q.field("version"), "5.8.0"))
      .first();
    if (!v580) {
      await ctx.db.insert("releases", {
        version: "5.8.0",
        title: "تطبيق Android 5.8 — تحديث مباشر بدون حذف (APK)",
        description:
          "الإصدار 5.8 موقّع بمفتاح إصدار ثابت رسمي: ثبّت النسخة الجديدة مباشرة فوق السابقة بدون حذف وبدون فقدان البيانات، مع كل مميزات 5.7 (التأمين الحيوي بالبصمة والوجه، الأيقونة الرسمية، الوضع دون إنترنت).",
        platform: "android",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.8.0/vip-yemen-android-v5.8.0.apk",
        notes: "التحديث يُثبَّت فوق الإصدارات الموقّعة السابقة مباشرة — لا حاجة للحذف",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "5.8.0",
        title: "حزمة Google Play — AAB 5.8",
        description: "حزمة AAB موقّعة بالمفتاح الثابت، جاهزة للرفع إلى Google Play مع ملفات المتاجر والتوقيع المرفقة.",
        platform: "android",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.8.0/vip-yemen-android-v5.8.0.aab",
        notes: "استخدم store-listing.json و SIGNING-AND-OWNERSHIP.md لإكمال القائمة",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "5.8.0",
        title: "تطبيق الويب المتقدم 5.8 (PWA) — تحديث تلقائي",
        description: "نسخة الويب تتحدث نفسها تلقائياً كل 30 دقيقة وعند فتح التطبيق — بدون أي إجراء من المستخدم.",
        platform: "web",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.8.0/vip-yemen-web-pwa-v5.8.0.zip",
        notes: "تثبيت مباشر كتطبيق ويب تقدمي ثابت",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "5.8.0",
        title: "الكود المصدري + ملفات التوقيع والملكية والمتاجر",
        description:
          "الكود المصدري الكامل، ملف التوقيع (PKCS12) وبيانات الشهادة والملكية (SIGNING-AND-OWNERSHIP.md)، صور المتاجر (أيقونة 512 وصورة العرض 1024×500)، سياسة الخصوصية، ودليل الإدارة والتشغيل.",
        platform: "docs",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.8.0/vip-yemen-source-v5.8.0.zip",
        notes: "جميع ملفات الرفع لمتجر Google Play و App Store",
        createdAt: now,
      });
    }

    // الإصدار 5.7 — تأمين حيوي بالبصمة والوجه، هوية بصرية لكل قسم
    const v570 = await ctx.db
      .query("releases")
      .filter((q) => q.eq(q.field("version"), "5.7.0"))
      .first();
    if (!v570) {
      await ctx.db.insert("releases", {
        version: "5.7.0",
        title: "تطبيق Android 5.7 — تأمين بالبصمة والوجه (APK)",
        description:
          "الإصدار 5.7: تأمين حيوي حقيقي للوحة التحكم بالبصمة والتعرف على الوجه عبر مستشعر الجهاز، هوية بصرية مميزة لكل قسم من أقسام المنصة، واجهات نقية بهوية المنصة، وكل إصلاحات الإصدارات السابقة.",
        platform: "android",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.7.0/vip-yemen-android-v5.7.0.apk",
        notes: "ألغِ تثبيت النسخة السابقة ثم ثبّت هذا الملف — الحزمة com.vip.yemen",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "5.7.0",
        title: "حزمة Google Play — AAB 5.7",
        description: "حزمة AAB بالتأمين الحيوي وكل تحسينات 5.7.",
        platform: "android",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.7.0/vip-yemen-android-v5.7.0.aab",
        notes: "استخدم store-listing.json و PUBLISHING-GUIDE.md لإكمال القائمة",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "5.7.0",
        title: "تطبيق الويب المتقدم 5.7 (PWA)",
        description: "نسخة الويب بالتأمين الحيوي (WebAuthn) والهوية البصرية المحدثة لكل قسم.",
        platform: "web",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.7.0/vip-yemen-web-pwa-v5.7.0.zip",
        notes: "تثبيت مباشر كتطبيق ويب تقدمي ثابت",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "5.7.0",
        title: "الكود المصدري الكامل + الوثائق 5.7",
        description:
          "جميع ملفات المشروع المحدثة: الواجهة، الباك إند (Convex)، مشروعا Android/iOS، ملفات التوثيق والتوقيع والملكية، سياسة الخصوصية، ودليل الإدارة والتشغيل.",
        platform: "docs",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.7.0/vip-yemen-source-v5.7.0.zip",
        notes: "يشمل PRIVACY-POLICY-APP.md و OPERATIONS-GUIDE.md و store-listing.json",
        createdAt: now,
      });
    }

    // الإصدار 5.6 — الختم الرسمي الجديد، نقاءة الواجهات من كل العلامات الخارجية، إصلاح لوحة التحكم
    const v560 = await ctx.db
      .query("releases")
      .filter((q) => q.eq(q.field("version"), "5.6.0"))
      .first();
    if (!v560) {
      await ctx.db.insert("releases", {
        version: "5.6.0",
        title: "تطبيق Android 5.6 — الختم الرسمي الجديد (APK)",
        description:
          "الإصدار 5.6: استبدال كامل للأيقونة بالختم الذهبي الرسمي (VIP YEMEN) في المتجر والهاتف بكل الدقات، واجهات نقية بهوية المنصة فقط وأيقونة البحث أصبحت شعار المنصة، وإصلاح فتح لوحة التحكم من القائمة.",
        platform: "android",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.6.0/vip-yemen-android-v5.6.0.apk",
        notes: "ألغِ تثبيت النسخة السابقة ثم ثبّت هذا الملف — الحزمة com.vip.yemen",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "5.6.0",
        title: "حزمة Google Play — AAB 5.6",
        description: "حزمة AAB بالختم الرسمي الجديد وكل إصلاحات 5.6.",
        platform: "android",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.6.0/vip-yemen-android-v5.6.0.aab",
        notes: "استخدم store-listing.json و PUBLISHING-GUIDE.md لإكمال القائمة",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "5.6.0",
        title: "تطبيق الويب المتقدم 5.6 (PWA)",
        description: "نسخة الويب بالختم الرسمي الجديد وكل التحسينات — تعمل دون إنترنت وتُحدَّث تلقائياً.",
        platform: "web",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.6.0/vip-yemen-web-pwa-v5.6.0.zip",
        notes: "تثبيت مباشر كتطبيق ويب تقدمي ثابت",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "5.6.0",
        title: "الكود المصدري الكامل + الوثائق 5.6",
        description:
          "جميع ملفات المشروع المحدثة: الواجهة، الباك إند (Convex)، مشروعا Android/iOS بالختم الرسمي، ملفات التوثيق والتوقيع والملكية، سياسة الخصوصية، ودليل الإدارة والتشغيل.",
        platform: "docs",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.6.0/vip-yemen-source-v5.6.0.zip",
        notes: "يشمل PRIVACY-POLICY-APP.md و OPERATIONS-GUIDE.md و store-listing.json",
        createdAt: now,
      });
    }

    // الإصدار 5.4 — تطبيق حقيقي: عمل دون إنترنت، إصلاح الخادم، أيقونة سليمة
    const v540 = await ctx.db
      .query("releases")
      .filter((q) => q.eq(q.field("version"), "5.4.0"))
      .first();
    if (!v540) {
      await ctx.db.insert("releases", {
        version: "5.4.0",
        title: "تطبيق Android 5.4 — حقيقي يعمل بدون إنترنت (APK)",
        description:
          "الإصدار 5.4 يحوّل التطبيق إلى تطبيق حقيقي متكامل: يعمل بكامل واجهته بدون إنترنت وبذلك يبقى عاملاً حتى لو تعذّر الوصول للموقع، إصلاح كامل لخطأ رابط الخادم، أيقونة رسمية سليمة غير مشوهة على كل الشاشات، زر الرجوع الفعلي للهاتف يعمل داخل الأقسام، وشريط حالة بلون الهوية.",
        platform: "android",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.4.0/vip-yemen-android-v5.4.0.apk",
        notes: "ألغِ تثبيت النسخة السابقة ثم ثبّت هذا الملف — الحزمة com.vip.yemen",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "5.4.0",
        title: "حزمة Google Play — AAB 5.4",
        description:
          "حزمة AAB محدثة بكل إصلاحات 5.4: العمل دون اتصال، الأيقونة الرسمية السليمة، وسلوك التطبيق الأصلي.",
        platform: "android",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.4.0/vip-yemen-android-v5.4.0.aab",
        notes: "استخدم store-listing.json و PUBLISHING-GUIDE.md لإكمال القائمة",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "5.4.0",
        title: "تطبيق الويب المتقدم 5.4 (PWA) — دون اتصال",
        description:
          "نسخة الويب بالوضع دون اتصال الكامل: تخزين مؤقت ذكي لكل ملفات التطبيق، تحديث تلقائي، وشريط حالة يوضح وضع الاتصال.",
        platform: "web",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.4.0/vip-yemen-web-pwa-v5.4.0.zip",
        notes: "تثبيت مباشر كتطبيق ويب تقدمي ثابت",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "5.4.0",
        title: "الكود المصدري الكامل + الوثائق 5.4",
        description:
          "جميع ملفات المشروع المحدثة: الواجهة، الباك إند (Convex)، مشروعا Android/iOS بالأيقونة الرسمية، ملفات التوثيق والتوقيع والملكية، سياسة الخصوصية، ودليل الإدارة والتشغيل.",
        platform: "docs",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.4.0/vip-yemen-source-v5.4.0.zip",
        notes: "يشمل PRIVACY-POLICY-APP.md و OPERATIONS-GUIDE.md و store-listing.json",
        createdAt: now,
      });
    }

    // الإصدار 5.1 — الشعار الرسمي، قنوات رقمية، وأزرار تواصل مباشر
    const v510 = await ctx.db
      .query("releases")
      .filter((q) => q.eq(q.field("version"), "5.1.0"))
      .first();
    if (!v510) {
      await ctx.db.insert("releases", {
        version: "5.1.0",
        title: "تطبيق الويب المتقدم 5.1 (PWA)",
        description:
          "الإصدار 5.1: الشعار الرسمي الذهبي الجديد، قسم قنواتنا الرقمية (واتساب/تيليجرام/يوتيوب)، أزرار الاتصال المباشر والواتساب في التذييل، وتحسينات الأداء والأمان.",
        platform: "web",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.1.0/vip-yemen-web-pwa-v5.1.0.zip",
        notes: "تطبيق ويب تقدمي ثابت — تثبيت مباشر على الجهاز أو استضافة كاملة",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "5.1.0",
        title: "الكود المصدري الكامل 5.1",
        description:
          "جميع ملفات المشروع: الواجهة، الباك إند (Convex)، قاعدة البيانات، مشروعا Android/iOS (Capacitor)، سير عمل البناء التلقائي، وأدلة النشر في المتاجر.",
        platform: "docs",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.1.0/vip-yemen-source-v5.1.0.zip",
        notes: "متوفر في قسم الإصدارات بمستودع المشروع",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "5.1.0",
        title: "تطبيقات Android و iOS",
        description:
          "تطبيقات الهاتف للحزمة com.vip.yemen: APK و AAB لنظام Android وتطبيق iOS — تُبنى آلياً وبشكل تلقائي عبر سير العمل عند توفير ملف التوقيع.",
        platform: "android",
        fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/latest",
        notes: "APK/AAB/IPA تُرفق تلقائياً في قسم الإصدارات",
        createdAt: now,
      });
    }

    // الإصدار 6.0.0 — الإصدار الشامل الكبير: تحسينات شاملة على كل الأقسام
    const v600 = await ctx.db
      .query("releases")
      .filter((q) => q.eq(q.field("version"), "6.0.0"))
      .first();
    if (!v600) {
      await ctx.db.insert("releases", {
        version: "6.0.0",
        title: "تطبيق Android 6.0 — الإصدار الشامل الكبير (APK)",
        description:
          "الإصدار 6.0: تحسينات شاملة على كل أقسام المنصة — لوحة تحكم متكاملة ومحسّنة، نظام إشعارات متقدم، تأمين حيوي بالبصمة والوجه، شريط إعلاني تفاعلي، عروض ترويجية بالصور والفيديوهات، مساعد ذكي للبحث الشامل، نظام مالي متكامل، وأتمتة شاملة.",
        platform: "android",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.0.0/vip-yemen-android-v6.0.0.apk",
        notes: "الحزمة com.vip.yemen — تحديث مباشر فوق الإصدارات السابقة",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "6.0.0",
        title: "حزمة Google Play — AAB 6.0",
        description: "حزمة AAB موقّعة، جاهزة للرفع إلى Google Play Console مع ملفات المتاجر والتوثيق والتوقيع.",
        platform: "android",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.0.0/vip-yemen-android-v6.0.0.aab",
        notes: "استخدم store-listing.json و SIGNING-AND-OWNERSHIP.md",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "6.0.0",
        title: "تطبيق الويب المتقدم 6.0 (PWA)",
        description: "نسخة الويب الشاملة: تعمل بدون إنترنت، تحديث تلقائي، لوحة تحكم متكاملة، ونظام أتمتة شامل.",
        platform: "web",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.0.0/vip-yemen-web-pwa-v6.0.0.zip",
        notes: "تثبيت مباشر كتطبيق ويب تقدمي ثابت",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "6.0.0",
        title: "تطبيق iOS — IPA 6.0",
        description: "تطبيق iOS للحزمة com.vip.yemen — يُبنى عبر Codemagic ويرفع إلى App Store Connect.",
        platform: "ios",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/latest",
        notes: "انظر codemagic.yaml لخطوات البناء والتوقيع",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "6.0.0",
        title: "الكود المصدري الكامل + ملفات التوقيع والتوثيق والمتاجر",
        description:
          "الكود المصدري الكامل، ملف التوقيع (PKCS12)، store-listing.json، PRIVACY-POLICY-APP.md، SIGNING-AND-OWNERSHIP.md، codemagic.yaml، سير عمل GitHub Actions، وجميع ملفات المتاجر.",
        platform: "docs",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.0.0/vip-yemen-source-v6.0.0.zip",
        notes: "جميع ملفات الرفع لمتجر Google Play و App Store",
        createdAt: now,
      });
    }

    // الإصدار 6.1.0 — قسم بيانات العملاء والمتابعات + مولّد رموز التحقق
    const v610 = await ctx.db
      .query("releases")
      .filter((q) => q.eq(q.field("version"), "6.1.0"))
      .first();
    if (!v610) {
      await ctx.db.insert("releases", {
        version: "6.1.0",
        title: "تطبيق Android 6.1 — بيانات العملاء والجودة (APK)",
        description:
          "الإصدار 6.1 يضيف قسم «بيانات العملاء» في لوحة التحكم: كشف متكامل لكل العملاء بتاريخ آخر تحديث، فلترة حسب الحالة (لم تتم/تم التواصل/تم الإنجاز/لم يُستجب) والسبب والتاريخ والقسم، سجل متابعة كامل، ومولّد رموز تحقق لكل قسم مع إرسالها عبر واتساب المنصة.",
        platform: "android",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.1.0/vip-yemen-android-v6.1.0.apk",
        notes: "الحزمة com.vip.yemen — تحديث مباشر فوق 6.0 بدون حذف",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "6.1.0",
        title: "حزمة Google Play — AAB 6.1",
        description: "حزمة AAB موقّعة بقسم بيانات العملاء ومولّد رموز التحقق، جاهزة للرفع إلى Google Play Console.",
        platform: "android",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.1.0/vip-yemen-android-v6.1.0.aab",
        notes: "استخدم store-listing.json و SIGNING-AND-OWNERSHIP.md",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "6.1.0",
        title: "تطبيق الويب المتقدم 6.1 (PWA)",
        description:
          "نسخة الويب 6.1: قسم بيانات العملاء في لوحة التحكم، مولّد رموز التحقق للأقسام، وتحديث تلقائي فوري.",
        platform: "web",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.1.0/vip-yemen-web-pwa-v6.1.0.zip",
        notes: "تثبيت مباشر كتطبيق ويب تقدمي ثابت",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "6.1.0",
        title: "تطبيق iOS — IPA 6.1",
        description: "تطبيق iOS للحزمة com.vip.yemen بقسم بيانات العملاء — يُبنى عبر Codemagic ويرفع إلى App Store Connect.",
        platform: "ios",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/latest",
        notes: "انظر codemagic.yaml لخطوات البناء والتوقيع",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "6.1.0",
        title: "الكود المصدري الكامل + ملفات التوقيع والتوثيق والمتاجر",
        description:
          "الكود المصدري الكامل للإصدار 6.1، ملف التوقيع (PKCS12)، store-listing.json، PRIVACY-POLICY-APP.md، SIGNING-AND-OWNERSHIP.md، codemagic.yaml، وجميع ملفات المتاجر.",
        platform: "docs",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.1.0/vip-yemen-source-v6.1.0.zip",
        notes: "جميع ملفات الرفع لمتجر Google Play و App Store",
        createdAt: now,
      });
    }

    // الإصدار 6.1.1 — إصلاح مرآة GitHub Pages والتوجيه تحت مسار فرعي
    const v611 = await ctx.db
      .query("releases")
      .filter((q) => q.eq(q.field("version"), "6.1.1"))
      .first();
    if (!v611) {
      await ctx.db.insert("releases", {
        version: "6.1.1",
        title: "تطبيق Android 6.1.1 — توافق مرآة Pages والتوجيه (APK)",
        description:
          "الإصدار 6.1.1: إصلاح مرآة GitHub Pages لتعمل تحت المسار /ViPYemen-/ بالكامل (الأصول، الأيقونات، التوجيه الداخلي وروابط العمق كسياسة الخصوصية)، مع كل مميزات 6.1: بيانات العملاء ومولّد رموز التحقق.",
        platform: "android",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.1.1/vip-yemen-android-v6.1.1.apk",
        notes: "الحزمة com.vip.yemen — تحديث مباشر فوق 6.1.0 بدون حذف",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "6.1.1",
        title: "حزمة Google Play — AAB 6.1.1",
        description: "حزمة AAB موقّعة بإصلاحات التوجيه والتوافق، جاهزة للرفع إلى Google Play Console.",
        platform: "android",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.1.1/vip-yemen-android-v6.1.1.aab",
        notes: "استخدم store-listing.json و SIGNING-AND-OWNERSHIP.md",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "6.1.1",
        title: "تطبيق الويب المتقدم 6.1.1 (PWA)",
        description: "نسخة الويب 6.1.1 مع كل مميزات 6.1 وإصلاحات التوافق الكاملة للمرآة والموقع الرئيسي.",
        platform: "web",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.1.1/vip-yemen-web-pwa-v6.1.1.zip",
        notes: "تثبيت مباشر كتطبيق ويب تقدمي ثابت",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "6.1.1",
        title: "تطبيق iOS — IPA 6.1.1",
        description: "تطبيق iOS للحزمة com.vip.yemen بالإصدار 6.1.1 — يُبنى عبر Codemagic ويرفع إلى App Store Connect.",
        platform: "ios",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/latest",
        notes: "انظر codemagic.yaml لخطوات البناء والتوقيع",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "6.1.1",
        title: "الكود المصدري الكامل + ملفات التوقيع والتوثيق والمتاجر",
        description:
          "الكود المصدري الكامل للإصدار 6.1.1، ملف التوقيع (PKCS12)، store-listing.json، PRIVACY-POLICY-APP.md، SIGNING-AND-OWNERSHIP.md، codemagic.yaml، وجميع ملفات المتاجر.",
        platform: "docs",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v6.1.1/vip-yemen-source-v6.1.1.zip",
        notes: "جميع ملفات الرفع لمتجر Google Play و App Store",
        createdAt: now,
      });
    }

    return { ok: true };
  },
});