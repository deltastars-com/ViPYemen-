import { internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { collectRetryableOutbox } from "./channelPush";

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

    // ── 2+3. الأرشفة التلقائية + توجيه الملفات لقناة التلجرام ────────
    // المنشور > 60 يوماً والمرفوض > 90 يوماً، مع تقييد كامل في سجل الأرشفة
    // وأرشفة سجل كل عميل سابق في قناة المنصة.
    // \ معاملة مستقلة حتى لا يثقل حجمها دورة الأتمتة الأساسية.
    await ctx.scheduler.runAfter(0, internal.controlPanel.archiveInternal, {});

    // ── 3b. محرك التوافق + تقييم مقدمي التوظيف ──────────────────────
    // تُشغَّل كل واحدة في معاملة مستقلة (تحافظ على خفة دورة الأتمتة)
    await ctx.scheduler.runAfter(0, internal.matching.runAutoMatchInternal, { limit: 30 });
    await ctx.scheduler.runAfter(0, internal.employers.recalcInternal, {});

    // ── 3c. تهيئة فيسبوك من متغيرات البيئة (مرة واحدة فقط) ───────────
    // لو توفر توكن في البيئة ولم يُربط من اللوحة بعد، يُستورد آلياً ليبدأ
    // مسار التجديد الذاتي (توكن مستخدم → توكن صفحة دائم).
    await ctx.scheduler.runAfter(0, internal.facebook.bootstrapFromEnv, {});

    // ── 3d. تجديد ذاتي لتوكن فيسبوك عند الحاجة ──────────────────────
    // يفحص كل دورة (كل 5 دقائق)؛ لا يفعل شيئاً إلا عند اقتراب انتهاء توكن
    // المستخدم (أقل من 20 يوماً) أو انتهاء توكن الصفحة — فلا يتوقف النشر أبداً.
    await ctx.scheduler.runAfter(0, internal.facebook.refreshTokenInternal, {});

    // ── 3e. 🎯 اختبار النشر الفعلي على صفحة فيسبوك ───────────────────
    // توكن الصفحة لا تُقرأ صلاحياته من debug_token، فالاختبار الفعلي (منشور
    // مخفي يُحذف فوراً) هو الحكم القاطع. يعمل مرة كل ٦ ساعات كحد أقصى،
    // ولا يعمل إطلاقاً إذا كانت الصلاحية مؤكدة سابقاً — وعند نجاحه يرتفع
    // الإيقاف عن قناة فيسبوك تلقائياً بلا أي تدخل يدوي.
    await ctx.scheduler.runAfter(0, internal.facebook.probePostingInternal, {});

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

    // ── 7. Sessions: delete expired sessions (>30 days old) ─────────
    const sessionCutoff = now - 30 * 24 * 60 * 60 * 1000;
    const oldSessions = await ctx.db.query("sessions").collect();
    let sessionCount = 0;
    for (const session of oldSessions) {
      if (session.expiresAt < now || session.createdAt < sessionCutoff) {
        await ctx.db.delete(session._id);
        sessionCount++;
      }
    }
    if (sessionCount > 0) events.push(`تم حذف ${sessionCount} جلسة منتهية الصلاحية`);

    // ── 8. Password resets: delete used/expired codes ───────────────
    const oldResets = await ctx.db.query("passwordResets").collect();
    let resetCount = 0;
    for (const reset of oldResets) {
      if (reset.used || reset.expiresAt < now) {
        await ctx.db.delete(reset._id);
        resetCount++;
      }
    }
    if (resetCount > 0) events.push(`تم حذف ${resetCount} رمز استعادة مستخدم/منتهٍ`);

    // ── 9. File queue: delete old completed/failed rows (>7 days) ───
    // Metadata stays in Telegram/Facebook channels — queue rows are only
    // bookkeeping, so removing old ones keeps the table lean.
    const queueCutoff = now - 7 * 24 * 60 * 60 * 1000;
    const doneQueue = await ctx.db
      .query("fileQueue")
      .withIndex("by_status", (q) => q.eq("status", "cleaned"))
      .order("asc")
      .take(200);
    let queueCount = 0;
    for (const row of doneQueue) {
      if (row.createdAt < queueCutoff) {
        await ctx.db.delete(row._id);
        queueCount++;
      }
    }
    const failedQueue = await ctx.db
      .query("fileQueue")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .order("asc")
      .take(50);
    for (const row of failedQueue) {
      if (row.createdAt < queueCutoff) {
        await ctx.db.delete(row._id);
        queueCount++;
      }
    }
    // Requeue files stuck in "forwarding" for >10 minutes (crashed run)
    const stuckCutoff = now - 10 * 60 * 1000;
    const forwarding = await ctx.db
      .query("fileQueue")
      .withIndex("by_status", (q) => q.eq("status", "forwarding"))
      .order("asc")
      .take(50);
    for (const row of forwarding) {
      if (row.createdAt < stuckCutoff) {
        await ctx.db.patch(row._id, { status: "pending" });
      }
    }
    if (queueCount > 0) events.push(`تم تنظيف ${queueCount} صف قائمة ملفات قديم`);

    // ── 10. Notifications: delete system notifications older than 90d ─
    const notifCutoff = now - 90 * 24 * 60 * 60 * 1000;
    const oldNotifs = await ctx.db
      .query("notifications")
      .withIndex("by_created")
      .order("asc")
      .take(100);
    let notifCount = 0;
    for (const notif of oldNotifs) {
      if (notif.createdAt < notifCutoff) {
        await ctx.db.delete(notif._id);
        notifCount++;
      }
    }
    if (notifCount > 0) events.push(`تم حذف ${notifCount} إشعار قديم`);

    // ── 10b. صندوق القنوات: إعادة المحاولة التلقائية ──────────────────
    // أي منشور فشل إرساله إلى تلجرام/واتساب/فيسبوك يُعاد إرساله تلقائياً
    // (حتى 5 محاولات) — فلا يضيع منشور بسبب انقطاع في واجهة إحدى القنوات.
    const retryable = await collectRetryableOutbox(ctx, 8);
    for (const row of retryable) {
      await ctx.db.patch(row._id as any, { status: "pending", updatedAt: now });
      await ctx.scheduler.runAfter(0, internal.channels.deliverOutboxItem, {
        id: String(row._id),
        channel: row.channel,
        title: row.title,
        message: row.message,
      });
    }
    if (retryable.length > 0) {
      events.push(`إعادة إرسال ${retryable.length} رسالة إلى قنوات المنصة`);
    }

    // ── 10c. تقليم الجداول النامية — لا تضخّم في البيانات أبداً ─────
    // صندوق القنوات: المرسل أقدم من 3 أيام (وصل بالفعل)
    const outboxCutoff = now - 3 * 24 * 60 * 60 * 1000;
    const sentOutbox = await ctx.db
      .query("channelOutbox")
      .withIndex("by_status", (q) => q.eq("status", "sent"))
      .order("asc")
      .take(200);
    let outboxTrimmed = 0;
    for (const row of sentOutbox) {
      if (row.createdAt < outboxCutoff) {
        await ctx.db.delete(row._id);
        outboxTrimmed += 1;
      }
    }
    // سجل الأرشفة: أقدم من سنة
    const archiveCutoff = now - 365 * 24 * 60 * 60 * 1000;
    const oldArchive = await ctx.db
      .query("archiveLog")
      .withIndex("by_created")
      .order("asc")
      .take(200);
    for (const row of oldArchive) {
      if (row.createdAt < archiveCutoff) {
        await ctx.db.delete(row._id);
        outboxTrimmed += 1;
      }
    }
    // مطابقات مغلقة/مكتملة أقدم من 180 يوماً (الأرشيف الحي يبقى محدوداً)
    const matchCutoff = now - 180 * 24 * 60 * 60 * 1000;
    const oldMatches = await ctx.db
      .query("matchSuggestions")
      .withIndex("by_created")
      .order("asc")
      .take(200);
    for (const row of oldMatches) {
      if (row.createdAt < matchCutoff && (row.status === "closed" || row.status === "matched")) {
        await ctx.db.delete(row._id);
        outboxTrimmed += 1;
      }
    }
    if (outboxTrimmed > 0) {
      events.push(`تم تقليم ${outboxTrimmed} سجلاً قديماً (قنوات · أرشيف · مطابقات)`);
    }

    // ── 11. Notifications for automated events ──────────────────────
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
