import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("releases").order("desc").collect();
  },
});

export const listAll = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    return ctx.db.query("releases").order("desc").collect();
  },
});

export const createRelease = mutation({
  args: {
    token: v.string(),
    version: v.string(),
    title: v.string(),
    description: v.string(),
    platform: v.string(),
    fileUrl: v.optional(v.string()),
    size: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    await ctx.db.insert("releases", {
      version: args.version,
      title: args.title.trim(),
      description: args.description.trim(),
      platform: args.platform,
      fileUrl: args.fileUrl || undefined,
      size: args.size || undefined,
      notes: args.notes || undefined,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

export const updateRelease = mutation({
  args: {
    token: v.string(),
    id: v.id("releases"),
    patch: v.object({
      version: v.optional(v.string()),
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      platform: v.optional(v.string()),
      fileUrl: v.optional(v.string()),
      size: v.optional(v.string()),
      notes: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { token, id, patch }) => {
    await requireAdmin(ctx, token);
    await ctx.db.patch(id, patch);
    return { ok: true };
  },
});

export const deleteRelease = mutation({
  args: { token: v.string(), id: v.id("releases") },
  handler: async (ctx, { token, id }) => {
    await requireAdmin(ctx, token);
    await ctx.db.delete(id);
    return { ok: true };
  },
});