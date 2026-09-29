import { useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  Mail,
  Users2,
  Send,
  Plus,
  Play,
  Pause,
  Square,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Calendar,
  PenLine,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Badge, Button, Card, Input, Label, Spinner, Textarea, EmptyState } from "@/components/ui";

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  draft: { text: "مسودة", className: "border-ink-500/40 bg-ink-500/10 text-ink-200" },
  scheduled: { text: "مجدولة", className: "border-sky-500/40 bg-sky-500/10 text-sky-300" },
  sending: { text: "قيد الإرسال", className: "border-gold-500/40 bg-gold-500/10 text-gold-300" },
  paused: { text: "متوقفة مؤقتاً", className: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
  sent: { text: "أُرسلت", className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
  stopped: { text: "موقوفة", className: "border-rose-500/40 bg-rose-500/10 text-rose-300" },
};

function fmt(n: number | null | undefined) {
  return typeof n === "number" ? n.toLocaleString("ar-YE") : "—";
}
function fmtDate(ms: number | null | undefined) {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" });
}

export function EmailCampaigns({ token }: { token: string }) {
  const status = useQuery(api.campaigns.getEmailStatus, { token });
  const campaigns = useQuery(api.campaigns.listCampaigns, { token });
  const subscribers = useQuery(api.campaigns.listSubscribers, { token, limit: 100 });
  const startCampaign = useAction(api.campaigns.startCampaign);
  const changeState = useMutation(api.campaigns.changeCampaignState);
  const removeCampaign = useMutation(api.campaigns.removeCampaign);
  const setSubscriberStatus = useMutation(api.campaigns.setSubscriberStatus);
  const removeSubscriber = useMutation(api.campaigns.removeSubscriber);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<{ id?: any; subject: string; preview: string; body: string; audience: string } | null>(null);
  const [busyId, setBusyId] = useState("");
  const [err, setErr] = useState("");

  function openNew() {
    setEditing({ subject: "", preview: "", body: "", audience: "all" });
    setEditorOpen(true);
  }

  async function run(fn: () => Promise<unknown>, id: string) {
    setBusyId(id);
    setErr("");
    try {
      await fn();
    } catch (e: any) {
      setErr(e?.message ?? "خطأ غير متوقع");
    } finally {
      setBusyId("");
    }
  }

  if (status === undefined || campaigns === undefined) {
    return (
      <div className="flex justify-center py-20 text-gold-400">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: Users2, label: "مشتركون نشطون", value: fmt(status.subscribers), tone: "text-emerald-300" },
          { icon: Mail, label: "حملات", value: fmt(status.campaigns), tone: "text-gold-300" },
          { icon: Send, label: "قيد الإرسال", value: fmt(status.sending), tone: "text-sky-300" },
          { icon: Calendar, label: "مجدولة", value: fmt(status.scheduled), tone: "text-amber-300" },
        ].map((s) => (
          <Card key={s.label} className="flex items-center gap-3 p-4">
            <s.icon className={`h-7 w-7 shrink-0 ${s.tone}`} />
            <div>
              <p className="text-lg font-black text-cream">{s.value}</p>
              <p className="text-[11px] font-bold text-ink-300">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Provider status */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2 text-xs font-bold">
          {status.configured ? (
            <span className="flex items-center gap-1.5 text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              مزوّد البريد مضبوط (Resend {status.keyPrefix})
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-300">
              <XCircle className="h-4 w-4" />
              مفتاح مزوّد البريد غير مضبوط — أضِفه من الإعدادات ← «إعداد البريد الإلكتروني»
            </span>
          )}
        </div>
        <Button onClick={openNew} className="!py-2 text-xs">
          <Plus className="h-4 w-4" />
          حملة جديدة
        </Button>
      </Card>

      {err && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-bold text-rose-300">{err}</p>
      )}

      {/* Campaigns */}
      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-cream">
          <Mail className="h-4 w-4 text-gold-400" />
          الحملات
        </h3>
        {campaigns.length === 0 ? (
          <EmptyState title="لا حملات بعد" hint="أنشئ أول حملة بريدية لمشتركي النشرة" />
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => {
              const st = STATUS_LABEL[c.status] ?? STATUS_LABEL.draft;
              const editable = c.status === "draft" || c.status === "scheduled" || c.status === "stopped";
              return (
                <div key={c.id} className="rounded-xl border border-ink-700/50 bg-ink-900/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-cream">{c.subject}</p>
                      <p className="mt-0.5 text-[11px] text-ink-300">
                        الجمهور: {c.audience === "all" ? "كل المشتركين" : c.audience.replace("tag:", "وسم: ")} ·{" "}
                        {c.scheduledAt ? `مجدولة: ${fmtDate(c.scheduledAt)}` : `أُنشئت: ${fmtDate(c.createdAt)}`}
                      </p>
                    </div>
                    <Badge className={st.className}>{st.text}</Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-800">
                      <div className="h-full rounded-full bg-gold-500 transition-all" style={{ width: `${c.progress}%` }} />
                    </div>
                    <span className="text-[11px] font-bold text-ink-300">
                      {fmt(c.sent)} ✓ · {fmt(c.failed)} ✗ / {fmt(c.total)}
                    </span>
                  </div>
                  {c.lastError && <p className="mt-2 text-[11px] text-rose-300">آخر خطأ: {c.lastError}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {c.status === "draft" && (
                      <Button
                        loading={busyId === c.id}
                        onClick={() => run(() => startCampaign({ token, id: c.id }), c.id)}
                        className="!py-1.5 text-[11px]"
                      >
                        <Play className="h-3.5 w-3.5" />
                        إرسال الآن
                      </Button>
                    )}
                    {c.status === "sending" && (
                      <Button
                        variant="ghost"
                        loading={busyId === c.id}
                        onClick={() => run(() => changeState({ token, id: c.id, action: "pause" }), c.id)}
                        className="!py-1.5 text-[11px]"
                      >
                        <Pause className="h-3.5 w-3.5" />
                        إيقاف مؤقت
                      </Button>
                    )}
                    {c.status === "paused" && (
                      <Button
                        loading={busyId === c.id}
                        onClick={() => run(() => changeState({ token, id: c.id, action: "resume" }), c.id)}
                        className="!py-1.5 text-[11px]"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        استئناف
                      </Button>
                    )}
                    {(c.status === "sending" || c.status === "paused" || c.status === "scheduled") && (
                      <Button
                        variant="ghost"
                        loading={busyId === c.id}
                        onClick={() => run(() => changeState({ token, id: c.id, action: "stop" }), c.id)}
                        className="!py-1.5 text-[11px]"
                      >
                        <Square className="h-3.5 w-3.5" />
                        إيقاف نهائي
                      </Button>
                    )}
                    {editable && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditing({ id: c.id, subject: c.subject, preview: c.preview, body: "", audience: c.audience });
                          setEditorOpen(true);
                        }}
                        className="!py-1.5 text-[11px]"
                      >
                        <PenLine className="h-3.5 w-3.5" />
                        تعديل
                      </Button>
                    )}
                    {c.status !== "sending" && (
                      <Button
                        variant="ghost"
                        loading={busyId === c.id}
                        onClick={() => {
                          if (confirm(`حذف الحملة «${c.subject}» نهائياً؟`))
                            run(() => removeCampaign({ token, id: c.id }), c.id);
                        }}
                        className="!py-1.5 text-[11px] !text-rose-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        حذف
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Subscribers */}
      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-cream">
          <Users2 className="h-4 w-4 text-gold-400" />
          المشتركون ({fmt(status.subscribers)} نشط · {fmt(status.unsubscribed)} منسحب)
        </h3>
        {!subscribers || subscribers.length === 0 ? (
          <EmptyState title="لا مشتركين بعد" hint="سيظهر المشتركون هنا عند تسجيلهم من النشرة في الصفحة الرئيسية" />
        ) : (
          <div className="space-y-2">
            {subscribers.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-700/50 bg-ink-900/40 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-cream" dir="ltr">
                    {s.email}
                  </p>
                  <p className="text-[10px] text-ink-300">
                    {s.name || "—"} · المصدر: {s.source || "—"} · {fmtDate(s.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      s.status === "active"
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : "border-ink-500/40 bg-ink-500/10 text-ink-300"
                    }
                  >
                    {s.status === "active" ? "نشط" : "منسحب"}
                  </Badge>
                  {s.status === "active" ? (
                    <Button
                      variant="ghost"
                      loading={busyId === s.id}
                      onClick={() => run(() => setSubscriberStatus({ token, id: s.id, status: "unsubscribed" }), s.id)}
                      className="!py-1 text-[10px]"
                    >
                      إلغاء تنشيط
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      loading={busyId === s.id}
                      onClick={() => run(() => setSubscriberStatus({ token, id: s.id, status: "active" }), s.id)}
                      className="!py-1 text-[10px]"
                    >
                      إعادة تنشيط
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    loading={busyId === s.id}
                    onClick={() => {
                      if (confirm(`حذف ${s.email} من قائمة المشتركين؟`))
                        run(() => removeSubscriber({ token, id: s.id }), s.id);
                    }}
                    className="!py-1 text-[10px] !text-rose-300"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Editor modal */}
      {editorOpen && editing && (
        <CampaignEditor
          token={token}
          editing={editing}
          onClose={() => setEditorOpen(false)}
          onSaved={() => {
            setEditorOpen(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function CampaignEditor({
  token,
  editing,
  onClose,
  onSaved,
}: {
  token: string;
  editing: { id?: any; subject: string; preview: string; body: string; audience: string };
  onClose: () => void;
  onSaved: () => void;
}) {
  const save = useMutation(api.campaigns.saveCampaign);
  const [form, setForm] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await save({
        token,
        id: form.id,
        subject: form.subject,
        preview: form.preview || undefined,
        body: form.body,
        audience: form.audience,
      });
      onSaved();
    } catch (e: any) {
      setErr(e?.message ?? "تعذر الحفظ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="إغلاق" onClick={onClose} className="absolute inset-0 cursor-default bg-ink-950/85 backdrop-blur-sm" />
      <Card className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6">
        <h3 className="mb-4 flex items-center gap-2 text-base font-black text-cream">
          <Mail className="h-5 w-5 text-gold-400" />
          {form.id ? "تعديل الحملة" : "حملة بريدية جديدة"}
        </h3>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>عنوان الرسالة</Label>
            <Input value={form.subject} onChange={set("subject")} placeholder="عنوان جذاب للنشرة" required />
          </div>
          <div>
            <Label>سطر المعاينة (اختياري)</Label>
            <Input value={form.preview} onChange={set("preview")} placeholder="يظهر بعد العنوان في صندوق الوارد" />
          </div>
          <div>
            <Label>نص الرسالة (يدعم تنسيقاً بسيطاً: **عريض** · عنوان سطر بعلامة # · قوائم بـ - )</Label>
            <Textarea value={form.body} onChange={set("body")} rows={8} placeholder="نص الحملة…" required />
          </div>
          <div>
            <Label>الجمهور</Label>
            <select
              value={form.audience}
              onChange={set("audience")}
              className="w-full rounded-lg border border-ink-600/60 bg-ink-900 px-3 py-2 text-sm text-cream"
            >
              <option value="all">كل المشتركين النشطين</option>
            </select>
          </div>
          {err && <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs font-bold text-rose-300">{err}</p>}
          <div className="flex gap-2">
            <Button type="submit" loading={busy} className="flex-1">
              حفظ الحملة
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              إلغاء
            </Button>
          </div>
          <p className="text-[11px] text-ink-300">
            بعد الحفظ تبقى الحملة «مسودة» — اضغط «إرسال الآن» من قائمة الحملات لبدء الإرسال الآلي على دفعات.
          </p>
        </form>
      </Card>
    </div>
  );
}
