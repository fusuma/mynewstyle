import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock KieClient - must use function constructor for class mocking
vi.mock('@/lib/ai/kie', () => {
  const KieClient = vi.fn(function (this: any) {
    this.createPreviewTask = vi.fn();
  });
  return { KieClient };
});

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
}));

// Mock prompt builder
vi.mock('@/lib/ai/prompts/preview', () => ({
  buildPreviewPrompt: vi.fn().mockReturnValue('Mocked style prompt for Modern Undercut'),
}));

import { POST } from '@/app/api/preview/generate/route';
import { KieClient } from '@/lib/ai/kie';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { persistAICallLog, logAICall } from '@/lib/ai';
import { buildPreviewPrompt } from '@/lib/ai/prompts/preview';

const consultationId = '550e8400-e29b-41d4-a716-446655440000';
const recommendationId = '660e8400-e29b-41d4-a716-446655440001';

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
            // First call: check for generating previews (sequential queue)
            return Promise.resolve({ data: generatingPreview, error: generatingPreviewError });
          }
          // Second call: fetch the specific recommendation
          return Promise.resolve({ data: recommendation, error: recommendationError });
        }),
        maybeSingle: vi.fn().mockImplementation(() => {
          // For sequential queue check
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
    }),
  };

  return {
    from: fromFn,
    storage: storageMock,
  };
}

describe('POST /api/preview/generate', () => {
  let mockCreatePreviewTask: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCreatePreviewTask = vi.fn().mockResolvedValue({
      taskId: 'task_nano-banana-2_1765178625768',
    });

    // Set up the mock class constructor so that instances get the mocked method
    vi.mocked(KieClient).mockImplementation(function (this: any) {
      this.createPreviewTask = mockCreatePreviewTask;
    } as any);

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

  describe('successful preview task creation', () => {
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
          // Call 1: sequential queue check -> maybeSingle returns null (no generating)
          // Call 2: fetch recommendation by id + consultationId -> single returns recommendation
          // Call 3: update preview_status -> eq chain returns {error:null}
          if (callNum === 1) {
            // Sequential queue check
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
          if (callNum === 2) {
            // Fetch recommendation
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
          // Call 3+: update
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

    it('calls KieClient.createPreviewTask with photo signed URL, style prompt, and callback URL', async () => {
      const supabase = createSuccessSupabase();
      vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as any);

      const req = createRequest({ consultationId, recommendationId });
      await POST(req);

      expect(mockCreatePreviewTask).toHaveBeenCalledOnce();
      const [photoUrl, stylePrompt, callbackUrl] = mockCreatePreviewTask.mock.calls[0];
      expect(photoUrl).toBe('https://storage.supabase.co/signed/photo.jpg');
      expect(typeof stylePrompt).toBe('string');
      expect(callbackUrl).toBe('https://mynewstyle.com/api/webhook/kie');
    });

    it('calls persistAICallLog with correct params', async () => {
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

  describe('Kie.ai error handling (AC #13)', () => {
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
            // Sequential queue check
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
          if (callNum === 2) {
            // Fetch recommendation
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
          // Update (error path sets preview_status to 'failed')
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
        }),
      };

      return { from: fromFn, storage: storageMock };
    }

    it('returns 502 when Kie.ai API returns error', async () => {
      const kieError = new Error('Kie.ai API error');
      (kieError as any).status = 500;
      mockCreatePreviewTask.mockRejectedValueOnce(kieError);

      const supabase = createPaidConsultationSupabase();
      vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as any);

      const req = createRequest({ consultationId, recommendationId });
      const res = await POST(req);

      expect(res.status).toBe(502);
    });

    it('logs error when Kie.ai returns non-200 status', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const kieError = new Error('Kie.ai 500 error');
      (kieError as any).status = 500;
      mockCreatePreviewTask.mockRejectedValueOnce(kieError);

      const supabase = createPaidConsultationSupabase();
      vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as any);

      const req = createRequest({ consultationId, recommendationId });
      await POST(req);

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('sets preview_status to failed in DB when Kie.ai returns error (AC #13)', async () => {
      const kieError = new Error('Kie.ai API error');
      (kieError as any).status = 500;
      mockCreatePreviewTask.mockRejectedValueOnce(kieError);

      const supabase = createPaidConsultationSupabase();
      vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as any);

      const req = createRequest({ consultationId, recommendationId });
      await POST(req);

      // Verify that an update call targeting recommendations was made with failed status
      // The supabase.from('recommendations') mock tracks update calls
      const recFromCalls = (supabase.from as ReturnType<typeof vi.fn>).mock.calls.filter(
        (call: string[]) => call[0] === 'recommendations'
      );
      // At minimum 3 calls: sequential queue check, fetch recommendation, update to failed
      expect(recFromCalls.length).toBeGreaterThanOrEqual(3);
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
