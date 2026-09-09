import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin } from "./auth";
import { api } from "./_generated/api";

export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("offers")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc")
      .collect();
    return rows.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
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
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    if (!args.title.trim()) throw new ConvexError("عنوان العرض مطلوب");
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
      createdAt: Date.now(),
    });
    // Auto-publish published offers to the platform channels
    if (args.status === "published") {
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
    }),
  },
  handler: async (ctx, { token, id, patch }) => {
    await requireAdmin(ctx, token);
    const existing = await ctx.db.get(id);
    if (!existing) throw new ConvexError("العرض غير موجود");
    const nextStatus = patch.status ?? existing.status;
    await ctx.db.patch(id, patch);
    // Auto-publish whenever the offer becomes published
    if (nextStatus === "published" && existing.status !== "published") {
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