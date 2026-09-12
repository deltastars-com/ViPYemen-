#!/bin/sh
# ViP Yemen — استيراد مستندات الخزنة إلى قاعدة بيانات Convex
# Imports vault documents from vault-import.local.json into secureDocs.
#
# Usage: sh scripts/vault-import.sh
# Requires ONE of:
#   - a logged-in Convex session (bunx convex login)
#   - CONVEX_DEPLOY_KEY in the environment (bunx convex env set CONVEX_DEPLOY_KEY ...)
set -e

DATA_FILE="vault-import.local.json"

if [ ! -f "$DATA_FILE" ]; then
  echo "!! $DATA_FILE not found (it is gitignored — keep it local)."
  exit 1
fi

command -v bunx >/dev/null 2>&1 || { echo "!! bunx not found — install Bun first"; exit 1; }

echo "==> Importing vault documents into secureDocs (internal, CLI-only) ..."

bun --experimental-vm-modules -e '
const { readFileSync } = await import("node:fs");
const { execFileSync } = await import("node:child_process");

const docs = JSON.parse(readFileSync(process.argv[1], "utf8"));
if (!Array.isArray(docs)) { console.error("!! JSON must be an array of documents"); process.exit(1); }

let added = 0, updated = 0;
for (const doc of docs) {
  const argsJson = JSON.stringify({
    name: String(doc.name),
    description: doc.description ? String(doc.description) : undefined,
    category: String(doc.category ?? "general"),
    isSecret: !!doc.isSecret,
    value: String(doc.value ?? ""),
  });
  const out = execFileSync("bunx", ["convex", "run", "internal", "secureDocs:importDoc", argsJson, "--format", "json"], { encoding: "utf8" });
  let last = null;
  try { last = JSON.parse(out.trim().split("\n").pop()); } catch { last = null; }
  if (last && typeof last === "object") {
    if (last.updated) updated++; else added++;
    console.log((last.updated ? "updated" : "added   ") + "  " + last.id + "  " + doc.name);
  } else {
    console.log("done     " + doc.name);
  }
}
console.log(`==> Done: ${added} added, ${updated} updated.`);
console.log("==> Open /admin → «الخزنة — الوثائق والأسرار» to review.");
' "$DATA_FILE"
