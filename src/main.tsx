// Self error-detector + auto-restart watchdog. MUST be the first import so its
// listeners are live before any app module evaluates (catches boot crashes too).
import "./lib/autoRecovery";
// Boot polyfills + boot-error overlay + native-SW purge (moved out of
// index.html so the production CSP can be script-src 'self' — no unsafe-inline).
import "./lib/boot";
// 🔐 Anti-copy, anti-scraping, anti-devtools security layer.
import { initSecurity } from "./lib/security";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider } from "convex/react";
import { convex } from "./lib/convex";
import { LanguageProvider } from "./lib/i18n";
import { registerServiceWorker } from "./registerSW";
import "./index.css";
import "@fontsource/cairo/400.css";
import "@fontsource/cairo/600.css";
import "@fontsource/cairo/700.css";
import "@fontsource/cairo/800.css";
import "@fontsource/cairo/900.css";
import App from "./App";

// Initialize security protections (anti-copy, anti-devtools, anti-scraping)
initSecurity();

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
