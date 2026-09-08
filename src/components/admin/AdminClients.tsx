import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../convex/_generated/dataModel";
import {
  Users2,
  Search,
  Trash2,
  UserPlus,
  MessageCircle,
  CheckCircle2,
  PhoneCall,
  XCircle,
  Clock4,
  ShieldCheck,
  BadgeCheck,
  KeyRound,
  Copy,
  ChevronDown,
  Save,
  Megaphone,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  Modal,
  Select,
  Spinner,
  Textarea,
} from "@/components/ui";
import { formatDateTime, whatsappLink, cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/categories";

const STATUS_META: Record<
  string,
  { label: string; chip: string; badge: string }
> = {
  pending: {
    label: "لم تتم بعد",
    chip: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    badge: "text-amber-300",
  },
  contacted: {
    label: "تم التواصل",
    chip: "border-sky-500/40 bg-sky-500/10 text-sky-300",
    badge: "text-sky-300",
  },
  resolved: {
    label: "تم الإنجاز",
    chip: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    badge: "text-emerald-300",
  },
  unreachable: {
    label: "لم يُستجب / مرفوض",
    chip: "border-rose-500/40 bg-rose-500/10 text-rose-300",
    badge: "text-rose-300",
  },
};

const SOURCE_LABELS: Record<string, string> = {
  submission: "طلب عبر المنصة",
  manual: "إدخال يدوي",
  whatsapp: "واتساب",
};

function categoryLabel(key?: string): string {
  if (!key) return "بدون قسم";
  return CATEGORIES.find((c) => c.key === key)?.shortLabel ?? key;
}

export function AdminClients({ token }: { token: string }) {
  const stats = useQuery(api.followups.getFollowupStats, { token });
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  const { fromTs, toTs } = useMemo(() => {
    const f = from ? new Date(`${from}T00:00:00`).getTime() : undefined;
    const t = to ? new Date(`${to}T23:59:59.999`).getTime() : undefined;
    return { fromTs: f, toTs: t };
  }, [from, to]);

  const rows = useQuery(api.followups.listFollowups, {
    token,
    status,
    category,
    search: search.trim() || undefined,
    from: fromTs,
    to: toTs,
  });

  const updateFollowup = useMutation(api.followups.updateFollowup);
  const deleteFollowup = useMutation(api.followups.deleteFollowup);

  const [busyId, setBusyId] = useState<string | null>(null);

  async function saveStatus(id: Id<"followups">, nextStatus: string, reason: string) {
    setBusyId(id);
    try {
      await updateFollowup({
        token,
        id,
        patch: { status: nextStatus, reason: reason.trim() || undefined },
      });
    } finally {
      setBusyId(null);
    }
  }

  async function saveNote(id: Id<"followups">, note: string) {
    setBusyId(id);
    try {
      await updateFollowup({ token, id, patch: { note: note.trim() || undefined } });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* ===== Quick stats ===== */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          { key: "all", icon: Users2, label: "كل العملاء", value: stats?.counts.all ?? 0, cls: "text-gold-300" },
          { key: "pending", icon: Clock4, label: "لم تتم بعد", value: stats?.counts.pending ?? 0, cls: "text-amber-300" },
          { key: "contacted", icon: PhoneCall, label: "تم التواصل", value: stats?.counts.contacted ?? 0, cls: "text-sky-300" },
          { key: "resolved", icon: CheckCircle2, label: "تم الإنجاز", value: stats?.counts.resolved ?? 0, cls: "text-emerald-300" },
          { key: "unreachable", icon: XCircle, label: "لم يُستجب", value: stats?.counts.unreachable ?? 0, cls: "text-rose-300" },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setStatus(s.key)}
            className={cn(
              "card-surface p-3 text-center transition-colors",
              status === s.key ? "border-gold-500/50 bg-gold-500/10" : "hover:border-gold-500/30"
            )}
          >
            <s.icon className={cn("mx-auto mb-1 h-4 w-4", s.cls)} />
            <p className={cn("text-lg font-black", s.cls)}>{s.value}</p>
            <p className="text-[10px] font-semibold text-ink-300">{s.label}</p>
          </button>
        ))}
      </div>

      {/* ===== Verification code generator ===== */}
      <CodeGenerator />

      {/* ===== Filters ===== */}
      <div className="card-surface flex flex-col gap-3 p-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>القسم</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">كل الأقسام</option>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.shortLabel}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>من تاريخ</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} dir="ltr" className="text-left" />
          </div>
          <div>
            <Label>إلى تاريخ</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} dir="ltr" className="text-left" />
          </div>
          <div>
            <Label>بحث</Label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="الاسم / الهاتف / الطلب..."
                className="!pr-9"
              />
            </div>
          </div>
        </div>
        <Button variant="ghost" className="shrink-0 !py-2.5 text-xs" onClick={() => setManualOpen(true)}>
          <UserPlus className="h-4 w-4 text-gold-400" />
          إضافة عميل يدوياً
        </Button>
      </div>

      {/* ===== Ledger ===== */}
      {!rows ? (
        <div className="flex justify-center py-16 text-gold-400">
          <Spinner className="h-8 w-8" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="لا يوجد عملاء في هذا النطاق"
          hint="غيّر الفلاتر، أو سجّل عميلاً يدوياً — تظهر كل الطلبات الواردة هنا تلقائياً"
        />
      ) : (
        <div className="space-y-3">
          {(rows as any[]).map((r) => {
            const st = STATUS_META[r.status] ?? STATUS_META.pending;
            const isOpen = expanded === r._id;
            return (
              <div key={r._id} className="card-surface overflow-hidden">
                <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", st.chip)}>
                      <Users2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-extrabold text-cream">{r.fullName}</h3>
                        <Badge className={st.chip}>{st.label}</Badge>
                        {r.source === "submission" && (
                          <Badge className="border-ink-600/60 bg-ink-800/60 text-ink-300">
                            <ShieldCheck className="h-3 w-3" /> {categoryLabel(r.category)}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-ink-300">
                        <span dir="ltr">{r.phone}</span>
                        {r.address ? ` · ${r.address}` : ""} · {SOURCE_LABELS[r.source] ?? r.source}
                        {r.submissionCount > 0 ? ` · ${r.submissionCount} طلب` : ""}
                        {r.lastSubmissionTitle ? ` · «${r.lastSubmissionTitle}»` : ""}
                      </p>
                      <p className="mt-0.5 text-[10px] font-bold text-ink-400">
                        آخر تحديث: {formatDateTime(r.updatedAt)} — أُنشئ: {formatDateTime(r.createdAt)}
                      </p>
                      {r.reason && (
                        <p className="mt-1 flex items-start gap-1 text-[11px] font-semibold text-rose-200/90">
                          <XCircle className="mt-0.5 h-3 w-3 shrink-0" />
                          السبب: {r.reason}
                        </p>
                      )}
                      {r.note && (
                        <p className="mt-1 flex items-start gap-1 text-[11px] text-ink-300">
                          <BadgeCheck className="mt-0.5 h-3 w-3 shrink-0 text-gold-400" />
                          {r.note}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusQuickActions
                      id={r._id}
                      current={r.status}
                      busy={busyId === r._id}
                      onSave={saveStatus}
                    />
                    <a
                      href={whatsappLink(r.phone, `مرحباً ${r.fullName}، منصة ViP Yemen — نتابع معك طلبك (${r.lastSubmissionTitle ?? "تواصل"}).`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-[#25d366]/15 px-2.5 py-1.5 text-[11px] font-black text-[#4ade80] hover:bg-[#25d366]/25"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> واتساب
                    </a>
                    <button
                      onClick={() => setExpanded(isOpen ? null : r._id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-ink-600/60 px-2.5 py-1.5 text-[11px] font-bold text-ink-200 hover:border-gold-500/50"
                    >
                      سجل وتفاصيل
                      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`حذف سجل العميل «${r.fullName}»؟`)) await deleteFollowup({ token, id: r._id });
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 px-2.5 py-1.5 text-[11px] font-bold text-rose-300 hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <ClientDetails
                    row={r}
                    busy={busyId === r._id}
                    onSaveNote={saveNote}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {manualOpen && (
        <ManualClientModal
          token={token}
          onClose={() => setManualOpen(false)}
        />
      )}
    </div>
  );
}

function StatusQuickActions({
  id,
  current,
  busy,
  onSave,
}: {
  id: Id<"followups">;
  current: string;
  busy: boolean;
  onSave: (id: Id<"followups">, status: string, reason: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(current);
  const [reason, setReason] = useState("");
  return (
    <div className="flex items-center gap-1.5">
      <Select
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="!w-auto !py-1.5 !text-[11px]"
      >
        <option value="pending">لم تتم بعد</option>
        <option value="contacted">تم التواصل</option>
        <option value="resolved">تم الإنجاز</option>
        <option value="unreachable">لم يُستجب</option>
      </Select>
      {draft !== current && (
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="السبب (اختياري)"
          className="input-app !w-40 !py-1.5 !text-[11px]"
        />
      )}
      <button
        onClick={() => onSave(id, draft, reason)}
        disabled={busy || draft === current}
        className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1.5 text-[11px] font-black text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-40"
        title="حفظ الحالة"
      >
        {busy ? <Spinner /> : <Save className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function ClientDetails({
  row,
  busy,
  onSaveNote,
}: {
  row: any;
  busy: boolean;
  onSaveNote: (id: Id<"followups">, note: string) => Promise<void>;
}) {
  const [note, setNote] = useState(row.note ?? "");
  const history = row.history ?? [];
  return (
    <div className="grid gap-4 border-t border-ink-700/50 bg-ink-950/40 p-4 md:grid-cols-2">
      <div>
        <Label>ملاحظة الجودة (داخلية)</Label>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="تفاصيل المتابعة مع العميل..." className="!min-h-20" />
        <Button
          variant="ghost"
          className="mt-2 !py-1.5 text-xs"
          loading={busy}
          onClick={async () => {
            await onSaveNote(row._id, note);
            setNote("");
          }}
        >
          <Save className="h-3.5 w-3.5 text-gold-400" />
          حفظ الملاحظة
        </Button>
      </div>
      <div>
        <Label>سجل المتابعة ({history.length})</Label>
        <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-ink-700/50 bg-ink-950/60 p-3">
          {history.length === 0 && (
            <p className="text-[11px] text-ink-400">لا يوجد سجل بعد.</p>
          )}
          {history
            .slice()
            .reverse()
            .slice(0, 30)
            .map((h: any, i: number) => (
              <p key={i} className="text-[10px] font-semibold leading-relaxed text-ink-400">
                <span className="text-gold-300/90">{formatDateTime(h.at)}</span> — {h.by}: {h.action}
                {h.note ? ` (${h.note})` : ""}
              </p>
            ))}
        </div>
      </div>
    </div>
  );
}

/** توليد رموز تحقق قسم لكل قسم من أقسام الواجهة مع إرسالها عبر واتساب المنصة. */
function CodeGenerator() {
  const [category, setCategory] = useState("jobs");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  function generate() {
    const digits = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10));
    setCode(digits.join(""));
    setCopied(false);
  }

  const section = CATEGORIES.find((c) => c.key === category);
  const waText = code
    ? `رمز التحقق الخاص بك في قسم ${section?.shortLabel ?? ""} بمنصة ViP Yemen: ${code}\nالرجاء إرسال الرمز لتأكيد هويتك.`
    : "";

  return (
    <Card className="border-gold-500/25 bg-gold-500/5 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/10 text-gold-300">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-cream">توليد رموز التحقق للأقسام</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-300">
              ولّد رمز تحقق سداسي لكل قسم من أقسام الواجهة وأرسله للعميل عبر واتساب المنصة — بنفس آلية أقسام الواجهة.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="!w-auto">
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>{c.shortLabel}</option>
            ))}
          </Select>
          <Button onClick={generate} className="!py-2 text-xs">
            <KeyRound className="h-4 w-4" />
            توليد رمز
          </Button>
        </div>
      </div>

      {code && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-gold-500/30 bg-ink-950/60 p-3">
          <div className="flex items-center gap-3">
            <Megaphone className="h-4 w-4 text-gold-400" />
            <span dir="ltr" className="text-2xl font-black tracking-[0.4em] text-gold-300">
              {code}
            </span>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(code).catch(() => {});
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="flex items-center gap-1 rounded-lg border border-ink-600/60 px-2.5 py-1.5 text-[11px] font-bold text-ink-200 hover:border-gold-500/50"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? "تم النسخ" : "نسخ"}
            </button>
          </div>
          <a
            href={whatsappLink("00967711780999", waText)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#25d366]/15 px-3 py-2 text-[11px] font-black text-[#4ade80] hover:bg-[#25d366]/25"
          >
            <MessageCircle className="h-4 w-4" />
            إرسال الرمز عبر واتساب المنصة
          </a>
          <span className="text-[10px] font-semibold text-ink-400">
            الرمز لقسم {section?.shortLabel} — أرسله للعميل لإتمام التحقق
          </span>
        </div>
      )}
    </Card>
  );
}

function ManualClientModal({ token, onClose }: { token: string; onClose: () => void }) {
  const addManual = useMutation(api.followups.addManualFollowup);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <Modal open onClose={onClose} title="إضافة عميل يدوياً">
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>الاسم الكامل *</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="اسم العميل" />
          </div>
          <div>
            <Label>رقم الهاتف *</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="771234567" dir="ltr" className="text-left" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>القسم</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">بدون قسم</option>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.shortLabel}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>العنوان</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="اختياري" />
          </div>
        </div>
        <div>
          <Label>ملاحظة</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="سبب إضافة العميل — اختياري" className="!min-h-16" />
        </div>
        {error && <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs font-bold text-rose-300">{error}</p>}
        <Button
          className="w-full"
          loading={busy}
          onClick={async () => {
            setError("");
            setBusy(true);
            try {
              await addManual({ token, fullName, phone, address: address || undefined, category: category || undefined, note: note || undefined });
              onClose();
            } catch (err: any) {
              setError(err.message ?? "تعذرت الإضافة");
            } finally {
              setBusy(false);
            }
          }}
        >
          <UserPlus className="h-4 w-4" />
          حفظ العميل
        </Button>
      </div>
    </Modal>
  );
}
