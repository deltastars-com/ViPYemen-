#!/usr/bin/env node
/**
 * APKPure submitter for the ViP Yemen Android build (best effort).
 *
 * Why this is written the way it is:
 *   APKPure exposes **no public upload API** — the developer console
 *   (developer.apkpure.com) is a session/CSRF-protected web app. So this script
 *   is a guarded adapter, not a guaranteed robot:
 *
 *     1. With no APKPURE_EMAIL / APKPURE_PASSWORD it does nothing at all and
 *        prints the manual path. This is the normal state and it is not an error.
 *     2. With credentials it makes ONE polite attempt at the console session and
 *        logs exactly what happened (status + a short body excerpt).
 *     3. It swallows every failure and always exits 0, so a store hiccup or an
 *        expired credential can never break the release pipeline. The signed APK
 *        and its metadata always remain attached to the GitHub Release.
 *     4. It never writes to the repository, GitHub Releases, or the Play bundle.
 *
 * Usage: APK_PATH=... RELEASE_TAG=... node .github/scripts/apkpure-publish.mjs
 */

const PACKAGE_ID = process.env.PACKAGE_ID || "com.vip.yemen";
const APK_PATH = process.env.APK_PATH || "";
const RELEASE_TAG = process.env.RELEASE_TAG || "";
const EMAIL = (process.env.APKPURE_EMAIL || "").trim();
const PASSWORD = process.env.APKPURE_PASSWORD || "";

const CONSOLE_URL = "https://developer.apkpure.com";
const MANAGE_URL = `${CONSOLE_URL}/manage-versions`;
const UA = `ViP-Yemen-Release-Bot/1.0 (+https://apkpure.com/vipyemen/${PACKAGE_ID})`;
const TIMEOUT_MS = 120_000;

const log = (...args) => console.log("[apkpure]", ...args);

function banner(lines) {
  const bar = "─".repeat(64);
  console.log(bar);
  for (const line of lines) console.log(line);
  console.log(bar);
}

/** Never throws: returns null on any network/timeout/parse problem. */
async function attempt(label, fn) {
  try {
    const result = await fn();
    log(`✓ ${label}`);
    return result;
  } catch (error) {
    log(`– ${label}: ${error?.message || error}`);
    return null;
  }
}

