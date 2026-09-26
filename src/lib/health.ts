/**
 * Backend health probe — detects "site is up but the backend/API is down"
 * (or vice-versa) independently from `navigator.onLine`, which only reflects
 * the device's own connectivity.
 *
 * Used by the app shell to show an honest status banner and to let the
 * offline outbox know when delivery resumes. Runs a lightweight HTTP probe
 * against the Convex deployment with a short timeout, so a dead backend is
 * detected within seconds instead of users staring at a spinner.
 */
import { CONVEX_URL } from "./convex";

export type BackendState = "unknown" | "ok" | "down";
export type HostState = "unknown" | "ok" | "down";

const PROBE_INTERVAL_MS = 20_000;
const PROBE_TIMEOUT_MS = 6_000;

let state: BackendState = "unknown";
let hostState: HostState = "unknown";
let started = false;
let timer: number | undefined;
const listeners = new Set<(s: BackendState) => void>();
const hostListeners = new Set<(s: HostState) => void>();

export function getBackendState(): BackendState {
  return state;
}

export function getHostState(): HostState {
  return hostState;
}

export function subscribeBackend(listener: (s: BackendState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function subscribeHost(listener: (s: HostState) => void): () => void {
  hostListeners.add(listener);
  return () => hostListeners.delete(listener);
}

function setState(next: BackendState) {
  if (state === next) return;
  state = next;
  for (const fn of listeners) {
    try {
      fn(next);
    } catch {
      /* a bad listener must never break the probe */
    }
  }
}

function setHostState(next: HostState) {
  if (hostState === next) return;
  hostState = next;
  for (const fn of hostListeners) {
    try {
      fn(next);
    } catch {
      /* ignore */
    }
  }
}

/**
 * True only for a REAL web deployment (http/https on a public hostname).
 * Native APK/iOS builds and local dev run from their own servers, so they
 * must never be probed as if they depended on external hosting.
 */
function isProbingHost(): boolean {
  if (typeof location === "undefined") return false;
  const http = location.protocol === "https:" || location.protocol === "http:";
  const local = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(location.hostname);
  return http && !local;
}

async function probe(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    // Device offline → the backend isn't the problem; don't flag it as down.
    return;
  }
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    // Any HTTP response (even 404/405) proves the backend is reachable.
    await fetch(CONVEX_URL, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    setState("ok");
  } catch {
    setState("down");
  } finally {
    window.clearTimeout(timeout);
  }
}

/**
 * Probe the CURRENT hosting origin (not the SW cache). A plain fetch from a
 * controlled page falls through the service worker to the network, so when
 * Vercel/Render is down this fails even though the cached app keeps running —
 * exactly the signal we need to offer the backup mirrors.
 */
async function probeHost(): Promise<void> {
  if (!isProbingHost()) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    // Query-string cache-buster: defeats the precache match (which would
    // otherwise answer from the SW cache and hide a real host outage) and
    // forces a genuine network round-trip to the hosting provider.
    await fetch(`${location.origin}/?vip-probe=${Date.now()}`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    setHostState("ok");
  } catch {
    setHostState("down");
  } finally {
    window.clearTimeout(timeout);
  }
}

/**
 * Start the periodic probe (idempotent). Called once from main.tsx.
 * Also re-probes immediately whenever connectivity is restored.
 */
export function startHealthProbe(): void {
  if (started || typeof window === "undefined") return;
  started = true;

  void probe();
  void probeHost();
  window.setInterval(() => void probe(), PROBE_INTERVAL_MS);
  window.setInterval(() => void probeHost(), PROBE_INTERVAL_MS);
  window.addEventListener("online", () => {
    setState("unknown");
    setHostState("unknown");
    void probe();
    void probeHost();
  });
  window.addEventListener("offline", () => {
    setState("unknown");
    setHostState("unknown");
  });
}
