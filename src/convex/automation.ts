import { internalMutation } from "./_generated/server";

/**
 * Automation tick — runs every 5 minutes via convex/crons.ts.
 * Implements the platform automation spec:
 *  - scheduled ads are published automatically when their start time arrives
 *  - ads expire (pause) automatically when their end time passes
 *  - old rejected submissions are archived automatically
 *  - system notifications are created for each automated action
 */
export const tick = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const events: string[] = [];

    // ---- Ads: scheduled -> active / active -> paused on expiry ----
    const ads = await ctx.db.query("ads").collect();
    for (const ad of ads) {
      if (ad.status === "scheduled" && ad.startsAt !== undefined && ad.startsAt <= now) {
        if (ad.endsAt !== undefined && ad.endsAt < now) {
          await ctx.db.patch(ad._id, { status: "paused" });
          events.push(`انتهت مدة الإعلان "${ad.title}" — تم إيقافه تلقائياً`);
        } else {
          await ctx.db.patch(ad._id, { status: "active" });
          events.push(`تم نشر الإعلان المجدول "${ad.title}" تلقائياً`);
        }
      } else if (ad.status === "active" && ad.endsAt !== undefined && ad.endsAt < now) {
        await ctx.db.patch(ad._id, { status: "paused" });
        events.push(`انتهت مدة الإعلان "${ad.title}" — تم إيقافه تلقائياً`);
      }
    }

    // ---- Submissions: auto-archive rejected requests older than 90 days ----
    const cutoff = now - 90 * 24 * 60 * 60 * 1000;
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_created")
      .order("asc")
      .take(200);
    for (const s of submissions) {
      if (s.status === "rejected" && s.updatedAt < cutoff) {
        const history = s.history ?? [];
        history.push({
          by: "النظام",
          at: now,
          action: "archived",
          note: "أرشفة تلقائية بعد 90 يوماً من الرفض",
        });
        await ctx.db.patch(s._id, { status: "archived", history, updatedAt: now });
        events.push(`تمت أرشفة الطلب "${s.title}" تلقائياً`);
      }
    }

    // ---- Notifications for automated events ----
    for (const message of events.slice(0, 10)) {
      await ctx.db.insert("notifications", {
        title: "أتمتة النظام",
        message,
        category: "system",
        createdAt: now,
      });
    }

    return { processed: events.length, events };
  },
});