/** Best-effort CSRF token scrape for the console login form. */
function findCsrfToken(html) {
  const patterns = [
    /name=["']csrf-token["']\s+content=["']([^"']+)["']/i,
    /name=["']_token["']\s+value=["']([^"']+)["']/i,
    /name=["']csrfmiddlewaretoken["']\s+value=["']([^"']+)["']/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function main() {
  banner([
    `APKPure submission — ViP Yemen ${RELEASE_TAG ? `(${RELEASE_TAG})` : "(latest release)"}`,
    `package : ${PACKAGE_ID}`,
    `apk     : ${APK_PATH || "<not provided>"}`,
    `account : ${EMAIL ? "credentials provided" : "NOT configured"}`,
  ]);

  if (!APK_PATH) {
    log("No APK path provided — nothing to submit.");
    return;
  }

  const { readFile, stat } = await import("node:fs/promises");
  const info = await attempt("read the APK from the release bundle", () => stat(APK_PATH));
  if (!info) {
    log("The APK file is not readable — skipping the submission, the release is unaffected.");
    return;
  }
  log(`APK size: ${info.size} bytes`);

  if (!EMAIL || !PASSWORD) {
    banner([
      "APKPure credentials are not configured — automatic submission skipped.",
      "",
      "The signed APK is already published in GitHub Releases and is ready to upload.",
      "To enable hands-off submission add these repository secrets:",
      "  Settings → Secrets and variables → Actions → New repository secret",
      "    APKPURE_EMAIL     = the developer console e-mail",
      "    APKPURE_PASSWORD  = the developer console password",
      "",
      `Manual upload: ${MANAGE_URL}`,
    ]);
    return;
  }

  // ---- 1. Open a console session -----------------------------------------
  const cookies = new Map();
  const cookieHeader = () => [...cookies].map(([k, v]) => `${k}=${v}`).join("; ");

  const request = async (url, init = {}) => {
    const response = await fetch(url, {
      ...init,
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "user-agent": UA,
        accept: "text/html,application/json;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
        ...(cookies.size ? { cookie: cookieHeader() } : {}),
        ...(init.headers || {}),
      },
    });
    for (const raw of response.headers.getSetCookie?.() ?? []) {
      const [pair] = raw.split(";");
      const idx = pair.indexOf("=");
      if (idx > 0) cookies.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
    }
    return response;
  };

  const loginPage = await attempt("reach the APKPure developer console", () => request(CONSOLE_URL));
  if (!loginPage) {
    log(`Console unreachable — upload manually: ${MANAGE_URL}`);
    return;
  }

  const html = (await attempt("read the login form", () => loginPage.text())) || "";
  const csrf = findCsrfToken(html);
  log(csrf ? "Found the console CSRF token." : "No CSRF token found on the public page.");

  const form = new URLSearchParams({ email: EMAIL, password: PASSWORD });
  if (csrf) {
    form.set("csrf-token", csrf);
    form.set("_token", csrf);
  }

  const loginResponse = await attempt("submit the console login", () =>
    request(`${CONSOLE_URL}/login`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form,
    }),
  );

  if (loginResponse) {
    log(`login status: ${loginResponse.status}`);
    const body = (await attempt("read the login response", () => loginResponse.text())) || "";
    const snippet = body.replace(/\s+/g, " ").slice(0, 300);
    if (snippet) log(`login response: ${snippet}`);

    if (loginResponse.status === 403 && /captcha|verify|risk/i.test(body)) {
      log("The console is asking for interactive verification — a human must finish this upload.");
    }
  }

  // ---- 2. Single guarded upload attempt ----------------------------------
  const apkBuffer = await attempt("load the APK into memory", () => readFile(APK_PATH));
  if (!apkBuffer) {
    log("Could not read the APK bytes — stopping.");
    return;
  }

  await attempt("submit the APK to the APKPure upload endpoint", async () => {
    const upload = new FormData();
    upload.set("package_name", PACKAGE_ID);
    upload.set("app_name", "ViP Yemen — في آي بي يمن");
    upload.set("release_tag", RELEASE_TAG);
    upload.set("file", new Blob([apkBuffer], { type: "application/vnd.android.package-archive" }), `${PACKAGE_ID}-${RELEASE_TAG || "latest"}.apk`);

    const response = await request(`${CONSOLE_URL}/api/upload`, { method: "POST", body: upload });
    log(`upload status: ${response.status}`);
    const text = (await response.text().catch(() => "")) || "";
    if (text) log(`upload response: ${text.replace(/\s+/g, " ").slice(0, 300)}`);
    if (![200, 201, 202].includes(response.status)) {
      throw new Error(`upload not accepted (HTTP ${response.status})`);
    }
    log("Upload accepted — APKPure review usually completes within 24 hours.");
  });

  banner([
    "Done. Nothing here can block the release pipeline.",
    "",
    `Console (manual review / fallback): ${MANAGE_URL}`,
    `Public listing (EN): https://apkpure.com/vipyemen/${PACKAGE_ID}`,
    `Public listing (AR): https://apkpure.com/ar/vipyemen/${PACKAGE_ID}`,
    "",
    "Reminder: APKPure has no public automation API, so if the console rejects a",
    "headless session the APK still ships from GitHub Releases — upload it from",
    "the console link above in under a minute.",
  ]);
}

main()
  .catch((error) => {
    // Absolute last resort: report and stay green.
    log(`unexpected error (ignored): ${error?.message || error}`);
  })
  .finally(() => {
    process.exitCode = 0;
  });
