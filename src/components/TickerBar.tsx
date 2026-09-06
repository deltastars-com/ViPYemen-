import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Megaphone } from "lucide-react";

export function TickerBar() {
  const ads = useQuery(api.ads.listActive);

  const items = ads && ads.length > 0
    ? ads.map((a) => `${a.title} — ${a.message}`)
    : [
        "ViP Yemen — منصة التوظيف والتسويق العقاري والإلكتروني والخدمات البرمجية",
        "للإعلان والتواصل: واتساب 00967711780999",
        "عروض وخدمات بجودة عالية وبأسعار منافسة",
      ];

  const strip = [...items, ...items, ...items, ...items];

  return (
    <div className="relative z-40 overflow-hidden border-b border-gold-500/25 bg-gradient-to-l from-ink-950 via-ink-900 to-ink-950">
      <div className="flex items-center">
        <div className="z-10 flex shrink-0 items-center gap-1.5 border-l border-gold-500/30 bg-gold-500 px-3 py-1.5 text-[11px] font-black text-ink-950">
          <Megaphone className="h-3.5 w-3.5" />
          إعلانات
        </div>
        <div className="relative flex-1 overflow-hidden py-1.5">
          <div className="marquee-track gap-10 pr-10">
            {strip.map((text, i) => (
              <span
                key={i}
                dir="rtl"
                className="whitespace-nowrap text-[13px] font-semibold text-gold-200/90"
              >
                ✦ {text}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}