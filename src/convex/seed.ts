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
          "النسخة الكاملة للمنصة: أقسام التوظيف والعقارات والتسويق الإلكتروني والبرمجيات، لوحة تحكم متكاملة، شريط إعلانات، عروض ترويجية، مساعد ذكي، ونظام مالي.",
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
      .filter((q) => q.eq(q.field("version"), "5.2.0"))
      .first();
    if (!v520) {
      await ctx.db.insert("releases", {
        version: "5.2.0",
        title: "تطبيق الويب المتقدم 5.2 (PWA)",
        description:
          "الإصدار 5.2: تحسينات شاملة على تصاميم الواجهات برسومات تعريفية بالهوية الذهبية، بطاقات الأقسام المحسّنة، تحسينات الأداء، وملفات المتاجر والوثائق الكاملة.",
        platform: "web",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.2.0/vip-yemen-web-pwa-v5.2.0.zip",
        notes: "تثبيت مباشر كتطبيق ويب تقدمي ثابت — أو استضافة مجلد web-pwa",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "5.2.0",
        title: "تطبيق Android — APK جاهز للتثبيت المباشر",
        description:
          "ملف APK للحزمة com.vip.yemen — جاهز للتنزيل والتثبيت المباشر على أي جهاز أندرويد. يُرفق تلقائياً في كل إصدار.",
        platform: "android",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.2.0/vip-yemen-android-v5.2.0.apk",
        notes: "موقّع بشهادة الإصدار عند توفر التوقيع — وإلا نسخة تثبيت موقّعة تشغيلياً",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "5.2.0",
        title: "حزمة Google Play — AAB",
        description:
          "ملف AAB جاهز للرفع إلى Google Play Console للحزمة com.vip.yemen مع ملفات القائمة والتوثيق.",
        platform: "android",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.2.0/vip-yemen-android-v5.2.0.aab",
        notes: "استخدم store-listing.json و PUBLISHING-GUIDE.md لإكمال القائمة",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "5.2.0",
        title: "تطبيق iOS — IPA وApp Store",
        description:
          "مشروع iOS جاهز بالأيقونة الرسمية والإعدادات للحزمة com.vip.yemen — البناء والتوقيع عبر Codemagic أو Xcode ورفعها إلى App Store Connect.",
        platform: "ios",
        fileUrl: "https://github.com/deltastars-com/ViPYemen-/releases/latest",
        notes: "انظر codemagic.yaml و PUBLISHING-GUIDE.md لخطوات البناء والتوقيع",
        createdAt: now,
      });
      await ctx.db.insert("releases", {
        version: "5.2.0",
        title: "الكود المصدري الكامل + الوثائق والتوثيق",
        description:
          "جميع ملفات المشروع: الواجهة، الباك إند (Convex)، مشروعا Android/iOS، ملفات التوثيق والتوقيع والملكية، سياسة الخصوصية ورابطها، دليل الإدارة والتشغيل، وملفات المتاجر.",
        platform: "docs",
        fileUrl:
          "https://github.com/deltastars-com/ViPYemen-/releases/download/v5.2.0/vip-yemen-source-v5.2.0.zip",
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

    return { ok: true };
  },
});