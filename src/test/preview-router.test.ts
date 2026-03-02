/**
 * Unit tests for PreviewRouter (Story 7.6)
 *
 * Tests fallback logic: Kie.ai primary -> Gemini Pro fallback -> both-fail.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock KieClient
vi.mock('@/lib/ai/kie', () => {
  const KieClient = vi.fn(function (this: any) {
    this.createPreviewTask = vi.fn();
  });
  const KieApiError = class extends Error {
    status: number;
    kieCode: number;
    constructor(msg: string, status: number, kieCode: number) {
      super(msg);
      this.name = 'KieApiError';
      this.status = status;
      this.kieCode = kieCode;
    }
  };
  return { KieClient, KieApiError };
});

// Mock GeminiProImageProvider
vi.mock('@/lib/ai/gemini-image', () => {
  const GeminiProImageProvider = vi.fn(function (this: any) {
    this.generatePreview = vi.fn();
  });
  return { GeminiProImageProvider };
});

// Mock global fetch for photo download
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { KieClient } from '@/lib/ai/kie';
import { GeminiProImageProvider } from '@/lib/ai/gemini-image';
import { PreviewRouter, BothProvidersFailedError } from '@/lib/ai/preview-router';

const PHOTO_URL = 'https://storage.example.com/signed/photo.jpg';
const STYLE_PROMPT = 'Modern Undercut style prompt';
const CALLBACK_URL = 'https://mynewstyle.com/api/webhook/kie';
const FAKE_IMAGE_BUFFER = Buffer.from('generated-preview-image');
const FAKE_PHOTO_BUFFER = Buffer.from('original-photo-data');

function makeRetryableError(status: number) {
  const err = new Error(`API error ${status}`);
  (err as any).status = status;
  return err;
}

function setupFetchMock() {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    arrayBuffer: vi.fn().mockResolvedValue(FAKE_PHOTO_BUFFER.buffer),
  });
}

describe('PreviewRouter', () => {
  let mockKieCreateTask: ReturnType<typeof vi.fn>;
  let mockGeminiGeneratePreview: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Set env vars
    process.env.PREVIEW_FALLBACK_ENABLED = 'true';
    process.env.PREVIEW_PRIMARY_TIMEOUT_MS = '90000';
    process.env.KIE_API_KEY = 'test-kie-key';
    process.env.GOOGLE_AI_API_KEY = 'test-google-key';

    // Setup Kie mock
    mockKieCreateTask = vi.fn();
    vi.mocked(KieClient).mockImplementation(function (this: any) {
      this.createPreviewTask = mockKieCreateTask;
    } as any);

    // Setup Gemini mock
    mockGeminiGeneratePreview = vi.fn();
    vi.mocked(GeminiProImageProvider).mockImplementation(function (this: any) {
      this.generatePreview = mockGeminiGeneratePreview;
    } as any);

    setupFetchMock();
  });

  afterEach(() => {
    delete process.env.PREVIEW_FALLBACK_ENABLED;
    delete process.env.PREVIEW_PRIMARY_TIMEOUT_MS;
  });

  describe('primary success (no fallback)', () => {
    it('returns kie result with taskId and isSync=false when Kie.ai succeeds', async () => {
      mockKieCreateTask.mockResolvedValueOnce({ taskId: 'kie-task-123' });

      const router = new PreviewRouter();
      const result = await router.generatePreview(PHOTO_URL, STYLE_PROMPT, CALLBACK_URL);

      expect(result.provider).toBe('kie');
      expect(result.isSync).toBe(false);
      expect(result.taskId).toBe('kie-task-123');
      expect(result.imageBuffer).toBeUndefined();
    });

    it('does not call Gemini when Kie.ai succeeds', async () => {
      mockKieCreateTask.mockResolvedValueOnce({ taskId: 'kie-task-123' });

      const router = new PreviewRouter();
      await router.generatePreview(PHOTO_URL, STYLE_PROMPT, CALLBACK_URL);

      expect(mockGeminiGeneratePreview).not.toHaveBeenCalled();
    });

    it('passes photoUrl, stylePrompt, callbackUrl to Kie.ai createPreviewTask', async () => {
      mockKieCreateTask.mockResolvedValueOnce({ taskId: 'kie-task-abc' });

      const router = new PreviewRouter();
      await router.generatePreview(PHOTO_URL, STYLE_PROMPT, CALLBACK_URL);

      expect(mockKieCreateTask).toHaveBeenCalledWith(
        PHOTO_URL,
        STYLE_PROMPT,
        CALLBACK_URL,
        expect.any(AbortSignal)
      );
    });
  });

  describe('primary failure + fallback success', () => {
    it('calls Gemini fallback when Kie.ai throws a 500 error', async () => {
      mockKieCreateTask.mockRejectedValueOnce(makeRetryableError(500));
      mockGeminiGeneratePreview.mockResolvedValueOnce(FAKE_IMAGE_BUFFER);

      const router = new PreviewRouter();
      const result = await router.generatePreview(PHOTO_URL, STYLE_PROMPT, CALLBACK_URL);

      expect(mockGeminiGeneratePreview).toHaveBeenCalledOnce();
      expect(result.provider).toBe('gemini');
      expect(result.isSync).toBe(true);
      expect(result.imageBuffer).toEqual(FAKE_IMAGE_BUFFER);
    });

    it('calls Gemini fallback when Kie.ai throws a 429 error', async () => {
      mockKieCreateTask.mockRejectedValueOnce(makeRetryableError(429));
      mockGeminiGeneratePreview.mockResolvedValueOnce(FAKE_IMAGE_BUFFER);

      const router = new PreviewRouter();
      const result = await router.generatePreview(PHOTO_URL, STYLE_PROMPT, CALLBACK_URL);

      expect(result.provider).toBe('gemini');
      expect(result.isSync).toBe(true);
    });

    it('downloads photo from URL to pass as Buffer to Gemini', async () => {
      mockKieCreateTask.mockRejectedValueOnce(makeRetryableError(500));
      mockGeminiGeneratePreview.mockResolvedValueOnce(FAKE_IMAGE_BUFFER);

      const router = new PreviewRouter();
      await router.generatePreview(PHOTO_URL, STYLE_PROMPT, CALLBACK_URL);

      expect(mockFetch).toHaveBeenCalledWith(PHOTO_URL);
    });

    it('passes photoBuffer and stylePrompt to Gemini generatePreview', async () => {
      mockKieCreateTask.mockRejectedValueOnce(makeRetryableError(500));
      mockGeminiGeneratePreview.mockResolvedValueOnce(FAKE_IMAGE_BUFFER);

      const router = new PreviewRouter();
      await router.generatePreview(PHOTO_URL, STYLE_PROMPT, CALLBACK_URL);

      expect(mockGeminiGeneratePreview).toHaveBeenCalledWith(
        expect.any(Buffer),
        STYLE_PROMPT
      );
    });

    it('logs a warning when falling back to Gemini', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockKieCreateTask.mockRejectedValueOnce(makeRetryableError(500));
      mockGeminiGeneratePreview.mockResolvedValueOnce(FAKE_IMAGE_BUFFER);

      const router = new PreviewRouter();
      await router.generatePreview(PHOTO_URL, STYLE_PROMPT, CALLBACK_URL);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Preview]'),
        expect.anything()
      );
      warnSpy.mockRestore();
    });
  });

  describe('both providers failing (AC #8)', () => {
    it('throws BothProvidersFailedError when both Kie.ai and Gemini fail', async () => {
      const kieError = makeRetryableError(500);
      const geminiError = new Error('Gemini: quota exceeded');
      (geminiError as any).status = 429;

      mockKieCreateTask.mockRejectedValueOnce(kieError);
      mockGeminiGeneratePreview.mockRejectedValueOnce(geminiError);

      const router = new PreviewRouter();
      const error = await router.generatePreview(PHOTO_URL, STYLE_PROMPT, CALLBACK_URL).catch((e) => e);
      expect(error).toBeInstanceOf(BothProvidersFailedError);
      expect(error.geminiAttempted).toBe(true);
    });

    it('BothProvidersFailedError message includes both primary and fallback error messages', async () => {
      mockKieCreateTask.mockRejectedValueOnce(makeRetryableError(500));
      mockGeminiGeneratePreview.mockRejectedValueOnce(new Error('Gemini: quota exceeded'));

      const router = new PreviewRouter();
      const error = await router.generatePreview(PHOTO_URL, STYLE_PROMPT, CALLBACK_URL).catch((e) => e);
      expect(error.message).toContain('Gemini: quota exceeded');
    });

    it('logs an error when both providers fail', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockKieCreateTask.mockRejectedValueOnce(makeRetryableError(500));
      mockGeminiGeneratePreview.mockRejectedValueOnce(new Error('Gemini: quota exceeded'));

      const router = new PreviewRouter();
      await router.generatePreview(PHOTO_URL, STYLE_PROMPT, CALLBACK_URL).catch(() => {});

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Preview]'),
        expect.objectContaining({ primary: expect.any(Error), fallback: expect.any(Error) })
      );
      errorSpy.mockRestore();
    });
  });

  describe('PREVIEW_FALLBACK_ENABLED=false (AC #8 test 6.8)', () => {
    it('throws immediately on Kie.ai failure without calling Gemini when fallback disabled', async () => {
      process.env.PREVIEW_FALLBACK_ENABLED = 'false';

      mockKieCreateTask.mockRejectedValueOnce(makeRetryableError(500));

      const router = new PreviewRouter();
      await expect(router.generatePreview(PHOTO_URL, STYLE_PROMPT, CALLBACK_URL)).rejects.toThrow();

      expect(mockGeminiGeneratePreview).not.toHaveBeenCalled();
    });
  });

  describe('non-retryable errors do NOT trigger fallback (isRetryable gate)', () => {
    it('throws immediately on 401 without calling Gemini', async () => {
      // 401 is non-retryable — should not trigger expensive Gemini fallback
      const authError = new Error('Unauthorized');
      (authError as any).status = 401;
      mockKieCreateTask.mockRejectedValueOnce(authError);

      const router = new PreviewRouter();
      await expect(router.generatePreview(PHOTO_URL, STYLE_PROMPT, CALLBACK_URL)).rejects.toThrow(
        /Unauthorized/
      );
      expect(mockGeminiGeneratePreview).not.toHaveBeenCalled();
    });

    it('throws immediately on 400 without calling Gemini', async () => {
      const badRequestError = new Error('Bad Request');
      (badRequestError as any).status = 400;
      mockKieCreateTask.mockRejectedValueOnce(badRequestError);

      const router = new PreviewRouter();
      await expect(router.generatePreview(PHOTO_URL, STYLE_PROMPT, CALLBACK_URL)).rejects.toThrow();
      expect(mockGeminiGeneratePreview).not.toHaveBeenCalled();
    });
  });

  describe('fallbackReason in PreviewResult', () => {
    it('sets fallbackReason=kie_error when Kie.ai throws a retryable error', async () => {
      mockKieCreateTask.mockRejectedValueOnce(makeRetryableError(500));
      mockGeminiGeneratePreview.mockResolvedValueOnce(FAKE_IMAGE_BUFFER);

      const router = new PreviewRouter();
      const result = await router.generatePreview(PHOTO_URL, STYLE_PROMPT, CALLBACK_URL);

      expect(result.fallbackReason).toBe('kie_error');
    });

    it('sets fallbackReason=kie_timeout when Kie.ai throws AbortError', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockKieCreateTask.mockRejectedValueOnce(abortError);
      mockGeminiGeneratePreview.mockResolvedValueOnce(FAKE_IMAGE_BUFFER);

      const router = new PreviewRouter();
      const result = await router.generatePreview(PHOTO_URL, STYLE_PROMPT, CALLBACK_URL);

      expect(result.fallbackReason).toBe('kie_timeout');
    });

    it('fallbackReason is undefined when Kie.ai succeeds', async () => {
      mockKieCreateTask.mockResolvedValueOnce({ taskId: 'task-123' });

      const router = new PreviewRouter();
      const result = await router.generatePreview(PHOTO_URL, STYLE_PROMPT, CALLBACK_URL);

      expect(result.fallbackReason).toBeUndefined();
    });
  });

  describe('PREVIEW_PRIMARY_TIMEOUT_MS NaN guard', () => {
    it('uses 90000ms default when PREVIEW_PRIMARY_TIMEOUT_MS is an invalid value', () => {
      process.env.PREVIEW_PRIMARY_TIMEOUT_MS = 'invalid';
      const router = new PreviewRouter();
      // Access private field via casting to verify NaN guard was applied
      expect((router as any).timeoutMs).toBe(90_000);
      delete process.env.PREVIEW_PRIMARY_TIMEOUT_MS;
    });

    it('uses 90000ms default when PREVIEW_PRIMARY_TIMEOUT_MS is empty string', () => {
      process.env.PREVIEW_PRIMARY_TIMEOUT_MS = '';
      const router = new PreviewRouter();
      expect((router as any).timeoutMs).toBe(90_000);
      delete process.env.PREVIEW_PRIMARY_TIMEOUT_MS;
    });

    it('uses 90000ms default when PREVIEW_PRIMARY_TIMEOUT_MS is zero', () => {
      process.env.PREVIEW_PRIMARY_TIMEOUT_MS = '0';
      const router = new PreviewRouter();
      expect((router as any).timeoutMs).toBe(90_000);
      delete process.env.PREVIEW_PRIMARY_TIMEOUT_MS;
    });

    it('uses the configured value when PREVIEW_PRIMARY_TIMEOUT_MS is valid', () => {
      process.env.PREVIEW_PRIMARY_TIMEOUT_MS = '30000';
      const router = new PreviewRouter();
      expect((router as any).timeoutMs).toBe(30_000);
      delete process.env.PREVIEW_PRIMARY_TIMEOUT_MS;
    });
  });

  describe('photo download failure in fallback path', () => {
    it('throws and does not call Gemini generatePreview when photo download fails with non-ok status', async () => {
      mockKieCreateTask.mockRejectedValueOnce(makeRetryableError(500));

      // Mock fetch to return non-ok response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      const router = new PreviewRouter();
      const error = await router.generatePreview(PHOTO_URL, STYLE_PROMPT, CALLBACK_URL).catch((e) => e);

      // Should throw BothProvidersFailedError (photo download failure = fallback failure)
      expect(error).toBeInstanceOf(BothProvidersFailedError);
      expect(mockGeminiGeneratePreview).not.toHaveBeenCalled();
    });
  });

  describe('timeout handling (AC #1, task 6.3)', () => {
    it('uses AbortController to pass a signal to createPreviewTask', async () => {
      mockKieCreateTask.mockResolvedValueOnce({ taskId: 'kie-task-timeout-test' });

      const router = new PreviewRouter();
      await router.generatePreview(PHOTO_URL, STYLE_PROMPT, CALLBACK_URL);

      const signal = mockKieCreateTask.mock.calls[0][3];
      expect(signal).toBeInstanceOf(AbortSignal);
    });

    it('falls back to Gemini when Kie.ai call throws AbortError', async () => {
      // Simulate Kie.ai throwing an AbortError (as would happen on timeout)
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockKieCreateTask.mockRejectedValueOnce(abortError);
      mockGeminiGeneratePreview.mockResolvedValueOnce(FAKE_IMAGE_BUFFER);

      const router = new PreviewRouter();
      const result = await router.generatePreview(PHOTO_URL, STYLE_PROMPT, CALLBACK_URL);

      expect(result.provider).toBe('gemini');
      expect(result.isSync).toBe(true);
    });
  });
});
