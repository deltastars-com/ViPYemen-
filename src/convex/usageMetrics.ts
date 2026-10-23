import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

/**
 * 📊 تتبّع الاستخدام — حماية الخطة المجانية في Convex.
 *
 * حدود الخطة المجانية (موثقة رسمياً — docs.convex.dev/production/state/limits):
 *   · تخزين قاعدة البيانات: 0.5 GB (صفوف + فهارس)
 *   · تخزين الملفات:       1 GB
 *   · استدعاءات الوظائف:    1,000,000 / شهر (تشمل crons والاشتراكات والملفات)
 *   · نقل البيانات (egress) وقاعدة I/O: 1 GB / شهر لكل منهما
 *
 * ما يفعله هذا الموديول:
 *   1. لقطة يومية (cron 04:00 UTC) لعدّاد كل جدول رئيسي + عدد الملفات المرفقة.
 *   2. الاحتفاظ بآخر 14 يوماً فقط — لا يضخّم هو نفسه البيانات أبداً.
 *   3. عرض الاتجاه والنمو الأسبوعي للإدارة عبر summary (admin-only).
 *   4. عدّ «الملفات المؤرشفة القابلة للتنظيف» — والتنظيف يدوي حصراً من
 *      لوحة التحكم (لا حذف تلقائي: قاعدة المستخدم «لا يُحذف ملف قبل
 *      التحقق من نسخته في الأرشيف» — التحقق قرار إنساني، لا cron).
 *
 * البطء/التكلفة: اللقطة تمسح كل جدول بسقف 1001 مستند (حد قراءة Convex
 * للاستدعاء الواحد 32,000 مستند — نحن بعيدون عنه بفارق ضخم)، مرة واحدة
 * يومياً = استهلاك تافه من حصة المليون استدعاء.
 */

const DAY = 24 * 60 * 60 * 1000;
const HISTORY_DAYS = 14;
/** سقف العدّ لكل جدول — الجدول أكبر من هذا السقف يُعرض «1000+» */
const COUNT_CAP = 1000;

/** الجداول المعدودة — تشمل جداول النمو الأساسي (طلبات/عروض/إعلانات/عقود) */
const TRACKED_TABLES = [
  "submissions",
  "ads",
  "offers",
  "users",
  "contracts",
  "payments",
  "finance",
  "notifications",
  "followups",
  "secureDocs",
  "fileQueue",
  "channelOutbox",
  "channelStatus",
  "matchSuggestions",
  "employerRatings",
  "archiveLog",
  "emailSubscribers",
  "emailCampaigns",
  "emailLog",
  "channelPauseLog",
  "releases",
  "settings",
  "sessions",
] as const;

/** أرقام الحدود الرسمية — تُعرض للإدارة بجانب الأرقام الفعلية */
export const FREE_PLAN_QUOTAS = {
  databaseBytes: 500_000_000,
  fileBytes: 1_000_000_000,
  functionCallsPerMonth: 1_000_000,
  dataEgressBytesPerMonth: 1_000_000_000,
  databaseIoBytesPerMonth: 1_000_000_000,
  source: "https://docs.convex.dev/production/state/limits",
} as const;

/** جمع لقطة واحدة: عدّادات الجداول + الملفات المرفقة + القابل للتنظيف */
async function collectSnapshot(ctx: MutationCtx) {
  const now = Date.now();
  const counts: Record<string, number> = {};
  let totalDocs = 0;
  for (const table of TRACKED_TABLES) {
    // كل عدّ بسقف 1001 صف: كاشف «تجاوز السقف» + حماية حدود القراءة
    const rows = await ctx.db.query(table as any).take(COUNT_CAP + 1);
    const n = rows.length > COUNT_CAP ? COUNT_CAP : rows.length;
    counts[table] = n;
    totalDocs += n;
  }

  // الملفات المرفقة في الطلبات (أكبر مستهلك لحصة ملفات 1GB)
  const subs = await ctx.db.query("submissions").take(COUNT_CAP + 1);
  let attachmentRefs = 0;
  for (const s of subs) attachmentRefs += (s.attachments ?? []).length;

  // ملفات الطلبات المؤرشفة — قابلة للتنظيف اليدوي من لوحة التحكم
  const archived = await ctx.db
    .query("submissions")
    .withIndex("by_status", (q) => q.eq("status", "archived"))
    .order("asc")
    .take(COUNT_CAP + 1);
  let reclaimableRefs = 0;
  for (const s of archived) reclaimableRefs += (s.attachments ?? []).length;

  await ctx.db.insert("platformUsage", {
    collectedAt: now,
    counts,
    attachmentRefs,
    totalDocs,
    reclaimableRefs,
  });

  // الاحتفاظ بآخر 14 يوماً فقط — لا تضخّم في البيانات أبداً
  const old = await ctx.db.query("platformUsage").order("asc").take(200);
  for (const row of old) {
    if (now - row.collectedAt > HISTORY_DAYS * DAY) {
      await ctx.db.delete(row._id);
    }
  }

  return { totalDocs, attachmentRefs, reclaimableRefs };
}

