/**
 * Native shell — Android/iOS integration.
 *
 * Bundle-size note: on the web, none of the Capacitor packages are needed.
 * Native apps inject `window.Capacitor` into the WebView *before* any JS
 * runs, so we detect the platform through the window object instead of a
 * static import — keeping @capacitor/core, @capacitor/app and
 * @capacitor/status-bar out of the web entry bundle (PageSpeed: unused JS).
 * Inside native builds the plugins are dynamically imported on demand.
 */

/** True inside the native Android/iOS app (not a plain browser). */
export function isNativeApp(): boolean {
  const cap = (window as unknown as {
    Capacitor?: { isNativePlatform?: () => boolean };
  }).Capacitor;
  return typeof cap?.isNativePlatform === "function" && cap.isNativePlatform();
}

/**
 * Show a transient "press back again to exit" toast (native UX standard).
 * Text follows the active UI language.
 */
export function showExitToast() {
  const isArabic = document.documentElement.lang !== "en";
  let toast = document.getElementById("vipyemen-exit-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "vipyemen-exit-toast";
    Object.assign(toast.style, {
      position: "fixed",
      bottom: "96px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: "100000",
      padding: "10px 20px",
      borderRadius: "12px",
      background: "rgba(10,14,26,0.95)",
      color: "#f5d67b",
      fontSize: "13px",
      fontWeight: "700",
      border: "1px solid rgba(245,214,123,0.35)",
      boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
      pointerEvents: "none",
      transition: "opacity 0.25s",
      opacity: "0",
    });
    document.body.appendChild(toast);
  }
  toast.textContent = isArabic
    ? "اضغط رجوع مرة أخرى للخروج من التطبيق"
    : "Press back again to exit the app";
  toast.style.opacity = "1";
  window.setTimeout(() => {
    if (toast) toast.style.opacity = "0";
  }, 2000);
}

/**
 * Wire native behaviors that make this a real app, not a web wrapper:
 * 1. Hardware back button: close open panels first, then navigate back;
 *    at the app root, a double press within 2s exits the app (standard
 *    Android UX) with a confirmation toast.
 * 2. Status bar: navy background with light content, matching the brand.
 */
export async function initNativeShell(router: { navigate: (to: string) => void }) {
  if (!isNativeApp()) return;

  // Load the Capacitor runtime + plugins only where they actually run.
  const [{ Capacitor }, capApp, capStatusBar] = await Promise.all([
    import("@capacitor/core"),
    import("@capacitor/app").catch(() => null),
    import("@capacitor/status-bar").catch(() => null),
  ]);
  void Capacitor; // runtime now registered for plugin imports below

  // --- Status bar ---
  if (capStatusBar) {
    try {
      await capStatusBar.StatusBar.setStyle({ style: capStatusBar.Style.Dark });
      await capStatusBar.StatusBar.setBackgroundColor({ color: "#0a0e1a" });
      await capStatusBar.StatusBar.show();
    } catch {
      // status bar styling is cosmetic — ignore unsupported platforms
    }
  }

  // --- Hardware back button ---
  if (capApp) {
    let lastBackAt = 0;
    try {
      await capApp.App.addListener("backButton", async ({ canGoBack }) => {
        // Close any open UI panels before navigating
        const closer = document.querySelector<HTMLElement>("[data-back-close]");
        if (closer) {
          closer.click();
          return;
        }
        if (canGoBack) {
          window.history.back();
          return;
        }
        // At the root: require a second press within 2s to exit.
        const now = Date.now();
        if (now - lastBackAt < 2000) {
          try {
            await capApp.App.exitApp();
          } catch {
            router.navigate("/");
          }
        } else {
          lastBackAt = now;
          showExitToast();
        }
      });
    } catch {
      // back-button handling is an enhancement
    }
  }
}
