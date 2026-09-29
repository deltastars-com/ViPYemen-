import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { MailCheck, CheckCircle2, XCircle, Home } from "lucide-react";
import { api } from "../convex/_generated/api";
import { LogoMark } from "@/components/Logo";
import { Spinner } from "@/components/ui";

/**
 * 📮 صفحة إلغاء الاشتراك العامة — تُفتح من تذييل أي رسالة بريدية
 * عبر رابط `…/unsubscribe?t=<unsubToken>`.
 */
export function UnsubscribePage() {
  const t = new URLSearchParams(window.location.search).get("t") || "";
  const check = useQuery(api.campaigns.checkUnsubscribe, { token: t });
  const unsubscribe = useMutation(api.campaigns.unsubscribe);
  const [done, setDone] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      const r = await unsubscribe({ token: t });
      setDone({ ok: r.ok, message: r.ok ? "تم إلغاء اشتراكك — لن تصلك رسائل جديدة." : r.message ?? "رابط غير صالح" });
    } catch {
      setDone({ ok: false, message: "تعذر تنفيذ الطلب، أعد المحاولة." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="card-surface w-full max-w-md p-8 text-center">
        <LogoMark className="mx-auto h-14 w-14" />
        <h1 className="mt-4 flex items-center justify-center gap-2 text-lg font-black text-cream">
          <MailCheck className="h-5 w-5 text-gold-400" />
          إلغاء اشتراك النشرة البريدية
        </h1>

        {check === undefined ? (
          <div className="flex justify-center py-10 text-gold-400">
            <Spinner className="h-7 w-7" />
          </div>
        ) : done ? (
          <p
            className={`mt-6 flex items-center justify-center gap-2 rounded-xl border p-4 text-sm font-bold ${
              done.ok
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-rose-500/30 bg-rose-500/10 text-rose-300"
            }`}
          >
            {done.ok ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}
            {done.message}
          </p>
        ) : check.valid ? (
          <>
            <p className="mt-5 text-sm leading-relaxed text-ink-300">
              البريد <span dir="ltr" className="font-black text-cream">{check.email}</span>
              {check.status === "unsubscribed" ? " ملغى اشتراكه مسبقاً." : " سيُلغى اشتراكه نهائياً ولن تصله رسائل جديدة."}
            </p>
            {check.status !== "unsubscribed" && (
              <button onClick={confirm} disabled={busy} className="btn-gold mt-6 w-full disabled:opacity-60">
                {busy ? "جارٍ التنفيذ…" : "تأكيد إلغاء الاشتراك"}
              </button>
            )}
          </>
        ) : (
          <p className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-bold text-amber-300">
            <XCircle className="h-5 w-5 shrink-0" />
            رابط إلغاء الاشتراك غير صالح أو منتهي.
          </p>
        )}

        <Link to="/" className="btn-ghost mt-4 w-full text-xs">
          <Home className="h-4 w-4" />
          العودة للصفحة الرئيسية
        </Link>
      </div>
    </div>
  );
}
