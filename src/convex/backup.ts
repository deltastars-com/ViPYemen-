"use node";

/**
 * 🗄️ النسخ الاحتياطي الدوري لقاعدة البيانات → تخزين المنصة الخاص (مشفّر)
 * ---------------------------------------------------------------------
 * ⛔ إلغاء التسرّب (أمان P0): كان هذا السير يرسل ملف قاعدة البيانات كاملاً
 * (بيانات العملاء · الهواتف · العقود والتوقيعات · مفاتيح الخزنة) عبر
 * sendDocument إلى تيليجرام — أي حملة توكن بوت تكشف قاعدة المنصة كاملة.
 * أُلغي الإرسال إلى أي قناة نهائياً. النسخة الجديدة:
 *   • تُجمَّع كما سابقاً (كل الجداول عبر ترقيم صفحات، بلا الجداول المؤقتة)،
 *   • تُضغط gzip، ثم تُشفَّر AES-256-GCM إن ضُبط BACKUP_ENCRYPTION_KEY،
 *   • وتُرفع إلى تخزين المنصة الخاص في Convex (غير متاح للجمهور).
 *
 * الحالة تُحفظ في settings (`dbBackupStatus` + `dbBackupList`) وتُقرأ من
 * لوحة التحكم عبر استعلامات إدارية موثّقة (backupData.listBackups /
 * getBackupUrl) — التنزيل يتطلب جلسة مدير.
 *
 * إن لم يُضبط TELEGRAM... لا يلزم شيء: لم يعد هناك أي اعتماد على تيليجرام.
 */
import { internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { gzipSync } from "node:zlib";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import {
  ALL_TABLES,
  TRANSIENT_TABLES,
  MAX_ROWS_PER_TABLE,
  PAGE_SIZE,
} from "./backupTables";

// الاستعلامات والحالة في `backupData.ts` (V8) لأن هذا ملف Node actions فقط.

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

/**
 * تشفير AES-256-GCM: المفتاح مشتق SHA-256 من BACKUP_ENCRYPTION_KEY.
 * التنسيق: "VIPA1" + iv(12B) + authTag(16B) + ciphertext.
 * إن لم يُضبط المفتاح تُحفظ النسخة غير مشفّرة داخل تخزين المنصة الخاص
 * (وهو بحد ذاته غير متاح للجمهور) مع علامة encrypted:false في السجل.
 */
function encryptPayload(gz: Buffer): { data: Buffer; encrypted: boolean } {
  const material = (process.env.BACKUP_ENCRYPTION_KEY ?? "").trim();
  if (!material) return { data: gz, encrypted: false };
  const key = createHash("sha256").update(material, "utf8").digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(gz), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    data: Buffer.concat([Buffer.from("VIPA1", "ascii"), iv, tag, ciphertext]),
    encrypted: true,
  };
}

export const runBackup = internalAction({
  args: {},
  handler: async (ctx) => {
    try {
      const { tables, counts, truncated, rowCount } = await dumpDatabase(ctx);

      const payload = {
        app: "ViP Yemen",
        kind: "convex-db-backup",
        schemaVersion: 2,
        storage: "convex-private (لم يعد يُرسل لأي قناة)",
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
      const { data, encrypted } = encryptPayload(gz);
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = encrypted
        ? `vipyemen-db-backup-${stamp}.json.gz.enc`
        : `vipyemen-db-backup-${stamp}.json.gz`;

      // رفع النسخة إلى تخزين المنصة الخاص (URL رفع مؤقت يُولَّد هنا).
      const uploadUrl = await ctx.runMutation(api.storage.generateUploadUrl, {});
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: new Uint8Array(data),
      });
      if (!res.ok) {
        throw new Error(`فشل رفع النسخة إلى تخزين المنصة: ${res.status}`);
      }
      const { storageId } = (await res.json()) as { storageId: string };

      await ctx.runMutation(internal.backupData.recordBackup, {
        storageId,
        fileName,
        bytes: data.length,
        encrypted,
        tableCount: payload.tableCount,
        rowCount,
        ...(truncated.length
          ? { error: `truncated: ${truncated.join(",")}` }
          : {}),
      });
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
        `✅ نسخة احتياطية حُفظت في تخزين المنصة الخاص: ${payload.tableCount} جدول · ${rowCount} سجل · ${gz.length} بايت`
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