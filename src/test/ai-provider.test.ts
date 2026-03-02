import { describe, it, expect, vi } from 'vitest';
import { AIRouter, isRetryable } from '../lib/ai/provider';
import type { AIProvider } from '../lib/ai/provider';
import type { FaceAnalysis, AnalysisOptions, QuestionnaireData } from '../types';

// Helper to create a mock provider
function createMockProvider(overrides: Partial<{
  analyzeFace: ReturnType<typeof vi.fn>;
  generateConsultation: ReturnType<typeof vi.fn>;
}> = {}): AIProvider {
  return {
    analyzeFace: overrides.analyzeFace ?? vi.fn(),
    generateConsultation: overrides.generateConsultation ?? vi.fn(),
  } as unknown as AIProvider;
}

// Helper to create an error with a status code
function createErrorWithStatus(message: string, status: number): Error {
  const error = new Error(message);
  (error as any).status = status;
  return error;
}

const mockFaceAnalysis: FaceAnalysis = {
  faceShape: 'oval',
  confidence: 0.95,
  proportions: {
    foreheadRatio: 0.33,
    cheekboneRatio: 0.35,
    jawRatio: 0.32,
    faceLength: 1.4,
  },
  hairAssessment: {
    type: 'straight',
    texture: 'fine',
    density: 'medium',
    currentStyle: 'short sides long top',
  },
};

describe('AIRouter', () => {
  describe('execute', () => {
    it('returns primary result when primary succeeds', async () => {
      const primary = createMockProvider();
      const fallback = createMockProvider();

      const router = new AIRouter(primary, fallback);

      const task = vi.fn().mockResolvedValue(mockFaceAnalysis);
      const result = await router.execute(task);

      expect(result).toEqual(mockFaceAnalysis);
      expect(task).toHaveBeenCalledTimes(1);
      expect(task).toHaveBeenCalledWith(primary);
    });

    it('retries primary once on retryable error then succeeds', async () => {
      const primary = createMockProvider();
      const fallback = createMockProvider();

      const router = new AIRouter(primary, fallback);

      let callCount = 0;
      const task = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw createErrorWithStatus('Rate limited', 429);
        }
        return Promise.resolve(mockFaceAnalysis);
      });

      const result = await router.execute(task);

      expect(result).toEqual(mockFaceAnalysis);
      expect(task).toHaveBeenCalledTimes(2);
      // Both calls should use primary
      expect(task).toHaveBeenNthCalledWith(1, primary);
      expect(task).toHaveBeenNthCalledWith(2, primary);
    });

    it('falls back to fallback when primary fails retryable twice', async () => {
      const primary = createMockProvider();
      const fallback = createMockProvider();

      const router = new AIRouter(primary, fallback);

      let callCount = 0;
      const task = vi.fn().mockImplementation((provider: any) => {
        callCount++;
        if (provider === primary) {
          throw createErrorWithStatus('Server error', 500);
        }
        return Promise.resolve(mockFaceAnalysis);
      });

      const result = await router.execute(task);

      expect(result).toEqual(mockFaceAnalysis);
      expect(task).toHaveBeenCalledTimes(3);
      expect(task).toHaveBeenNthCalledWith(1, primary);
      expect(task).toHaveBeenNthCalledWith(2, primary);
      expect(task).toHaveBeenNthCalledWith(3, fallback);
    });

    it('throws immediately on non-retryable error without retry or fallback', async () => {
      const primary = createMockProvider();
      const fallback = createMockProvider();

      const router = new AIRouter(primary, fallback);

      const task = vi.fn().mockImplementation(() => {
        throw createErrorWithStatus('Unauthorized', 401);
      });

      await expect(router.execute(task)).rejects.toThrow('Unauthorized');
      expect(task).toHaveBeenCalledTimes(1);
    });

    it('throws error from fallback when both providers fail', async () => {
      const primary = createMockProvider();
      const fallback = createMockProvider();

      const router = new AIRouter(primary, fallback);

      const task = vi.fn().mockImplementation(() => {
        throw createErrorWithStatus('Service unavailable', 503);
      });

      await expect(router.execute(task)).rejects.toThrow('Service unavailable');
      // primary (1st try) + primary (retry) + fallback = 3
      expect(task).toHaveBeenCalledTimes(3);
    });

    it('throws configuration error when both providers are null', async () => {
      const router = new AIRouter(null, null);

      const task = vi.fn().mockResolvedValue(mockFaceAnalysis);

      await expect(router.execute(task)).rejects.toThrow();
    });
  });
});

describe('isRetryable', () => {
  it('returns true for status 429 (rate limit)', () => {
    expect(isRetryable(createErrorWithStatus('Rate limited', 429))).toBe(true);
  });

  it('returns true for status 500 (server error)', () => {
    expect(isRetryable(createErrorWithStatus('Internal server error', 500))).toBe(true);
  });

  it('returns true for status 502 (bad gateway)', () => {
    expect(isRetryable(createErrorWithStatus('Bad gateway', 502))).toBe(true);
  });

  it('returns true for status 503 (service unavailable)', () => {
    expect(isRetryable(createErrorWithStatus('Service unavailable', 503))).toBe(true);
  });

  it('returns true for timeout error message', () => {
    const error = new Error('Request timeout');
    expect(isRetryable(error)).toBe(true);
  });

  it('returns true for ECONNRESET error', () => {
    const error = new Error('ECONNRESET');
    expect(isRetryable(error)).toBe(true);
  });

  it('returns false for status 401 (unauthorized)', () => {
    expect(isRetryable(createErrorWithStatus('Unauthorized', 401))).toBe(false);
  });

  it('returns false for status 403 (forbidden)', () => {
    expect(isRetryable(createErrorWithStatus('Forbidden', 403))).toBe(false);
  });

  it('returns false for status 400 (bad request)', () => {
    expect(isRetryable(createErrorWithStatus('Bad request', 400))).toBe(false);
  });

  it('returns false for status 404 (not found)', () => {
    expect(isRetryable(createErrorWithStatus('Not found', 404))).toBe(false);
  });

  it('returns false for generic Error without status', () => {
    expect(isRetryable(new Error('Something went wrong'))).toBe(false);
  });

  it('returns false for non-Error values', () => {
    expect(isRetryable('string error')).toBe(false);
    expect(isRetryable(null)).toBe(false);
    expect(isRetryable(undefined)).toBe(false);
  });
});
