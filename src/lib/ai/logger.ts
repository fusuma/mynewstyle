import type { AICallLog } from '@/types';

// In-memory AI call log store (database persistence in Story 4.7)
let aiCallLogs: AICallLog[] = [];

// Known pricing per 1 million tokens (USD)
const PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  'gemini-2.5-flash': { inputPer1M: 0.15, outputPer1M: 0.60 },
  'gpt-4o': { inputPer1M: 2.50, outputPer1M: 10.00 },
};

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
