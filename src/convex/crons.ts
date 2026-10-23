import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { api } from "./_generated/api";

const crons = cronJobs();

// ── Automation tick (every 10 min — 💰 quota-safe: كل استدعاء cron من حصة المليون/شهر) ─────────────────────────────────────
crons.interval(
  "automation-tick",
  { seconds: 600 },
  internal.automation.tick
);

// ── 🩺 فحص صحة قنوات المنصة (كل 6 ساعات) ─────────────────────────────
// يتحقق فعلياً من تلجرام وواتساب وصفحة/مجموعة فيسبوك، ويسجّل الحالة
// في لوحة الكنترول، ويُشعر الإدارة عند أي انقطاع أو تعاف.
crons.interval(
  "channel-health",
  { hours: 6 },
  internal.channels.checkChannels
);

// ── File forwarding queue processor (every 5 min — 💰 quota-safe) ─────────────────────
// 🔒 حاجز الخصوصية: هذا السير لم يعد يوجّه أي ملف إلى أي قناة — يُفرّغ
// الطابور القديم فقط بحالة `skipped` ويُبقي مرفقات العملاء في تخزين
// المنصة الخاص (انظر fileQueueInternal.processQueue).
crons.interval(
  "file-forward-queue",
  { seconds: 300 },
  internal.fileQueueInternal.processQueue
);

// ── ⏳ انتهاء مدة ظهور المنشورات على وواجهات المنصة (كل 10 دقائق — 💰 quota-safe) ─────
// دورة مستقلة خفيفة كي لا يثقل فحصُ الأفلام عناوينَ لا غيرها.
crons.interval(
  "platform-expiry",
  { seconds: 600 },
  internal.platformExpiry.sweepExpired,
  { limit: 200 }
);

// ── 📮 دورة حملات البريد الإلكتروني (كل 10 دقائق — 💰 quota-safe) ─────────────────────
// تُشغّل الحملات المستحقة، تُعيد متابعة الحملة التي توقّفت بسبب انقطاع
// مؤقت، وتُنظّف سجل الإرسال القديم — بلا أي تدخل يدوي.
crons.interval(
  "email-campaigns",
  { seconds: 600 },
  internal.campaigns.emailTick
);

// ── 🤖 رد بوت تيليجرام بالاستعلام (كل 30 ثانية — احتياطي عن الويب هوك)
// 💰 الاستعلام كل 5 ثوانٍ كان يستهلك وحده ~518 ألف استدعاء شهرياً (52% من
// حصة المليون!) — 30 ثانية = ~86 ألف (-83%) مع ردود بوت فورية عملياً. ────────────────────────
// احتياطي عن الـ webhook: يعمل فقط إن كان مُفعّلاً من اللوحة، ويقف تلقائياً
// ما دام الـ webhook مُفعّلاً لأن تيليجرام لا يسمح بالجمع بينهما (409).
// بلا مستخدمين لا يفعل الفحص أي نداء خارجي (بلا توكن = لا استعلام).
crons.interval(
  "telegram-polling",
  { seconds: 30 },
  internal.telegramBot.pollUpdates,
  {}
);

// ── 🗄️ نسخة احتياطية كاملة لقاعدة البيانات → تخزين المنصة الخاص (يومياً 03:00 UTC) ─
// تجمّع كل الجداول (بلا الجداول المؤقتة الحساسة) في ملف JSON مضغوط، وترفعه
// إلى تخزين المنصة الخاص داخل Convex — ⛔ لم يعد يُرسل أي شيء إلى تيليجرام
// أو أي قناة (حاجز الخصوصية — أمان P0). الحالة تُحفظ في الإعدادات
// `dbBackupStatus` وقائمة النسخ في `dbBackupList` (تنزيل إداري فقط).
crons.daily(
  "db-backup-telegram",
  { hourUTC: 3, minuteUTC: 0 },
  internal.backup.runBackup,
  {}
);

// ── 📊 لقطة الاستخدام اليومية (04:00 UTC — بعد النسخة الاحتياطية بساعة) ──
// عدّادات الجداول + الملفات المرفقة، مع الاحتفاظ بآخر 14 يوماً فقط:
// الإدارة ترى النمو في لوحة التحكم وتتصرّف قبل بلوغ حدود الخطة المجانية
// (0.5GB قاعدة · 1GB ملفات · مليون استدعاء — انظر usageMetrics.ts).
crons.daily(
  "platform-usage-snapshot",
  { hourUTC: 4, minuteUTC: 0 },
  internal.usageMetrics.collect,
  {}
);

export default crons;