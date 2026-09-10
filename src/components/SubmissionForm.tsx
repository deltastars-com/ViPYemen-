import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import {
  CheckCircle2,
  MessageCircle,
  PhoneCall,
  ShieldCheck,
  UploadCloud,
  X,
  FileText,
  ImageIcon,
  Loader2,
} from "lucide-react";
import { Button, Input, Label, Select, Textarea } from "./ui";
import { getType, type CategoryConfig } from "@/lib/categories";
import { fileKindOf, whatsappLink, PLATFORM_WHATSAPP_DISPLAY } from "@/lib/utils";
import { useLang } from "@/lib/i18n";

interface Attachment {
  name: string;
  storageId: string;
  kind: string;
}

export function SubmissionForm({ category }: { category: CategoryConfig }) {
  const { t, tField, tOption } = useLang();
  const [typeValue, setTypeValue] = useState(category.types[0].value);
  const submit = useMutation(api.submissions.submit);
  const requestOtp = useMutation(api.submissions.requestPhoneOtp);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

  const typeConfig = useMemo(() => getType(category, typeValue), [category, typeValue]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
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

  async function handleOtp() {
    setError("");
    if (!phone.trim()) {
      setError(t("otpError"));
      return;
    }
    try {
      const res = await requestOtp({ phone });
      setOtpState({ code: res.code, phone: res.phone });
    } catch (e: any) {
      setError(e.message ?? t("otpSendError"));
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await submit({
        category: category.key,
        type: typeValue,
        title,
        description,
        fullName,
        phone,
        address,
        price: price ? Number(price) : undefined,
        currency,
        fields,
        attachments,
        otpCode: otpCode.trim() || undefined,
      });
      setDone(true);
    } catch (err: any) {
      setError(err.message ?? t("submitError"));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card-surface flex flex-col items-center gap-4 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <h3 className="text-xl font-extrabold text-cream">{t("submissionSuccess")}</h3>
        <p className="max-w-md text-sm leading-relaxed text-ink-300">
          {t("submissionSuccessSub")}
        </p>
        <Button type="button" onClick={() => { setDone(false); setOtpState(null); setOtpCode(""); setAttachments([]); }}>
          {t("submitAnother")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-surface space-y-5 p-5 sm:p-6">
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
            {uploading ? t("uploadingFiles") : t("chooseFiles")}
          </span>
          <input
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
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
