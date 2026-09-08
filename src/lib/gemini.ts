// Gemini AI client for ViP Yemen assistant.
// Usage: import { gemini } from "@/lib/gemini";
// The module wraps Google Generative AI with safe defaults: never throws
// unhandled exceptions in the React tree, returns structured errors, and
// only initializes when VITE_GEMINI_KEY is present.
async function getGeminiClient() {
  const key = (import.meta.env.VITE_GEMINI_KEY as string | undefined)?.trim();
  if (!key) {
    return null;
  }
  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    return new GoogleGenerativeAI(key);
  } catch {
    console.warn("[gemini] @google/generative-ai not installed — install it to enable the assistant AI features.");
    return null;
  }
}

export type GeminiResult =
  | { text: string }
  | { error: string };

export async function geminiGenerate(prompt: string, options?: { model?: string; maxTokens?: number }): Promise<GeminiResult> {
  const client = await getGeminiClient();
  if (!client) {
    return { error: "[gemini] client not available — VITE_GEMINI_KEY missing or @google/generative-ai not installed." };
  }
  const modelName = options?.model ?? "gemini-2.0-flash";
  try {
    const model = client.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return { text };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `[gemini] request failed: ${message}` };
  }
}

export const gemini = {
  // Simple question-answering helper for the assistant page.
  async answer(question: string) {
    const prompt = `أنت مساعد ذكي لمنصة ViP Yemen الشاملة (التوظيف، التسويق العقاري، التسويق الإلكتروني، البرمجيات، العروض، الإعلانات).領答ة بالعربية، موجز ودقيق:\n\n${question}`;
    return geminiGenerate(prompt, { model: "gemini-2.0-flash", maxTokens: 1024 });
  },
};
