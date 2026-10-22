import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * 🔒 حاجز الخصوصية (أمان P0) — معالج طابور الملفات.
 *
 * كان الطابور يوجّه مرفقات العملاء (صور/مستندات/فيديوهات) إلى قناة تيليجرام
 * العامة ومجموعة فيسبوك ومجتمع واتساب ثم يحذفها من تخزين المنصة — تسرّب
 * مباشر لبيانات عملاء سرّية قبل أي مراجعة إدارية. أُلغي التوجيه نهائياً:
 *  • مرفقات العملاء تبقى في تخزين المنصة الخاص فقط.
 *  • هذا السير يُفرّغ الطابور القديم آلياً بحالة `skipped` (دون إرسال ودون
 *    حذف أي ملف من التخزين).
 *  • النشر في قنوات المنصة يقتصر على نصوص الملخص المعتمدة من الإدارة
 *    عبر channels.publishToChannels — بلا مرفقات أبداً.
 */

/** يُفرّغ كل المعلّق في الطابور إلى `skipped` دون إرسال أو حذف. */
export const skipAllPending = internalMutation({
  args: {},
  handler: async (ctx) => {
    const pending = await ctx.db
      .query("fileQueue")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(200);
    const reason =
      "خصوصية: مرفقات العملاء تبقى في تخزين المنصة الخاص ولا تُرسل لأي قناة";
    for (const row of pending) {
      await ctx.db.patch(row._id, { status: "skipped", error: reason });
    }
    // كذلك أي عنصر عالق في وضع «يُوجَّه» من دورة سابقة — يُخمَّد بلا إرسال.
    const forwarding = await ctx.db
      .query("fileQueue")
      .withIndex("by_status", (q) => q.eq("status", "forwarding"))
      .take(50);
    for (const row of forwarding) {
      await ctx.db.patch(row._id, { status: "skipped", error: reason });
    }
    return { skipped: pending.length + forwarding.length };
  },
});

/**
 * دورة الطابور (كل دقيقتين): تُفرّغ المعلّق فقط — لا إرسال إلى أي قناة.
 * تُبقي الملفات في تخزين المنصة؛ حذفها يتم مع حذف الطلب نفسه أو بانتهاء
 * مدة الظهور عبر دورة التنظيف.
 */
export const processQueue = internalAction({
  args: {},
  handler: async (ctx): Promise<{ processed: number; total: number }> => {
    const { skipped } = await ctx.runMutation(internal.fileQueueInternal.skipAllPending, {});
    if (skipped > 0) {
      console.log(
        `[FileQueue] أُفرغ ${skipped} عنصر إلى skipped (حاجز الخصوصية — بلا إرسال لأي قناة)`
      );
    }
    return { processed: 0, total: skipped };
  },
});
