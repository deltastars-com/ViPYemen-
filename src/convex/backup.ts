"use node";

/**
 * 🗄️ النسخ الاحتياطي الدوري لقاعدة البيانات → بوت تيليجرام
 * ------------------------------------------------------------
 * كل يوم (03:00 UTC) يجمّع هذا السير كل جداول المنصة عبر ترقيم صفحات
 * (لا يحمل الجداول دفعة واحدة كي لا يتجاوز حدود القراءة)، يبني ملف
 * JSON مضغوطاً gzip، ويرسله إلى محادثة تيليجرام بـ sendDocument مع
 * ملخّص عربي (الجداول · عدد السجلات · الحجم · وقت التوليد).
 *
 * قرارات تصميم:
 *  • الجداول المؤقتة (جلسات/رموز تحقق/محاولات دخول) لا تُصدَّر لأنها
 *    بلا قيمة عند الاستعادة وتحتوي رموزاً سرية قصيرة العمر.
 *  • حد أقصى 100,000 سجل لكل جدول مع علامة `truncated` صريحة في
 *    الملف — فالنسخة أبداً لا تنقص بصمت.
 *  • الوجهة: TELEGRAM_BACKUP_CHAT_ID (محادثة/قناة خاصة بالإدارة)
 *    ثم TELEGRAM_CHAT_ID كبديل. يُفضَّل محادثة خاصة: ملف البيانات
 *    لا يُرسَل إلى وجهة عامة.
 *  • إن لم يُضبط التوكن تُتخطى العملية برسالة واضحة (بلا إسقاط
 *    سير الـcron)، وإن فشل الإرسال يُرمى خطأً كي يظهر في لوحة Convex.
 *
 * الحالة تُحفظ في جدول settings بالمفتاح `dbBackupStatus` فتُقرأ من
 * لوحة التحكم (getAll) دون أي واجهة جديدة.
 */
import { internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { gzipSync } from "node:zlib";
import {
  ALL_TABLES,
  TRANSIENT_TABLES,
  MAX_ROWS_PER_TABLE,
  PAGE_SIZE,
} from "./backupTables";

// الاستعلامات والحالة في `backupData.ts` (V8) لأن هذا الملف Node actions فقط.

// ── التجميع + الإرسال (action) ────────────────────────────────────────

async function dumpDatabase(ctx: ActionCtx) {
  const tables: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};
  const truncated: string[] = [];
  let rowCount = 0;

  for (const table of ALL_TABLES) {
    if (TRANSIENT_TABLES.has(table)) continue;

    const rows: unknown[] = [];
    let cursor: string | null = null;
    let done = false;
    while (!done) {
      const page: { rows: unknown[]; isDone: boolean; continueCursor: string } =
        await ctx.runQuery(internal.backupData.dumpPage, {
          table,
          paginationOpts: { cursor, numItems: PAGE_SIZE },
        });
      rows.push(...page.rows);
      done = page.isDone;
      cursor = page.isDone ? null : page.continueCursor;
      if (rows.length >= MAX_ROWS_PER_TABLE) {
        rows.length = MAX_ROWS_PER_TABLE;
        truncated.push(table);
        break;
      }
    }

    tables[table] = rows;
    counts[table] = rows.length;
    rowCount += rows.length;
  }

  return { tables, counts, truncated, rowCount };
}

export const runBackup = internalAction({
  args: {},
  handler: async (ctx) => {
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const chatId = (
      process.env.TELEGRAM_BACKUP_CHAT_ID?.trim() ||
      process.env.TELEGRAM_CHAT_ID?.trim() ||
      ""
    ).trim();

    if (!token || !chatId) {
      const reason = !token
        ? "TELEGRAM_BOT_TOKEN غير مضبوط في متغيرات Convex"
        : "TELEGRAM_CHAT_ID غير مضبوط في متغيرات Convex";
      console.warn(`⏭️ نسخ احتياطي متخطّى: ${reason}`);
      await ctx.runMutation(internal.backupData.saveBackupStatus, {
        ok: false,
        bytes: 0,
        tableCount: 0,
        rowCount: 0,
        skippedReason: reason,
      });
      return { ok: false as const, skippedReason: reason };
    }

    try {
      const { tables, counts, truncated, rowCount } = await dumpDatabase(ctx);

      const payload = {
        app: "ViP Yemen",
        kind: "convex-db-backup",
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        tableCount: Object.keys(tables).length,
        rowCount,
        truncatedTables: truncated,
        excludedTransientTables: [...TRANSIENT_TABLES],
        counts,
        tables,
      };

      const json = JSON.stringify(payload);
      const gz = gzipSync(Buffer.from(json, "utf8"));
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `vipyemen-db-backup-${stamp}.json.gz`;

      const formData = new FormData();
      formData.append("chat_id", chatId);
      formData.append(
        "caption",
        [
          "🗄️ نسخة احتياطية كاملة لقاعدة بيانات المنصة",
          `📅 ${payload.generatedAt}`,
          `🧱 ${payload.tableCount} جدول · 📄 ${rowCount.toLocaleString("en-US")} سجل`,
          `🗜️ ${(gz.length / 1024).toFixed(1)} KB (JSON مضغوط gzip)`,
          truncated.length
            ? `⚠️ جداول بلغت السقف وقُطعت: ${truncated.join(" · ")}`
            : "✅ بلا قطع — النسخة كاملة",
        ].join("\n")
      );
      formData.append(
        "document",
        new Blob([new Uint8Array(gz)], { type: "application/gzip" }),
        fileName
      );

      const res = await fetch(
        `https://api.telegram.org/bot${token}/sendDocument`,
        { method: "POST", body: formData }
      );
      const data = (await res.json()) as { ok?: boolean; description?: string };

      if (!res.ok || !data.ok) {
        throw new Error(
          `فشل إرسال النسخة إلى تيليجرام: ${data.description || res.status}`
        );
      }

      await ctx.runMutation(internal.backupData.saveBackupStatus, {
        ok: true,
        bytes: gz.length,
        tableCount: payload.tableCount,
        rowCount,
        ...(truncated.length
          ? { error: `truncated: ${truncated.join(",")}` }
          : {}),
      });

      console.log(
        `✅ نسخة احتياطية أُرسلت: ${payload.tableCount} جدول · ${rowCount} سجل · ${gz.length} بايت`
      );
      return {
        ok: true as const,
        bytes: gz.length,
        tableCount: payload.tableCount,
        rowCount,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("❌ فشل النسخ الاحتياطي:", message);
      await ctx.runMutation(internal.backupData.saveBackupStatus, {
        ok: false,
        bytes: 0,
        tableCount: 0,
        rowCount: 0,
        error: message,
      });
      throw err;
    }
  },
});
