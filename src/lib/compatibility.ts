/**
 * 📱 Device Compatibility Layer — ViP Yemen Platform
 *
 * Progressive enhancement for devices from Android 6.0.1+ to latest,
 * iOS 15+ to latest, and all modern browsers.
 *
 * - Detects device capabilities at runtime
 * - Applies graceful degradation for older devices
 * - Ensures core functionality works on ALL supported platforms
 * - Future-proof: new devices get full features automatically
 */

// ── Feature Detection (replaces fragile UA sniffing) ──────────────

/** Service Worker support (PWA) */
export const hasServiceWorker =
  typeof navigator !== "undefined" && "serviceWorker" in navigator;

/** Push notifications */
export const hasPush =
  typeof Notification !== "undefined" && "Notification" in window;

/** Intersection Observer (lazy loading, infinite scroll) */
export const hasIntersectionObserver =
  typeof IntersectionObserver !== "undefined";

/** Web Animations API */
export const hasWebAnimations =
  typeof Element !== "undefined" && "animate" in Element.prototype;

/** CSS backdrop-filter */
export const hasBackdropFilter = (() => {
  if (typeof CSS === "undefined") return false;
  return (
    CSS.supports("backdrop-filter", "blur(1px)") ||
    CSS.supports("-webkit-backdrop-filter", "blur(1px)")
  );
})();

/** CSS container queries */
export const hasContainerQueries =
  typeof CSS !== "undefined" && CSS.supports("container-type", "inline-size");

/** WebP image support */
export const hasWebP = (() => {
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  return canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0;
})();

/** AVIF image support */
export const hasAVIF = (() => {
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  return canvas.toDataURL("image/avif").indexOf("data:image/avif") === 0;
})();

/** Device Memory (RAM estimate, lower = more conservative) */
export const deviceMemory =
  typeof navigator !== "undefined" && "deviceMemory" in navigator
    ? (navigator as any).deviceMemory
    : 4; // assume mid-range if unavailable

/** Hardware concurrency (CPU cores) */
export const cpuCores =
  typeof navigator !== "undefined" && "hardwareConcurrency" in navigator
    ? navigator.hardwareConcurrency
    : 4;

/** Save-Data header (user enabled data saver) */
export const isSaveData =
  typeof navigator !== "undefined" &&
  "connection" in navigator &&
  (navigator as any).connection?.saveData === true;

/** Slow network detection */
export const isSlowNetwork = (() => {
  if (typeof navigator === "undefined" || !("connection" in navigator)) return false;
  const conn = (navigator as any).connection;
  return conn?.effectiveType === "slow-2g" || conn?.effectiveType === "2g";
})();

// ── Device Tier Classification ────────────────────────────────────

export type DeviceTier = "low" | "medium" | "high";

/**
 * Classifies the device into a performance tier.
 * New/future devices always get "high" — no hard-coded upper limits.
 */
export function getDeviceTier(): DeviceTier {
  // Low: 2GB RAM or less, or 2 or fewer cores, or data saver on
  if (deviceMemory <= 2 || cpuCores <= 2 || isSaveData) return "low";

  // Medium: 3-4GB RAM, or moderate CPU, or slow network
  if (deviceMemory <= 4 || cpuCores <= 4 || isSlowNetwork) return "medium";

  // High: everything else (includes future devices automatically)
  return "high";
}

// ── Progressive Enhancement Controller ────────────────────────────

const tier = typeof window !== "undefined" ? getDeviceTier() : "high";

/** Whether to use animated transitions */
export const enableAnimations = tier !== "low" && hasWebAnimations;

/** Whether to use backdrop blur effects */
export const enableBlurEffects = tier === "high" && hasBackdropFilter;

/** Whether to preload images */
export const enableImagePreloading = tier !== "low";

/** Whether to enable infinite scroll (vs pagination) */
export const enableInfiniteScroll =
  tier !== "low" && hasIntersectionObserver;

/** Lazy-load images below the fold */
export const enableLazyLoading = hasIntersectionObserver;

/** Reduced motion: respect user preference OR force on low-tier */
export const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Effective animation setting: disabled if user prefers OR device is low-tier */
export const shouldAnimate = !prefersReducedMotion && enableAnimations;

// ── DOM Utilities ─────────────────────────────────────────────────

/**
 * Apply device-tier class to <html> for CSS-based progressive enhancement.
 * CSS can then use `.tier-low`, `.tier-medium`, `.tier-high`.
 */
export function applyDeviceTier(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.add(`tier-${tier}`);

  if (prefersReducedMotion) root.classList.add("reduced-motion");
  if (isSaveData) root.classList.add("save-data");
  if (isSlowNetwork) root.classList.add("slow-network");
}

/**
 * Dynamically load a polyfill only when the feature is missing.
 * Returns a promise that resolves when the polyfill is ready.
 */
export async function loadPolyfillIfNeeded(
  feature: string,
  url: string
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    // Simple feature check — if feature exists, skip
    const check = new Function(`return typeof ${feature}`);
    if (check()) return;
  } catch {
    // Feature detection failed → load polyfill to be safe
  }

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => resolve(); // don't break the app if polyfill fails
    document.head.appendChild(script);
  });
}

// ── Image Optimization ────────────────────────────────────────────

/**
 * Returns the best supported image format for this device.
 * Used in <img srcset> to serve optimal images.
 */
export function getBestImageFormat(): "avif" | "webp" | "jpg" {
  if (hasAVIF) return "avif";
  if (hasWebP) return "webp";
  return "jpg";
}

/**
 * Get appropriate image quality based on device tier.
 * Low-tier devices get smaller, lighter images.
 */
export function getImageQuality(): number {
  switch (tier) {
    case "low": return 60;
    case "medium": return 75;
    case "high": return 85;
  }
}

// ── Platform Info ─────────────────────────────────────────────────

export interface PlatformInfo {
  isAndroid: boolean;
  isIOS: boolean;
  isMobile: boolean;
  isDesktop: boolean;
  isPWA: boolean;
  androidVersion: number | null;
  iosVersion: number | null;
  platform: string;
}

/**
 * Detect platform info without fragile UA sniffing.
 * Uses modern APIs where available, falls back to UA only for version detection.
 */
export function getPlatformInfo(): PlatformInfo {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return {
      isAndroid: false, isIOS: false, isMobile: false,
      isDesktop: true, isPWA: false, androidVersion: null,
      iosVersion: null, platform: "unknown",
    };
  }

  const ua = navigator.userAgent;
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isMobile = isAndroid || isIOS || /Mobile|webOS|BlackBerry/i.test(ua);
  const isDesktop = !isMobile;

  // PWA detection
  const isPWA =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;

  // Android version from UA (only version, no future hardcoding)
  const androidMatch = ua.match(/Android (\d+(?:\.\d+)?)/);
  const androidVersion = androidMatch ? parseFloat(androidMatch[1]) : null;

  // iOS version from UA
  const iosMatch = ua.match(/OS (\d+(?:_\d+)?)/);
  const iosVersion = iosMatch ? parseFloat(iosMatch[1].replace("_", ".")) : null;

  const platform = isAndroid ? "android" : isIOS ? "ios" : "web";

  return {
    isAndroid, isIOS, isMobile, isDesktop, isPWA,
    androidVersion, iosVersion, platform,
  };
}

// ── Export current tier for use across the app ─────────────────────
export const currentTier: DeviceTier = tier;
