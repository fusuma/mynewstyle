import type { SupabaseClient } from '@supabase/supabase-js';
import type { AICallLog } from '@/types';

// In-memory AI call log store (database persistence in Story 4.7)
let aiCallLogs: AICallLog[] = [];

// Known pricing per 1 million tokens (USD)
const PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  'gemini-2.5-flash': { inputPer1M: 0.15, outputPer1M: 0.60 },
  'gpt-4o': { inputPer1M: 2.50, outputPer1M: 10.00 },
  // Gemini 3 Pro Image uses fixed per-image pricing (~$0.134/image at 1K-2K resolution).
  // Approximated as ~1,120 output tokens at $120/M = $0.1344 = ~13 cents per image.
  // Input tokens set to 0 (image gen tasks don't bill input tokens separately).
  'gemini-3-pro-image-preview': { inputPer1M: 0, outputPer1M: 120.00 },
};

/**
 * Fixed cost per image generation for Kie.ai Nano Banana 2.
 * Kie.ai charges per image (not per token). Estimated ~$0.04 per image.
 * Input/output tokens are set to 0 for image generation tasks.
 */
export const KIE_COST_PER_IMAGE_CENTS = 4;

/**
 * Approximate cost per image for Gemini 3 Pro Image (1K-2K resolution).
 * ~$0.134/image = 13 cents. This is 2.5-6x more expensive than Kie.ai.
 * Calculated as: ~1,120 output tokens * ($120 / 1,000,000) = $0.1344 ≈ 13 cents.
 */
export const GEMINI_PRO_IMAGE_COST_PER_IMAGE_CENTS = 13;

/**
 * Approximate output token count for Gemini 3 Pro Image generation.
 * Used for cost tracking when logging via persistAICallLog().
 */
export const GEMINI_PRO_IMAGE_OUTPUT_TOKENS = 1120;

/**
 * Calculate cost in cents for an AI call based on token usage.
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING[model];
  if (!pricing) return 0;

  const inputCostUSD = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCostUSD = (outputTokens / 1_000_000) * pricing.outputPer1M;
  return (inputCostUSD + outputCostUSD) * 100; // convert to cents
}

/**
 * Log an AI call with auto-generated id and timestamp.
 */
export function logAICall(
  log: Omit<AICallLog, 'id' | 'timestamp'>
): AICallLog {
  const entry: AICallLog = {
    ...log,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  aiCallLogs.push(entry);
  return entry;
}

/**
 * Get all AI call logs.
 */
export function getAICallLogs(): AICallLog[] {
  return aiCallLogs;
}

/**
 * Clear all AI call logs (for testing).
 */
export function clearAICallLogs(): void {
  aiCallLogs = [];
}

/**
 * Persist an AI call log entry to the ai_calls Supabase table.
 * This is a best-effort operation — errors are logged but not thrown.
 * Database persistence for Story 4.7.
 */
export async function persistAICallLog(
  supabase: SupabaseClient,
  consultationId: string,
  log: AICallLog
): Promise<void> {
  const { error } = await supabase.from('ai_calls').insert({
    id: log.id,
    consultation_id: consultationId,
    provider: log.provider,
    model: log.model,
    task: log.task,
    input_tokens: log.inputTokens,
    output_tokens: log.outputTokens,
    cost_cents: log.costCents,
    latency_ms: log.latencyMs,
    success: log.success,
    error: log.error ?? null,
    timestamp: log.timestamp,
  });
  if (error) {
    console.error('[AI Cost Tracking] Failed to persist AI call:', error);
  }
}
