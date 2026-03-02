import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================
// Mock Supabase client
// ============================================================
const mockUpload = vi.fn();
const mockCreateSignedUrl = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn().mockReturnValue({
    storage: {
      from: vi.fn().mockReturnValue({
        upload: (...args: unknown[]) => mockUpload(...args),
        createSignedUrl: (...args: unknown[]) => mockCreateSignedUrl(...args),
      }),
    },
  }),
}));

import { uploadPhoto } from '@/lib/photo/upload';
import type { PhotoUploadResult } from '@/lib/photo/upload';

// ============================================================
// Setup
// ============================================================
beforeEach(() => {
  vi.clearAllMocks();
  // Speed up retry delays in tests
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

// ============================================================
// Tests
// ============================================================
describe('uploadPhoto', () => {
  const testBlob = new Blob(['test-image'], { type: 'image/jpeg' });
  const sessionId = 'session-123';
  const consultationId = 'consult-456';
  const expectedPath = `${sessionId}/${consultationId}/original.jpg`;

  // ----------------------------------------------------------
  // AC1: Uploads blob to correct storage path pattern
  // ----------------------------------------------------------
  it('uploads blob to correct storage path pattern: {sessionId}/{consultationId}/original.jpg', async () => {
    mockUpload.mockResolvedValue({ error: null });
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://example.com/signed-url' },
      error: null,
    });

    await uploadPhoto(testBlob, sessionId, consultationId);

    expect(mockUpload).toHaveBeenCalledWith(
      expectedPath,
      testBlob,
      { contentType: 'image/jpeg', upsert: true }
    );
  });

  // ----------------------------------------------------------
  // AC3: Generates signed URL with 900-second (15-min) expiry
  // ----------------------------------------------------------
  it('generates signed URL with 900-second expiry', async () => {
    mockUpload.mockResolvedValue({ error: null });
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://example.com/signed-url' },
      error: null,
    });

    await uploadPhoto(testBlob, sessionId, consultationId);

    expect(mockCreateSignedUrl).toHaveBeenCalledWith(expectedPath, 900);
  });

  // ----------------------------------------------------------
  // AC5: Retries on network failure up to 2 times
  // ----------------------------------------------------------
  it('retries on network failure up to 2 times', async () => {
    const networkError = new Error('Network error');
    mockUpload
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce({ error: null });
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://example.com/signed-url' },
      error: null,
    });

    const result = await uploadPhoto(testBlob, sessionId, consultationId);

    expect(mockUpload).toHaveBeenCalledTimes(3);
    expect(result.success).toBe(true);
  });

  // ----------------------------------------------------------
  // AC5: Returns error after exhausting retries
  // ----------------------------------------------------------
  it('returns error after exhausting all retries', async () => {
    const networkError = new Error('Network timeout');
    mockUpload
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError);

    const result = await uploadPhoto(testBlob, sessionId, consultationId);

    expect(mockUpload).toHaveBeenCalledTimes(3);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Network timeout');
  });

  // ----------------------------------------------------------
  // Retries on retryable upload error (Supabase error object)
  // ----------------------------------------------------------
  it('retries when upload returns a retryable error object', async () => {
    mockUpload
      .mockResolvedValueOnce({ error: { message: 'Server error' } })
      .mockResolvedValueOnce({ error: null });
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://example.com/signed-url' },
      error: null,
    });

    const result = await uploadPhoto(testBlob, sessionId, consultationId);

    expect(mockUpload).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(true);
  });

  // ----------------------------------------------------------
  // Handles Supabase bucket-not-found error (non-retryable)
  // ----------------------------------------------------------
  it('handles bucket-not-found error without retrying', async () => {
    mockUpload.mockResolvedValue({
      error: { message: 'Bucket not found' },
    });

    const result = await uploadPhoto(testBlob, sessionId, consultationId);

    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Bucket not found');
  });

  // ----------------------------------------------------------
  // Handles unauthorized error (non-retryable)
  // ----------------------------------------------------------
  it('handles unauthorized error without retrying', async () => {
    mockUpload.mockResolvedValue({
      error: { message: 'User is not authorized' },
    });

    const result = await uploadPhoto(testBlob, sessionId, consultationId);

    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(false);
    expect(result.error).toBe('User is not authorized');
  });

  // ----------------------------------------------------------
  // Returns correct PhotoUploadResult shape on success
  // ----------------------------------------------------------
  it('returns correct PhotoUploadResult shape on success', async () => {
    mockUpload.mockResolvedValue({ error: null });
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://storage.supabase.co/signed/test' },
      error: null,
    });

    const result: PhotoUploadResult = await uploadPhoto(testBlob, sessionId, consultationId);

    expect(result).toEqual({
      success: true,
      signedUrl: 'https://storage.supabase.co/signed/test',
      storagePath: expectedPath,
    });
    expect(result.error).toBeUndefined();
  });

  // ----------------------------------------------------------
  // Returns correct PhotoUploadResult shape on failure
  // ----------------------------------------------------------
  it('returns correct PhotoUploadResult shape on failure', async () => {
    mockUpload.mockResolvedValue({
      error: { message: 'Bucket not found' },
    });

    const result: PhotoUploadResult = await uploadPhoto(testBlob, sessionId, consultationId);

    expect(result).toEqual({
      success: false,
      error: 'Bucket not found',
    });
    expect(result.signedUrl).toBeUndefined();
    expect(result.storagePath).toBeUndefined();
  });

  // ----------------------------------------------------------
  // Handles signed URL generation failure
  // ----------------------------------------------------------
  it('handles signed URL generation failure', async () => {
    mockUpload.mockResolvedValue({ error: null });
    mockCreateSignedUrl
      .mockResolvedValueOnce({ data: null, error: { message: 'Signed URL error' } })
      .mockResolvedValueOnce({ data: null, error: { message: 'Signed URL error' } })
      .mockResolvedValueOnce({ data: null, error: { message: 'Signed URL error' } });

    const result = await uploadPhoto(testBlob, sessionId, consultationId);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Signed URL error');
  });

  // ----------------------------------------------------------
  // Handles missing signedUrl in response data
  // ----------------------------------------------------------
  it('handles missing signedUrl in response data', async () => {
    mockUpload.mockResolvedValue({ error: null });
    mockCreateSignedUrl
      .mockResolvedValueOnce({ data: { signedUrl: null }, error: null })
      .mockResolvedValueOnce({ data: { signedUrl: null }, error: null })
      .mockResolvedValueOnce({ data: { signedUrl: null }, error: null });

    const result = await uploadPhoto(testBlob, sessionId, consultationId);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to generate signed URL');
  });
});
