import {
  FACEBOOK_GROUP_URL,
  FACEBOOK_PAGE_URL,
  INSTAGRAM_URL,
  TELEGRAM_BOT_URL,
  TELEGRAM_CHANNEL_URL,
  TIKTOK_URL,
  WHATSAPP_COMMUNITY_URL,
  X_URL,
  YOUTUBE_URL,
} from "./socialLinks";

export interface Channel {
  id: string;
  name: string;
  description: string;
  href: string;
  /** brand accent text color */
  color: string;
  /** icon container background tint */
  bg: string;
  /** card hover border */
  hover: string;
  /** pill badge classes */
  badge: string;
  cta: string;
}

export const CHANNELS: Channel[] = [
  {
    id: "telegram",
    name: "قناة تيليجرام",
    description:
      "أخبار المنصة والعروض الحصرية وكل ما يخص التوظيف والعقارات والتسويق الإلكتروني أولاً بأول.",
    href: TELEGRAM_CHANNEL_URL,
    color: "text-sky-300",
    bg: "bg-[#229ed9]/15",
    hover: "hover:border-[#229ed9]/50",
    badge: "border-[#229ed9]/40 bg-[#229ed9]/10 text-sky-300",
    cta: "انضم للقناة",
  },
  {
    id: "telegram_bot",
    name: "بوت تيليجرام",
    description:
      "المساعد الذكي للمنصة على تيليجرام — يرد على استفساراتك ويوصلك أحدث العروض لحظة نشرها.",
    href: TELEGRAM_BOT_URL,
    color: "text-sky-300",
    bg: "bg-[#229ed9]/15",
    hover: "hover:border-[#229ed9]/50",
    badge: "border-[#229ed9]/40 bg-[#229ed9]/10 text-sky-300",
    cta: "افتح البوت",
  },
  {
    id: "whatsapp",
    name: "مجتمع واتساب",
    description:
      "كل جديد المنصة — إعلانات، عروض، ومنشورات معتمدة تُنشر لحظياً عبر مجتمع الواتساب الرسمي.",
    href: WHATSAPP_COMMUNITY_URL,
    color: "text-[#4ade80]",
    bg: "bg-[#25d366]/15",
    hover: "hover:border-[#25d366]/50",
    badge: "border-[#25d366]/40 bg-[#25d366]/10 text-[#4ade80]",
    cta: "انضم للمجتمع",
  },
  {
    id: "facebook",
    name: "صفحة فيسبوك",
    description:
      "الصفحة الرسمية للمنصة — كل منشور معتمد يُنشر عليها تلقائياً مع رابط المنصة وبيانات التواصل.",
    href: FACEBOOK_PAGE_URL,
    color: "text-[#4da3ff]",
    bg: "bg-[#1877f2]/15",
    hover: "hover:border-[#1877f2]/50",
    badge: "border-[#1877f2]/40 bg-[#1877f2]/10 text-[#4da3ff]",
    cta: "تابع الصفحة",
  },
  {
    id: "facebook_group",
    name: "مجموعة فيسبوك",
    description:
      "مجموعة المنصة للنقاش والعروض — تنشر فيها الطلبات المعلنة تلقائياً ليصل الجمهور كاملاً.",
    href: FACEBOOK_GROUP_URL,
    color: "text-[#4da3ff]",
    bg: "bg-[#1877f2]/15",
    hover: "hover:border-[#1877f2]/50",
    badge: "border-[#1877f2]/40 bg-[#1877f2]/10 text-[#4da3ff]",
    cta: "انضم للمجموعة",
  },
  {
    id: "youtube",
    name: "قناة يوتيوب",
    description:
      "فيديوهات تعريفيّة بالمنصة، شروحات الخدمات، والمنشورات المصوّرة بجودة عالية واحترافية.",
    href: YOUTUBE_URL,
    color: "text-red-300",
    bg: "bg-[#ff0000]/15",
    hover: "hover:border-[#ff0000]/50",
    badge: "border-[#ff0000]/40 bg-[#ff0000]/10 text-red-300",
    cta: "اشترك بالقناة",
  },
  {
    id: "tiktok",
    name: "حساب تيك توك",
    description:
      "مقاطع مصوّرة قصيرة عن المنصة وأحدث العروض والخدمات — محتوى عملي يصل الجمهور بسرعة.",
    href: TIKTOK_URL,
    color: "text-cyan-200",
    bg: "bg-cyan-400/15",
    hover: "hover:border-cyan-400/50",
    badge: "border-cyan-400/40 bg-cyan-400/10 text-cyan-200",
    cta: "تابع الحساب",
  },
  {
    id: "instagram",
    name: "حساب انستغرام",
    description:
      "صور ومحتوى مرئي للمنصة — واجهات المنصة، شهادات العملاء، وخلاصة العروض المنشورة.",
    href: INSTAGRAM_URL,
    color: "text-pink-300",
    bg: "bg-[#e1306c]/15",
    hover: "hover:border-[#e1306c]/50",
    badge: "border-[#e1306c]/40 bg-[#e1306c]/10 text-pink-300",
    cta: "تابع الحساب",
  },
  {
    id: "x",
    name: "حساب X (تويتر)",
    description:
      "أخبار المنصة والمنشورات الرسمية على منصة X — تغطية سريعة ومتابعة لحظية لكل جديد.",
    href: X_URL,
    color: "text-cream",
    bg: "bg-white/10",
    hover: "hover:border-white/40",
    badge: "border-white/30 bg-white/10 text-cream",
    cta: "تابع الحساب",
  },
];

/** لون العلامة التجارية لكل قناة — يُستخدم لتلوين الأيقونات في كل الواجهات. */
export const CHANNEL_BRAND_COLOR: Record<string, string> = {
  telegram: "#229ED9",
  telegram_bot: "#229ED9",
  whatsapp: "#25D366",
  facebook: "#1877F2",
  facebook_group: "#1877F2",
  youtube: "#FF0000",
  tiktok: "#25F4EE",
  instagram: "#E1306C",
  x: "#FFFFFF",
};