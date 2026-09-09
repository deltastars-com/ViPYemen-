// Knowledge AI client for ViP Yemen assistant.
//
// Two professional knowledge engines, fully integrated with automatic
// failover:
//   1. DeepSeek (deepseek-chat — OpenAI-compatible API, api.deepseek.com)
//   2. Gemini (Google Generative Language REST API, generativelanguage.googleapis.com)
//
// Uses plain REST fetch (no SDKs) so no internal SDK credentials ever ship
// in the built JS bundle. If a provider key is missing or the request
// fails, the engine falls back to the other provider automatically.
//
// Usage: import { knowledgeAI } from "@/lib/gemini";
// Requires: VITE_GEMINI_KEY and/or VITE_DEEPSEEK_KEY in the build environment.

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEEPSEEK_API_BASE = "https://api.deepseek.com/chat/completions";

export type GeminiResult =
  | { text: string }
  | { error: string };

export type KnowledgeAnswer =
  | { text: string; provider: "deepseek" | "gemini" }
  | { error: string };

function geminiKey(): string {
  return (import.meta.env.VITE_GEMINI_KEY as string | undefined)?.trim() ?? "";
}

function deepseekKey(): string {
  return (import.meta.env.VITE_DEEPSEEK_KEY as string | undefined)?.trim() ?? "";
}

export async function geminiGenerate(prompt: string, options?: { model?: string; maxTokens?: number }): Promise<GeminiResult> {
  const apiKey = geminiKey();
  if (!apiKey) {
    return { error: "[gemini] VITE_GEMINI_KEY missing — install it in the build environment to enable the assistant AI features." };
  }

  const modelName = options?.model ?? "gemini-2.0-flash";
  const url = `${GEMINI_API_BASE}/${modelName}:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: options?.maxTokens ?? 1024,
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { error: `[gemini] API error ${res.status}: ${body.slice(0, 200)}` };
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
      return { error: "[gemini] empty response from model" };
    }

    return { text: candidate.content.parts[0].text };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `[gemini] request failed: ${message}` };
  }
}

/** DeepSeek (deepseek-chat) via its OpenAI-compatible chat completions API. */
export async function deepseekGenerate(prompt: string, options?: { model?: string; maxTokens?: number }): Promise<GeminiResult> {
  const apiKey = deepseekKey();
  if (!apiKey) {
    return { error: "[deepseek] VITE_DEEPSEEK_KEY missing — install it in the build environment to enable DeepSeek." };
  }

  const modelName = options?.model ?? "deepseek-chat";

  try {
    const res = await fetch(DEEPSEEK_API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: "system",
            content:
              "أنت مساعد ذكي لمنصة ViP Yemen الشاملة (التوظيف، التسويق العقاري، التسويق الإلكتروني، البرمجيات، العروض، الإعلانات). أجب بالعربية، موجز ودقيق وموثوق.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: options?.maxTokens ?? 1024,
        stream: false,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { error: `[deepseek] API error ${res.status}: ${body.slice(0, 200)}` };
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };

    if (json.error?.message) {
      return { error: `[deepseek] ${json.error.message}` };
    }

    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      return { error: "[deepseek] empty response from model" };
    }

    return { text: content };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `[deepseek] request failed: ${message}` };
  }
}

export const gemini = {
  // Simple question-answering helper for the assistant page.
  async answer(question: string): Promise<GeminiResult> {
    const prompt =
      `أنت مساعد ذكي لمنصة ViP Yemen الشاملة (التوظيف، التسويق العقاري، التسويق الإلكتروني، البرمجيات، العروض، الإعلانات).أجب بالعربية، موجز ودقيق:\n\n${question}`;
    return geminiGenerate(prompt, { model: "gemini-2.0-flash", maxTokens: 1024 });
  },
};

/** Unified knowledge engine: DeepSeek first, automatic Gemini failover. */
export const knowledgeAI = {
  async answer(question: string): Promise<KnowledgeAnswer> {
    const prompt =
      `أنت مساعد ذكي لمنصة ViP Yemen الشاملة (التوظيف، التسويق العقاري، التسويق الإلكتروني، البرمجيات، العروض، الإعلانات).أجب بالعربية، موجز ودقيق:\n\n${question}`;

    // Engine 1: DeepSeek (when its key is configured)
    if (deepseekKey()) {
      const ds = await deepseekGenerate(prompt, { model: "deepseek-chat", maxTokens: 1024 });
      if ("text" in ds) return { text: ds.text, provider: "deepseek" };
      // Fall through to Gemini on any DeepSeek failure
    }

    // Engine 2: Gemini
    const gm = await geminiGenerate(prompt, { model: "gemini-2.0-flash", maxTokens: 1024 });
    if ("text" in gm) return { text: gm.text, provider: "gemini" };

    // Both engines unavailable
    const dsMsg = deepseekKey() ? "" : "مفتاح DeepSeek غير مضبوط. ";
    return { error: `${dsMsg}${gm.error}` };
  },
};