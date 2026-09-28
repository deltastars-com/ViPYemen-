/**
 * 🎛️ لوحة الكنترول الاحترافية الشاملة — ViP Yemen
 *
 * واجهة واحدة تدمج: التحليلات الكاملة · الأتمتة الشاملة · الأرشفة · الفهرسة ·
 * التوافق والمطابقة · التنبيهات الحية · تقييم مقدمي التوظيف · العملاء العائدون.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Activity,
  AlertTriangle,
  Archive,
  BarChart3,
  CheckCircle2,
  Clock,
  Gauge,
  Layers,
  MessageCircle,
  Radio,
  RefreshCw,
  Search,
  Send,
  Server,
  SlidersHorizontal,
  Star,
  Target,
  Users2,
  Workflow,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Badge, Button, EmptyState, Input, Select, Spinner, StatCard, Textarea } from "@/components/ui";
import { cn, formatDateTime, timeAgo, whatsappLink } from "@/lib/utils";
import { getCategory } from "@/lib/categories";
import { useLang } from "@/lib/i18n";
import {
  ControlArchive,
  ControlMatching,
  ControlRatings,
  ControlReturningClients,
} from "@/components/admin/AdminIntelligence";

export type ControlSection =
  | "analytics"
  | "automation"
  | "archive"
  | "matching"
  | "notices"
  | "ratings"
  | "returning";

const CHANNEL_LABELS: Record<string, (L: (ar: string, en: string) => string) => string> = {
  telegram: (L) => L("قناة التلجرام", "Telegram channel"),
  whatsapp: (L) => L("قناة واتساب (بث Cloud API)", "WhatsApp channel (Cloud API broadcast)"),
  facebook_page: (L) => L("صفحة فيسبوك", "Facebook page"),
  facebook_group: (L) => L("مجموعة فيسبوك", "Facebook group"),
};

const NOTICE_STYLES: Record<string, string> = {
  vacant: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  hired: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  available: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  sold: "border-violet-500/40 bg-violet-500/10 text-violet-300",
  active: "border-gold-500/40 bg-gold-500/10 text-gold-300",
  scheduled: "border-ink-500/40 bg-ink-800/60 text-ink-200",
  paused: "border-rose-500/40 bg-rose-500/10 text-rose-300",
};

export function AdminControl({ token }: { token: string }) {
  const { lang } = useLang();
  const L = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const [section, setSection] = useState<ControlSection>("analytics");

  const sections: { key: ControlSection; label: string; icon: typeof Gauge }[] = [
    { key: "analytics", label: L("التحليلات الكاملة", "Full analytics"), icon: BarChart3 },
    { key: "automation", label: L("الأتمتة الشاملة", "Full automation"), icon: Workflow },
    { key: "matching", label: L("التوافق والمطابقة", "Matching & fit"), icon: Target },
    { key: "notices", label: L("التنبيهات الحية", "Live notices"), icon: Radio },
    { key: "archive", label: L("الأرشفة والفهرسة", "Archive & index"), icon: Archive },
    { key: "ratings", label: L("تقييم مقدمي التوظيف", "Employer ratings"), icon: Star },
    { key: "returning", label: L("العملاء العائدون", "Returning clients"), icon: Users2 },
  ];

  return (
    <div className="space-y-5">
      <div className="card-surface flex flex-wrap items-center gap-2 p-3">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-gold-500/30 bg-gold-500/10 px-2.5 py-1.5 text-[11px] font-black text-gold-300">
          <Gauge className="h-3.5 w-3.5" />
          {L("لوحة الكنترول", "Control panel")}
        </span>
        {sections.map((item) => (
          <button
            key={item.key}
            onClick={() => setSection(item.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
              section === item.key
                ? "bg-gold-500 text-ink-950"
                : "border border-ink-600/60 text-ink-300 hover:border-gold-500/50 hover:text-cream"
            )}
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        ))}
      </div>

      {section === "analytics" && <ControlAnalytics token={token} />}
      {section === "automation" && <ControlAutomation token={token} />}
      {section === "matching" && <ControlMatching token={token} />}
      {section === "notices" && <ControlNotices token={token} />}
      {section === "archive" && <ControlArchive token={token} />}
      {section === "ratings" && <ControlRatings token={token} />}
      {section === "returning" && <ControlReturningClients token={token} />}
    </div>
  );
}

/* ─────────────────────────── 1. التحليلات الكاملة ─────────────────────────── */

