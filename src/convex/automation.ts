import { internalMutation } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * Automation tick — runs every 5 minutes via convex/crons.ts.
 *
 * Enhanced platform automation spec:
 *  1. Ads: scheduled → active / active → paused on expiry
 *  2. Submissions: auto-archive rejected (>90 days), auto-archive published (>60 days)
 *  3. Offers: auto-archive expired offers, clean up their files
 *  4. Expired listings: files forwarded to Telegram, then cleaned from storage
 *  5. System notifications for each automated action
 *  6. Security: cleanup old login attempts (>24h), old OTP codes (>1h)
 *  7. Stale pending submissions: notify admin after 7 days
 */
export const tick = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const events: string[] = [];

    // ── 1. Ads: scheduled → active / active → paused on expiry ──────
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

    // ── 2. Submissions: auto-archive rejected (>90 days) ────────────
    const archiveCutoff = now - 90 * 24 * 60 * 60 * 1000;
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_created")
      .order("asc")
      .take(200);
    for (const s of submissions) {
      if (s.status === "rejected" && s.updatedAt < archiveCutoff) {
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

    // ── 3. Auto-archive published submissions older than 60 days ────
    const publishCutoff = now - 60 * 24 * 60 * 60 * 1000;
    const publishedSubs = await ctx.db
      .query("submissions")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("asc")
      .take(100);
    for (const s of publishedSubs) {
      if (s.publishedAt && s.publishedAt < publishCutoff) {
        const history = s.history ?? [];
        history.push({
          by: "النظام",
          at: now,
          action: "archived",
          note: "أرشفة تلقائية بعد 60 يوماً من النشر",
        });
        await ctx.db.patch(s._id, { status: "archived", history, updatedAt: now });
        // Enqueue attachments for forwarding before archive
        if (s.attachments && s.attachments.length > 0) {
          for (const att of s.attachments) {
            const existing = await ctx.db
              .query("fileQueue")
              .withIndex("by_entity", (q) =>
                q.eq("entityType", "submission").eq("entityId", s._id as string)
              )
              .collect();
            if (!existing.some((e) => e.storageId === att.storageId)) {
              await ctx.db.insert("fileQueue", {
                storageId: att.storageId,
                fileName: att.name,
                fileKind: att.kind,
                fileSize: 0,
                mimeType: att.kind === "image" ? "image/jpeg"
                  : att.kind === "video" ? "video/mp4"
                  : "application/octet-stream",
                entityType: "submission",
                entityId: s._id as string,
                status: "pending",
                retryCount: 0,
                createdAt: now,
              });
            }
          }
        }
        events.push(`تمت أرشفة إعلان منشور "${s.title}" بعد انتهاء الصلاحية — الملفات مُحوّلة للقنوات`);
      }
    }

    // ── 4. Notify admin about stale pending submissions (>7 days) ────
    const staleCutoff = now - 7 * 24 * 60 * 60 * 1000;
    const stalePending = await ctx.db
      .query("submissions")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("asc")
      .take(50);
    let staleCount = 0;
    for (const s of stalePending) {
      if (s.createdAt < staleCutoff) staleCount++;
    }
    if (staleCount > 0) {
      events.push(`⚠️ ${staleCount} طلبات معلقة منذ أكثر من 7 أيام بانتظار المراجعة`);
    }

    // ── 5. Security: cleanup old login attempts (>24h) ───────────────
    const loginCutoff = now - 24 * 60 * 60 * 1000;
    const oldAttempts = await ctx.db.query("loginAttempts").collect();
    for (const attempt of oldAttempts) {
      if (attempt.updatedAt < loginCutoff) {
        await ctx.db.delete(attempt._id);
      }
    }

    // ── 6. Security: cleanup old OTP codes (>1h) ────────────────────
    const otpCutoff = now - 60 * 60 * 1000;
    const oldOtps = await ctx.db.query("phoneOtps").collect();
    for (const otp of oldOtps) {
      if (otp.createdAt < otpCutoff) {
        await ctx.db.delete(otp._id);
      }
    }

    // ── 7. Notifications for automated events ────────────────────────
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
