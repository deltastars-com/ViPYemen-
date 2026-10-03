import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../convex/_generated/api";
import { queueSubmission } from "@/lib/outbox";
import {
  CheckCircle2,
  FileSignature,
  Fingerprint,
  History,
  MessageCircle,
  PhoneCall,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  X,
  FileText,
  ImageIcon,
  Loader2,
} from "lucide-react";
import { Button, Input, Label, Select, Textarea } from "./ui";
import { SignaturePad } from "./admin/ContractModal";
import {
  createFingerprint,
  fallbackFingerprint,
  FingerprintUnavailable,
  type FingerprintResult,
} from "@/lib/fingerprint";
import { getType, type CategoryConfig } from "@/lib/categories";
import { fileKindOf, whatsappLink, PLATFORM_WHATSAPP_DISPLAY } from "@/lib/utils";
import { liveText } from "@/lib/liveLabels";
import { useLang } from "@/lib/i18n";

interface Attachment {
  name: string;
  storageId: string;
  kind: string;
}

export function SubmissionForm({ category }: { category: CategoryConfig }) {
  const { t, tField, tOption, lang } = useLang();
  const [typeValue, setTypeValue] = useState(category.types[0].value);
  const submit = useMutation(api.submissions.submit);
  const requestOtp = useMutation(api.submissions.requestPhoneOtp);
  const reactivate = useMutation(api.submissions.reactivate);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

  const typeConfig = useMemo(() => getType(category, typeValue), [category, typeValue]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("yer");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [otpCode, setOtpCode] = useState("");
  const [otpState, setOtpState] = useState<{ code: string; phone: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [queuedOffline, setQueuedOffline] = useState(false);
  // 🔏 التوثيق الإلكتروني والالتزام المالي — مرتبط بالطلب عند تقديمه
  const [enableCert, setEnableCert] = useState(false);
  const [certAmount, setCertAmount] = useState("");
  const [certCommission, setCertCommission] = useState("");
  const [certSignature, setCertSignature] = useState("");
  const [certFingerprint, setCertFingerprint] = useState<FingerprintResult | null>(null);
  const [certConsent, setCertConsent] = useState(false);
  const [certError, setCertError] = useState("");
  const [receiptNo, setReceiptNo] = useState<string | null>(null);
  // 🔁 العميل السابق: يُكشف عند التحقق من رقم الهاتف وعند الإرسال
  const [returning, setReturning] = useState<{
    count: number;
    lastTitle?: string | null;
    archivedFiles?: number;
    lastSubmissionId?: string;
  } | null>(null);
  const [reactivatedTitle, setReactivatedTitle] = useState("");
  const [reactivating, setReactivating] = useState(false);

  async function handleOtp() {
    setError("");
    if (!phone.trim()) {
      setError(t("otpError"));
      return;
    }
    try {
      const res = await requestOtp({ phone });
      setOtpState({ code: res.code, phone: res.phone });
      // إشعار تلقائي: العميل معروف مسبقاً ⇢ تنشيط أو إضافة جديد
      setReturning(
        res.returning
          ? {
              count: res.returning.count,
              lastTitle: res.returning.lastTitle,
              archivedFiles: res.returning.archivedFiles,
              lastSubmissionId: res.returning.lastSubmissionId,
            }
          : null
      );
    } catch (e: any) {
      setError(e.message ?? t("otpSendError"));
    }
  }

  async function handleReactivate() {
    if (!returning?.lastSubmissionId) {
      setError(liveText("returningError", lang));
      return;
    }
    setReactivating(true);
    setError("");
    try {
      const res = await reactivate({ phone, id: returning.lastSubmissionId });
      setReactivatedTitle(res.title);
      setReturning(null);
    } catch (e: any) {
      setError(e?.message ?? liveText("returningError", lang));
    } finally {
      setReactivating(false);
    }
  }

  const MAX_FILES = 3;
  const MAX_FILE_SIZE_MB = 5;
  const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = MAX_FILES - attachments.length;
    if (remaining <= 0) {
      setError(`الحد الأقصى ${MAX_FILES} ملفات. للملفات الكبيرة أو الإضافية، تواصل عبر واتساب: ${PLATFORM_WHATSAPP_DISPLAY}`);
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length < files.length) {
      setError(`تم تحديد ${files.length} ملف لكن يُسمح بـ ${MAX_FILES} فقط. للملفات الإضافية، تواصل عبر واتساب: ${PLATFORM_WHATSAPP_DISPLAY}`);
    }
    setUploading(true);
    setError("");
    try {
      for (const file of toUpload) {
        if (file.size > MAX_FILE_SIZE) {
          setError(`الملف "${file.name}" كبير جداً (${(file.size / 1024 / 1024).toFixed(1)}MB). الحد الأقصى ${MAX_FILE_SIZE_MB}MB. للملفات الكبيرة، تواصل عبر واتساب: ${PLATFORM_WHATSAPP_DISPLAY}`);
          setUploading(false);
          return;
        }
        const url = await generateUploadUrl();
        const result = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await result.json();
        setAttachments((prev) => [
          ...prev,
          { name: file.name, storageId, kind: fileKindOf(file.type) },
        ]);
      }
    } catch (e: any) {
      setError(e.message ?? t("fileUploadError"));
    } finally {
      setUploading(false);
    }
  }

  async function handleCertFingerprint() {
    setCertError("");
    try {
      setCertFingerprint(await createFingerprint());
    } catch (err) {
      if (err instanceof FingerprintUnavailable) {
        setCertError("هذا الجهاز لا يدعم ماسح البصمة — استخدم «تأكيد بديل مسجّل».");
      } else {
        setCertError("لم يُؤكَّد البصمة — أعد المحاولة.");
      }
    }
  }

  function buildCertification(): {
    error?: string;
    cert?: {
      amount: number;
      commission: number;
      currency: string;
      signature: string;
      signatureType: string;
      fingerprint: FingerprintResult;
      consent: boolean;
    };
  } {
    if (!enableCert) return {};
    const amount = Number(certAmount) || 0;
    const commission = Number(certCommission) || 0;
    if (!(amount > 0)) return { error: "أدخل المبلغ المتفق عليه مع الإدارة لإتمام التوثيق." };
    if (commission < 0 || commission > amount)
      return { error: "عمولة المنصة يجب أن تكون بين صفر والمبلغ المتفق عليه." };
    if (certSignature.trim().length < 10)
      return { error: "ارسم توقيعك الإلكتروني في خانة التوقيع." };
    if (!certFingerprint?.verified)
      return { error: "أكّد البصمة الإلكترونية لإتمام التوثيق." };
    if (!certConsent)
      return { error: "يجب الموافقة على الالتزام المالي بعمولة المنصة." };
    return {
      cert: {
        amount,
        commission,
        currency: currency === "usd" ? "USD" : currency === "sar" ? "SAR" : "YER",
        signature: certSignature,
        signatureType: "drawn",
        fingerprint: certFingerprint,
        consent: true,
      },
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const certResult = buildCertification();
    if (certResult.error) {
      setCertError(certResult.error);
      setBusy(false);
      return;
    }
    const payload = {
      category: category.key,
      type: typeValue,
      title,
      description,
      fullName,
      phone,
      email: email.trim() || undefined,
      address,
      price: price ? Number(price) : undefined,
      currency,
      fields,
      attachments,
      otpCode: otpCode.trim() || undefined,
      certification: certResult.cert,
    };
    try {
      const result: any = await submit(payload);
      if (result?.receiptNo) setReceiptNo(result.receiptNo);
      if (result?.returning && !returning) {
        setReturning(
          result.returning.lastSubmissionId
            ? result.returning
            : {
                count: result.returning.previousCount,
                lastTitle: result.returning.lastTitle,
              }
        );
      }
      setQueuedOffline(false);
      setDone(true);
    } catch (err: any) {
      // 🛟 Continuity: only REAL validation failures surface as an error.
      // If the device is offline OR the backend/host is unreachable, the
      // submission is saved to the offline outbox and delivered automatically
      // when connectivity returns — the request is never lost.
      const permanent = err instanceof ConvexError;
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      const netError = /fetch|network|websocket|timeout|connection|offline|failed to|aborted|socket|ECONN|503|502|504/i.test(
        String(err?.message ?? err?.name ?? "")
      );
      if (!permanent && (offline || netError)) {
        queueSubmission(payload);
        setQueuedOffline(true);
        setDone(true);
      } else {
        setError(err.message ?? t("submitError"));
      }
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card-surface flex flex-col items-center gap-4 p-8 text-center">
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-full ${
            queuedOffline
              ? "bg-amber-400/15 text-amber-300"
              : "bg-emerald-500/15 text-emerald-300"
          }`}
        >
          {queuedOffline ? (
            <UploadCloud className="h-9 w-9" />
          ) : (
            <CheckCircle2 className="h-9 w-9" />
          )}
        </div>
        <h3 className="text-xl font-extrabold text-cream">
          {queuedOffline ? "حُفظ طلبك في انتظار الإرسال" : t("submissionSuccess")}
        </h3>
        <p className="max-w-md text-sm leading-relaxed text-ink-300">
          {queuedOffline
            ? "لا يوجد اتصال بالخادم الآن — لم يضيع طلبك. سيُرسَل تلقائياً فور عودة الشبكة دون أي إدخال إضافي منك."
            : t("submissionSuccessSub")}
        </p>
        {receiptNo && (
          <div className="w-full max-w-md rounded-2xl border border-gold-500/40 bg-gold-500/10 p-4 text-[12px] leading-relaxed text-ink-200">
            <p className="font-black text-gold-200">
              <FileSignature className="ml-1 inline h-4 w-4" />
              توثيق إلكتروني مكتمل بالبصمة
            </p>
            <p className="mt-1">
              رقم السند: <b dir="ltr" className="text-cream">{receiptNo}</b> — التزامك المالي موثّق ومرتبط بطلبك، وسيتواصل معك فريق الإدارة لتأكيد العمولة المتفق عليها.
            </p>
          </div>
        )}
        {/* إشعار العميل السابق بعد الإرسال: تنشيط بدل إعادة كل شيء */}
        {returning && !reactivatedTitle && (
          <div className="w-full max-w-md rounded-2xl border border-gold-500/30 bg-gold-500/5 p-4 text-[12px] leading-relaxed text-ink-200">
            <p className="font-black text-gold-200">{liveText("returningTitle", lang)}</p>
            <p className="mt-1">{liveText("returningBody", lang)}</p>
            {returning.lastSubmissionId && (
              <Button
                type="button"
                variant="gold"
                className="mt-3 w-full !py-2 text-xs"
                loading={reactivating}
                onClick={handleReactivate}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {liveText("returningReactivate", lang)}
              </Button>
            )}
          </div>
        )}
        {reactivatedTitle && (
          <p className="max-w-md text-xs font-bold leading-relaxed text-emerald-300">
            {liveText("returningReactivated", lang)} — «{reactivatedTitle}»
          </p>
        )}
        <Button type="button" onClick={() => { setDone(false); setQueuedOffline(false); setOtpState(null); setOtpCode(""); setAttachments([]); setReceiptNo(null); }}>
          {t("submitAnother")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-surface space-y-5 p-5 sm:p-6">
      {/* 🔁 عميل سابق: تنشيط الطلب السابق أو إضافة جديد — بلا إعادة إرسال */}
      {returning && !reactivatedTitle && (
        <div className="rounded-2xl border border-gold-500/35 bg-gold-500/5 p-4">
          <div className="flex items-start gap-3">
            <History className="mt-0.5 h-5 w-5 shrink-0 text-gold-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-gold-200">{liveText("returningTitle", lang)}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-200">{liveText("returningBody", lang)}</p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
                <span className="chip">
                  {liveText("returningCount", lang)}: <b className="text-cream">{returning.count}</b>
                </span>
                {returning.lastTitle && (
                  <span className="chip">
                    {liveText("returningLast", lang)}: <b className="text-cream">{returning.lastTitle}</b>
                  </span>
                )}
                <span className="chip">
                  {liveText("returningArchived", lang)}:{" "}
                  <b className="text-emerald-300">{returning.archivedFiles ?? 0}</b>
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="gold"
                  className="!px-3 !py-2 text-xs"
                  loading={reactivating}
                  onClick={handleReactivate}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {liveText("returningReactivate", lang)}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="!px-3 !py-2 text-xs"
                  onClick={() => setReturning(null)}
                >
                  {liveText("returningAddNew", lang)}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {reactivatedTitle && (
        <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-4 text-xs font-bold leading-relaxed text-emerald-200">
          <CheckCircle2 className="mb-0.5 ml-1 inline h-4 w-4" />
          {liveText("returningReactivated", lang)} — «{reactivatedTitle}»
        </div>
      )}
      <div>
        <div className="mb-3 flex flex-wrap gap-2">
          {category.types.map((tp) => (
            <button
              key={tp.value}
              type="button"
              onClick={() => setTypeValue(tp.value)}
              className={
                typeValue === tp.value
                  ? "btn-gold !px-4 !py-2 text-xs"
                  : "btn-ghost !px-4 !py-2 text-xs"
              }
            >
              <tp.icon className="h-4 w-4" />
              {tField(category.key, tp.value, "label")}
            </button>
          ))}
        </div>
        <p className="text-xs font-semibold text-ink-300">
          {t("dataReviewedPrivately")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>{tField(category.key, typeValue, "titleLabel")} *</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={tField(category.key, typeValue, "titlePlaceholder")}
            required
          />
        </div>
        <div>
          <Label>{t("fullName")} *</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t("fullNamePlaceholder")} required />
        </div>
        <div>
          <Label>{t("phoneLabel")} *</Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t("phonePlaceholder")}
            dir="ltr"
            className="text-left"
            required
          />
        </div>
        <div>
          <Label>البريد الإلكتروني (اختياري)</Label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="name@example.com"
            dir="ltr"
            className="text-left"
          />
        </div>
        <div>
          <Label>{t("addressLabel")} *</Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t("addressPlaceholder")} required />
        </div>
        <div>
          <Label>{t("priceOptional")}</Label>
          <div className="flex gap-2">
            <Input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              type="number"
              min="0"
              placeholder="0"
              dir="ltr"
              className="text-left"
            />
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)} className="!w-36 shrink-0">
              <option value="yer">{t("yemeniRiyal")}</option>
              <option value="usd">{t("dollar")}</option>
              <option value="sar">{t("saudiRiyal")}</option>
            </Select>
          </div>
        </div>
        <div>
          <Label>{t("phoneVerify")}</Label>
          <div className="flex gap-2">
            <Input
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder={t("otpPlaceholder")}
              dir="ltr"
              className="text-left"
            />
            <Button type="button" variant="ghost" className="shrink-0 !px-3 text-xs" onClick={handleOtp}>
              <PhoneCall className="h-4 w-4" />
              {t("getOtp")}
            </Button>
          </div>
          {otpState && (
            <div className="mt-2 space-y-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs">
              <p className="font-bold text-emerald-300">
                {t("otpCodeLabel")} <span dir="ltr" className="tracking-widest">{otpState.code}</span>
              </p>
              <p className="text-ink-200">
                {t("otpSendViaWhatsapp").replace("{phone}", PLATFORM_WHATSAPP_DISPLAY)}
              </p>
              <a
                href={whatsappLink(
                  PLATFORM_WHATSAPP_DISPLAY,
                  `${t("otpCodeLabel")} ${otpState.code}\n${t("fullName")}: ${fullName}\n${t("phoneLabel")}: ${phone}`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-bold text-emerald-300 underline underline-offset-4"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                {t("sendViaWhatsapp")}
              </a>
            </div>
          )}
        </div>
      </div>

      {typeConfig.fields.map((f) => (
        <div key={f.name}>
          <Label>
            {tField(category.key, typeValue, f.name)} {f.required && "*"}
          </Label>
          {f.type === "textarea" ? (
            <Textarea
              value={fields[f.name] ?? ""}
              onChange={(e) => setFields((prev) => ({ ...prev, [f.name]: e.target.value }))}
              placeholder={f.placeholder}
              required={f.required}
            />
          ) : f.type === "select" ? (
            <Select
              value={fields[f.name] ?? ""}
              onChange={(e) => setFields((prev) => ({ ...prev, [f.name]: e.target.value }))}
              required={f.required}
            >
              <option value="">{t("selectOption")}</option>
              {f.options?.map((o) => (
                <option key={o} value={o}>{tOption(o)}</option>
              ))}
            </Select>
          ) : (
            <Input
              value={fields[f.name] ?? ""}
              onChange={(e) => setFields((prev) => ({ ...prev, [f.name]: e.target.value }))}
              placeholder={f.placeholder}
              type={f.type === "number" ? "number" : "text"}
              required={f.required}
            />
          )}
        </div>
      ))}

      <div>
        <Label>{tField(category.key, typeValue, "descLabel")}</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={tField(category.key, typeValue, "descPlaceholder")}
        />
      </div>

      <div>
        <Label>{t("attachmentsLabel")}</Label>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-600/70 py-6 text-ink-300 transition-colors hover:border-gold-500/60 hover:text-gold-300">
          {uploading ? (
            <Loader2 className="h-7 w-7 animate-spin" />
          ) : (
            <UploadCloud className="h-7 w-7" />
          )}
          <span className="text-xs font-bold">
            {uploading ? t("uploadingFiles") : `${t("chooseFiles")} (${attachments.length}/${MAX_FILES})`}
          </span>
          <span className="text-[10px] text-ink-400">حد أقصى {MAX_FILES} ملفات — كل ملف حتى {MAX_FILE_SIZE_MB}MB</span>
          {attachments.length >= MAX_FILES && (
            <span className="text-[10px] text-gold-400 font-bold">✓ تم الوصول للحد الأقصى</span>
          )}
          <input
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,video/*"
            className="hidden"
            disabled={attachments.length >= MAX_FILES}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-gold-500/20 bg-gold-500/5 p-2.5 text-[10px] text-ink-300">
          <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
          <p>لإرفاق ملفات كبيرة أو أكثر من {MAX_FILES} ملفات، أرسلها مباشرة عبر واتساب: <a href={whatsappLink(PLATFORM_WHATSAPP_DISPLAY, "مرحباً، أريد إرسال ملفات")} target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-300 underline">{PLATFORM_WHATSAPP_DISPLAY}</a></p>
        </div>
        {attachments.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {attachments.map((a, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-lg border border-ink-600/50 bg-ink-800/50 px-3 py-1.5 text-xs"
              >
                <span className="flex items-center gap-2 font-semibold text-ink-200">
                  {a.kind === "image" ? (
                    <ImageIcon className="h-3.5 w-3.5 text-gold-400" />
                  ) : (
                    <FileText className="h-3.5 w-3.5 text-gold-400" />
                  )}
                  {a.name}
                </span>
                <button
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-rose-300 hover:text-rose-200"
                  aria-label={t("deleteAttachment")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-gold-500/25 bg-gold-500/5 p-3 text-xs text-ink-300">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
        <p>{t("dataReviewNotice")}</p>
      </div>

      {/* 🔏 التوثيق الإلكتروني والالتزام المالي — مرتبط بالطلب عند تقديمه */}
      <div className="rounded-2xl border border-gold-500/30 bg-gold-500/[0.04] p-4">
        <div className="flex items-start gap-3">
          <FileSignature className="mt-0.5 h-5 w-5 shrink-0 text-gold-300" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-gold-200">التوثيق الإلكتروني والالتزام المالي</p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-300">
              اكتب اسمك، والتزم بمبلغ العمولة المتفق عليه مع إدارة المنصة، ثم وقّع وابصم إلكترونياً —
              يُرتبط التوثيق بطلبك مباشرة ويبقى موثقاً لدى المنصة ضمن قسم التعاقد الإلكتروني.
            </p>
          </div>
          <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-gold-500/40 bg-gold-500/10 px-3 py-1.5 text-[11px] font-black text-gold-200">
            <input
              type="checkbox"
              checked={enableCert}
              onChange={(e) => {
                setEnableCert(e.target.checked);
                setCertError("");
              }}
              className="accent-gold-500"
            />
            تفعيل التوثيق
          </label>
        </div>

        {enableCert && (
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>المبلغ المتفق عليه *</Label>
                <Input
                  value={certAmount}
                  onChange={(e) => {
                    setCertAmount(e.target.value);
                    if (!certCommission && Number(e.target.value) > 0)
                      setCertCommission(String(Math.round(Number(e.target.value) * 0.1)));
                  }}
                  type="number"
                  min="0"
                  dir="ltr"
                  className="text-left"
                  placeholder="0"
                />
              </div>
              <div>
                <Label>عمولة المنصة المتفق عليها *</Label>
                <Input
                  value={certCommission}
                  onChange={(e) => setCertCommission(e.target.value)}
                  type="number"
                  min="0"
                  dir="ltr"
                  className="text-left"
                  placeholder="0"
                />
              </div>
            </div>
            <p className="rounded-xl border border-ink-700/60 bg-ink-950/50 p-2.5 text-[11px] leading-relaxed text-ink-300">
              المستفيد: <b className="text-cream">{fullName || "—"}</b> · الهاتف:{" "}
              <b dir="ltr" className="text-cream">{phone || "—"}</b> — أقرّ بالتزام مالي بعمولة المنصة
              المتفق عليها مع الإدارة، وأوافق على توثيق ذلك إلكترونياً بتوقيع وبصمة.
            </p>
            <div>
              <Label>التوقيع الإلكتروني ✍️ *</Label>
              <SignaturePad onChange={setCertSignature} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant={certFingerprint ? "success" : "gold"}
                onClick={handleCertFingerprint}
                className="!py-2 text-xs"
              >
                <Fingerprint className="h-4 w-4" />
                {certFingerprint ? "البصمة موثّقة ✓" : "تأكيد البصمة الإلكترونية"}
              </Button>
              {!certFingerprint && (
                <Button
                  type="button"
                  variant="ghost"
                  className="!py-2 text-xs"
                  onClick={() => setCertFingerprint(fallbackFingerprint())}
                >
                  تأكيد بديل مسجّل
                </Button>
              )}
              {certFingerprint && (
                <span className="text-[11px] font-bold text-emerald-300">
                  {certFingerprint.mode === "webauthn"
                    ? "بصمة جهاز موثّقة (WebAuthn)"
                    : "مسار بديل مسجَّل في الوثيقة"}
                </span>
              )}
            </div>
            <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-gold-500/25 bg-gold-500/5 p-3 text-[12px] font-bold leading-relaxed text-ink-200">
              <input
                type="checkbox"
                checked={certConsent}
                onChange={(e) => setCertConsent(e.target.checked)}
                className="mt-0.5 accent-gold-500"
              />
              أوافق على الالتزام المالي بعمولة المنصة المتفق عليها مع الإدارة، وأن هذا الطلب/العرض
              موثّق إلكترونياً بتوقيعي وبصمتي.
            </label>
            {certError && (
              <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-bold text-rose-300">
                {certError}
              </p>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-bold text-rose-300">
          {error}
        </p>
      )}

      <Button type="submit" loading={busy} className="w-full">
        {t("submitForReview")}
      </Button>
    </form>
  );
}
