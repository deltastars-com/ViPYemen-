import { ConvexReactClient } from "convex/react";

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string | undefined;

// If a production build was produced without the backend URL baked in,
// show the visible boot-error overlay instead of a frozen blank screen.
if (!CONVEX_URL && typeof window !== "undefined") {
  const bootError = (window as unknown as { __vipBootError?: (msg: string) => void })
    .__vipBootError;
  bootError?.("لم يتم ضبط رابط الخادم (VITE_CONVEX_URL) في هذه النسخة — أعد التنزيل من قسم الإصدارات.");
}

export const convex = new ConvexReactClient(CONVEX_URL ?? "http://127.0.0.1:3210");

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
