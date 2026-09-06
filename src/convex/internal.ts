import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { randomCode, sha256Hex } from "./auth";

export const createPasswordReset = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email.trim().toLowerCase()))
      .first();
    if (!user) throw new ConvexError("لا يوجد حساب بهذا البريد");
    const code = randomCode(6);
    await ctx.db.insert("passwordResets", {
      email: user.email,
      codeHash: await sha256Hex(code),
      expiresAt: Date.now() + 30 * 60 * 1000,
      used: false,
    });
    return { email: user.email, code };
  },
});