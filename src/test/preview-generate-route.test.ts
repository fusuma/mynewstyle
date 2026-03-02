import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Must be hoisted to avoid reference-before-initialization error when vi.mock factories are hoisted
const { MockBothProvidersFailedError } = vi.hoisted(() => {
  class MockBothProvidersFailedError extends Error {
    geminiAttempted = true;
    primaryError: unknown;
    fallbackError: unknown;
    constructor(primaryError: unknown, fallbackError: unknown) {
      super('Both failed');
      this.name = 'BothProvidersFailedError';
      this.primaryError = primaryError;
      this.fallbackError = fallbackError;
    }
  }
  return { MockBothProvidersFailedError };
});

// Mock PreviewRouter (Story 7-6: route now uses PreviewRouter instead of KieClient directly)
vi.mock('@/lib/ai/preview-router', () => {
  const PreviewRouter = vi.fn(function (this: any) {
    this.generatePreview = vi.fn();
  });
  return { PreviewRouter, BothProvidersFailedError: MockBothProvidersFailedError };
});

// Mock face-similarity module
vi.mock('@/lib/ai/face-similarity', () => ({
  compareFaces: vi.fn(),
  logQualityGate: vi.fn(),
  FACE_SIMILARITY_THRESHOLD: 0.7,
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

// Mock AI logger
vi.mock('@/lib/ai', () => ({
  persistAICallLog: vi.fn().mockResolvedValue(undefined),
  logAICall: vi.fn().mockReturnValue({
    id: 'log-id-123',
    timestamp: '2026-03-02T00:00:00.000Z',
    provider: 'kie',
    model: 'nano-banana-2',
    task: 'preview',
    inputTokens: 0,
    outputTokens: 0,
    costCents: 4,
    latencyMs: 500,
    success: true,
  }),
  KIE_COST_PER_IMAGE_CENTS: 4,
  GEMINI_PRO_IMAGE_COST_PER_IMAGE_CENTS: 13,
  GEMINI_PRO_IMAGE_OUTPUT_TOKENS: 1120,
}));

// Mock prompt builder
vi.mock('@/lib/ai/prompts/preview', () => ({
  buildPreviewPrompt: vi.fn().mockReturnValue('Mocked style prompt for Modern Undercut'),
}));

import { POST } from '@/app/api/preview/generate/route';
import { PreviewRouter } from '@/lib/ai/preview-router';
import { compareFaces } from '@/lib/ai/face-similarity';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { persistAICallLog, logAICall } from '@/lib/ai';
import { buildPreviewPrompt } from '@/lib/ai/prompts/preview';

const consultationId = '550e8400-e29b-41d4-a716-446655440000';
const recommendationId = '660e8400-e29b-41d4-a716-446655440001';
const FAKE_IMAGE_BUFFER = Buffer.from('generated-preview-image');

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/preview/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * Creates a mock Supabase client supporting chained API calls.
 */
function createMockSupabase({
  consultation = null as any,
  consultationError = null as any,
  recommendation = null as any,
  recommendationError = null as any,
  generatingPreview = null as any,
  generatingPreviewError = null as any,
  signedUrlData = { signedUrl: 'https://storage.supabase.co/signed/photo.jpg' } as any,
  signedUrlError = null as any,
  updateRecommendationError = null as any,
} = {}) {
  const fromFn = vi.fn();

  const makeChain = (overrides: Record<string, any> = {}) => {
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    Object.assign(chain, overrides);
    return chain;
  };

  fromFn.mockImplementation((table: string) => {
    if (table === 'consultations') {
      return makeChain({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: consultation, error: consultationError }),
      });
    }
    if (table === 'recommendations') {
      let callCount = 0;
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({ data: generatingPreview, error: generatingPreviewError });
          }
          return Promise.resolve({ data: recommendation, error: recommendationError });
        }),
        maybeSingle: vi.fn().mockImplementation(() => {
          return Promise.resolve({ data: generatingPreview, error: generatingPreviewError });
        }),
        then: vi.fn().mockResolvedValue({ error: updateRecommendationError }),
      };
    }
    if (table === 'ai_calls') {
      return makeChain({
        insert: vi.fn().mockResolvedValue({ error: null }),
      });
    }
    return makeChain();
  });

  const storageMock = {
    from: vi.fn().mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({ data: signedUrlData, error: signedUrlError }),
      download: vi.fn().mockResolvedValue({
        data: new Blob([Buffer.from('original-photo-data')]),
        error: null,
      }),
      upload: vi.fn().mockResolvedValue({ error: null }),
    }),
  };

  return {
    from: fromFn,
    storage: storageMock,
  };
}