/** اللقطة اليومية (crons.ts — 04:00 UTC) */
export const collect = internalMutation({
  args: {},
  handler: async (ctx) => collectSnapshot(ctx),
});

/** تحديث فوري من لوحة التحكم (زر «تحديث الآن») */
export const collectNow = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    return collectSnapshot(ctx);
  },
});

/**
 * ملخص الاستخدام للإدارة: آخر لقطة + اتجاه 14 يوماً + نمو أسبوعي + الحدود.
 */
export const summary = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const history = await ctx.db.query("platformUsage").order("desc").take(HISTORY_DAYS);
    const latest = history[0] ?? null;

    // النمو الأسبوعي: مقارنة أحدث لقطة بلقطة أقدمها ~7 أيام (إن وُجدت)
    let weeklyGrowthPct: number | null = null;
    if (latest && history.length >= 8) {
      const weekAgo = history[7];
      if (weekAgo && weekAgo.totalDocs > 0) {
        weeklyGrowthPct = Math.round(((latest.totalDocs - weekAgo.totalDocs) / weekAgo.totalDocs) * 1000) / 10;
      }
    }

    return {
      latest,
      // من الأقدم إلى الأحدث — لرسم الاتجاه
      history: [...history].reverse(),
      weeklyGrowthPct,
      quotas: FREE_PLAN_QUOTAS,
    };
  },
});

/** عيّنة الملفات المؤرشفة القابلة للتنظيف (لعرضها للإدارة قبل القرار) */
export const reclaimableSample = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const archived = await ctx.db
      .query("submissions")
      .withIndex("by_status", (q) => q.eq("status", "archived"))
      .order("asc")
      .take(200);
    return archived
      .filter((s) => (s.attachments ?? []).length > 0)
      .slice(0, 50)
      .map((s) => ({
        id: String(s._id),
        title: s.title,
        category: s.category,
        files: (s.attachments ?? []).length,
        archivedAt: s.archivedAt ?? 0,
      }));
  },
});

/**
 * 🧹 التنظيف اليدوي المؤكَّد: يحذف ملفات الطلبات المؤرشفة من تخزين
 * المنصة (حصة 1GB). السجل والmetadata يبقيان كما هم (الاستئناف والكشف).
 *
 * ⛔ آليات الحماية (لا يُكسر أي منها):
 *   · يلزم confirm: true — النافذة التأكيدية في اللوحة هي خطوة الإنسان.
 *   · حد أقصى 300 ملف للتنظيف في نداء واحد (دفعة خفيفة على المعاملة).
 *   · الطلبات غير المؤرشفة لا تُلمس إطلاقاً — الحذف محصور بمنتهي العرض.
 */
export const purgeArchivedFiles = mutation({
  args: { token: v.string(), confirm: v.boolean(), limit: v.optional(v.number()) },
  handler: async (ctx, { token, confirm, limit }) => {
    await requireAdmin(ctx, token);
    if (!confirm) {
      throw new Error("يتطلب تأكيداً صريحاً: confirm: true");
    }
    const batch = Math.min(Math.max(limit ?? 300, 1), 500);
    const archived = await ctx.db
      .query("submissions")
      .withIndex("by_status", (q) => q.eq("status", "archived"))
      .order("asc")
      .take(batch * 2);

    let deleted = 0;
    for (const s of archived) {
      if (deleted >= batch) break;
      for (const att of s.attachments ?? []) {
        if (deleted >= batch) break;
        try {
          await ctx.storage.delete(att.storageId as any);
          deleted += 1;
        } catch {
          // الملف قد يكون محذوفاً سابقاً — لا نوقف دفعة التنظيف
        }
      }
    }
    return { deleted };
  },
});
