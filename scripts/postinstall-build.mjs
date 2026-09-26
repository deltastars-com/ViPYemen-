/**
 * Auto-build after `npm install` / `bun install`.
 *
 * Render static sites sometimes get created with a build command that only
 * installs dependencies (e.g. `bun install`) and a publish directory that
 * does not match Vite's output (`dist`). This hook makes the repository
 * self-healing: after any install, if no build output exists yet, it runs
 * `vite build` and mirrors the result into both `dist/` and `build/` so
 * whichever publish directory the service was created with, it works.
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Always anchor to the script's own directory — never the process cwd — so
// `npm ci` cache layouts or changed workdirs can never make this file
// "not found". If anything is off, exit 0 silently: a failed install hook
// must never block a hosting deployment.
const here = dirname(fileURLToPath(import.meta.url));
const scriptName = "postinstall-build.mjs";
if (!existsSync(resolve(here, scriptName))) {
  console.log("[postinstall] Script location unclear — skipping safely.");
  process.exit(0);
}
const root = resolve(here, "..");
const hasIndex = (dir) => existsSync(resolve(root, dir, "index.html"));

// Skip on Vercel — it runs its own build command and reports the postinstall
// build as a failed deployment. The postinstall hook exists purely to
// self-heal Render services whose build command doesn't build.
if (process.env.VERCEL || process.env.VERCEL_ENV || process.env.NOW_BUILDER) {
  console.log("[postinstall] Vercel detected — skipping (Vercel runs its own build).");
  process.exit(0);
}

// Any unexpected error must never fail the install/deploy.
process.on("uncaughtException", (err) => {
  console.log("[postinstall] Non-fatal:", err.message);
  process.exit(0);
});

// Every publish directory a hosting service might have been created with.
// Render services in the wild use `dist`, `build`, or the pasted placeholder
// typo `e.g.build` — we guarantee ALL of them exist after every install.
const MIRRORS = ["dist", "build", "e.g.build"];

function mirrorDist() {
  for (const alt of MIRRORS.slice(1)) {
    rmSync(resolve(root, alt), { recursive: true, force: true });
    mkdirSync(resolve(root, alt), { recursive: true });
    cpSync(resolve(root, "dist"), resolve(root, alt), { recursive: true });
  }
}

const missing = MIRRORS.filter((dir) => !hasIndex(dir));

if (missing.length === 0) {
  console.log("[postinstall] Build output already present — skipping build.");
  process.exit(0);
}

// A cached/partial state: dist exists but a mirror is missing (this is what
// broke Render auto-deploys — publish dir "e.g.build" absent while "dist"
// survived from cache). Cheap fix: re-mirror WITHOUT rebuilding.
if (hasIndex("dist")) {
  mirrorDist();
  console.log(`[postinstall] ✔ Re-mirrored missing output (${missing.join(", ")}).`);
  process.exit(0);
}

console.log("[postinstall] Building production bundle (vite build)…");
execSync("npx vite build", { stdio: "inherit", cwd: root });

if (!hasIndex("dist")) {
  console.error("[postinstall] vite build did not produce dist/index.html");
  process.exit(1);
}

// Mirror dist → build so a Render service created with publish dir "build"
// also succeeds without any dashboard change. Also covers the common typo
// "e.g.build" (the placeholder text pasted literally into the field).
mirrorDist();
console.log("[postinstall] ✔ Built and mirrored to dist/, build/, e.g.build/");
