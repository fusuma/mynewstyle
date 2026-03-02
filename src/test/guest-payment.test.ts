/**
 * Tests for guest vs. authenticated payment intent creation.
 * Story 8.4, Task 7 (AC: #3)
 *
 * Verifies that:
 * - Guests (no auth, x-guest-session-id header) always pay EUR 5.99
 * - guest_session_id is stored in Stripe PaymentIntent metadata
 * - The placeholder `const isGuest = true` is replaced with actual header detection
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_testing';

const mockCreate = vi.fn().mockResolvedValue({
  id: 'pi_test_guest_123',
  client_secret: 'pi_test_guest_123_secret',
});

vi.mock('stripe', () => {
  function MockStripe() {
    return {
      paymentIntents: { create: mockCreate },
      webhooks: {},
    };
  }
  MockStripe.prototype = {};
  return { default: MockStripe };
});

const mockConsultations = new Map<string, Record<string, unknown>>();

vi.mock('@/app/api/consultation/start/route', () => ({
  consultations: mockConsultations,
  POST: vi.fn(),
}));

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const GUEST_UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

function createRequest(
  body: unknown,
  headers?: Record<string, string>
): NextRequest {
  return new NextRequest(
    'http://localhost:3000/api/payment/create-intent',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(headers ?? {}) },
      body: JSON.stringify(body),
    }
  );
}

describe('POST /api/payment/create-intent — guest detection (Story 8.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsultations.clear();
    mockCreate.mockResolvedValue({
      id: 'pi_test_guest_123',
      client_secret: 'pi_test_guest_123_secret',
    });
  });

  it('guest (x-guest-session-id header present, no auth) always pays EUR 5.99 (599 cents)', async () => {
    const { POST } = await import('@/app/api/payment/create-intent/route');
    mockConsultations.set(VALID_UUID, { id: VALID_UUID });

    const request = createRequest(
      { consultationId: VALID_UUID },
      { 'x-guest-session-id': GUEST_UUID }
    );
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 599 })
    );
  });

  it('guest_session_id is stored in Stripe PaymentIntent metadata', async () => {
    const { POST } = await import('@/app/api/payment/create-intent/route');
    mockConsultations.set(VALID_UUID, { id: VALID_UUID });

    const request = createRequest(
      { consultationId: VALID_UUID },
      { 'x-guest-session-id': GUEST_UUID }
    );
    await POST(request);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          guestSessionId: GUEST_UUID,
        }),
      })
    );
  });

  it('returns userType "guest" when x-guest-session-id header is present', async () => {
    const { POST } = await import('@/app/api/payment/create-intent/route');
    mockConsultations.set(VALID_UUID, { id: VALID_UUID });

    const request = createRequest(
      { consultationId: VALID_UUID },
      { 'x-guest-session-id': GUEST_UUID }
    );
    const response = await POST(request);
    const data = await response.json();

    expect(data.userType).toBe('guest');
  });

  it('request without x-guest-session-id header is also treated as guest (pre-auth)', async () => {
    // Pre-auth: no authenticated user exists yet, no guest header = still guest
    const { POST } = await import('@/app/api/payment/create-intent/route');
    mockConsultations.set(VALID_UUID, { id: VALID_UUID });

    const request = createRequest({ consultationId: VALID_UUID });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.userType).toBe('guest');
    expect(data.amount).toBe(599);
  });

  it('returns 400 when x-guest-session-id header is present but not a valid UUID', async () => {
    const { POST } = await import('@/app/api/payment/create-intent/route');
    mockConsultations.set(VALID_UUID, { id: VALID_UUID });

    const request = createRequest(
      { consultationId: VALID_UUID },
      { 'x-guest-session-id': 'not-a-uuid' }
    );
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });
});
