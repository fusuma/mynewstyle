import { describe, it, expect, beforeEach } from 'vitest';
import { logAICall, getAICallLogs, clearAICallLogs, calculateCost } from '../lib/ai/logger';

describe('AI Logger', () => {
  beforeEach(() => {
    clearAICallLogs();
  });

  describe('logAICall', () => {
    it('creates log entry with generated id and timestamp', () => {
      const log = logAICall({
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        task: 'face-analysis',
        inputTokens: 100,
        outputTokens: 50,
        costCents: 0.5,
        latencyMs: 1200,
        success: true,
      });

      expect(log.id).toBeDefined();
      expect(typeof log.id).toBe('string');
      expect(log.id.length).toBeGreaterThan(0);
      expect(log.timestamp).toBeDefined();
      // ISO string format check
      expect(new Date(log.timestamp).toISOString()).toBe(log.timestamp);
      expect(log.provider).toBe('gemini');
      expect(log.model).toBe('gemini-2.5-flash');
      expect(log.task).toBe('face-analysis');
      expect(log.inputTokens).toBe(100);
      expect(log.outputTokens).toBe(50);
      expect(log.costCents).toBe(0.5);
      expect(log.latencyMs).toBe(1200);
      expect(log.success).toBe(true);
    });

    it('creates log entry with error field when provided', () => {
      const log = logAICall({
        provider: 'openai',
        model: 'gpt-4o',
        task: 'consultation',
        inputTokens: 200,
        outputTokens: 0,
        costCents: 0,
        latencyMs: 5000,
        success: false,
        error: 'Rate limit exceeded',
      });

      expect(log.success).toBe(false);
      expect(log.error).toBe('Rate limit exceeded');
    });
  });

  describe('getAICallLogs', () => {
    it('returns all logged entries in order', () => {
      logAICall({
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        task: 'face-analysis',
        inputTokens: 100,
        outputTokens: 50,
        costCents: 0.5,
        latencyMs: 1200,
        success: true,
      });

      logAICall({
        provider: 'openai',
        model: 'gpt-4o',
        task: 'consultation',
        inputTokens: 200,
        outputTokens: 100,
        costCents: 1.5,
        latencyMs: 2000,
        success: true,
      });

      const logs = getAICallLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].provider).toBe('gemini');
      expect(logs[1].provider).toBe('openai');
    });

    it('returns empty array when no logs exist', () => {
      const logs = getAICallLogs();
      expect(logs).toHaveLength(0);
      expect(logs).toEqual([]);
    });
  });

  describe('clearAICallLogs', () => {
    it('empties the log array', () => {
      logAICall({
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        task: 'face-analysis',
        inputTokens: 100,
        outputTokens: 50,
        costCents: 0.5,
        latencyMs: 1200,
        success: true,
      });

      expect(getAICallLogs()).toHaveLength(1);
      clearAICallLogs();
      expect(getAICallLogs()).toHaveLength(0);
    });
  });

  describe('calculateCost', () => {
    it('returns correct cost in cents for gemini-2.5-flash', () => {
      // Pricing: input $0.15/1M, output $0.60/1M
      // 1000 input tokens: (1000 / 1_000_000) * 0.15 * 100 = 0.015 cents
      // 500 output tokens: (500 / 1_000_000) * 0.60 * 100 = 0.03 cents
      // Total: 0.045 cents
      const cost = calculateCost('gemini-2.5-flash', 1000, 500);
      expect(cost).toBeCloseTo(0.045, 5);
    });

    it('returns correct cost in cents for gpt-4o', () => {
      // Pricing: input $2.50/1M, output $10.00/1M
      // 1000 input tokens: (1000 / 1_000_000) * 2.50 * 100 = 0.25 cents
      // 500 output tokens: (500 / 1_000_000) * 10.00 * 100 = 0.5 cents
      // Total: 0.75 cents
      const cost = calculateCost('gpt-4o', 1000, 500);
      expect(cost).toBeCloseTo(0.75, 5);
    });

    it('returns 0 for zero tokens', () => {
      const cost = calculateCost('gemini-2.5-flash', 0, 0);
      expect(cost).toBe(0);
    });

    it('returns 0 for unknown model', () => {
      const cost = calculateCost('unknown-model', 1000, 500);
      expect(cost).toBe(0);
    });
  });
});
