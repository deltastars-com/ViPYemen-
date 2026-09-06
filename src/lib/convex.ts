import { ConvexReactClient } from "convex/react";

export const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL ?? "http://127.0.0.1:3210"
);

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