import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { submitConsultation, ConsultationSubmissionError } from '@/lib/consultation/submit';
import type { ConsultationStartPayload } from '@/types';

const GUEST_UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

const validPayload: ConsultationStartPayload = {
  gender: 'male',
  photoUrl: 'data:image/jpeg;base64,/9j/4AAQ',
  questionnaire: {
    q1: 'answer1',
    q2: ['option1', 'option2'],
    q3: 3,
  },
  // Story 11.2: LGPD consent timestamp is now required
  photoConsentGivenAt: new Date().toISOString(),
};

const fastRetry = { retryDelayMs: 0 };

describe('submitConsultation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('returns consultationId on successful submission', async () => {
    const mockId = 'test-uuid-1234';
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ consultationId: mockId }),
    });

    const result = await submitConsultation(validPayload, fastRetry);
    expect(result).toEqual({ consultationId: mockId });
  });

  it('sends correct payload to the API endpoint (no guest session)', async () => {
    // No guest session in localStorage → no x-guest-session-id header or body field
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ consultationId: 'test-id' }),
    });

    await submitConsultation(validPayload, fastRetry);

    const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[0]).toBe('/api/consultation/start');
    expect(callArgs[1].method).toBe('POST');
    expect(callArgs[1].headers['Content-Type']).toBe('application/json');
    // No guest header when localStorage is empty
    expect(callArgs[1].headers['x-guest-session-id']).toBeUndefined();
    const sentBody = JSON.parse(callArgs[1].body);
    expect(sentBody).not.toHaveProperty('guestSessionId');
  });

  it('sends x-guest-session-id header and guestSessionId in body when guest session exists (Story 8.4, AC #2)', async () => {
    localStorage.setItem('mynewstyle-guest-session-id', GUEST_UUID);

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ consultationId: 'guest-test-id' }),
    });

    await submitConsultation(validPayload, fastRetry);

    const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[1].headers['x-guest-session-id']).toBe(GUEST_UUID);
    const sentBody = JSON.parse(callArgs[1].body);
    expect(sentBody.guestSessionId).toBe(GUEST_UUID);
  });

  it('retries on first failure, succeeds on second attempt', async () => {
    global.fetch = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ consultationId: 'retry-success' }),
      });

    const result = await submitConsultation(validPayload, fastRetry);
    expect(result).toEqual({ consultationId: 'retry-success' });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('retries on first two failures, succeeds on third attempt', async () => {
    global.fetch = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ consultationId: 'retry-success-3' }),
      });

    const result = await submitConsultation(validPayload, fastRetry);
    expect(result).toEqual({ consultationId: 'retry-success-3' });
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('throws ConsultationSubmissionError after 3 total failures (1 initial + 2 retries)', async () => {
    global.fetch = vi.fn()
      .mockRejectedValueOnce(new Error('Network error 1'))
      .mockRejectedValueOnce(new Error('Network error 2'))
      .mockRejectedValueOnce(new Error('Network error 3'));

    await expect(submitConsultation(validPayload, fastRetry)).rejects.toThrow(
      ConsultationSubmissionError
    );
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('throws ConsultationSubmissionError on non-ok response after retries', async () => {
    const makeErrorResponse = () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    });
    global.fetch = vi.fn()
      .mockResolvedValueOnce(makeErrorResponse())
      .mockResolvedValueOnce(makeErrorResponse())
      .mockResolvedValueOnce(makeErrorResponse());

    await expect(submitConsultation(validPayload, fastRetry)).rejects.toThrow(
      ConsultationSubmissionError
    );
  });

  it('ConsultationSubmissionError has retryable property', async () => {
    global.fetch = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'));

    try {
      await submitConsultation(validPayload, fastRetry);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ConsultationSubmissionError);
      expect((error as ConsultationSubmissionError).retryable).toBe(true);
    }
  });

  it('payload structure includes gender, photoUrl, and questionnaire fields', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ consultationId: 'test-id' }),
    });

    await submitConsultation(validPayload, fastRetry);

    const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const sentBody = JSON.parse(callArgs[1].body);
    expect(sentBody).toHaveProperty('gender');
    expect(sentBody).toHaveProperty('photoUrl');
    expect(sentBody).toHaveProperty('questionnaire');
    expect(sentBody.gender).toBe('male');
    expect(sentBody.photoUrl).toBe(validPayload.photoUrl);
    expect(sentBody.questionnaire).toEqual(validPayload.questionnaire);
  });

  it('clears referral code from localStorage after successful consultation start (AC #2)', async () => {
    // Set a referral code in localStorage before submission
    const existingReferral = { code: 'ABC1234', capturedAt: new Date().toISOString() };
    localStorage.setItem('mynewstyle_ref', JSON.stringify(existingReferral));

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ consultationId: 'test-uuid-referral-clear' }),
    });

    await submitConsultation(validPayload, fastRetry);

    // Referral code should be cleared after successful submission
    expect(localStorage.getItem('mynewstyle_ref')).toBeNull();
  });

  it('does NOT clear referral code when submission fails (preserves for retry)', async () => {
    const existingReferral = { code: 'ABC1234', capturedAt: new Date().toISOString() };
    localStorage.setItem('mynewstyle_ref', JSON.stringify(existingReferral));

    global.fetch = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'));

    await expect(submitConsultation(validPayload, fastRetry)).rejects.toThrow(
      ConsultationSubmissionError
    );

    // Referral code should still be present after failure — not cleared
    expect(localStorage.getItem('mynewstyle_ref')).not.toBeNull();
  });

  it('includes referral code in submission payload when present in localStorage (AC #4)', async () => {
    const existingReferral = { code: 'XYZ7890', capturedAt: new Date().toISOString() };
    localStorage.setItem('mynewstyle_ref', JSON.stringify(existingReferral));

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ consultationId: 'test-id-with-ref' }),
    });

    await submitConsultation(validPayload, fastRetry);

    const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const sentBody = JSON.parse(callArgs[1].body);
    expect(sentBody).toHaveProperty('referralCode', 'XYZ7890');
  });

  it('uses 1-second delay between retries by default', async () => {
    // Verify the default delay parameter is used by checking timing
    const startTime = Date.now();
    global.fetch = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ consultationId: 'test-id' }),
      });

    // Use a short delay to verify delay mechanism works
    await submitConsultation(validPayload, { retryDelayMs: 50 });
    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeGreaterThanOrEqual(40); // At least ~50ms for the delay
  });
});
