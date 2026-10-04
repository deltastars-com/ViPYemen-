import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { api } from "./_generated/api";

const crons = cronJobs();

// ── Automation tick (every 5 min) ─────────────────────────────────────
crons.interval(
  "automation-tick",
  { seconds: 300 },
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

// ── File forwarding queue processor (every 2 min) ─────────────────────
// Processes pending files in the queue and forwards them to
// Telegram + Facebook, then cleans up Convex storage.
// Handles thousands of files without impacting app performance.
crons.interval(
  "file-forward-queue",
  { seconds: 120 },
  internal.fileQueueInternal.processQueue
);

// ── ⏳ انتهاء مدة ظهور المنشورات على وواجهات المنصة (كل 5 دقائق) ─────
// دورة مستقلة خفيفة كي لا يثقل فحصُ الأفلام عناوينَ لا غيرها.
crons.interval(
  "platform-expiry",
  { seconds: 300 },
  internal.platformExpiry.sweepExpired,
  { limit: 200 }
);

// ── 📮 دورة حملات البريد الإلكتروني (كل 5 دقائق) ─────────────────────
// تُشغّل الحملات المستحقة، تُعيد متابعة الحملة التي توقّفت بسبب انقطاع
// مؤقت، وتُنظّف سجل الإرسال القديم — بلا أي تدخل يدوي.
crons.interval(
  "email-campaigns",
  { seconds: 300 },
  internal.campaigns.emailTick
);

// ── 🤖 رد بوت تيليجرام بالاستعلام (كل 5 ثوان) ────────────────────────
// احتياطي عن الـ webhook: يعمل فقط إن كان مُفعّلاً من اللوحة، ويقف تلقائياً
// ما دام الـ webhook مُفعّلاً لأن تيليجرام لا يسمح بالجمع بينهما (409).
// بلا مستخدمين لا يفعل الفحص أي نداء خارجي (بلا توكن = لا استعلام).
crons.interval(
  "telegram-polling",
  { seconds: 5 },
  internal.telegramBot.pollUpdates,
  {}
);

export default crons;