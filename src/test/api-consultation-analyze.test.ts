import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/consultation/analyze/route';
import { NextRequest } from 'next/server';

// Mock AI router
vi.mock('@/lib/ai', () => ({
  getAIRouter: vi.fn(),
  validateFaceAnalysis: vi.fn(),
  logValidationFailure: vi.fn(),
  getAICallLogs: vi.fn().mockReturnValue([]),
  persistAICallLog: vi.fn().mockResolvedValue(undefined),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

// Import after mocks
import { getAIRouter, validateFaceAnalysis, logValidationFailure, getAICallLogs, persistAICallLog } from '@/lib/ai';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Valid FaceAnalysis object (matches FaceAnalysisSchema)
const validFaceAnalysis = {
  faceShape: 'oval' as const,
  confidence: 0.92,
  proportions: {
    foreheadRatio: 0.78,
    cheekboneRatio: 1.0,
    jawRatio: 0.72,
    faceLength: 1.35,
  },
  hairAssessment: {
    type: 'straight',
    texture: 'medium',
    density: 'medium',
    currentStyle: 'short sides and back',
  },
};

// Invalid FaceAnalysis (fails validation)
const invalidFaceAnalysis = {
  faceShape: 'pentagon', // invalid enum
  confidence: 1.5, // out of range
};

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/consultation/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  consultationId: '550e8400-e29b-41d4-a716-446655440000',
  photoBase64: 'dGVzdA==', // base64 for "test"
  mimeType: 'image/jpeg',
};

// Create a mock Supabase with chainable methods
function createMockSupabase({
  consultationFound = true,
  updateError = null as Error | null,
} = {}) {
  const mockSingle = vi.fn().mockResolvedValue(
    consultationFound
      ? {
          data: {
            id: validPayload.consultationId,
            status: 'pending',
            questionnaire_responses: { gender: 'male', lifestyle: 'active' },
            gender: 'male',
          },
          error: null,
        }
      : { data: null, error: { message: 'Not found' } }
  );

  const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const mockLimit = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
  const mockNeq = vi.fn().mockReturnValue({ limit: mockLimit });

  // Build a deeply chainable eq mock that supports both single() and further chaining
  const buildEqChain = (): Record<string, unknown> => {
    const chain: Record<string, unknown> = {};
    chain['single'] = mockSingle;
    chain['maybeSingle'] = mockMaybeSingle;
    chain['limit'] = mockLimit;
    chain['neq'] = vi.fn().mockReturnValue({ limit: mockLimit, maybeSingle: mockMaybeSingle });
    chain['eq'] = vi.fn().mockReturnValue(chain);
    return chain;
  };

  const mockSelect = vi.fn().mockReturnValue(buildEqChain());

  const mockUpdateEq = vi.fn().mockResolvedValue({ data: null, error: updateError });
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

  const mockFrom = vi.fn().mockImplementation((table: string) => {
    void table;
    return {
      select: mockSelect,
      update: mockUpdate,
    };
  });

  return {
    from: mockFrom,
    _mockSingle: mockSingle,
    _mockUpdateEq: mockUpdateEq,
    _mockUpdate: mockUpdate,
    _mockMaybeSingle: mockMaybeSingle,
  };
}

/**
 * Creates a mock Supabase for cache-hit/miss test scenarios.
 * Supports multi-call patterns: initial consultation fetch, then cache lookup.
 */
function createMockSupabaseForCacheTests({
  consultationData = {
    id: validPayload.consultationId,
    status: 'pending',
    questionnaire_responses: { gender: 'male', lifestyle: 'active' },
    gender: 'male',
  } as Record<string, unknown>,
  cachedConsultation = null as { face_analysis: unknown } | null,
  updateError = null as Error | null,
} = {}) {
  const mockUpdateEq = vi.fn().mockResolvedValue({ data: null, error: updateError });
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

  // Track call count to differentiate initial fetch vs cache lookup
  let selectCallCount = 0;

  const mockFrom = vi.fn().mockImplementation((_table: string) => {
    selectCallCount++;
    const callNum = selectCallCount;

    const buildChain = (resolvedValue: unknown) => {
      const mockMaybeSingle = vi.fn().mockResolvedValue(resolvedValue);
      const mockSingle = vi.fn().mockResolvedValue(resolvedValue);
      const mockLimit = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockNeq = vi.fn().mockReturnValue({ limit: mockLimit, maybeSingle: mockMaybeSingle });
      const mockEqChain = vi.fn().mockReturnValue({
        single: mockSingle,
        eq: vi.fn().mockReturnThis(),
        neq: mockNeq,
        limit: mockLimit,
        maybeSingle: mockMaybeSingle,
      });
      // Build a chainable eq that supports deep chaining
      const chainable: Record<string, unknown> = {};
      chainable['eq'] = vi.fn().mockReturnValue(chainable);
      chainable['neq'] = vi.fn().mockReturnValue({ limit: mockLimit });
      chainable['limit'] = mockLimit;
      chainable['single'] = mockSingle;
      chainable['maybeSingle'] = mockMaybeSingle;
      void mockEqChain;
      return chainable;
    };

    if (callNum === 1) {
      // First call: initial consultation fetch
      const chain = buildChain({ data: consultationData, error: null });
      return { select: vi.fn().mockReturnValue(chain), update: mockUpdate };
    } else {
      // Second+ calls: cache lookup
      const chain = buildChain({ data: cachedConsultation, error: null });
      return { select: vi.fn().mockReturnValue(chain), update: mockUpdate };
    }
  });

  return {
    from: mockFrom,
    _mockUpdate: mockUpdate,
    _mockUpdateEq: mockUpdateEq,
  };
}

describe('POST /api/consultation/analyze', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with valid faceAnalysis when AI returns valid data', async () => {
    const mockSupabase = createMockSupabase();
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const mockRouter = {
      execute: vi.fn().mockResolvedValue(validFaceAnalysis),
    };
    (getAIRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);
    (validateFaceAnalysis as ReturnType<typeof vi.fn>)
      .mockReturnValue({ valid: true, data: validFaceAnalysis });

    const request = createRequest(validPayload);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('faceAnalysis');
    expect(data.faceAnalysis).toEqual(validFaceAnalysis);
  });

  it('retries with temperature 0.2 when first AI call returns invalid data, succeeds on retry', async () => {
    const mockSupabase = createMockSupabase();
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const mockRouter = {
      execute: vi.fn().mockResolvedValue(validFaceAnalysis),
    };
    (getAIRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);

    // First call fails validation, second succeeds
    (validateFaceAnalysis as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({ valid: false, reason: 'schema_invalid', details: [{ message: 'Invalid' }] })
      .mockReturnValueOnce({ valid: true, data: validFaceAnalysis });

    const request = createRequest(validPayload);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.faceAnalysis).toEqual(validFaceAnalysis);
    // execute should be called twice (first attempt + retry)
    expect(mockRouter.execute).toHaveBeenCalledTimes(2);
    // logValidationFailure should NOT be called when retry succeeds (no 422 returned)
    expect(logValidationFailure).not.toHaveBeenCalled();
  });

  it('returns 422 when both AI attempts fail validation', async () => {
    const mockSupabase = createMockSupabase();
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const mockRouter = {
      execute: vi.fn().mockResolvedValue(invalidFaceAnalysis),
    };
    (getAIRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);

    const zodIssues = [{ message: 'Invalid faceShape' }];
    (validateFaceAnalysis as ReturnType<typeof vi.fn>)
      .mockReturnValue({ valid: false, reason: 'schema_invalid', details: zodIssues });

    const request = createRequest(validPayload);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toBe('AI analysis failed validation');
    expect(data.details).toEqual(zodIssues);
  });

  it('calls logValidationFailure when both AI attempts fail validation', async () => {
    const mockSupabase = createMockSupabase();
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const mockRouter = {
      execute: vi.fn().mockResolvedValue(invalidFaceAnalysis),
    };
    (getAIRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);

    (validateFaceAnalysis as ReturnType<typeof vi.fn>)
      .mockReturnValue({ valid: false, reason: 'low_confidence', details: [] });

    const request = createRequest(validPayload);
    await POST(request);

    expect(logValidationFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        context: 'analyze',
        reason: 'low_confidence',
        details: [],
        timestamp: expect.any(String),
      })
    );
  });

  it('returns 400 when consultationId is missing', async () => {
    const { consultationId: _id, ...payload } = validPayload;
    const request = createRequest(payload);
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('returns 400 when consultationId is not a valid UUID', async () => {
    const request = createRequest({ ...validPayload, consultationId: 'not-a-uuid' });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('returns 400 when photoBase64 is empty string', async () => {
    const request = createRequest({ ...validPayload, photoBase64: '' });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('returns 400 when mimeType is invalid', async () => {
    const request = createRequest({ ...validPayload, mimeType: 'image/bmp' });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('returns 404 when consultation is not found in DB', async () => {
    const mockSupabase = createMockSupabase({ consultationFound: false });
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const request = createRequest(validPayload);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Consultation not found');
  });

  it('returns 200 even when Supabase DB update fails after successful AI analysis', async () => {
    const dbUpdateError = new Error('DB write failed') as unknown as null;
    const mockSupabase = createMockSupabase({ updateError: dbUpdateError });
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const mockRouter = {
      execute: vi.fn().mockResolvedValue(validFaceAnalysis),
    };
    (getAIRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);
    (validateFaceAnalysis as ReturnType<typeof vi.fn>)
      .mockReturnValue({ valid: true, data: validFaceAnalysis });

    const request = createRequest(validPayload);
    const response = await POST(request);
    const data = await response.json();

    // Should still return 200 with the face analysis
    expect(response.status).toBe(200);
    expect(data.faceAnalysis).toEqual(validFaceAnalysis);
  });

  it('defaults mimeType to image/jpeg when omitted', async () => {
    const { mimeType: _mime, ...payloadWithoutMime } = validPayload;
    const mockSupabase = createMockSupabase();
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const mockRouter = {
      execute: vi.fn().mockResolvedValue(validFaceAnalysis),
    };
    (getAIRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);
    (validateFaceAnalysis as ReturnType<typeof vi.fn>)
      .mockReturnValue({ valid: true, data: validFaceAnalysis });

    const request = createRequest(payloadWithoutMime);
    const response = await POST(request);

    // Should work without error (no 400)
    expect(response.status).toBe(200);
  });

  it('returns 500 when AI router throws an error', async () => {
    const mockSupabase = createMockSupabase();
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const mockRouter = {
      execute: vi.fn().mockRejectedValue(new Error('AI provider failure')),
    };
    (getAIRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);

    const request = createRequest(validPayload);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toHaveProperty('error');
  });

  it('calls status=analyzing update before AI analysis (AC5: status lifecycle)', async () => {
    const mockSupabase = createMockSupabase();
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const mockRouter = {
      execute: vi.fn().mockResolvedValue(validFaceAnalysis),
    };
    (getAIRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);
    (validateFaceAnalysis as ReturnType<typeof vi.fn>)
      .mockReturnValue({ valid: true, data: validFaceAnalysis });

    const request = createRequest(validPayload);
    await POST(request);

    // Verify update was called with status: 'analyzing' (first update call)
    expect(mockSupabase._mockUpdate).toHaveBeenCalledWith({ status: 'analyzing' });
    // Verify update was also called with final state (face_analysis + status: 'complete' + ai_cost_cents)
    expect(mockSupabase._mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        face_analysis: validFaceAnalysis,
        status: 'complete',
        ai_cost_cents: expect.any(Number),
      })
    );
  });

  it('persists AI call log and sets correct ai_cost_cents when getAICallLogs returns a log entry', async () => {
    const mockSupabase = createMockSupabase();
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const mockRouter = {
      execute: vi.fn().mockResolvedValue(validFaceAnalysis),
    };
    (getAIRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);
    (validateFaceAnalysis as ReturnType<typeof vi.fn>)
      .mockReturnValue({ valid: true, data: validFaceAnalysis });

    const mockLog = {
      id: 'log-uuid-1',
      provider: 'gemini' as const,
      model: 'gemini-2.5-flash',
      task: 'face-analysis' as const,
      inputTokens: 1000,
      outputTokens: 500,
      costCents: 5,
      latencyMs: 1200,
      success: true,
      timestamp: new Date().toISOString(),
    };

    // Simulate logsBefore=0 (empty before call), then 1 new log after AI call
    (getAICallLogs as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce([]) // logsBefore snapshot: empty store
      .mockReturnValue([mockLog]); // logsAfter: one new log was added by the AI call

    const request = createRequest(validPayload);
    await POST(request);

    // persistAICallLog should be called with the new log entry
    expect(persistAICallLog).toHaveBeenCalledWith(
      mockSupabase,
      validPayload.consultationId,
      mockLog
    );

    // ai_cost_cents should be Math.round(5) = 5
    expect(mockSupabase._mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        face_analysis: validFaceAnalysis,
        status: 'complete',
        ai_cost_cents: 5,
      })
    );
  });

  it('persists both initial and retry AI call logs when retry occurs', async () => {
    const mockSupabase = createMockSupabase();
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const mockRouter = {
      execute: vi.fn().mockResolvedValue(validFaceAnalysis),
    };
    (getAIRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);
    // First call fails validation, second succeeds
    (validateFaceAnalysis as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({ valid: false, reason: 'schema_invalid', details: [] })
      .mockReturnValueOnce({ valid: true, data: validFaceAnalysis });

    const mockLog1 = {
      id: 'log-uuid-1',
      provider: 'gemini' as const,
      model: 'gemini-2.5-flash',
      task: 'face-analysis' as const,
      inputTokens: 1000,
      outputTokens: 500,
      costCents: 3,
      latencyMs: 1000,
      success: false,
      timestamp: new Date().toISOString(),
    };
    const mockLog2 = {
      id: 'log-uuid-2',
      provider: 'gemini' as const,
      model: 'gemini-2.5-flash',
      task: 'face-analysis' as const,
      inputTokens: 900,
      outputTokens: 450,
      costCents: 2,
      latencyMs: 900,
      success: true,
      timestamp: new Date().toISOString(),
    };

    // First call: logsBefore=0, after=1 log; then logsAfter=2 logs
    (getAICallLogs as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce([]) // logsBefore snapshot: 0 logs
      .mockReturnValue([mockLog1, mockLog2]); // logsAfter: both logs added

    const request = createRequest(validPayload);
    const response = await POST(request);

    expect(response.status).toBe(200);
    // Both logs should be persisted
    expect(persistAICallLog).toHaveBeenCalledTimes(2);
    expect(persistAICallLog).toHaveBeenCalledWith(mockSupabase, validPayload.consultationId, mockLog1);
    expect(persistAICallLog).toHaveBeenCalledWith(mockSupabase, validPayload.consultationId, mockLog2);

    // ai_cost_cents should sum both: Math.round(3 + 2) = 5
    expect(mockSupabase._mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        ai_cost_cents: 5,
      })
    );
  });

  it('returns 400 when photoBase64 exceeds maximum allowed size', async () => {
    // Create a string longer than MAX_PHOTO_BASE64_LENGTH (6MB)
    const oversizedBase64 = 'A'.repeat(6 * 1024 * 1024 + 1);
    const request = createRequest({ ...validPayload, photoBase64: oversizedBase64 });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Photo exceeds maximum allowed size');
  });

  // AC: 3, 4, 8 — cache hit path returns cached face analysis with no AI call
  it('returns cached face analysis when cache hit found (no AI call)', async () => {
    const cachedFaceAnalysis = {
      faceShape: 'oval',
      confidence: 0.9,
      proportions: { foreheadRatio: 0.78, cheekboneRatio: 1.0, jawRatio: 0.72, faceLength: 1.35 },
      hairAssessment: { type: 'straight', texture: 'medium', density: 'medium', currentStyle: 'short' },
    };

    const mockSupabase = createMockSupabaseForCacheTests({
      cachedConsultation: { face_analysis: cachedFaceAnalysis },
    });
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const mockRouter = { execute: vi.fn().mockResolvedValue(cachedFaceAnalysis) };
    (getAIRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);
    (validateFaceAnalysis as ReturnType<typeof vi.fn>).mockReturnValue({
      valid: true,
      data: cachedFaceAnalysis,
    });

    const request = createRequest(validPayload);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.faceAnalysis).toEqual(cachedFaceAnalysis);
    expect(data.cached).toBe(true);
    // AI should NOT be called on cache hit
    expect(mockRouter.execute).not.toHaveBeenCalled();
    // persistAICallLog should NOT be called on cache hit (ai_cost_cents stays 0)
    expect(persistAICallLog).not.toHaveBeenCalled();
  });

  // AC: 1, 2, 3 — cache miss path calls AI and stores hashes
  it('calls AI and stores hashes when cache miss (no cached consultation found)', async () => {
    const mockSupabase = createMockSupabaseForCacheTests({
      cachedConsultation: null,
    });
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const mockRouter = { execute: vi.fn().mockResolvedValue(validFaceAnalysis) };
    (getAIRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);
    (validateFaceAnalysis as ReturnType<typeof vi.fn>).mockReturnValue({
      valid: true,
      data: validFaceAnalysis,
    });

    const request = createRequest(validPayload);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.faceAnalysis).toEqual(validFaceAnalysis);
    expect(data.cached).toBeUndefined();
    // AI should be called on cache miss
    expect(mockRouter.execute).toHaveBeenCalledTimes(1);
    // DB update should include photo_hash and questionnaire_hash
    expect(mockSupabase._mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        face_analysis: validFaceAnalysis,
        status: 'complete',
        photo_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
        questionnaire_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
      })
    );
  });
});
