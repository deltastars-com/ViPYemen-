/**
 * Self error-detector + automatic restart watchdog — ViP Yemen.
 *
 * Installed by importing this module (side-effect) BEFORE the rest of the
 * app bundle evaluates, so even a crash during boot is caught. On any real
 * malfunction the platform shows a branded recovery screen for a few seconds
 * and restarts itself automatically; repeated failures escalate to a full
 * cache/service-worker reset, and an anti-infinite-loop cap prevents the app
 * from rebooting forever on an unrecoverable error.
 *
 * Layers:
 *  1. window "error"            → uncaught runtime exceptions
 *  2. window "unhandledrejection" → failed promises (except benign offline noise)
 *  3. React ErrorBoundary hook  → render crashes (reportFatal)
 *  4. Boot watchdog             → app never finished starting within N seconds
 *  5. UI stall detector         → main thread unresponsive for N seconds
 *  6. Cache/SW reset            → heals stale-cache freezes (blank frozen pages)
 */

const BOOT_TIMEOUT_MS = 30_000; // give slow Android WebViews time to start
const HEARTBEAT_MS = 3_000;
const STALL_CHECK_MS = 4_000;
const STALL_AFTER_MS = 12_000; // main thread silent this long → restart
const MAX_AUTO_RESTARTS = 3; // per 15-minute window, then manual mode
const BACKOFF_WINDOW_MS = 15 * 60_000;
const RESTART_DELAYS_MS = [4_000, 6_000, 9_000];

const STATE_KEY = "vip_auto_recovery_state";
const LOG_KEY = "vip_crash_log";

type RecoveryState = { t: number; n: number };
type LogEntry = { t: number; origin: string; message: string };

/* ------------------------------------------------------------------ */
/* Tiny storage helpers (never let storage failures break the app)     */
/* ------------------------------------------------------------------ */

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — recovery still works in memory */
  }
}

function logCrash(origin: string, message: string) {
  const log = readJSON<LogEntry[]>(LOG_KEY) ?? [];
  log.push({ t: Date.now(), origin, message: (message || "").slice(0, 220) });
  while (log.length > 30) log.shift();
  writeJSON(LOG_KEY, log);
}

/** Consecutive-recovery counter with a sliding time window. */
function bumpCount(): number {
  const state = readJSON<RecoveryState>(STATE_KEY);
  const now = Date.now();
  const n = state && now - state.t < BACKOFF_WINDOW_MS ? state.n + 1 : 1;
  writeJSON(STATE_KEY, { t: now, n });
  return n;
}

function resetCount() {
  writeJSON(STATE_KEY, null);
}

/* ------------------------------------------------------------------ */
/* Recovery overlay                                                    */
/* ------------------------------------------------------------------ */

let recovering = false;
let countdownTimer: number | undefined;
let restartTimer: number | undefined;
let overlayEl: HTMLDivElement | null = null;
let plan: { canAuto: boolean; hardReset: boolean } = { canAuto: true, hardReset: false };

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  style: Partial<CSSStyleDeclaration>,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  Object.assign(node.style, style);
  if (text !== undefined) node.textContent = text;
  return node;
}

function clearOverlayTimers() {
  if (countdownTimer !== undefined) window.clearInterval(countdownTimer);
  if (restartTimer !== undefined) window.clearTimeout(restartTimer);
  countdownTimer = undefined;
  restartTimer = undefined;
}

function closeOverlay() {
  clearOverlayTimers();
  overlayEl?.remove();
  overlayEl = null;
}

function performRestart() {
  clearOverlayTimers();
  // Give the screen a moment to paint the message before reloading.
  window.location.reload();
}

async function deepCleanAndRestart() {
  // Escalation: wipe all app caches + unregister the service worker so the
  // next boot re-precaches from a clean state (fixes stale-cache blank pages).
  clearOverlayTimers();
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => /vip|yemen|workbox/i.test(k)).map((k) => caches.delete(k))
      );
    }
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }
  } catch {
    /* best-effort — reload anyway */
  }
  window.location.reload();
}

