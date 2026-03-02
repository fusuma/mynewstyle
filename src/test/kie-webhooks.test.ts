import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Setup env vars before any module imports
// ---------------------------------------------------------------------------
process.env.KIE_WEBHOOK_HMAC_KEY = 'test-hmac-key';
process.env.KIE_API_KEY = 'test-api-key';

// ---------------------------------------------------------------------------
// Mock crypto module for timingSafeEqual tests
// ---------------------------------------------------------------------------
// We let the real crypto module run for signature tests (since we can compute
// expected HMAC in the tests), but we need to mock supabase and fetch.
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { createServerSupabaseClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Helper: compute a valid HMAC-SHA256 signature for testing
// ---------------------------------------------------------------------------
import { createHmac } from 'crypto';

function computeValidSignature(taskId: string, timestamp: string, key: string): string {
  const data = `${taskId}.${timestamp}`;
  return createHmac('sha256', key).update(data).digest('base64');
}

/** Returns a fresh unix timestamp string (seconds) within the 5-minute validity window. */
function freshTimestamp(): string {
  return String(Math.floor(Date.now() / 1000));
}

// ---------------------------------------------------------------------------
// Supabase mock chain builders
// ---------------------------------------------------------------------------

/**
 * Creates a supabase mock for recommendation lookup via JSONB filter.
 * Supports: .from().select().filter().single()
 */
function makeSupabaseWithRecommendation(
  singleResult: { data: unknown; error: unknown }
) {
  const mockSingle = vi.fn().mockResolvedValue(singleResult);
  const mockFilter = vi.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = vi.fn().mockReturnValue({ filter: mockFilter });
  const mockFrom = vi.fn().mockReturnValue({
    select: mockSelect,
    update: vi.fn(),
  });
  return {
    from: mockFrom,
    _mockSingle: mockSingle,
    _mockFilter: mockFilter,
    _mockSelect: mockSelect,
  };
}

/**
 * Creates a full supabase mock for recommendation lookup + update.
 * Supports:
 *   - .from('recommendations').select().filter().single()
 *   - .from('recommendations').update().eq()
 *   - .storage.from().upload()
 */
function makeFullSupabaseMock(
  recommendation: { data: unknown; error: unknown },
  updateResult: { error: unknown } = { error: null },
  storageResult: { data: unknown; error: unknown } = { data: { path: 'previews/c-1/r-1.jpg' }, error: null }
) {
  const mockSingle = vi.fn().mockResolvedValue(recommendation);
  const mockFilter = vi.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = vi.fn().mockReturnValue({ filter: mockFilter });

  const mockUpdateEq = vi.fn().mockResolvedValue(updateResult);
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

  const mockStorageUpload = vi.fn().mockResolvedValue(storageResult);
  const mockStorageFrom = vi.fn().mockReturnValue({ upload: mockStorageUpload });

  const mockFrom = vi.fn().mockImplementation(() => ({
    select: mockSelect,
    update: mockUpdate,
  }));

  return {
    from: mockFrom,
    storage: { from: mockStorageFrom },
    _mockSingle: mockSingle,
    _mockFilter: mockFilter,
    _mockSelect: mockSelect,
    _mockUpdate: mockUpdate,
    _mockUpdateEq: mockUpdateEq,
    _mockStorageUpload: mockStorageUpload,
    _mockStorageFrom: mockStorageFrom,
  };
}

// ===========================================================================
// verifyKieWebhook
// ===========================================================================
describe('verifyKieWebhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.KIE_WEBHOOK_HMAC_KEY = 'test-hmac-key';
  });

  it('returns true for a valid HMAC-SHA256 signature with fresh timestamp', async () => {
    const { verifyKieWebhook } = await import('@/lib/kie/webhooks');
    const taskId = 'ee9c2715375b7837f8bb51d641ff5863';
    const timestamp = freshTimestamp();
    const signature = computeValidSignature(taskId, timestamp, 'test-hmac-key');

    const result = verifyKieWebhook(taskId, timestamp, signature);
    expect(result).toBe(true);
  });

  it('returns false for an invalid signature', async () => {
    const { verifyKieWebhook } = await import('@/lib/kie/webhooks');
    const taskId = 'ee9c2715375b7837f8bb51d641ff5863';
    const timestamp = freshTimestamp();

    const result = verifyKieWebhook(taskId, timestamp, 'invalid_signature_base64');
    expect(result).toBe(false);
  });

  it('returns false when signature is tampered with (wrong taskId used to sign)', async () => {
    const { verifyKieWebhook } = await import('@/lib/kie/webhooks');
    const taskId = 'ee9c2715375b7837f8bb51d641ff5863';
    const timestamp = freshTimestamp();
    // Compute signature with a different taskId
    const tamperedSignature = computeValidSignature('other-task-id', timestamp, 'test-hmac-key');

    const result = verifyKieWebhook(taskId, timestamp, tamperedSignature);
    expect(result).toBe(false);
  });

  it('returns false when timestamp is tampered with', async () => {
    const { verifyKieWebhook } = await import('@/lib/kie/webhooks');
    const taskId = 'ee9c2715375b7837f8bb51d641ff5863';
    const timestamp = freshTimestamp();
    const signature = computeValidSignature(taskId, timestamp, 'test-hmac-key');

    // Different timestamp
    const futureTimestamp = String(Math.floor(Date.now() / 1000) + 999999);
    const result = verifyKieWebhook(taskId, futureTimestamp, signature);
    expect(result).toBe(false);
  });

  it('returns false when KIE_WEBHOOK_HMAC_KEY is not set', async () => {
    delete process.env.KIE_WEBHOOK_HMAC_KEY;
    vi.resetModules();
    const { verifyKieWebhook } = await import('@/lib/kie/webhooks');

    const result = verifyKieWebhook('task-id', freshTimestamp(), 'some-signature');
    expect(result).toBe(false);

    process.env.KIE_WEBHOOK_HMAC_KEY = 'test-hmac-key';
  });

  it('returns false for empty signature string', async () => {
    const { verifyKieWebhook } = await import('@/lib/kie/webhooks');
    const taskId = 'ee9c2715375b7837f8bb51d641ff5863';

    const result = verifyKieWebhook(taskId, freshTimestamp(), '');
    expect(result).toBe(false);
  });

  it('returns false for a stale timestamp (older than 5 minutes) — replay attack prevention', async () => {
    const { verifyKieWebhook } = await import('@/lib/kie/webhooks');
    const taskId = 'ee9c2715375b7837f8bb51d641ff5863';
    // Timestamp 10 minutes ago
    const staleTimestamp = String(Math.floor(Date.now() / 1000) - 600);
    const signature = computeValidSignature(taskId, staleTimestamp, 'test-hmac-key');

    const result = verifyKieWebhook(taskId, staleTimestamp, signature);
    expect(result).toBe(false);
  });

  it('returns false for a non-numeric timestamp', async () => {
    const { verifyKieWebhook } = await import('@/lib/kie/webhooks');
    const taskId = 'ee9c2715375b7837f8bb51d641ff5863';
    const badTimestamp = 'not-a-number';
    const signature = computeValidSignature(taskId, badTimestamp, 'test-hmac-key');

    const result = verifyKieWebhook(taskId, badTimestamp, signature);
    expect(result).toBe(false);
  });
});

