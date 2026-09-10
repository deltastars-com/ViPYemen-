import { ConvexReactClient } from "convex/react";

/**
 * The backend URL is baked in at build time from VITE_CONVEX_URL.
 * If the variable is missing OR MALFORMED in a given build environment, we
 * fall back to the live production deployment that the release pipeline
 * deploys to — so the dashboard and every section stay fully connected and
 * the app NEVER crashes at boot with an "Invalid deployment address" error
 * (a wrong value in a repo/environment variable must never break the app).
 * The URL is public (it ships in the client bundle on every platform).
 *
 * The app is OFFLINE-FIRST: even if the backend is unreachable the platform
 * still boots fully from its cached copy, and it NEVER blocks on the
 * backend at startup.
 */

/** Known-good live deployment used whenever the env value is missing/invalid. */
export const CONVEX_FALLBACK_URL = "https://notable-shepherd-367.convex.cloud";

/**
 * A valid Convex deployment address is either a hosted URL of the form
 * https://<slug>.convex.cloud|.site or a local dev URL. Anything else
 * (a deploy key, a copied token, a stray string) is rejected so the Convex
 * client can never throw synchronously at boot.
 */
function normalizeConvexUrl(value: string | undefined): string {
  const raw = value?.trim() ?? "";
  if (/^https:\/\/[a-z0-9-]+\.convex\.(cloud|site)$/i.test(raw)) return raw;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(raw)) return raw;
  return CONVEX_FALLBACK_URL;
}

export const CONVEX_URL = normalizeConvexUrl(
  import.meta.env.VITE_CONVEX_URL as string | undefined
);

let convexClient: ConvexReactClient | null = null;
function getConvexClient(): ConvexReactClient {
  if (!convexClient) {
    convexClient = new ConvexReactClient(CONVEX_URL);
  }
  return convexClient;
}

export const convex = getConvexClient();

// Convex deploy key (server-side only — never exposed to the client).
// Used when running `npx convex deploy` in CI or locally.
export const CONVEX_DEPLOY_KEY = (import.meta.env.CONVEX_DEPLOY_KEY as string | undefined)?.trim() || "";

export const ADMIN_TOKEN_KEY = "vip_admin_token";

export function getAdminToken(): string {
  return localStorage.getItem(ADMIN_TOKEN_KEY) ?? "";
}

export function setAdminToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}
