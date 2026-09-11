import { useEffect, useState } from "react";
import { CONVEX_URL } from "@/lib/convex";
import { useLang } from "@/lib/i18n";

/**
 * Status banner in the app shell:
 * - No backend URL baked in  → amber "preview mode" notice (app still fully usable shell)
 * - Device offline           → navy "offline mode" notice (cached app keeps working)
 * Both disappear automatically once the condition resolves.
 */
export function OfflineBanner() {
  const { t } = useLang();
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
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
          <span>{t("offlineMode")}</span>
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

  return null;
}
