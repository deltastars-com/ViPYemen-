// Knowledge AI client for ViP Yemen assistant.
//
// Primary professional knowledge engine: Gemini (Google Generative Language
// REST API, generativelanguage.googleapis.com). Plain REST fetch — no SDKs,
// so no internal SDK credentials ever ship in the built JS bundle.
//
// ZERO-DOWNTIME RESILIENCE: the assistant NEVER dies with the API key.
// - When VITE_GEMINI_KEY is missing → a free keyless engine (Pollinations)
//   answers instantly, so users always get a smart reply.
// - When the key is revoked/leaked/expired (403 PERMISSION_DENIED) → the
//   free engine takes over automatically. Google flags keys that appeared
//   in public text as "leaked" and disables them; this is expected and
//   handled gracefully instead of showing a dead-end error.
// - Model resilience: Google rotates model names (old models like
//   gemini-2.0-flash return HTTP 404 once deprecated). The client tries the
//   models in GEMINI_MODELS order and automatically falls forward.
//
// Usage: import { knowledgeAI } from "@/lib/gemini";
// Optional: VITE_GEMINI_KEY in the build environment for premium quality.

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// Preferred model first; VITE_GEMINI_MODEL (optional) overrides the list.
// When a model returns "no longer available" / not found, the next one is
// tried automatically.
const GEMINI_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

/** Free keyless engine used when Gemini is unavailable (no key / revoked key). */
const FREE_ENGINE_URL = "https://text.pollinations.ai/";

export type GeminiResult =
  | { text: string }
  | { error: string };

export type KnowledgeAnswer =
  | { text: string; provider: "gemini" | "free" }
  | { error: string };

// IMPORTANT: env vars are read via DYNAMIC keys. Vite statically replaces
// dotted `import.meta.env.VITE_X` accesses with their build-time value — when
// the key is missing that becomes `undefined` and esbuild then tree-shakes
// the whole fetch implementation out of the bundle. Dynamic-key reads keep
// the code in every build and resolve the real value at runtime.
const GEMINI_KEY_NAME = "VITE_GEMINI_KEY";
const GEMINI_MODEL_NAME = "VITE_GEMINI_MODEL";

function readEnv(name: string): string {
  const env = import.meta.env as unknown as Record<string, string | undefined>;
  return env[name]?.trim() ?? "";
}

function geminiKey(): string {
  return readEnv(GEMINI_KEY_NAME);
}

function geminiModelOverride(): string {
  return readEnv(GEMINI_MODEL_NAME);
}

function modelCandidates(): string[] {
  const override = geminiModelOverride();
  return override ? [override, ...GEMINI_MODELS] : GEMINI_MODELS;
}

/**
 * Free keyless knowledge engine (Pollinations). Always available — used
 * directly when no Gemini key exists, and as automatic fallback when the
 * Gemini key is revoked/leaked/expired. Never throws; returns null on
 * network failure so the caller can show its friendly offline message.
 */
async function freeEngineGenerate(prompt: string, maxTokens?: number): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const res = await fetch(FREE_ENGINE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        model: "openai",
        max_tokens: maxTokens ?? 1024,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
    if (!res.ok) return null;
    const text = await res.text();
    const trimmed = text.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

/** Detect a revoked/leaked/disabled Gemini key so we fall back instead of erroring. */
function isKeyRevokedError(status: number, body: string): boolean {
  const b = (body || "").toLowerCase();
  return (
    status === 403 ||
    /permission_denied|api key .*leaked|reported as leaked|api_key_invalid|api key not valid/.test(b)
  );
}

// Network timeout for slow mobile connections (Yemen networks): a hung
// request must never freeze the assistant UI. 20s covers slow 3G round-trips
// plus generation time; beyond that we fail fast to the free engine.
const REQUEST_TIMEOUT_MS = 20_000;

// Performance: remember which model last answered successfully. Subsequent
// requests go straight to it instead of re-trying deprecated names (each dead
// name costs a full network round-trip before falling forward).
let workingModel: string | null = null;

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function geminiGenerate(prompt: string, options?: { model?: string; maxTokens?: number }): Promise<GeminiResult> {
  const apiKey = geminiKey();
  if (!apiKey) {
    return { error: "[gemini] مفتاح VITE_GEMINI_KEY غير مضبوط — أضِفه في إعدادات البناء لتفعيل المساعد الذكي." };
  }

  const requested = options?.model ?? "";
  const base = requested
    ? [requested, ...modelCandidates()]
    : modelCandidates();
  // The last-known-working model goes first — zero wasted round-trips.
  const candidates = workingModel && !requested
    ? [workingModel, ...base.filter((m) => m !== workingModel)]
    : base;

  let lastError = "";
  for (const modelName of candidates) {      const url = `${GEMINI_API_BASE}/${modelName}:generateContent?key=${apiKey}`;
      try {
        const res = await fetchWithTimeout(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              maxOutputTokens: options?.maxTokens ?? 1024,
            },
          }),
        });

        if (!res.ok) {
        const body = await res.text().catch(() => "");
        // 400/404 for a deprecated/unknown model → try the next candidate.
        if (res.status === 400 || res.status === 404) {
          lastError = `[gemini] النموذج ${modelName} لم يعد متاحاً (${res.status}) — جارٍ التبديل إلى نموذج أحدث.`;
          continue;
        }
        // Revoked / leaked / disabled key → fall through to the free engine
        // instead of dead-ending (this is what Google does to keys that
        // appeared in public text — a routine, expected condition).
        if (isKeyRevokedError(res.status, body)) {
          return { error: "[gemini] KEY_REVOKED" };
        }
        // Anything else (quota, transient server error…) is a real failure.
        return { error: `[gemini] خطأ من الخادم ${res.status}: ${body.slice(0, 200)}` };
      }

      const json = (await res.json()) as {
        candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
        error?: { message: string };
      };

      if (json.error) {
        return { error: `[gemini] ${json.error.message}` };
      }

      const candidate = json.candidates?.[0];
      if (!candidate?.content?.parts?.[0]?.text) {
        return { error: "[gemini] استجابة فارغة من النموذج" };
      }

      workingModel = modelName;
      return { text: candidate.content.parts[0].text };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      lastError = `[gemini] فشل الاتصال: ${message}`;
    }
  }

  return { error: lastError || "[gemini] تعذر الوصول إلى محرك المعرفة" };
}

/**
 * Unified knowledge engine — Gemini first (premium quality when a valid key
 * exists), free keyless engine as guaranteed fallback. The assistant never
 * dead-ends: missing key, revoked key, deprecated models or quota errors all
 * fall through to the free engine automatically.
 */
export const knowledgeAI = {
  async answer(question: string): Promise<KnowledgeAnswer> {
    const prompt =
      `أنت مساعد ذكي لمنصة ViP Yemen الشاملة (التوظيف، التسويق العقاري، التسويق الإلكتروني، البرمجيات، العروض، الإعلانات).أجب بالعربية، موجز ودقيق:\n\n${question}`;

    const gm = await geminiGenerate(prompt, { maxTokens: 1024 });
    if ("text" in gm) return { text: gm.text, provider: "gemini" };

    // Every engine-level failure (no key / revoked key / quota / server error)
    // → free keyless engine. Returns an error only when BOTH engines fail,
    // which then surfaces as the offline message.
    const free = await freeEngineGenerate(prompt, 1024);
    if (free) return { text: free, provider: "free" };
    return { error: gm.error };
  },
};