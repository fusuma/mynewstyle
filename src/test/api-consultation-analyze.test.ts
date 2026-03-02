import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/consultation/analyze/route';
import { NextRequest } from 'next/server';

// Mock AI router
vi.mock('@/lib/ai', () => ({
  getAIRouter: vi.fn(),
  validateFaceAnalysis: vi.fn(),
  logValidationFailure: vi.fn(),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

// Import after mocks
import { getAIRouter, validateFaceAnalysis, logValidationFailure } from '@/lib/ai';
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
      ? { data: { id: validPayload.consultationId, status: 'pending' }, error: null }
      : { data: null, error: { message: 'Not found' } }
  );
  const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

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
    // Verify update was also called with final state (face_analysis + status: 'complete')
    expect(mockSupabase._mockUpdate).toHaveBeenCalledWith({
      face_analysis: validFaceAnalysis,
      status: 'complete',
    });
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
});
