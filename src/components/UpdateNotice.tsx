/**
 * In-app update reminder.
 *
 * How it works:
 *  - The release pipeline bakes the git tag into the bundle as
 *    VITE_APP_VERSION (e.g. "v6.7.33"); web builds that don't set it simply
 *    skip this feature (the web app updates itself through the service
 *    worker instead).
 *  - Once every 6 hours the component asks the PUBLIC GitHub Releases API for
 *    the latest published release tag (no token, no backend dependency — it
 *    still works while Convex or any host is down).
 *  - If the published tag is newer than the running build, a small badge is
 *    shown directly above the app-download (APKPure) icon at the bottom of
 *    the page. It is a reminder only: it never links anywhere, so the user is
 *    never taken into the repository Releases section or any other page.
 *
 * Failures are silent by design: an unreachable GitHub API must never
 * disturb the app.
 */
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useLang } from "@/lib/i18n";

const REPO = "deltastars-com/ViPYemen-";
const LATEST_API = `https://api.github.com/repos/${REPO}/releases/latest`;
const CHECK_KEY = "vip_update_check_v1";
const DISMISS_KEY = "vip_update_dismissed_v1";
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000; // 6 hours

type UpdateInfo = { tag: string };

function parseVersion(value: string): number[] {
  return value
    .trim()
    .replace(/^v/i, "")
    .split(/[.\-+]/)
    .map((part) => Number.parseInt(part, 10) || 0);
}

/** True when `candidate` is a strictly newer version than `current`. */
function isNewer(candidate: string, current: string): boolean {
  const a = parseVersion(candidate);
  const b = parseVersion(current);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

/** Latest published release newer than this build, or null. */
function useUpdateAvailable(): UpdateInfo | null {
  const current = String(import.meta.env.VITE_APP_VERSION ?? "").trim();
  const [info, setInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    // Only release builds know their own version (dev / plain web builds skip).
    if (!current || current === "main" || !/^v?\d+\.\d+/.test(current)) return;

    try {
      const last = Number(localStorage.getItem(CHECK_KEY) ?? 0);
      if (Number.isFinite(last) && Date.now() - last < CHECK_EVERY_MS) return;
      localStorage.setItem(CHECK_KEY, String(Date.now()));
    } catch {
      /* storage unavailable — still fine to check once per session */
    }

    let cancelled = false;
    fetch(LATEST_API, { headers: { Accept: "application/vnd.github+json" } })
      .then((res) => (res.ok ? res.json() : null))
      .then((release: { tag_name?: string } | null) => {
        if (cancelled || !release?.tag_name) return;
        if (!isNewer(release.tag_name, current)) return;
        try {
          if (localStorage.getItem(DISMISS_KEY) === release.tag_name) return;
        } catch {
          /* ignore */
        }
        setInfo({ tag: release.tag_name });
      })
      .catch(() => {
        /* offline or API unreachable — never disturb the app */
      });

    return () => {
      cancelled = true;
    };
  }, [current]);

  return info;
}

/**
 * Reminder badge for a pending update. Render it directly above the
 * app-download (APKPure) icon; it is intentionally not a link.
 */
export function UpdateBadge() {
  const info = useUpdateAvailable();
  const [dismissed, setDismissed] = useState(false);
  const { lang } = useLang();

  if (!info || dismissed) return null;

  const close = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, info.tag);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mb-2 flex w-fit items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-black text-emerald-300">
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
      </span>
      <span>
        {lang === "ar" ? "يتوفر تحديث جديد" : "New update available"}{" "}
        <span dir="ltr" className="font-mono">{info.tag}</span>
      </span>
      <button
        onClick={close}
        aria-label={lang === "ar" ? "إخفاء تنبيه التحديث" : "Hide update reminder"}
        className="-mr-1 shrink-0 rounded-full p-0.5 text-emerald-300/70 transition hover:bg-white/10 hover:text-emerald-200"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}