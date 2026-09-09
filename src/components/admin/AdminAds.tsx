import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Megaphone, Trash2, Pencil, Play, Pause, Send } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Badge, Button, Card, EmptyState, Input, Label, Modal, Select, Spinner, Textarea } from "@/components/ui";
import { formatDateTime, cn } from "@/lib/utils";

const AD_STATUS: Record<string, { label: string; className: string }> = {
  draft: { label: "مسودة", className: "border-ink-500/40 bg-ink-500/10 text-ink-300" },
  scheduled: { label: "مجدول", className: "border-violet-500/40 bg-violet-500/10 text-violet-300" },
  active: { label: "نشط", className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
  paused: { label: "متوقف", className: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
};

export function AdminAds({ token }: { token: string }) {
  const ads = useQuery(api.ads.listAll, { token });
  const createAd = useMutation(api.ads.createAd);
  const updateAd = useMutation(api.ads.updateAd);
  const deleteAd = useMutation(api.ads.deleteAd);
  const repushMut = useMutation(api.channelPush.repush);

  const [form, setForm] = useState({
    title: "",
    message: "",
    status: "active",
    priority: 5,
    link: "",
    startsAt: "",
    endsAt: "",
  });
  const [editing, setEditing] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await createAd({
        token,
        title: form.title,
        message: form.message,
        status: form.status,
        priority: Number(form.priority),
        link: form.link || undefined,
        startsAt: form.startsAt ? new Date(form.startsAt).getTime() : undefined,
        endsAt: form.endsAt ? new Date(form.endsAt).getTime() : undefined,
      });
      setForm({ title: "", message: "", status: "active", priority: 5, link: "", startsAt: "", endsAt: "" });
    } catch (err: any) {
      setError(err.message ?? "خطأ");
    } finally {
      setBusy(false);
    }
  }

  async function handleStatusToggle(ad: any) {
    await updateAd({
      token,
      id: ad._id,
      patch: { status: ad.status === "active" ? "paused" : "active" },
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-cream">
            <Megaphone className="h-4 w-4 text-gold-400" />
            إنشاء إعلان جديد
          </h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <Label>عنوان الإعلان *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: عرض افتتاحي" required />
            </div>
            <div>
              <Label>نص الإعلان *</Label>
              <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="يظهر في الشريط الإعلاني أعلى المنصة" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الحالة</Label>
                <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="active">نشط فوراً</option>
                  <option value="scheduled">مجدول</option>
                  <option value="draft">مسودة</option>
                </Select>
              </div>
              <div>
                <Label>الأولوية (1-10)</Label>
                <Input type="number" min={1} max={10} value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>رابط (اختياري)</Label>
              <Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://..." dir="ltr" className="text-left" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>بداية الظهور</Label>
                <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
              </div>
              <div>
                <Label>نهاية الظهور</Label>
                <Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
              </div>
            </div>
            {error && <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs font-bold text-rose-300">{error}</p>}
            <Button type="submit" loading={busy} className="w-full">نشر الإعلان</Button>
          </form>
        </Card>

        <div className="space-y-3">
          <h3 className="text-sm font-extrabold text-cream">الإعلانات الحالية ({ads?.length ?? 0})</h3>
          {!ads ? (
            <div className="flex justify-center py-10 text-gold-400"><Spinner className="h-7 w-7" /></div>
          ) : ads.length === 0 ? (
            <EmptyState title="لا توجد إعلانات" hint="أنشئ أول إعلان ليظهر في الشريط الإعلاني" />
          ) : (
            (ads as any[]).map((ad) => {
              const st = AD_STATUS[ad.status] ?? AD_STATUS.draft;
              return (
                <div key={ad._id} className="card-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-extrabold text-cream">{ad.title}</h4>
                        <Badge className={st.className}>{st.label}</Badge>
                        <Badge className="border-ink-600/60 bg-ink-800/60 text-ink-300">أولوية {ad.priority}</Badge>
                      </div>
                      <p className="mt-1 text-[13px] text-ink-300">{ad.message}</p>
                      <p className="mt-1 text-[10px] font-bold text-ink-400">
                        {formatDateTime(ad.startsAt)} ← {formatDateTime(ad.endsAt)} · أُنشئ {formatDateTime(ad.createdAt)}
                      </p>
                      {(ad.publishedTo?.length > 0 || ad.status === "active") && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-black text-ink-400">القنوات:</span>
                          {(ad.publishedTo ?? []).length === 0 ? (
                            <span className="text-[10px] font-bold text-ink-400">لم تُنشر للقنوات بعد</span>
                          ) : (
                            (ad.publishedTo as string[]).map((ch) => (
                              <span
                                key={ch}
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black ${
                                  ch === "telegram"
                                    ? "border-[#229ed9]/40 bg-[#229ed9]/10 text-sky-300"
                                    : "border-[#25d366]/40 bg-[#25d366]/10 text-[#4ade80]"
                                }`}
                              >
                                {ch === "telegram" ? "تيليجرام ✓" : "واتساب ✓"}
                              </span>
                            ))
                          )}
                          {ad.status === "active" && (
                            <button
                              onClick={async () => {
                                try {
                                  await repushMut({ token, kind: "ad", itemId: ad._id });
                                } catch (err: any) {
                                  alert(err.message ?? "تعذر النشر للقنوات");
                                }
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-gold-500/40 bg-gold-500/10 px-2 py-0.5 text-[10px] font-black text-gold-300 transition-colors hover:bg-gold-500/20"
                              title="إعادة نشر على قنوات المنصة"
                            >
                              <Send className="h-3 w-3" />
                              إعادة نشر للقنوات
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col gap-1.5">
                      <button
                        onClick={() => handleStatusToggle(ad)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-black",
                          ad.status === "active"
                            ? "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
                            : "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                        )}
                      >
                        {ad.status === "active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        {ad.status === "active" ? "إيقاف" : "تفعيل"}
                      </button>
                      <button
                        onClick={() => setEditing(ad)}
                        className="inline-flex items-center gap-1 rounded-lg border border-ink-600/60 px-2.5 py-1.5 text-[11px] font-bold text-ink-200 hover:border-gold-500/50"
                      >
                        <Pencil className="h-3.5 w-3.5" /> تعديل
                      </button>
                      <button
                        onClick={async () => { if (confirm("حذف الإعلان؟")) await deleteAd({ token, id: ad._id }); }}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 px-2.5 py-1.5 text-[11px] font-bold text-rose-300 hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> حذف
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {editing && (
        <Modal open onClose={() => setEditing(null)} title={`تعديل الإعلان — ${editing.title}`}>
          <AdForm
            initial={editing}
            onSave={async (patch) => {
              await updateAd({ token, id: editing._id, patch });
              setEditing(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function AdForm({ initial, onSave }: { initial: any; onSave: (patch: any) => Promise<void> }) {
  const [title, setTitle] = useState(initial.title);
  const [message, setMessage] = useState(initial.message);
  const [status, setStatus] = useState(initial.status);
  const [priority, setPriority] = useState(initial.priority);
  const [link, setLink] = useState(initial.link ?? "");
  const [saving, setSaving] = useState(false);
  return (
    <div className="space-y-3">
      <div>
        <Label>العنوان</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <Label>النص</Label>
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>الحالة</Label>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="draft">مسودة</option>
            <option value="scheduled">مجدول</option>
            <option value="active">نشط</option>
            <option value="paused">متوقف</option>
          </Select>
        </div>
        <div>
          <Label>الأولوية</Label>
          <Input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} />
        </div>
      </div>
      <div>
        <Label>الرابط</Label>
        <Input value={link} onChange={(e) => setLink(e.target.value)} dir="ltr" className="text-left" />
      </div>
      <Button
        loading={saving}
        onClick={async () => {
          setSaving(true);
          try {
            await onSave({ title, message, status, priority, link: link || undefined });
          } finally {
            setSaving(false);
          }
        }}
      >
        حفظ
      </Button>
    </div>
  );
}