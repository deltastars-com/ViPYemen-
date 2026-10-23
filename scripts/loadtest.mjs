#!/usr/bin/env node
/**
 * 🩺 اختبار ضغط حقيقي للمنصة — ViP Yemen
 *
 * يقيس ما يهم المشرف فعلاً: هل المنصة تتحمّل آلاف الطلبات المتزامنة
 * بلا أخطاء ولا بطء؟ الاختبار **قراءة فقط** (لا يكتب ولا يحذف شيئاً):
 *   • GET /health            → فحص صحة الباك اند
 *   • GET /channels          → قنوات المنصة + صحتها
 *   • POST /api/query        → استعلامات الواجهة العامة (طلبات/عروض/إعلانات)
 *   • GET /api/website       → تحميل صفحات الواجهة (HTML + JS)
 *
 * revered التشغيل:
 *   node scripts/loadtest.mjs                     # 2000 طلب · 50 تزامن · 60 ث
 *   node scripts/loadtest.mjs --requests 20000 --concurrency 200 --duration 180
 *   node scripts/loadtest.mjs --url https://my-deployment.convex.cloud
 *
 * المخرجات: زمن الاستجابة p50/p95/p99، معدل الأخطاء،Throughput فعلي/ث،
 * والعدد الأخطاء مع نموذج من سبب كل خطأ.
 *
 * بلا أي اعتماديات خارجية — يستعمل fetch و AbortController المدمجين في Node.
 */
import { performance } from "node:perf_hooks";

// ── المعاملات ────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
function arg(name, fallback) {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] !== undefined ? Number(argv[i + 1]) : fallback;
}
function flag(name, fallback) {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] !== undefined ? argv[i + 1] : fallback;
}

const BASE = (
  flag("url", process.env.LOADTEST_URL || "https://animated-blackbird-438.convex.cloud") || ""
).replace(/\/+$/, "");
const REQUESTS = arg("requests", 2000);
const CONCURRENCY = arg("concurrency", 50);
const DURATION_S = arg("duration", 60);
const TIMEOUT_MS = arg("timeout", 15000);
const WARMUP = arg("warmup", 50);

/** نقاط النهاية المُختبَرة — أوزانها تعكس الاستعمال الحقيقي. */
const ENDPOINTS = [
  // endpoints الاختيارية: إن لم تكن منشورة على هذا النشر (404) فليس خطأً في
  // المنصة، بل denoting أنّ نشر الباك اند لم يشملها بعد.
  { name: "GET /health", weight: 1, optional: true, run: () => fetchJson("GET", "/health") },
  { name: "GET /channels", weight: 1, optional: true, run: () => fetchJson("GET", "/channels") },
  {
    name: "POST /api/query (طلبات)",
    weight: 6,
    run: () => postQuery("submissions:listPublished", { category: "jobs", limit: 30 }),
  },
  {
    name: "POST /api/query (عقارات)",
    weight: 4,
    run: () => postQuery("submissions:listPublished", { category: "real_estate", limit: 30 }),
  },
  { name: "POST /api/query (تسويق)", weight: 4, run: () => postQuery("submissions:listPublished", { category: "emarket", limit: 30 }) },
  { name: "POST /api/query (برمجيات)", weight: 3, run: () => postQuery("submissions:listPublished", { category: "software", limit: 30 }) },
  { name: "POST /api/query (عروض)", weight: 4, run: () => postQuery("offers:listPublished", {}) },
  { name: "POST /api/query (إعلانات)", weight: 3, run: () => postQuery("ads:listActive", {}) },
  { name: "POST /api/query (إحصاءات)", weight: 2, run: () => postQuery("submissions:getPublicStats", {}) },
  { name: "GET /api/website (صفحة)", weight: 2, optional: true, run: () => fetchRaw("GET", "/api/website") },
];

const WEIGHTED = [];
for (const ep of ENDPOINTS) for (let i = 0; i < ep.weight; i++) WEIGHTED.push(ep);

async function fetchRaw(method, path, payload) {
  const started = performance.now();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: payload ? { "Content-Type": "application/json" } : {},
    body: payload ? JSON.stringify(payload) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = await res.text();
  return { ms: performance.now() - started, status: res.status, size: body.length, body };
}

async function fetchJson(method, path) {
  const r = await fetchRaw(method, path);
  return { ...r, ok: r.status >= 200 && r.status < 400, sample: r.body.slice(0, 120) };
}

/** استعلام Convex عام (قراءة فقط) — نفس ما يرسله المتصفح من الواجهة. */
async function postQuery(fn, args) {
  const r = await fetchRaw("POST", "/api/query", {
    path: fn,
    args,
    format: "json",
  });
  return {
    ...r,
    ok: r.status === 200 && r.body.startsWith('{"status":"success"'),
    sample: r.body.slice(0, 120),
  };
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(2)}s` : `${n.toFixed(0)}ms`);

console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🩺 اختبار ضغط المنصة — ViP Yemen                           ║
╚══════════════════════════════════════════════════════════════╝
  الخادم        : ${BASE}
  عدد الطلبات  : ${REQUESTS.toLocaleString("en-US")}
  التزامن      : ${CONCURRENCY} متزامن
  مدة الاختبار : ${DURATION_S}s (أو حتى تنتهي الطلبات)
  مهلة الطلب  : ${TIMEOUT_MS}ms
`);

