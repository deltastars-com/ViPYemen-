"use node";

// Server-side knowledge AI for the ViP Yemen assistant.
//
// WHY SERVER-SIDE: Gemini keys sent from the browser are visible in the built
// JS bundle. GitHub Push Protection scans published artifacts and BLOCKS any
// push containing an API key (this is exactly what broke the gh-pages deploy
// when the key was baked in at build time). Running the call here keeps the
// key exclusively in the Convex environment (VITE_GEMINI_KEY is read
// server-side as GEMINI_KEY too) — the client bundle never contains it and
// never triggers secret scanning again.
//
// Resilience mirrors the client engine: model fallback list, revoked-key
// detection, and a hard network timeout. The client falls back to a free
// keyless engine when this action is unreachable.
import { action } from "./_generated/server";
import { v } from "convex/values";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const REQUEST_TIMEOUT_MS = 20_000;

// Current stable Gemini model lineup (per ai.google.dev/gemini-api/docs/models).
// The list tries the newest Flash first and falls forward on 404/400 when
// Google rotates/deprecates a name — so the engine self-heals over time.
const GEMINI_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

function readKey(): string {
  // Same value in both names for convenience — the dashboard env UI uses
  // VITE_GEMINI_KEY, raw server env convention uses GEMINI_KEY.
  return (process.env.GEMINI_KEY ?? process.env.VITE_GEMINI_KEY ?? "").trim();
}

function isKeyRevokedError(status: number, body: string): boolean {
  const b = (body || "").toLowerCase();
  return (
    status === 403 ||
    /permission_denied|api key .*leaked|reported as leaked|api_key_invalid|api key not valid/.test(b)
  );
}

export const answer = action({
  args: { question: v.string(), lang: v.optional(v.string()) },
  handler: async (_ctx, { question, lang }) => {
    const apiKey = readKey();
    if (!apiKey) {
      return { ok: false as const, reason: "NO_KEY" as const };
    }
    if (!question.trim()) {
      return { ok: false as const, reason: "EMPTY" as const };
    }

    const langHint = lang === "en" ? "Answer in English" : "أجب بالعربية";
    const prompt =
      `أنت مساعد ذكي لمنصة ViP Yemen الشاملة (التوظيف، التسويق العقاري، التسويق الإلكتروني، البرمجيات، العروض، الإعلانات). ${langHint}، موجز ودقيق:\n\n${question}`;

    let lastError = "";
    for (const modelName of GEMINI_MODELS) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const res = await fetch(
          `${GEMINI_API_BASE}/${modelName}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: 1024 },
            }),
            signal: controller.signal,
          }
        ).finally(() => clearTimeout(timer));

        if (!res.ok) {
          const body = await res.text().catch(() => "");
          if (res.status === 400 || res.status === 404) {
            lastError = `model ${modelName} unavailable (${res.status})`;
            continue;
          }
          if (isKeyRevokedError(res.status, body)) {
            return { ok: false as const, reason: "KEY_REVOKED" as const };
          }
          return { ok: false as const, reason: `SERVER_${res.status}` as const };
        }

        const json = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          error?: { message?: string };
        };
        if (json.error?.message) {
          lastError = json.error.message;
          continue;
        }
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          lastError = "empty response";
          continue;
        }
        return { ok: true as const, text, model: modelName };
      } catch {
        lastError = "network timeout";
      }
    }

    return { ok: false as const, reason: "ALL_MODELS_FAILED" as const, detail: lastError };
  },
});
