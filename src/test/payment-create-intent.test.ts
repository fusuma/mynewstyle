import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Set stripe env var before any imports
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_testing';

// Mock stripe module before any imports
const mockCreate = vi.fn().mockResolvedValue({
  id: 'pi_test_123',
  client_secret: 'pi_test_123_secret_abc',
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

// Mock consultation start to control the consultations map
const mockConsultations = new Map<string, Record<string, unknown>>();

vi.mock('@/app/api/consultation/start/route', () => {
  return {
    consultations: mockConsultations,
    POST: vi.fn(),
  };
});

// Helper to create a NextRequest for the create-intent endpoint
function createRequest(body: unknown, headers?: Record<string, string>): NextRequest {
  return new NextRequest('http://localhost:3000/api/payment/create-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

const validConsultationId = '550e8400-e29b-41d4-a716-446655440000';

describe('POST /api/payment/create-intent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsultations.clear();
    // Reset the mock to default resolved value
    mockCreate.mockResolvedValue({
      id: 'pi_test_123',
      client_secret: 'pi_test_123_secret_abc',
    });
  });

  it('returns 400 for invalid consultationId (non-UUID)', async () => {
    const { POST } = await import('@/app/api/payment/create-intent/route');
    const request = createRequest({ consultationId: 'not-a-uuid' });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('returns 400 for missing consultationId', async () => {
    const { POST } = await import('@/app/api/payment/create-intent/route');
    const request = createRequest({});
    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('returns 400 for invalid type value', async () => {
    const { POST } = await import('@/app/api/payment/create-intent/route');
    mockConsultations.set(validConsultationId, { id: validConsultationId });
    const request = createRequest({ consultationId: validConsultationId, type: 'invalid' });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('returns 404 when consultation not found', async () => {
    const { POST } = await import('@/app/api/payment/create-intent/route');
    // Do NOT add to mock consultations map
    const request = createRequest({ consultationId: validConsultationId });
    const response = await POST(request);
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('creates PaymentIntent with correct amount for first-time (guest) user', async () => {
    const { POST } = await import('@/app/api/payment/create-intent/route');
    mockConsultations.set(validConsultationId, { id: validConsultationId });
    const request = createRequest({ consultationId: validConsultationId });
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 599 })
    );
  });

  it('sets automatic_payment_methods enabled', async () => {
    const { POST } = await import('@/app/api/payment/create-intent/route');
    mockConsultations.set(validConsultationId, { id: validConsultationId });
    const request = createRequest({ consultationId: validConsultationId });
    await POST(request);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        automatic_payment_methods: { enabled: true },
      })
    );
  });

  it('includes consultationId in PaymentIntent metadata', async () => {
    const { POST } = await import('@/app/api/payment/create-intent/route');
    mockConsultations.set(validConsultationId, { id: validConsultationId });
    const request = createRequest({ consultationId: validConsultationId });
    await POST(request);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          consultationId: validConsultationId,
        }),
      })
    );
  });

  it('includes userType in PaymentIntent metadata', async () => {
    const { POST } = await import('@/app/api/payment/create-intent/route');
    mockConsultations.set(validConsultationId, { id: validConsultationId });
    const request = createRequest({ consultationId: validConsultationId });
    await POST(request);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          userType: expect.stringMatching(/^(guest|first|returning)$/),
        }),
      })
    );
  });

  it('updates consultation record with payment_intent_id and payment_status', async () => {
    const { POST } = await import('@/app/api/payment/create-intent/route');
    const consultation = { id: validConsultationId };
    mockConsultations.set(validConsultationId, consultation);
    const request = createRequest({ consultationId: validConsultationId });
    await POST(request);
    const updated = mockConsultations.get(validConsultationId);
    expect(updated).toHaveProperty('paymentIntentId', 'pi_test_123');
    expect(updated).toHaveProperty('paymentStatus', 'pending');
  });

  it('returns clientSecret, amount, currency, and userType', async () => {
    const { POST } = await import('@/app/api/payment/create-intent/route');
    mockConsultations.set(validConsultationId, { id: validConsultationId });
    const request = createRequest({ consultationId: validConsultationId });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('clientSecret', 'pi_test_123_secret_abc');
    expect(data).toHaveProperty('amount', 599);
    expect(data).toHaveProperty('currency', 'eur');
    expect(data).toHaveProperty('userType');
  });

  it('creates PaymentIntent with EUR currency', async () => {
    const { POST } = await import('@/app/api/payment/create-intent/route');
    mockConsultations.set(validConsultationId, { id: validConsultationId });
    const request = createRequest({ consultationId: validConsultationId });
    await POST(request);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ currency: 'eur' })
    );
  });

  it('returns 500 if Stripe throws an error', async () => {
    const { POST } = await import('@/app/api/payment/create-intent/route');
    mockCreate.mockRejectedValueOnce(new Error('Stripe API error'));
    mockConsultations.set(validConsultationId, { id: validConsultationId });
    const request = createRequest({ consultationId: validConsultationId });
    const response = await POST(request);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('accepts optional type field with value "first" and returns 200', async () => {
    const { POST } = await import('@/app/api/payment/create-intent/route');
    mockConsultations.set(validConsultationId, { id: validConsultationId });
    const request = createRequest({ consultationId: validConsultationId, type: 'first' });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('clientSecret');
    expect(data).toHaveProperty('amount');
  });

  it('accepts optional type field with value "repeat" and returns 200', async () => {
    const { POST } = await import('@/app/api/payment/create-intent/route');
    mockConsultations.set(validConsultationId, { id: validConsultationId });
    const request = createRequest({ consultationId: validConsultationId, type: 'repeat' });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('clientSecret');
    expect(data).toHaveProperty('amount');
  });

  it('returns 400 for invalid JSON body', async () => {
    const { POST } = await import('@/app/api/payment/create-intent/route');
    const request = new NextRequest('http://localhost:3000/api/payment/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json{{{',
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('userType is "guest" for all current requests (pre-auth)', async () => {
    const { POST } = await import('@/app/api/payment/create-intent/route');
    mockConsultations.set(validConsultationId, { id: validConsultationId });
    const request = createRequest({ consultationId: validConsultationId });
    const response = await POST(request);
    const data = await response.json();
    expect(data.userType).toBe('guest');
  });

  it('returns 500 when Stripe returns null client_secret', async () => {
    const { POST } = await import('@/app/api/payment/create-intent/route');
    mockCreate.mockResolvedValueOnce({
      id: 'pi_test_null_secret',
      client_secret: null,
    });
    mockConsultations.set(validConsultationId, { id: validConsultationId });
    const request = createRequest({ consultationId: validConsultationId });
    const response = await POST(request);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });
});
