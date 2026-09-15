/**
 * Boot module — runs before every other import in main.tsx.
 *
 * Replaces the inline <script> blocks that used to live in index.html so the
 * production CSP can be `script-src 'self'` with no 'unsafe-inline':
 *
 *   1. Polyfills for old Android System WebViews (Chrome <97, Safari <15.4)
 *   2. A visible boot-error overlay (created via DOM APIs — no inline handlers)
 *      shown instead of a blank screen if the app fails to boot
 *   3. A 12s watchdog that surfaces a timeout message if #root stays empty
 *   4. Native-shell guard: inside the Android/iOS WebView the PWA service
 *      worker must never run — it can freeze the WebView with stale caches.
 */

// ── 1. Polyfills ────────────────────────────────────────────────────────
(function () {
  if (!String.prototype.replaceAll) {
    (String.prototype as unknown as { replaceAll?: unknown }).replaceAll = function (
      this: string,
      s: string,
      r: string
    ) {
      return this.split(s).join(r);
    };
  }
  if (!(Array.prototype as unknown as { findLast?: unknown }).findLast) {
    (Array.prototype as unknown as { findLast?: unknown }).findLast = function (
      this: unknown[],
      fn: (item: unknown, index: number, arr: unknown[]) => boolean,
      th?: unknown
    ) {
      for (var i = this.length - 1; i >= 0; i--) {
        if (fn.call(th, this[i], i, this)) return this[i];
      }
      return undefined;
    };
  }
  if (!Object.hasOwn) {
    Object.hasOwn = function (o, k) {
      return Object.prototype.hasOwnProperty.call(o, k);
    };
  }
  if (!window.structuredClone) {
    window.structuredClone = function (v) {
      return JSON.parse(JSON.stringify(v));
    };
  }
  if (!window.crypto.randomUUID && window.crypto && window.crypto.getRandomValues) {
    (window.crypto as unknown as { randomUUID?: unknown }).randomUUID = function () {
      var b = window.crypto.getRandomValues(new Uint8Array(16));
      b[6] = (b[6] & 15) | 64;
      b[8] = (b[8] & 63) | 128;
      var h = [].map
        .call(b, function (x) {
          return ("0" + (x as number).toString(16)).slice(-2);
        })
        .join("");
      return (
        h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20)
      );
    };
  }
})();

// ── 2. Boot-error overlay (created only when needed — keeps the live DOM
//      free of a stray <h2> that would break heading order before the
//      page's real <h1> renders) ─────────────────────────────────────────
let shown = false;
function showBootError(msg: string) {
  if (shown) return;
  shown = true;

  const overlay = document.createElement("div");
  overlay.dir = "rtl";
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "99999",
    background: "#121685",
    color: "#f5efe0",
    fontFamily: "sans-serif",
    padding: "32px",
    textAlign: "center",
  } as CSSStyleDeclaration);

  const inner = document.createElement("div");
  Object.assign(inner.style, { maxWidth: "420px", margin: "18vh auto 0" } as CSSStyleDeclaration);

  const icon = document.createElement("div");
  icon.style.fontSize = "44px";
  icon.textContent = "⚠️";

  const title = document.createElement("h2");
  Object.assign(title.style, { color: "#c9a227", margin: "12px 0" } as CSSStyleDeclaration);
  title.textContent = "تعذّر تشغيل المنصة";

  const body = document.createElement("p");
  Object.assign(body.style, { opacity: ".8", fontSize: "14px", lineHeight: "1.7" } as CSSStyleDeclaration);
  body.textContent = String(msg || "").slice(0, 300);

  const retry = document.createElement("button");
  Object.assign(
    retry.style,
    {
      marginTop: "20px",
      padding: "10px 26px",
      borderRadius: "10px",
      border: "0",
      background: "#c9a227",
      color: "#121685",
      fontWeight: "bold",
      fontSize: "15px",
      cursor: "pointer",
    } as CSSStyleDeclaration
  );
  retry.textContent = "إعادة المحاولة";
  retry.addEventListener("click", function () {
    location.reload();
  });

  inner.append(icon, title, body, retry);
  overlay.append(inner);
  document.body.appendChild(overlay);
}

(window as unknown as { __vipBootError: (m: string) => void }).__vipBootError = showBootError;

window.addEventListener("error", function (e) {
  if (!shown && e && e.message) showBootError("خطأ تحميل: " + e.message);
});

// 12s without app root = failure (backend issues surface inside the app)
setTimeout(function () {
  const r = document.getElementById("root");
  if (r && r.childElementCount === 0) {
    showBootError("انتهت مهلة التشغيل — تحقق من اتصال الإنترنت ثم أعد المحاولة.");
  }
}, 12000);

// ── 3. Native-shell guard: purge any registered service worker + caches
//      inside the Android/iOS WebView. ───────────────────────────────────
(function () {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  const isNative = !!cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform();
  if (isNative && navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
    navigator.serviceWorker
      .getRegistrations()
      .then(function (regs) {
        regs.forEach(function (r) {
          r.unregister();
        });
      })
      .catch(function () {});
    if (window.caches && caches.keys) {
      caches
        .keys()
        .then(function (keys) {
          keys.forEach(function (k) {
            caches.delete(k);
          });
        })
        .catch(function () {});
    }
  }
})();
