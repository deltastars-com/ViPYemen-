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
    id: "telegram",
    name: "قناة تيليجرام",
    description:
      "أخبار المنصة والعروض الحصرية وكل ما يخص التوظيف والعقارات والتسويق الإلكتروني أولاً بأول.",
    href: "https://t.me/VIPservices2",
    color: "text-sky-300",
    bg: "bg-[#229ed9]/15",
    hover: "hover:border-[#229ed9]/50",
    badge: "border-[#229ed9]/40 bg-[#229ed9]/10 text-sky-300",
    cta: "انضم للقناة",
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