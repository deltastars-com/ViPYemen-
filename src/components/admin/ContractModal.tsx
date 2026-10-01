/**
 * 📜 نافذة التوثيق الإلكتروني الموثق بالبصمة — ViP Yemen
 *
 * تُفتح من «قائمة إتمام التوافق» قبل إتمام المطابقة:
 *   • خانات: الاسم الكامل · رقم الهاتف · المبلغ المتفق · عمولة المنصة.
 *   • خانة التوقيع الإلكتروني (رسم على اللوحة).
 *   • تأكيد البصمة الإلكترونية (WebAuthn) مع مسار بديل مسجَّل.
 *   • إنشاء فوري (المستفيد حاضر) أو رابط توقيع عن بُعد من جهازه.
 *   • استخراج سند الدفع PDF وتسجيل التسديد.
 */
import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { Fingerprint, FileSignature, Printer, CheckCircle2, Link2, Copy, XCircle, Ban } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Badge, Button, Input, Label, Modal } from "@/components/ui";
import { createFingerprint, fallbackFingerprint, FingerprintUnavailable, type FingerprintResult } from "@/lib/fingerprint";
import { printContractPdf, type PrintableContract } from "@/lib/contractPdf";

export type ContractRecord = PrintableContract & {
  _id: string;
  matchId?: string;
  signToken?: string;
};

/* ───────────────────────── خانة التوقيع الإلكتروني ───────────────────────── */

