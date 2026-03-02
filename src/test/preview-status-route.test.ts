import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

import { GET } from '@/app/api/preview/[recommendationId]/status/route';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const recommendationId = '660e8400-e29b-41d4-a716-446655440001';

function createRequest(recId: string): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/preview/${recId}/status`,
    { method: 'GET' }
  );
}

function createMockSupabase(recommendation: any = null, error: any = null) {
  const fromFn = vi.fn();

  fromFn.mockImplementation((table: string) => {
    if (table === 'recommendations') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: recommendation, error }),
      };
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  });

  return { from: fromFn };
}

describe('GET /api/preview/[recommendationId]/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('request validation', () => {
    it('returns 400 when recommendationId is not a valid UUID', async () => {
      const supabase = createMockSupabase();
      vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as any);

      const req = createRequest('not-a-uuid');
      const res = await GET(req, { params: Promise.resolve({ recommendationId: 'not-a-uuid' }) });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBeDefined();
    });
  });

  describe('successful status retrieval', () => {
    it('returns status none and null previewUrl when preview_status is none', async () => {
      const supabase = createMockSupabase({
        id: recommendationId,
        preview_status: 'none',
        preview_url: null,
      });
      vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as any);

      const req = createRequest(recommendationId);
      const res = await GET(req, { params: Promise.resolve({ recommendationId }) });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('none');
      expect(body.previewUrl).toBeNull();
    });

    it('returns status generating and null previewUrl when preview is being generated', async () => {
      const supabase = createMockSupabase({
        id: recommendationId,
        preview_status: 'generating',
        preview_url: null,
      });
      vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as any);

      const req = createRequest(recommendationId);
      const res = await GET(req, { params: Promise.resolve({ recommendationId }) });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('generating');
      expect(body.previewUrl).toBeNull();
    });

    it('returns status ready and previewUrl when preview is complete', async () => {
      const previewUrl = 'https://storage.supabase.co/preview-images/rec123-preview.jpg';
      const supabase = createMockSupabase({
        id: recommendationId,
        preview_status: 'ready',
        preview_url: previewUrl,
      });
      vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as any);

      const req = createRequest(recommendationId);
      const res = await GET(req, { params: Promise.resolve({ recommendationId }) });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('ready');
      expect(body.previewUrl).toBe(previewUrl);
    });

    it('returns status failed and null previewUrl when preview failed', async () => {
      const supabase = createMockSupabase({
        id: recommendationId,
        preview_status: 'failed',
        preview_url: null,
      });
      vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as any);

      const req = createRequest(recommendationId);
      const res = await GET(req, { params: Promise.resolve({ recommendationId }) });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('failed');
      expect(body.previewUrl).toBeNull();
    });
  });

  describe('error handling', () => {
    it('returns 404 when recommendation is not found', async () => {
      const supabase = createMockSupabase(null, { message: 'Row not found' });
      vi.mocked(createServerSupabaseClient).mockReturnValue(supabase as any);

      const req = createRequest(recommendationId);
      const res = await GET(req, { params: Promise.resolve({ recommendationId }) });

      expect(res.status).toBe(404);
    });
  });
});
