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