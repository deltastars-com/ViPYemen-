import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";

export const ADMIN_EMAIL = "vipservicesyemen@gmail.com";
// كلمة مرور التهيئة الأولى لا تُخزَّن في الكود — تُضبط كمتغير بيئة في Convex:
//   bunx convex env set ADMIN_INITIAL_PASSWORD '...'
// أو تُدار من «الخزنة» داخل لوحة التحكم. التهيئة تفشل بوضوح إن لم تُضبط.
const BOOTSTRAP_PASSWORD_ENV = "ADMIN_INITIAL_PASSWORD";
const PBKDF2_ITERATIONS = 120_000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const enc = new TextEncoder();

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function newSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function randomCode(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b % 10)
    .join("");
}

export function isValidYemeniPhone(phone: string): boolean {
  const normalized = phone.replace(/[\s\-()]/g, "");
  return /^(\+?967|00967|0)?7\d{8}$/.test(normalized);
}

export function normalizePhone(phone: string): string {
  let p = phone.replace(/[\s\-()]/g, "");
  if (p.startsWith("00967")) p = "967" + p.slice(5);
  if (p.startsWith("+967")) p = "967" + p.slice(4);
  if (p.startsWith("0")) p = "967" + p.slice(1);
  return p;
}

export async function createSession(ctx: MutationCtx, userId: string): Promise<{ token: string }> {
  const token = randomToken();
  await ctx.db.insert("sessions", {
    tokenHash: await sha256Hex(token),
    userId: userId as any,
    expiresAt: Date.now() + SESSION_TTL_MS,
    createdAt: Date.now(),
  });
  return { token };
}

export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
  token: string | undefined
) {
  if (!token) throw new ConvexError("غير مصرح: يلزم تسجيل الدخول");
  const tokenHash = await sha256Hex(token);
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("tokenHash", tokenHash))
    .first();
  if (!session || session.expiresAt < Date.now()) {
    throw new ConvexError("انتهت الجلسة، سجّل الدخول من جديد");
  }
  const user = await ctx.db.get(session.userId);
  if (!user || user.role !== "admin") {
    throw new ConvexError("غير مصرح: صلاحيات غير كافية");
  }
  return user;
}