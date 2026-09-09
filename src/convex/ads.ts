import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin } from "./auth";
import { api } from "./_generated/api";

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const all = await ctx.db.query("ads").withIndex("by_status").collect();
    return all
      .filter((a) => {
        if (a.status === "paused" || a.status === "draft") return false;
        if (a.status === "active") {
          if (a.endsAt && a.endsAt < now) return false;
          if (a.startsAt && a.startsAt > now) return false;
          return true;
        }
        if (a.status === "scheduled") {
          return a.startsAt !== undefined && a.startsAt <= now && (!a.endsAt || a.endsAt >= now);
        }
        return false;
      })
      .sort((a, b) => b.priority - a.priority);
  },
});

export const listAll = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    return ctx.db.query("ads").order("desc").collect();
  },
});

export const createAd = mutation({
  args: {
    token: v.string(),
    title: v.string(),
    message: v.string(),
    status: v.string(),
    priority: v.number(),
    link: v.optional(v.string()),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    if (!args.title.trim() || !args.message.trim())
      throw new ConvexError("العنوان والرسالة مطلوبان");
    const id = await ctx.db.insert("ads", {
      title: args.title.trim(),
      message: args.message.trim(),
      status: args.status,
      priority: args.priority,
      link: args.link || undefined,
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      createdAt: Date.now(),
    });
    // Auto-publish active ads to the platform channels
    if (args.status === "active") {
      await ctx.scheduler.runAfter(0, api.channels.publishToChannels, {
        kind: "ad",
        itemId: id,
        title: args.title.trim(),
        message: args.message.trim(),
        url: "/",
      });
    }
    return { ok: true };
  },
});

export const updateAd = mutation({
  args: {
    token: v.string(),
    id: v.id("ads"),
    patch: v.object({
      title: v.optional(v.string()),
      message: v.optional(v.string()),
      status: v.optional(v.string()),
      priority: v.optional(v.number()),
      link: v.optional(v.string()),
      startsAt: v.optional(v.number()),
      endsAt: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { token, id, patch }) => {
    await requireAdmin(ctx, token);
    const existing = await ctx.db.get(id);
    if (!existing) throw new ConvexError("الإعلان غير موجود");
    const nextStatus = patch.status ?? existing.status;
    await ctx.db.patch(id, patch);
    // Auto-publish whenever the ad becomes active
    if (nextStatus === "active" && existing.status !== "active") {
      await ctx.scheduler.runAfter(0, api.channels.publishToChannels, {
        kind: "ad",
        itemId: id,
        title: existing.title,
        message: existing.message,
        url: "/",
      });
    }
    return { ok: true };
  },
});

export const deleteAd = mutation({
  args: { token: v.string(), id: v.id("ads") },
  handler: async (ctx, { token, id }) => {
    await requireAdmin(ctx, token);
    await ctx.db.delete(id);
    return { ok: true };
  },
});