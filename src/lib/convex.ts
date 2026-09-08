import { ConvexReactClient } from "convex/react";

/**
 * The backend URL is baked in at build time from VITE_CONVEX_URL.
 * The app is OFFLINE-FIRST: if the URL is missing (or the backend is
 * unreachable) the platform still boots fully from its cached copy —
 * published content loads whenever a connection is available, and the
 * app NEVER blocks on the backend at startup.
 */
export const CONVEX_URL = (import.meta.env.VITE_CONVEX_URL as string | undefined)?.trim() || "";

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