// ===========================================================================
// processKieCallback — Success path
// ===========================================================================
describe('processKieCallback — success path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.KIE_WEBHOOK_HMAC_KEY = 'test-hmac-key';
    process.env.KIE_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('downloads image and uploads to storage, then sets preview_status=ready', async () => {
    const recommendation = {
      id: 'rec-uuid-1',
      consultation_id: 'con-uuid-1',
      preview_status: 'generating',
      preview_generation_params: { taskId: 'task-abc-123' },
    };

    const supabase = makeFullSupabaseMock(
      { data: recommendation, error: null },
      { error: null },
      { data: { path: 'previews/con-uuid-1/rec-uuid-1.jpg' }, error: null }
    );
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(supabase);

    // Mock recordInfo API call
    const recordInfoResponse = {
      code: 200,
      data: {
        taskId: 'task-abc-123',
        state: 'success',
        resultJson: JSON.stringify({ resultUrls: ['https://cdn.kie.ai/image.jpg'] }),
        failCode: '',
        failMsg: '',
        costTime: 15000,
      },
    };

    // Mock image download (ArrayBuffer)
    const fakeImageBuffer = new ArrayBuffer(100);

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => recordInfoResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => fakeImageBuffer,
      });

    const { processKieCallback } = await import('@/lib/kie/webhooks');
    const result = await processKieCallback('task-abc-123');

    expect(result.status).toBe('ok');
    expect(result.message).toContain('ready');

    // Should have called recordInfo
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('recordInfo'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-api-key',
        }),
      })
    );

    // Should have uploaded to storage
    expect(supabase._mockStorageFrom).toHaveBeenCalledWith('preview-images');
    expect(supabase._mockStorageUpload).toHaveBeenCalledWith(
      'previews/con-uuid-1/rec-uuid-1.jpg',
      expect.any(Buffer),
      expect.objectContaining({ contentType: 'image/jpeg', upsert: true })
    );

    // Should have updated recommendation
    expect(supabase._mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        preview_status: 'ready',
        preview_url: 'previews/con-uuid-1/rec-uuid-1.jpg',
      })
    );
  });

  it('returns ok immediately if recommendation already has preview_status=ready (idempotency)', async () => {
    const recommendation = {
      id: 'rec-uuid-1',
      consultation_id: 'con-uuid-1',
      preview_status: 'ready',
      preview_generation_params: { taskId: 'task-abc-123' },
    };

    const supabase = makeFullSupabaseMock({ data: recommendation, error: null });
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(supabase);

    const { processKieCallback } = await import('@/lib/kie/webhooks');
    const result = await processKieCallback('task-abc-123');

    expect(result.status).toBe('ok');
    expect(result.message).toContain('duplicate');
    // Should NOT have called recordInfo (no-op)
    expect(mockFetch).not.toHaveBeenCalled();
    // Should NOT have called update
    expect(supabase._mockUpdate).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// processKieCallback — Failure / error paths
// ===========================================================================
describe('processKieCallback — error paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.KIE_WEBHOOK_HMAC_KEY = 'test-hmac-key';
    process.env.KIE_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('returns ok (no-op) with warning when recommendation not found in DB', async () => {
    const supabase = makeFullSupabaseMock({ data: null, error: { message: 'Not found' } });
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(supabase);

    const { processKieCallback } = await import('@/lib/kie/webhooks');
    const result = await processKieCallback('orphaned-task-id');

    expect(result.status).toBe('ok');
    expect(result.message).toContain('not found');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sets preview_status=failed when Kie.ai recordInfo state is "fail"', async () => {
    const recommendation = {
      id: 'rec-uuid-1',
      consultation_id: 'con-uuid-1',
      preview_status: 'generating',
      preview_generation_params: { taskId: 'task-abc-123', model: 'nano-banana-2' },
    };

    const supabase = makeFullSupabaseMock(
      { data: recommendation, error: null },
      { error: null }
    );
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(supabase);

    const recordInfoResponse = {
      code: 200,
      data: {
        taskId: 'task-abc-123',
        state: 'fail',
        resultJson: '',
        failCode: 'CONTENT_POLICY',
        failMsg: 'Content policy violation',
        costTime: 5000,
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => recordInfoResponse,
    });

    const { processKieCallback } = await import('@/lib/kie/webhooks');
    const result = await processKieCallback('task-abc-123');

    expect(result.status).toBe('ok');
    // Should have set preview_status=failed with error details
    expect(supabase._mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        preview_status: 'failed',
        preview_generation_params: expect.objectContaining({
          failCode: 'CONTENT_POLICY',
          failMsg: 'Content policy violation',
        }),
      })
    );
  });

  it('sets preview_status=failed when recordInfo API call fails (HTTP error)', async () => {
    const recommendation = {
      id: 'rec-uuid-1',
      consultation_id: 'con-uuid-1',
      preview_status: 'generating',
      preview_generation_params: { taskId: 'task-abc-123' },
    };

    const supabase = makeFullSupabaseMock(
      { data: recommendation, error: null },
      { error: null }
    );
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(supabase);

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    });

    const { processKieCallback } = await import('@/lib/kie/webhooks');
    const result = await processKieCallback('task-abc-123');

    // recordInfo fetch failure → returns 'error' status (internal error, route still returns 200)
    expect(result.status).toBe('error');
    expect(result.message).toContain('recordInfo fetch failed');
    expect(supabase._mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ preview_status: 'failed' })
    );
  });

  it('sets preview_status=failed when image CDN download fails', async () => {
    const recommendation = {
      id: 'rec-uuid-1',
      consultation_id: 'con-uuid-1',
      preview_status: 'generating',
      preview_generation_params: { taskId: 'task-abc-123' },
    };

    const supabase = makeFullSupabaseMock(
      { data: recommendation, error: null },
      { error: null }
    );
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(supabase);

    const recordInfoResponse = {
      code: 200,
      data: {
        taskId: 'task-abc-123',
        state: 'success',
        resultJson: JSON.stringify({ resultUrls: ['https://cdn.kie.ai/image.jpg'] }),
        failCode: '',
        failMsg: '',
        costTime: 15000,
      },
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => recordInfoResponse,
      })
      .mockResolvedValueOnce({
        // CDN download fails
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

    const { processKieCallback } = await import('@/lib/kie/webhooks');
    const result = await processKieCallback('task-abc-123');

    // CDN download failure → returns 'error' status (internal error, route still returns 200)
    expect(result.status).toBe('error');
    expect(result.message).toContain('image download failed');
    expect(supabase._mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ preview_status: 'failed' })
    );
  });

  it('sets preview_status=failed when Supabase storage upload fails', async () => {
    const recommendation = {
      id: 'rec-uuid-1',
      consultation_id: 'con-uuid-1',
      preview_status: 'generating',
      preview_generation_params: { taskId: 'task-abc-123' },
    };

    const supabase = makeFullSupabaseMock(
      { data: recommendation, error: null },
      { error: null },
      { data: null, error: { message: 'Storage quota exceeded' } }
    );
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(supabase);

    const recordInfoResponse = {
      code: 200,
      data: {
        taskId: 'task-abc-123',
        state: 'success',
        resultJson: JSON.stringify({ resultUrls: ['https://cdn.kie.ai/image.jpg'] }),
        failCode: '',
        failMsg: '',
        costTime: 15000,
      },
    };

    const fakeImageBuffer = new ArrayBuffer(100);

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => recordInfoResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => fakeImageBuffer,
      });

    const { processKieCallback } = await import('@/lib/kie/webhooks');
    const result = await processKieCallback('task-abc-123');

    // Storage upload failure → returns 'error' status (internal error, route still returns 200)
    expect(result.status).toBe('error');
    expect(result.message).toContain('storage upload failed');
    expect(supabase._mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ preview_status: 'failed' })
    );
  });

  it('returns error status and attempts to mark preview failed when DB update fails after successful upload', async () => {
    const recommendation = {
      id: 'rec-uuid-1',
      consultation_id: 'con-uuid-1',
      preview_status: 'generating',
      preview_generation_params: { taskId: 'task-abc-123' },
    };

    const supabase = makeFullSupabaseMock(
      { data: recommendation, error: null },
      // All update() calls return error (both the ready update and the markPreviewFailed call)
      { error: { message: 'DB write failed' } },
      { data: { path: 'previews/con-uuid-1/rec-uuid-1.jpg' }, error: null }
    );
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(supabase);

    const recordInfoResponse = {
      code: 200,
      data: {
        taskId: 'task-abc-123',
        state: 'success',
        resultJson: JSON.stringify({ resultUrls: ['https://cdn.kie.ai/image.jpg'] }),
        failCode: '',
        failMsg: '',
        costTime: 15000,
      },
    };
    const fakeImageBuffer = new ArrayBuffer(100);

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => recordInfoResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => fakeImageBuffer,
      });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { processKieCallback } = await import('@/lib/kie/webhooks');
    const result = await processKieCallback('task-abc-123');

    // DB update failure → returns 'error' status (internal error, route still returns 200 to Kie.ai)
    expect(result.status).toBe('error');
    expect(result.message).toContain('DB update failed');
    // Should have logged the DB error
    expect(consoleErrorSpy).toHaveBeenCalled();
    // Should have attempted update twice: once for ready, once for markPreviewFailed
    expect(supabase._mockUpdate).toHaveBeenCalledTimes(2);
    consoleErrorSpy.mockRestore();
  });

  it('returns status=error (not ok) when recordInfo API call fails', async () => {
    const recommendation = {
      id: 'rec-uuid-1',
      consultation_id: 'con-uuid-1',
      preview_status: 'generating',
      preview_generation_params: { taskId: 'task-abc-123' },
    };

    const supabase = makeFullSupabaseMock(
      { data: recommendation, error: null },
      { error: null }
    );
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(supabase);

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    });

    const { processKieCallback } = await import('@/lib/kie/webhooks');
    const result = await processKieCallback('task-abc-123');

    expect(result.status).toBe('error');
    expect(result.message).toContain('recordInfo fetch failed');
  });

  it('returns status=error when CDN image download fails', async () => {
    const recommendation = {
      id: 'rec-uuid-1',
      consultation_id: 'con-uuid-1',
      preview_status: 'generating',
      preview_generation_params: { taskId: 'task-abc-123' },
    };

    const supabase = makeFullSupabaseMock(
      { data: recommendation, error: null },
      { error: null }
    );
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(supabase);

    const recordInfoResponse = {
      code: 200,
      data: {
        taskId: 'task-abc-123',
        state: 'success',
        resultJson: JSON.stringify({ resultUrls: ['https://cdn.kie.ai/image.jpg'] }),
        failCode: '',
        failMsg: '',
        costTime: 15000,
      },
    };

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => recordInfoResponse })
      .mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' });

    const { processKieCallback } = await import('@/lib/kie/webhooks');
    const result = await processKieCallback('task-abc-123');

    expect(result.status).toBe('error');
    expect(result.message).toContain('image download failed');
  });

  it('returns status=error and marks failed when DB update fails after successful upload', async () => {
    const recommendation = {
      id: 'rec-uuid-1',
      consultation_id: 'con-uuid-1',
      preview_status: 'generating',
      preview_generation_params: { taskId: 'task-abc-123' },
    };

    // Update mock that fails on the preview_status=ready update
    // The first .update() call (for marking ready) fails; the second (markPreviewFailed) succeeds
    const mockUpdateEqFail = vi.fn().mockResolvedValue({ error: { message: 'DB write failed' } });
    const mockUpdateEqSuccess = vi.fn().mockResolvedValue({ error: null });
    let updateCallCount = 0;
    const mockUpdate = vi.fn().mockImplementation(() => {
      updateCallCount++;
      return { eq: updateCallCount === 1 ? mockUpdateEqFail : mockUpdateEqSuccess };
    });

    const mockSingle = vi.fn().mockResolvedValue({ data: recommendation, error: null });
    const mockFilter = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ filter: mockFilter });
    const mockStorageUpload = vi.fn().mockResolvedValue({
      data: { path: 'previews/con-uuid-1/rec-uuid-1.jpg' },
      error: null,
    });
    const mockStorageFrom = vi.fn().mockReturnValue({ upload: mockStorageUpload });
    const mockFrom = vi.fn().mockImplementation(() => ({
      select: mockSelect,
      update: mockUpdate,
    }));

    const supabase = {
      from: mockFrom,
      storage: { from: mockStorageFrom },
    };
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(supabase);

    const recordInfoResponse = {
      code: 200,
      data: {
        taskId: 'task-abc-123',
        state: 'success',
        resultJson: JSON.stringify({ resultUrls: ['https://cdn.kie.ai/image.jpg'] }),
        failCode: '',
        failMsg: '',
        costTime: 15000,
      },
    };
    const fakeImageBuffer = new ArrayBuffer(100);

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => recordInfoResponse })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => fakeImageBuffer });

    const { processKieCallback } = await import('@/lib/kie/webhooks');
    const result = await processKieCallback('task-abc-123');

    // Should return error status
    expect(result.status).toBe('error');
    expect(result.message).toContain('DB update failed');
    // Should have called update twice: once for ready (failed) and once for markPreviewFailed
    expect(mockUpdate).toHaveBeenCalledTimes(2);
    // First call: attempted to set preview_status=ready
    expect(mockUpdate).toHaveBeenNthCalledWith(1,
      expect.objectContaining({ preview_status: 'ready' })
    );
    // Second call: markPreviewFailed — sets preview_status=failed
    expect(mockUpdate).toHaveBeenNthCalledWith(2,
      expect.objectContaining({ preview_status: 'failed' })
    );
  });
});

