// Manual PWA service-worker registration.
// - Inside the native Android/iOS app (Capacitor) the SW must NEVER run:
//   stale Workbox caches can freeze the WebView into a blank screen.
// - On the web/PWA we register with auto-update so users always get the
//   newest version on their next visit.
import { Capacitor } from "@capacitor/core";

export async function registerServiceWorker(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    // Defensive purge: unregister any SW that a previous install may have
    // registered and delete its caches, then bail out.
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      // best-effort cleanup — never block boot
    }
    return;
  }

  if (!("serviceWorker" in navigator)) return;

  try {
    const { registerSW } = await import("virtual:pwa-register");
    registerSW({ immediate: true });
  } catch {
    // PWA registration is an enhancement — ignore failures
  }
}
