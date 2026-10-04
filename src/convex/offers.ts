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

export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("offers")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc")
      .collect();
    // ⏳ ما انتهت مدته يختفي فوراً من واجهة المنصة (نسخته في القنوات تبقى)
    return rows
      .filter((r) => !isExpired(r.platformExpiresAt))
      .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
  },
});

export const listAll = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    return ctx.db.query("offers").order("desc").collect();
  },
});

export const createOffer = mutation({
  args: {
    token: v.string(),
    title: v.string(),
    description: v.string(),
    imageUrl: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    originalPrice: v.optional(v.number()),
    offerPrice: v.optional(v.number()),
    discountPercent: v.optional(v.number()),
    isFeatured: v.boolean(),
    status: v.string(),
    /** ⏳ مدة ظهور العرض على واجهة المنصة فقط (أيام) — 0 = دائم */
    platformVisibleDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    if (!args.title.trim()) throw new ConvexError("عنوان العرض مطلوب");
    assertDuration(args.platformVisibleDays);
    const id = await ctx.db.insert("offers", {
      title: args.title.trim(),
      description: args.description.trim(),
      imageUrl: args.imageUrl || undefined,
      videoUrl: args.videoUrl || undefined,
      originalPrice: args.originalPrice,
      offerPrice: args.offerPrice,
      discountPercent: args.discountPercent,
      isFeatured: args.isFeatured,
      status: args.status,
      platformVisibleDays: args.platformVisibleDays,
      platformExpiresAt: computeExpiry(args.platformVisibleDays),
      createdAt: Date.now(),
    });
    // Auto-publish published offers to the platform channels
    if (args.status === "published") {
      // Internal notification — instantly visible in the dashboard
      await ctx.db.insert("notifications", {
        title: "عرض جديد منشور",
        message: `تم نشر العرض "${args.title.trim()}" على قسم العروض وقنوات المنصة`,
        category: "offers",
        createdAt: Date.now(),
      });
      await ctx.scheduler.runAfter(0, api.channels.publishToChannels, {
        kind: "offer",
        itemId: id,
        title: args.title.trim(),
        message: args.description.trim(),
        url: "/offers",
        price:
          args.offerPrice !== undefined
            ? `${args.offerPrice.toLocaleString("en-US")} ريال يمني${args.discountPercent !== undefined ? ` — خصم ${args.discountPercent}%` : ""}`
            : undefined,
      });
    }
    return { ok: true };
  },
});

export const updateOffer = mutation({
  args: {
    token: v.string(),
    id: v.id("offers"),
    patch: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
      videoUrl: v.optional(v.string()),
      originalPrice: v.optional(v.number()),
      offerPrice: v.optional(v.number()),
      discountPercent: v.optional(v.number()),
      isFeatured: v.optional(v.boolean()),
      status: v.optional(v.string()),
      platformVisibleDays: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { token, id, patch }) => {
    await requireAdmin(ctx, token);
    const existing = await ctx.db.get(id);
    if (!existing) throw new ConvexError("العرض غير موجود");
    assertDuration(patch.platformVisibleDays);
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
    // Auto-publish whenever the offer becomes published
    if (nextStatus === "published" && existing.status !== "published") {
      // Internal notification — instantly visible in the dashboard
      await ctx.db.insert("notifications", {
        title: "عرض جديد منشور",
        message: `تم نشر العرض "${existing.title}" على قسم العروض وقنوات المنصة`,
        category: "offers",
        createdAt: Date.now(),
      });
      await ctx.scheduler.runAfter(0, api.channels.publishToChannels, {
        kind: "offer",
        itemId: id,
        title: existing.title,
        message: existing.description,
        url: "/offers",
        price:
          existing.offerPrice !== undefined
            ? `${existing.offerPrice.toLocaleString("en-US")} ريال يمني${existing.discountPercent !== undefined ? ` — خصم ${existing.discountPercent}%` : ""}`
            : undefined,
      });
    }
    return { ok: true };
  },
});

export const deleteOffer = mutation({
  args: { token: v.string(), id: v.id("offers") },
  handler: async (ctx, { token, id }) => {
    await requireAdmin(ctx, token);
    await ctx.db.delete(id);
    return { ok: true };
  },
});