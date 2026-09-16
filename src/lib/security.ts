/**
 * 🔐 ViP Yemen — Advanced Security Layer (channel-safe)
 *
 * Protects the platform against scraping, casual copying, and devtools
 * extraction — WITHOUT ever interfering with:
 *
 * ✅ The automatic channel publishing pipeline (Convex server → Telegram Bot
 *    API / Facebook Graph API) — it runs server-side and is fully isolated
 *    from this client-side layer.
 * ✅ Link preview crawlers from the platform's channels (TelegramBot,
 *    facebookexternalhit, WhatsApp, Twitterbot…) — they must fetch pages
 *    so posts published by the bot show rich previews in the channel.
 * ✅ SEO crawlers (Googlebot, Bingbot…) so the platform stays indexed.
 * ✅ Users arriving from Telegram/WhatsApp/Facebook in-app browsers — no
 *    false "devtools detected" warnings on mobile.
 * ✅ The payment flow (copy account-number buttons keep working).
 *
 * Note: No client-side protection is 100% unbreakable — this layer raises
 * the barrier significantly against casual copying and scraping tools.
 */

/** Enable all security protections. Call once at app boot. */
export function initSecurity(): void {
  if (typeof window === "undefined") return;

  // Only apply in production builds
  const isProd = import.meta.env?.PROD ?? true;

  // Never touch the page for search-engine / channel-preview crawlers:
  // they must read the real content for SEO and for rich link previews
  // in the platform's Telegram / Facebook / WhatsApp posts.
  if (isSeoOrPreviewCrawler()) return;

  blockContextMenu();
  blockKeyboardShortcuts();
  blockTextSelection();
  blockDragAndDrop();
  blockViewSource();
  blockIframeEmbedding();

  // DevTools heuristics only make sense on desktop browsers. On mobile and
  // inside Telegram/WhatsApp/Facebook in-app WebViews the outer/inner size
  // gap (keyboard, toolbars, zoom) produces false positives that would
  // wrongly warn channel users — skip entirely there.
  if (isProd && isDesktopBrowser()) {
    watchDevTools();
  }
}

/* ────────────────────────────────────────────────────────────────────────
 * Crawler classification
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * crawlers that MUST see the real page:
 * - search engines (SEO)
 * - link-preview bots for the platform's channels (when the Telegram bot
 *   or Facebook page/group publishes a platform link, these fetch it to
 *   render the preview card — blocking them breaks the channel posts)
 */
function isSeoOrPreviewCrawler(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  const allowed = [
    // Search engines (SEO)
    "googlebot",
    "bingbot",
    "yandexbot",
    "yandex.com/bots",
    "duckduckbot",
    "baiduspider",
    "sogou",
    "applebot",
    "mojeekbot",
    // Channel link previews — critical for auto-published posts
    "telegrambot",
    "facebookexternalhit",
    "facebookcatalog",
    "whatsapp",
    "twitterbot",
    "slackbot",
    "discordbot",
    "linkedinbot",
    "embedly",
    "vkshare",
    "snapchat",
    "quora link preview",
    // Accessibility / translation
    "google translate",
    "baidutranslator",
  ];
  return allowed.some((p) => ua.includes(p));
}

/**
 * True on desktop-class browsers only. In-app WebViews (Telegram, WhatsApp,
 * Facebook, Instagram) and mobile browsers are excluded so the devtools
 * heuristic never fires for channel users on their phones.
 */
function isDesktopBrowser(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  const mobileUa =
    /android|iphone|ipad|ipod|opera mini|iemobile|mobile|fban|fbav|fbios|igav|instagram|telegram|whatsapp|line\/|snapchat|tiktok/.test(
      ua
    );
  const coarsePointer =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  return !mobileUa && !coarsePointer;
}

/* ────────────────────────────────────────────────────────────────────────
 * Interaction guards
 * ──────────────────────────────────────────────────────────────────────── */

/** Block right-click context menu */
function blockContextMenu(): void {
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });
}

