// Knowledge AI client for ViP Yemen assistant.
//
// Single professional knowledge engine: Gemini (Google Generative Language
// REST API, generativelanguage.googleapis.com). Plain REST fetch — no SDKs,
// so no internal SDK credentials ever ship in the built JS bundle.
//
// Model resilience: Google rotates model names (old models like
// gemini-2.0-flash return HTTP 404 once deprecated). The client therefore
// tries the models in GEMINI_MODELS order and automatically falls forward
// to the next available model when the current one is gone — so the
// assistant keeps working as Google evolves its lineup.
//
// Usage: import { knowledgeAI } from "@/lib/gemini";
// Requires: VITE_GEMINI_KEY in the build environment.

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

export type GeminiResult =
  | { text: string }
  | { error: string };

export type KnowledgeAnswer =
  | { text: string; provider: "gemini" }
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

export async function geminiGenerate(prompt: string, options?: { model?: string; maxTokens?: number }): Promise<GeminiResult> {
  const apiKey = geminiKey();
  if (!apiKey) {
    return { error: "[gemini] مفتاح VITE_GEMINI_KEY غير مضبوط — أضِفه في إعدادات البناء لتفعيل المساعد الذكي." };
  }

  const requested = options?.model ?? "";
  const candidates = requested
    ? [requested, ...modelCandidates()]
    : modelCandidates();

  let lastError = "";
  for (const modelName of candidates) {
    const url = `${GEMINI_API_BASE}/${modelName}:generateContent?key=${apiKey}`;
    try {
      const res = await fetch(url, {
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
        // Anything else (invalid key, quota…) is a real failure — surface it.
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

      return { text: candidate.content.parts[0].text };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      lastError = `[gemini] فشل الاتصال: ${message}`;
    }
  }

  return { error: lastError || "[gemini] تعذر الوصول إلى محرك المعرفة" };
}

/** Unified knowledge engine — Gemini only, with automatic model fallback. */
export const knowledgeAI = {
  async answer(question: string): Promise<KnowledgeAnswer> {
    const prompt =
      `أنت مساعد ذكي لمنصة ViP Yemen الشاملة (التوظيف، التسويق العقاري، التسويق الإلكتروني، البرمجيات، العروض، الإعلانات).أجب بالعربية، موجز ودقيق:\n\n${question}`;

    const gm = await geminiGenerate(prompt, { maxTokens: 1024 });
    if ("text" in gm) return { text: gm.text, provider: "gemini" };
    return { error: gm.error };
  },
};