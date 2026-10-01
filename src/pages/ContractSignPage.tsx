/**
 * 📜 صفحة توقيع المستفيد العامة — تُفتح من رابط `…/contract?t=<signToken>`
 * على جهاز المستفيد أينما كان: اسم كامل + هاتف + توقيع إلكتروني + بصمة،
 * فتُصدر الوثيقة وسند الدفع للإدارة استخراجاً كملف PDF.
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { FileSignature, Fingerprint, Home, XCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import { api } from "../convex/_generated/api";
import { LogoMark } from "@/components/Logo";
import { Button, Input, Label, Spinner } from "@/components/ui";
import { SignaturePad } from "@/components/admin/ContractModal";
import { createFingerprint, fallbackFingerprint, FingerprintUnavailable, type FingerprintResult } from "@/lib/fingerprint";

export function ContractSignPage() {
  const t = new URLSearchParams(window.location.search).get("t") || "";
  const doc = useQuery(api.contracts.getBySignToken, { t });
  const sign = useMutation(api.contracts.sign);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [signature, setSignature] = useState("");
  const [fingerprint, setFingerprint] = useState<FingerprintResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  // تعبئة بيانات المستفيد المحفوظة عند وصول الوثيقة.
  useEffect(() => {
    if (doc) {
      setName((prev) => prev || doc.beneficiaryName);
      setPhone((prev) => prev || doc.phone);
    }
  }, [doc?.title, doc?.beneficiaryName, doc?.phone]);

  async function captureFingerprint() {
    setError("");
    try {
      setFingerprint(await createFingerprint());
    } catch (err) {
      if (err instanceof FingerprintUnavailable) {
        setError("جهازك لا يدعم ماسح البصمة — استخدم «تأكيد بديل مسجّل».");
      } else {
        setError("لم يُؤكَّد البصمة — أعد المحاولة.");
      }
    }
  }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const r = await sign({
        t,
        beneficiaryName: name,
        phone,
        signature,
        signatureType: "drawn",
        fingerprint: fingerprint ?? undefined,
      });
      setDone(r.receiptNo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر التوقيع — أعد المحاولة.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="card-surface w-full max-w-lg p-7">
        <div className="text-center">
          <LogoMark className="mx-auto h-12 w-12" />
          <h1 className="mt-3 flex items-center justify-center gap-2 text-lg font-black text-cream">
            <ShieldCheck className="h-5 w-5 text-gold-400" />
            وثيقة توثيق إلكتروني بالبصمة
          </h1>
          <p className="mt-1 text-[12px] text-ink-400">منصة ViP Yemen — إثبات حق موثّق وموقّع إلكترونياً</p>
        </div>

        {doc === undefined ? (
          <div className="flex justify-center py-10 text-gold-400">
            <Spinner className="h-7 w-7" />
          </div>
        ) : !doc ? (
          <>
            <p className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-bold text-rose-300">
              <XCircle className="h-5 w-5 shrink-0" /> رابط التوقيع غير صالح أو منتهي.
            </p>
            <Link to="/" className="btn-ghost mt-4 w-full text-xs">
              <Home className="h-4 w-4" /> العودة للصفحة الرئيسية
            </Link>
          </>
        ) : done ? (
          <>
            <p className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm font-bold text-emerald-300">
              <CheckCircle2 className="h-7 w-7" />
              تم التوقيع والتوثيق بالبصمة بنجاح.
              <span className="text-[13px] text-emerald-200">رقم سند الدفع: <b dir="ltr">{done}</b></span>
            </p>
            <p className="mt-4 text-center text-[12px] leading-relaxed text-ink-400">
              احتفظ برقم السند — تُراجع الإدارة التوثيق وتستخرج سند الدفع النهائي (PDF) عند التسديد.
            </p>
            <Link to="/" className="btn-ghost mt-4 w-full text-xs">
              <Home className="h-4 w-4" /> العودة للصفحة الرئيسية
            </Link>
          </>
        ) : (
          <>
            <div className="mt-5 space-y-3 rounded-xl border border-ink-700/60 p-3 text-[12px]">
              <p><span className="text-ink-400">الموضوع:</span> <b className="text-cream">{doc.title}</b></p>
              <p>
                <span className="text-ink-400">المبلغ المتفق عليه:</span>{" "}
                <b className="text-gold-300">{doc.amount} {doc.currency}</b>
                <span className="text-ink-400"> — عمولة المنصة:</span>{" "}
                <b className="text-gold-300">{doc.commission} {doc.currency}</b>
              </p>
              <p className="text-ink-400">
                بالتوقيع أدناه تُقرّ والتزاماً بتسديد المبلغ المتفق عليه كعمولة للمنصة ضمن هذه الوثيقة الموثّقة.
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <Label>الاسم الكامل</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم الثلاثي" />
              </div>
              <div>
                <Label>رقم الهاتف</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" placeholder="7XXXXXXXX" />
              </div>
            </div>

            <div className="mt-3">
              <Label>التوقيع الإلكتروني ✍️</Label>
              <SignaturePad onChange={setSignature} />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button variant={fingerprint ? "success" : "gold"} onClick={captureFingerprint} type="button">
                <Fingerprint className="h-4 w-4" />
                {fingerprint?.mode === "webauthn" ? "البصمة موثّقة ✓" : "تأكيد البصمة الإلكترونية"}
              </Button>
              {!fingerprint && (
                <Button variant="ghost" onClick={() => setFingerprint(fallbackFingerprint())} type="button">
                  تأكيد بديل مسجّل
                </Button>
              )}
            </div>

            {doc.status !== "draft" && (
              <p className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-[12px] font-bold text-emerald-300">
                ✅ هذه الوثيقة موقّعة سابقاً برقم سند {doc.receiptNo}.
              </p>
            )}

            {error && (
              <p className="mt-3 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-[12px] font-bold text-rose-300">
                <XCircle className="h-4 w-4 shrink-0" /> {error}
              </p>
            )}

            <Button
              className="mt-4 w-full"
              variant="gold"
              loading={busy}
              disabled={doc.status !== "draft"}
              onClick={submit}
            >
              <FileSignature className="h-4 w-4" /> توقيع وتأكيد بالبصمة
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
