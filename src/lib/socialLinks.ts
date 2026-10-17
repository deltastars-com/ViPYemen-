/**
 * 🔗 الروابط الرسمية لقنوات المنصة — مصدر واحد للحقيقة (Single source of truth)
 *
 * كل رابط من قنوات المنصة الرسمية يأتي من هنا فقط، فلا تتكرر الروابط ولا
 * تختلف بين الواجهة (Footer / صفحة القنوات) وبين الباك اند (نقطة /channels
 * والإعدادات الافتراضية). عند تغيير أي رابط: عدّله هنا في مكان واحد.
 *
 * ملاحظات على الروابط:
 *  • روابط فيسبوك/انستغرام/تيك توك مكتوبة بدون معاملات تتبّع
 *    (mibextid / stkn / _r / _t) لأنها رموز نقر مؤقتة لا تغيّر الوجهة،
 *    وإبقاؤها يسرّب بيانات تتبّع ويفسد الرابط عند نسخه أو مشاركته.
 *  • روابط تيليجرام وواتساب community لا تقبل معاملات — تُستخدم كما هي.
 *  • تم التحقق من عمل هذه الروابط عبر طلب HTTP فعلي.
 */

/** صفحة فيسبوك الرسمية للمنصة. */
export const FACEBOOK_PAGE_URL = "https://www.facebook.com/vipyemen1";

/** مجموعة فيسبوك الرسمية للمنصة. */
export const FACEBOOK_GROUP_URL = "https://www.facebook.com/groups/346010664332427";

/** قناة يوتيوب الرسمية. */
export const YOUTUBE_URL = "https://www.youtube.com/@vipyemen1";

/** حساب تيك توك الرسمي. */
export const TIKTOK_URL = "https://www.tiktok.com/@vip_yemen7";

/** مجتمع واتساب الرسمي (رابط دعوة). */
export const WHATSAPP_COMMUNITY_URL =
  "https://chat.whatsapp.com/FWq6W6zHbDF8kgWlGHSMqb";

/** قناة تيليجرام الرسمية. */
export const TELEGRAM_CHANNEL_URL = "https://t.me/vipyemen77";

/** بوت تيليجرام الرسمي للمنصة. */
export const TELEGRAM_BOT_URL = "https://t.me/vipyemen_bot";

/** حساب انستغرام الرسمي. */
export const INSTAGRAM_URL = "https://www.instagram.com/vipyemen1";

/** حساب لينكدإن. */
export const LINKEDIN_URL = "https://www.linkedin.com/in/ali-aldahan-57b5a2231";

/**
 * حساب X (تويتر) الرسمي — تحقّق فعلي بتاريخ 2026/10/04: يعمل 200 والاسم
 * «ViPYemen — للتوظيف والتسويق والخدمات البرمجية · اليمن صنعاء».
 * ⚠️ الحساب القديم `@ViPservicesYeme` لم يعد موجوداً (404) فلا يُستعمل أبداً.
 */
export const X_URL = "https://x.com/Vipyemen7";

/**
 * 🔗 صفحات الربط (Link-tree) الرسمية — الروابط المحدَّثة المعتمدة من الإدارة.
 * تظهر أسفل أيقونات مواقع التواصل في الفوتر، وهي أيضًا القيم الافتراضية
 * للإعدادات في الباك اند (مصدر واحد فلا تختلف).
 * التحقق الفعلي: linkfly.to/Vipyemen و taplink.cc/vipservicesyemen تستجيب 200
 * بعنوان مطابق، و beacons/allmylinks تحجب الطلبات الآلية بـ Cloudflare (403)
 * لكل الاسمتين — الرابط نفسه سليم في المتصفح.
 */
export const BEACONS_URL = "https://beacons.ai/vipyemen";
export const LINKFLY_URL = "https://linkfly.to/Vipyemen";
export const TAPLINK_URL = "https://taplink.cc/vipservicesyemen";
export const ALLMYLINKS_URL = "https://allmylinks.com/vipyemen";

/** قائمة صفحات الربط بأسمائها كما تظهر أسفل الأيقونات. */
export const LINKTREES: { label: string; href: string }[] = [
  { label: "Beacons", href: BEACONS_URL },
  { label: "Linkfly", href: LINKFLY_URL },
  { label: "Taplink", href: TAPLINK_URL },
  { label: "AllMyLinks", href: ALLMYLINKS_URL },
];