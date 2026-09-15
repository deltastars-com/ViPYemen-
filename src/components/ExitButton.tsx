import { useState } from "react";
import { Power } from "lucide-react";
import { exitApp } from "@/lib/exit";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Professional Exit button — ends the session and closes the app.
 * Native: terminates the app process (App.exitApp).
 * Web/PWA: farewell overlay + history replace, like a signed-out state.
 */
export function ExitButton({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { t, lang } = useLang();
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <button
        onClick={() => setConfirming(true)}
        title={t("exitAppTitle")}
        aria-label={t("exitAppTitle")}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/40 bg-gradient-to-b from-rose-500/15 to-rose-700/10 px-3 py-2 text-xs font-extrabold text-rose-200 shadow-[0_2px_12px_-4px_rgba(244,63,94,0.5)] transition-all hover:border-rose-400/60 hover:from-rose-500/25 hover:text-rose-100 active:scale-95",
          compact && "!px-2.5",
          className
        )}
      >
        <Power className="h-3.5 w-3.5" />
        {!compact && <span>{t("exit")}</span>}
        <span className="sr-only">{lang === "ar" ? "إنهاء التطبيق" : "Exit app"}</span>
      </button>

      {confirming && (
        <ExitConfirmDialog onConfirm={exitApp} onCancel={() => setConfirming(false)} />
      )}
    </>
  );
}

function ExitConfirmDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const { t } = useLang();

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-ink-950/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-rose-500/30 bg-gradient-to-b from-ink-900 to-ink-950 p-6 text-center shadow-[0_25px_80px_-20px_rgba(0,0,0,0.9)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-rose-500/40 bg-rose-500/10">
          <Power className="h-7 w-7 text-rose-400" />
        </div>
        <h2 className="mb-2 text-lg font-extrabold text-cream">{t("exitConfirmTitle")}</h2>
        <p className="mb-6 text-sm text-ink-300">{t("exitConfirmBody")}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-ink-600/70 bg-ink-800/60 px-4 py-2.5 text-sm font-bold text-ink-200 transition-colors hover:bg-ink-700/60"
          >
            {t("exitCancel")}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-gradient-to-b from-rose-500 to-rose-700 px-4 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-rose-900/40 transition-transform active:scale-95"
          >
            {t("exitConfirmYes")}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Full-screen farewell shown after a web/PWA exit (native apps terminate for real).
 */
export function FarewellScreen() {
  const { t } = useLang();
  return (
    <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-ink-950 p-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-gold-500/30 bg-gold-500/10">
        <Power className="h-10 w-10 text-gold-400" />
      </div>
      <h1 className="mb-3 text-2xl font-black text-cream">{t("farewellTitle")}</h1>
      <p className="max-w-sm text-sm leading-relaxed text-ink-300">{t("farewellBody")}</p>
      <a
        href="/"
        className="btn-gold mt-8 inline-flex items-center gap-2 !px-6 !py-3"
        onClick={(e) => {
          e.preventDefault();
          window.location.href = "/";
        }}
      >
        {t("farewellReopen")}
      </a>
    </div>
  );
}
