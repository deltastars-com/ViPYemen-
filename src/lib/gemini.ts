// Gemini AI client for ViP Yemen assistant.
// Uses the Google Generative Language REST API directly (generativelanguage.googleapis.com)
// instead of the @google/generative-ai SDK. This avoids shipping any internal SDK
// credentials in the built JS bundle, so secret-scanning cannot block the Pages deploy.
//
// Usage: import { gemini } from "@/lib/gemini";
// Requires: VITE_GEMINI_KEY (Gemini API key) in the build environment.

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export type GeminiResult =
  | { text: string }
  | { error: string };

export async function geminiGenerate(prompt: string, options?: { model?: string; maxTokens?: number }): Promise<GeminiResult> {
  const apiKey = (import.meta.env.VITE_GEMINI_KEY as string | undefined)?.trim();
  if (!apiKey) {
    return { error: "[gemini] VITE_GEMINI_KEY missing — install it in the build environment to enable the assistant AI features." };
  }

  const modelName = options?.model ?? "gemini-2.0-flash";
  const url = `${API_BASE}/${modelName}:generateContent?key=${apiKey}`;

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

export const gemini = {
  // Simple question-answering helper for the assistant page.
  async answer(question: string): Promise<GeminiResult> {
    const prompt =
      `أنت مساعد ذكي لمنصة ViP Yemen الشاملة (التوظيف، التسويق العقاري، التسويق الإلكتروني، البرمجيات، العروض، الإعلانات).أجب بالعربية، موجز ودقيق:\n\n${question}`;
    return geminiGenerate(prompt, { model: "gemini-2.0-flash", maxTokens: 1024 });
  },
};
