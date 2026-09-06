import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin } from "./auth";

export const listEntries = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    return ctx.db.query("finance").order("desc").collect();
  },
});

export const addEntry = mutation({
  args: {
    token: v.string(),
    type: v.string(),
    amount: v.number(),
    description: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, { token, type, amount, description, category }) => {
    await requireAdmin(ctx, token);
    if (!["income", "expense"].includes(type)) throw new ConvexError("نوع غير صالح");
    if (amount <= 0) throw new ConvexError("المبلغ يجب أن يكون أكبر من صفر");
    await ctx.db.insert("finance", {
      type,
      amount,
      description: description.trim(),
      category,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

export const deleteEntry = mutation({
  args: { token: v.string(), id: v.id("finance") },
  handler: async (ctx, { token, id }) => {
    await requireAdmin(ctx, token);
    await ctx.db.delete(id);
    return { ok: true };
  },
});