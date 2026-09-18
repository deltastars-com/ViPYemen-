import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * 📁 File Queue Mutations — Regular Convex mutations for the file forwarding queue.
 * These are called by the server action in fileForward.ts.
 */

/** Add a file to the forwarding queue. */
export const enqueue = mutation({
  args: {
    storageId: v.string(),
    fileName: v.string(),
    fileKind: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    entityType: v.string(),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("fileQueue", {
      storageId: args.storageId,
      fileName: args.fileName,
      fileKind: args.fileKind,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      entityType: args.entityType,
      entityId: args.entityId,
      status: "pending",
      retryCount: 0,
      createdAt: Date.now(),
    });
    return { id };
  },
});

/** Mark a file as currently being forwarded. */
export const markForwarding = mutation({
  args: { id: v.id("fileQueue") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { status: "forwarding" });
    return { ok: true };
  },
});

/** Mark a file as successfully forwarded. */
export const markForwarded = mutation({
  args: {
    id: v.id("fileQueue"),
    forwardedTo: v.array(v.string()),
    remoteUrls: v.any(),
  },
  handler: async (ctx, { id, forwardedTo, remoteUrls }) => {
    await ctx.db.patch(id, {
      status: "forwarded",
      forwardedTo,
      remoteUrls,
      forwardedAt: Date.now(),
    });
    return { ok: true };
  },
});

/** Mark a file forwarding as failed. */
export const markFailed = mutation({
  args: {
    id: v.id("fileQueue"),
    error: v.string(),
  },
  handler: async (ctx, { id, error }) => {
    const doc = await ctx.db.get(id);
    if (!doc) return { ok: false };
    const retryCount = doc.retryCount + 1;
    await ctx.db.patch(id, {
      status: retryCount >= 3 ? "failed" : "pending",
      error,
      retryCount,
    });
    return { ok: true, retried: retryCount < 3 };
  },
});

/** Mark file as cleaned (storage deleted). */
export const markCleaned = mutation({
  args: { id: v.id("fileQueue") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { status: "cleaned" });
    return { ok: true };
  },
});

/** Get pending files for batch processing. */
export const getPendingFiles = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    return await ctx.db
      .query("fileQueue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("asc")
      .take(limit ?? 10);
  },
});

/** Get entity title for caption. */
export const getEntityTitle = query({
  args: {
    entityType: v.string(),
    entityId: v.string(),
  },
  handler: async (ctx, { entityType, entityId }) => {
    if (entityType === "submission") {
      const doc = await ctx.db.get(entityId as any);
      return doc ? { title: (doc as any).title } : null;
    }
    return null;
  },
});

/** Schedule cleanup of Convex storage after forwarding. */
export const scheduleCleanup = mutation({
  args: {
    queueId: v.id("fileQueue"),
    storageId: v.string(),
  },
  handler: async (ctx, { queueId, storageId }) => {
    try {
      await ctx.storage.delete(storageId as any);
      await ctx.db.patch(queueId, { status: "cleaned" });
      return { ok: true };
    } catch {
      return { ok: false };
    }
  },
});

/** Get forwarded files that need storage cleanup. */
export const getForwardedForCleanup = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    return await ctx.db
      .query("fileQueue")
      .withIndex("by_status", (q) => q.eq("status", "forwarded"))
      .order("asc")
      .take(limit ?? 10);
  },
});

/** Enqueue all attachments of a submission/ad/offer for forwarding. */
export const enqueueAttachments = mutation({
  args: {
    entityType: v.string(),
    entityId: v.string(),
    attachments: v.array(
      v.object({
        name: v.string(),
        storageId: v.string(),
        kind: v.string(),
      })
    ),
  },
  handler: async (ctx, { entityType, entityId, attachments }) => {
    let enqueued = 0;
    for (const att of attachments) {
      // Don't double-enqueue
      const existing = await ctx.db
        .query("fileQueue")
        .withIndex("by_entity", (q) =>
          q.eq("entityType", entityType).eq("entityId", entityId)
        )
        .collect();
      if (existing.some((e) => e.storageId === att.storageId)) continue;

      await ctx.db.insert("fileQueue", {
        storageId: att.storageId,
        fileName: att.name,
        fileKind: att.kind,
        fileSize: 0, // Will be determined during download
        mimeType: att.kind === "image" ? "image/jpeg"
          : att.kind === "video" ? "video/mp4"
          : att.kind === "audio" ? "audio/mpeg"
          : "application/octet-stream",
        entityType,
        entityId,
        status: "pending",
        retryCount: 0,
        createdAt: Date.now(),
      });
      enqueued++;
    }
    return { enqueued };
  },
});