function updateOverlay() {
  if (!overlayEl) return;

  const cdEl = overlayEl.querySelector<HTMLElement>("#vipr-countdown");
  const techEl = overlayEl.querySelector<HTMLElement>("#vipr-tech");
  if (!plan.canAuto) {
    const cd = overlayEl.querySelector<HTMLElement>("#vipr-cd-wrap");
    if (cd) cd.style.display = "none";
    if (techEl) techEl.style.display = "none";
    const spin = overlayEl.querySelector<HTMLElement>("#vipr-spinner");
    if (spin) spin.style.display = "none";
    return;
  }

  // Live countdown (seconds remaining) until the automatic restart fires.
  const delay = RESTART_DELAYS_MS[Math.min(restartDelayIndex(), RESTART_DELAYS_MS.length - 1)];
  let remaining = Math.max(1, Math.ceil(delay / 1000));
  if (cdEl) {
    cdEl.textContent = plan.hardReset
      ? "جاري تنظيف الذاكرة المؤقتة وإعادة التشغيل…"
      : `سيتم إعادة تشغيل المنصة تلقائياً خلال ${remaining} ثانية…`;
  }
  if (countdownTimer !== undefined) window.clearInterval(countdownTimer);
  countdownTimer = window.setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) return; // the real timeout performs the reload
    if (cdEl && !plan.hardReset) {
      cdEl.textContent = `سيتم إعادة تشغيل المنصة تلقائياً خلال ${remaining} ثانية…`;
    }
  }, 1000);
}

function restartDelayIndex(): number {
  const state = readJSON<RecoveryState>(STATE_KEY);
  return state ? Math.max(0, state.n - 1) : 0;
}

