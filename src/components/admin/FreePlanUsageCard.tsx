import { useEffect, useState } from "react";
import { useConvex, useMutation } from "convex/react";
import {
  AlertTriangle,
  Archive,
  Database,
  HardDrive,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Button, Card, Spinner } from "@/components/ui";

/**
 * 📊 استخدام المنصة — حماية الخطة المجانية (Convex Free: 0.5GB قاعدة ·
 * 1GB ملفات · مليون استدعاء/شهر). تقرأ لقطة يومية من usageMetrics و تعرض:
 * اتجاه 14 يوماً · نمو الأسبوع · الحدود الرسمية · الملفات المؤرشفة
 * القابلة للتنظيف اليدوي (لا حذف تلقائي أبداً — قرار إنساني مؤكَّد).
 */
export function FreePlanUsageCard({ token }: { token: string }) {
  const convex = useConvex();
  // 🛡️ تحميل بمرة واحدة مع التقاط الأخطاء: إن كان الباك اند الحيّ لم يُنشر
  // بعد بوحدة usageMetrics (مثلاً قبل إصلاح مفتاح النشر)، تُعرض بطاقة
  // إشعار أنيقة بدل أن تسقط صفحة الإعدادات كلها.
  const [usage, setUsage] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const collectNow = useMutation(api.usageMetrics.collectNow);
  const purge = useMutation(api.usageMetrics.purgeArchivedFiles);
  const [busy, setBusy] = useState<"refresh" | "purge" | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function load() {
    try {
      const r = await convex.query(api.usageMetrics.summary, { token });
      setUsage(r);
      setLoadError(null);
    } catch (e: any) {
      setLoadError(e?.message ?? "تعذّر تحميل بيانات الاستخدام");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!usage) {
    return (
      <Card className="p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-cream">
          <Database className="h-4 w-4 text-gold-400" />
          استخدام المنصة — الخطة المجانية
        </h3>
        {loadError ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-200">
            <p>
              وحدة تتبّع الاستخدام غير مُنشورة على الباك اند الحيّ بعد — تظهر
              تلقائياً بعد نشر أحدث الشيفرة إلى نشر المنصة (مفتاح النشر الصحيح).
            </p>
            <Button variant="ghost" onClick={load}>
              <RefreshCw className="h-3.5 w-3.5" />
              إعادة المحاولة
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center py-6">
            <Spinner className="h-6 w-6 text-gold-400" />
          </div>
        )}
      </Card>
    );
  }

  const latest = usage.latest;
  const history = usage.history;
  const maxTotal = Math.max(1, ...history.map((h: any) => h.totalDocs));
  const growth = usage.weeklyGrowthPct;
  const growthHot = growth !== null && growth >= 20;

  async function handleRefresh() {
    setBusy("refresh");
    setNote(null);
    try {
      const r = await collectNow({ token });
      setNote(`تم تحديث اللقطة: ${r.totalDocs} سجلاً · ${r.attachmentRefs} ملف مرفق.`);
    } catch (e: any) {
      setNote(e.message ?? "تعذّر التحديث");
    } finally {
      setBusy(null);
    }
  }

  async function handlePurge() {
    const ok = window.confirm(
      "تنظيف الملفات المؤرشفة من تخزين المنصة؟\n\nسيُحذف محتوى ملفات الطلبات المنتهية (المؤرشفة) فقط — تبقى سجلاتها وبياناتها كما هي للاستئناف. لا يمكن التراجع عن الحذف."
    );
    if (!ok) return;
    setBusy("purge");
    setNote(null);
    try {
      const r = await purge({ token, confirm: true, limit: 300 });
      setNote(`تم تحرير ${r.deleted} ملفاً من التخزين (حتى 300 في الدفعة — كرّر للباقي).`);
    } catch (e: any) {
      setNote(e.message ?? "تعذّر التنظيف");
    } finally {
      setBusy(null);
    }
  }

  const quotaRows = [
    {
      icon: Database,
      label: "قاعدة البيانات",
      value: "0.5 GB",
      note: "صفوف + فهارس (الفهرس يُحتسب نسخة إضافية)",
    },
    {
      icon: HardDrive,
      label: "ملفات التخزين",
      value: "1 GB",
      note: "مرفقات العملاء + النسخ الاحتياطية",
    },
    {
      icon: TrendingUp,
      label: "استدعاءات الوظائف",
      value: "1M / شهر",
      note: "العملاء + crons + الاشتراكات + الملفات",
    },
  ];

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-cream">
          <Database className="h-4 w-4 text-gold-400" />
          استخدام المنصة — الخطة المجانية
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-ink-300">
            آخر لقطة:{" "}
            {latest ? new Date(latest.collectedAt).toLocaleString("ar-YE", { hour12: false }) : "—"}
          </span>
          <Button variant="ghost" onClick={handleRefresh} disabled={busy !== null}>
            {busy === "refresh" ? (
              <Spinner className="h-3.5 w-3.5" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            تحديث الآن
          </Button>
        </div>
      </div>

      {note && (
        <div className="mb-4 rounded-xl border border-gold-500/30 bg-gold-500/10 p-3 text-[11px] leading-relaxed text-gold-200">
          {note}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-navy-600 bg-navy-800/50 p-3">
          <p className="text-[11px] text-ink-300">إجمالي السجلات المعدودة</p>
          <p className="mt-1 text-2xl font-extrabold text-cream">
            {latest ? latest.totalDocs.toLocaleString("ar-YE") : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-navy-600 bg-navy-800/50 p-3">
          <p className="text-[11px] text-ink-300">ملفات مرفقة (حصة 1GB)</p>
          <p className="mt-1 text-2xl font-extrabold text-cream">
            {latest ? latest.attachmentRefs.toLocaleString("ar-YE") : "—"}
          </p>
        </div>
        <div
          className={`rounded-xl border p-3 ${
            growthHot
              ? "border-amber-500/40 bg-amber-500/10"
              : "border-navy-600 bg-navy-800/50"
          }`}
        >
          <p className="text-[11px] text-ink-300">نمو الأسبوع</p>
          <p
            className={`mt-1 text-2xl font-extrabold ${
              growthHot ? "text-amber-300" : "text-cream"
            }`}
          >
            {growth === null ? "—" : `${growth > 0 ? "+" : ""}${growth}%`}
          </p>
        </div>
      </div>

      {growthHot && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            نمو أسبوعي فوق 20% — راقب الاتجاه أدناه ونظّف الملفات المؤرشفة، أو راجع
            صفحة الاستخدام في لوحة Convex قبل بلوغ حد الخطة.
          </p>
        </div>
      )}

      {history.length > 1 && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] text-ink-300">اتجاه السجلات — آخر {history.length} يوماً</p>
          <div className="flex h-16 items-end gap-[3px]">
            {history.map((h: any) => (
              <div
                key={h.collectedAt}
                className="flex-1 rounded-t bg-gold-500/60 transition-all hover:bg-gold-400"
                style={{ height: `${Math.max(6, Math.round((h.totalDocs / maxTotal) * 100))}%` }}
                title={`${new Date(h.collectedAt).toLocaleDateString("ar-YE")}: ${h.totalDocs} سجل`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-navy-600 bg-navy-800/40 p-3">
          <p className="mb-2 text-[11px] font-bold text-cream">أكبر الجداول حجماً</p>
          <ul className="space-y-1 text-[11px] text-ink-300">
            {(latest
              ? (Object.entries(latest.counts) as [string, number][])
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 8)
              : []
            ).map(([table, n]: [string, number]) => (
              <li key={table} className="flex items-center justify-between gap-2" dir="ltr">
                <span className="truncate">{table}</span>
                <span className="font-bold text-cream">
                  {n >= 1000 ? "1000+" : n.toLocaleString("en-US")}
                </span>
              </li>
            ))}
            {latest && Object.keys(latest.counts).length === 0 && (
              <li className="text-ink-300">لا توجد لقطات بعد — اضغط «تحديث الآن».</li>
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-navy-600 bg-navy-800/40 p-3">
          <p className="mb-2 text-[11px] font-bold text-cream">حدود الخطة المجانية (رسمية)</p>
          <ul className="space-y-2">
            {quotaRows.map((q) => (
              <li key={q.label} className="flex items-start gap-2 text-[11px]">
                <q.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-400" />
                <div>
                  <span className="text-cream">{q.label}: </span>
                  <span className="font-extrabold text-gold-300">{q.value}</span>
                  <span className="text-ink-300"> — {q.note}</span>
                </div>
              </li>
            ))}
          </ul>
          <a
            href={usage.quotas.source}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-[11px] text-gold-400 underline hover:text-gold-300"
            dir="ltr"
          >
            docs.convex.dev/production/state/limits
          </a>
        </div>
      </div>

      {(latest?.reclaimableRefs ?? 0) > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-navy-600 bg-navy-800/40 p-3">
          <div className="flex items-start gap-2 text-[11px] leading-relaxed text-ink-300">
            <Archive className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
            <p>
              <b className="text-cream">
                {(latest?.reclaimableRefs ?? 0).toLocaleString("ar-YE")} ملف
              </b>{" "}
              تابعة لطلبات <b className="text-cream">مؤرشفة</b> (منتهية العرض) ما زالت تحتل
              التخزين. التنظيف يدوي ومؤكَّد — السجلات والبيانات تبقى كما هي.
            </p>
          </div>
          <Button onClick={handlePurge} disabled={busy !== null}>
            {busy === "purge" ? <Spinner className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
            تنظيف المخزن (حتى 300)
          </Button>
        </div>
      )}
    </Card>
  );
}
