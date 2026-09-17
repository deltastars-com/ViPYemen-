// Knowledge AI client for the ViP Yemen assistant.
//
// ENGINE ORDER (never dead-ends):
//   1. Server-side Gemini (Convex action `ai.answer`) — premium quality,
//      key lives ONLY in the Convex environment. The client bundle never
//      contains the key, so GitHub Push Protection / secret scanning can
//      never block a publish again.
//   2. Free keyless engine (Pollinations) — automatic fallback when the
//      server engine has no key, a revoked key, or is unreachable. Users
//      always get an answer.
//
// Usage: import { knowledgeAI } from "@/lib/gemini";

import { convex } from "./convex";
import { api } from "../convex/_generated/api";

// Network timeout for slow mobile connections: a hung request must never
// freeze the assistant UI. 20s covers slow 3G round-trips plus generation.
const REQUEST_TIMEOUT_MS = 20_000;

/** Free keyless engine used whenever the server Gemini engine is unavailable. */
const FREE_ENGINE_URL = "https://text.pollinations.ai/";

export type KnowledgeAnswer =
  | { text: string; provider: "gemini" | "free" }
  | { error: string };

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function freeEngineGenerate(prompt: string, maxTokens?: number): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(FREE_ENGINE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        model: "openai",
        max_tokens: maxTokens ?? 1024,
      }),
    });
    if (!res.ok) return null;
    const text = await res.text();
    const trimmed = text.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

/**
 * Unified knowledge engine. Server Gemini first (premium), free keyless
 * engine as guaranteed fallback — the assistant never dead-ends.
 */
export const knowledgeAI = {
  async answer(question: string, lang?: "ar" | "en"): Promise<KnowledgeAnswer> {
    const prompt =
      `أنت مساعد ذكي لمنصة ViP Yemen الشاملة (التوظيف، التسويق العقاري، التسويق الإلكتروني، البرمجيات، العروض، الإعلانات).أجب بالعربية، موجز ودقيق:\n\n${question}`;

    // 1) Server-side Gemini — key never leaves the Convex environment.
    try {
      const server = (await Promise.race([
        convex.action(api.ai.answer, { question, lang }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), REQUEST_TIMEOUT_MS)
        ),
      ])) as { ok: boolean; text?: string };

      if (server?.ok && server.text) {
        return { text: server.text, provider: "gemini" };
      }
    } catch {
      // unreachable deployment / timeout → free engine below
    }

    // 2) Free keyless engine — guaranteed answer path.
    const free = await freeEngineGenerate(prompt, 1024);
    if (free) return { text: free, provider: "free" };

    return {
      error: "[ai] تعذر الوصول إلى محرك المعرفة — تحقق من الاتصال بالإنترنت.",
    };
  },
};
