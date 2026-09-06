// Manual PWA service-worker registration.
//
// Strategy (offline-first, works with AND without a backend):
// - Precaches the whole app (all JS/CSS/fonts/icons) at install time, so the
//   full platform loads instantly and works fully offline — even if the web
//   host is unreachable, everything is already on the device.
// - Inside the native Android/iOS app the SW ALSO runs (Capacitor serves from
//   its own local server), giving the same offline guarantee. Stale-cache
//   freezes are prevented because every version gets a distinct cache name
//   and old caches are purged on activate.
// - Backend data (Convex) is network-only: when offline, published pages
//   simply show cached shell + content that was already rendered.
const CACHE_VERSION = "vip-yemen-v5.4.0";

export async function registerServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  try {
    const { registerSW } = await import("virtual:pwa-register");
    registerSW({
      immediate: true,
      onRegisteredSW(_url, registration) {
        // Check for updates every 30 minutes + on regaining focus
        if (registration) {
          setInterval(() => registration.update().catch(() => {}), 30 * 60 * 1000);
          window.addEventListener("focus", () => registration.update().catch(() => {}));
        }
      },
    });
  } catch {
    // PWA is an enhancement — never block boot
  }

  // Purge caches from older app versions (different names)
  try {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k.startsWith("vip-yemen-") && k !== CACHE_VERSION).map((k) => caches.delete(k))
    );
  } catch {
    // best-effort
  }
}