// ── إحماء قبل القياس (لا يُحتسب) ────────────────────────────────────
process.stdout.write("  إحماء…");
const notDeployed = new Set();
for (let i = 0; i < WARMUP; i++) {
  const ep = WEIGHTED[i % WEIGHTED.length];
  try {
    const r = await ep.run();
    // نقطة اختيارية غير منشورة على هذا النشر: نخرجها من التوزيع حتى لا
    // تستهلك الطلبات وتُضخّم أرقام الإنتاجية الزائفة.
    if (ep.optional === true && r.status === 404) notDeployed.add(ep.name);
  } catch {
    /* تجاهل */
  }
}
console.log(" تم.");
if (notDeployed.size > 0) {
  console.log(`  ⚠️  غير منشورة على هذا النشر (تُستبعد من القياس): ${[...notDeployed].join("، ")}\n`);
} else {
  console.log("");
}

// ── التشغيل الحقيقي ────────────────────────────────────────────────
const latencies = [];
const perEndpoint = new Map();
const errors = new Map();
let sent = 0;
let ok = 0;
let skipped = 0;
let bytes = 0;
const deadline = Date.now() + DURATION_S * 1000;
const startedAll = performance.now();

async function worker(id) {
  for (;;) {
    if (sent >= REQUESTS || Date.now() >= deadline) return;
    const ep = pickEndpoint(id, sent);
    if (!ep) continue;
    sent++;
    try {
      const r = await ep.run();
      latencies.push(r.ms);
      bytes += r.size ?? 0;
      const st = perEndpoint.get(ep.name) ?? { n: 0, err: 0, total: 0, missing: false };
      st.n++;
      st.total += r.ms;
      // نقطة اختيارية غير منشورة على هذا النشر = ملاحظة إعداد لا خطأ منصة
      if (ep.optional === true && r.status === 404) {
        st.missing = true;
        skipped++;
      } else if (!r.ok) {
        st.err++;
        const reason = `${ep.name} → HTTP ${r.status} ${(r.sample ?? "").slice(0, 60)}`;
        errors.set(reason, (errors.get(reason) ?? 0) + 1);
      } else ok++;
      perEndpoint.set(ep.name, st);
    } catch (err) {
      const st = perEndpoint.get(ep.name) ?? { n: 0, err: 0, total: 0 };
      st.n++;
      st.err++;
      perEndpoint.set(ep.name, st);
      const reason = String(err?.message ?? err).slice(0, 80);
      errors.set(reason, (errors.get(reason) ?? 0) + 1);
    }
  }
}

/** اختيار نقطة نهاية من التوزيع الموزون، بعد استبعاد ما ليس منشوراً. */
function pickEndpoint(workerId, seq) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const ep = WEIGHTED[(workerId * 7 + seq + attempt) % WEIGHTED.length];
    if (!notDeployed.has(ep.name)) return ep;
  }
  return undefined;
}

await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i)));

const elapsed = (performance.now() - startedAll) / 1000;
const sorted = [...latencies].sort((a, b) => a - b);
const failed = sent - ok;
const errorRate = (failed / Math.max(1, sent)) * 100;

console.log(`
  ── النتيجة ──────────────────────────────────────────────────
  الطلبات المُنفَّذة : ${sent.toLocaleString("en-US")}
  ناجحة            : ${ok.toLocaleString("en-US")}  (${((ok / Math.max(1, sent)) * 100).toFixed(2)}%)
  فاشلة            : ${failed.toLocaleString("en-US")}  (${errorRate.toFixed(2)}%)
  غير منشورة       : ${skipped.toLocaleString("en-US")}  (نقاط اختيارية 404)
  الزمن الكلي      : ${elapsed.toFixed(1)}s
  الإنتاجية        : ${(sent / elapsed).toFixed(0)} طلب/ثانية
  متوسط الحجم      : ${(bytes / Math.max(1, ok) / 1024).toFixed(1)} KB

  ── زمن الاستجابة ────────────────────────────────────────────
  p50  : ${fmt(percentile(sorted, 50))}
  p90  : ${fmt(percentile(sorted, 90))}
  p95  : ${fmt(percentile(sorted, 95))}
  p99  : ${fmt(percentile(sorted, 99))}
  أقصى : ${fmt(sorted[sorted.length - 1] ?? 0)}

  ── لكل نقطة نهاية ───────────────────────────────────────────
`);

for (const ep of ENDPOINTS) {
  const st = perEndpoint.get(ep.name);
  if (!st) continue;
  const tail = st.missing
    ? "غير منشور على هذا النشر (404)"
    : `أخطاء ${st.err}`;
  console.log(
    `  ${ep.name.padEnd(32)} ${String(st.n).padStart(6)} طلب  ` +
      `متوسط ${fmt(st.total / st.n).padStart(7)}  ${tail}`
  );
}

if (errors.size > 0) {
  console.log(`
  ── أسباب الأخطاء (أكثر ٥) ───────────────────────────────────
`);
  const top = [...errors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  for (const [reason, count] of top) {
    console.log(`  ${String(count).padStart(6)} × ${reason}`);
  }
}

// ── الحكم النهائي ──────────────────────────────────────────────────
const verdict =
  errorRate === 0 && percentile(sorted, 95) < 1500
    ? "✅ ممتاز — بلا أخطاء ولا بطء عند هذا الحمل."
    : errorRate < 1 && percentile(sorted, 95) < 3000
      ? "🟡 مقبول — تحمّل الحمل بلا انهيار، مع تأخير ملحوظ."
      : "🔴 يحتاج تحسين — أخطاء أو زمن استجابة مرتفع.";

console.log(`
  ══ النتيجة النهائية: ${verdict}
`);
process.exit(errorRate > 5 ? 1 : 0);