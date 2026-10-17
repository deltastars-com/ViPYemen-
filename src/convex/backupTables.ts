/**
 * 🧱 جداول النسخ الاحتياطي — وحدة نقية بلا تعريف أي دالة Convex،
 * كي يستوردها ملف الـaction العامل على Node ("use node") وملف
 * الاستعلامات العامل على الـV8 معاً دون كسر قاعدة «لا دوال غير
 * actions في ملفات Node».
 */
import schema from "./schema";
import type { TableNames } from "./_generated/dataModel";

/** كل جداول المخطط — تُكتشف آلياً فلا يُنسى جدول جديد في النسخ. */
export const ALL_TABLES = Object.keys(schema.tables) as TableNames[];

/**
 * جداول مؤقتة بلا قيمة في نسخة استعادة (وتحتوي رموزاً سرية):
 * الجلسات ورموز إعادة التعيين ورموز التحقق ومحاولات الدخول.
 */
export const TRANSIENT_TABLES = new Set<string>([
  "sessions",
  "passwordResets",
  "phoneOtps",
  "loginAttempts",
]);

/** سقف أمان لكل جدول — يُسجَّل صراحةً كـ truncated في ملف النسخة. */
export const MAX_ROWS_PER_TABLE = 100_000;
export const PAGE_SIZE = 500;
