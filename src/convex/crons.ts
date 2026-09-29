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

// ── 📮 دورة حملات البريد الإلكتروني (كل 5 دقائق) ─────────────────────
// تُشغّل الحملات المستحقة، تُعيد متابعة الحملة التي توقّفت بسبب انقطاع
// مؤقت، وتُنظّف سجل الإرسال القديم — بلا أي تدخل يدوي.
crons.interval(
  "email-campaigns",
  { seconds: 300 },
  internal.campaigns.emailTick
);

export default crons;