/** Block keyboard shortcuts that open DevTools or save the page (desktop) */
function blockKeyboardShortcuts(): void {
  document.addEventListener("keydown", (e) => {
    // F12 — DevTools
    if (e.key === "F12") {
      e.preventDefault();
      return;
    }

    // Ctrl+Shift+I / J / C — DevTools / console / inspect
    if (
      e.ctrlKey &&
      e.shiftKey &&
      (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" ||
        e.key === "C" || e.key === "c")
    ) {
      e.preventDefault();
      return;
    }

    // Ctrl+U — view-source
    if (e.ctrlKey && (e.key === "U" || e.key === "u")) {
      e.preventDefault();
      return;
    }

    // Ctrl+S — save page. Keep Ctrl+C working everywhere (users must be able
    // to copy the payment account numbers!).
    if (e.ctrlKey && (e.key === "S" || e.key === "s")) {
      e.preventDefault();
      return;
    }
  });
}

/** Disable text selection outside of inputs/textareas (forms stay usable) */
function blockTextSelection(): void {
  document.addEventListener("selectstart", (e) => {
    const target = e.target as HTMLElement;
    const tag = target?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea" || target?.isContentEditable) {
      return;
    }
    e.preventDefault();
  });
}

/** Block drag and drop of content (images / text) */
function blockDragAndDrop(): void {
  document.addEventListener("dragstart", (e) => {
    e.preventDefault();
  });
}

/** Block view-source: protocol */
function blockViewSource(): void {
  const originalOpen = window.open;
  window.open = function (
    url?: string | URL,
    target?: string,
    features?: string
  ): Window | null {
    const urlStr = typeof url === "string" ? url : (url?.toString() ?? "");
    if (urlStr.startsWith("view-source:")) {
      return null;
    }
    return originalOpen.call(window, url, target, features);
  };
}

/** Prevent the page from being framed by other sites (clickjacking) */
function blockIframeEmbedding(): void {
  if (window.self !== window.top) {
    try {
      (window.top as Window).location.href = window.location.href;
    } catch {
      // Cross-origin frame — X-Frame-Options header handles it server-side.
    }
  }
}

/* ────────────────────────────────────────────────────────────────────────
 * DevTools heuristic (desktop only)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Watch for a docked devtools panel via the outer/inner size gap.
 * Non-blocking: shows a brief warning overlay, never disables the app.
 */
function watchDevTools(): void {
  let warned = false;
  const threshold = 200; // generous — avoids false positives on zoom

  function check() {
    const widthGap = window.outerWidth - window.innerWidth;
    const heightGap = window.outerHeight - window.innerHeight;
    const suspicious = widthGap > threshold || heightGap > threshold;
    if (suspicious && !warned) {
      warned = true;
      showDevToolsWarning();
      window.setTimeout(() => {
        warned = false;
      }, 60_000); // at most one warning per minute
    }
  }

  window.setInterval(check, 2000);
  window.addEventListener("resize", check);
}

function showDevToolsWarning(): void {
  const overlay = document.createElement("div");
  overlay.id = "vipyemen-security-warning";
  overlay.setAttribute("role", "alert");
  overlay.innerHTML = `
    <div style="
      position:fixed;inset:0;z-index:999999;
      background:rgba(10,14,26,0.97);
      display:flex;align-items:center;justify-content:center;
      font-family:'Cairo',sans-serif;text-align:center;
      direction:rtl;padding:2rem;
    ">
      <div style="max-width:420px;">
        <div style="font-size:3rem;margin-bottom:1rem;">🔒</div>
        <h2 style="color:#f5d67b;font-size:1.3rem;font-weight:900;margin-bottom:0.8rem;">
          تم كشف فتح أدوات المطور
        </h2>
        <p style="color:#9ba3e5;font-size:0.85rem;line-height:1.7;">
          منصة ViP Yemen محمية بموجب سياسة حماية الملكية الفكرية.
          يُمنع استخراج المحتوى أو الكود المصدري.
        </p>
        <p style="color:#545dba;font-size:0.75rem;margin-top:1rem;">
          © 2026 ViP Yemen — جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  window.setTimeout(() => overlay.remove(), 4000);
}
