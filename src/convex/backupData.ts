/**
 * 🗄️ استعلامات النسخ الاحتياطي (V8 runtime)
 * ------------------------------------------------------------
 * تُفصَل عن `backup.ts` لأن ذاك ملف Node ("use node") ولا يجوز فيه
 * تعريف إلا actions. هنا: صفحة تصدير مُرقّمة + حفظ حالة النسخة.
 */
import { internalMutation, internalQuery } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { TableNames } from "./_generated/dataModel";

/** يقرأ صفحة واحدة من أي جدول عبر pagination حقيقي (cursor متجدّد). */
export const dumpPage = internalQuery({
  args: { table: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { table, paginationOpts }) => {
    const page = await ctx.db
      .query(table as TableNames)
      .paginate(paginationOpts);
    return {
      rows: page.page,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    };
  },
});

/** يحفظ نتيجة آخر نسخة في settings.dbBackupStatus (تظهر في لوحة التحكم). */
export const saveBackupStatus = internalMutation({
  args: {
    ok: v.boolean(),
    bytes: v.number(),
    tableCount: v.number(),
    rowCount: v.number(),
    skippedReason: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (
    ctx: MutationCtx,
    { ok, bytes, tableCount, rowCount, skippedReason, error }
  ) => {
    const value = {
      ok,
      bytes,
      tableCount,
      rowCount,
      skippedReason,
      error,
      at: Date.now(),
      atISO: new Date().toISOString(),
    };
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "dbBackupStatus"))
      .first();
    if (existing) await ctx.db.patch(existing._id, { value });
    else await ctx.db.insert("settings", { key: "dbBackupStatus", value });
    return value;
  },
});
