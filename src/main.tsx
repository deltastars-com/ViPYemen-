// Self error-detector + auto-restart watchdog. MUST be the first import so its
// listeners are live before any app module evaluates (catches boot crashes too).
import "./lib/autoRecovery";
// Boot polyfills + boot-error overlay + native-SW purge (moved out of
// index.html so the production CSP can be script-src 'self' — no unsafe-inline).
import "./lib/boot";
// 🔐 Anti-copy, anti-scraping, anti-devtools security layer.
import { initSecurity } from "./lib/security";
// 📱 Device compatibility — progressive enhancement for all devices
import { applyDeviceTier } from "./lib/compatibility";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider } from "convex/react";
import { convex } from "./lib/convex";
import { LanguageProvider } from "./lib/i18n";
import { registerServiceWorker } from "./registerSW";
// 🛟 Offline outbox — queued submissions auto-deliver when connectivity returns
import { startOutbox } from "./lib/outbox";
// 🩺 Backend health probe — detects API outage independently of the device
import { startHealthProbe } from "./lib/health";
import "./index.css";
import "@fontsource/cairo/400.css";
import "@fontsource/cairo/600.css";
import "@fontsource/cairo/700.css";
import "@fontsource/cairo/800.css";
import "@fontsource/cairo/900.css";
import App from "./App";

// Initialize security protections (anti-copy, anti-devtools, anti-scraping)
initSecurity();
// Apply device-tier classes to <html> for CSS-based progressive enhancement
applyDeviceTier();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LanguageProvider>
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    </LanguageProvider>
  </StrictMode>
);

registerServiceWorker().catch(() => {
  /* never let SW registration break the app */
});

// Continuity systems: flush the offline outbox + monitor backend health so
// the apps keep accepting work even while the site/backend is unreachable.
try {
  startOutbox();
  startHealthProbe();
} catch {
  /* continuity systems are enhancements — never block boot */
}
