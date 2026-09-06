import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

export const listAll = query({
  args: { token: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { token, limit }) => {
    await requireAdmin(ctx, token);
    return ctx.db.query("notifications").order("desc").take(limit ?? 200);
  },
});

export const createNotification = mutation({
  args: {
    token: v.string(),
    title: v.string(),
    message: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, { token, title, message, category }) => {
    await requireAdmin(ctx, token);
    await ctx.db.insert("notifications", {
      title: title.trim(),
      message: message.trim(),
      category,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

export const deleteNotification = mutation({
  args: { token: v.string(), id: v.id("notifications") },
  handler: async (ctx, { token, id }) => {
    await requireAdmin(ctx, token);
    await ctx.db.delete(id);
    return { ok: true };
  },
});