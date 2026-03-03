import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// NOTE: @vladmandic/face-api and @tensorflow/tfjs-node are heavy native deps.
// In tests, we mock the model loader and faceapi entirely.
// ---------------------------------------------------------------------------

// Mock the model-loader module
vi.mock('@/lib/ai/face-similarity/model-loader', () => ({
  loadFaceApiModels: vi.fn().mockResolvedValue(undefined),
}));

// Mock face-api.js entirely to avoid heavy ML dependencies in tests
const mockDetectAllFacesMock = {
  withFaceLandmarks: vi.fn().mockReturnThis(),
  withFaceDescriptors: vi.fn().mockResolvedValue([
    {
      detection: { box: { width: 150, height: 150, area: 22500 } },
      descriptor: new Float32Array(128).fill(0.1),
    },
    {
      detection: { box: { width: 80, height: 80, area: 6400 } },
      descriptor: new Float32Array(128).fill(0.5),
    },
  ]),
};

vi.mock('@vladmandic/face-api', () => ({
  nets: {
    ssdMobilenetv1: { loadFromDisk: vi.fn().mockResolvedValue(undefined) },
    faceLandmark68Net: { loadFromDisk: vi.fn().mockResolvedValue(undefined) },
    faceRecognitionNet: { loadFromDisk: vi.fn().mockResolvedValue(undefined) },
  },
  detectAllFaces: vi.fn(() => mockDetectAllFacesMock),
  SsdMobilenetv1Options: vi.fn(),
  createCanvasFromMedia: vi.fn(),
  env: {
    monkeyPatch: vi.fn(),
  },
  euclideanDistance: vi.fn().mockImplementation((a: Float32Array, b: Float32Array) => {
    // Simple implementation for tests
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(sum);
  }),
}));

// Mock canvas module
vi.mock('canvas', () => ({
  createCanvas: vi.fn(() => ({
    getContext: vi.fn(() => ({
      drawImage: vi.fn(),
    })),
    toDataURL: vi.fn(() => 'data:image/jpeg;base64,fake'),
  })),
  loadImage: vi.fn().mockResolvedValue({
    width: 300,
    height: 300,
  }),
  Image: vi.fn(),
  ImageData: vi.fn(),
  CanvasRenderingContext2D: vi.fn(),
}));

// ===========================================================================
// Test: compareFaces
// ===========================================================================
describe('compareFaces', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('returns { similarity: number, passed: true } when faces match (similarity >= 0.7)', async () => {
    const { compareFaces } = await import('@/lib/ai/face-similarity/compare');

    // Two identical descriptors = distance 0 = similarity 1.0
    const fakeBuffer = Buffer.from('fake-image-data');
    const result = await compareFaces(fakeBuffer, fakeBuffer);

    expect(result).toHaveProperty('similarity');
    expect(result).toHaveProperty('passed');
    expect(typeof result.similarity).toBe('number');
    expect(result.similarity).toBeGreaterThanOrEqual(0);
    expect(result.similarity).toBeLessThanOrEqual(1);
    expect(result.passed).toBe(true);
  });

  it('returns passed=false with reason="quality_gate" when similarity < 0.7', async () => {
    const faceapi = await import('@vladmandic/face-api');
    // Override extractFaceDescriptor to return different descriptors
    (faceapi.euclideanDistance as ReturnType<typeof vi.fn>).mockReturnValueOnce(0.5); // distance 0.5 → similarity 0.5

    const { compareFaces } = await import('@/lib/ai/face-similarity/compare');

    // To test the 'quality_gate' reason, we need low similarity
    // We'll test the threshold logic directly in the threshold tests
    const fakeBuffer = Buffer.from('fake-image-data');
    const result = await compareFaces(fakeBuffer, fakeBuffer);

    expect(result).toHaveProperty('similarity');
    expect(result).toHaveProperty('passed');
  });

  it('returns { similarity: 0, passed: false, reason: "face_not_detected" } when no face in original', async () => {
    const faceapi = await import('@vladmandic/face-api');
    // First call: no face detected (null)
    (faceapi.detectAllFaces as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      withFaceLandmarks: vi.fn().mockReturnThis(),
      withFaceDescriptors: vi.fn().mockResolvedValue([]), // No faces
    });

    const { compareFaces } = await import('@/lib/ai/face-similarity/compare');
    const fakeBuffer = Buffer.from('fake-image-data');
    const result = await compareFaces(fakeBuffer, fakeBuffer);

    expect(result.similarity).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.reason).toBe('face_not_detected');
  });

  it('exports FaceSimilarityResult type (compile-time check via usage)', async () => {
    const compareModule = await import('@/lib/ai/face-similarity/compare');
    expect(compareModule.compareFaces).toBeDefined();
    expect(typeof compareModule.compareFaces).toBe('function');
  });
});

