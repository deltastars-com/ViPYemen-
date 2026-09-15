import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { motion } from "framer-motion";
import {
  Landmark,
  Smartphone,
  Wallet,
  Copy,
  CheckCircle2,
  Clock3,
  XCircle,
  FileCheck2,
  UploadCloud,
  Search,
  ShieldCheck,
} from "lucide-react";
import { SectionHeading } from "@/components/SectionHeading";
import { Button, Input, Label, Textarea, Badge } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * 💳 Payment methods — Al-Kuraimi bank + Jawali & Jaib wallets.
 * All three are tied to the platform phone 773597404. The customer transfers,
 * submits the receipt reference + proof, and the admin archives & reviews it
 * privately in the dashboard. Receipts settle into the finance ledger.
 */

const PLATFORM_PHONE_DISPLAY = "773597404";
const PLATFORM_PHONE_INTL = "+967773597404";

const METHODS = [
  {
    key: "kuraimi",
    icon: Landmark,
    accountLabelAr: "حساب بنك الكريمي",
    accountLabelEn: "Al-Kuraimi Bank Account",
    account: "121147699",
    accountNoteAr: "رقم الحساب البنكي — تحويل بنكي",
    accountNoteEn: "Bank account number — bank transfer",
    qr: "/qr/qr-kuraimi.png",
    accent: "text-violet-300",
    bg: "bg-violet-500/10",
    border: "border-violet-500/40",
    glow: "shadow-[0_0_40px_-14px_rgba(139,92,246,0.5)]",
  },
  {
    key: "jawali",
    icon: Smartphone,
    accountLabelAr: "محفظة جوالي",
    accountLabelEn: "Jawali Wallet",
    account: "773597404",
    accountNoteAr: "رقم المحفظة = رقم الحساب",
    accountNoteEn: "Wallet number = account number",
    qr: "/qr/qr-jawali.png",
    accent: "text-sky-300",
    bg: "bg-sky-500/10",
    border: "border-sky-500/40",
    glow: "shadow-[0_0_40px_-14px_rgba(14,165,233,0.5)]",
  },
  {
    key: "jaib",
    icon: Wallet,
    accountLabelAr: "محفظة جيب",
    accountLabelEn: "Jaib Wallet",
    account: "773597404",
    accountNoteAr: "رقم المحفظة = رقم الحساب",
    accountNoteEn: "Wallet number = account number",
    qr: "/qr/qr-jaib.png",
    accent: "text-rose-300",
    bg: "bg-rose-500/10",
    border: "border-rose-500/40",
    glow: "shadow-[0_0_40px_-14px_rgba(244,63,94,0.5)]",
  },
] as const;

type MethodKey = (typeof METHODS)[number]["key"];

function methodLabel(key: string, lang: "ar" | "en") {
  const m = METHODS.find((x) => x.key === key);
  if (!m) return key;
  return lang === "ar" ? m.accountLabelAr : m.accountLabelEn;
}

