import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Crown, Trash2, Pencil, ImageIcon, PlayCircle, Send } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Badge, Button, Card, EmptyState, Input, Label, Modal, Select, Spinner, Textarea } from "@/components/ui";
import { formatDateTime, cn } from "@/lib/utils";

export function AdminOffers({ token }: { token: string }) {
  const offers = useQuery(api.offers.listAll, { token });
  const createOffer = useMutation(api.offers.createOffer);
  const updateOffer = useMutation(api.offers.updateOffer);
  const deleteOffer = useMutation(api.offers.deleteOffer);
  const repushMut = useMutation(api.channelPush.repush);

  const [form, setForm] = useState({
    title: "",
    description: "",
    imageUrl: "",
    videoUrl: "",
    originalPrice: "",
    offerPrice: "",
    discountPercent: "",
    isFeatured: false,
    status: "published",
  });
  const [editing, setEditing] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await createOffer({
        token,
        title: form.title,
        description: form.description,
        imageUrl: form.imageUrl || undefined,
        videoUrl: form.videoUrl || undefined,
        originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
        offerPrice: form.offerPrice ? Number(form.offerPrice) : undefined,
        discountPercent: form.discountPercent ? Number(form.discountPercent) : undefined,
        isFeatured: form.isFeatured,
        status: form.status,
      });
      setForm({ title: "", description: "", imageUrl: "", videoUrl: "", originalPrice: "", offerPrice: "", discountPercent: "", isFeatured: false, status: "published" });
    } catch (err: any) {
      setError(err.message ?? "خطأ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-cream">
            <Crown className="h-4 w-4 text-gold-400" />
            إنشاء عرض ترويجي
          </h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <Label>عنوان العرض *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: باقة التسويق الشامل" required />
            </div>
            <div>
              <Label>وصف العرض *</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="تفاصيل العرض والمزايا" required />
            </div>
            <div>
              <Label>رابط الصورة</Label>
              <div className="flex gap-2">
                <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://... (رابط صورة)" dir="ltr" className="text-left" />
                {form.imageUrl && (
                  <img src={form.imageUrl} alt="" className="h-10 w-14 shrink-0 rounded-lg border border-ink-600/50 object-cover" />
                )}
              </div>
            </div>
            <div>
              <Label>رابط فيديو قصير</Label>
              <Input value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} placeholder="https://... (رابط فيديو)" dir="ltr" className="text-left" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>السعر الأصلي</Label>
                <Input type="number" value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })} />
              </div>
              <div>
                <Label>سعر العرض</Label>
                <Input type="number" value={form.offerPrice} onChange={(e) => setForm({ ...form, offerPrice: e.target.value })} />
              </div>
              <div>
                <Label>نسبة الخصم %</Label>
                <Input type="number" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-ink-200">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                  className="h-4 w-4 accent-[#d4af37]"
                />
                عرض مميز
              </label>
              <div className="w-40">
                <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="published">منشور فوراً</option>
                  <option value="draft">مسودة</option>
                </Select>
              </div>
            </div>
            {error && <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs font-bold text-rose-300">{error}</p>}
            <Button type="submit" loading={busy} className="w-full">نشر العرض</Button>
          </form>
        </Card>

        <div className="space-y-3">
          <h3 className="text-sm font-extrabold text-cream">العروض ({offers?.length ?? 0})</h3>
          {!offers ? (
            <div className="flex justify-center py-10 text-gold-400"><Spinner className="h-7 w-7" /></div>
          ) : offers.length === 0 ? (
            <EmptyState title="لا توجد عروض" hint="أنشئ أول عرض يظهر فوراً في قسم العروض" />
          ) : (
            (offers as any[]).map((offer) => (
              <div key={offer._id} className="card-surface flex gap-3 p-3">
                {offer.imageUrl && (
                  <img src={offer.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-xl border border-ink-600/50 object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-extrabold text-cream">{offer.title}</h4>
                    {offer.isFeatured && <Badge className="border-gold-500/40 bg-gold-500/15 text-gold-300"><Crown className="h-3 w-3" /> مميز</Badge>}
                    <Badge className={offer.status === "published" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-ink-500/40 bg-ink-500/10 text-ink-300"}>
                      {offer.status === "published" ? "منشور" : "مسودة"}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-ink-300">{offer.description}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] font-bold">
                    {offer.offerPrice !== undefined && <span className="text-gold-300">{offer.offerPrice.toLocaleString("en-US")} ريال</span>}
                    {offer.discountPercent !== undefined && <span className="text-rose-300">خصم {offer.discountPercent}%</span>}
                    {offer.videoUrl && (
                      <span className="flex items-center gap-1 text-sky-300"><PlayCircle className="h-3.5 w-3.5" /> فيديو</span>
                    )}
                    <span className="text-ink-400">{formatDateTime(offer.createdAt)}</span>
                  </div>
                  {(offer.publishedTo?.length > 0 || offer.status === "published") && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-black text-ink-400">القنوات:</span>
                      {(offer.publishedTo ?? []).length === 0 ? (
                        <span className="text-[10px] font-bold text-ink-400">لم يُنشر للقنوات بعد</span>
                      ) : (
                        (offer.publishedTo as string[]).map((ch) => (
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
                      {offer.status === "published" && (
                        <button
                          onClick={async () => {
                            try {
                              await repushMut({ token, kind: "offer", itemId: offer._id });
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
                    onClick={() => setEditing(offer)}
                    className="inline-flex items-center gap-1 rounded-lg border border-ink-600/60 px-2.5 py-1.5 text-[11px] font-bold text-ink-200 hover:border-gold-500/50"
                  >
                    <Pencil className="h-3.5 w-3.5" /> تعديل
                  </button>
                  <button
                    onClick={async () => {
                      await updateOffer({ token, id: offer._id, patch: { status: offer.status === "published" ? "draft" : "published" } });
                    }}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-black",
                      offer.status === "published"
                        ? "bg-amber-500/15 text-amber-300"
                        : "bg-emerald-500/15 text-emerald-300"
                    )}
                  >
                    {offer.status === "published" ? "إخفاء" : "نشر"}
                  </button>
                  <button
                    onClick={async () => { if (confirm("حذف العرض؟")) await deleteOffer({ token, id: offer._id }); }}
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
        <Modal open onClose={() => setEditing(null)} title={`تعديل العرض — ${editing.title}`}>
          <div className="space-y-3">
            <OfferFields
              initial={editing}
              onSave={async (patch) => {
                await updateOffer({ token, id: editing._id, patch });
                setEditing(null);
              }}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

function OfferFields({ initial, onSave }: { initial: any; onSave: (patch: any) => Promise<void> }) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [imageUrl, setImageUrl] = useState(initial.imageUrl ?? "");
  const [videoUrl, setVideoUrl] = useState(initial.videoUrl ?? "");
  const [originalPrice, setOriginalPrice] = useState(initial.originalPrice?.toString() ?? "");
  const [offerPrice, setOfferPrice] = useState(initial.offerPrice?.toString() ?? "");
  const [discountPercent, setDiscountPercent] = useState(initial.discountPercent?.toString() ?? "");
  const [isFeatured, setIsFeatured] = useState(initial.isFeatured);
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-3">
      <div>
        <Label>العنوان</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <Label>الوصف</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div>
        <Label>رابط الصورة</Label>
        <div className="flex gap-2">
          <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} dir="ltr" className="text-left" />
          {imageUrl && <img src={imageUrl} alt="" className="h-10 w-14 shrink-0 rounded-lg border border-ink-600/50 object-cover" />}
        </div>
      </div>
      <div>
        <Label>رابط الفيديو</Label>
        <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} dir="ltr" className="text-left" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>السعر الأصلي</Label>
          <Input type="number" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} />
        </div>
        <div>
          <Label>سعر العرض</Label>
          <Input type="number" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} />
        </div>
        <div>
          <Label>الخصم %</Label>
          <Input type="number" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} />
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-ink-200">
        <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="h-4 w-4 accent-[#d4af37]" />
        عرض مميز
      </label>
      <Button
        loading={saving}
        onClick={async () => {
          setSaving(true);
          try {
            await onSave({
              title,
              description,
              imageUrl: imageUrl || undefined,
              videoUrl: videoUrl || undefined,
              originalPrice: originalPrice ? Number(originalPrice) : undefined,
              offerPrice: offerPrice ? Number(offerPrice) : undefined,
              discountPercent: discountPercent ? Number(discountPercent) : undefined,
              isFeatured,
            });
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