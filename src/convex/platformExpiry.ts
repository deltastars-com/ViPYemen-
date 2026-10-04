/**
 * ⏳ مدة ظهور المنشور على واجهات المنصة (منصة ViP Yemen)
 *
 * القاعدة الحاكمة:
 *  • المنشور الذي تراجعه الإدارة وتُنشر في القنوات والجروبات والصفحات
 *    يبقى هناك **دائماً** (لا تُمسّ النسخ المنشورة خارج المنصة).
 *  • وبنفس اللحظة التي يحدّد فيها الإدارة مدة الظهور، يبدأ العدّاد على
 *    **واجهات المنصة والتطبيقات فقط**، وبعد انتهاء المدة يختفي المنشور من
 *    المنصة آلياً بلا تدخل.
 *
 * نستعمل الأرشفة (archive) بدل الحذف القسري عند الانتهاء: النتيجة على
 * الجمهور واحدة (يختفي المنشور من كل واجهات المنصة)، بينما يبقى السجل
 * والتاريخ والمرفقات محفوظة للإدارة ولا تضيع بيانات العميل.
 */
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";

/** خيارات المدة المعروضة للإدارة أثناء المراجعة قبل إعادة النشر. */
export const PLATFORM_VISIBLE_DAYS_OPTIONS: { value: number; label: string }[] = [
  { value: 7, label: "٧ أيام" },
  { value: 15, label: "١٥ يوماً" },
  { value: 30, label: "شهر (٣٠ يوماً)" },
  { value: 60, label: "شهران (٦٠ يوماً)" },
  { value: 90, label: "٣ أشهر (٩٠ يوماً)" },
  { value: 0, label: "دائم — بلا حذف تلقائي" },
];

export const DAY_MS = 86_400_000;

/**
 * يحوّل مدة الظهور إلى وقت انتهاء مطلق.
 * المدة ≤ 0 أو غير معرَّفة = ظهور دائم (لا وقت انتهاء).
 */
export function computeExpiry(days: number | undefined, from = Date.now()): number | undefined {
  if (days === undefined || !Number.isFinite(days) || days <= 0) return undefined;
  return from + Math.round(days) * DAY_MS;
}

/** هل انتهت المدة؟ (المنشور الدائم لا ينتهي أبداً) */
export function isExpired(
  expiresAt: number | undefined,
  now = Date.now()
): boolean {
  return expiresAt !== undefined && expiresAt > 0 && expiresAt <= now;
}

/** تسجيل حدث انتهاء في سجل أرشفة المنصة. */
async function logExpiry(
  ctx: MutationCtx,
  kind: string,
  entityId: string,
  title: string,
  channels: string[]
): Promise<void> {
  await ctx.db.insert("archiveLog", {
    kind: `${kind}:platform_expired`,
    entityId,
    title,
    reason: "انتهت المدة التي حددتها الإدارة للظهور على واجهات المنصة",
    files: 0,
    channels,
    createdAt: Date.now(),
  });
}

/**
 * 🧹 دورة انتهاء الظهور — تُستدعى كل ٥ دقائق من `automation.tick`.
 *
 * تمرّ على الطلبات والإعلانات والعروض المنشورة التي انتهت مدتها، فتُرشفها
 * فوراً فتختفي من كل واجهات المنصة، بينما تبقى نسخها في القنوات كما هي.
 * لا تُغيّر المدة هنا إطلاقاً: المدة تُحفظ مرة واحدة عند المراجعة.
 */
export const sweepExpired = internalMutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const now = Date.now();
    const cap = limit ?? 200;
    let archived = 0;
    const notes: string[] = [];

    // ── الطلبات (المنصة: طلبات التوظيف/العقارات/التسويق/البرمجيات) ──
    const publishedSubs = await ctx.db
      .query("submissions")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();
    for (const row of publishedSubs) {
      if (archived >= cap) break;
      if (!isExpired(row.platformExpiresAt, now)) continue;
      const history = row.history ?? [];
      history.push({
        by: "النظام",
        at: now,
        action: "platform_expired",
        note: "انتهت مدة الظهور على واجهات المنصة — أُرشف المنشور وتبقى نسخته في القنوات",
      });
      await ctx.db.patch(row._id, {
        status: "archived",
        archivedAt: now,
        updatedAt: now,
        history: history.slice(-50),
      });
      await logExpiry(
        ctx,
        "submission",
        row._id,
        row.title,
        row.publishedTo ?? []
      );
      archived++;
      notes.push(`طلب: ${row.title}`);
    }

    // ── الإعلانات ──────────────────────────────────────────────────
    const activeAds = await ctx.db
      .query("ads")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    for (const ad of activeAds) {
      if (archived >= cap) break;
      if (!isExpired(ad.platformExpiresAt, now)) continue;
      await ctx.db.patch(ad._id, { status: "paused" });
      await logExpiry(ctx, "ad", ad._id, ad.title, ad.publishedTo ?? []);
      archived++;
      notes.push(`إعلان: ${ad.title}`);
    }

    // ── العروض ────────────────────────────────────────────────────
    const publishedOffers = await ctx.db
      .query("offers")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();
    for (const offer of publishedOffers) {
      if (archived >= cap) break;
      if (!isExpired(offer.platformExpiresAt, now)) continue;
      await ctx.db.patch(offer._id, { status: "archived" });
      await logExpiry(ctx, "offer", offer._id, offer.title, offer.publishedTo ?? []);
      archived++;
      notes.push(`عرض: ${offer.title}`);
    }

    if (archived > 0) {
      await ctx.db.insert("notifications", {
        title: `⏳ انتهت مدة ${archived} منشور على واجهات المنصة`,
        message: `أُرشف تلقائياً بعد انتهاء المدة التي حددتها الإدارة — النسخ المنشورة في القنوات والجروبات والصفحات باقية كما هي. أول ٥ عناصر: ${notes
          .slice(0, 5)
          .join(" · ")}`,
        category: "system",
        createdAt: now,
      });
    }
    return { archived, notes: notes.slice(0, 20) };
  },
});

/** كم منشوراً تنتهي مدته خلال الـ ٢٤ ساعة القادمة — للوحة التحكم. */
export const upcomingExpirations = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const soon = now + DAY_MS;
    const count = async <T extends { platformExpiresAt?: number }>(
      rows: T[]
    ): Promise<number> =>
      rows.filter(
        (r) => r.platformExpiresAt !== undefined && r.platformExpiresAt > now && r.platformExpiresAt <= soon
      ).length;

    const subs = await ctx.db
      .query("submissions")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();
    const ads = await ctx.db
      .query("ads")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    const offers = await ctx.db
      .query("offers")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();

    return {
      submissions: await count(subs),
      ads: await count(ads),
      offers: await count(offers),
    };
  },
});