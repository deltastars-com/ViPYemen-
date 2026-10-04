import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin } from "./auth";
import { api } from "./_generated/api";
import { computeExpiry, isExpired } from "./platformExpiry";

/** ⏳ المدة المسموحة: 0 (دائم) … 365 يوماً. */
function assertDuration(days: number | undefined): void {
  if (days === undefined) return;
  if (!Number.isFinite(days) || days < 0 || days > 365) {
    throw new ConvexError("مدة الظهور يجب أن تكون بين 0 (دائم) و 365 يوماً");
  }
}

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
          // ⏳ انتهت مدة الظهور التي حددتها الإدارة ⟵ يختفي من الواجهة فوراً
          if (isExpired(a.platformExpiresAt, now)) return false;
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
    /** ⏳ مدة ظهور الإعلان على واجهة المنصة فقط (أيام) — 0 = دائم */
    platformVisibleDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    if (!args.title.trim() || !args.message.trim())
      throw new ConvexError("العنوان والرسالة مطلوبان");
    assertDuration(args.platformVisibleDays);
    const id = await ctx.db.insert("ads", {
      title: args.title.trim(),
      message: args.message.trim(),
      status: args.status,
      priority: args.priority,
      link: args.link || undefined,
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      platformVisibleDays: args.platformVisibleDays,
      platformExpiresAt: computeExpiry(args.platformVisibleDays),
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
      platformVisibleDays: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { token, id, patch }) => {
    await requireAdmin(ctx, token);
    const existing = await ctx.db.get(id);
    if (!existing) throw new ConvexError("الإعلان غير موجود");
    const nextStatus = patch.status ?? existing.status;
    await ctx.db.patch(id, {
      ...patch,
      // ⏳ تغيير المدة يعيد حساب وقت الانتهاء من الآن
      ...(patch.platformVisibleDays !== undefined
        ? {
            platformVisibleDays: patch.platformVisibleDays,
            platformExpiresAt: computeExpiry(patch.platformVisibleDays),
          }
        : {}),
    });
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