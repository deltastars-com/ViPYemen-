/**
 * Exit utility — closes the app/session professionally.
 *
 * Native (Android/iOS via Capacitor): calls App.exitApp() which truly
 * terminates the WebView activity, exactly like every store app.
 * Web/PWA: shows a full-screen farewell overlay (so the user visibly
 * "exits"), then clears session state — history entry is replaced so
 * Back returns to the home screen, not back into the session.
 */
import { isNativeApp } from "@/lib/native";
import { clearAdminToken } from "@/lib/convex";

export function exitApp(): void {
  // 1. End any admin session.
  try {
    clearAdminToken();
  } catch {
    // no session — ignore
  }

  // 2. Native apps: real process exit.
  if (isNativeApp()) {
    import("@capacitor/app")
      .then(({ App }) => App.exitApp())
      .catch(() => {
        // Plugin unavailable — fall through to web exit path below.
        window.location.replace("/");
      });
    return;
  }

  // 3. Web/PWA: replace history so Back can't re-enter the session, and
  //    dispatch an event the App shell listens for to show the farewell screen.
  try {
    window.history.replaceState(null, "", "/");
    window.dispatchEvent(new CustomEvent("vipyemen:exit"));
  } catch {
    window.location.replace("/");
  }
}
