/**
 * 📜 قسم «التوثيق الإلكتروني والعقود» — لوحة التحكم
 *
 * يجمع كل ما يخصّ الحقوق المالية في مكان واحد ظاهر (كان سابقاً داخل «قائمة
 * إتمام التوافق» فقط):
 *   • إنشاء توثيق بالبصمة الإلكترونية (اسم كامل + هاتف + مبلغ + عمولة + توقيع).
 *   • رابط توقيع عن بُعد يفتحه المستفيد من هاتفه أينما كان.
 *   • استخراج سند دفع PDF لكل وثيقة وطبعه كوثيقة إثبات حق.
 *   • تسجيل التسديد · إلغاء · متابعة العمولات المتفقة والمسدَّدة والمتبقية.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  BadgeDollarSign,
  Ban,
  CheckCircle2,
  Copy,
  FileSignature,
  Link2,
  Plus,
  Printer,
  Search,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Badge, Button, Card, EmptyState, Input, Select, Spinner, StatCard } from "@/components/ui";
import { printContractPdf } from "@/lib/contractPdf";
import { ContractModal, type ContractRecord } from "@/components/admin/ContractModal";

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة — بانتظار التوقيع",
  signed: "موقّعة بالبصمة",
  paid: "مسدَّدة",
  void: "ملغاة",
};

function statusClass(status: string): string {
  if (status === "paid") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  if (status === "signed") return "border-gold-500/40 bg-gold-500/10 text-gold-300";
  if (status === "void") return "border-rose-500/40 bg-rose-500/10 text-rose-300";
  return "border-white/15 bg-white/5 text-ink-300";
}

function money(value: number, currency: string) {
  return `${value.toLocaleString("en-US")} ${currency}`;
}

function dateLabel(ms?: number) {
  if (!ms) return "—";
  return new Date(ms).toISOString().slice(0, 10);
}

export function AdminContracts({ token }: { token: string }) {
  const contracts = useQuery(api.contracts.list, { token }) as ContractRecord[] | undefined;
  const markPaid = useMutation(api.contracts.markPaid);
  const voidContract = useMutation(api.contracts.voidContract);

  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [active, setActive] = useState<ContractRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const rows = useMemo(() => contracts ?? [], [contracts]);

  const totals = useMemo(() => {
    const live = rows.filter((r) => r.status !== "void");
    const sum = (list: ContractRecord[], key: "amount" | "commission") =>
      list.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
    return {
      count: rows.length,
      amount: sum(live, "amount"),
      commission: sum(live, "commission"),
      paid: sum(
        live.filter((r) => r.status === "paid"),
        "commission"
      ),
      outstanding: sum(
        live.filter((r) => r.status !== "paid"),
        "commission"
      ),
      currency: live[0]?.currency ?? "USD",
      signed: live.filter((r) => r.status === "signed").length,
      waiting: live.filter((r) => r.status === "draft").length,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (!q) return true;
      return (
        r.beneficiaryName.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q) ||
        (r.receiptNo ?? "").toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q)
      );
    });
  }, [rows, status, search]);

  function signLink(contract: ContractRecord): string | null {
    if (!contract.signToken) return null;
    const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
    return `${window.location.origin}${base}/contract?t=${contract.signToken}`;
  }

  async function copyLink(contract: ContractRecord) {
    const link = signLink(contract);
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(contract._id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      setError("تعذّر النسخ — افتح رابط التوقيع يدوياً.");
    }
  }

  async function setPaid(contract: ContractRecord) {
    setError("");
    setBusyId(contract._id);
    try {
      await markPaid({ token, id: contract._id as any });
    } catch (err: any) {
      setError(err?.message ?? "تعذّر تسجيل التسديد");
    } finally {
      setBusyId(null);
    }
  }

  async function cancel(contract: ContractRecord) {
    const reason = window.prompt("سبب إلغاء الوثيقة؟", "أُلغيت بالتراضي");
    if (reason === null) return;
    setError("");
    setBusyId(contract._id);
    try {
      await voidContract({ token, id: contract._id as any, reason });
    } catch (err: any) {
      setError(err?.message ?? "تعذّر إلغاء الوثيقة");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-extrabold text-cream">
              <FileSignature className="h-5 w-5 text-gold-400" />
              التوثيق الإلكتروني والعقود — بالبصمة الإلكترونية
            </h2>
            <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-ink-300">
              توثيق المستفيد من الخدمة: <strong className="text-cream">الاسم الكامل</strong> +{" "}
              <strong className="text-cream">رقم الهاتف</strong> +{" "}
              <strong className="text-cream">المبلغ المتفق عليه</strong> +{" "}
              <strong className="text-cream">عمولة المنصة</strong> +{" "}
              <strong className="text-cream">التوقيع الإلكتروني</strong> +{" "}
              <strong className="text-cream">تأكيد البصمة</strong> ← فيُعتمد{" "}
              <strong className="text-gold-300">سند دفع</strong> برقم تسلسلي يُستخرج PDF.
              <br />
              المسار المعتاد: <span className="text-gold-300">لوحة الكنترول ← التوافق والمطابقة</span> ثم زر
              «توثيق» بجانب المطابقة قبل إتمامها — ويمكن إنشاء توثيق مباشر من هنا أيضاً.
            </p>
          </div>
          <Button
            variant="gold"
            className="!py-2 text-xs"
            onClick={() => {
              setActive(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            توثيق جديد
          </Button>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <StatCard label="الوثائق" value={String(totals.count)} icon={<FileSignature className="h-5 w-5" />} accent="gold" />
          <p className="mt-1 text-[10px] text-ink-400">
            {totals.signed} موقّعة · {totals.waiting} بانتظار التوقيع
          </p>
        </div>
        <div>
          <StatCard
            label="إجمالي المبالغ المتفقة"
            value={money(totals.amount, totals.currency)}
            icon={<BadgeDollarSign className="h-5 w-5" />}
            accent="sky"
          />
          <p className="mt-1 text-[10px] text-ink-400">مجموع المبالغ في الوثائق غير الملغاة</p>
        </div>
        <div>
          <StatCard
            label="عمولات المنصة المتفقة"
            value={money(totals.commission, totals.currency)}
            icon={<FileSignature className="h-5 w-5" />}
            accent="violet"
          />
          <p className="mt-1 text-[10px] text-ink-400">إجمالي الالتزامات المالية الموثّقة</p>
        </div>
        <div>
          <StatCard
            label="المسدَّد من العمولات"
            value={money(totals.paid, totals.currency)}
            icon={<CheckCircle2 className="h-5 w-5" />}
            accent="emerald"
          />
          <p className="mt-1 text-[10px] text-ink-400">المتبقي: {money(totals.outstanding, totals.currency)}</p>
        </div>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو الهاتف أو رقم السند…"
              className="ps-9"
            />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-[200px]">
            <option value="all">كل الحالات</option>
            <option value="draft">مسودة (بانتظار التوقيع)</option>
            <option value="signed">موقّعة بالبصمة</option>
            <option value="paid">مسدَّدة</option>
            <option value="void">ملغاة</option>
          </Select>
        </div>

        {error && (
          <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs font-bold text-rose-300">
            {error}
          </p>
        )}

        {contracts === undefined ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="لا توجد وثائق توثيق بعد"
            hint="أنشئ توثيقاً جديداً من الزر أعلاه، أو وثّق مطابقة من «لوحة الكنترول ← التوافق والمطابقة» — ولا يمكن إتمام أي مطابقة بدون توثيق موقّع."
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((c) => (
              <div
                key={c._id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 transition-colors hover:border-gold-500/30"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-[220px]">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-extrabold text-cream">
                      {c.beneficiaryName}
                      <Badge className={statusClass(c.status)}>{STATUS_LABELS[c.status] ?? c.status}</Badge>
                      {c.receiptNo && (
                        <span className="rounded-md border border-gold-500/30 bg-gold-500/10 px-2 py-0.5 text-[10px] font-black text-gold-300">
                          سند {c.receiptNo}
                        </span>
                      )}
                      {(c as any).submissionId && (
                        <span className="rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-black text-sky-300">
                          🔗 مرتبط بطلب من قسم التقديم
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-[11px] text-ink-300">
                      📞 {c.phone} · {c.title} · {dateLabel(c.signedAt ?? c.createdAt)}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="text-sm font-black text-cream">{money(c.amount, c.currency)}</p>
                    <p className="flex items-center justify-end gap-1 text-[11px] font-bold text-gold-300">
                      <BadgeDollarSign className="h-3.5 w-3.5" />
                      عمولة المنصة: {money(c.commission, c.currency)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button variant="ghost" className="!py-1.5 text-[11px]" onClick={() => printContractPdf(c)}>
                    <Printer className="h-3.5 w-3.5" />
                    سند دفع PDF
                  </Button>

                  {c.status === "draft" && signLink(c) && (
                    <Button variant="ghost" className="!py-1.5 text-[11px]" onClick={() => copyLink(c)}>
                      <Link2 className="h-3.5 w-3.5" />
                      {copiedId === c._id ? "نُسخ الرابط ✅" : "نسخ رابط التوقيع عن بُعد"}
                    </Button>
                  )}

                  {c.status !== "paid" && c.status !== "void" && (
                    <Button
                      variant="success"
                      className="!py-1.5 text-[11px]"
                      loading={busyId === c._id}
                      onClick={() => setPaid(c)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      تسجيل التسديد
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    className="!py-1.5 text-[11px]"
                    onClick={() => {
                      setActive(c);
                      setModalOpen(true);
                    }}
                  >
                    <FileSignature className="h-3.5 w-3.5" />
                    عرض/تحديث
                  </Button>

                  {c.status !== "void" && (
                    <Button
                      variant="danger"
                      className="!py-1.5 text-[11px]"
                      loading={busyId === c._id}
                      onClick={() => cancel(c)}
                    >
                      <Ban className="h-3.5 w-3.5" />
                      إلغاء
                    </Button>
                  )}

                  {c.status === "paid" && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      مسدَّدة في {dateLabel(c.paidAt)} — {c.receiptNo ?? ""}
                    </span>
                  )}

                  {c.signToken && (
                    <span className="flex items-center gap-1 text-[10px] text-ink-400">
                      <Copy className="h-3 w-3" />
                      رابط التوقيع فعّال
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ContractModal
        token={token}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        matchTitle={active?.title || "توثيق مباشر — خدمة من المنصة"}
        requestName={active?.beneficiaryName ?? ""}
        requestPhone={active?.phone ?? ""}
        contract={active}
      />
    </div>
  );
}