function showOverlay(message: string) {
  const doc = document.documentElement;
  if (!doc) return;

  // Branded full-screen recovery card (navy + gold, official seal, RTL).
  const bg = el("div", {
    position: "fixed",
    inset: "0",
    zIndex: "2147483000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    background:
      "radial-gradient(ellipse 90% 60% at 50% -10%, rgba(212,175,55,0.12), transparent), radial-gradient(ellipse 70% 50% at 50% 115%, rgba(38,44,71,0.6), transparent), #0a0e1a",
    direction: "rtl",
    fontFamily: "'Cairo', 'Segoe UI', system-ui, sans-serif",
  });
  bg.setAttribute("role", "alertdialog");
  bg.setAttribute("aria-live", "assertive");

  const card = el("div", {
    width: "min(92vw, 420px)",
    background: "#141a2e",
    border: "1px solid rgba(212,175,55,0.35)",
    borderRadius: "26px",
    padding: "34px 26px 26px",
    textAlign: "center",
    boxShadow:
      "0 30px 80px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(10,14,26,0.6), 0 0 60px -20px rgba(212,175,55,0.35)",
  });
  bg.appendChild(card);

  // Official app seal — same artwork as the app icon, no external fetch.
  const logoWrap = el("div", { margin: "0 auto 4px", width: "92px", height: "92px" });
  const logo = el("img", {
    width: "84px",
    height: "84px",
    borderRadius: "20px",
    display: "block",
    margin: "4px auto 0",
    boxShadow: "0 0 0 1px rgba(212,175,55,0.5), 0 12px 28px -8px rgba(0,0,0,0.7)",
  });
  // BASE_URL keeps the icon path valid on the main site (root) and the
  // GitHub Pages mirror (/ViPYemen-/) alike.
  const basePath = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  logo.src = `${basePath}/icons/icon-192.png`;
  logo.alt = "ViP Yemen";
  logo.onerror = () => {
    // If the icon itself is unavailable, keep the recovery screen clean.
    logo.style.display = "none";
  };
  logoWrap.appendChild(logo);
  card.appendChild(logoWrap);

  const spinner = el("div", {
    width: "34px",
    height: "34px",
    margin: "18px auto 6px",
    border: "3px solid rgba(221,180,61,0.25)",
    borderTopColor: "#ddb43d",
    borderRadius: "50%",
    animation: "vipr-spin 0.8s linear infinite",
  });
  spinner.id = "vipr-spinner";
  card.appendChild(spinner);

  const title = el("h2", {
    color: "#f5f0e1",
    fontSize: "20px",
    fontWeight: "900",
    margin: "16px 0 8px",
    lineHeight: "1.5",
  }, "نعتذر — حدث خلل غير متوقع");
  card.appendChild(title);

  const sub = el("p", {
    color: "#adb6d4",
    fontSize: "13.5px",
    lineHeight: "1.9",
    margin: "0 0 12px",
  }, "يكتشف النظام الأعطال تلقائياً ويعيد تشغيل المنصة فوراً — بياناتك محفوظة وآمنة.");
  card.appendChild(sub);

  const cdWrap = el("div", { margin: "4px 0 14px" });
  cdWrap.id = "vipr-cd-wrap";
  const cd = el("p", {
    color: "#e5c55f",
    fontSize: "13px",
    fontWeight: "800",
    margin: "0 0 10px",
  }, "");
  cd.id = "vipr-countdown";
  cdWrap.appendChild(cd);
  card.appendChild(cdWrap);

  const button = el("button", {
    width: "100%",
    cursor: "pointer",
    borderRadius: "14px",
    padding: "12px 18px",
    fontSize: "14px",
    fontWeight: "900",
    color: "#0a0e1a",
    border: "none",
    background: "linear-gradient(180deg, #e5c55f, #b8922a)",
    boxShadow: "0 10px 26px -10px rgba(212,175,55,0.55)",
  }, plan.canAuto ? "إعادة التشغيل الآن" : "محاولة إعادة تشغيل المنصة");
  button.addEventListener("click", () => {
    if (plan.hardReset) {
      resetCount();
      void deepCleanAndRestart();
    } else {
      resetCount();
      performRestart();
    }
  });
  card.appendChild(button);

  const note = el("p", {
    color: "#626fa1",
    fontSize: "12px",
    margin: "14px 0 0",
    lineHeight: "1.8",
  }, plan.canAuto
    ? "إذا استمرت المشكلة بعد عدة محاولات سيعرض التطبيق خيارات إضافية."
    : "حدثت عدة أعطال متتالية — أوقفنا إعادة التشغيل التلقائي لحمايتك. اضغط الزر أعلاه، وإذا استمرت المشكلة تواصل معنا.");
  card.appendChild(note);

  const support = el("a", {
    display: "inline-block",
    marginTop: "10px",
    color: "#ddb43d",
    fontSize: "12.5px",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
  }, "تواصل مع الدعم عبر واتساب");
  support.href = "https://wa.me/967711780999";
  support.target = "_blank";
  support.rel = "noopener noreferrer";
  card.appendChild(support);

  const tech = el("div", {
    direction: "ltr",
    marginTop: "14px",
    color: "#4d5886",
    fontSize: "10.5px",
    fontFamily: "ui-monospace, Menlo, Consolas, monospace",
    wordBreak: "break-all",
    maxHeight: "40px",
    overflow: "hidden",
  }, message);
  tech.id = "vipr-tech";
  card.appendChild(tech);

  // Spinner keyframes (scoped so they can never clash with app styles).
  const style = el("style", {});
  style.textContent =
    "@keyframes vipr-spin{to{transform:rotate(360deg)}}";
  bg.appendChild(style);

  doc.appendChild(bg);
  overlayEl = bg;

  updateOverlay();
}

/* ------------------------------------------------------------------ */
/* Core trigger                                                        */
/* ------------------------------------------------------------------ */

export function triggerRecovery(options?: {
  origin?: string;
  message?: string;
  hard?: boolean;
}): void {
  if (recovering) return;
  if (typeof document === "undefined" || !document.documentElement) return;

  const origin = options?.origin ?? "unknown";
  const message = options?.message ?? "";
  logCrash(origin, message);
  recovering = true;

  const count = bumpCount();
  const hardReset = options?.hard ?? count >= 3;
  const canAuto = count <= MAX_AUTO_RESTARTS;
  plan = { canAuto, hardReset };

  closeOverlay();
  clearOverlayTimers();
  showOverlay(message);

  if (!canAuto) return; // manual mode — anti-infinite-loop protection

  const delay = RESTART_DELAYS_MS[Math.min(count - 1, RESTART_DELAYS_MS.length - 1)];
  restartTimer = window.setTimeout(() => {
    if (hardReset) void deepCleanAndRestart();
    else performRestart();
  }, delay);
  updateOverlay();
}

