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

// ── File forwarding queue processor (every 2 min) ─────────────────────
// Processes pending files in the queue and forwards them to
// Telegram + Facebook, then cleans up Convex storage.
// Handles thousands of files without impacting app performance.
crons.interval(
  "file-forward-queue",
  { seconds: 120 },
  internal.fileQueueInternal.processQueue
);

export default crons;