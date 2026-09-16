/**
 * 🔐 ViP Yemen — Advanced Security Layer
 *
 * Protects the platform against:
 * - Right-click context menu (copy, inspect)
 * - Keyboard shortcuts for DevTools (F12, Ctrl+Shift+I/J/C)
 * - View-source attempts
 * - Screenshot/print-screen (best effort)
 * - Text selection and drag (configurable)
 * - Console access attempts (via DevTools detection)
 * - Automated scraping and bot access
 * - AI model training data extraction
 *
 * Note: No client-side protection is 100% unbreakable — determined users
 * can always bypass browser restrictions. This layer raises the barrier
 * significantly and deters casual copying and automated scraping.
 */

/** Enable all security protections. Call once at app boot. */
export function initSecurity(): void {
  if (typeof window === "undefined") return;

  // Only apply in production builds
  const isProd = import.meta.env?.PROD ?? true;

  blockContextMenu();
  blockKeyboardShortcuts();
  blockTextSelection();
  blockDragAndDrop();
  blockPrintScreen();
  blockViewSource();
  blockIframeEmbedding();
  if (isProd) {
    blockDevTools();
  }
  blockBots();
}

/** Block right-click context menu */
function blockContextMenu(): void {
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });
}

/** Block keyboard shortcuts that open DevTools or copy content */
function blockKeyboardShortcuts(): void {
  document.addEventListener("keydown", (e) => {
    // F12 — DevTools
    if (e.key === "F12") {
      e.preventDefault();
      return;
    }

    // Ctrl+Shift+I — DevTools
    if (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i")) {
      e.preventDefault();
      return;
    }

    // Ctrl+Shift+J — Console
    if (e.ctrlKey && e.shiftKey && (e.key === "J" || e.key === "j")) {
      e.preventDefault();
      return;
    }

    // Ctrl+Shift+C — Inspect element
    if (e.ctrlKey && e.shiftKey && (e.key === "C" || e.key === "c")) {
      e.preventDefault();
      return;
    }

    // Ctrl+U — View source
    if (e.ctrlKey && (e.key === "U" || e.key === "u")) {
      e.preventDefault();
      return;
    }

    // Ctrl+S — Save page
    if (e.ctrlKey && (e.key === "S" || e.key === "s")) {
      e.preventDefault();
      return;
    }
  });
}

/** Disable text selection (configurable — can be toggled off for forms) */
function blockTextSelection(): void {
  document.addEventListener("selectstart", (e) => {
    const target = e.target as HTMLElement;
    // Allow selection in form inputs and text areas
    const tag = target.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea" || target.isContentEditable) {
      return;
    }
    e.preventDefault();
  });
}

/** Block drag and drop of content */
function blockDragAndDrop(): void {
  document.addEventListener("dragstart", (e) => {
    e.preventDefault();
  });
}

/** Block print-screen (best effort — covers some browsers) */
function blockPrintScreen(): void {
  document.addEventListener("keyup", (e) => {
    if (e.key === "PrintScreen") {
      // Attempt to clear clipboard
      navigator.clipboard?.writeText("").catch(() => {});
    }
  });
}

/** Block view-source: protocol */
function blockViewSource(): void {
  // Override window.open to catch view-source: attempts
  const originalOpen = window.open;
  window.open = function (
    url?: string | URL,
    target?: string,
    features?: string
  ): Window | null {
    const urlStr = typeof url === "string" ? url : url?.toString() ?? "";
    if (urlStr.startsWith("view-source:")) {
      return null;
    }
    return originalOpen.call(window, url, target, features);
  };
}

/** Prevent the page from being embedded in iframes (clickjacking protection) */
function blockIframeEmbedding(): void {
  // Only block if not already in an iframe (allow legitimate embeds)
  if (window.self !== window.top) {
    // We're in an iframe — try to break out
    try {
      (window.top as Window).location.href = window.location.href;
    } catch {
      // Cross-origin iframe — can't break out, but the X-Frame-Options
      // header should have prevented this
    }
  }
}

/**
 * Detect DevTools open via window size discrepancy.
 * When DevTools is open as a separate window, the browser window
 * becomes narrower than expected. This is a heuristic, not bulletproof.
 */
function blockDevTools(): void {
  let devToolsOpen = false;

  const threshold = 160;

  function check() {
    const widthThreshold =
      window.outerWidth - window.innerWidth > threshold;
    const heightThreshold =
      window.outerHeight - window.innerHeight > threshold;

    if (widthThreshold || heightThreshold) {
      if (!devToolsOpen) {
        devToolsOpen = true;
        onDevToolsOpen();
      }
    } else {
      devToolsOpen = false;
    }
  }

  setInterval(check, 1000);
  window.addEventListener("resize", check);
}

function onDevToolsOpen(): void {
  // Show a warning overlay
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
          يُمنع الوصول لأدوات المطور واستخراج المحتوى أو الكود المصدري.
        </p>
        <p style="color:#545dba;font-size:0.75rem;margin-top:1rem;">
          © 2026 ViP Yemen — جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Remove after 5 seconds
  setTimeout(() => {
    overlay.remove();
  }, 5000);
}

/**
 * Block common bot and scraping user-agents.
 * This is a soft block — bots that ignore robots.txt won't be stopped
 * by this, but it adds an extra layer of deterrence.
 */
function blockBots(): void {
  const ua = navigator.userAgent.toLowerCase();
  const botPatterns = [
    "bot", "crawler", "spider", "scraper", "wget", "curl",
    "python-requests", "go-http-client", "java/",
    "headless", "phantom", "selenium", "puppeteer",
  ];

  const isBot = botPatterns.some((pattern) => ua.includes(pattern));

  if (isBot) {
    // Redirect to a blank page for detected bots
    document.documentElement.innerHTML = `
      <head><title>Access Denied</title></head>
      <body style="background:#121685;color:#f5d67b;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;">
        <div>
          <h1>Access Denied</h1>
          <p>Automated access to this platform is not permitted.</p>
        </div>
      </body>
    `;
  }
}
