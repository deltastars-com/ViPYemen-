import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Wallet, TrendingUp, TrendingDown, Trash2 } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Badge, Button, Card, EmptyState, Input, Label, Select, Spinner, StatCard, Textarea } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

export function AdminFinance({ token }: { token: string }) {
  const entries = useQuery(api.finance.listEntries, { token });
  const addEntry = useMutation(api.finance.addEntry);
  const deleteEntry = useMutation(api.finance.deleteEntry);

  const [type, setType] = useState("income");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const totals = (entries ?? []).reduce(
    (acc, e: any) => {
      if (e.type === "income") acc.income += e.amount;
      else acc.expense += e.amount;
      return acc;
    },
    { income: 0, expense: 0 }
  );
  const balance = totals.income - totals.expense;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await addEntry({
        token,
        type,
        amount: Number(amount),
        description,
        category: category || undefined,
      });
      setAmount("");
      setDescription("");
      setCategory("");
    } catch (err: any) {
      setError(err.message ?? "خطأ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="إجمالي الإيرادات" value={`${totals.income.toLocaleString("en-US")} ريال`} icon={<TrendingUp className="h-5 w-5" />} accent="emerald" />
        <StatCard label="إجمالي المصروفات" value={`${totals.expense.toLocaleString("en-US")} ريال`} icon={<TrendingDown className="h-5 w-5" />} accent="rose" />
        <StatCard label="الرصيد" value={`${balance.toLocaleString("en-US")} ريال`} icon={<Wallet className="h-5 w-5" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-extrabold text-cream">تسجيل عملية مالية</h3>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("income")}
                className={`flex-1 rounded-xl border px-4 py-2.5 text-xs font-black transition-colors ${
                  type === "income"
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                    : "border-ink-600/60 text-ink-300"
                }`}
              >
                إيراد +
              </button>
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`flex-1 rounded-xl border px-4 py-2.5 text-xs font-black transition-colors ${
                  type === "expense"
                    ? "border-rose-500/50 bg-rose-500/15 text-rose-300"
                    : "border-ink-600/60 text-ink-300"
                }`}
              >
                مصروف −
              </button>
            </div>
            <div>
              <Label>المبلغ (ريال يمني)</Label>
              <Input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="0" dir="ltr" className="text-left" />
            </div>
            <div>
              <Label>الوصف</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="مثال: عمولة نشر إعلان عقاري" />
            </div>
            <div>
              <Label>التصنيف (اختياري)</Label>
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">بدون تصنيف</option>
                <option value="توظيف">توظيف</option>
                <option value="عقارات">عقارات</option>
                <option value="تسويق إلكتروني">تسويق إلكتروني</option>
                <option value="برمجيات">برمجيات</option>
                <option value="إعلانات">إعلانات</option>
                <option value="مصاريف تشغيل">مصاريف تشغيل</option>
              </Select>
            </div>
            {error && <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs font-bold text-rose-300">{error}</p>}
            <Button type="submit" loading={busy} className="w-full">تسجيل العملية</Button>
          </form>
        </Card>

        <div className="space-y-3">
          <h3 className="text-sm font-extrabold text-cream">سجل العمليات ({entries?.length ?? 0})</h3>
          {!entries ? (
            <div className="flex justify-center py-10 text-gold-400"><Spinner className="h-7 w-7" /></div>
          ) : entries.length === 0 ? (
            <EmptyState title="لا توجد عمليات مسجلة" hint="سجّل أول عملية مالية" />
          ) : (
            (entries as any[]).map((e) => (
              <div key={e._id} className="card-surface flex items-center justify-between gap-3 p-3.5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={e.type === "income" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-rose-500/40 bg-rose-500/10 text-rose-300"}>
                      {e.type === "income" ? "إيراد" : "مصروف"}
                    </Badge>
                    {e.category && <Badge className="border-ink-600/60 bg-ink-800/60 text-ink-200">{e.category}</Badge>}
                    <span className="text-[10px] font-bold text-ink-400">{formatDateTime(e.createdAt)}</span>
                  </div>
                  <p className="mt-1 truncate text-[13px] font-bold text-cream">{e.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`text-sm font-black ${e.type === "income" ? "text-emerald-300" : "text-rose-300"}`}>
                    {e.type === "income" ? "+" : "−"}{e.amount.toLocaleString("en-US")}
                  </span>
                  <button
                    onClick={async () => { if (confirm("حذف العملية؟")) await deleteEntry({ token, id: e._id }); }}
                    className="text-rose-300/70 hover:text-rose-300"
                    aria-label="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}