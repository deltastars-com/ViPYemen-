/**
 * 🧠 أقسام الذكاء في لوحة الكنترول: التوافق والمطابقة · الأرشفة والفهرسة ·
 * تقييم مقدمي التوظيف بالنجوم · العملاء العائدون (تنشيط أو إضافة جديد).
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Archive,
  BadgeCheck,
  CheckCircle2,
  Layers,
  MessageCircle,
  RefreshCw,
  Search,
  Star,
  Target,
  Trophy,
  UserPlus,
  Users2,
  Zap,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Badge, Button, EmptyState, Input, Select, Spinner, StatCard } from "@/components/ui";
import { cn, formatDateTime, timeAgo, whatsappLink } from "@/lib/utils";
import { useLang } from "@/lib/i18n";

const MATCH_STATUS_LABELS: Record<string, { ar: string; en: string; className: string }> = {
  new: { ar: "جديدة", en: "New", className: "border-gold-500/40 bg-gold-500/10 text-gold-300" },
  notified: { ar: "أُبلغ الطرفان", en: "Notified", className: "border-sky-500/40 bg-sky-500/10 text-sky-300" },
  contacted: { ar: "جاري التواصل", en: "In contact", className: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
  matched: { ar: "مكتملة", en: "Matched", className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
  closed: { ar: "مغلقة", en: "Closed", className: "border-ink-500/40 bg-ink-800/60 text-ink-200" },
};

function Stars({ value, className }: { value: number; className?: string }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} title={`${value}/5`}>
      {Array.from({ length: 5 }).map((_, index) => {
        const filled = index < full || (index === full && half);
        return (
          <Star
            key={index}
            className={cn("h-3.5 w-3.5", filled ? "fill-gold-400 text-gold-400" : "text-ink-600")}
          />
        );
      })}
      <b className="mr-1 text-[11px] text-gold-300">{value.toFixed(1)}</b>
    </span>
  );
}

function scoreTone(score: number): string {
  if (score >= 80) return "text-emerald-300 border-emerald-500/40 bg-emerald-500/10";
  if (score >= 65) return "text-gold-300 border-gold-500/40 bg-gold-500/10";
  if (score >= 50) return "text-amber-300 border-amber-500/40 bg-amber-500/10";
  return "text-rose-300 border-rose-500/40 bg-rose-500/10";
}

/* ─────────────────────── 1. التوافق والملائمة والتطابق ─────────────────────── */