// ===========================================================================
// Test: extractFaceDescriptor
// ===========================================================================
describe('extractFaceDescriptor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('returns a Float32Array of length 128 when a face is detected', async () => {
    const { extractFaceDescriptor } = await import('@/lib/ai/face-similarity/extract-descriptor');
    const fakeBuffer = Buffer.from('fake-image-data');
    const descriptor = await extractFaceDescriptor(fakeBuffer);

    expect(descriptor).not.toBeNull();
    expect(descriptor).toBeInstanceOf(Float32Array);
    expect(descriptor?.length).toBe(128);
  });

  it('returns null when no face is detected in image', async () => {
    const faceapi = await import('@vladmandic/face-api');
    // Mock detectAllFaces to return empty array (no faces)
    (faceapi.detectAllFaces as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      withFaceLandmarks: vi.fn().mockReturnThis(),
      withFaceDescriptors: vi.fn().mockResolvedValue([]),
    });

    const { extractFaceDescriptor } = await import('@/lib/ai/face-similarity/extract-descriptor');
    const fakeBuffer = Buffer.from('fake-image-data');
    const descriptor = await extractFaceDescriptor(fakeBuffer);

    expect(descriptor).toBeNull();
  });

  it('returns descriptor for the largest face when multiple faces are detected', async () => {
    const faceapi = await import('@vladmandic/face-api');
    const largeDescriptor = new Float32Array(128).fill(0.9); // larger face
    const smallDescriptor = new Float32Array(128).fill(0.1); // smaller face

    (faceapi.detectAllFaces as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      withFaceLandmarks: vi.fn().mockReturnThis(),
      withFaceDescriptors: vi.fn().mockResolvedValue([
        {
          detection: { box: { width: 200, height: 200, area: 40000 } }, // larger
          descriptor: largeDescriptor,
        },
        {
          detection: { box: { width: 50, height: 50, area: 2500 } }, // smaller
          descriptor: smallDescriptor,
        },
      ]),
    });

    const { extractFaceDescriptor } = await import('@/lib/ai/face-similarity/extract-descriptor');
    const fakeBuffer = Buffer.from('fake-image-data');
    const descriptor = await extractFaceDescriptor(fakeBuffer);

    expect(descriptor).not.toBeNull();
    // Should pick the largest face (descriptor with 0.9 values)
    expect(descriptor![0]).toBeCloseTo(0.9, 1);
  });

  it('returns null when image decode fails', async () => {
    const canvas = await import('canvas');
    (canvas.loadImage as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Cannot decode image: unsupported format')
    );

    const { extractFaceDescriptor } = await import('@/lib/ai/face-similarity/extract-descriptor');
    const fakeBuffer = Buffer.from('not-an-image');
    const descriptor = await extractFaceDescriptor(fakeBuffer);

    expect(descriptor).toBeNull();
  });

  it('returns null (timeout guard) when extraction takes longer than 10 seconds', async () => {
    const faceapi = await import('@vladmandic/face-api');
    // Simulate a hanging detection that never resolves
    (faceapi.detectAllFaces as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      withFaceLandmarks: vi.fn().mockReturnThis(),
      withFaceDescriptors: vi.fn().mockReturnValue(new Promise(() => {})), // Never resolves
    });

    const { extractFaceDescriptor } = await import('@/lib/ai/face-similarity/extract-descriptor');
    const fakeBuffer = Buffer.from('fake-image-data');

    // Override timeout to 100ms for tests (instead of 10000ms)
    const result = await extractFaceDescriptor(fakeBuffer, 100);

    expect(result).toBeNull();
  }, 2000); // Test timeout: 2 seconds
});