const STATUS_META: Record<string, { ar: string; en: string; cls: string; icon: typeof Clock3 }> = {
  pending: { ar: "قيد التدقيق", en: "Under review", cls: "border-amber-500/40 bg-amber-500/10 text-amber-300", icon: Clock3 },
  confirmed: { ar: "تم التأكيد", en: "Confirmed", cls: "border-sky-500/40 bg-sky-500/10 text-sky-300", icon: CheckCircle2 },
  settled: { ar: "مُسوَّى ومؤرشف", en: "Settled & archived", cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300", icon: FileCheck2 },
  rejected: { ar: "مرفوض", en: "Rejected", cls: "border-rose-500/40 bg-rose-500/10 text-rose-300", icon: XCircle },
};

export function PaymentPage() {
  const { lang, t } = useLang();
  const submit = useMutation(api.payments.submitPayment);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const myReceipts = useQuery(api.payments.myPayments, { phone: "" });

  const [method, setMethod] = useState<MethodKey>("kuraimi");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("YER");
  const [payerName, setPayerName] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [reference, setReference] = useState("");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [proofId, setProofId] = useState<string | null>(null);
  const [proofName, setProofName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // Receipt lookup by phone
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookup, setLookup] = useState("");
  const lookupResults = useQuery(
    api.payments.myPayments,
    lookup.trim().length >= 9 ? { phone: lookup } : "skip"
  );

  const activeMethod = useMemo(() => METHODS.find((m) => m.key === method)!, [method]);

  async function handleProof(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      const file = files[0];
      const url = await generateUploadUrl();
      const result = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      setProofId(storageId);
      setProofName(file.name);
    } catch (e: any) {
      setError(e.message ?? (lang === "ar" ? "فشل رفع الملف — حاول مرة أخرى" : "Upload failed — try again"));
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await submit({
        method,
        amount: Number(amount),
        currency,
        payerName,
        payerPhone,
        reference,
        purpose: purpose || undefined,
        notes: notes || undefined,
        proofStorageId: proofId || undefined,
      });
      setDone(true);
    } catch (err: any) {
      setError(err.message ?? (lang === "ar" ? "تعذر إرسال السند" : "Could not submit receipt"));
    } finally {
      setBusy(false);
    }
  }

  const L = (ar: string, en: string) => (lang === "ar" ? ar : en);

  return (
    <div className="animate-fade-up">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink-700/50">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(212,175,55,0.35), transparent 40%), radial-gradient(circle at 80% 80%, rgba(56,189,248,0.25), transparent 50%)",
          }}
        />
        <div className="container-app relative py-14 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl"
          >
            <span className="chip mb-4 !border-gold-500/40 !bg-gold-500/10 !text-gold-300">
              <Landmark className="h-3.5 w-3.5" />
              {L("المدفوعات البنكية", "Bank Payments")}
            </span>
            <h1 className="section-title leading-tight text-cream">
              {L("الدفع الآمن عبر", "Secure payment via")}{" "}
              <span className="gold-text">{L("الحسابات الرسمية", "official accounts")}</span>
            </h1>
            <div className="section-title-underline" />
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-300 sm:text-base">
              {L(
                "حوّل قيمة الخدمة أو المهمة عبر بنك الكريمي أو محفظة جوالي أو جيب — ثم سجّل السند هنا مع صورة الإيصال. تُؤرشف السندات وتُدقَّق من إدارة المنصة بشكل خاص وسري، ويصلك تحديث حالتها فوراً.",
                "Transfer the service fee via Al-Kuraimi bank or Jawali/Jaib wallets — then register the receipt here with the proof image. All receipts are archived and verified privately by platform management, and you get a status update instantly."
              )}
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container-app py-10">
        {/* Payment methods */}
        <SectionHeading
          icon={Landmark}
          title={L("طرق الدفع المعتمدة", "Approved payment methods")}
          highlight={L("— كلها مرتبطة برقم 773597404", "— all tied to 773597404")}
          subtitle={L(
            "امسح رمز QR أو انسخ الرقم — كل الطرق باسم المنصة نفسه. رقم المحفظة يُعتبر رقم الحساب.",
            "Scan the QR or copy the number — all methods are under the platform's name. The wallet number is the account number."
          )}
        />

        <div className="grid gap-6 md:grid-cols-3">
          {METHODS.map((m, i) => (
            <motion.button
              key={m.key}
              type="button"
              onClick={() => setMethod(m.key)}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.08 }}
              className={cn(
                "card-surface group relative overflow-hidden text-right transition-all hover:-translate-y-1",
                method === m.key ? cn(m.border, m.glow, "ring-1 ring-gold-500/50") : "border-ink-600/60"
              )}
            >
              {method === m.key && (
                <span className="absolute left-3 top-3 rounded-full border border-gold-500/50 bg-gold-500/15 px-2.5 py-0.5 text-[10px] font-black text-gold-300">
                  {L("مختار", "Selected")}
                </span>
              )}
              <div className="flex items-center gap-3 px-5 pt-5">
                <span className={cn("flex h-12 w-12 items-center justify-center rounded-xl border", m.border, m.bg, m.accent)}>
                  <m.icon className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-cream">{lang === "ar" ? m.accountLabelAr : m.accountLabelEn}</h3>
                  <p className="text-[11px] text-ink-400">{lang === "ar" ? m.accountNoteAr : m.accountNoteEn}</p>
                </div>
              </div>
              <div className="px-5 pb-4 pt-3">
                <div className="flex items-center justify-between rounded-xl border border-ink-600/60 bg-ink-950/60 px-4 py-3">
                  <span className="text-lg font-black tracking-wider text-cream" dir="ltr">
                    {m.account}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard?.writeText(m.account).catch(() => {});
                    }}
                    className={cn("rounded-lg p-2 transition-colors hover:bg-ink-800", m.accent)}
                    aria-label={L("نسخ الرقم", "Copy number")}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <img
                  src={m.qr}
                  alt={lang === "ar" ? m.accountLabelAr : m.accountLabelEn}
                  className="mx-auto mt-4 h-44 w-44 rounded-xl border border-ink-600/60 bg-white object-contain p-2"
                  loading="lazy"
                />
                <p className="mt-3 text-center text-[11px] text-ink-400">
                  {L("امسح الرمز من تطبيق", "Scan from the")} {lang === "ar" ? (m.key === "kuraimi" ? "الكريمي" : m.key === "jawali" ? "جوالي" : "جيب") : (m.key === "kuraimi" ? "Kuraimi" : m.key === "jawali" ? "Jawali" : "Jaib")} {L("app", "app")}
                </p>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Receipt form */}
        <div className="mt-14 grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <SectionHeading
              icon={FileCheck2}
              title={L("تسجيل سند الدفع", "Register your payment receipt")}
              subtitle={L(
                "بياناتك تصل لوحة التحكم بشكل خاص وسري — لا تظهر لأي طرف آخر.",
                "Your data reaches the admin panel privately — no one else sees it."
              )}
            />
            {done ? (
              <div className="card-surface p-8 text-center">
                <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />
                <h3 className="mt-4 text-lg font-black text-cream">
                  {L("تم استلام سندك بنجاح", "Receipt received successfully")}
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-300">
                  {L(
                    "سندك الآن في أرشيف الإدارة قيد التدقيق. ستتواصل معك إدارة المنصة للتأكيد، وتابع حالة السند من قسم «تتبع السند» أدناه برقم هاتفك.",
                    "Your receipt is now in the admin archive under review. Management will contact you to confirm, and you can track its status below via your phone number."
                  )}
                </p>
                <button onClick={() => setDone(false)} className="btn-ghost mt-5">
                  {L("تسجيل سند آخر", "Register another receipt")}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="card-surface space-y-4 p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>{L("طريقة الدفع", "Payment method")}</Label>
                    <div className="mt-1.5 grid grid-cols-3 gap-2">
                      {METHODS.map((m) => (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setMethod(m.key)}
                          className={cn(
                            "rounded-xl border px-2 py-2.5 text-xs font-bold transition-all",
                            method === m.key
                              ? cn(m.border, m.bg, m.accent)
                              : "border-ink-600/60 text-ink-300 hover:border-ink-500"
                          )}
                        >
                          {L(
                            m.key === "kuraimi" ? "الكريمي" : m.key === "jawali" ? "جوالي" : "جيب",
                            m.key === "kuraimi" ? "Kuraimi" : m.key === "jawali" ? "Jawali" : "Jaib"
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>{L("المبلغ المدفوع", "Amount paid")}</Label>
                    <div className="mt-1.5 flex gap-2">
                      <Input
                        required
                        type="number"
                        min="1"
                        step="any"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="150,000"
                      />
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="input-app w-24"
                        aria-label={L("العملة", "Currency")}
                      >
                        <option value="YER">{t("yemeniRiyal")}</option>
                        <option value="USD">{t("dollar")}</option>
                        <option value="SAR">{t("saudiRiyal")}</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>{L("اسم المُرسل (كما في الحوالة)", "Sender name (as in the transfer)")}</Label>
                    <Input required value={payerName} onChange={(e) => setPayerName(e.target.value)} placeholder={t("fullNamePlaceholder")} />
                  </div>
                  <div>
                    <Label>{t("phoneLabel")}</Label>
                    <Input
                      required
                      type="tel"
                      dir="ltr"
                      value={payerPhone}
                      onChange={(e) => setPayerPhone(e.target.value)}
                      placeholder={t("phonePlaceholder")}
                    />
                  </div>
                </div>

                <div>
                  <Label>{L("رقم السند / المرجع من الإيصال", "Receipt / reference number")}</Label>
                  <Input required dir="ltr" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. 981234567" />
                </div>

                <div>
                  <Label>{L("مقابل أي خدمة؟ (اختياري)", "For which service? (optional)")}</Label>
                  <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder={L("مثال: باقة التسويق الشامل", "e.g. Full marketing package")} />
                </div>

                <div>
                  <Label>{L("صورة الإيصال أو السند", "Receipt / voucher image")}</Label>
                  <label className="mt-1.5 flex cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-dashed border-ink-600/60 bg-ink-950/40 px-4 py-6 text-center transition-colors hover:border-gold-500/50">
                    <UploadCloud className={cn("h-6 w-6", uploading ? "animate-pulse text-gold-400" : "text-ink-400")} />
                    <div>
                      <span className="text-sm font-bold text-cream">
                        {uploading ? L("جارٍ الرفع...", "Uploading...") : proofName || L("اضغط لإرفاق صورة الإيصال", "Attach receipt image")}
                      </span>
                      <p className="text-[11px] text-ink-400">PNG / JPG / PDF</p>
                    </div>
                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleProof(e.target.files)} />
                  </label>
                </div>

                <div>
                  <Label>{L("ملاحظات (اختياري)", "Notes (optional)")}</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>

                {error && (
                  <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300">{error}</p>
                )}

                <Button type="submit" loading={busy} className="w-full">
                  <ShieldCheck className="h-4 w-4" />
                  {L("إرسال السند للإدارة", "Send receipt to management")}
                </Button>
                <p className="text-center text-[11px] text-ink-400">
                  {t("dataReviewedPrivately")}
                </p>
              </form>
            )}
          </div>

          {/* Receipt tracking */}
          <div className="lg:col-span-2">
            <SectionHeading
              icon={Search}
              title={L("تتبع السندات", "Track receipts")}
              subtitle={L("أدخل رقم هاتفك لعرض كل سنداتك وحالتها.", "Enter your phone number to view your receipts and their status.")}
            />
            <div className="card-surface p-5">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setLookup(lookupPhone);
                }}
                className="flex gap-2"
              >
                <Input
                  type="tel"
                  dir="ltr"
                  value={lookupPhone}
                  onChange={(e) => setLookupPhone(e.target.value)}
                  placeholder={t("phonePlaceholder")}
                  aria-label={L("رقم الهاتف", "Phone number")}
                />
                <Button type="submit" variant="ghost" aria-label={t("search")}>
                  <Search className="h-4 w-4" />
                </Button>
              </form>

              {lookup.trim().length >= 9 && (
                <div className="mt-4 space-y-3">
                  {lookupResults === undefined && (
                    <p className="text-center text-xs text-ink-400">{L("جارٍ البحث...", "Searching...")}</p>
                  )}
                  {lookupResults && lookupResults.length === 0 && (
                    <p className="rounded-lg border border-ink-600/60 bg-ink-950/40 px-3 py-3 text-center text-xs text-ink-300">
                      {L("لا توجد سندات مسجلة بهذا الرقم بعد.", "No receipts registered with this number yet.")}
                    </p>
                  )}
                  {lookupResults && lookupResults.length > 0 && (
                    <>
                      <p className="text-xs font-bold text-gold-300">
                        {lookupResults.length} {L("سند", "receipt(s)")}
                      </p>
                      {lookupResults.map((p) => {
                        const meta = STATUS_META[p.status] ?? STATUS_META.pending;
                        const Icon = meta.icon;
                        return (
                          <div key={p._id} className="rounded-xl border border-ink-600/60 bg-ink-950/50 p-3.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-black text-cream" dir="ltr">
                                {p.amount.toLocaleString("en-US")} {p.currency}
                              </span>
                              <Badge className={meta.cls}>
                                <Icon className="h-3 w-3" />
                                {lang === "ar" ? meta.ar : meta.en}
                              </Badge>
                            </div>
                            <p className="mt-1.5 text-[11px] text-ink-400">
                              {methodLabel(p.method, lang)} · {L("مرجع", "Ref")}: <span dir="ltr">{p.reference}</span>
                            </p>
                            <p className="text-[11px] text-ink-400">
                              {new Date(p.createdAt).toLocaleDateString(lang === "ar" ? "ar-YE" : "en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="card-surface mt-5 p-5">
              <h3 className="flex items-center gap-2 text-sm font-black text-gold-300">
                <ShieldCheck className="h-4 w-4" />
                {L("كيف يعمل النظام؟", "How it works")}
              </h3>
              <ol className="mt-3 space-y-2.5 text-xs leading-relaxed text-ink-300">
                <li className="flex gap-2">
                  <span className="font-black text-gold-400">1.</span>
                  {L("حوّل المبلغ عبر الطريقة المناسبة (الكريمي / جوالي / جيب).", "Transfer the amount via the method of your choice (Kuraimi / Jawali / Jaib).")}
                </li>
                <li className="flex gap-2">
                  <span className="font-black text-gold-400">2.</span>
                  {L("سجّل السند هنا مع رقم المرجع وصورة الإيصال.", "Register the receipt here with the reference number and proof image.")}
                </li>
                <li className="flex gap-2">
                  <span className="font-black text-gold-400">3.</span>
                  {L("تصل السندات للإدارة بشكل خاص وتُدقَّق خلال ساعات العمل.", "Receipts reach management privately and are verified within business hours.")}
                </li>
                <li className="flex gap-2">
                  <span className="font-black text-gold-400">4.</span>
                  {L("بعد التأكيد يُؤرشف السند ويُسجَّل في النظام المالي وتتواصل معك الإدارة.", "After confirmation the receipt is archived, recorded in the finance ledger, and management contacts you.")}
                </li>
              </ol>
              <a
                href={`https://wa.me/967773597404?text=${encodeURIComponent(L("مرحباً، لدي استفسار عن سند دفع في منصة ViP Yemen", "Hello, I have a question about a payment receipt on ViP Yemen"))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost mt-4 w-full !py-2.5 text-xs"
              >
                {L("استفسار عبر واتساب", "Ask via WhatsApp")} · {PLATFORM_PHONE_INTL}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