/**
 * React ErrorBoundary hook: report a render crash into the same recovery
 * pipeline (branded overlay + automatic restart).
 */
export function reportFatal(error: unknown, origin: string): void {
  const message =
    error instanceof Error
      ? `${error.name || "Error"}: ${error.message}`
      : String(error ?? "");
  triggerRecovery({ origin, message });
}

/**
 * Called once the React tree has mounted successfully. Disarms the boot
 * watchdog; safe to call repeatedly (StrictMode double-effects etc.).
 */
export function markAppReady(): void {
  if (bootTimer !== undefined) {
    window.clearTimeout(bootTimer);
    bootTimer = undefined;
  }
  ready = true;
}

/* ------------------------------------------------------------------ */
/* Watchdog layers (installed as a module side-effect)                 */
/* ------------------------------------------------------------------ */

let ready = false;
let lastBeat = Date.now();
let bootTimer: number | undefined;

/** Ignore benign network noise (offline, backend unreachable) — not crashes. */
function looksBenign(message: string): boolean {
  const m = message.toLowerCase();
  if (/resizeobserver/i.test(m)) return true;
  // Chunk/import failures ARE restartable — they usually mean a stale bundle.
  if (/dynamically imported|importing module script|error loading chunk/i.test(m)) return false;
  return /failed to fetch|networkerror|network request failed|load failed|net::|err_connection|timeout|timed out|aborted|websocket|convex|offline|fetch/i.test(m);
}

function installGlobalListeners() {
  try {
    window.addEventListener("error", (event: ErrorEvent) => {
      // Only uncaught runtime exceptions reach the window here (resource
      // load errors do not bubble). Guard against cross-origin "Script error."
      if (!event.message || event.message === "Script error.") return;
      if (looksBenign(event.message)) return;
      const origin = event.filename ? event.filename.split("/").slice(-1)[0] : "runtime";
      triggerRecovery({
        origin: `runtime (${origin})`,
        message: `${event.message}${event.lineno ? ` — سطر ${event.lineno}` : ""}`,
      });
    });

    window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? `${reason.name || "Error"}: ${reason.message}`
          : typeof reason === "string"
            ? reason
            : "";
      if (!message) return;
      if (looksBenign(message)) return;
      triggerRecovery({ origin: "promise", message });
    });
  } catch {
    /* listeners are an enhancement — never crash the boot path */
  }
}

function installBootWatchdog() {
  const check = () => {
    if (ready || recovering) return;
    if (document.visibilityState !== "visible") {
      bootTimer = window.setTimeout(check, 5_000);
      return;
    }
    triggerRecovery({
      origin: "boot",
      message: "لم يكتمل إقلاع المنصة خلال المهلة المحددة.",
    });
  };
  bootTimer = window.setTimeout(check, BOOT_TIMEOUT_MS);
}

function installStallDetector() {
  try {
    const refreshBeat = () => {
      lastBeat = Date.now();
    };

    // Heartbeat: refreshed on every tick the main thread is responsive.
    window.setInterval(refreshBeat, HEARTBEAT_MS);

    // Browsers throttle background tabs — never flag a stall while hidden,
    // and reset the beat the moment the app becomes visible again.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") refreshBeat();
    });
    window.addEventListener("pageshow", refreshBeat);

    // Monitor: if the main thread went silent while visible, restart.
    window.setInterval(() => {
      if (!ready || recovering) return;
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastBeat > STALL_AFTER_MS) {
        triggerRecovery({
          origin: "stall",
          message: "توقف التطبيق عن الاستجابة.",
        });
      }
    }, STALL_CHECK_MS);
  } catch {
    /* best-effort */
  }
}

/* ------------------------------------------------------------------ */
/* Install (module side-effect)                                        */
/* ------------------------------------------------------------------ */

installGlobalListeners();
installBootWatchdog();
installStallDetector();