export function SignaturePad({ onChange }: { onChange: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#e7c66a";
    setReady(true);
  }, []);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawing.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const { x, y } = point(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.01, y);
    ctx.stroke();
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = point(event);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    dirty.current = true;
    onChange(canvasRef.current?.toDataURL("image/png") ?? "");
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    dirty.current = false;
    onChange("");
  }

  return (
    <div>
      <div className="rounded-xl border border-dashed border-gold-500/50 bg-ink-950/60 p-1">
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="h-32 w-full touch-none rounded-lg"
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-[11px] text-ink-400">{ready ? "✍️ ارسم توقيعك داخل الإطار" : "…"}</span>
        <button type="button" onClick={clear} className="text-[11px] font-bold text-rose-300 hover:text-rose-200">
          مسح التوقيع
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── نافذة التوثيق ───────────────────────── */

export function ContractModal({
  token,
  open,
  onClose,
  matchTitle,
  requestName,
  requestPhone,
  contract,
}: {
  token: string;
  open: boolean;
  onClose: () => void;
  matchTitle: string;
  requestName: string;
  requestPhone: string;
  contract: ContractRecord | null;
}) {
  const createContract = useMutation(api.contracts.createContract);
  const createDraft = useMutation(api.contracts.createDraft);
  const markPaid = useMutation(api.contracts.markPaid);
  const voidContract = useMutation(api.contracts.voidContract);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [commission, setCommission] = useState("");
  const [signature, setSignature] = useState("");
  const [fingerprint, setFingerprint] = useState<FingerprintResult | null>(null);
  const [remoteToken, setRemoteToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // إعادة تهيئة الحقول عند فتح النافذة على مطابقة/وثيقة جديدة.
  useEffect(() => {
    if (!open) return;
    setError("");
    setSignature("");
    setFingerprint(null);
    setRemoteToken(null);
    setCopied(false);
    setName(contract?.beneficiaryName || requestName || "");
    setPhone(contract?.phone || requestPhone || "");
    setAmount(contract ? String(contract.amount) : "");
    setCommission(contract ? String(contract.commission) : "");
  }, [open, contract?._id, matchTitle, requestName, requestPhone]);

  const amountNum = Number(amount) || 0;
  const commissionNum = Number(commission) || 0;
  const remoteLink = remoteToken
    ? `${window.location.origin}${(import.meta.env.BASE_URL || "/").replace(/\/$/, "")}/contract?t=${remoteToken}`
    : null;

  async function captureFingerprint() {
    setError("");
    try {
      setFingerprint(await createFingerprint());
    } catch (err) {
      if (err instanceof FingerprintUnavailable) {
        setError("هذا الجهاز لا يدعم ماسح البصمة — استخدم «تأكيد بديل مسجّل».");
      } else {
        setError("لم يُؤكَّد البصمة — أعد المحاولة.");
      }
    }
  }

  async function signNow() {
    setBusy(true);
    setError("");
    try {
      await createContract({
        token,
        matchId: contract?.matchId,
        title: matchTitle,
        beneficiaryName: name,
        phone,
        amount: amountNum,
        commission: commissionNum,
        signature,
        signatureType: "drawn",
        fingerprint: fingerprint ?? undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String((err as any)?.data ?? err));
    } finally {
      setBusy(false);
    }
  }

  async function makeRemoteLink() {
    setBusy(true);
    setError("");
    try {
      const r = await createDraft({
        token,
        matchId: contract?.matchId,
        title: matchTitle,
        beneficiaryName: name,
        phone,
        amount: amountNum,
        commission: commissionNum,
      });
      setRemoteToken(r.signToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : String((err as any)?.data ?? err));
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!remoteLink) return;
    try {
      await navigator.clipboard.writeText(remoteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("انسخ الرابط يدوياً: " + remoteLink);
    }
  }

  const statusTone =
    contract?.status === "paid"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : contract?.status === "signed"
        ? "border-gold-500/40 bg-gold-500/10 text-gold-300"
        : contract?.status === "void"
          ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
          : "border-amber-500/40 bg-amber-500/10 text-amber-300";

  return (
    <Modal open={open} onClose={onClose} title="📜 التوثيق الإلكتروني بالبصمة" wide>
      <div className="space-y-4">
        <p className="rounded-xl border border-ink-700/60 bg-ink-900/50 p-3 text-[12px] leading-relaxed text-ink-300">
          يُستكمل هذا التوثيق داخل قائمة <b className="text-gold-300">إتمام التوافق</b> قبل إتمام المطابقة وتسليم
          المستفيد — الاسم الكامل + الهاتف + التوقيع الإلكتروني + تأكيد البصمة + المبلغ المتفق عليه
          (يلتزم بتسديده عمولة للمنصة)، ويُصدر منه <b className="text-gold-300">سند الدفع PDF</b>.
        </p>

        {contract && contract.status !== "draft" ? (
          /* ── وثيقة قائمة: عرض + إجراءات ── */
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={statusTone}>{contract.receiptNo ?? "بلا رقم"}</Badge>
              <Badge className="border-ink-600/60 bg-ink-800/60 text-ink-200">
                {contract.status === "paid" ? "مسدَّد" : contract.status === "signed" ? "موقّع بالبصمة" : contract.status === "void" ? "ملغى" : "مسودة"}
              </Badge>
            </div>
            <div className="grid gap-2 rounded-xl border border-ink-700/60 p-3 text-[12px] sm:grid-cols-2">
              <p><span className="text-ink-400">المستفيد:</span> <b className="text-cream">{contract.beneficiaryName || "—"}</b></p>
              <p><span className="text-ink-400">الهاتف:</span> <b dir="ltr" className="text-cream">{contract.phone || "—"}</b></p>
              <p><span className="text-ink-400">المبلغ المتفق:</span> <b className="text-gold-300">{contract.amount} {contract.currency}</b></p>
              <p><span className="text-ink-400">عمولة المنصة:</span> <b className="text-gold-300">{contract.commission} {contract.currency}</b></p>
            </div>
            {contract.signature && (
              <div className="rounded-xl border border-ink-700/60 p-3">
                <p className="mb-1 text-[11px] text-ink-400">التوقيع الإلكتروني:</p>
                <img src={contract.signature} alt="توقيع" className="max-h-24" />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="gold" onClick={() => printContractPdf(contract)}>
                <Printer className="h-4 w-4" /> استخراج سند الدفع PDF
              </Button>
              {contract.status === "signed" && (
                <Button
                  variant="success"
                  loading={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await markPaid({ token, id: contract._id as any });
                      onClose();
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <CheckCircle2 className="h-4 w-4" /> تسجيل كمُسدَّد
                </Button>
              )}
              {contract.status !== "void" && (
                <Button
                  variant="danger"
                  onClick={async () => {
                    if (!confirm("إلغاء هذه الوثيقة نهائياً؟")) return;
                    setBusy(true);
                    try {
                      await voidContract({ token, id: contract._id as any });
                      onClose();
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Ban className="h-4 w-4" /> إلغاء الوثيقة
                </Button>
              )}
            </div>
          </>
        ) : (
          /* ── إنشاء توثيق جديد ── */
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>الاسم الكامل للمستفيد</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم الثلاثي" />
              </div>
              <div>
                <Label>رقم الهاتف</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" placeholder="7XXXXXXXX" />
              </div>
              <div>
                <Label>المبلغ المتفق عليه</Label>
                <Input
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    if (!commission && Number(e.target.value) > 0) {
                      setCommission(String(Math.round(Number(e.target.value) * 0.1)));
                    }
                  }}
                  type="number"
                  min="0"
                  dir="ltr"
                  placeholder="0"
                />
              </div>
              <div>
                <Label>عمولة المنصة</Label>
                <Input value={commission} onChange={(e) => setCommission(e.target.value)} type="number" min="0" dir="ltr" placeholder="0" />
              </div>
            </div>

            <div>
              <Label>التوقيع الإلكتروني ✍️</Label>
              <SignaturePad onChange={setSignature} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant={fingerprint ? "success" : "gold"} onClick={captureFingerprint} type="button">
                <Fingerprint className="h-4 w-4" />
                {fingerprint?.mode === "webauthn" ? "البصمة موثّقة ✓" : "تأكيد البصمة الإلكترونية"}
              </Button>
              {!fingerprint && (
                <Button variant="ghost" onClick={() => setFingerprint(fallbackFingerprint())} type="button">
                  تأكيد بديل مسجّل
                </Button>
              )}
              {fingerprint && (
                <span className="text-[11px] text-emerald-300">
                  {fingerprint.mode === "webauthn" ? "بصمة جهاز موثّقة (WebAuthn)" : "مسار بديل مسجَّل في الوثيقة"}
                </span>
              )}
            </div>

            {error && (
              <p className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-[12px] font-bold text-rose-300">
                <XCircle className="h-4 w-4 shrink-0" /> {error}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="gold" loading={busy} onClick={signNow}>
                <FileSignature className="h-4 w-4" /> توقيع وتوثيق الآن
              </Button>
              <Button variant="ghost" loading={busy} onClick={makeRemoteLink}>
                <Link2 className="h-4 w-4" /> رابط توقيع للمستفيد من جهازه
              </Button>
            </div>

            {remoteLink && (
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3">
                <p className="mb-2 text-[12px] text-sky-200">
                  أرسل هذا الرابط للمستفيد ليُكمل الاسم والتوقيع والبصمة من هاتفه، ثم تظهر الوثيقة هنا جاهزة
                  لاستخراج سند الدفع:
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <code dir="ltr" className="min-w-0 flex-1 break-all rounded-lg bg-ink-950/70 p-2 text-[11px] text-sky-200">
                    {remoteLink}
                  </code>
                  <Button variant={copied ? "success" : "ghost"} onClick={copyLink}>
                    <Copy className="h-4 w-4" /> {copied ? "تم النسخ" : "نسخ"}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
