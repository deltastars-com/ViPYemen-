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
    href: "https://t.me/vipyemen77",
    color: "text-sky-300",
    bg: "bg-[#229ed9]/15",
    hover: "hover:border-[#229ed9]/50",
    badge: "border-[#229ed9]/40 bg-[#229ed9]/10 text-sky-300",
    cta: "انضم للقناة",
  },
  {
    id: "whatsapp",
    name: "قناة واتساب",
    description:
      "كل جديد المنصة — إعلانات، عروض، ومنشورات معتمدة تُنشر لحظياً عبر قناة الواتساب الرسمية.",
    href: "https://chat.whatsapp.com/i5vycbmxwyykhctc8tsn9x",
    color: "text-[#4ade80]",
    bg: "bg-[#25d366]/15",
    hover: "hover:border-[#25d366]/50",
    badge: "border-[#25d366]/40 bg-[#25d366]/10 text-[#4ade80]",
    cta: "انضم للقناة",
  },
  {
    id: "facebook",
    name: "صفحة فيسبوك",
    description:
      "الصفحة الرسمية للمنصة — كل منشور معتمد يُنشر عليها تلقائياً مع رابط المنصة وبيانات التواصل.",
    href: "https://www.facebook.com/profile.php?id=102672588647591",
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
    href: "https://www.facebook.com/groups/346010664332427",
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
    href: "https://youtube.com/channel/UCJGfi4S63-Nm2rSXpBqzHtw",
    color: "text-red-300",
    bg: "bg-[#ff0000]/15",
    hover: "hover:border-[#ff0000]/50",
    badge: "border-[#ff0000]/40 bg-[#ff0000]/10 text-red-300",
    cta: "اشترك بالقناة",
  },
];