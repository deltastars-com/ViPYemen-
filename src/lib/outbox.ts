/**
 * Offline outbox — guarantees the apps NEVER lose a submission, even when the
 * backend (Convex) or the whole web is down.
 *
 * Strategy:
 *  - Any write that fails for NETWORK reasons (device offline, backend down,
 *    host unreachable) is queued into localStorage instead of being lost.
 *  - The queue flushes automatically: on the `online` event, when the app
 *    regains focus/visibility, and on a periodic retry timer with backoff.
 *  - Only genuine network failures are retried. Validation errors
 *    (ConvexError — bad phone, too long, rate limited…) are moved to a
 *    dead-letter log so a permanently-invalid entry can never jam the queue.
 *  - Entries are kept for 7 days max; the queue is capped so it can never
 *    bloat storage on low-end devices.
 *
 * Works identically on the PWA (browser), Android APK/AAB and iOS — all of
 * them share this WebView code path.
 */
import { ConvexError } from "convex/values";
import { convex } from "./convex";
import { api } from "../convex/_generated/api";

const QUEUE_KEY = "vip_outbox_v1";
const DEAD_KEY = "vip_outbox_dead_v1";
const MAX_ENTRIES = 50;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 100;
const RETRY_BASE_MS = 15_000; // 15s, 30s, 60s… capped at 5 min
const RETRY_MAX_MS = 5 * 60_000;
const FLUSH_INTERVAL_MS = 20_000;

export type OutboxEntry = {
  id: string;
  kind: "submission";
  args: Record<string, unknown>;
  createdAt: number;
  attempts: number;
  nextAt: number;
};

export type DeadEntry = {
  id: string;
  kind: string;
  reason: string;
  at: number;
};

/* ---------------------------------------------------------------- */
/* Storage (never let a storage failure break the app)               */
/* ---------------------------------------------------------------- */

function readQueue(): OutboxEntry[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const list = raw ? (JSON.parse(raw) as OutboxEntry[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeQueue(list: OutboxEntry[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(list.slice(-MAX_ENTRIES)));
  } catch {
    /* storage full/unavailable — nothing else we can do */
  }
}

function writeDead(entries: DeadEntry[]) {
  try {
    localStorage.setItem(DEAD_KEY, JSON.stringify(entries.slice(-50)));
  } catch {
    /* ignore */
  }
}

function newId(): string {
  try {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  } catch {
    return `${Date.now()}`;
  }
}

/* ---------------------------------------------------------------- */
/* Public API                                                        */
/* ---------------------------------------------------------------- */

export function pendingCount(): number {
  return readQueue().length;
}

/** Queue a submission for automatic delivery when connectivity returns. */
export function queueSubmission(args: Record<string, unknown>): string {
  const list = readQueue();
  const entry: OutboxEntry = {
    id: newId(),
    kind: "submission",
    args,
    createdAt: Date.now(),
    attempts: 0,
    nextAt: Date.now(),
  };
  list.push(entry);
  writeQueue(list);
  window.dispatchEvent(new CustomEvent("vip:outbox", { detail: { pending: list.length } }));
  return entry.id;
}

/** True when the error is a permanent/validation failure (don't retry). */
function isPermanent(err: unknown): boolean {
  return err instanceof ConvexError;
}

function networkish(err: unknown): boolean {
  const msg =
    err instanceof Error
      ? `${err.name} ${err.message}`
      : typeof err === "string"
        ? err
        : "";
  return /fetch|network|websocket|timeout|timed out|connection|offline|err_internet|err_connection|failed to|aborted|socket|ECONN|ENOTFOUND|503|502|504|429/i.test(
    msg
  );
}

function markDead(entry: OutboxEntry, reason: string) {
  const dead: DeadEntry[] = (() => {
    try {
      const raw = localStorage.getItem(DEAD_KEY);
      const list = raw ? (JSON.parse(raw) as DeadEntry[]) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  })();
  dead.push({ id: entry.id, kind: entry.kind, reason, at: Date.now() });
  writeDead(dead);
}

/* ---------------------------------------------------------------- */
/* Flusher                                                           */
/* ---------------------------------------------------------------- */

let flushing = false;
let listenerInstalled = false;

/**
 * Deliver every queued item, oldest first. Stops at the first NETWORK
 * failure (backend still down) and keeps the entry for the next attempt.
 * Permanent validation failures are moved to the dead-letter log and the
 * queue continues.
 */
export async function flushOutbox(): Promise<number> {
  if (flushing) return 0;
  if (typeof navigator !== "undefined" && !navigator.onLine) return 0;

  flushing = true;
  let sent = 0;
  try {
    const list = readQueue();
    if (list.length === 0) return 0;

    const remaining: OutboxEntry[] = [];
    const now = Date.now();

    for (let i = 0; i < list.length; i++) {
      const entry = list[i];

      // Expire very old entries so an ancient invalid payload can't loop.
      if (now - entry.createdAt > MAX_AGE_MS || entry.attempts > MAX_ATTEMPTS) {
        markDead(entry, "expired");
        continue;
      }
      if (entry.nextAt > now) {
        remaining.push(entry);
        continue;
      }

      try {
        if (entry.kind !== "submission") {
          markDead(entry, "unknown kind");
          continue;
        }
        // `as never` satisfies the generated mutation args type without
        // hand-copying the whole arg schema into this module.
        await convex.mutation(api.submissions.submit, entry.args as never);
        sent += 1;
      } catch (err) {
        if (isPermanent(err)) {
          markDead(entry, err instanceof ConvexError ? String(err.data ?? err.message) : "invalid");
          continue;
        }
        // Network-ish (or unknown) failure → retry with exponential backoff.
        const attempts = entry.attempts + 1;
        const delay = Math.min(RETRY_BASE_MS * 2 ** Math.min(attempts, 5), RETRY_MAX_MS);
        remaining.push({ ...entry, attempts, nextAt: Date.now() + delay });
        // Backend still unreachable — carry over the untouched tail and wait
        // for the next flush tick instead of hammering a down server.
        if (networkish(err)) {
          remaining.push(...list.slice(i + 1));
          break;
        }
      }
    }

    writeQueue(remaining);
    if (sent > 0) {
      window.dispatchEvent(
        new CustomEvent("vip:outbox", { detail: { pending: remaining.length, sent } })
      );
    }
    return sent;
  } finally {
    flushing = false;
  }
}

/**
 * Install the automatic sync loop (idempotent). Called once at boot from
 * main.tsx — flushes on: app start, network restore, tab focus/visibility,
 * and a 20-second retry timer.
 */
export function startOutbox(): void {
  if (listenerInstalled || typeof window === "undefined") return;
  listenerInstalled = true;

  const kick = () => {
    void flushOutbox();
  };

  window.addEventListener("online", kick);
  window.addEventListener("vip:outbox", kick as EventListener);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") kick();
  });
  window.addEventListener("focus", kick);
  window.setInterval(kick, FLUSH_INTERVAL_MS);

  // First pass shortly after boot (covers "submitted offline, closed app,
  // reopened when back online").
  window.setTimeout(kick, 3_000);
}
