"use node";

/**
 * 🔒 حاجز الخصوصية (أمان P0) — محرك توجيه الملفات مُعطَّل نهائياً.
 *
 * كان هذا الملف يرفع مرفقات العملاء (صور/مستندات PDF/فيديوهات الطلبات
 * قبل أي مراجعة) إلى قناة تيليجرام العامة ومجموعة فيسبوك ومجتمع واتساب
 * وأرشيف WebDAV ثم يحذفها من تخزين المنصة — تسرّب مباشر لبيانات سرّية.
 *
 * بعد الإصلاح:
 *  • لا يُرفع أي ملف إلى أي قناة أو وجهة — أبداً.
 *  • كل محاولة تُخمَّد بحالة `skipped` مع سبب واضح في السجل.
 *  • مرفقات العملاء تبقى في تخزين المنصة الخاص، وتُحذف فقط مع حذف الطلب
 *    نفسه أو بانتهاء مدة الظهور (دورة التنظيف).
 *  • النشر في قنوات المنصة يقتصر على نصوص الملخص المعتمدة من الإدارة
 *    عبر channels.publishToChannels (بلا مرفقات).
 */
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

const PRIVACY_REASON =
  "خصوصية: مرفقات العملاء تبقى في تخزين المنصة الخاص ولا تُرسل لأي قناة";

/**
 * يُخدّم أي صف في طابور الملفات بحالة skipped — لا إرسال ولا حذف.
 * (الدالة محفوظة كي يبقى مسار الاستدعاء قائماً ومحجوباً بأمان.)
 */
export const processFileQueue = action({
  args: {
    queueId: v.id("fileQueue"),
    storageId: v.string(),
    fileName: v.string(),
    fileKind: v.string(),
    mimeType: v.string(),
    entityType: v.string(),
    entityTitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.warn(
      `[FileForward:BLOCKED] محاولة توجيه مرفق "${args.fileName}" (${args.entityType}) أُخمدت — حاجز الخصوصية`
    );
    await ctx.runMutation(api.fileQueueMutations.markSkipped, {
      id: args.queueId,
      reason: PRIVACY_REASON,
    });
    return { ok: false as const, skipped: true as const, reason: "privacy" };
  },
});
