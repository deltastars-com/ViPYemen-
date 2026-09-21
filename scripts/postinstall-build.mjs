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
import { resolve } from "node:path";

const root = process.cwd();
const hasIndex = (dir) => existsSync(resolve(root, dir, "index.html"));

// Skip during development installs if a fresh build already exists.
if (hasIndex("dist") || hasIndex("build") || hasIndex("e.g.build")) {
  console.log("[postinstall] Build output already present — skipping build.");
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
for (const alt of ["build", "e.g.build"]) {
  rmSync(resolve(root, alt), { recursive: true, force: true });
  mkdirSync(resolve(root, alt), { recursive: true });
  cpSync(resolve(root, "dist"), resolve(root, alt), { recursive: true });
}
console.log("[postinstall] ✔ Built and mirrored to dist/, build/, e.g.build/");
