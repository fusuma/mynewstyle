import type { AIProviderConfig } from '@/types';

export interface AIConfig {
  gemini: AIProviderConfig | null;
  openai: AIProviderConfig | null;
}

/**
 * Read and validate AI provider configuration from environment variables.
 * Logs warnings for missing keys (providers are disabled, not fatal).
 */
export function getAIConfig(): AIConfig {
  const geminiKey = process.env.GOOGLE_AI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!geminiKey) {
    console.warn('[AI] GOOGLE_AI_API_KEY not set -- Gemini provider disabled');
  }
  if (!openaiKey) {
    console.warn('[AI] OPENAI_API_KEY not set -- OpenAI provider disabled');
  }

  return {
    gemini: geminiKey ? { apiKey: geminiKey, model: 'gemini-2.5-flash' } : null,
    openai: openaiKey ? { apiKey: openaiKey, model: 'gpt-4o' } : null,
  };
}
