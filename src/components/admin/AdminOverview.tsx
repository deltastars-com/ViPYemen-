import { useQuery } from "convex/react";
import {
  Inbox,
  CheckCircle2,
  XCircle,
  BadgeCheck,
  Wallet,
  Megaphone,
  Crown,
  ArrowLeft,
  Users,
  ShoppingBag,
  Home,
  Briefcase,
  Code2,
  Users2,
  UserCheck,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { StatCard, Spinner } from "@/components/ui";
import type { AdminTab } from "@/pages/AdminPage";
import { formatDateTime } from "@/lib/utils";
import { CATEGORIES } from "@/lib/categories";

export function AdminOverview({ token, setTab }: { token: string; setTab: (t: AdminTab) => void }) {
  const stats = useQuery(api.submissions.getAdminStats, { token });
  const pending = useQuery(api.submissions.listAll, { token, status: "pending" });

  if (!stats || !pending) {
    return (
      <div className="flex justify-center py-20 text-gold-400">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="إجمالي الطلبات" value={stats.total} icon={<Inbox className="h-5 w-5" />} />
        <StatCard label="بانتظار المراجعة" value={stats.pending} icon={<Users className="h-5 w-5" />} accent="amber" />
        <StatCard label="منشورة" value={stats.published} icon={<CheckCircle2 className="h-5 w-5" />} accent="emerald" />
        <StatCard label="تم البيع" value={stats.sold} icon={<BadgeCheck className="h-5 w-5" />} accent="sky" />
        <StatCard label="مرفوضة" value={stats.rejected} icon={<XCircle className="h-5 w-5" />} accent="rose" />
        <StatCard label="أرقام موثقة" value={stats.phoneVerified} icon={<BadgeCheck className="h-5 w-5" />} accent="emerald" />
        <StatCard label="الإعلانات" value={stats.ads} icon={<Megaphone className="h-5 w-5" />} />
        <StatCard label="العروض" value={stats.offers} icon={<Crown className="h-5 w-5" />} />
        <StatCard label="العملاء" value={stats.clientsTotal ?? 0} icon={<Users2 className="h-5 w-5" />} accent="violet" />
        <StatCard label="متابعات مكتملة" value={stats.clientsResolved ?? 0} icon={<UserCheck className="h-5 w-5" />} accent="emerald" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card-surface p-5">
          <h3 className="mb-4 text-sm font-extrabold text-cream">الطلبات حسب القسم</h3>
          <div className="space-y-3">
            {CATEGORIES.map((c, i) => {
              const icons = [Briefcase, Home, ShoppingBag, Code2];
              const Icon = icons[i];
              const count = stats.byCategory[c.key] ?? 0;
              const max = Math.max(1, ...Object.values(stats.byCategory));
              return (
                <button
                  key={c.key}
                  onClick={() => setTab(c.key as AdminTab)}
                  className="group flex w-full items-center gap-3 text-right"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gold-500/30 bg-gold-500/10 text-gold-300">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-cream">{c.label}</span>
                      <span className="text-gold-300">{count} طلب</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-l from-gold-300 to-gold-600 transition-all"
                        style={{ width: `${(count / max) * 100}%` }}
                      />
                    </div>
                  </div>
                  <ArrowLeft className="h-4 w-4 text-ink-500 transition-colors group-hover:text-gold-300" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="card-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-cream">أحدث الطلبات الواردة</h3>
            <span className="chip !border-amber-500/40 !bg-amber-500/10 !text-amber-300">{pending.length} بانتظار</span>
          </div>
          <div className="space-y-2">
            {pending.slice(0, 8).map((p: any) => {
              const cat = CATEGORIES.find((c) => c.key === p.category);
              return (
                <button
                  key={p._id}
                  onClick={() => setTab((cat?.key ?? "jobs") as AdminTab)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-ink-700/50 bg-ink-800/40 px-3.5 py-2.5 text-right transition-colors hover:border-gold-500/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold text-cream">{p.title}</p>
                    <p className="truncate text-[11px] text-ink-300">{p.fullName} · {cat?.shortLabel ?? p.category}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold text-ink-400">{formatDateTime(p.createdAt)}</span>
                </button>
              );
            })}
            {pending.length === 0 && (
              <p className="py-6 text-center text-xs font-semibold text-ink-400">
                لا توجد طلبات بانتظار المراجعة — ممتاز!
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        <button
          onClick={() => setTab("clients")}
          className="card-surface card-surface-hover flex items-center gap-3 p-4 text-right"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10 text-violet-300">
            <Users2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-cream">بيانات العملاء</p>
            <p className="text-xs text-ink-300">
              {stats.clientsPending ?? 0} بانتظار المتابعة — كشوفات مفصلة وفلترة
            </p>
          </div>
        </button>
        <button
          onClick={() => setTab("finance")}
          className="card-surface card-surface-hover flex items-center gap-3 p-4 text-right"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-cream">رصيد الحسابات</p>
            <p className="text-xs text-ink-300">
              {stats.financeTotal.toLocaleString("en-US")} ريال
            </p>
          </div>
        </button>
        <button
          onClick={() => setTab("ads")}
          className="card-surface card-surface-hover flex items-center gap-3 p-4 text-right"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/10 text-gold-300">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-cream">إدارة الإعلانات</p>
            <p className="text-xs text-ink-300">الشريط الإعلاني والنشر التلقائي</p>
          </div>
        </button>
        <button
          onClick={() => setTab("offers")}
          className="card-surface card-surface-hover flex items-center gap-3 p-4 text-right"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/10 text-gold-300">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-cream">العروض الترويجية</p>
            <p className="text-xs text-ink-300">نشر العروض بالصور والفيديو</p>
          </div>
        </button>
      </div>
    </div>
  );
}