import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Bell, Send, Trash2, Info, CheckCircle2 } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Button, Card, EmptyState, Input, Label, Select, Spinner, Textarea } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  jobs: { label: "توظيف", color: "text-sky-300 border-sky-500/30 bg-sky-500/10" },
  real_estate: { label: "عقارات", color: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" },
  emarket: { label: "تسويق إلكتروني", color: "text-amber-300 border-amber-500/30 bg-amber-500/10" },
  software: { label: "برمجيات", color: "text-violet-300 border-violet-500/30 bg-violet-500/10" },
  system: { label: "النظام", color: "text-gold-300 border-gold-500/30 bg-gold-500/10" },
};

export function AdminNotifications({ token }: { token: string }) {
  const notifications = useQuery(api.notifications.listAll, { token });
  const createNotification = useMutation(api.notifications.createNotification);
  const deleteNotification = useMutation(api.notifications.deleteNotification);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("system");
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-cream">
          <Send className="h-4 w-4 text-gold-400" />
          إرسال إشعار يدوي
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>عنوان الإشعار *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: عروض جديدة" required />
          </div>
          <div>
            <Label>التصنيف</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="system">النظام</option>
              <option value="jobs">توظيف</option>
              <option value="real_estate">عقارات</option>
              <option value="emarket">تسويق إلكتروني</option>
              <option value="software">برمجيات</option>
            </Select>
          </div>
        </div>
        <div className="mt-3">
          <Label>النص *</Label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="نص الإشعار" required />
        </div>
        <Button
          className="mt-3"
          loading={busy}
          onClick={async () => {
            if (!title.trim() || !message.trim()) return;
            setBusy(true);
            try {
              await createNotification({ token, title, message, category });
              setTitle("");
              setMessage("");
            } finally {
              setBusy(false);
            }
          }}
        >
          إرسال الإشعار
        </Button>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-extrabold text-cream">سجل الإشعارات ({notifications?.length ?? 0})</h3>
        {!notifications ? (
          <div className="flex justify-center py-10 text-gold-400"><Spinner className="h-7 w-7" /></div>
        ) : notifications.length === 0 ? (
          <EmptyState title="لا توجد إشعارات" hint="تُنشأ الإشعارات تلقائياً عند وصول طلبات ونشرها" />
        ) : (
          (notifications as any[]).map((n) => {
            const meta = CATEGORY_META[n.category ?? "system"] ?? CATEGORY_META.system;
            return (
              <div key={n._id} className="card-surface flex items-start justify-between gap-3 p-3.5">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gold-500/30 bg-gold-500/10 text-gold-300">
                    {n.category === "system" ? <Info className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13px] font-extrabold text-cream">{n.title}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${meta.color}`}>{meta.label}</span>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-300">{n.message}</p>
                    <p className="mt-1 text-[10px] font-bold text-ink-400">{formatDateTime(n.createdAt)}</p>
                  </div>
                </div>
                <button
                  onClick={async () => await deleteNotification({ token, id: n._id })}
                  className="shrink-0 text-rose-300/70 hover:text-rose-300"
                  aria-label="حذف"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}