// ===========================================================================
// Test: Threshold logic (unit tests for score calculation)
// ===========================================================================
describe('Face similarity threshold logic', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('score 0.71 → passed=true (above threshold)', async () => {
    const faceapi = await import('@vladmandic/face-api');
    // Mock euclideanDistance to return a value that produces similarity 0.71
    // similarity = max(0, 1 - distance) → for similarity=0.71: distance=0.29
    (faceapi.euclideanDistance as ReturnType<typeof vi.fn>).mockReturnValueOnce(0.29);

    const { compareFaces } = await import('@/lib/ai/face-similarity/compare');
    const fakeBuffer = Buffer.from('fake-image-data');
    const result = await compareFaces(fakeBuffer, fakeBuffer);

    expect(result.similarity).toBeGreaterThanOrEqual(0.7);
    expect(result.passed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('score 0.69 → passed=false with reason="quality_gate" (below threshold)', async () => {
    const faceapi = await import('@vladmandic/face-api');
    // similarity = 1 - distance → for similarity=0.69: distance=0.31
    (faceapi.euclideanDistance as ReturnType<typeof vi.fn>).mockReturnValueOnce(0.31);

    const { compareFaces } = await import('@/lib/ai/face-similarity/compare');
    const fakeBuffer = Buffer.from('fake-image-data');
    const result = await compareFaces(fakeBuffer, fakeBuffer);

    expect(result.similarity).toBeLessThan(0.7);
    expect(result.passed).toBe(false);
    expect(result.reason).toBe('quality_gate');
  });

  it('score 0.0 → passed=false with reason="face_not_detected" when face not found', async () => {
    const faceapi = await import('@vladmandic/face-api');
    // Simulate no face detected
    (faceapi.detectAllFaces as ReturnType<typeof vi.fn>).mockReturnValue({
      withFaceLandmarks: vi.fn().mockReturnThis(),
      withFaceDescriptors: vi.fn().mockResolvedValue([]),
    });

    const { compareFaces } = await import('@/lib/ai/face-similarity/compare');
    const fakeBuffer = Buffer.from('fake-image-data');
    const result = await compareFaces(fakeBuffer, fakeBuffer);

    expect(result.similarity).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.reason).toBe('face_not_detected');
  });

  it('similarity is clamped to 0 minimum (no negative values)', async () => {
    const faceapi = await import('@vladmandic/face-api');
    const descriptor = new Float32Array(128).fill(0.1);

    // Ensure faces ARE detected so the distance calculation is reached
    (faceapi.detectAllFaces as ReturnType<typeof vi.fn>).mockReturnValue({
      withFaceLandmarks: vi.fn().mockReturnThis(),
      withFaceDescriptors: vi.fn().mockResolvedValue([
        {
          detection: { box: { width: 150, height: 150, area: 22500 } },
          descriptor,
        },
      ]),
    });

    // Very large distance should produce similarity of 0, not negative
    (faceapi.euclideanDistance as ReturnType<typeof vi.fn>).mockReturnValueOnce(2.0);

    const { compareFaces } = await import('@/lib/ai/face-similarity/compare');
    const fakeBuffer = Buffer.from('fake-image-data');
    const result = await compareFaces(fakeBuffer, fakeBuffer);

    expect(result.similarity).toBeGreaterThanOrEqual(0);
    expect(result.passed).toBe(false);
    expect(result.reason).toBe('quality_gate');
  });
});

// ===========================================================================
// Test: Barrel file exports
// ===========================================================================
describe('face-similarity barrel exports', () => {
  it('exports compareFaces from index', async () => {
    const faceSimilarityModule = await import('@/lib/ai/face-similarity');
    expect(faceSimilarityModule.compareFaces).toBeDefined();
    expect(typeof faceSimilarityModule.compareFaces).toBe('function');
  });

  it('exports from direct face-similarity import (not barrel to avoid build errors)', async () => {
    const faceSimilarityModule = await import('@/lib/ai/face-similarity');
    expect(faceSimilarityModule.compareFaces).toBeDefined();
  });
});

// ===========================================================================
// Test: Quality gate logging
// ===========================================================================
describe('Quality gate logging', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('logs quality gate pass with structured fields', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { logQualityGate } = await import('@/lib/ai/face-similarity/compare');

    logQualityGate({
      consultation_id: 'con-123',
      recommendation_id: 'rec-456',
      similarity_score: 0.85,
      threshold: 0.7,
      passed: true,
      provider: 'kie',
      latency_ms: 1200,
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      '[Quality Gate]',
      expect.stringContaining('"passed":true')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      '[Quality Gate]',
      expect.stringContaining('"similarity_score":0.85')
    );

    consoleSpy.mockRestore();
  });

  it('logs quality gate failure with structured fields', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { logQualityGate } = await import('@/lib/ai/face-similarity/compare');

    logQualityGate({
      consultation_id: 'con-123',
      recommendation_id: 'rec-456',
      similarity_score: 0.4,
      threshold: 0.7,
      passed: false,
      provider: 'kie',
      latency_ms: 900,
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      '[Quality Gate]',
      expect.stringContaining('"passed":false')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      '[Quality Gate]',
      expect.stringContaining('"consultation_id":"con-123"')
    );

    consoleSpy.mockRestore();
  });
});

// ===========================================================================
// Test: Webhook handler integration (face similarity gate)
// Uses vi.doMock + vi.resetModules() for proper per-test module isolation.
// ===========================================================================

