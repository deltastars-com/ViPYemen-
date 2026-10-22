/**
 * 🗄️ استعلامات النسخ الاحتياطي (V8 runtime)
 * ------------------------------------------------------------
 * تُفصَل عن `backup.ts` لأن ذاك ملف Node ("use node") ولا يجوز فيه
 * تعريف إلا actions. هنا: صفحة تصدير مُرقّمة + حفظ حالة النسخة.
 */
import { internalMutation, internalQuery, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { TableNames } from "./_generated/dataModel";
import { requireAdmin } from "./auth";

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

/** عدد النسخ المحفوظة في التخزين الخاص (يُحذف الأقدم تلقائياً). */
const BACKUPS_KEPT = 10;

/**
 * يسجّل نسخة جديدة في settings.dbBackupList ويحذف الأقدم من التخزين.
 * (استُبدل إرسال تيليجرام — النسخ تبقى في تخزين المنصة الخاص فقط.)
 */
export const recordBackup = internalMutation({
  args: {
    storageId: v.string(),
    fileName: v.string(),
    bytes: v.number(),
    encrypted: v.boolean(),
    tableCount: v.number(),
    rowCount: v.number(),
    error: v.optional(v.string()),
  },
  handler: async (ctx: MutationCtx, args) => {
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "dbBackupList"))
      .first();
    const prev: any[] = Array.isArray(row?.value?.backups) ? row.value.backups : [];
    const entry = {
      storageId: args.storageId,
      fileName: args.fileName,
      bytes: args.bytes,
      encrypted: args.encrypted,
      tableCount: args.tableCount,
      rowCount: args.rowCount,
      error: args.error,
      at: Date.now(),
      atISO: new Date().toISOString(),
    };
    const backups = [entry, ...prev].slice(0, BACKUPS_KEPT);
    if (row) await ctx.db.patch(row._id, { value: { backups } });
    else await ctx.db.insert("settings", { key: "dbBackupList", value: { backups } });
    // حذف النسخ الأقدم من سقف الاحتفاظ من التخزين.
    for (const old of prev.slice(BACKUPS_KEPT)) {
      if (old?.storageId) {
        try {
          await ctx.storage.delete(old.storageId as any);
        } catch {
          /* أفضل جهد */
        }
      }
    }
    return { backups };
  },
});

/**
 * 🔐 قائمة النسخ الاحتياطية — للإدارة فقط (جلسة مدير موثّقة).
 * لا تُعرض لأي زائر: كل استعلام هنا يمرّ عبر requireAdmin.
 */
export const listBackups = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "dbBackupList"))
      .first();
    return { backups: Array.isArray(row?.value?.backups) ? row.value.backups : [] };
  },
});

/** رابط تنزيل مؤقت لنسخة احتياطية — للإدارة فقط. */
export const getBackupUrl = query({
  args: { token: v.string(), storageId: v.string() },
  handler: async (ctx, { token, storageId }) => {
    await requireAdmin(ctx, token);
    return await ctx.storage.getUrl(storageId as any);
  },
});
