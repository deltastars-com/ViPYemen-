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
 * Wire native behaviors that make this a real app, not a web wrapper:
 * 1. Hardware back button: close open panels first, then navigate back,
 *    and only exit the app from the home screen (standard Android UX).
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
    try {
      await capApp.App.addListener("backButton", ({ canGoBack }) => {
        // Close any open UI panels before navigating
        const closer = document.querySelector<HTMLElement>("[data-back-close]");
        if (closer) {
          closer.click();
          return;
        }
        if (canGoBack) {
          window.history.back();
        } else {
          router.navigate("/");
        }
      });
    } catch {
      // back-button handling is an enhancement
    }
  }
}
