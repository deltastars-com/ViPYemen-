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

    return { ok: true };
  },
});