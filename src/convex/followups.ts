import { mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin } from "./auth";

export const FOLLOWUP_STATUSES = [
  "pending",
  "contacted",
  "resolved",
  "unreachable",
] as const;

export type FollowupStatus = (typeof FOLLOWUP_STATUSES)[number];

export function isValidStatus(status: string): status is FollowupStatus {
  return (FOLLOWUP_STATUSES as readonly string[]).includes(status);
}

/** Upsert a client record whenever a new submission arrives (by phone). */
export async function touchFollowup(
  ctx: Pick<MutationCtx, "db">,
  input: {
    fullName: string;
    phone: string;
    address?: string;
    category?: string;
    submissionTitle: string;
    adminName?: string;
  }
) {
  const now = Date.now();
  const existing = await ctx.db
    .query("followups")
    .withIndex("by_phone", (q) => q.eq("phone", input.phone))
    .first();
  const historyEntry = {
    by: input.adminName ?? "النظام",
    at: now,
    action: "submission",
    note: `طلب جديد: ${input.submissionTitle}`,
  };
  if (existing) {
    const history = existing.history ?? [];
    history.push(historyEntry);
    while (history.length > 60) history.shift();
    await ctx.db.patch(existing._id, {
      fullName: input.fullName,
      address: input.address,
      category: input.category,
      lastSubmissionTitle: input.submissionTitle,
      submissionCount: (existing.submissionCount ?? 0) + 1,
      updatedAt: now,
      history,
    });
    return existing._id;
  }
  return ctx.db.insert("followups", {
    fullName: input.fullName,
    phone: input.phone,
    address: input.address,
    category: input.category,
    source: "submission",
    lastSubmissionTitle: input.submissionTitle,
    submissionCount: 1,
    status: "pending",
    history: [historyEntry],
    createdAt: now,
    updatedAt: now,
  });
}

export const listFollowups = query({
  args: {
    token: v.string(),
    status: v.optional(v.string()),
    category: v.optional(v.string()),
    search: v.optional(v.string()),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { token, status, category, search, from, to, limit }) => {
    await requireAdmin(ctx, token);
    let rows = await ctx.db
      .query("followups")
      .withIndex("by_updated")
      .order("desc")
      .take(limit ?? 1000);
    if (status && status !== "all") rows = rows.filter((r) => r.status === status);
    if (category && category !== "all") rows = rows.filter((r) => r.category === category);
    if (from) rows = rows.filter((r) => r.updatedAt >= from);
    if (to) rows = rows.filter((r) => r.updatedAt <= to);
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.fullName.toLowerCase().includes(s) ||
          r.phone.includes(s) ||
          (r.lastSubmissionTitle ?? "").toLowerCase().includes(s) ||
          (r.note ?? "").toLowerCase().includes(s)
      );
    }
    return rows;
  },
});

export const updateFollowup = mutation({
  args: {
    token: v.string(),
    id: v.id("followups"),
    patch: v.object({
      status: v.optional(v.string()),
      reason: v.optional(v.string()),
      note: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { token, id, patch }) => {
    const admin = await requireAdmin(ctx, token);
    const existing = await ctx.db.get(id);
    if (!existing) throw new ConvexError("السجل غير موجود");
    if (patch.status !== undefined && !isValidStatus(patch.status)) {
      throw new ConvexError("حالة متابعة غير صالحة");
    }
    const history = existing.history ?? [];
    const parts: string[] = [];
    if (patch.status && patch.status !== existing.status) {
      parts.push(`الحالة → ${patch.status}`);
    }
    if (patch.reason) parts.push(`السبب: ${patch.reason}`);
    if (patch.note) parts.push(`ملاحظة: ${patch.note}`);
    if (parts.length > 0) {
      history.push({
        by: admin.name,
        at: Date.now(),
        action: "followup",
        note: parts.join(" · "),
      });
      while (history.length > 60) history.shift();
    }
    await ctx.db.patch(id, {
      ...patch,
      history,
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

export const addManualFollowup = mutation({
  args: {
    token: v.string(),
    fullName: v.string(),
    phone: v.string(),
    address: v.optional(v.string()),
    category: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { token, fullName, phone, address, category, note }) => {
    const admin = await requireAdmin(ctx, token);
    if (!fullName.trim() || fullName.trim().length < 2)
      throw new ConvexError("الاسم مطلوب");
    if (!phone.trim()) throw new ConvexError("رقم الهاتف مطلوب");
    const now = Date.now();
    const history = [
      {
        by: admin.name,
        at: now,
        action: "manual",
        note: note ? `إدخال يدوي: ${note}` : "إدخال يدوي من لوحة التحكم",
      },
    ];
    await ctx.db.insert("followups", {
      fullName: fullName.trim(),
      phone: phone.trim(),
      address,
      category,
      source: "manual",
      submissionCount: 0,
      status: "pending",
      note,
      history,
      createdAt: now,
      updatedAt: now,
    });
    return { ok: true };
  },
});

export const deleteFollowup = mutation({
  args: { token: v.string(), id: v.id("followups") },
  handler: async (ctx, { token, id }) => {
    await requireAdmin(ctx, token);
    await ctx.db.delete(id);
    return { ok: true };
  },
});

export const getFollowupStats = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const all = await ctx.db.query("followups").collect();
    const counts: Record<string, number> = {
      all: all.length,
      pending: 0,
      contacted: 0,
      resolved: 0,
      unreachable: 0,
    };
    for (const r of all) {
      if (counts[r.status] !== undefined) counts[r.status] += 1;
    }
    const byCategory: Record<string, number> = {};
    for (const r of all) {
      const key = r.category ?? "بدون";
      byCategory[key] = (byCategory[key] ?? 0) + 1;
    }
    return { counts, byCategory, total: all.length };
  },
});

