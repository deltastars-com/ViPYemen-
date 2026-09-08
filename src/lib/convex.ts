import { ConvexReactClient } from "convex/react";

/**
 * The backend URL is baked in at build time from VITE_CONVEX_URL.
 * If the variable is not set in a given build environment (for example
 * Vercel before the env var is added), we fall back to the live production
 * deployment that the release pipeline deploys to — so the dashboard and
 * every section stay fully connected and the preview-mode banner never
 * appears on a deployed build. The URL is public (it ships in the client
 * bundle on every platform).
 *
 * The app is OFFLINE-FIRST: even if the backend is unreachable the platform
 * still boots fully from its cached copy, and it NEVER blocks on the
 * backend at startup.
 */
export const CONVEX_URL =
  (import.meta.env.VITE_CONVEX_URL as string | undefined)?.trim() ||
  "https://notable-shepherd-367.convex.cloud";

export const convex = new ConvexReactClient(
  CONVEX_URL || "http://127.0.0.1:3210"
);

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