const CATEGORY_LABELS: Record<string, { ar: string; en: string }> = {
  jobs: { ar: "التوظيف", en: "Jobs" },
  real_estate: { ar: "العقارات", en: "Real Estate" },
  emarket: { ar: "التسويق الإلكتروني", en: "E-Marketing" },
  software: { ar: "البرمجيات", en: "Software" },
};

function ControlAnalytics({ token }: { token: string }) {
  const { lang } = useLang();
  const L = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const data = useQuery(api.controlPanel.getControlPanel, { token });
  const matchStats = useQuery(api.matching.getMatchStats, { token });

  const maxTimeline = useMemo(
    () => Math.max(1, ...(data?.timeline ?? []).map((point) => point.count)),
    [data]
  );

  if (!data) {
    return (
      <div className="flex justify-center py-20 text-gold-400">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const { totals, rates, notices } = data;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <StatCard label={L("إجمالي الطلبات", "Total requests")} value={totals.submissions} icon={<Layers className="h-5 w-5" />} />
        <StatCard label={L("قيد المراجعة", "In review")} value={totals.pending} icon={<Clock className="h-5 w-5" />} accent="amber" />
        <StatCard label={L("شاغرة على الواجهة", "Open vacancies")} value={notices.vacant} icon={<Radio className="h-5 w-5" />} accent="emerald" />
        <StatCard label={L("تم التوظيف", "Hired")} value={notices.hired} icon={<CheckCircle2 className="h-5 w-5" />} accent="sky" />
        <StatCard label={L("متاح للبيع/التأجير", "Available")} value={notices.available} icon={<Target className="h-5 w-5" />} accent="gold" />
        <StatCard label={L("تم البيع", "Sold")} value={notices.sold} icon={<CheckCircle2 className="h-5 w-5" />} accent="violet" />
        <StatCard label={L("المؤرشف", "Archived")} value={totals.archived} icon={<Archive className="h-5 w-5" />} />
        <StatCard label={L("العملاء", "Clients")} value={totals.clients} icon={<Users2 className="h-5 w-5" />} accent="violet" />
        <StatCard label={L("عملاء عائدون", "Returning clients")} value={totals.returningClients} icon={<RefreshCw className="h-5 w-5" />} accent="amber" />
        <StatCard label={L("مطابقات مرشحة", "Match suggestions")} value={totals.matchSuggestions} icon={<Target className="h-5 w-5" />} accent="emerald" />
        <StatCard label={L("مقدمو التوظيف", "Employers")} value={totals.employers} icon={<Star className="h-5 w-5" />} accent="gold" />
        <StatCard label={L("ملفات في الطابور", "Files queued")} value={totals.files} icon={<Server className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card-surface p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="inline-flex items-center gap-2 text-sm font-extrabold text-cream">
              <Activity className="h-4 w-4 text-gold-400" />
              {L("الطلبات الواردة — 14 يوماً", "Incoming requests — 14 days")}
            </h3>
            <span className="text-[11px] font-bold text-ink-400">
              {L("آخر تحديث", "Updated")}: {formatDateTime(data.generatedAt)}
            </span>
          </div>
          <div className="flex h-40 items-end gap-1.5">
            {data.timeline.map((point) => (
              <div key={point.day} className="group flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-ink-400 opacity-0 transition-opacity group-hover:opacity-100">
                  {point.count}
                </span>
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-gold-600/40 to-gold-300"
                  style={{ height: `${Math.max(4, (point.count / maxTimeline) * 100)}%` }}
                />
                <span className="text-[9px] text-ink-500">
                  {new Date(point.day).getDate()}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-surface space-y-3 p-5">
          <h3 className="text-sm font-extrabold text-cream">{L("مؤشرات الأداء", "Performance rates")}</h3>
          {[
            { label: L("نسبة الاعتماد والتدقيق", "Approval & review rate"), value: rates.approval, accent: "from-emerald-500/40 to-emerald-300" },
            { label: L("نسبة الإنجاز (توظيف/بيع)", "Completion rate"), value: rates.closeRate, accent: "from-sky-500/40 to-sky-300" },
            { label: L("الأرقام الموثقة", "Verified numbers"), value: rates.verified, accent: "from-gold-500/40 to-gold-300" },
            { label: L("تسليم الملفات للقنوات", "File delivery to channels"), value: rates.fileDelivery, accent: "from-violet-500/40 to-violet-300" },
            { label: L("المفهرسة من المنشورات", "Indexed listings"), value: rates.indexed, accent: "from-amber-500/40 to-amber-300" },
          ].map((row) => (
            <div key={row.label}>
              <div className="mb-1 flex items-center justify-between text-[11px] font-bold">
                <span className="text-ink-200">{row.label}</span>
                <span className="text-gold-300">{row.value}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-ink-800">
                <div className={cn("h-full rounded-full bg-gradient-to-l", row.accent)} style={{ width: `${Math.min(100, row.value)}%` }} />
              </div>
            </div>
          ))}
          {matchStats && (
            <div className="rounded-xl border border-ink-700/50 bg-ink-800/40 p-3 text-[11px] font-bold text-ink-200">
              <p className="mb-1 text-cream">
                <Target className="mb-0.5 ml-1 inline h-3.5 w-3.5 text-gold-400" />
                {L("محرك التوافق", "Matching engine")}
              </p>
              <p>
                {L("أعلى نسبة", "Best")}: <b className="text-emerald-300">{matchStats.top}%</b> ·{" "}
                {L("المتوسط", "Average")}: <b className="text-gold-300">{matchStats.average}%</b>
              </p>
              <p className="mt-0.5 text-ink-300">
                {L("جديدة", "New")}: {matchStats.counts.new ?? 0} · {L("مُبلَّغ عنها", "Notified")}: {matchStats.counts.notified ?? 0} ·{" "}
                {L("جاري التواصل", "Contacted")}: {matchStats.counts.contacted ?? 0} · {L("مكتملة", "Matched")}: {matchStats.counts.matched ?? 0}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="card-surface p-5">
        <h3 className="mb-4 text-sm font-extrabold text-cream">{L("الحالة التفصيلية لكل قسم", "Detailed state per section")}</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-right text-[12px]">
            <thead>
              <tr className="border-b border-ink-700/60 text-[11px] text-ink-400">
                <th className="py-2">{L("القسم", "Section")}</th>
                <th className="py-2">{L("الإجمالي", "Total")}</th>
                <th className="py-2">{L("قيد المراجعة", "In review")}</th>
                <th className="py-2">{L("مفتوح", "Open")}</th>
                <th className="py-2">{L("مكتمل", "Completed")}</th>
                <th className="py-2">{L("مؤرشف", "Archived")}</th>
                <th className="py-2">{L("مطابقات", "Matches")}</th>
              </tr>
            </thead>
            <tbody>
              {data.byCategory.map((row) => (
                <tr key={row.category} className="border-b border-ink-800/60 text-ink-200">
                  <td className="py-2 font-bold text-cream">
                    <span className="mb-0.5 ml-1 inline-block h-2 w-2 rounded-full bg-gold-400" />
                    {CATEGORY_LABELS[row.category]?.[lang] ?? getCategory(row.category).label}
                  </td>
                  <td className="py-2">{row.total}</td>
                  <td className="py-2 text-amber-300">{row.pending}</td>
                  <td className="py-2 text-emerald-300">{row.open}</td>
                  <td className="py-2 text-sky-300">{row.closed}</td>
                  <td className="py-2 text-ink-300">{row.archived}</td>
                  <td className="py-2 text-gold-300">{row.matches}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── 2. الأتمتة الشاملة ─────────────────────────── */

function ControlAutomation({ token }: { token: string }) {
  const { lang } = useLang();
  const L = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const data = useQuery(api.controlPanel.getControlPanel, { token });
  const runMatch = useMutation(api.matching.runMatchNow);
  const runArchive = useMutation(api.controlPanel.runArchiveNow);
  const buildIndex = useMutation(api.controlPanel.buildIndexNow);
  const recalcRatings = useMutation(api.employers.recalcNow);
  const publishNotice = useMutation(api.controlPanel.publishLiveNotice);
  const requestChannelCheck = useMutation(api.channelPush.requestChannelCheck);
  // 🩺 صحة قنوات المنصة — فحص آلي كل 6 ساعات أو بضغطة من اللوحة
  const channelHealth = useQuery(api.channelPush.getChannelHealth, { token });

  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeBody, setNoticeBody] = useState("");

  async function run(key: string, work: () => Promise<unknown>, label: string) {
    setBusy(key);
    setMessage("");
    try {
      await work();
      setMessage(`${label} ✓`);
    } catch (error: any) {
      setMessage(`${label} — ${error?.message ?? L("فشل التنفيذ", "failed")}`);
    } finally {
      setBusy(null);
    }
  }

  if (!data) {
    return (
      <div className="flex justify-center py-20 text-gold-400">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const automation = data.automation;

  return (
    <div className="space-y-5">
      <div className="card-surface p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="inline-flex items-center gap-2 text-sm font-extrabold text-cream">
            <Workflow className="h-4 w-4 text-gold-400" />
            {L("أوامر الأتمتة الفورية", "Instant automation commands")}
          </h3>
          {message && <span className="text-[11px] font-bold text-gold-300">{message}</span>}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Button variant="gold" loading={busy === "match"} onClick={() => run("match", () => runMatch({ token }), L("تشغيل محرك التوافق", "Run matching"))}>
            <Target className="h-4 w-4" />
            {L("تشغيل محرك التوافق", "Run matching engine")}
          </Button>
          <Button variant="ghost" loading={busy === "archive"} onClick={() => run("archive", () => runArchive({ token }), L("أرشفة الآن", "Archive now"))}>
            <Archive className="h-4 w-4" />
            {L("أرشفة المستحق الآن", "Archive expired now")}
          </Button>
          <Button variant="ghost" loading={busy === "index"} onClick={() => run("index", () => buildIndex({ token }), L("بناء الفهرس", "Build index"))}>
            <Layers className="h-4 w-4" />
            {L("بناء فهرس المنصة", "Rebuild platform index")}
          </Button>
          <Button variant="ghost" loading={busy === "ratings"} onClick={() => run("ratings", () => recalcRatings({ token }), L("تحديث التقييمات", "Refresh ratings"))}>
            <Star className="h-4 w-4" />
            {L("إعادة تقييم مقدمي التوظيف", "Recalculate employer ratings")}
          </Button>
        </div>
        {automation.stalePending > 0 && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] font-bold text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5" />
            {L(
              `${automation.stalePending} طلبات معلقة منذ أكثر من 7 أيام — تحتاج قراراً`,
              `${automation.stalePending} requests pending for 7+ days — a decision is needed`
            )}
          </p>
        )}
        {automation.archiveDueIn !== null && (
          <p className="mt-3 mr-2 inline-flex items-center gap-2 rounded-xl border border-ink-600/60 bg-ink-800/50 px-3 py-2 text-[11px] font-bold text-ink-200">
            <Clock className="h-3.5 w-3.5" />
            {L(
              `أقرب أرشفة تلقائية بعد ${automation.archiveDueIn} يوماً (سياسة ${data.policy.publishedArchiveDays} يوماً للنشر)`,
              `Next automatic archive in ${automation.archiveDueIn} days (policy: ${data.policy.publishedArchiveDays} days)`
            )}
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="card-surface p-5">
          <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-extrabold text-cream">
            <Server className="h-4 w-4 text-gold-400" />
            {L("طابور الملفات إلى القنوات", "File queue to channels")}
          </h3>
          <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
            {Object.entries(automation.fileStates).map(([state, count]) => (
              <div key={state} className="rounded-lg border border-ink-700/50 bg-ink-800/40 px-3 py-2 text-ink-200">
                <span className="text-ink-400">{state}</span>
                <p className="text-lg font-extrabold text-cream">{count}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
            {L(
              "الملفات تُوجَّه تلقائياً إلى قناة التلجرام ثم تُحرَّر من التخزين المحلي — لا يتوقف التطبيق أبداً.",
              "Files are forwarded automatically to the Telegram channel and then released from local storage — the app never stalls."
            )}
          </p>
        </div>

        <div className="card-surface p-5">
          <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-extrabold text-cream">
            <Target className="h-4 w-4 text-gold-400" />
            {L("محرك التوافق والترشيح", "Matching & ranking engine")}
          </h3>
          <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
            {["all", "new", "notified", "contacted", "matched", "closed"].map((state) => (
              <div key={state} className="rounded-lg border border-ink-700/50 bg-ink-800/40 px-3 py-2 text-ink-200">
                <span className="text-ink-400">{state}</span>
                <p className="text-lg font-extrabold text-cream">{automation.matchStates[state] ?? 0}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
            {L(
              `الحد الأدنى لقبول التطابق ${data.policy.minMatchScore}% — يُرشّح النظام الأفضل تلقائياً كل 5 دقائق.`,
              `Minimum accepted match is ${data.policy.minMatchScore}% — the engine ranks the best fit automatically every 5 minutes.`
            )}
          </p>
        </div>

        <div className="card-surface p-5">
          <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-extrabold text-cream">
            <Layers className="h-4 w-4 text-gold-400" />
            {L("الفهرس وسجل الأرشفة", "Index & archive log")}
          </h3>
          <p className="text-[11px] font-bold text-ink-200">
            {automation.index
              ? L(
                  `فُهرس ${(automation.index as any).count ?? 0} عنصراً · ${(automation.index as any).keys ?? 0} كلمة مفتاحية`,
                  `Indexed ${(automation.index as any).count ?? 0} items · ${(automation.index as any).keys ?? 0} keywords`
                )
              : L("لم يُبنَ الفهرس بعد — اضغط «بناء فهرس المنصة»", "Index not built yet — press “Rebuild platform index”")}
          </p>
          {automation.index?.builtAt && (
            <p className="mt-1 text-[11px] text-ink-400">{L("آخر بناء", "Last built")}: {timeAgo((automation.index as any).builtAt)}</p>
          )}
          <div className="mt-3 space-y-1.5">
            {automation.lastArchive.slice(0, 5).map((row: any) => (
              <div key={row._id} className="flex items-center justify-between gap-2 rounded-lg border border-ink-700/50 bg-ink-800/40 px-3 py-1.5 text-[11px]">
                <span className="truncate font-bold text-ink-200">
                  <Archive className="mb-0.5 ml-1 inline h-3 w-3 text-gold-400" />
                  {row.title}
                </span>
                <span className="shrink-0 text-ink-400">{row.reason}</span>
              </div>
            ))}
            {automation.lastArchive.length === 0 && (
              <p className="text-[11px] text-ink-400">{L("لا توجد عمليات أرشفة بعد", "No archive operations yet")}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="inline-flex items-center gap-2 text-sm font-extrabold text-cream">
              <Radio className="h-4 w-4 text-gold-400" />
              {L("حالة قنوات المنصة", "Platform channels status")}
            </h3>
            <Button
              variant="ghost"
              className="!px-3 !py-1.5 text-[11px]"
              loading={busy === "channels"}
              onClick={() =>
                run(
                  "channels",
                  () => requestChannelCheck({ token }),
                  L("فحص القنوات", "Channel check")
                )
              }
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {L("فحص الآن", "Check now")}
            </Button>
          </div>
          {channelHealth && channelHealth.rows.length > 0 ? (
            <div className="space-y-2 text-[11px] font-bold">
              {channelHealth.rows.map((row) => (
                <div
                  key={row.channel}
                  className="rounded-lg border border-ink-700/50 bg-ink-800/40 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-ink-200">
                      {CHANNEL_LABELS[row.channel]?.(L) ?? row.channel}
                    </span>
                    <span
                      className={cn(
                        "shrink-0",
                        row.status === "ok"
                          ? "text-emerald-300"
                          : row.status === "degraded"
                            ? "text-amber-300"
                            : "text-rose-300"
                      )}
                    >
                      {row.status === "ok"
                        ? L("يعمل", "Live")
                        : row.status === "degraded"
                          ? L("جزئي", "Degraded")
                          : L("متوقف", "Down")}
                      {row.latencyMs !== null && (
                        <span className="mr-1 text-ink-400"> · {row.latencyMs}ms</span>
                      )}
                    </span>
                  </div>
                  {row.detail && (
                    <p className="mt-1 font-normal leading-relaxed text-ink-400">{row.detail}</p>
                  )}
                </div>
              ))}
              <p className="text-[11px] font-normal text-ink-400">
                {L(
                  `آخر فحص آلي: ${channelHealth.checkedAt ? formatDateTime(channelHealth.checkedAt) : "—"} · ${channelHealth.healthy}/${channelHealth.total} قناة تعمل — الفحص يتكرر تلقائياً كل 6 ساعات، وأي رسالة تفشل تُعاد إرسالها تلقائياً حتى 5 محاولات.`,
                  `Last automatic check: ${channelHealth.checkedAt ? formatDateTime(channelHealth.checkedAt) : "—"} · ${channelHealth.healthy}/${channelHealth.total} channels live — checks repeat automatically every 6 hours, and any failed post is retried up to 5 times.`
                )}
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-ink-400">
              {L(
                "لم يُسجَّل فحص بعد — اضغط «فحص الآن» ليتحقق النظام فعلياً من تلجرام وواتساب وصفحة/مجموعة فيسبوك ويسجّل النتيجة.",
                "No check recorded yet — press “Check now” to verify Telegram, WhatsApp and the Facebook page/group for real."
              )}
            </p>
          )}
        </div>

        <div className="card-surface p-5">
          <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-extrabold text-cream">
            <Send className="h-4 w-4 text-gold-400" />
            {L("بثّ تنبيه حي إلى كل القنوات", "Broadcast a live notice to all channels")}
          </h3>
          <div className="space-y-2">
            <Input value={noticeTitle} onChange={(event) => setNoticeTitle(event.target.value)} placeholder={L("عنوان التنبيه", "Notice title")} />
            <Textarea
              value={noticeBody}
              onChange={(event) => setNoticeBody(event.target.value)}
              placeholder={L("نص التنبيه الذي سيُنشر على قنوات المنصة", "Notice body that will be published to the platform channels")}
            />
            <Button
              variant="gold"
              className="w-full"
              loading={busy === "notice"}
              onClick={() =>
                run(
                  "notice",
                  async () => {
                    await publishNotice({ token, title: noticeTitle, message: noticeBody });
                    setNoticeTitle("");
                    setNoticeBody("");
                  },
                  L("نشر التنبيه", "Notice published")
                )
              }
            >
              <Send className="h-4 w-4" />
              {L("نشر التنبيه الآن", "Publish notice now")}
            </Button>
          </div>
        </div>
      </div>

      <div className="card-surface p-5">
        <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-extrabold text-cream">
          <Activity className="h-4 w-4 text-gold-400" />
          {L("سجل أحداث الأتمتة الأخيرة", "Recent automation events")}
        </h3>
        <div className="space-y-2">
          {automation.recentEvents.map((event: any) => (
            <div key={event._id} className="flex items-start justify-between gap-3 rounded-xl border border-ink-700/50 bg-ink-800/40 px-3.5 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-[12px] font-bold text-cream">{event.title}</p>
                <p className="text-[11px] leading-relaxed text-ink-300">{event.message}</p>
              </div>
              <span className="shrink-0 text-[10px] font-bold text-ink-400">{timeAgo(event.createdAt)}</span>
            </div>
          ))}
          {automation.recentEvents.length === 0 && (
            <EmptyState title={L("لا توجد أحداث بعد", "No events yet")} hint={L("ستظهر هنا كل عمليات الأتمتة", "Automation operations appear here")} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── 3. التنبيهات الحية ─────────────────────────── */

const NOTICE_FILTERS = [
  { value: "all", ar: "الكل", en: "All" },
  { value: "vacant", ar: "شاغرة", en: "Vacant" },
  { value: "hired", ar: "تم التوظيف", en: "Hired" },
  { value: "available", ar: "متاح", en: "Available" },
  { value: "sold", ar: "تم البيع", en: "Sold" },
  { value: "active", ar: "إعلانات نشطة", en: "Active ads" },
  { value: "scheduled", ar: "إعلانات مجدولة", en: "Scheduled ads" },
];

function ControlNotices({ token }: { token: string }) {
  const { lang } = useLang();
  const L = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const [state, setState] = useState("all");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const notices = useQuery(api.controlPanel.listLiveNotices, {
    token,
    state: state === "all" ? undefined : state,
    category: category === "all" ? undefined : category,
  });
  const repush = useMutation(api.channelPush.repush);

  const rows = useMemo(() => {
    if (!notices) return [];
    const needle = search.trim().toLowerCase();
    if (!needle) return notices as any[];
    return (notices as any[]).filter(
      (row) =>
        row.title.toLowerCase().includes(needle) ||
        row.name.toLowerCase().includes(needle) ||
        row.phone.includes(needle)
    );
  }, [notices, search]);

  async function handleRepush(row: any) {
    if (row.kind === "offer" && row.state !== "available") return;
    setBusyId(row.id);
    try {
      await repush({ token, kind: row.kind, itemId: row.id });
    } catch (error: any) {
      alert(error?.message ?? L("تعذّرت إعادة النشر", "Re-push failed"));
    } finally {
      setBusyId(null);
    }
  }

  const counts = useMemo(() => {
    const base: Record<string, number> = {};
    for (const row of (notices ?? []) as any[]) base[row.state] = (base[row.state] ?? 0) + 1;
    return base;
  }, [notices]);

  return (
    <div className="space-y-4">
      <div className="card-surface p-4">
        <h3 className="mb-1 inline-flex items-center gap-2 text-sm font-extrabold text-cream">
          <Radio className="h-4 w-4 text-gold-400" />
          {L("ما هو معروض الآن على واجهات التطبيق", "What is live on the app surfaces right now")}
        </h3>
        <p className="text-[11px] leading-relaxed text-ink-300">
          {L(
            "كل طلب أو إعلان ما زال على الواجهة بحالته الدقيقة: شاغرة / تم التوظيف / متاح / تم البيع — مع القنوات التي وصل إليها وإمكانية إعادة النشر بضغطة.",
            "Every request or ad still on the platform with its exact state: Vacant / Hired / Available / Sold — with the channels it reached and one-click re-push."
          )}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {NOTICE_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setState(filter.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors",
                state === filter.value
                  ? "bg-gold-500 text-ink-950"
                  : "border border-ink-600/60 text-ink-300 hover:border-gold-500/50"
              )}
            >
              {lang === "ar" ? filter.ar : filter.en}
              {filter.value !== "all" && counts[filter.value] !== undefined && (
                <span className="mr-1.5 text-[10px] opacity-80">({counts[filter.value]})</span>
              )}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Select value={category} onChange={(event) => setCategory(event.target.value)} className="!w-auto">
            <option value="all">{L("كل الأقسام", "All sections")}</option>
            <option value="jobs">{L("التوظيف", "Jobs")}</option>
            <option value="real_estate">{L("العقارات", "Real estate")}</option>
            <option value="emarket">{L("التسويق الإلكتروني", "E-marketing")}</option>
            <option value="software">{L("البرمجيات", "Software")}</option>
            <option value="ads">{L("الإعلانات", "Ads")}</option>
            <option value="offers">{L("العروض", "Offers")}</option>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={L("بحث بالعنوان / الاسم / الهاتف...", "Search by title / name / phone...")}
              className="!pr-9"
            />
          </div>
        </div>
      </div>

      {!notices ? (
        <div className="flex justify-center py-16 text-gold-400">
          <Spinner className="h-8 w-8" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title={L("لا توجد تنبيهات مطابقة", "No matching notices")} hint={L("غيّر الفلاتر أو انشر عنصراً جديداً", "Change filters or publish a new item")} />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {rows.map((row: any) => (
            <div key={`${row.kind}-${row.id}`} className="card-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-extrabold text-cream">{row.title}</p>
                  <p className="mt-0.5 truncate text-[11px] text-ink-300">
                    {row.name} · {CATEGORY_LABELS[row.category]?.[lang] ?? (row.category === "ads" ? L("إعلان", "Ad") : row.category === "offers" ? L("عرض", "Offer") : getCategory(row.category).label)}
                  </p>
                </div>
                <Badge className={cn("shrink-0", NOTICE_STYLES[row.state] ?? "border-ink-600/60 bg-ink-800/60 text-ink-200")}>
                  {row.label}
                </Badge>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="chip">{L("عمر الإعلان", "Age")}: <b className="text-cream">{row.ageDays} {L("يوماً", "days")}</b></span>
                {row.matchScore !== undefined && (
                  <span className="chip">{L("أفضل توافق", "Best match")}: <b className="text-emerald-300">{row.matchScore}%</b></span>
                )}
                {row.channels?.length > 0 ? (
                  row.channels.map((channel: string) => (
                    <span key={channel} className="chip !border-emerald-500/30 !bg-emerald-500/10 !text-emerald-300">
                      ✓ {channel}
                    </span>
                  ))
                ) : (
                  <span className="chip !border-amber-500/30 !bg-amber-500/10 !text-amber-300">
                    {L("لم تُسجَّل قناة بعد", "No channel recorded yet")}
                  </span>
                )}
                {row.lastPush && (
                  <span className="chip">{L("آخر بث", "Last push")}: <b className="text-cream">{timeAgo(row.lastPush)}</b></span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <a
                  href={whatsappLink(row.phone, `${L("بخصوص", "Regarding")}: "${row.title}" — ViP Yemen`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#25d366]/15 px-3 py-1.5 text-[11px] font-black text-[#4ade80] transition-colors hover:bg-[#25d366]/25"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  {L("تواصل عبر واتساب", "Contact on WhatsApp")}
                </a>
                {row.kind !== "offer" && (
                  <Button
                    variant="ghost"
                    className="!px-3 !py-1.5 text-[11px]"
                    loading={busyId === row.id}
                    onClick={() => handleRepush(row)}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {L("إعادة بثّ للقنوات", "Re-push to channels")}
                  </Button>
                )}
                <a
                  href={row.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-ink-600/60 px-3 py-1.5 text-[11px] font-bold text-ink-200 transition-colors hover:border-gold-500/50 hover:text-gold-300"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  {L("عرض على الواجهة", "View on site")}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
