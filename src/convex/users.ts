import { action, mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import {
  ADMIN_EMAIL,
  DEFAULT_PASSWORD,
  createSession,
  hashPassword,
  newSalt,
  requireAdmin,
  sha256Hex,
} from "./auth";
import { api, internal } from "./_generated/api";

export const adminExists = query({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", ADMIN_EMAIL))
      .first();
    return !!user;
  },
});

export const seedAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", ADMIN_EMAIL))
      .first();
    if (existing) return { ok: false, reason: "exists" };
    const salt = newSalt();
    await ctx.db.insert("users", {
      email: ADMIN_EMAIL,
      name: "إدارة منصة ViP Yemen",
      passwordSalt: salt,
      passwordHash: await hashPassword(DEFAULT_PASSWORD, salt),
      role: "admin",
      mustChangePassword: true,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

async function recordFailedLogin(ctx: MutationCtx, email: string) {
  const existing = await ctx.db
    .query("loginAttempts")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();
  const now = Date.now();
  if (!existing) {
    await ctx.db.insert("loginAttempts", {
      email,
      count: 1,
      updatedAt: now,
    });
    return;
  }
  const count = existing.lockedUntil && existing.lockedUntil > now ? existing.count + 1 : 1;
  const lockedUntil =
    count >= MAX_LOGIN_ATTEMPTS ? now + LOCKOUT_MS : existing.lockedUntil && existing.lockedUntil > now ? existing.lockedUntil : undefined;
  await ctx.db.patch(existing._id, { count, lockedUntil, updatedAt: now });
}

async function clearLoginAttempts(ctx: MutationCtx, email: string) {
  const existing = await ctx.db
    .query("loginAttempts")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();
  if (existing) await ctx.db.delete(existing._id);
}

function getAttemptLockMinutes(attempt: { count: number; lockedUntil?: number }): number {
  if (!attempt.lockedUntil) return 0;
  return Math.max(1, Math.ceil((attempt.lockedUntil - Date.now()) / 60000));
}

export const login = mutation({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, { email, password }) => {
    const normalized = email.trim().toLowerCase();
    const now = Date.now();

    // Rate limiting: lock after 5 failed attempts for 15 minutes
    const attempt = await ctx.db
      .query("loginAttempts")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .first();
    if (attempt && attempt.lockedUntil && attempt.lockedUntil > now) {
      const minutes = getAttemptLockMinutes(attempt);
      throw new ConvexError(
        `تم تأمين الحساب مؤقتاً بسبب محاولات متكررة — حاول بعد ${minutes} دقيقة`
      );
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .first();
    if (!user) {
      await recordFailedLogin(ctx, normalized);
      throw new ConvexError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
    }
    const hash = await hashPassword(password, user.passwordSalt);
    if (hash !== user.passwordHash) {
      await recordFailedLogin(ctx, normalized);
      throw new ConvexError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
    }
    await clearLoginAttempts(ctx, normalized);
    const { token } = await createSession(ctx, user._id);
    await ctx.db.patch(user._id, { lastLoginAt: now });
    return {
      token,
      name: user.name,
      email: user.email,
      mustChangePassword: user.mustChangePassword,
    };
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const tokenHash = await sha256Hex(token);
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("tokenHash", tokenHash))
      .first();
    if (session) await ctx.db.delete(session._id);
  },
});

export const getSession = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (!token) return null;
    const tokenHash = await sha256Hex(token);
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("tokenHash", tokenHash))
      .first();
    if (!session || session.expiresAt < Date.now()) return null;
    const user = await ctx.db.get(session.userId);
    if (!user) return null;
    return {
      name: user.name,
      email: user.email,
      mustChangePassword: user.mustChangePassword,
    };
  },
});

export const changePassword = mutation({
  args: {
    token: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, { token, currentPassword, newPassword }) => {
    if (newPassword.length < 8) {
      throw new ConvexError("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل");
    }
    const user = await requireAdmin(ctx, token);
    const hash = await hashPassword(currentPassword, user.passwordSalt);
    if (hash !== user.passwordHash) {
      throw new ConvexError("كلمة المرور الحالية غير صحيحة");
    }
    const salt = newSalt();
    await ctx.db.patch(user._id, {
      passwordSalt: salt,
      passwordHash: await hashPassword(newPassword, salt),
      mustChangePassword: false,
    });
    return { ok: true };
  },
});

export const requestPasswordReset = action({
  args: { email: v.string() },
  handler: async (
    ctx,
    { email }
  ): Promise<{ delivered: boolean; devCode: string | null }> => {
    const { email: to, code } = await ctx.runMutation(
      internal.internal.createPasswordReset,
      { email }
    );
    let delivered = false;
    try {
      const res = await ctx.runAction(api.email.sendEmail, {
        to,
        subject: "استعادة كلمة مرور لوحة تحكم ViP Yemen",
        html: `
          <div dir="rtl" style="font-family: Tahoma, Arial; background:#0a0e1a; color:#f5f0e1; padding:32px; border-radius:16px; max-width:520px">
            <h2 style="color:#d4af37; margin:0 0 12px">ViP Yemen</h2>
            <p>رمز استعادة كلمة المرور الخاص بك:</p>
            <p style="font-size:28px; font-weight:bold; letter-spacing:6px; color:#d4af37; background:#141a2e; padding:12px; border-radius:10px; text-align:center">${code}</p>
            <p>الرمز صالح لمدة 30 دقيقة. إن لم تطلب ذلك، تجاهل هذه الرسالة.</p>
          </div>
        `,
      });
      delivered = res.ok;
    } catch {
      delivered = false;
    }
    return { delivered, devCode: delivered ? null : code };
  },
});

export const resetPassword = mutation({
  args: {
    email: v.string(),
    code: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, { email, code, newPassword }) => {
    if (newPassword.length < 8) {
      throw new ConvexError("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل");
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email.trim().toLowerCase()))
      .first();
    if (!user) throw new ConvexError("لا يوجد حساب بهذا البريد");
    const codeHash = await sha256Hex(code.trim());
    const resets = await ctx.db
      .query("passwordResets")
      .withIndex("by_email", (q) => q.eq("email", user.email))
      .order("desc")
      .take(5);
    const match = resets.find(
      (r) => !r.used && r.expiresAt > Date.now() && r.codeHash === codeHash
    );
    if (!match) throw new ConvexError("الرمز غير صحيح أو منتهي الصلاحية");
    const salt = newSalt();
    await ctx.db.patch(user._id, {
      passwordSalt: salt,
      passwordHash: await hashPassword(newPassword, salt),
      mustChangePassword: false,
    });
    await ctx.db.patch(match._id, { used: true });
    return { ok: true };
  },
});