// ===========================================================================
// processKieCallback — SSRF protection
// ===========================================================================
describe('processKieCallback — SSRF protection in CDN URL validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.KIE_WEBHOOK_HMAC_KEY = 'test-hmac-key';
    process.env.KIE_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('sets preview_status=failed and returns error when resultUrl is an HTTP (non-HTTPS) URL', async () => {
    const recommendation = {
      id: 'rec-uuid-1',
      consultation_id: 'con-uuid-1',
      preview_status: 'generating',
      preview_generation_params: { taskId: 'task-ssrf-1' },
    };

    const supabase = makeFullSupabaseMock(
      { data: recommendation, error: null },
      { error: null }
    );
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(supabase);

    const recordInfoResponse = {
      code: 200,
      data: {
        taskId: 'task-ssrf-1',
        state: 'success',
        // Malicious HTTP URL (non-HTTPS)
        resultJson: JSON.stringify({ resultUrls: ['http://cdn.kie.ai/image.jpg'] }),
        failCode: '',
        failMsg: '',
        costTime: 15000,
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => recordInfoResponse,
    });

    const { processKieCallback } = await import('@/lib/kie/webhooks');
    const result = await processKieCallback('task-ssrf-1');

    expect(result.status).toBe('error');
    expect(result.message).toContain('image download failed');
    // Should NOT have made a second fetch (to the unsafe URL)
    expect(mockFetch).toHaveBeenCalledTimes(1);
    // Should have marked preview as failed
    expect(supabase._mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ preview_status: 'failed' })
    );
  });

  it('sets preview_status=failed when resultUrl is an untrusted domain (SSRF attempt)', async () => {
    const recommendation = {
      id: 'rec-uuid-1',
      consultation_id: 'con-uuid-1',
      preview_status: 'generating',
      preview_generation_params: { taskId: 'task-ssrf-2' },
    };

    const supabase = makeFullSupabaseMock(
      { data: recommendation, error: null },
      { error: null }
    );
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(supabase);

    const recordInfoResponse = {
      code: 200,
      data: {
        taskId: 'task-ssrf-2',
        state: 'success',
        // Malicious internal URL (metadata endpoint attack)
        resultJson: JSON.stringify({ resultUrls: ['https://169.254.169.254/latest/meta-data'] }),
        failCode: '',
        failMsg: '',
        costTime: 15000,
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => recordInfoResponse,
    });

    const { processKieCallback } = await import('@/lib/kie/webhooks');
    const result = await processKieCallback('task-ssrf-2');

    expect(result.status).toBe('error');
    expect(result.message).toContain('image download failed');
    // Should NOT have fetched the malicious URL
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(supabase._mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ preview_status: 'failed' })
    );
  });
});
