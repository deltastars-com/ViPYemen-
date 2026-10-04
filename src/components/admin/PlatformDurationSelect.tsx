/**
 * ⏳ اختيار مدة ظهور المنشور على واجهات المنصة
 *
 * تُعرض هذه الأداة في نافذة المراجعة/التعديل قبل إعادة النشر. القاعدة:
 * المنشور يبقى في القنوات والجروبات والصفحات **دائماً**، وعلى واجهات المنصة
 * فقط للمدة التي تختارها الإدارة هنا — بعدها يختفي آلياً.
 */
import { Clock } from "lucide-react";

/** الخيارات الثابتة المعروضة للإدارة (نفس قيم الخلفية في platformExpiry.ts). */
export const PLATFORM_DURATION_OPTIONS: { value: number; label: string }[] = [
  { value: 7, label: "٧ أيام" },
  { value: 15, label: "١٥ يوماً" },
  { value: 30, label: "شهر (٣٠ يوماً)" },
  { value: 60, label: "شهران (٦٠ يوماً)" },
  { value: 90, label: "٣ أشهر (٩٠ يوماً)" },
  { value: 0, label: "دائم — بلا حذف تلقائي" },
];

export function PlatformDurationSelect({
  value,
  onChange,
  compact = false,
}: {
  value: number;
  onChange: (days: number) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3"
          : "rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3.5"
      }
    >
      <div className="mb-2 flex items-start gap-2">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        <div className="min-w-0">
          <p className="text-[12px] font-black text-amber-100">
            ⏳ مدة الظهور على واجهات المنصة والتطبيقات
          </p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-amber-200/85">
            نسخة المنشور في القنوات والجروبات والصفحات تبقى <b>دائمة</b> بلا حذف.
            هذه المدة تخصّ ظهوره في أقسام المنصة فقط، وبعدها يختفي آلياً.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PLATFORM_DURATION_OPTIONS.map((opt) => {
          const on = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={
                on
                  ? "rounded-lg border border-amber-400/60 bg-amber-400/20 px-2.5 py-1.5 text-[11px] font-black text-amber-100"
                  : "rounded-lg border border-ink-600/60 bg-ink-900/50 px-2.5 py-1.5 text-[11px] font-bold text-ink-300 transition-colors hover:border-amber-500/50 hover:text-amber-200"
              }
            >
              {on ? "✓ " : ""}
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}