import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Search,
  CheckCircle2,
  XCircle,
  BadgeCheck,
  Archive,
  Trash2,
  Pencil,
  MessageCircle,
  PackageCheck,
  RefreshCw,
  Eye,
  Send,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Badge, Button, EmptyState, Input, Modal, Select, Spinner, Textarea } from "@/components/ui";
import { getCategory, getType, getStatusLabel, TYPE_ICONS } from "@/lib/categories";
import { formatDateTime, whatsappLink, cn } from "@/lib/utils";

const STATUS_FILTERS = [
  { value: "all", label: "الكل" },
  { value: "pending", label: "قيد الانتظار" },
  { value: "published", label: "منشور" },
  { value: "rejected", label: "مرفوض" },
  { value: "sold", label: "تم البيع" },
];

export function AdminSubmissions({
  token,
  category,
  archived,
}: {
  token: string;
  category: string;
  archived?: boolean;
}) {
  const [status, setStatus] = useState(archived ? "archived" : "pending");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any>(null);

  const rows = useQuery(api.submissions.listAll, {
    token,
    category: category === "all" ? undefined : category,
    status: status === "all" ? undefined : status,
    type: typeFilter === "all" ? undefined : typeFilter,
    search: search.trim() || undefined,
  });

  const setStatusMut = useMutation(api.submissions.setStatus);
  const deleteMut = useMutation(api.submissions.deleteSubmission);
  const togglePhone = useMutation(api.submissions.togglePhoneVerified);
  const updateMut = useMutation(api.submissions.updateSubmission);
  const repushMut = useMutation(api.channelPush.repush);

  const catConfig = useMemo(
    () => (category === "all" ? null : getCategory(category)),
    [category]
  );

  const [busyId, setBusyId] = useState<string | null>(null);

  async function act(id: any, action: string, note?: string) {
    setBusyId(id);
    try {
      await setStatusMut({ token, id, status: action, note });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: any) {
    if (!confirm("هل أنت متأكد من حذف هذا الطلب نهائياً؟")) return;
    await deleteMut({ token, id });
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatus(s.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
                status === s.value
                  ? "bg-gold-500 text-ink-950"
                  : "border border-ink-600/60 text-ink-300 hover:border-gold-500/50"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {catConfig && (
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="!w-auto"
            >
              <option value="all">كل الأنواع</option>
              {catConfig.types.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          )}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم / الهاتف / العنوان..."
              className="!pr-9"
            />
          </div>
        </div>
      </div>

      {/* List */}
      {!rows ? (
        <div className="flex justify-center py-16 text-gold-400">
          <Spinner className="h-8 w-8" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="لا توجد طلبات" hint="غيّر الفلاتر أو انتظر وصول طلبات جديدة" />
      ) : (
        <div className="space-y-3">
          {(rows as any[]).map((row) => {
            const cat = getCategory(row.category);
            const typeCfg = getType(cat, row.type);
            const TypeIcon = TYPE_ICONS[row.type] ?? cat.icon;
            const st = getStatusLabel(row.status, (k) => k);
            return (
              <div key={row._id} className="card-surface overflow-hidden">
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/10 text-gold-300">
                      <TypeIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-extrabold text-cream">{row.title}</h3>
                        <Badge className={st.className}>{st.label}</Badge>
                        {row.phoneVerified && (
                          <Badge className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
                            <BadgeCheck className="h-3 w-3" />
                            رقم موثق
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-ink-300">
                        {row.fullName} · <span dir="ltr">{row.phone}</span>
                        {row.address ? ` · ${row.address}` : ""} · {cat.shortLabel} · {typeCfg.label}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <a
                      href={whatsappLink(row.phone, `مرحباً ${row.fullName}، بخصوص طلبك "${row.title}" في منصة ViP Yemen`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-[#25d366]/15 px-2.5 py-1.5 text-[11px] font-black text-[#4ade80] hover:bg-[#25d366]/25"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      واتساب
                    </a>
                    <button
                      onClick={() => setEditing(row)}
                      className="inline-flex items-center gap-1 rounded-lg border border-ink-600/60 px-2.5 py-1.5 text-[11px] font-bold text-ink-200 hover:border-gold-500/50 hover:text-gold-300"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      مراجعة / تعديل
                    </button>
                    {row.status !== "published" && (
                      <button
                        onClick={() => act(row._id, "published", "اعتماد ونشر")}
                        disabled={busyId === row._id}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1.5 text-[11px] font-black text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
                      >
                        {busyId === row._id ? <Spinner /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        نشر
                      </button>
                    )}
                    {row.status === "published" && (
                      <>
                        <button
                          onClick={() => act(row._id, "sold", "تم بيع هذا العرض")}
                          disabled={busyId === row._id}
                          className="inline-flex items-center gap-1 rounded-lg bg-sky-500/15 px-2.5 py-1.5 text-[11px] font-black text-sky-300 hover:bg-sky-500/25 disabled:opacity-50"
                        >
                          <PackageCheck className="h-3.5 w-3.5" />
                          تم البيع
                        </button>
                        <button
                          onClick={() => act(row._id, "pending", "سحب من النشر")}
                          disabled={busyId === row._id}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          سحب
                        </button>
                      </>
                    )}
                    {row.status !== "rejected" && row.status !== "archived" && (
                      <button
                        onClick={() => act(row._id, "rejected", "مرفوض من الإدارة")}
                        disabled={busyId === row._id}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-bold text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        رفض
                      </button>
                    )}
                    <button
                      onClick={() => act(row._id, "archived", "نقل للأرشيف")}
                      disabled={busyId === row._id}
                      className="inline-flex items-center gap-1 rounded-lg border border-ink-600/60 px-2.5 py-1.5 text-[11px] font-bold text-ink-300 hover:border-gold-500/50 disabled:opacity-50"
                      title="أرشفة"
                    >
                      <Archive className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(row._id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 px-2.5 py-1.5 text-[11px] font-bold text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                      title="حذف نهائي"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Channel publish status + one-click re-push */}
                {(row.publishedTo?.length > 0 || row.status === "published" || row.status === "sold") && (
                  <div className="flex flex-wrap items-center gap-1.5 border-t border-ink-700/50 bg-gold-500/[0.03] px-4 py-2">
                    <span className="text-[10px] font-black text-ink-400">القنوات:</span>
                    {(row.publishedTo ?? []).length === 0 ? (
                      <span className="text-[10px] font-bold text-ink-400">لم تُنشر للقنوات بعد</span>
                    ) : (
                      (row.publishedTo as string[]).map((ch) => (
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
                    {row.lastChannelPush && (
                      <span className="text-[10px] font-semibold text-ink-500">آخر نشر: {formatDateTime(row.lastChannelPush)}</span>
                    )}
                    {(row.status === "published" || row.status === "sold") && (
                      <button
                        onClick={async () => {
                          try {
                            await repushMut({ token, kind: "submission", itemId: row._id });
                          } catch (err: any) {
                            alert(err.message ?? "تعذر النشر للقنوات");
                          }
                        }}
                        className="mr-auto inline-flex items-center gap-1 rounded-lg border border-gold-500/40 bg-gold-500/10 px-2.5 py-1 text-[10px] font-black text-gold-300 transition-colors hover:bg-gold-500/20"
                        title="إعادة نشر هذا الإعلان على قنوات المنصة (تيليجرام / واتساب)"
                      >
                        <Send className="h-3 w-3" />
                        إعادة نشر للقنوات
                      </button>
                    )}
                  </div>
                )}

                {/* Attachments strip */}
                {row.attachments && row.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 border-t border-ink-700/50 px-4 py-2.5">
                    {row.attachments.map((a: any, i: number) =>
                      a.kind === "image" && a.url ? (
                        <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" title={a.name}>
                          <img
                            src={a.url}
                            alt={a.name}
                            className="h-12 w-12 rounded-lg border border-ink-600/50 object-cover"
                          />
                        </a>
                      ) : (
                        <a
                          key={i}
                          href={a.url ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-ink-600/50 bg-ink-800/60 px-2.5 py-1.5 text-[10px] font-bold text-ink-200 hover:border-gold-500/50"
                        >
                          {a.name}
                        </a>
                      )
                    )}
                  </div>
                )}

                {row.adminNote && (
                  <p className="border-t border-ink-700/50 bg-amber-500/5 px-4 py-2 text-[11px] font-semibold text-amber-200">
                    ملاحظة الإدارة: {row.adminNote}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <EditModal
          row={editing}
          token={token}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            await updateMut({ token, id: editing._id, patch });
            setEditing(null);
          }}
          onTogglePhone={async () => {
            await togglePhone({ token, id: editing._id, verified: !editing.phoneVerified });
            setEditing({ ...editing, phoneVerified: !editing.phoneVerified });
          }}
        />
      )}
    </div>
  );
}

function EditModal({
  row,
  token,
  onClose,
  onSave,
  onTogglePhone,
}: {
  row: any;
  token: string;
  onClose: () => void;
  onSave: (patch: any) => Promise<void>;
  onTogglePhone: () => Promise<void>;
}) {
  const cat = getCategory(row.category);
  const typeCfg = getType(cat, row.type);
  const [title, setTitle] = useState(row.title);
  const [description, setDescription] = useState(row.description ?? "");
  const [fullName, setFullName] = useState(row.fullName);
  const [phone, setPhone] = useState(row.phone);
  const [address, setAddress] = useState(row.address ?? "");
  const [price, setPrice] = useState(row.price?.toString() ?? "");
  const [currency, setCurrency] = useState(row.currency ?? "yer");
  const [fields, setFields] = useState<Record<string, string>>(row.fields ?? {});
  const [adminNote, setAdminNote] = useState(row.adminNote ?? "");
  const [saving, setSaving] = useState(false);

  return (
    <Modal open onClose={onClose} title={`مراجعة وتعديل — ${row.title}`} wide>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label-app">{typeCfg.titleLabel}</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="label-app">الاسم الكامل</label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="label-app">رقم الهاتف</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className="text-left" />
          </div>
          <div>
            <label className="label-app">العنوان</label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div>
            <label className="label-app">السعر</label>
            <div className="flex gap-2">
              <Input value={price} onChange={(e) => setPrice(e.target.value)} type="number" dir="ltr" className="text-left" />
              <Select value={currency} onChange={(e) => setCurrency(e.target.value)} className="!w-32">
                <option value="yer">ريال يمني</option>
                <option value="usd">دولار</option>
                <option value="sar">ريال سعودي</option>
              </Select>
            </div>
          </div>
          <div>
            <label className="label-app">التحقق من الهاتف</label>
            <button
              onClick={onTogglePhone}
              className={cn(
                "inline-flex w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-black transition-colors",
                row.phoneVerified
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
              )}
            >
              <BadgeCheck className="h-4 w-4" />
              {row.phoneVerified ? "إلغاء التوثيق" : "تأكيد توثيق الرقم"}
            </button>
          </div>
        </div>

        {typeCfg.fields.map((f) => (
          <div key={f.name}>
            <label className="label-app">{f.label}</label>
            {f.type === "textarea" ? (
              <Textarea
                value={fields[f.name] ?? ""}
                onChange={(e) => setFields((prev) => ({ ...prev, [f.name]: e.target.value }))}
              />
            ) : f.type === "select" ? (
              <Select value={fields[f.name] ?? ""} onChange={(e) => setFields((prev) => ({ ...prev, [f.name]: e.target.value }))}>
                <option value="">اختر...</option>
                {f.options?.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </Select>
            ) : (
              <Input value={fields[f.name] ?? ""} onChange={(e) => setFields((prev) => ({ ...prev, [f.name]: e.target.value }))} />
            )}
          </div>
        ))}

        <div>
          <label className="label-app">الوصف التفصيلي</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {row.attachments && row.attachments.length > 0 && (
          <div>
            <label className="label-app">المرفقات ({row.attachments.length})</label>
            <div className="flex flex-wrap gap-2">
              {row.attachments.map((a: any, i: number) => (
                <a
                  key={i}
                  href={a.url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-ink-600/50 bg-ink-800/60 px-3 py-1.5 text-[11px] font-bold text-ink-200 hover:border-gold-500/50"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {a.name}
                </a>
              ))}
            </div>
          </div>
        )}

        {row.history && row.history.length > 0 && (
          <div>
            <label className="label-app">سجل التعديلات</label>
            <div className="max-h-28 space-y-1 overflow-y-auto rounded-xl border border-ink-700/50 bg-ink-950/50 p-3">
              {row.history.map((h: any, i: number) => (
                <p key={i} className="text-[10px] font-semibold text-ink-400">
                  {formatDateTime(h.at)} — {h.by}: {h.action} {h.note ? `(${h.note})` : ""}
                </p>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="label-app">ملاحظة الإدارة (داخلية)</label>
          <Textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder="ملاحظات المراجعة — لا تظهر للجمهور"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            loading={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave({
                  title,
                  description,
                  fullName,
                  phone,
                  address,
                  price: price ? Number(price) : undefined,
                  currency,
                  fields,
                  adminNote,
                });
              } finally {
                setSaving(false);
              }
            }}
          >
            حفظ التعديلات
          </Button>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
        </div>
      </div>
    </Modal>
  );
}