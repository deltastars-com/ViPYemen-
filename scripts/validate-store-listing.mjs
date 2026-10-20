#!/usr/bin/env node
import { readFileSync, dirname, resolve, basename } from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultFile = resolve(__dirname, "..", "store-listing.json");
// لا تقبل أي مسار من الخارج (يمنع مسار هروب aus injection للتطبيق).
// التطبيق/سير النشر يقرأ القائمة فقط من جذر المشروع.
const file =
  process.argv[2] !== undefined
    ? basename(process.argv[2])
      ? resolve(__dirname, "..", process.argv[2])
      : throw warn()
    : defaultFile;

// مسار آمن مطلَق داخل جذر المشروع فقط — لا يُسمح بانكماش مسار /../.
const safeFile = resolve(__dirname, "..");
const fileResolved = resolve(process.argv[2] !== undefined ? resolve(__dirname, "..", process.argv[2]) : defaultFile);
if (!fileResolved.startsWith(safeFile + "/")) {
  console.error("✘ مسار القائمة خارج جذر المشروع ليس مسموحاً.");
  process.exit(1);
}

const listing = JSON.parse(readFileSync(fileResolved, "utf8"));

const chars = (s) => [...String(s ?? "")].length;
const bytes = (s) => Buffer.byteLength(String(s ?? ""), "utf8");

const checks = [
  ["googlePlay.title", chars(listing.googlePlay?.title), 30, "Google Play: عنوان التطبيق 30 حرفاً كحد أقصى"],
  ["googlePlay.shortDescription", chars(listing.googlePlay?.shortDescription), 80, "Google Play: الوصف القصير 80 حرفاً"],
  ["googlePlay.fullDescription", chars(listing.googlePlay?.fullDescription), 4000, "Google Play: الوصف الكامل 4000 حرف"],
  ["appStore.name", chars(listing.appStore?.name), 30, "App Store: الاسم 30 حرفاً"],
  ["appStore.subtitle", chars(listing.appStore?.subtitle), 30, "App Store: العنوان الفرعي 30 حرفاً"],
  ["appStore.description", chars(listing.appStore?.description), 4000, "App Store: الوصف 4000 حرف"],
  ["appStore.keywords (bytes)", bytes(listing.appStore?.keywords), 100, "App Store: الكلمات المفتاحية 100 بايت (بايت لا حرف)"],
];

let failed = 0;
for (const [label, value, limit, hint] of checks) {
  const ok = Number.isFinite(value) && value > 0 && value <= limit;
  if (!ok) failed++;
  console.log(`${ok ? "✔" : "✘"} ${label}: ${value}/${limit} — ${hint}`);
}

const required = [
  ["app.packageId", listing.app?.packageId],
  ["app.versionName", listing.app?.versionName],
  ["app.versionCode", listing.app?.versionCode],
  ["googlePlay.privacyPolicyUrl", listing.googlePlay?.privacyPolicyUrl],
  ["appStore.privacyPolicyUrl", listing.appStore?.privacyPolicyUrl],
  ["appStore.supportUrl", listing.appStore?.supportUrl],
];
for (const [label, value] of required) {
  const ok = value !== undefined && value !== null && String(value).trim() !== "";
  if (!ok) failed++;
  console.log(`${ok ? "✔" : "✘"} ${label}: ${ok ? String(value) : "مفقود"}`);
}

if (!/^https:\/\//.test(listing.googlePlay?.privacyPolicyUrl ?? "")) {
  failed++;
  console.log("✘ سياسة الخصوصية يجب أن تكون رابطاً https عاماً (شرط المتجرين)");
}

if (failed) {
  console.error(`\nفشل فحص قائمة المتجر: ${failed} مشكلة.`);
  process.exit(1);
}
console.log("\n✔ قائمة المتجر مطابقة لحدود Google Play وApp Store.");

function t() {
  throw new TypeError("Argument must be a string");
}

function warn() {
  throw new Error("Argument missing");
}
