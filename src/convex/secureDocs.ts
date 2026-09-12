import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

/**
 * 🔐 الخزنة — الوثائق ومفاتيح التوقيع والأسرار
 * Secure document vault — signing keys, credentials, and secrets.
 * Access is strictly admin-gated: every read/write requires a valid
 * admin session token. Nothing here is ever exposed publicly.
 */

export const listDocs = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const docs = await ctx.db.query("secureDocs").order("desc").collect();
    // Never return values in the list — only metadata. Values are fetched
    // one-by-one through getDocValue when the admin explicitly reveals one.
    return docs.map((d) => ({
      _id: d._id,
      name: d.name,
      description: d.description,
      category: d.category,
      isSecret: d.isSecret,
      valueLength: d.value.length,
      updatedAt: d.updatedAt,
    }));
  },
});

export const getDocValue = query({
  args: { token: v.string(), id: v.id("secureDocs") },
  handler: async (ctx, { token, id }) => {
    await requireAdmin(ctx, token);
    const doc = await ctx.db.get(id);
    if (!doc) throw new Error("المستند غير موجود / Document not found");
    return { name: doc.name, value: doc.value };
  },
});

export const upsertDoc = mutation({
  args: {
    token: v.string(),
    id: v.optional(v.id("secureDocs")),
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    isSecret: v.boolean(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const name = args.name.trim();
    if (!name) throw new Error("الاسم مطلوب / Name is required");
    const now = Date.now();
    if (args.id) {
      await ctx.db.patch(args.id, {
        name,
        description: args.description?.trim() || undefined,
        category: args.category,
        isSecret: args.isSecret,
        value: args.value,
        updatedAt: now,
      });
      return { ok: true, id: args.id };
    }
    // Upsert by name: updating an existing entry keeps one record per name.
    const existing = await ctx.db
      .query("secureDocs")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        description: args.description?.trim() || undefined,
        category: args.category,
        isSecret: args.isSecret,
        value: args.value,
        updatedAt: now,
      });
      return { ok: true, id: existing._id };
    }
    const id = await ctx.db.insert("secureDocs", {
      name,
      description: args.description?.trim() || undefined,
      category: args.category,
      isSecret: args.isSecret,
      value: args.value,
      updatedAt: now,
    });
    return { ok: true, id };
  },
});

export const deleteDoc = mutation({
  args: { token: v.string(), id: v.id("secureDocs") },
  handler: async (ctx, { token, id }) => {
    await requireAdmin(ctx, token);
    await ctx.db.delete(id);
    return { ok: true };
  },
});

/**
 * CLI-only importer (internal function — never callable from the client).
 * Used by scripts/vault-import.sh via `convex run internal`, which requires
 * either a logged-in Convex session or a deploy key — both are deployment
 * admin operations, so this is safe.
 */
export const importDoc = internalMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    isSecret: v.boolean(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("secureDocs")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        description: args.description?.trim() || undefined,
        category: args.category,
        isSecret: args.isSecret,
        value: args.value,
        updatedAt: Date.now(),
      });
      return { id: existing._id, updated: true };
    }
    const id = await ctx.db.insert("secureDocs", {
      name: args.name,
      description: args.description?.trim() || undefined,
      category: args.category,
      isSecret: args.isSecret,
      value: args.value,
      updatedAt: Date.now(),
    });
    return { id, updated: false };
  },
});
