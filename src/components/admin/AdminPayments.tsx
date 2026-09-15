import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  CheckCircle2,
  XCircle,
  Trash2,
  FileCheck2,
  Clock3,
  Landmark,
  Smartphone,
  Wallet,
  Filter,
} from "lucide-react";
import { Button, Input, Badge, Modal, Textarea } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * 💳 سندات الدفع — أرشيف الإدارة.
 * Payment receipts archive: confirm / reject / settle / delete.
 * Settling a receipt records it as income in the finance ledger automatically.
 */

const STATUS_FILTERS = ["all", "pending", "confirmed", "settled", "rejected"] as const;

const STATUS_META: Record<string, { ar: string; en: string; cls: string; icon: typeof Clock3 }> = {
  pending: { ar: "قيد التدقيق", en: "Under review", cls: "border-amber-500/40 bg-amber-500/10 text-amber-300", icon: Clock3 },
  confirmed: { ar: "مؤكد", en: "Confirmed", cls: "border-sky-500/40 bg-sky-500/10 text-sky-300", icon: CheckCircle2 },
  settled: { ar: "مُسوَّى", en: "Settled", cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300", icon: FileCheck2 },
  rejected: { ar: "مرفوض", en: "Rejected", cls: "border-rose-500/40 bg-rose-500/10 text-rose-300", icon: XCircle },
};

function methodMeta(method: string) {
  if (method === "kuraimi") return { ar: "بنك الكريمي", en: "Al-Kuraimi Bank", icon: Landmark, cls: "text-violet-300" };
  if (method === "jawali") return { ar: "محفظة جوالي", en: "Jawali Wallet", icon: Smartphone, cls: "text-sky-300" };
  return { ar: "محفظة جيب", en: "Jaib Wallet", icon: Wallet, cls: "text-rose-300" };
}

export function AdminPayments({ token }: { token: string }) {
  const { lang } = useLang();
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const payments = useQuery(
    api.payments.listPayments,
    filter === "all" ? { token } : { token, status: filter }
  );
  const review = useMutation(api.payments.reviewPayment);
  const settle = useMutation(api.payments.settlePayment);
  const remove = useMutation(api.payments.deletePayment);

  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  const stats = useMemo(() => {
    const rows = payments ?? [];
    const sum = (s: string) => rows.filter((r) => r.status === s).reduce((a, r) => a + r.amount, 0);
    return {
      pending: rows.filter((r) => r.status === "pending").length,
      settledSum: sum("settled"),
      confirmedSum: sum("confirmed"),
      total: rows.length,
    };
  }, [payments]);

  async function doReview(id: string, status: string, adminNote?: string) {
    try {
      await review({ token, id: id as any, status, adminNote });
    } catch (e) {
      console.error(e);
    }
  }

  async function doSettle(id: string) {
    try {
      await settle({ token, id: id as any });
    } catch (e) {
      console.error(e);
    }
  }

  async function doDelete(id: string) {
    if (!confirm(lang === "ar" ? "حذف السند نهائياً؟" : "Delete this receipt permanently?")) return;
    try {
      await remove({ token, id: id as any });
    } catch (e) {
      console.error(e);
    }
  }

  const L = (ar: string, en: string) => (lang === "ar" ? ar : en);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card-surface p-4 text-center">
          <Clock3 className="mx-auto h-5 w-5 text-amber-400" />
          <p className="mt-1.5 text-xl font-black text-cream">{stats.pending}</p>
          <p className="text-[11px] text-ink-400">{L("قيد التدقيق", "Under review")}</p>
        </div>
        <div className="card-surface p-4 text-center">
          <CheckCircle2 className="mx-auto h-5 w-5 text-sky-400" />
          <p className="mt-1.5 text-xl font-black text-cream">{stats.confirmedSum.toLocaleString("en-US")}</p>
          <p className="text-[11px] text-ink-400">{L("مؤكد (بالريال/الدولار)", "Confirmed (sum)")}</p>
        </div>
        <div className="card-surface p-4 text-center">
          <FileCheck2 className="mx-auto h-5 w-5 text-emerald-400" />
          <p className="mt-1.5 text-xl font-black text-cream">{stats.settledSum.toLocaleString("en-US")}</p>
          <p className="text-[11px] text-ink-400">{L("مُسوَّى في المالية", "Settled in finance")}</p>
        </div>
        <div className="card-surface p-4 text-center">
          <Filter className="mx-auto h-5 w-5 text-gold-400" />
          <p className="mt-1.5 text-xl font-black text-cream">{stats.total}</p>
          <p className="text-[11px] text-ink-400">{L("إجمالي السندات", "Total receipts")}</p>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors",
              filter === s
                ? "bg-gold-500/15 text-gold-300"
                : "border border-ink-600/60 text-ink-300 hover:text-cream"
            )}
          >
            {s === "all"
              ? L("الكل", "All")
              : lang === "ar"
                ? STATUS_META[s].ar
                : STATUS_META[s].en}
          </button>
        ))}
      </div>

      {/* List */}
      {payments === undefined && <p className="text-center text-sm text-ink-400">{L("جارٍ التحميل...", "Loading...")}</p>}
      {payments && payments.length === 0 && (
        <p className="card-surface p-6 text-center text-sm text-ink-300">
          {L("لا توجد سندات في هذه الحالة.", "No receipts with this status.")}
        </p>
      )}

      <div className="space-y-3">
        {payments?.map((p) => {
          const meta = STATUS_META[p.status] ?? STATUS_META.pending;
          const StatusIcon = meta.icon;
          const m = methodMeta(p.method);
          const MethodIcon = m.icon;
          return (
            <div key={p._id} className="card-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg border border-ink-600/60 bg-ink-950/60", m.cls)}>
                      <MethodIcon className="h-4 w-4" />
                    </span>
                    <span className="text-base font-black text-cream" dir="ltr">
                      {p.amount.toLocaleString("en-US")} {p.currency}
                    </span>
                    <Badge className={meta.cls}>
                      <StatusIcon className="h-3 w-3" />
                      {lang === "ar" ? meta.ar : meta.en}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm font-bold text-ink-100">{p.payerName}</p>
                  <p className="text-xs text-ink-300" dir="ltr">{p.payerPhone}</p>
                  <p className="mt-1 text-xs text-ink-400">
                    {lang === "ar" ? m.ar : m.en} · {L("مرجع", "Ref")}: <span dir="ltr" className="font-bold text-ink-200">{p.reference}</span>
                  </p>
                  {p.purpose && <p className="text-xs text-ink-400">{L("لأجل", "For")}: {p.purpose}</p>}
                  {p.notes && <p className="text-xs text-ink-400">{p.notes}</p>}
                  <p className="mt-1 text-[11px] text-ink-500">{formatDateTime(p.createdAt)}</p>
                  {p.adminNote && (
                    <p className="mt-1.5 rounded-lg border border-ink-600/60 bg-ink-950/50 px-2.5 py-1.5 text-xs text-ink-300">
                      {L("ملاحظة الإدارة", "Admin note")}: {p.adminNote}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-stretch gap-2">
                  {p.proofStorageId && (
                    <Button variant="ghost" onClick={() => setProofUrl(p.proofStorageId!)} className="!py-1.5 text-xs">
                      {L("عرض الإيصال", "View receipt")}
                    </Button>
                  )}
                  {p.status === "pending" && (
                    <>
                      <Button variant="success" onClick={() => doReview(p._id, "confirmed")} className="!py-1.5 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {L("تأكيد", "Confirm")}
                      </Button>
                      <Button variant="danger" onClick={() => setRejectTarget(p._id)} className="!py-1.5 text-xs">
                        <XCircle className="h-3.5 w-3.5" />
                        {L("رفض", "Reject")}
                      </Button>
                    </>
                  )}
                  {p.status === "confirmed" && (
                    <>
                      <Button onClick={() => doSettle(p._id)} className="!py-1.5 text-xs">
                        <FileCheck2 className="h-3.5 w-3.5" />
                        {L("تسوية وأرشفة", "Settle & archive")}
                      </Button>
                      <Button variant="danger" onClick={() => setRejectTarget(p._id)} className="!py-1.5 text-xs">
                        <XCircle className="h-3.5 w-3.5" />
                        {L("رفض", "Reject")}
                      </Button>
                    </>
                  )}
                  <Button variant="danger" onClick={() => doDelete(p._id)} className="!py-1.5 text-xs">
                    <Trash2 className="h-3.5 w-3.5" />
                    {L("حذف", "Delete")}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reject modal */}
      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title={L("رفض السند — سبب الرفض", "Reject receipt — reason")}>
        <div className="space-y-4 p-5">
          <Textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder={L("مثال: رقم المرجع غير مطابق للإيصال", "e.g. reference number doesn't match the receipt")} />
          <div className="flex gap-2">
            <Button
              variant="danger"
              className="flex-1"
              onClick={async () => {
                if (rejectTarget) await doReview(rejectTarget, "rejected", rejectNote || undefined);
                setRejectTarget(null);
                setRejectNote("");
              }}
            >
              {L("تأكيد الرفض", "Confirm rejection")}
            </Button>
            <Button variant="ghost" onClick={() => setRejectTarget(null)}>
              {L("إلغاء", "Cancel")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Proof modal */}
      <Modal open={!!proofUrl} onClose={() => setProofUrl(null)} title={L("صورة الإيصال", "Receipt image")} wide>
        <div className="p-5">
          {proofUrl && <img src={proofUrl} alt="receipt" className="mx-auto max-h-[70vh] rounded-xl border border-ink-600/60" />}
        </div>
      </Modal>
    </div>
  );
}