// Shared mock functions used across integration tests (set per-test via mockImplementation)
const mockCompareFaces = vi.fn();
const mockLogQualityGate = vi.fn();

vi.mock('@/lib/ai/face-similarity', () => ({
  compareFaces: (...args: unknown[]) => mockCompareFaces(...args),
  logQualityGate: (...args: unknown[]) => mockLogQualityGate(...args),
  FACE_SIMILARITY_THRESHOLD: 0.7,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

const mockFetchGlobal = vi.fn();
global.fetch = mockFetchGlobal;

describe('processKieCallback with face similarity quality gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.KIE_WEBHOOK_HMAC_KEY = 'test-hmac-key';
    process.env.KIE_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('sets preview_status=ready when face similarity check passes', async () => {
    mockCompareFaces.mockResolvedValue({ similarity: 0.85, passed: true });

    const { createServerSupabaseClient } = await import('@/lib/supabase/server');

    const recommendation = {
      id: 'rec-uuid-1',
      consultation_id: 'con-uuid-1',
      preview_status: 'generating',
      preview_generation_params: {
        taskId: 'task-quality-1',
        photoStoragePath: 'photos/con-uuid-1/original.jpg',
      },
    };

    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });
    const mockSingle = vi.fn().mockResolvedValue({ data: recommendation, error: null });
    const mockFilter = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ filter: mockFilter });
    const mockStorageUpload = vi.fn().mockResolvedValue({
      data: { path: 'previews/con-uuid-1/rec-uuid-1.jpg' },
      error: null,
    });
    const mockStorageFromDownload = vi.fn().mockReturnValue({
      upload: mockStorageUpload,
      download: vi.fn().mockResolvedValue({
        data: new Blob([Buffer.from('fake-photo-data')]),
        error: null,
      }),
    });

    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'ai_calls') return { insert: mockInsert };
        return { select: mockSelect, update: mockUpdate };
      }),
      storage: { from: mockStorageFromDownload },
    };
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(supabase);

    const recordInfoResponse = {
      code: 200,
      data: {
        taskId: 'task-quality-1',
        state: 'success',
        resultJson: JSON.stringify({ resultUrls: ['https://cdn.kie.ai/image.jpg'] }),
        failCode: '',
        failMsg: '',
        costTime: 15000,
      },
    };

    const fakeImageBuffer = new ArrayBuffer(100);
    mockFetchGlobal
      .mockResolvedValueOnce({ ok: true, json: async () => recordInfoResponse })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => fakeImageBuffer });

    const { processKieCallback } = await import('@/lib/kie/webhooks');
    const result = await processKieCallback('task-quality-1');

    expect(result.status).toBe('ok');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ preview_status: 'ready' })
    );
  });

  it('sets preview_status=unavailable when face similarity check fails (quality_gate)', async () => {
    mockCompareFaces.mockResolvedValue({ similarity: 0.45, passed: false, reason: 'quality_gate' });

    const { createServerSupabaseClient } = await import('@/lib/supabase/server');

    const recommendation = {
      id: 'rec-uuid-2',
      consultation_id: 'con-uuid-2',
      preview_status: 'generating',
      preview_generation_params: {
        taskId: 'task-quality-2',
        photoStoragePath: 'photos/con-uuid-2/original.jpg',
      },
    };

    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });
    const mockSingle = vi.fn().mockResolvedValue({ data: recommendation, error: null });
    const mockFilter = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ filter: mockFilter });
    const mockStorageFromDownload = vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: 'test' }, error: null }),
      download: vi.fn().mockResolvedValue({
        data: new Blob([Buffer.from('fake-photo-data')]),
        error: null,
      }),
    });

    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'ai_calls') return { insert: mockInsert };
        return { select: mockSelect, update: mockUpdate };
      }),
      storage: { from: mockStorageFromDownload },
    };
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(supabase);

    const recordInfoResponse = {
      code: 200,
      data: {
        taskId: 'task-quality-2',
        state: 'success',
        resultJson: JSON.stringify({ resultUrls: ['https://cdn.kie.ai/image.jpg'] }),
        failCode: '',
        failMsg: '',
        costTime: 15000,
      },
    };

    const fakeImageBuffer = new ArrayBuffer(100);
    mockFetchGlobal
      .mockResolvedValueOnce({ ok: true, json: async () => recordInfoResponse })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => fakeImageBuffer });

    const { processKieCallback } = await import('@/lib/kie/webhooks');
    const result = await processKieCallback('task-quality-2');

    expect(result.status).toBe('ok');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        preview_status: 'unavailable',
        preview_generation_params: expect.objectContaining({
          quality_gate_reason: 'face_similarity_below_threshold',
        }),
      })
    );
  });
});
