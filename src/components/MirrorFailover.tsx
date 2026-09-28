import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import { subscribeHost, type HostState } from "@/lib/health";
import { isNativeApp } from "@/lib/native";
import { fastestMirror, mirrorList, type Mirror } from "@/lib/mirrors";

/**
 * 🔁 التحويل التلقائي بين سيرفرات الاستضافة المجانية.
 *
 * إذا توقف مزود الاستضافة الذي يفتح منه الزائر (Vercel / Render / Pages / أي
 * مرآة إضافية)، فالتطبيق المخزَّن يبقى يعمل، وهذه الشاشة:
 *   1. تفحص بقية المرايا فوراً (طلبات HEAD خفيفة، بلا تنزيل بيانات)،
 *   2. تعرض المرايا العاملة بزمن استجابتها،
 *   3. تحوّل تلقائياً إلى أسرع مرآة عاملة بعد عدّ تنازلي — إلا إذا ألغى
 *      الزائر، فلا يُنقل عن صفحته رغماً عنه.
 *
 * التطبيقات الأصلية (APK/AAB/iOS) لا تحتاج هذا أصلاً: واجهتها مدمجة داخل
 * الحزمة وتعمل حتى لو توقفت كل الاستضافات، لذلك لا تظهر الشاشة هناك.
 */
const AUTO_SWITCH_SECONDS = 12;

export function MirrorFailover() {
  const { lang } = useLang();
  const [host, setHost] = useState<HostState>("unknown");
  const [probing, setProbing] = useState(false);
  const [target, setTarget] = useState<Mirror | null>(null);
  const [count, setCount] = useState(AUTO_SWITCH_SECONDS);
  const [cancelled, setCancelled] = useState(false);
  const probingRef = useRef(false);
  const native = isNativeApp();

  useEffect(() => subscribeHost(setHost), []);

  const down = host === "down" && !native;

  // فحص المرايا عند اكتشاف التوقف، ثم إعادة الفحص كل 25 ثانية حتى تتحسن.
  useEffect(() => {
    if (!down) {
      setTarget(null);
      setCount(AUTO_SWITCH_SECONDS);
      return;
    }
    let alive = true;
    const run = async () => {
      if (probingRef.current) return;
      probingRef.current = true;
      setProbing(true);
      try {
        const mirror = await fastestMirror();
        if (alive) setTarget(mirror);
      } finally {
        probingRef.current = false;
        if (alive) setProbing(false);
      }
    };
    void run();
    const timer = window.setInterval(run, 25_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [down]);

  // عدّ تنازلي للتحويل التلقائي إلى أسرع مرآة عاملة.
  useEffect(() => {
    if (!down || !target || cancelled) return;
    if (count <= 0) {
      const suffix = `${location.pathname}${location.search}${location.hash}`;
      location.replace(`${target.url.replace(/\/$/, "")}${suffix}`);
      return;
    }
    const timer = window.setTimeout(() => setCount((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [down, target, cancelled, count]);

  if (!down) return null;

  const others = mirrorList();
  const ar = lang === "ar";

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={ar ? "تحويل تلقائي إلى نسخة احتياطية" : "Automatic failover to a backup mirror"}
      className="fixed inset-x-0 bottom-0 z-[70] border-t-2 border-gold-500/60 bg-ink-950/97 px-4 py-4 shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur"
    >
      <div className="container-app flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-cream">
          <span aria-hidden>🔁</span>
          <strong className="text-gold-300">
            {ar
              ? "سيرفر الاستضافة الحالي متوقف مؤقتاً — نسختك المحفوظة تعمل الآن"
              : "The current hosting server is temporarily down — your cached copy still works"}
          </strong>
          {probing && (
            <span className="text-ink-300">{ar ? "· جارٍ فحص المرايا…" : "· probing mirrors…"}</span>
          )}
          {!probing && target && !cancelled && (
            <span className="text-gold-200">
              {ar
                ? `· سيتم التحويل تلقائياً إلى ${target.label} خلال ${count} ث`
                : `· switching automatically to ${target.label} in ${count}s`}
            </span>
          )}
          {!probing && !target && (
            <span className="text-ink-300">
              {ar ? "· كل المرايا تُفحص، جرّب بعد لحظات" : "· checking every mirror, try again in a moment"}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {target && (
            <button
              type="button"
              onClick={() => location.replace(target.url)}
              className="btn-gold"
            >
              {ar ? `افتح ${target.label} الآن` : `Open ${target.label} now`}
            </button>
          )}
          {others.map((mirror) => (
            <a
              key={mirror.url}
              href={mirror.url}
              className="rounded-lg border border-ink-600/70 bg-ink-900/60 px-3 py-2 text-[12px] font-bold text-ink-200 transition-colors hover:border-gold-500/60 hover:text-gold-300"
            >
              {mirror.label}
            </a>
          ))}
          {target && !cancelled && (
            <button
              type="button"
              onClick={() => setCancelled(true)}
              className="rounded-lg px-3 py-2 text-[12px] font-bold text-ink-300 underline underline-offset-4 hover:text-cream"
            >
              {ar ? "إلغاء التحويل التلقائي" : "Cancel auto-switch"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
