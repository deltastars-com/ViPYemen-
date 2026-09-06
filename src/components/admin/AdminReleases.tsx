import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { PackageOpen, Trash2, Pencil } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Badge, Button, Card, EmptyState, Input, Label, Modal, Select, Spinner, Textarea } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export function AdminReleases({ token }: { token: string }) {
  const releases = useQuery(api.releases.listAll, { token });
  const createRelease = useMutation(api.releases.createRelease);
  const updateRelease = useMutation(api.releases.updateRelease);
  const deleteRelease = useMutation(api.releases.deleteRelease);

  const [form, setForm] = useState({
    version: "5.0.0",
    title: "",
    description: "",
    platform: "web",
    fileUrl: "",
    size: "",
    notes: "",
  });
  const [editing, setEditing] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createRelease({
        token,
        version: form.version,
        title: form.title,
        description: form.description,
        platform: form.platform,
        fileUrl: form.fileUrl || undefined,
        size: form.size || undefined,
        notes: form.notes || undefined,
      });
      setForm({ version: "5.0.0", title: "", description: "", platform: "web", fileUrl: "", size: "", notes: "" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-cream">
            <PackageOpen className="h-4 w-4 text-gold-400" />
            رفع إصدار جديد
          </h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>رقم الإصدار</Label>
                <Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} dir="ltr" className="text-left" required />
              </div>
              <div>
                <Label>المنصة</Label>
                <Select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                  <option value="web">تطبيق ويب (PWA)</option>
                  <option value="android">Android (APK/AAB)</option>
                  <option value="ios">iOS</option>
                  <option value="docs">وثائق وكود مصدري</option>
                </Select>
              </div>
            </div>
            <div>
              <Label>عنوان الإصدار *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: الإصدار الشامل 5.0" required />
            </div>
            <div>
              <Label>الوصف *</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="ما الجديد في هذا الإصدار" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>رابط التحميل</Label>
                <Input value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} placeholder="https://..." dir="ltr" className="text-left" />
              </div>
              <div>
                <Label>الحجم</Label>
                <Input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="مثال: 25 MB" />
              </div>
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="اختياري" />
            </div>
            <Button type="submit" loading={busy} className="w-full">رفع الإصدار</Button>
          </form>
        </Card>

        <div className="space-y-3">
          <h3 className="text-sm font-extrabold text-cream">الإصدارات ({releases?.length ?? 0})</h3>
          {!releases ? (
            <div className="flex justify-center py-10 text-gold-400"><Spinner className="h-7 w-7" /></div>
          ) : releases.length === 0 ? (
            <EmptyState title="لا توجد إصدارات" hint="ارفع أول إصدار ليظهر في قسم الإصدارات" />
          ) : (
            (releases as any[]).map((r) => (
              <div key={r._id} className="card-surface flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-extrabold text-cream">{r.title}</h4>
                    <Badge className="border-gold-500/30 bg-gold-500/10 text-gold-300">v{r.version}</Badge>
                    <Badge className="border-ink-600/60 bg-ink-800/60 text-ink-200">{r.platform}</Badge>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-ink-300">{r.description}</p>
                  <p className="mt-1 text-[10px] font-bold text-ink-400">
                    {formatDate(r.createdAt)} {r.size ? `· ${r.size}` : ""} {r.fileUrl ? `· ${r.fileUrl}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <button
                    onClick={() => setEditing(r)}
                    className="inline-flex items-center gap-1 rounded-lg border border-ink-600/60 px-2.5 py-1.5 text-[11px] font-bold text-ink-200 hover:border-gold-500/50"
                  >
                    <Pencil className="h-3.5 w-3.5" /> تعديل
                  </button>
                  <button
                    onClick={async () => { if (confirm("حذف الإصدار؟")) await deleteRelease({ token, id: r._id }); }}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 px-2.5 py-1.5 text-[11px] font-bold text-rose-300 hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> حذف
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {editing && (
        <Modal open onClose={() => setEditing(null)} title={`تعديل الإصدار — ${editing.title}`}>
          <div className="space-y-3">
            <div>
              <Label>رقم الإصدار</Label>
              <Input value={editing.version} onChange={(e) => setEditing({ ...editing, version: e.target.value })} dir="ltr" className="text-left" />
            </div>
            <div>
              <Label>العنوان</Label>
              <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </div>
            <div>
              <Label>الوصف</Label>
              <Textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>المنصة</Label>
                <Select value={editing.platform} onChange={(e) => setEditing({ ...editing, platform: e.target.value })}>
                  <option value="web">ويب (PWA)</option>
                  <option value="android">Android</option>
                  <option value="ios">iOS</option>
                  <option value="docs">وثائق</option>
                </Select>
              </div>
              <div>
                <Label>الحجم</Label>
                <Input value={editing.size ?? ""} onChange={(e) => setEditing({ ...editing, size: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>رابط التحميل</Label>
              <Input value={editing.fileUrl ?? ""} onChange={(e) => setEditing({ ...editing, fileUrl: e.target.value })} dir="ltr" className="text-left" />
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Input value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
            </div>
            <Button
              onClick={async () => {
                await updateRelease({
                  token,
                  id: editing._id,
                  patch: {
                    version: editing.version,
                    title: editing.title,
                    description: editing.description,
                    platform: editing.platform,
                    fileUrl: editing.fileUrl || undefined,
                    size: editing.size || undefined,
                    notes: editing.notes || undefined,
                  },
                });
                setEditing(null);
              }}
            >
              حفظ
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}