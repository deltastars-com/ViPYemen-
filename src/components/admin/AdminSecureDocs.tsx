import { useState } from "react";
import { useMutation, useQuery, useConvex } from "convex/react";
import {
  KeyRound,
  Copy,
  Check,
  Eye,
  EyeOff,
  Save,
  Trash2,
  Plus,
  ShieldCheck,
  FileText,
  X,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { useLang } from "@/lib/i18n";

type DocMeta = {
  _id: string;
  name: string;
  description?: string;
  category: string;
  isSecret: boolean;
  valueLength: number;
  updatedAt: number;
};

const CATEGORIES = [
  { key: "signing", ar: "التوقيع والتوثيق", en: "Signing" },
  { key: "firebase", ar: "Firebase", en: "Firebase" },
  { key: "play", ar: "Google Play", en: "Google Play" },
  { key: "vercel", ar: "Vercel", en: "Vercel" },
  { key: "supabase", ar: "Supabase", en: "Supabase" },
  { key: "apple", ar: "Apple / iOS", en: "Apple / iOS" },
  { key: "general", ar: "عام", en: "General" },
];

export function AdminSecureDocs({ token }: { token: string }) {
  const { lang, t } = useLang();
  const ar = lang === "ar";
  const convex = useConvex();
  const docs = useQuery(api.secureDocs.listDocs, { token });
  const upsert = useMutation(api.secureDocs.upsertDoc);
  const remove = useMutation(api.secureDocs.deleteDoc);

  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [editing, setEditing] = useState<DocMeta | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function reveal(doc: DocMeta) {
    if (revealed[doc._id]) {
      setRevealed((r) => {
        const next = { ...r };
        delete next[doc._id];
        return next;
      });
      return;
    }
    try {
      const res = await convex.query(api.secureDocs.getDocValue, {
        token,
        id: doc._id as any,
      });
      setRevealed((r) => ({ ...r, [doc._id]: res.value }));
    } catch (e) {
      setError(ar ? "تعذّر إظهار القيمة" : "Failed to reveal value");
    }
  }

  async function copy(doc: DocMeta) {
    let value = revealed[doc._id];
    if (!value) {
      try {
        const res = await convex.query(api.secureDocs.getDocValue, {
          token,
          id: doc._id as any,
        });
        value = res.value;
        setRevealed((r) => ({ ...r, [doc._id]: value }));
      } catch {
        setError(ar ? "تعذّر النسخ" : "Failed to copy");
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(doc._id);
    setTimeout(() => setCopied(null), 1800);
  }

  async function del(doc: DocMeta) {
    if (!confirm(ar ? `حذف «${doc.name}» نهائياً؟` : `Permanently delete "${doc.name}"?`)) return;
    await remove({ token, id: doc._id as any });
    setRevealed((r) => {
      const next = { ...r };
      delete next[doc._id];
      return next;
    });
  }

  if (docs === undefined) {
    return (
      <div className="flex justify-center py-16 text-gold-400">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-gold-400 border-t-transparent" />
      </div>
    );
  }

  const grouped = CATEGORIES.map((c) => ({
    ...c,
    items: docs.filter((d) => d.category === c.key),
  })).filter((g) => g.items.length > 0);
  const other = docs.filter((d) => !CATEGORIES.some((c) => c.key === d.category));

  return (
    <div className="space-y-5">
      <div className="card-surface flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-gold-400" />
          <div>
            <h2 className="text-sm font-black text-cream">
              {ar ? "الخزنة — الوثائق ومفاتيح التوقيع والأسرار" : "Vault — Documents, Signing Keys & Secrets"}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-300">
              {ar
                ? "كل الوثائق الحساسة مخزّنة هنا داخل قاعدة بيانات المنصة المشفّرة، ولا يصل إليها أحد سوى إدارة المنصة بعد تسجيل الدخول. القيم لا تظهر إلا عند الضغط على «إظهار» وتُنسخ مباشرة إلى الحافظة عند الطلب."
                : "All sensitive documents are stored here in the platform's encrypted database, accessible only to platform administration after sign-in. Values stay hidden until you press Reveal, and copy straight to the clipboard on demand."}
            </p>
          </div>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="btn-gold inline-flex shrink-0 items-center gap-2 text-xs"
        >
          <Plus className="h-4 w-4" />
          {ar ? "إضافة مستند" : "Add document"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-300">
          {error}
        </div>
      )}

      {docs.length === 0 && (
        <div className="card-surface p-10 text-center">
          <FileText className="mx-auto h-10 w-10 text-ink-500" />
          <p className="mt-3 text-sm text-ink-300">
            {ar ? "لا توجد مستندات بعد — أضف أول مستند من الزر أعلاه." : "No documents yet — add the first one with the button above."}
          </p>
        </div>
      )}

      {[...grouped, ...(other.length ? [{ key: "other", ar: "أخرى", en: "Other", items: other }] : [])].map(
        (group: any) => (
          <div key={group.key}>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-gold-300">
              <KeyRound className="h-3.5 w-3.5" />
              {ar ? group.ar : group.en}
              <span className="rounded-full bg-gold-500/10 px-2 py-0.5 text-[10px] text-gold-300">
                {group.items.length}
              </span>
            </h3>
            <div className="space-y-2">
              {group.items.map((doc: DocMeta) => (
                <div key={doc._id} className="card-surface p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-cream">{doc.name}</span>
                        {doc.isSecret && (
                          <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                            {ar ? "سرّي" : "Secret"}
                          </span>
                        )}
                      </div>
                      {doc.description && (
                        <p className="mt-1 text-xs leading-relaxed text-ink-300">{doc.description}</p>
                      )}
                      <p className="mt-1 text-[10px] text-ink-400">
                        {doc.isSecret
                          ? ar
                            ? `القيمة مخفيّة (${doc.valueLength} حرفاً)`
                            : `Value hidden (${doc.valueLength} chars)`
                          : ""}
                      </p>
                      {revealed[doc._id] && (
                        <pre
                          dir="ltr"
                          className="mt-2 max-h-40 overflow-auto rounded-lg border border-ink-600/60 bg-ink-950/80 p-3 text-left text-[11px] leading-relaxed text-gold-200"
                          style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}
                        >
                          {revealed[doc._id]}
                        </pre>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      {doc.isSecret && (
                        <>
                          <button
                            onClick={() => reveal(doc)}
                            className="inline-flex items-center gap-1 rounded-lg border border-ink-600/60 px-2.5 py-1.5 text-[11px] font-bold text-ink-200 transition-colors hover:border-gold-500/50 hover:text-gold-300"
                          >
                            {revealed[doc._id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            {revealed[doc._id] ? (ar ? "إخفاء" : "Hide") : ar ? "إظهار" : "Reveal"}
                          </button>
                          <button
                            onClick={() => copy(doc)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gold-500/40 bg-gold-500/10 px-2.5 py-1.5 text-[11px] font-bold text-gold-300 transition-colors hover:bg-gold-500/20"
                          >
                            {copied === doc._id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            {copied === doc._id ? (ar ? "تم النسخ" : "Copied") : ar ? "نسخ" : "Copy"}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setEditing(doc)}
                        className="rounded-lg border border-ink-600/60 px-2.5 py-1.5 text-[11px] font-bold text-ink-200 transition-colors hover:border-gold-500/50 hover:text-gold-300"
                      >
                        {ar ? "تعديل" : "Edit"}
                      </button>
                      <button
                        onClick={() => del(doc)}
                        className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-bold text-rose-300 transition-colors hover:bg-rose-500/20"
                        aria-label={ar ? "حذف" : "Delete"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {(creating || editing) && (
        <DocForm
          token={token}
          existing={editing}
          ar={ar}
          t={t}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function DocForm({
  token,
  existing,
  ar,
  t,
  onClose,
}: {
  token: string;
  existing: DocMeta | null;
  ar: boolean;
  t: (k: string) => string;
  onClose: () => void;
}) {
  const upsert = useMutation(api.secureDocs.upsertDoc);
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [category, setCategory] = useState(existing?.category ?? "signing");
  const [isSecret, setIsSecret] = useState(existing?.isSecret ?? true);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!name.trim()) {
      setError(ar ? "الاسم مطلوب" : "Name is required");
      return;
    }
    if (!existing && !value) {
      setError(ar ? "القيمة مطلوبة" : "Value is required");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await upsert({
        token,
        id: existing ? (existing._id as any) : undefined,
        name,
        description: description || undefined,
        category,
        isSecret,
        value: value || "",
      });
      onClose();
    } catch (e) {
      setError(ar ? "تعذّر الحفظ — تحقق من الجلسة" : "Save failed — check your session");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="card-surface relative z-10 w-full max-w-lg p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-cream">
            {existing ? (ar ? "تعديل مستند" : "Edit document") : ar ? "مستند جديد" : "New document"}
          </h3>
          <button onClick={onClose} className="rounded-lg border border-ink-600/60 p-1.5 text-ink-300 hover:text-cream" aria-label={t("close")}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-ink-200">{ar ? "الاسم" : "Name"} *</label>
            <input
              dir="ltr"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ANDROID_KEYSTORE_PASSWORD"
              className="w-full rounded-lg border border-ink-600/60 bg-ink-950/60 px-3 py-2 text-sm text-cream outline-none focus:border-gold-500/60"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-ink-200">{ar ? "الوصف" : "Description"}</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={ar ? "كلمة مرور ملف توقيع Android" : "Android keystore password"}
              className="w-full rounded-lg border border-ink-600/60 bg-ink-950/60 px-3 py-2 text-sm text-cream outline-none focus:border-gold-500/60"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-bold text-ink-200">{ar ? "التصنيف" : "Category"}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-ink-600/60 bg-ink-950/60 px-3 py-2 text-sm text-cream outline-none focus:border-gold-500/60"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key} className="bg-ink-950">
                    {ar ? c.ar : c.en}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex cursor-pointer items-center gap-2 self-end pb-2">
              <input type="checkbox" checked={isSecret} onChange={(e) => setIsSecret(e.target.checked)} className="accent-gold-400" />
              <span className="text-xs font-bold text-ink-200">{ar ? "سرّي (يُخفى)" : "Secret (hidden)"}</span>
            </label>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-ink-200">
              {existing ? (ar ? "قيمة جديدة (اتركها فارغة للإبقاء على القيمة الحالية)" : "New value (leave empty to keep current)") : ar ? "القيمة" : "Value"} *
            </label>
            <textarea
              dir="ltr"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-ink-600/60 bg-ink-950/60 px-3 py-2 text-left font-mono text-xs text-cream outline-none focus:border-gold-500/60"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-xs font-bold text-rose-400">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button onClick={save} disabled={busy} className="btn-gold flex-1 disabled:opacity-60">
            <Save className="mr-1.5 inline h-4 w-4" />
            {busy ? (ar ? "جارٍ الحفظ..." : "Saving...") : ar ? "حفظ" : "Save"}
          </button>
          <button onClick={onClose} className="btn-ghost flex-1">
            {ar ? "إلغاء" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
