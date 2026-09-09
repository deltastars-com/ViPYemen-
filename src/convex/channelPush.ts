// Channel-publish bookkeeping (regular mutations — NOT node actions).
// The node action in `channels.ts` does the actual sending; these mutations
// record which channels received an item and let the admin re-push any live
// item with one click.
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin } from "./auth";
import { api } from "./_generated/api";

/** Internal — records which channels received the item. */
export const recordChannelPublish = mutation({
  args: {
    kind: v.union(v.literal("submission"), v.literal("ad"), v.literal("offer")),
    itemId: v.string(),
    channels: v.array(v.string()),
    at: v.number(),
  },
  handler: async (ctx, { kind, itemId, channels, at }) => {
    const id = itemId as any;
    const doc = (await ctx.db.get(id)) as any;
    if (!doc) return { ok: false };
    const existing = new Set<string>((doc.publishedTo ?? []) as string[]);
    channels.forEach((c) => existing.add(c));
    await ctx.db.patch(id, { publishedTo: [...existing], lastChannelPush: at });
    return { ok: true };
  },
});

/** Admin action: re-push a live item to the channels with one click. */
export const repush = mutation({
  args: {
    token: v.string(),
    kind: v.union(v.literal("submission"), v.literal("ad"), v.literal("offer")),
    itemId: v.string(),
  },
  handler: async (ctx, { token, kind, itemId }) => {
    await requireAdmin(ctx, token);
    const id = itemId as any;
    const doc = (await ctx.db.get(id)) as any;
    if (!doc) throw new ConvexError("العنصر غير موجود");
    let title = "";
    let message = "";
    let url = "/";
    let price: string | undefined;

    if (kind === "submission") {
      if (doc.status !== "published" && doc.status !== "sold")
        throw new ConvexError("لا يمكن النشر للقنوات — العنصر غير منشور");
      title = doc.title;
      message = doc.description ?? doc.title;
      url =
        doc.category === "jobs"
          ? "/jobs"
          : doc.category === "real_estate"
            ? "/real-estate"
            : doc.category === "emarket"
              ? "/emarket"
              : "/software";
      if (doc.price !== undefined)
        price = `${doc.price.toLocaleString("en-US")} ${doc.currency === "usd" ? "$" : "ريال يمني"}`;
    } else if (kind === "ad") {
      if (doc.status !== "active") throw new ConvexError("الإعلان غير نشط");
      title = doc.title;
      message = doc.message;
      url = "/";
    } else {
      if (doc.status !== "published") throw new ConvexError("العرض غير منشور");
      title = doc.title;
      message = doc.description;
      url = "/offers";
      if (doc.offerPrice !== undefined)
        price = `${doc.offerPrice.toLocaleString("en-US")} ريال يمني${doc.discountPercent !== undefined ? ` — خصم ${doc.discountPercent}%` : ""}`;
    }

    await ctx.scheduler.runAfter(0, api.channels.publishToChannels, {
      kind,
      itemId,
      title,
      message,
      url,
      price,
    });
    return { ok: true };
  },
});