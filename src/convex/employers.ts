/**
 * ⭐ أرشيف مقدمي التوظيف وتقييمهم بالنجوم — ViP Yemen
 *
 * كل منشأة/صاحب عمل يظهر في كشف واحد مقيّم بالنجوم بناءً على:
 *   • المؤهلات: اكتمال بيانات المنشأة (الاسم، التخصص، الشروط، نوع الدوام، الراتب)
 *   • الخبرات: سنوات الخبرة المطلوبة وثراء وصف المتطلبات
 *   • الموثوقية: نسبة الطلبات المعتمدة/المنجزة + توثيق رقم الهاتف
 *   • الإنجاز: الوظائف التي اكتمل توظيفها («تم التوظيف»)
 *
 * الاحتساب آلي وحتمي، ويمكن للإدارة تعديل التقييم يدوياً فيبقى التعديل اليدوي
 * محفوظاً ولا يُستبدل بالتحديث التلقائي.
 */
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin } from "./auth";
import { yearsFrom } from "./matching";

export const MIN_STARS = 1;
export const MAX_STARS = 5;

interface EmployerGroup {
  name: string;
  phone: string;
  verified: boolean;
  posted: number;
  filled: number;
  published: number;
  rejected: number;
  qualifications: number;
  experience: number;
  lastActivity: number;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** اكتمال بيانات المنشأة (0..1) */
function completeness(fields: Record<string, unknown>): number {
  const text = (key: string) => String(fields?.[key] ?? "").trim();
  const checks = [
    text("company").length >= 2,
    text("profession").length >= 2,
    text("requirements").length >= 30,
    text("workType").length >= 2,
    text("salary").length >= 1,
  ];
  return checks.filter(Boolean).length / checks.length;
}

/** احتساب النجوم من النتيجة المركّبة (أنصاف النجوم مدعومة). */
export function starsFromScore(score: number): number {
  const raw = Math.round((score / 100) * MAX_STARS * 2) / 2;
  return Math.max(MIN_STARS, Math.min(MAX_STARS, raw));
}

export function scoreEmployer(group: EmployerGroup): {
  score: number;
  qualifications: number;
  experience: number;
  reliability: number;
  stars: number;
} {
  const approval = group.posted > 0 ? (group.published + group.filled) / group.posted : 0;
  const fillRate = group.posted > 0 ? group.filled / group.posted : 0;
  const reliability = clamp01(approval * 0.7 + fillRate * 0.15 + (group.verified ? 0.15 : 0));
  const score = Math.round(
    100 *
      (group.qualifications * 0.34 +
        group.experience * 0.26 +
        reliability * 0.25 +
        clamp01(fillRate * 2) * 0.15)
  );
  return {
    score,
    qualifications: group.qualifications,
    experience: group.experience,
    reliability,
    stars: starsFromScore(score),
  };
}

/** تحديث أرشيف مقدمي التوظيف تلقائياً من طلبات التوظيف. */
export async function recalcEmployerRatings(ctx: MutationCtx): Promise<number> {
  const rows = await ctx.db
    .query("submissions")
    .withIndex("by_category_status", (q) => q.eq("category", "jobs"))
    .take(500);
  const employers = rows.filter((row) => row.type === "employer");
  const now = Date.now();

  const groups = new Map<string, EmployerGroup>();
  for (const row of employers) {
    const fields = (row.fields ?? {}) as Record<string, unknown>;
    const key = row.phone;
    const group =
      groups.get(key) ??
      ({
        name: String(fields.company ?? "").trim() || row.fullName,
        phone: row.phone,
        verified: false,
        posted: 0,
        filled: 0,
        published: 0,
        rejected: 0,
        qualifications: 0,
        experience: 0,
        lastActivity: 0,
      } satisfies EmployerGroup);
    group.name = String(fields.company ?? "").trim() || group.name || row.fullName;
    group.posted += 1;
    if (row.status === "sold") group.filled += 1;
    if (row.status === "published") group.published += 1;
    if (row.status === "rejected") group.rejected += 1;
    group.verified = group.verified || row.phoneVerified;
    group.lastActivity = Math.max(group.lastActivity, row.updatedAt ?? row.createdAt);
    const completenessScore = completeness(fields);
    group.qualifications = Math.max(group.qualifications, completenessScore);
    const requestedYears = yearsFrom(
      [String(fields.requirements ?? ""), row.description ?? "", row.title].join(" ")
    );
    const requirementRichness = clamp01(String(fields.requirements ?? "").length / 200);
    group.experience = Math.max(
      group.experience,
      clamp01((requestedYears ?? 0) / 5) * 0.7 + requirementRichness * 0.3
    );
    groups.set(key, group);
  }

  let updated = 0;
  for (const group of groups.values()) {
    const computed = scoreEmployer(group);
    const existing = await ctx.db
      .query("employerRatings")
      .withIndex("by_phone", (q) => q.eq("phone", group.phone))
      .first();
    if (existing) {
      // التعديل اليدوي لا يُستبدل — يُحدَّث فقط الأرشيف التلقائي
      if (existing.manual) continue;
      await ctx.db.patch(existing._id, {
        name: group.name,
        stars: computed.stars,
        score: computed.score,
        qualifications: computed.qualifications,
        experience: computed.experience,
        reliability: computed.reliability,
        jobsPosted: group.posted,
        jobsFilled: group.filled,
        verified: group.verified,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("employerRatings", {
        name: group.name,
        phone: group.phone,
        stars: computed.stars,
        score: computed.score,
        qualifications: computed.qualifications,
        experience: computed.experience,
        reliability: computed.reliability,
        jobsPosted: group.posted,
        jobsFilled: group.filled,
        verified: group.verified,
        manual: false,
        createdAt: now,
        updatedAt: now,
      });
    }
    // ربط التقييم بسجل العميل نفسه (كشف العملاء يعرض النجوم)
    const client = await ctx.db
      .query("followups")
      .withIndex("by_phone", (q) => q.eq("phone", group.phone))
      .first();
    if (client) await ctx.db.patch(client._id, { stars: computed.stars });
    updated += 1;
  }
  return updated;
}

export const listRatings = query({
  args: {
    token: v.string(),
    minStars: v.optional(v.number()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { token, minStars, search, limit }) => {
    await requireAdmin(ctx, token);
    let rows = await ctx.db
      .query("employerRatings")
      .withIndex("by_updated")
      .order("desc")
      .take(limit ?? 300);
    if (minStars !== undefined) rows = rows.filter((row) => row.stars >= minStars);
    if (search) {
      const needle = search.toLowerCase();
      rows = rows.filter(
        (row) =>
          row.name.toLowerCase().includes(needle) || row.phone.includes(needle)
      );
    }
    return rows.sort((a, b) => b.stars - a.stars || b.score - a.score);
  },
});

export const getRatingStats = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const rows = await ctx.db.query("employerRatings").collect();
    const buckets: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    let sum = 0;
    for (const row of rows) {
      const bucket = String(Math.round(row.stars));
      buckets[bucket] = (buckets[bucket] ?? 0) + 1;
      sum += row.stars;
    }
    return {
      total: rows.length,
      average: rows.length > 0 ? Math.round((sum / rows.length) * 10) / 10 : 0,
      buckets,
      filled: rows.reduce((total, row) => total + row.jobsFilled, 0),
      manual: rows.filter((row) => row.manual).length,
    };
  },
});

/** تعديل يدوي للتقييم (نجوم كاملة أو أنصاف نجوم). */
export const setRating = mutation({
  args: {
    token: v.string(),
    phone: v.string(),
    stars: v.number(),
    note: v.optional(v.string()),
    resetToAuto: v.optional(v.boolean()),
  },
  handler: async (ctx, { token, phone, stars, note, resetToAuto }) => {
    await requireAdmin(ctx, token);
    if (!resetToAuto && (stars < MIN_STARS || stars > MAX_STARS)) {
      throw new ConvexError(`عدد النجوم يجب أن يكون بين ${MIN_STARS} و${MAX_STARS}`);
    }
    const existing = await ctx.db
      .query("employerRatings")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .first();
    const now = Date.now();
    if (!existing) {
      await ctx.db.insert("employerRatings", {
        name: phone,
        phone,
        stars: resetToAuto ? MIN_STARS : stars,
        score: Math.round((stars / MAX_STARS) * 100),
        qualifications: 0,
        experience: 0,
        reliability: 0,
        jobsPosted: 0,
        jobsFilled: 0,
        verified: false,
        manual: !resetToAuto,
        note,
        createdAt: now,
        updatedAt: now,
      });
      return { ok: true };
    }
    await ctx.db.patch(existing._id, {
      stars: resetToAuto ? existing.stars : stars,
      score: resetToAuto ? existing.score : Math.round((stars / MAX_STARS) * 100),
      manual: !resetToAuto,
      note: note ?? existing.note,
      updatedAt: now,
    });
    const client = await ctx.db
      .query("followups")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .first();
    if (client) await ctx.db.patch(client._id, { stars: resetToAuto ? existing.stars : stars });
    return { ok: true };
  },
});

/** إعادة احتساب الأرشيف فوراً من لوحة الكنترول. */
export const recalcNow = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const updated = await recalcEmployerRatings(ctx);
    return { ok: true, updated };
  },
});

/** إعادة الاحتساب من المجدول (دورة الأتمتة) في معاملة مستقلة. */
export const recalcInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    const updated = await recalcEmployerRatings(ctx);
    return { ok: true, updated };
  },
});
