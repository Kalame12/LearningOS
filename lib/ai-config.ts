import { AIProvider } from "@/lib/ai-provider";

export const DEFAULT_AI_PROVIDER: AIProvider =
  process.env.DEFAULT_AI_PROVIDER === "gemini" ? "gemini" : "openai";

export const DEFAULT_OPENAI_MODEL = process.env.DEFAULT_OPENAI_MODEL || "gpt-4o-mini";
export const DEFAULT_GEMINI_MODEL = process.env.DEFAULT_GEMINI_MODEL || "gemini-1.5-flash";
export const DEFAULT_OPENROUTER_MODEL = process.env.DEFAULT_OPENROUTER_MODEL || "openai/gpt-4o-mini";

export function resolveAI(provider?: string, model?: string): { provider: AIProvider; model?: string } {
  const normalizedProvider = provider === "gemini" ? "gemini" : provider === "openai" ? "openai" : DEFAULT_AI_PROVIDER;
  if (model && model.trim()) {
    return { provider: normalizedProvider, model: model.trim() };
  }

  return {
    provider: normalizedProvider,
    model: normalizedProvider === "gemini" ? DEFAULT_GEMINI_MODEL : DEFAULT_OPENAI_MODEL,
  };
}
