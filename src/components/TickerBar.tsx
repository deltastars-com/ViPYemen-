import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { CalendarDays, Megaphone } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { getHijriToday } from "@/lib/hijri";

export function TickerBar() {
  const ads = useQuery(api.ads.listActive);
  const { t, lang } = useLang();
  const [hijri] = useState(() => getHijriToday(lang));

  const items = ads && ads.length > 0
    ? ads.map((a) => `${a.title} — ${a.message}`)
    : [
        t("tickerLine1"),
        t("tickerLine2"),
        t("tickerLine3"),
      ];

  const strip = [...items, ...items, ...items, ...items];

  return (
    <div className="relative z-40 overflow-hidden border-b border-gold-500/25 bg-gradient-to-l from-ink-950 via-ink-900 to-ink-950">
      <div className="flex items-center">
        <div className="z-10 flex shrink-0 items-center gap-1.5 border-l border-gold-500/30 bg-gold-500 px-3 py-1.5 text-[11px] font-black text-ink-950">
          <Megaphone className="h-3.5 w-3.5" />
          {t("ads")}
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
        {hijri && (
          <div
            dir={lang === "ar" ? "rtl" : "ltr"}
            className="z-10 flex shrink-0 items-center gap-1.5 border-x border-gold-500/30 bg-ink-900/80 px-2.5 py-1.5 text-[10.5px] font-black text-gold-300 sm:px-3 sm:text-[11.5px]"
            title={hijri}
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-gold-400" />
            <span className="whitespace-nowrap">
              {t("today")}: {hijri}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
