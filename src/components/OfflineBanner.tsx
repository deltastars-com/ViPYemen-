import { useEffect, useState } from "react";
import { CONVEX_URL } from "@/lib/convex";
import { useLang } from "@/lib/i18n";
import { subscribeBackend, subscribeHost, type BackendState, type HostState } from "@/lib/health";
import { pendingCount } from "@/lib/outbox";

/**
 * Independent hosting mirrors — every push deploys to ALL of them at once
 * (Vercel + Render + GitHub Pages), so if one provider is down the others
 * keep serving the full platform. The banner offers the live ones whenever
 * the origin the user is on stops answering.
 */
const MIRRORS = [
  { label: "Vercel", url: "https://vi-p-yemen.vercel.app" },
  { label: "Render", url: "https://vipyemen.onrender.com" },
];

/**
 * Status banner in the app shell:
 * - No backend URL baked in  → amber "preview mode" notice (app still fully usable shell)
 * - Device offline           → navy "offline mode" notice (cached app keeps working)
 * - Backend unreachable      → amber outage notice (data queued, auto-syncs)
 * - Pending outbox items     → queued-submission counter
 * All disappear automatically once the condition resolves.
 */
export function OfflineBanner() {
  const { t } = useLang();
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [backend, setBackend] = useState<BackendState>("unknown");
  const [host, setHost] = useState<HostState>("unknown");
  const [pending, setPending] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    const unsub = subscribeBackend(setBackend);
    const unsubHost = subscribeHost(setHost);
    const refresh = () => setPending(pendingCount());
    refresh();
    window.addEventListener("vip:outbox", refresh as EventListener);
    const poll = window.setInterval(refresh, 5_000);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
      window.removeEventListener("vip:outbox", refresh as EventListener);
      window.clearInterval(poll);
      unsub();
      unsubHost();
    };
  }, []);

  const noBackend = !CONVEX_URL;

  if (dismissed) return null;

  if (noBackend) {
    return (
      <div className="flex items-center justify-between gap-3 border-b border-gold-400/30 bg-gradient-to-l from-gold-400/15 via-gold-400/10 to-transparent px-4 py-2 text-[13px] text-gold-100">
        <span className="flex items-center gap-2">
          <span aria-hidden>📡</span>
          <span>
            {t("previewMode")}
            <span className="mx-1 hidden font-mono text-gold-300/80 sm:inline">(VITE_CONVEX_URL)</span>
          </span>
        </span>
        <button
          onClick={() => setDismissed(true)}
          aria-label={t("hideBanner")}
          className="shrink-0 rounded-full px-2 text-gold-200/70 hover:bg-white/10 hover:text-gold-100"
        >
          ✕
        </button>
      </div>
    );
  }

  if (!online) {
    return (
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-ink-800/90 px-4 py-2 text-[13px] text-cream/90">
        <span className="flex items-center gap-2">
          <span aria-hidden>📶</span>
          <span>
            {t("offlineMode")}
            {pending > 0 && (
              <span className="mr-2 font-bold text-amber-300">
                · {pending} طلب محفوظ بانتظار الإرسال
              </span>
            )}
          </span>
        </span>
        <button
          onClick={() => setDismissed(true)}
          aria-label={t("hideBanner")}
          className="shrink-0 rounded-full px-2 text-cream/60 hover:bg-white/10 hover:text-cream"
        >
          ✕
        </button>
      </div>
    );
  }

  // The hosting provider the user is currently on stopped answering while
  // the cached app keeps running — point them at the live backup mirrors.
  if (host === "down") {
    const mirrors = MIRRORS.filter(
      (m) => typeof location === "undefined" || !location.href.startsWith(m.url)
    );
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-400/30 bg-gradient-to-l from-amber-400/15 via-amber-400/10 to-transparent px-4 py-2 text-[13px] text-amber-100">
        <span className="flex flex-wrap items-center gap-2">
          <span aria-hidden>🔁</span>
          <span>
            الاستضافة الحالية متوقفة مؤقتاً — افتح نسخة احتياطية تعمل الآن:
            {mirrors.map((m) => (
              <a
                key={m.url}
                href={m.url}
                className="mx-1 font-black text-gold-200 underline underline-offset-4 hover:text-gold-100"
              >
                {m.label}
              </a>
            ))}
          </span>
        </span>
        <button
          onClick={() => setDismissed(true)}
          aria-label={t("hideBanner")}
          className="shrink-0 rounded-full px-2 text-amber-200/70 hover:bg-white/10 hover:text-amber-100"
        >
          ✕
        </button>
      </div>
    );
  }

  // Device is online but the backend itself is unreachable — the cached app
  // keeps working and every write is queued for automatic delivery.
  if (backend === "down") {
    return (
      <div className="flex items-center justify-between gap-3 border-b border-amber-400/30 bg-gradient-to-l from-amber-400/15 via-amber-400/10 to-transparent px-4 py-2 text-[13px] text-amber-100">
        <span className="flex items-center gap-2">
          <span aria-hidden>🛠️</span>
          <span>
            تعذر الاتصال بالخادم مؤقتاً — المنصة تعمل من نسختها المحفوظة
            {pending > 0 && (
              <span className="mr-1 font-bold">· {pending} طلب يُرسَل تلقائياً عند العودة</span>
            )}
          </span>
        </span>
        <button
          onClick={() => setDismissed(true)}
          aria-label={t("hideBanner")}
          className="shrink-0 rounded-full px-2 text-amber-200/70 hover:bg-white/10 hover:text-amber-100"
        >
          ✕
        </button>
      </div>
    );
  }

  return null;
}
