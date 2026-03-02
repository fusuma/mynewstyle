import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/consultation/generate/route';
import { NextRequest } from 'next/server';

// Mock AI router — must be at module top level (Vitest hoists these)
vi.mock('@/lib/ai', () => ({
  getAIRouter: vi.fn(),
  validateConsultation: vi.fn(),
  logValidationFailure: vi.fn(),
  getAICallLogs: vi.fn().mockReturnValue([]),
  clearAICallLogs: vi.fn(),
  persistAICallLog: vi.fn().mockResolvedValue(undefined),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

// Import after mocks
import { getAIRouter, validateConsultation, logValidationFailure, getAICallLogs, persistAICallLog } from '@/lib/ai';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Valid ConsultationOutput matching ConsultationSchema
const validConsultation = {
  recommendations: [
    {
      styleName: 'Undercut Clássico',
      justification:
        'Este corte complementa o rosto oval ao adicionar estrutura nas laterais. A versatilidade do undercut permite múltiplos estilos no topo.',
      matchScore: 0.92,
      difficultyLevel: 'medium' as const,
    },
    {
      styleName: 'Fade Lateral',
      justification:
        'O fade lateral cria uma transição suave que realça as proporções do rosto oval. Fácil de manter com visitas regulares ao barbeiro.',
      matchScore: 0.85,
      difficultyLevel: 'low' as const,
    },
  ],
  stylesToAvoid: [
    {
      styleName: 'Franja Volumosa',
      reason:
        'Adiciona peso excessivo ao topo, desequilibrando as proporções naturais do rosto oval.',
    },
    {
      styleName: 'Topknot Volumoso',
      reason: 'Cria altura excessiva no topo, fazendo o rosto parecer mais comprido do que é.',
    },
  ],
  groomingTips: [
    { category: 'products' as const, tipText: 'Use pomada de fixação média para styling', icon: '💆' },
    { category: 'routine' as const, tipText: 'Lavar o cabelo em dias alternados', icon: '🚿' },
    {
      category: 'barber_tips' as const,
      tipText: 'Visita ao barbeiro a cada 3-4 semanas para manter o fade',
      icon: '✂️',
    },
  ],
};

const validConsultationRecordWithHashes = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  status: 'analyzing',
  payment_status: 'paid',
  face_analysis: {
    faceShape: 'oval',
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
      currentStyle: 'short',
    },
  },
  questionnaire_responses: { gender: 'male', lifestyle: 'active', maintenance: 'low' },
  ai_cost_cents: 1,
  photo_hash: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1',
  questionnaire_hash: 'def456abc123def456abc123def456abc123def456abc123def456abc123def4',
  gender: 'male',
};

const validConsultationRecord = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  status: 'analyzing',
  payment_status: 'paid',
  face_analysis: {
    faceShape: 'oval',
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
      currentStyle: 'short',
    },
  },
  questionnaire_responses: { gender: 'male', lifestyle: 'active', maintenance: 'low' },
  ai_cost_cents: 1,
};

const validConsultationId = '550e8400-e29b-41d4-a716-446655440000';

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/consultation/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * Creates a mock Supabase client that supports the chained API used in the route.
 * Supports: .from().select().eq().single() and .from().insert() and .from().update().eq()
 * and .from().select().eq().limit() for idempotency recommendations check.
 */
function createMockSupabase({
  consultationFound = true,
  consultationData = validConsultationRecord as Record<string, unknown> | null,
  insertError = null as { message: string } | null,
  updateError = null as { message: string } | null,
  existingRecommendations = [] as { id: string }[],
} = {}) {
  const mockSingle = vi.fn().mockResolvedValue(
    consultationFound && consultationData
      ? { data: consultationData, error: null }
      : { data: null, error: { message: 'Not found' } }
  );

  // Chain for recommendations idempotency check: .select().eq().limit()
  const mockLimit = vi.fn().mockResolvedValue({ data: existingRecommendations, error: null });
  const mockSelectEqWithLimit = vi.fn().mockReturnValue({ single: mockSingle, limit: mockLimit });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEqWithLimit });

  const mockUpdateEq = vi.fn().mockResolvedValue({ data: null, error: updateError });
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

  const mockInsert = vi.fn().mockResolvedValue({ error: insertError });

  const mockFrom = vi.fn().mockImplementation((_table: string) => ({
    select: mockSelect,
    update: mockUpdate,
    insert: mockInsert,
  }));

  return {
    from: mockFrom,
    _mockSingle: mockSingle,
    _mockUpdate: mockUpdate,
    _mockUpdateEq: mockUpdateEq,
    _mockInsert: mockInsert,
    _mockLimit: mockLimit,
  };
}

