/**
 * In-app update notifier — keeps installed APK/AAB/iOS builds on the newest
 * release without any store round-trip.
 *
 * How it works:
 *  - The release pipeline bakes the git tag into the bundle as
 *    VITE_APP_VERSION (e.g. "v6.7.33"); web builds that don't set it simply
 *    skip this feature (the web app updates itself through the service
 *    worker instead).
 *  - Once every 6 hours the component asks the PUBLIC GitHub Releases API for
 *    the latest published release (no token, no backend dependency — it
 *    still works while Convex or any host is down).
 *  - If the published tag is newer than the running build, a dismissible
 *    banner offers the direct APK download plus the release page.
 *
 * Failures are silent by design: an unreachable GitHub API must never
 * disturb the app.
 */
import { useEffect, useState } from "react";
import { Download, Sparkles, X } from "lucide-react";

const REPO = "deltastars-com/ViPYemen-";
const LATEST_API = `https://api.github.com/repos/${REPO}/releases/latest`;
const CHECK_KEY = "vip_update_check_v1";
const DISMISS_KEY = "vip_update_dismissed_v1";
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000; // 6 hours

type UpdateInfo = { tag: string; url: string; apk?: string };

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

export function UpdateNotice() {
  const current = String(import.meta.env.VITE_APP_VERSION ?? "").trim();
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

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
      .then((release: { tag_name?: string; html_url?: string; assets?: { name: string; browser_download_url: string }[] } | null) => {
        if (cancelled || !release?.tag_name || !release.html_url) return;
        if (!isNewer(release.tag_name, current)) return;
        try {
          if (localStorage.getItem(DISMISS_KEY) === release.tag_name) return;
        } catch {
          /* ignore */
        }
        const apk = (release.assets ?? []).find((a) => /\.apk$/i.test(a.name));
        setInfo({
          tag: release.tag_name,
          url: release.html_url,
          apk: apk?.browser_download_url,
        });
      })
      .catch(() => {
        /* offline or API unreachable — never disturb the app */
      });

    return () => {
      cancelled = true;
    };
  }, [current]);

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
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-400/30 bg-gradient-to-l from-emerald-400/15 via-emerald-400/10 to-transparent px-4 py-2 text-[13px] text-emerald-100">
      <span className="flex flex-wrap items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0" />
        <span>
          يتوفر تحديث جديد <span dir="ltr" className="font-mono font-bold">{info.tag}</span> — نسختك{" "}
          <span dir="ltr" className="font-mono">{current}</span>
        </span>
        <a
          href={info.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 font-black text-emerald-100 underline-offset-4 transition hover:bg-emerald-500/30"
        >
          <Download className="h-3.5 w-3.5" />
          صفحة التحديث
        </a>
        {info.apk && (
          <a
            href={info.apk}
            className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/25 px-3 py-1 font-black text-gold-100 underline-offset-4 transition hover:bg-gold-500/35"
          >
            تنزيل APK مباشرة
          </a>
        )}
      </span>
      <button
        onClick={close}
        aria-label="إخفاء تنبيه التحديث"
        className="shrink-0 rounded-full px-2 text-emerald-200/70 hover:bg-white/10 hover:text-emerald-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