describe('POST /api/preview/generate', () => {
  let mockGeneratePreview: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: Kie.ai success (async path)
    mockGeneratePreview = vi.fn().mockResolvedValue({
      taskId: 'task_nano-banana-2_1765178625768',
      provider: 'kie',
      isSync: false,
    });

    vi.mocked(PreviewRouter).mockImplementation(function (this: any) {
      this.generatePreview = mockGeneratePreview;
    } as any);

    // Default face similarity: pass
    vi.mocked(compareFaces).mockResolvedValue({
      similarity: 0.9,
      passed: true,
    });

    process.env.NEXT_PUBLIC_APP_URL = 'https://mynewstyle.com';
  });

  describe('request validation', () => {
    it('returns 400 for invalid JSON body', async () => {
      const req = new NextRequest('http://localhost:3000/api/preview/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-json',
      });

      const supabase = createMockSupabase();
      vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as any);

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 when consultationId is missing', async () => {
      const req = createRequest({ recommendationId });
      const supabase = createMockSupabase();
      vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as any);
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 when recommendationId is missing', async () => {
      const req = createRequest({ consultationId });
      const supabase = createMockSupabase();
      vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as any);
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 when consultationId is not a UUID', async () => {
      const req = createRequest({ consultationId: 'not-a-uuid', recommendationId });
      const supabase = createMockSupabase();
      vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as any);
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 when recommendationId is not a UUID', async () => {
      const req = createRequest({ consultationId, recommendationId: 'not-a-uuid' });
      const supabase = createMockSupabase();
      vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as any);
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe('payment gate (AC #10)', () => {
    it('returns 403 when consultation payment_status is not paid', async () => {
      const supabase = createMockSupabase({
        consultation: {
          id: consultationId,
          payment_status: 'pending',
          gender: 'male',
          photo_url: 'consultation-photos/photo.jpg',
        },
      });
      vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as any);

      const req = createRequest({ consultationId, recommendationId });
      const res = await POST(req);

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toMatch(/payment/i);
    });

    it('returns 404 when consultation not found', async () => {
      const supabase = createMockSupabase({
        consultation: null,
        consultationError: { message: 'Row not found' },
      });
      vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as any);

      const req = createRequest({ consultationId, recommendationId });
      const res = await POST(req);

      expect(res.status).toBe(404);
    });
  });

  describe('sequential queue (AC #12)', () => {
    it('returns 409 when another preview is already generating for this consultation', async () => {
      const supabase = createMockSupabase({
        consultation: {
          id: consultationId,
          payment_status: 'paid',
          gender: 'male',
          photo_url: 'consultation-photos/photo.jpg',
        },
        generatingPreview: { id: 'other-rec-id', preview_status: 'generating' },
      });
      vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as any);

      const req = createRequest({ consultationId, recommendationId });
      const res = await POST(req);

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error).toMatch(/generating/i);
    });
  });

  describe('successful preview task creation (primary Kie.ai path)', () => {
    function createSuccessSupabase() {
      const fromFn = vi.fn();
      let recCallCount = 0;

      fromFn.mockImplementation((table: string) => {
        if (table === 'consultations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: consultationId,
                payment_status: 'paid',
                gender: 'male',
                photo_url: 'consultation-photos/photo.jpg',
              },
              error: null,
            }),
          };
        }
        if (table === 'recommendations') {
          recCallCount++;
          const callNum = recCallCount;
          if (callNum === 1) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
          if (callNum === 2) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: recommendationId,
                  consultation_id: consultationId,
                  style_name: 'Modern Undercut',
                  difficulty_level: 'medium',
                  preview_status: 'none',
                },
                error: null,
              }),
            };
          }
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'ai_calls') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          update: vi.fn().mockReturnThis(),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      });

      const storageMock = {
        from: vi.fn().mockReturnValue({
          createSignedUrl: vi.fn().mockResolvedValue({
            data: { signedUrl: 'https://storage.supabase.co/signed/photo.jpg' },
            error: null,
          }),
          download: vi.fn().mockResolvedValue({ data: null, error: null }),
          upload: vi.fn().mockResolvedValue({ error: null }),
        }),
      };

      return { from: fromFn, storage: storageMock };
    }

    it('returns 200 with status generating and estimatedSeconds', async () => {
      const supabase = createSuccessSupabase();
      vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as any);

      const req = createRequest({ consultationId, recommendationId });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('generating');
      expect(body.estimatedSeconds).toBe(30);
    });

    it('calls PreviewRouter.generatePreview with photo signed URL, style prompt, and callback URL', async () => {
      const supabase = createSuccessSupabase();
      vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as any);

      const req = createRequest({ consultationId, recommendationId });
      await POST(req);

      expect(mockGeneratePreview).toHaveBeenCalledOnce();
      const [photoUrl, stylePrompt, callbackUrl] = mockGeneratePreview.mock.calls[0];
      expect(photoUrl).toBe('https://storage.supabase.co/signed/photo.jpg');
      expect(typeof stylePrompt).toBe('string');
      expect(callbackUrl).toBe('https://mynewstyle.com/api/webhook/kie');
    });

    it('calls persistAICallLog with kie provider params', async () => {
      const supabase = createSuccessSupabase();
      vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as any);

      const req = createRequest({ consultationId, recommendationId });
      await POST(req);

      expect(persistAICallLog).toHaveBeenCalledOnce();
      const [, loggedConsultationId, log] = vi.mocked(persistAICallLog).mock.calls[0];
      expect(loggedConsultationId).toBe(consultationId);
      expect(log.provider).toBe('kie');
      expect(log.model).toBe('nano-banana-2');
      expect(log.task).toBe('preview');
    });
  });

  describe('Gemini fallback path (Story 7-6 AC #1, #3, #5, #6, #7)', () => {
    function createFallbackSupabase() {
      const fromFn = vi.fn();
      let recCallCount = 0;

      fromFn.mockImplementation((table: string) => {
        if (table === 'consultations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: consultationId,
                payment_status: 'paid',
                gender: 'male',
                photo_url: 'consultation-photos/photo.jpg',
              },
              error: null,
            }),
          };
        }
        if (table === 'recommendations') {
          recCallCount++;
          const callNum = recCallCount;
          if (callNum === 1) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
          if (callNum === 2) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: recommendationId,
                  consultation_id: consultationId,
                  style_name: 'Modern Undercut',
                  difficulty_level: 'medium',
                  preview_status: 'none',
                },
                error: null,
              }),
            };
          }
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'ai_calls') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          update: vi.fn().mockReturnThis(),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      });

      const originalPhotoBlob = new Blob([Buffer.from('original-photo-data')]);
      const storageMock = {
        from: vi.fn().mockReturnValue({
          createSignedUrl: vi.fn().mockResolvedValue({
            data: { signedUrl: 'https://storage.supabase.co/signed/photo.jpg' },
            error: null,
          }),
          download: vi.fn().mockResolvedValue({ data: originalPhotoBlob, error: null }),
          upload: vi.fn().mockResolvedValue({ error: null }),
        }),
      };

      return { from: fromFn, storage: storageMock };
    }

    it('returns 200 with status ready when Gemini fallback succeeds and face similarity passes (AC #3)', async () => {
      mockGeneratePreview.mockResolvedValueOnce({
        imageBuffer: FAKE_IMAGE_BUFFER,
        provider: 'gemini',
        isSync: true,
      });

      vi.mocked(compareFaces).mockResolvedValueOnce({ similarity: 0.85, passed: true });

      const supabase = createFallbackSupabase();
      vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as any);

      const req = createRequest({ consultationId, recommendationId });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('ready');
      expect(body.previewUrl).toContain(recommendationId);
    });

    it('applies face similarity check to fallback-generated image (AC #5 — no quality gate bypass)', async () => {
      mockGeneratePreview.mockResolvedValueOnce({
        imageBuffer: FAKE_IMAGE_BUFFER,
        provider: 'gemini',
        isSync: true,
      });
      vi.mocked(compareFaces).mockResolvedValueOnce({ similarity: 0.85, passed: true });

      const supabase = createFallbackSupabase();
      vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as any);

      const req = createRequest({ consultationId, recommendationId });
      await POST(req);

      expect(compareFaces).toHaveBeenCalledOnce();
      // Both args should be Buffers
      const [origBuf, previewBuf] = vi.mocked(compareFaces).mock.calls[0];
      expect(Buffer.isBuffer(origBuf)).toBe(true);
      expect(previewBuf).toEqual(FAKE_IMAGE_BUFFER);
    });

    it('returns unavailable when face similarity check fails (AC #5)', async () => {
      mockGeneratePreview.mockResolvedValueOnce({
        imageBuffer: FAKE_IMAGE_BUFFER,
        provider: 'gemini',
        isSync: true,
      });
      vi.mocked(compareFaces).mockResolvedValueOnce({
        similarity: 0.5,
        passed: false,
        reason: 'quality_gate',
      });

      const supabase = createFallbackSupabase();
      vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as any);

      const req = createRequest({ consultationId, recommendationId });
      const res = await POST(req);

      const body = await res.json();
      expect(body.status).toBe('unavailable');
    });

    it('uploads fallback image to preview-images bucket at correct path (AC #7)', async () => {
      mockGeneratePreview.mockResolvedValueOnce({
        imageBuffer: FAKE_IMAGE_BUFFER,
        provider: 'gemini',
        isSync: true,
      });
      vi.mocked(compareFaces).mockResolvedValueOnce({ similarity: 0.9, passed: true });

      const supabase = createFallbackSupabase();
      vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as any);

      const req = createRequest({ consultationId, recommendationId });
      await POST(req);

      const storageMockFrom = (supabase.storage.from as ReturnType<typeof vi.fn>);
      expect(storageMockFrom).toHaveBeenCalledWith('preview-images');
      const uploadMock = storageMockFrom.mock.results[0]?.value?.upload;
      if (uploadMock) {
        expect(uploadMock).toHaveBeenCalledWith(
          `previews/${consultationId}/${recommendationId}.jpg`,
          FAKE_IMAGE_BUFFER,
          expect.objectContaining({ contentType: 'image/jpeg', upsert: true })
        );
      }
    });

    it('logs AI call with gemini provider for fallback (AC #4)', async () => {
      mockGeneratePreview.mockResolvedValueOnce({
        imageBuffer: FAKE_IMAGE_BUFFER,
        provider: 'gemini',
        isSync: true,
      });
      vi.mocked(compareFaces).mockResolvedValueOnce({ similarity: 0.9, passed: true });

      const supabase = createFallbackSupabase();
      vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as any);

      const req = createRequest({ consultationId, recommendationId });
      await POST(req);

      expect(logAICall).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'gemini',
          model: 'gemini-3-pro-image-preview',
          task: 'preview',
        })
      );
    });
  });

  describe('both providers failing (AC #8)', () => {
    function createPaidConsultationSupabase() {
      const fromFn = vi.fn();
      let recCallCount = 0;

      fromFn.mockImplementation((table: string) => {
        if (table === 'consultations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: consultationId,
                payment_status: 'paid',
                gender: 'female',
                photo_url: 'consultation-photos/photo.jpg',
              },
              error: null,
            }),
          };
        }
        if (table === 'recommendations') {
          recCallCount++;
          const callNum = recCallCount;
          if (callNum === 1) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
          if (callNum === 2) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: recommendationId,
                  consultation_id: consultationId,
                  style_name: 'Bob Clássico',
                  difficulty_level: 'low',
                  preview_status: 'none',
                },
                error: null,
              }),
            };
          }
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          update: vi.fn().mockReturnThis(),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      });

      const storageMock = {
        from: vi.fn().mockReturnValue({
          createSignedUrl: vi.fn().mockResolvedValue({
            data: { signedUrl: 'https://storage.supabase.co/signed/photo.jpg' },
            error: null,
          }),
          download: vi.fn().mockResolvedValue({ data: null, error: null }),
          upload: vi.fn().mockResolvedValue({ error: null }),
        }),
      };

      return { from: fromFn, storage: storageMock };
    }

    it('returns 502 when both providers fail (AC #8)', async () => {
      const bothFailError = new Error('Both providers failed');
      mockGeneratePreview.mockRejectedValueOnce(bothFailError);

      const supabase = createPaidConsultationSupabase();
      vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as any);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const req = createRequest({ consultationId, recommendationId });
      const res = await POST(req);

      expect(res.status).toBe(502);
      consoleErrorSpy.mockRestore();
    });

    it('sets preview_status to failed when both providers fail (AC #8)', async () => {
      mockGeneratePreview.mockRejectedValueOnce(new Error('Both failed'));

      const supabase = createPaidConsultationSupabase();
      vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as any);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const req = createRequest({ consultationId, recommendationId });
      await POST(req);

      const recFromCalls = (supabase.from as ReturnType<typeof vi.fn>).mock.calls.filter(
        (call: string[]) => call[0] === 'recommendations'
      );
      expect(recFromCalls.length).toBeGreaterThanOrEqual(3);
      consoleErrorSpy.mockRestore();
    });

    it('logs error when Kie.ai returns error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockGeneratePreview.mockRejectedValueOnce(new Error('Kie.ai 500 error'));

      const supabase = createPaidConsultationSupabase();
      vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as any);

      const req = createRequest({ consultationId, recommendationId });
      await POST(req);

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('logs AI call with gemini provider when BothProvidersFailedError is thrown', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      // BothProvidersFailedError signals Gemini was the last provider tried
      mockGeneratePreview.mockRejectedValueOnce(
        new MockBothProvidersFailedError(new Error('kie 500'), new Error('gemini quota'))
      );

      const supabase = createPaidConsultationSupabase();
      vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as any);

      const req = createRequest({ consultationId, recommendationId });
      await POST(req);

      expect(logAICall).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'gemini',
          model: 'gemini-3-pro-image-preview',
          success: false,
        })
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('missing environment variable', () => {
    it('returns 500 when NEXT_PUBLIC_APP_URL is not set', async () => {
      const originalUrl = process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.NEXT_PUBLIC_APP_URL;

      const fromFn = vi.fn();
      fromFn.mockImplementation((table: string) => {
        if (table === 'consultations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: consultationId,
                payment_status: 'paid',
                gender: 'male',
                photo_url: 'consultation-photos/photo.jpg',
              },
              error: null,
            }),
          };
        }
        if (table === 'recommendations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            single: vi.fn().mockResolvedValue({
              data: {
                id: recommendationId,
                consultation_id: consultationId,
                style_name: 'Modern Undercut',
                difficulty_level: 'medium',
                preview_status: 'none',
              },
              error: null,
            }),
            update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const storageMock = {
        from: vi.fn().mockReturnValue({
          createSignedUrl: vi.fn().mockResolvedValue({
            data: { signedUrl: 'https://storage.supabase.co/signed/photo.jpg' },
            error: null,
          }),
          download: vi.fn().mockResolvedValue({ data: null, error: null }),
          upload: vi.fn().mockResolvedValue({ error: null }),
        }),
      };

      vi.mocked(createServerSupabaseClient).mockReturnValue({ from: fromFn, storage: storageMock } as any);

      const req = createRequest({ consultationId, recommendationId });
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const res = await POST(req);
      consoleErrorSpy.mockRestore();

      expect(res.status).toBe(500);
      process.env.NEXT_PUBLIC_APP_URL = originalUrl;
    });
  });
});
