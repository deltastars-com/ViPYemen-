/**
 * 📡 شريط التنبيهات الحية على واجهة المنصة.
 *
 * يُظهر لحظياً ما هو مفتوح على المنصة وما أُنجز (شاغرة / تم التوظيف ·
 * متاح / تم البيع) مع عدد الإعلانات والعروض الحية — بلا أي بيانات شخصية.
 */
import { api } from "../convex/_generated/api";
import { useSnapshotQuery } from "@/lib/snapshot";
import { Badge, Card } from "./ui";
import { Briefcase, BadgeCheck, CheckCircle2, Radio, ShoppingBag } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { liveStateClassOfState, liveStateLabel, liveText } from "@/lib/liveLabels";
import { cn } from "@/lib/utils";

interface PublicNotices {
  counts: {
    open: number;
    closed: number;
    vacant: number;
    hired: number;
    available: number;
    sold: number;
  };
  notices: { title: string; category: string; state: string; label: string; url: string; ageDays: number }[];
  activeAds: number;
  liveOffers: number;
}

function statusOf(state: string): string {
  return state === "hired" || state === "sold" ? "sold" : "published";
}

export function LiveNotices({ category }: { category?: string }) {
  const { lang } = useLang();
  const state = useSnapshotQuery(
    "live." + (category ?? "all"),
    api.controlPanel.publicState,
    category ? { category } : {}
  ) as PublicNotices | undefined;

  if (!state) return null;
  const counts = state.counts;

  const cards = [
    { key: "vacant", label: liveText("liveVacantJobs", lang), value: counts.vacant, icon: Briefcase },
    { key: "hired", label: liveText("liveHiredJobs", lang), value: counts.hired, icon: CheckCircle2 },
    { key: "available", label: liveText("liveAvailableItems", lang), value: counts.available, icon: ShoppingBag },
    { key: "sold", label: liveText("liveSoldItems", lang), value: counts.sold, icon: BadgeCheck },
  ];

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-700/50 px-5 py-3.5">
        <h2 className="inline-flex items-center gap-2 text-[13px] font-extrabold text-cream">
          <Radio className="h-4 w-4 text-gold-400" />
          {liveText("liveNoticesTitle", lang)}
        </h2>
        <Badge className="border-rose-500/40 bg-rose-500/10 text-rose-300">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
          {liveText("liveNow", lang)}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-px bg-ink-700/40 sm:grid-cols-4">
        {cards.map((card) => (
          <div key={card.key} className="bg-ink-900/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg border", liveStateClassOfState(card.key))}>
                <card.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-lg font-black text-cream">{card.value}</p>
                <p className="text-[10.5px] font-bold text-ink-300">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {state.notices.length > 0 && (
        <div className="space-y-1.5 px-5 py-3.5">
          {state.notices.map((notice, index) => (
            <a
              key={`${notice.title}-${index}`}
              href={notice.url}
              className="flex items-center justify-between gap-3 rounded-xl border border-ink-700/50 bg-ink-800/40 px-3.5 py-2 transition-colors hover:border-gold-500/40"
            >
              <span className="min-w-0 truncate text-[12px] font-bold text-cream">{notice.title}</span>
              <Badge className={cn("shrink-0", liveStateClassOfState(notice.state))}>
                {liveStateLabel(notice.category, statusOf(notice.state), lang)}
              </Badge>
            </a>
          ))}
        </div>
      )}

      <p className="border-t border-ink-700/50 px-5 py-3 text-[10.5px] leading-relaxed text-ink-400">
        {liveText("liveChannelNote", lang)}
        {state.activeAds > 0 && (
          <>
            {" "}
            · {lang === "ar" ? "إعلانات نشطة" : "active ads"}: <b className="text-gold-300">{state.activeAds}</b>
          </>
        )}
        {state.liveOffers > 0 && (
          <>
            {" "}
            · {lang === "ar" ? "عروض حية" : "live offers"}: <b className="text-gold-300">{state.liveOffers}</b>
          </>
        )}
      </p>
    </Card>
  );
}
