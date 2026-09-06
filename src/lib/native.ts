import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";

/** True inside the native Android/iOS app (not a plain browser). */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Wire native behaviors that make this a real app, not a web wrapper:
 * 1. Hardware back button: close open panels first, then navigate back,
 *    and only exit the app from the home screen (standard Android UX).
 * 2. Status bar: navy background with light content, matching the brand.
 */
export async function initNativeShell(router: { navigate: (to: string) => void }) {
  if (!isNativeApp()) return;

  // --- Status bar ---
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#0a0e1a" });
    await StatusBar.show();
  } catch {
    // status bar styling is cosmetic — ignore unsupported platforms
  }

  // --- Hardware back button ---
  try {
    await CapApp.addListener("backButton", ({ canGoBack }) => {
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