export function ControlMatching({ token }: { token: string }) {
  const { lang } = useLang();
  const L = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const [category, setCategory] = useState("all");
  const [minScore, setMinScore] = useState(40);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState("all");

  const board = useQuery(api.matching.listMatches, {
    token,
    category: category === "all" ? undefined : category,
    minScore,
  });
  const suggestions = useQuery(api.matching.listSuggestions, {
    token,
    status: status === "all" ? undefined : status,
  });
  const stats = useQuery(api.matching.getMatchStats, { token });
  const runMatch = useMutation(api.matching.runMatchNow);
  const notifyPair = useMutation(api.matching.notifyPair);
  const updateSuggestion = useMutation(api.matching.updateSuggestion);
  const notifySuggestion = useMutation(api.matching.notifyMatchedParties);

  async function notify(categoryKey: string, requestId: string, offerId: string) {
    setBusy(`${requestId}|${offerId}`);
    try {
      await notifyPair({ token, category: categoryKey, requestId, offerId });
    } catch (error: any) {
      alert(error?.message ?? L("تعذّر الإبلاغ", "Notify failed"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="card-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="inline-flex items-center gap-2 text-sm font-extrabold text-cream">
              <Target className="h-4 w-4 text-gold-400" />
              {L("محرك التوافق والترشيح التلقائي", "Automatic matching & ranking engine")}
            </h3>
            <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-ink-300">
              {L(
                "يقارن النظام كل عرض بكل طلب مفتوح ويحتسب نسبة توافق دقيقة من: المؤهلات · الخبرات · الموقع · السعر/الراتب · مكان العمل · المواصفات والغرض — ثم يرتّب الأفضل ويبلّغ الطرفين آلياً.",
                "The engine compares every open offer with every open request and computes an exact fit score from qualifications · experience · location · price/salary · workplace · specs and purpose — then ranks the best and notifies both parties automatically."
              )}
            </p>
          </div>
          <Button
            variant="gold"
            loading={busy === "engine"}
            onClick={async () => {
              setBusy("engine");
              try {
                await runMatch({ token });
              } finally {
                setBusy(null);
              }
            }}
          >
            <Zap className="h-4 w-4" />
            {L("تشغيل المحرك الآن", "Run engine now")}
          </Button>
        </div>

        {stats && (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label={L("مطابقات محفوظة", "Saved matches")} value={stats.counts.all ?? 0} icon={<Target className="h-5 w-5" />} />
            <StatCard label={L("أعلى نسبة توافق", "Best fit")} value={`${stats.top}%`} icon={<Trophy className="h-5 w-5" />} accent="emerald" />
            <StatCard label={L("متوسط التوافق", "Average fit")} value={`${stats.average}%`} icon={<Zap className="h-5 w-5" />} accent="gold" />
            <StatCard label={L("قيد التواصل", "In contact")} value={(stats.counts.contacted ?? 0) + (stats.counts.notified ?? 0)} icon={<MessageCircle className="h-5 w-5" />} accent="sky" />
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={category} onChange={(event) => setCategory(event.target.value)} className="!w-auto">
            <option value="all">{L("كل الأقسام", "All sections")}</option>
            <option value="jobs">{L("التوظيف", "Jobs")}</option>
            <option value="real_estate">{L("العقارات", "Real estate")}</option>
            <option value="emarket">{L("التسويق الإلكتروني", "E-marketing")}</option>
            <option value="software">{L("البرمجيات", "Software")}</option>
          </Select>
          <div className="flex flex-1 items-center gap-2">
            <span className="shrink-0 text-[11px] font-bold text-ink-300">
              {L("الحد الأدنى للتوافق", "Minimum fit")}: <b className="text-gold-300">{minScore}%</b>
            </span>
            <input
              type="range"
              min={20}
              max={95}
              step={5}
              value={minScore}
              onChange={(event) => setMinScore(Number(event.target.value))}
              className="h-1.5 w-full max-w-56 accent-gold-400"
              aria-label={L("الحد الأدنى للتوافق", "Minimum fit")}
            />
          </div>
        </div>
      </div>

      {!board ? (
        <div className="flex justify-center py-16 text-gold-400">
          <Spinner className="h-8 w-8" />
        </div>
      ) : board.matches.length === 0 ? (
        <EmptyState
          title={L("لا توجد مطابقات بهذا الحد بعد", "No matches at this threshold yet")}
          hint={L("خفّض الحد الأدنى أو انشر عروضاً وطلبات جديدة", "Lower the threshold or publish new offers and requests")}
        />
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-extrabold text-cream">
            {L("أفضل المطابقات المفتوحة الآن", "Best open matches right now")}{" "}
            <span className="text-ink-400">({board.total})</span>
          </h3>
          {board.matches.map((match: any) => (
            <div key={match.key} className="card-surface p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className={cn("flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border text-center", scoreTone(match.score))}>
                  <span className="text-lg font-black">{match.score}%</span>
                  <span className="text-[9px] font-bold opacity-80">{L("توافق", "fit")}</span>
                </div>

                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                  {[
                    { party: match.request, side: L("الطلب", "Request") },
                    { party: match.offer, side: L("العرض", "Offer") },
                  ].map((item) => (
                    <div key={item.side} className="rounded-xl border border-ink-700/50 bg-ink-800/40 p-3">
                      <p className="text-[10px] font-black text-gold-400">{item.side}</p>
                      <p className="truncate text-[12px] font-extrabold text-cream">{item.party.title}</p>
                      <p className="truncate text-[11px] text-ink-300">
                        {item.party.name}
                        {item.party.address ? ` · ${item.party.address}` : ""}
                      </p>
                      <a
                        href={whatsappLink(item.party.phone, `${L("بخصوص", "Regarding")}: "${item.party.title}" — ViP Yemen`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-[#4ade80] hover:underline"
                      >
                        <MessageCircle className="h-3 w-3" />
                        {item.party.phone}
                      </a>
                    </div>
                  ))}
                </div>

                <div className="flex shrink-0 flex-col gap-2">
                  <Button
                    variant="success"
                    className="!px-3 !py-1.5 text-[11px]"
                    loading={busy === `${match.request.id}|${match.offer.id}`}
                    onClick={() => notify(match.category, match.request.id, match.offer.id)}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    {L("أبلغ الطرفين في القنوات", "Notify both in channels")}
                  </Button>
                  <a
                    href={whatsappLink(
                      match.offer.phone,
                      `${L("مطابقة متميزة", "Excellent match")} (${match.score}%): "${match.request.title}" — ViP Yemen`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-ink-600/60 px-3 py-1.5 text-[11px] font-bold text-ink-200 transition-colors hover:border-gold-500/50 hover:text-gold-300"
                  >
                    {L("محادثة العرض", "Chat the offer side")}
                  </a>
                </div>
              </div>

              {match.reasons.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-ink-700/50 pt-3">
                  {match.reasons.map((reason: string) => (
                    <span key={reason} className="chip !border-emerald-500/30 !bg-emerald-500/10 !text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" />
                      {reason}
                    </span>
                  ))}
                  {match.dimensions
                    .filter((dimension: any) => (dimension.value ?? 0) < 0.6)
                    .map((dimension: any) => (
                      <span key={dimension.key} className="chip">
                        {dimension.label}: {Math.round((dimension.value ?? 0) * 100)}%
                      </span>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="card-surface p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="inline-flex items-center gap-2 text-sm font-extrabold text-cream">
            <Layers className="h-4 w-4 text-gold-400" />
            {L("أرشيف المطابقات ومتابعتها", "Match archive & follow-up")}
          </h3>
          <Select value={status} onChange={(event) => setStatus(event.target.value)} className="!w-auto">
            <option value="all">{L("كل الحالات", "All statuses")}</option>
            {Object.entries(MATCH_STATUS_LABELS).map(([key, value]) => (
              <option key={key} value={key}>
                {lang === "ar" ? value.ar : value.en}
              </option>
            ))}
          </Select>
        </div>
        {!suggestions ? (
          <div className="flex justify-center py-10 text-gold-400">
            <Spinner className="h-7 w-7" />
          </div>
        ) : suggestions.length === 0 ? (
          <EmptyState title={L("لا توجد مطابقات محفوظة", "No saved matches")} hint={L("شغّل المحرك لبناء الأرشيف", "Run the engine to build the archive")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-right text-[12px]">
              <thead>
                <tr className="border-b border-ink-700/60 text-[11px] text-ink-400">
                  <th className="py-2">{L("النسبة", "Fit")}</th>
                  <th className="py-2">{L("الطلب", "Request")}</th>
                  <th className="py-2">{L("العرض", "Offer")}</th>
                  <th className="py-2">{L("المعايير", "Criteria")}</th>
                  <th className="py-2">{L("الحالة", "Status")}</th>
                  <th className="py-2">{L("إجراء", "Action")}</th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((row: any) => (
                  <tr key={row._id} className="border-b border-ink-800/60 align-top">
                    <td className="py-3">
                      <span className={cn("inline-flex rounded-lg border px-2.5 py-1 text-[11px] font-black", scoreTone(row.score))}>
                        {row.score}%
                      </span>
                    </td>
                    <td className="py-3">
                      <p className="max-w-56 truncate font-bold text-cream">{row.requestTitle}</p>
                      <p className="text-[11px] text-ink-400">{row.requestName}</p>
                    </td>
                    <td className="py-3">
                      <p className="max-w-56 truncate font-bold text-cream">{row.offerTitle}</p>
                      <p className="text-[11px] text-ink-400">{row.offerName}</p>
                    </td>
                    <td className="py-3">
                      <div className="flex max-w-64 flex-wrap gap-1">
                        {(row.reasons ?? []).slice(0, 3).map((reason: string) => (
                          <span key={reason} className="chip !py-0.5 !text-[10px]">{reason}</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3">
                      <Badge className={MATCH_STATUS_LABELS[row.status]?.className ?? ""}>
                        {lang === "ar"
                          ? MATCH_STATUS_LABELS[row.status]?.ar ?? row.status
                          : MATCH_STATUS_LABELS[row.status]?.en ?? row.status}
                      </Badge>
                      <p className="mt-1 text-[10px] text-ink-500">{timeAgo(row.createdAt)}</p>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-col gap-1.5">
                        <Select
                          value={row.status}
                          onChange={(event) => updateSuggestion({ token, id: row._id, status: event.target.value })}
                          className="!w-36 !py-1 !text-[11px]"
                        >
                          {Object.entries(MATCH_STATUS_LABELS).map(([key, value]) => (
                            <option key={key} value={key}>
                              {lang === "ar" ? value.ar : value.en}
                            </option>
                          ))}
                        </Select>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => notifySuggestion({ token, id: row._id })}
                            className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-2.5 py-1 text-[10px] font-bold text-sky-300 transition-colors hover:bg-sky-500/20"
                          >
                            {L("إبلاغ", "Notify")}
                          </button>
                          <a
                            href={whatsappLink(row.requestPhone, `${L("مطابقة", "Match")} ${row.score}%: "${row.offerTitle}" — ViP Yemen`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300 transition-colors hover:bg-emerald-500/20"
                          >
                            {L("واتساب الطلب", "Request WA")}
                          </a>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── 2. الأرشفة والفهرسة ─────────────────────────── */

const ARCHIVE_KINDS = [
  { value: "all", ar: "الكل", en: "All" },
  { value: "submission", ar: "طلبات", en: "Requests" },
  { value: "client", ar: "عملاء", en: "Clients" },
  { value: "index", ar: "فهرس", en: "Index" },
];

export function ControlArchive({ token }: { token: string }) {
  const { lang } = useLang();
  const L = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const [kind, setKind] = useState("all");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const panel = useQuery(api.controlPanel.getControlPanel, { token });
  const log = useQuery(api.controlPanel.listArchive, { token, kind: kind === "all" ? undefined : kind });
  const results = useQuery(
    api.controlPanel.searchIndex,
    query.trim().length >= 2 ? { token, q: query.trim() } : "skip"
  );
  const buildIndex = useMutation(api.controlPanel.buildIndexNow);
  const runArchive = useMutation(api.controlPanel.runArchiveNow);

  const indexInfo: any = panel?.automation?.index ?? null;

  const grouped = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of (log ?? []) as any[]) map.set(row.kind, (map.get(row.kind) ?? 0) + 1);
    return map;
  }, [log]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label={L("عناصر مفهرسة", "Indexed items")}
          value={indexInfo?.count ?? 0}
          icon={<Layers className="h-5 w-5" />}
          accent="gold"
        />
        <StatCard
          label={L("كلمات مفتاحية", "Keywords")}
          value={indexInfo?.keys ?? 0}
          icon={<Search className="h-5 w-5" />}
          accent="sky"
        />
        <StatCard
          label={L("عمليات مؤرشفة", "Archive operations")}
          value={(log ?? []).length}
          icon={<Archive className="h-5 w-5" />}
          accent="violet"
        />
        <StatCard
          label={L("سجلات عملاء", "Client records")}
          value={grouped.get("client") ?? 0}
          icon={<Users2 className="h-5 w-5" />}
          accent="amber"
        />
      </div>

      <div className="card-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="inline-flex items-center gap-2 text-sm font-extrabold text-cream">
              <Search className="h-4 w-4 text-gold-400" />
              {L("الفهرسة والبحث الفوري", "Indexing & instant search")}
            </h3>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-300">
              {indexInfo?.builtAt
                ? L(`آخر بناء للفهرس: ${formatDateTime(indexInfo.builtAt)} — يُحدَّث تلقائياً مع كل أرشفة.`, `Index last built: ${formatDateTime(indexInfo.builtAt)} — refreshed automatically with every archive.`)
                : L("لم يُبنَ الفهرس بعد — اضغط «بناء فهرس المنصة» لتفعيل البحث الفوري في كل الطلبات والإعلانات والعروض.", "Index not built yet — press “Rebuild platform index” to enable instant search across all requests, ads and offers.")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="gold"
              loading={busy === "index"}
              onClick={async () => {
                setBusy("index");
                setMessage("");
                try {
                  const result = await buildIndex({ token });
                  setMessage(L(`فُهرس ${result.indexed} عنصراً · ${result.keys} كلمة`, `Indexed ${result.indexed} items · ${result.keys} keywords`));
                } finally {
                  setBusy(null);
                }
              }}
            >
              <Layers className="h-4 w-4" />
              {L("بناء فهرس المنصة", "Rebuild platform index")}
            </Button>
            <Button
              variant="ghost"
              loading={busy === "archive"}
              onClick={async () => {
                setBusy("archive");
                setMessage("");
                try {
                  const result = await runArchive({ token });
                  setMessage(
                    L(
                      `أُرشف ${result.archived} عنصراً · ${result.files} ملف إلى القنوات · ${result.recaps} سجل عميل`,
                      `Archived ${result.archived} items · ${result.files} files to channels · ${result.recaps} client records`
                    )
                  );
                } finally {
                  setBusy(null);
                }
              }}
            >
              <Archive className="h-4 w-4" />
              {L("أرشفة المستحق الآن", "Archive expired now")}
            </Button>
          </div>
        </div>
        {message && <p className="mt-2 text-[11px] font-bold text-gold-300">{message}</p>}

        <div className="relative mt-4">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={L("ابحث في فهرس المنصة: اسم، تخصص، مدينة، منتج، رقم هاتف...", "Search the platform index: name, profession, city, product, phone...")}
            className="!pr-9"
          />
        </div>

        {query.trim().length >= 2 && (
          <div className="mt-3 space-y-2">
            {!results ? (
              <div className="flex justify-center py-6 text-gold-400">
                <Spinner className="h-6 w-6" />
              </div>
            ) : results.results.length === 0 ? (
              <p className="py-4 text-center text-[11px] font-bold text-ink-400">
                {L("لا نتائج في الفهرس — جرّب كلمات أخرى", "No index results — try other keywords")}
              </p>
            ) : (
              results.results.map((row: any) => (
                <div key={`${row.kind}-${row.id}`} className="rounded-xl border border-ink-700/50 bg-ink-800/40 px-3.5 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-[12px] font-extrabold text-cream">
                      <Badge className="mr-2 border-ink-600/60 bg-ink-900/60 text-ink-300">{row.kind}</Badge>
                      {row.title}
                    </p>
                    <span className="shrink-0 text-[10px] font-bold text-gold-300">
                      {row.hits} {L("مطابقة", "hits")}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-ink-300">
                    {row.name} {row.phone ? `· ${row.phone}` : ""} · {timeAgo(row.createdAt)}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {(row.keys ?? []).slice(0, 8).map((key: string) => (
                      <span key={key} className="chip !py-0.5 !text-[10px]">{key}</span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="card-surface p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="inline-flex items-center gap-2 text-sm font-extrabold text-cream">
            <Archive className="h-4 w-4 text-gold-400" />
            {L("سجل الأرشفة الكامل", "Full archive log")}
          </h3>
          <div className="flex flex-wrap gap-2">
            {ARCHIVE_KINDS.map((option) => (
              <button
                key={option.value}
                onClick={() => setKind(option.value)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors",
                  kind === option.value
                    ? "bg-gold-500 text-ink-950"
                    : "border border-ink-600/60 text-ink-300 hover:border-gold-500/50"
                )}
              >
                {lang === "ar" ? option.ar : option.en}
              </button>
            ))}
          </div>
        </div>
        {!log ? (
          <div className="flex justify-center py-10 text-gold-400">
            <Spinner className="h-7 w-7" />
          </div>
        ) : log.length === 0 ? (
          <EmptyState title={L("لا توجد عمليات أرشفة", "No archive operations")} hint={L("ستُقيَّد هنا كل عملية أرشفة أو فهرسة", "Every archive or index operation will be logged here")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-right text-[12px]">
              <thead>
                <tr className="border-b border-ink-700/60 text-[11px] text-ink-400">
                  <th className="py-2">{L("النوع", "Kind")}</th>
                  <th className="py-2">{L("العنصر", "Item")}</th>
                  <th className="py-2">{L("السبب", "Reason")}</th>
                  <th className="py-2">{L("الملفات", "Files")}</th>
                  <th className="py-2">{L("القنوات", "Channels")}</th>
                  <th className="py-2">{L("الوقت", "Time")}</th>
                </tr>
              </thead>
              <tbody>
                {(log as any[]).map((row) => (
                  <tr key={row._id} className="border-b border-ink-800/60">
                    <td className="py-2">
                      <Badge className="border-ink-600/60 bg-ink-800/60 text-ink-200">{row.kind}</Badge>
                    </td>
                    <td className="max-w-64 truncate py-2 font-bold text-cream">{row.title}</td>
                    <td className="py-2 text-[11px] text-ink-300">{row.reason}</td>
                    <td className="py-2 text-gold-300">{row.files}</td>
                    <td className="py-2 text-[11px] text-emerald-300">
                      {(row.channels ?? []).length > 0 ? row.channels.join(" · ") : "—"}
                    </td>
                    <td className="py-2 text-[11px] text-ink-400">{formatDateTime(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────── 3. أرشيف وتقييم مقدمي التوظيف ─────────────────────── */

export function ControlRatings({ token }: { token: string }) {
  const { lang } = useLang();
  const L = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const [search, setSearch] = useState("");
  const [minStars, setMinStars] = useState(0);
  const [busy, setBusy] = useState(false);

  const stats = useQuery(api.employers.getRatingStats, { token });
  const ratings = useQuery(api.employers.listRatings, {
    token,
    search: search.trim() || undefined,
    minStars: minStars > 0 ? minStars : undefined,
  });
  const setRating = useMutation(api.employers.setRating);
  const recalc = useMutation(api.employers.recalcNow);

  return (
    <div className="space-y-5">
      <div className="card-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="inline-flex items-center gap-2 text-sm font-extrabold text-cream">
              <Star className="h-4 w-4 text-gold-400" />
              {L("أرشيف مقدمي التوظيف — تقييم بالنجوم", "Employer archive — star rating")}
            </h3>
            <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-ink-300">
              {L(
                "يُقيَّم كل مقدم توظيف آلياً على المؤهلات (اكتمال البيانات) والخبرات (سنوات ومتطلبات) والموثوقية (نسبة الاعتماد + توثيق الرقم) والإنجاز (وظائف تم توظيفها). يمكن للإدارة تعديل التقييم يدوياً فيُحفظ ولا يُستبدل.",
                "Every employer is rated automatically on qualifications (data completeness), experience (years & requirements), reliability (approval rate + verified phone) and achievement (filled jobs). Admins may override manually and the override is preserved."
              )}
            </p>
          </div>
          <Button
            variant="gold"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await recalc({ token });
              } finally {
                setBusy(false);
              }
            }}
          >
            <RefreshCw className="h-4 w-4" />
            {L("إعادة الاحتساب", "Recalculate")}
          </Button>
        </div>

        {stats && (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            <StatCard label={L("عدد المقيَّمين", "Rated employers")} value={stats.total} icon={<Users2 className="h-5 w-5" />} />
            <StatCard label={L("متوسط التقييم", "Average rating")} value={stats.average.toFixed(1)} icon={<Star className="h-5 w-5" />} accent="gold" />
            <StatCard label={L("وظائف تم توظيفها", "Jobs filled")} value={stats.filled} icon={<BadgeCheck className="h-5 w-5" />} accent="emerald" />
            <StatCard label={L("تقييم يدوي", "Manual overrides")} value={stats.manual} icon={<Zap className="h-5 w-5" />} accent="violet" />
            <StatCard
              label={L("نجوم كاملة (5)", "Five-star employers")}
              value={stats.buckets["5"] ?? 0}
              icon={<Trophy className="h-5 w-5" />}
              accent="sky"
            />
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={L("ابحث باسم المنشأة أو رقم الهاتف...", "Search by employer name or phone...")}
              className="!pr-9"
            />
          </div>
          <Select value={String(minStars)} onChange={(event) => setMinStars(Number(event.target.value))} className="!w-auto">
            <option value="0">{L("كل التقييمات", "All ratings")}</option>
            <option value="3">{L("3 نجوم وأعلى", "3 stars and up")}</option>
            <option value="4">{L("4 نجوم وأعلى", "4 stars and up")}</option>
            <option value="5">{L("5 نجوم فقط", "5 stars only")}</option>
          </Select>
        </div>
      </div>

      {!ratings ? (
        <div className="flex justify-center py-16 text-gold-400">
          <Spinner className="h-8 w-8" />
        </div>
      ) : ratings.length === 0 ? (
        <EmptyState
          title={L("لا يوجد مقدمو توظيف مقيَّمون بعد", "No rated employers yet")}
          hint={L("يُبنى الأرشيف تلقائياً من طلبات التوظيف المنشورة", "The archive builds automatically from published job requests")}
        />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {ratings.map((row: any) => (
            <div key={row._id} className="card-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-extrabold text-cream">{row.name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-ink-300">
                    <span dir="ltr">{row.phone}</span>
                    {row.verified && (
                      <span className="inline-flex items-center gap-1 text-emerald-300">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        {L("رقم موثق", "Verified")}
                      </span>
                    )}
                    {row.manual && (
                      <span className="inline-flex items-center gap-1 text-violet-300">
                        <Zap className="h-3.5 w-3.5" />
                        {L("تقييم يدوي", "Manual")}
                      </span>
                    )}
                  </p>
                </div>
                <Stars value={row.stars} />
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  { label: L("المؤهلات", "Qualifications"), value: row.qualifications },
                  { label: L("الخبرات", "Experience"), value: row.experience },
                  { label: L("الموثوقية", "Reliability"), value: row.reliability },
                ].map((metric) => (
                  <div key={metric.label}>
                    <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-ink-300">
                      <span>{metric.label}</span>
                      <span className="text-gold-300">{Math.round((metric.value ?? 0) * 100)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-ink-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-l from-gold-600/50 to-gold-300"
                        style={{ width: `${Math.round((metric.value ?? 0) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="chip">{L("وظائف معلنة", "Jobs posted")}: <b className="text-cream">{row.jobsPosted}</b></span>
                <span className="chip">{L("تم توظيفها", "Filled")}: <b className="text-emerald-300">{row.jobsFilled}</b></span>
                <span className="chip">{L("النتيجة", "Score")}: <b className="text-gold-300">{row.score}%</b></span>
                <span className="chip">{L("آخر تحديث", "Updated")}: <b className="text-cream">{timeAgo(row.updatedAt)}</b></span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-700/50 pt-3">
                <span className="text-[10px] font-bold text-ink-400">{L("تقييم يدوي:", "Set rating:")}</span>
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    onClick={() => setRating({ token, phone: row.phone, stars: value })}
                    className={cn(
                      "rounded-lg border px-2 py-1 text-[10px] font-bold transition-colors",
                      row.manual && row.stars === value
                        ? "border-gold-500/50 bg-gold-500/20 text-gold-200"
                        : "border-ink-600/60 text-ink-300 hover:border-gold-500/50 hover:text-gold-300"
                    )}
                  >
                    {value}★
                  </button>
                ))}
                <button
                  onClick={() => setRating({ token, phone: row.phone, stars: row.stars, resetToAuto: true })}
                  className="rounded-lg border border-ink-600/60 px-2.5 py-1 text-[10px] font-bold text-ink-300 transition-colors hover:border-sky-500/50 hover:text-sky-300"
                >
                  {L("عودة للتلقائي", "Back to auto")}
                </button>
                <a
                  href={whatsappLink(
                    row.phone,
                    L(
                      "بخصوص وظائف منشأتكم المنشورة على منصة ViP Yemen — لدينا كوادر مطابقة",
                      "Regarding your vacancies on ViP Yemen — we have matching candidates"
                    )
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mr-auto inline-flex items-center gap-1 text-[11px] font-bold text-[#4ade80] hover:underline"
                >
                  <MessageCircle className="h-3 w-3" />
                  {L("تواصل", "Contact")}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── 4. العملاء العائدون ─────────────────────────── */

export function ControlReturningClients({ token }: { token: string }) {
  const { lang } = useLang();
  const L = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const [search, setSearch] = useState("");
  const clients = useQuery(api.controlPanel.listReturningClients, { token });

  const rows = useMemo(() => {
    if (!clients) return [];
    const needle = search.trim().toLowerCase();
    if (!needle) return clients as any[];
    return (clients as any[]).filter(
      (row) => row.fullName.toLowerCase().includes(needle) || row.phone.includes(needle)
    );
  }, [clients, search]);

  return (
    <div className="space-y-5">
      <div className="card-surface p-5">
        <h3 className="inline-flex items-center gap-2 text-sm font-extrabold text-cream">
          <UserPlus className="h-4 w-4 text-gold-400" />
          {L("العملاء العائدون — تنشيط أو إضافة جديد", "Returning clients — reactivate or add new")}
        </h3>
        <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-ink-300">
          {L(
            "أي عميل أرسل عرضاً أو طلباً سابقاً تُحفظ ملفاته تلقائياً في قناة التلجرام، وعند أي إرسال جديد يُشعره النظام فوراً أنه عميل سابق: يكفي أن ينشّط طلبه السابق أو يضيف جديداً غير ما أُرسل سابقاً — دون إعادة كل شيء.",
            "Any client who previously sent an offer or request has their files archived automatically in the Telegram channel, and on any new submission the system instantly informs them they are a returning client: they only need to reactivate the previous request or add something new — no need to resend everything."
          )}
        </p>
        <div className="relative mt-4">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={L("ابحث بالاسم أو رقم الهاتف...", "Search by name or phone...")}
            className="!pr-9"
          />
        </div>
      </div>

      {!clients ? (
        <div className="flex justify-center py-16 text-gold-400">
          <Spinner className="h-8 w-8" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title={L("لا يوجد عملاء عائدون بعد", "No returning clients yet")}
          hint={L("يظهر هنا كل عميل أرسل أكثر من طلب", "Every client with more than one request appears here")}
        />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {rows.map((row: any) => (
            <div key={row.id} className="card-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-extrabold text-cream">{row.fullName}</p>
                  <p className="mt-0.5 text-[11px] text-ink-300" dir="ltr">{row.phone}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-300">
                    {L("عميل سابق", "Returning")} · {row.submissionCount}
                  </Badge>
                  {row.stars !== undefined && <Stars value={row.stars} />}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {row.lastSubmissionTitle && (
                  <span className="chip">
                    {L("آخر طلب", "Last request")}: <b className="text-cream">{row.lastSubmissionTitle}</b>
                  </span>
                )}
                <span className="chip">
                  {L("آخر إرسال", "Last submit")}: <b className="text-cream">{timeAgo(row.lastSubmissionAt)}</b>
                </span>
                <span className="chip !border-emerald-500/30 !bg-emerald-500/10 !text-emerald-300">
                  {L("ملفات مؤرشفة", "Archived files")}: <b>{row.archivedFiles}</b>
                </span>
                {row.archivedAt && (
                  <span className="chip">
                    {L("أُرشف في", "Archived at")}: <b className="text-cream">{formatDateTime(row.archivedAt)}</b>
                  </span>
                )}
                {row.returningNotifiedAt && (
                  <span className="chip">
                    {L("أُشعر بأنه عميل سابق", "Notified of returning status")}: <b className="text-cream">{timeAgo(row.returningNotifiedAt)}</b>
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-700/50 pt-3">
                <a
                  href={whatsappLink(
                    row.phone,
                    L(
                      `مرحباً ${row.fullName}، أنت عميل سابق في منصة ViP Yemen ولديك ${row.submissionCount} طلبات محفوظة (${row.archivedFiles} ملف في قناة المنصة). يكفي أن تُنشّط طلبك السابق أو تُضيف جديداً غير ما أرسلت سابقاً.`,
                      `Hello ${row.fullName}, you are a returning client on ViP Yemen with ${row.submissionCount} saved requests (${row.archivedFiles} files in our channel). You only need to reactivate your previous request or add something new.`
                    )
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#25d366]/15 px-3 py-1.5 text-[11px] font-black text-[#4ade80] transition-colors hover:bg-[#25d366]/25"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  {L("تذكير: تنشيط أو إضافة جديد", "Reminder: reactivate or add new")}
                </a>
                <span className="text-[11px] text-ink-400">
                  {L("المصدر", "Source")}: {row.category ?? L("غير محدد", "unspecified")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
