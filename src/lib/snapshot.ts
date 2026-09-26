/**
 * Snapshot cache — the READ side of platform continuity.
 *
 * Convex `useQuery` returns `undefined` forever while the backend is
 * unreachable (it keeps retrying internally). Every important public query
 * is therefore mirrored into localStorage after each successful load, and
 * this hook serves that last known snapshot the moment the live query stops
 * producing — so listings, offers, ads and stats stay on screen with ZERO
 * blank states when the backend (or its hosting) is down.
 *
 * Behavior:
 *  - Live data always wins the instant it arrives (never stale for long).
 *  - First paint is instant from cache (also a performance win).
 *  - Entries expire after 30 days and each snapshot is size-capped so
 *    storage can never bloat on low-end devices.
 *  - Storage failures are swallowed — the app must never crash on cache.
 */
import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import type { FunctionReference } from "convex/server";

const PREFIX = "vip_snap_v1:";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_CHARS = 400_000; // ~400 KB per snapshot guard

function loadSnapshot<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { t: number; d: T };
    if (!parsed || typeof parsed.t !== "number") return null;
    if (Date.now() - parsed.t > MAX_AGE_MS) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return parsed.d;
  } catch {
    return null;
  }
}

function saveSnapshot(key: string, data: unknown): void {
  try {
    const payload = JSON.stringify({ t: Date.now(), d: data });
    if (payload.length > MAX_CHARS) return; // too big — skip, never quota-error
    localStorage.setItem(PREFIX + key, payload);
  } catch {
    /* quota/unavailable — continuity degrades to live-only, never crashes */
  }
}

/**
 * Drop-in replacement for Convex `useQuery` with an offline backup:
 * returns live data when the backend responds, otherwise the last snapshot.
 *
 * `key` must be stable and unique per query + argument shape
 * (e.g. "subm.jobs.l3", "offers.published").
 */
export function useSnapshotQuery<Query extends FunctionReference<"query">>(
  key: string,
  query: Query,
  ...args: unknown[]
): Query["_returnType"] | undefined {
  // Forward the exact argument tuple (0 or 1 args, or "skip") to useQuery.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const live = (useQuery as any)(query, ...args) as
    | Query["_returnType"]
    | undefined;

  const [cached] = useState<Query["_returnType"] | undefined>(() =>
    loadSnapshot<Query["_returnType"]>(key)
  );

  useEffect(() => {
    if (live !== undefined) saveSnapshot(key, live);
  }, [key, live]);

  return live ?? cached;
}