describe('POST /api/consultation/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // AC1, AC2, AC6: valid paid consultation, AI succeeds → 200 with consultation
  it('returns 200 with consultation when AI succeeds for paid consultation', async () => {
    const mockSupabase = createMockSupabase();
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const mockRouter = { execute: vi.fn().mockResolvedValue(validConsultation) };
    (getAIRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);
    (validateConsultation as ReturnType<typeof vi.fn>).mockReturnValue({
      valid: true,
      data: validConsultation,
    });

    const request = createRequest({ consultationId: validConsultationId });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('consultation');
    expect(data.consultation).toEqual(validConsultation);
  });

  // AC4: First AI call fails validation, retry succeeds → 200, generateConsultation called twice
  it('retries when first AI call fails validation and succeeds on retry', async () => {
    const mockSupabase = createMockSupabase();
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const mockRouter = { execute: vi.fn().mockResolvedValue(validConsultation) };
    (getAIRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);

    // First call fails validation, second succeeds
    (validateConsultation as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({ valid: false, reason: 'schema_invalid', details: [{ message: 'Invalid' }] })
      .mockReturnValueOnce({ valid: true, data: validConsultation });

    const request = createRequest({ consultationId: validConsultationId });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.consultation).toEqual(validConsultation);
    // execute should be called twice (first attempt + retry)
    expect(mockRouter.execute).toHaveBeenCalledTimes(2);
    // logValidationFailure should NOT be called when retry succeeds (no 422 returned)
    expect(logValidationFailure).not.toHaveBeenCalled();
  });

  // AC5: Both attempts fail validation → 422
  it('returns 422 when both AI attempts fail validation', async () => {
    const mockSupabase = createMockSupabase();
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const mockRouter = { execute: vi.fn().mockResolvedValue({}) };
    (getAIRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);

    const zodIssues = [{ message: 'Invalid consultation structure' }];
    (validateConsultation as ReturnType<typeof vi.fn>).mockReturnValue({
      valid: false,
      reason: 'schema_invalid',
      details: zodIssues,
    });

    const request = createRequest({ consultationId: validConsultationId });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toBe('AI consultation failed validation');
    expect(data.details).toEqual(zodIssues);
  });

  // AC8: calls logValidationFailure when both attempts fail
  it('calls logValidationFailure when both AI attempts fail validation', async () => {
    const mockSupabase = createMockSupabase();
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const mockRouter = { execute: vi.fn().mockResolvedValue({}) };
    (getAIRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);

    (validateConsultation as ReturnType<typeof vi.fn>).mockReturnValue({
      valid: false,
      reason: 'match_scores_all_equal',
      details: [],
    });

    const request = createRequest({ consultationId: validConsultationId });
    await POST(request);

    expect(logValidationFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        context: 'generate',
        reason: 'match_scores_all_equal',
        details: [],
        timestamp: expect.any(String),
      })
    );
  });

  // AC1: missing consultationId → 400
  it('returns 400 when consultationId is missing', async () => {
    const request = createRequest({});
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });

  // AC1: invalid UUID → 400
  it('returns 400 when consultationId is not a valid UUID', async () => {
    const request = createRequest({ consultationId: 'not-a-uuid' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });

  // AC1: consultation not found → 404
  it('returns 404 when consultation is not found in DB', async () => {
    const mockSupabase = createMockSupabase({ consultationFound: false, consultationData: null });
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const request = createRequest({ consultationId: validConsultationId });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Consultation not found');
  });

  // AC7: consultation payment_status = 'free' → 403
  it('returns 403 when payment_status is "free"', async () => {
    const mockSupabase = createMockSupabase({
      consultationData: { ...validConsultationRecord, payment_status: 'free' },
    });
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const request = createRequest({ consultationId: validConsultationId });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Payment required');
  });

  // AC7: consultation payment_status = 'pending' → 403
  it('returns 403 when payment_status is "pending"', async () => {
    const mockSupabase = createMockSupabase({
      consultationData: { ...validConsultationRecord, payment_status: 'pending' },
    });
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const request = createRequest({ consultationId: validConsultationId });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Payment required');
  });

  // AC8: consultation already status='complete' AND recommendations exist → 200 { status: 'already_complete' }, no AI call
  it('returns 200 { status: already_complete } without calling AI when consultation is already complete with existing recommendations', async () => {
    const mockSupabase = createMockSupabase({
      consultationData: { ...validConsultationRecord, status: 'complete' },
      existingRecommendations: [{ id: 'rec-uuid-1' }],
    });
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const request = createRequest({ consultationId: validConsultationId });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ status: 'already_complete' });
    // getAIRouter should NOT be called
    expect(getAIRouter).not.toHaveBeenCalled();
  });

  // AC6: DB write fails after successful AI generation → 200 (returns consultation, logs error)
  it('returns 200 with consultation even when DB insert fails after successful AI generation', async () => {
    const mockSupabase = createMockSupabase({
      insertError: { message: 'DB insert failed' },
    });
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const mockRouter = { execute: vi.fn().mockResolvedValue(validConsultation) };
    (getAIRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);
    (validateConsultation as ReturnType<typeof vi.fn>).mockReturnValue({
      valid: true,
      data: validConsultation,
    });

    const request = createRequest({ consultationId: validConsultationId });
    const response = await POST(request);
    const data = await response.json();

    // Should still return 200 with the consultation
    expect(response.status).toBe(200);
    expect(data.consultation).toEqual(validConsultation);
  });

  // AC2: getAIRouter().execute() throws 500
  it('returns 500 when getAIRouter execute throws an error', async () => {
    const mockSupabase = createMockSupabase();
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const mockRouter = {
      execute: vi.fn().mockRejectedValue(new Error('AI provider failure')),
    };
    (getAIRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);

    const request = createRequest({ consultationId: validConsultationId });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toHaveProperty('error');
  });

  // AC3: gender='female' in questionnaire → generateConsultation called (provider handles routing internally)
  it('calls generateConsultation when gender is female (provider handles prompt routing internally)', async () => {
    const mockSupabase = createMockSupabase({
      consultationData: {
        ...validConsultationRecord,
        questionnaire_responses: { gender: 'female', lifestyle: 'casual', maintenance: 'medium' },
      },
    });
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const mockRouter = { execute: vi.fn().mockResolvedValue(validConsultation) };
    (getAIRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);
    (validateConsultation as ReturnType<typeof vi.fn>).mockReturnValue({
      valid: true,
      data: validConsultation,
    });

    const request = createRequest({ consultationId: validConsultationId });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.consultation).toEqual(validConsultation);
    // generateConsultation should have been called (via execute)
    expect(mockRouter.execute).toHaveBeenCalledTimes(1);
  });

  // AC: 5, 6, 8 — cache hit path in generate route returns copied recommendations with no AI call
  it('returns cached consultation when cache hit found in generate route (no AI call)', async () => {
    const cachedConsultationId = '660e8400-e29b-41d4-a716-446655440001';
    const cachedRecs = [
      {
        id: 'rec-1',
        rank: 1,
        style_name: 'Undercut Clássico',
        justification: 'Great for oval face',
        match_score: 0.92,
        difficulty_level: 'medium',
      },
    ];
    const cachedStylesAvoid = [{ style_name: 'Franja Volumosa', reason: 'Too heavy' }];
    const cachedTips = [{ category: 'products', tip_text: 'Use pomada', icon: '💆' }];

    const mockUpdateEq = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });
    const mockInsert = vi.fn().mockResolvedValue({ error: null });

    // Track consultation calls separately (initial fetch vs cache lookup)
    let consultationsCallCount = 0;
    let recommendationsCallCount = 0;

    // Helper: build a deep chainable mock that supports .eq().eq().neq().limit().maybeSingle()
    function buildDeepChain(terminalResult: unknown) {
      const maybeSingle = vi.fn().mockResolvedValue(terminalResult);
      const limitFn = vi.fn().mockReturnValue({ maybeSingle });
      const obj: Record<string, unknown> = {};
      obj['maybeSingle'] = maybeSingle;
      obj['limit'] = limitFn;
      obj['single'] = vi.fn().mockResolvedValue(terminalResult);
      obj['order'] = vi.fn().mockResolvedValue(terminalResult);
      // neq always leads to the terminal
      obj['neq'] = vi.fn().mockReturnValue({ limit: limitFn, maybeSingle });
      // eq returns the same object for deep chaining (neq will be accessible)
      obj['eq'] = vi.fn().mockReturnValue(obj);
      return obj;
    }

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'consultations') {
        consultationsCallCount++;
        if (consultationsCallCount === 1) {
          // Initial consultation fetch
          const chain = buildDeepChain({ data: validConsultationRecordWithHashes, error: null });
          return { select: vi.fn().mockReturnValue(chain), update: mockUpdate, insert: mockInsert };
        } else {
          // Cache lookup — returns cached consultation id
          const chain = buildDeepChain({ data: { id: cachedConsultationId }, error: null });
          return { select: vi.fn().mockReturnValue(chain), update: mockUpdate, insert: mockInsert };
        }
      } else if (table === 'recommendations') {
        recommendationsCallCount++;
        if (recommendationsCallCount === 1) {
          // Cached recommendations fetch
          const chain = buildDeepChain({ data: cachedRecs, error: null });
          return { select: vi.fn().mockReturnValue(chain), update: mockUpdate, insert: mockInsert };
        } else {
          // Insert for copied recs
          return { select: vi.fn(), update: mockUpdate, insert: mockInsert };
        }
      } else if (table === 'styles_to_avoid') {
        const chain = buildDeepChain({ data: cachedStylesAvoid, error: null });
        return { select: vi.fn().mockReturnValue(chain), update: mockUpdate, insert: mockInsert };
      } else if (table === 'grooming_tips') {
        const chain = buildDeepChain({ data: cachedTips, error: null });
        return { select: vi.fn().mockReturnValue(chain), update: mockUpdate, insert: mockInsert };
      } else {
        const chain = buildDeepChain({ data: null, error: null });
        return { select: vi.fn().mockReturnValue(chain), update: mockUpdate, insert: mockInsert };
      }
    });

    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const request = createRequest({ consultationId: validConsultationId });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.cached).toBe(true);
    expect(data.consultation).toBeDefined();
    // AI should NOT be called on cache hit
    expect(getAIRouter).not.toHaveBeenCalled();
    // persistAICallLog should NOT be called
    expect(persistAICallLog).not.toHaveBeenCalled();
  });

  // AC: 5 — cache miss path proceeds with normal AI call when no cache found
  it('proceeds with AI call when cache miss in generate route', async () => {
    // Use consultation with hashes but no cache hit
    const consultationWithHashes = {
      ...validConsultationRecord,
      photo_hash: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1',
      questionnaire_hash: 'def456abc123def456abc123def456abc123def456abc123def456abc123def4',
      gender: 'male',
    };

    const mockUpdateEq = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });
    const mockInsert = vi.fn().mockResolvedValue({ error: null });

    function buildDeepChain(terminalResult: unknown) {
      const maybeSingle = vi.fn().mockResolvedValue(terminalResult);
      const limitFn = vi.fn().mockReturnValue({ maybeSingle });
      const obj: Record<string, unknown> = {};
      obj['maybeSingle'] = maybeSingle;
      obj['limit'] = limitFn;
      obj['single'] = vi.fn().mockResolvedValue(terminalResult);
      obj['order'] = vi.fn().mockResolvedValue(terminalResult);
      obj['neq'] = vi.fn().mockReturnValue({ limit: limitFn, maybeSingle });
      obj['eq'] = vi.fn().mockReturnValue(obj);
      return obj;
    }

    let consultationsCallCount = 0;

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'consultations') {
        consultationsCallCount++;
        if (consultationsCallCount === 1) {
          // Initial consultation fetch
          const chain = buildDeepChain({ data: consultationWithHashes, error: null });
          return { select: vi.fn().mockReturnValue(chain), update: mockUpdate, insert: mockInsert };
        } else {
          // Cache lookup — returns null (cache miss)
          const chain = buildDeepChain({ data: null, error: null });
          return { select: vi.fn().mockReturnValue(chain), update: mockUpdate, insert: mockInsert };
        }
      } else {
        const chain = buildDeepChain({ data: [], error: null });
        return { select: vi.fn().mockReturnValue(chain), update: mockUpdate, insert: mockInsert };
      }
    });

    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const mockRouter = { execute: vi.fn().mockResolvedValue(validConsultation) };
    (getAIRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);
    (validateConsultation as ReturnType<typeof vi.fn>).mockReturnValue({
      valid: true,
      data: validConsultation,
    });

    const request = createRequest({ consultationId: validConsultationId });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.consultation).toEqual(validConsultation);
    expect(data.cached).toBeUndefined();
    // AI should be called on cache miss
    expect(mockRouter.execute).toHaveBeenCalledTimes(1);
  });

  // AC: 6 — consultation with null hashes skips cache lookup entirely
  it('skips cache lookup when photo_hash is null (backward compat)', async () => {
    const consultationNoHashes = {
      ...validConsultationRecord,
      photo_hash: null,
      questionnaire_hash: null,
      gender: 'male',
    };

    const mockSupabase = createMockSupabase({
      consultationData: consultationNoHashes,
    });
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const mockRouter = { execute: vi.fn().mockResolvedValue(validConsultation) };
    (getAIRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);
    (validateConsultation as ReturnType<typeof vi.fn>).mockReturnValue({
      valid: true,
      data: validConsultation,
    });

    const request = createRequest({ consultationId: validConsultationId });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.consultation).toEqual(validConsultation);
    // AI should be called since no hashes to lookup
    expect(mockRouter.execute).toHaveBeenCalledTimes(1);
  });

  // AC1: invalid request body (non-JSON) → 400
  it('returns 400 when request body is not valid JSON', async () => {
    const request = new NextRequest('http://localhost:3000/api/consultation/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });

  // AC9: cost tracking - verify update includes ai_cost_cents cumulative cost
  it('updates consultations table with status=complete, completed_at, and cumulative ai_cost_cents', async () => {
    const mockSupabase = createMockSupabase();
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const mockRouter = { execute: vi.fn().mockResolvedValue(validConsultation) };
    (getAIRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);
    (validateConsultation as ReturnType<typeof vi.fn>).mockReturnValue({
      valid: true,
      data: validConsultation,
    });

    // Simulate AI call logger returning 1 log entry for this Step 2 call (costCents=2)
    // The route reads logs after index logsBefore; mock returns a list with one new entry
    const mockLogsWithEntry = [
      {
        id: 'log-1',
        provider: 'gemini' as const,
        model: 'gemini-2.5-flash',
        task: 'consultation' as const,
        inputTokens: 500,
        outputTokens: 300,
        costCents: 2,
        latencyMs: 5000,
        success: true,
        timestamp: new Date().toISOString(),
      },
    ];
    // Return empty on first call (logsBefore snapshot), full list on subsequent calls
    (getAICallLogs as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce([]) // snapshot before AI call
      .mockReturnValue(mockLogsWithEntry); // after AI calls

    const request = createRequest({ consultationId: validConsultationId });
    await POST(request);

    // validConsultationRecord.ai_cost_cents = 1, step2 cost = 2, total = 3
    expect(mockSupabase._mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'complete',
        completed_at: expect.any(String),
        ai_cost_cents: 3,
      })
    );
  });
});
