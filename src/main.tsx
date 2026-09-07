// Self error-detector + auto-restart watchdog. MUST be the first import so its
// listeners are live before any app module evaluates (catches boot crashes too).
import "./lib/autoRecovery";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider } from "convex/react";
import { convex } from "./lib/convex";
import { registerServiceWorker } from "./registerSW";
import "./index.css";
import "@fontsource/cairo/400.css";
import "@fontsource/cairo/600.css";
import "@fontsource/cairo/700.css";
import "@fontsource/cairo/800.css";
import "@fontsource/cairo/900.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </StrictMode>
);

registerServiceWorker().catch(() => {
  /* never let SW registration break the app */
});
