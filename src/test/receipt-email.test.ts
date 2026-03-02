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

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/payment/create-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validConsultationId = '550e8400-e29b-41d4-a716-446655440000';

describe('receipt_email on PaymentIntent creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsultations.clear();
    mockCreate.mockResolvedValue({
      id: 'pi_test_123',
      client_secret: 'pi_test_123_secret_abc',
    });
    mockConsultations.set(validConsultationId, { id: validConsultationId });
  });

  it('passes receipt_email to stripe.paymentIntents.create() when email is provided', async () => {
    const { POST } = await import('@/app/api/payment/create-intent/route');
    const request = createRequest({
      consultationId: validConsultationId,
      email: 'user@example.com',
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        receipt_email: 'user@example.com',
      })
    );
  });

  it('does NOT pass receipt_email when email is omitted', async () => {
    const { POST } = await import('@/app/api/payment/create-intent/route');
    const request = createRequest({ consultationId: validConsultationId });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const callArg = mockCreate.mock.calls[0][0] as Record<string, unknown>;
    expect(callArg).not.toHaveProperty('receipt_email');
  });

  it('returns 400 for invalid email format', async () => {
    const { POST } = await import('@/app/api/payment/create-intent/route');
    const request = createRequest({
      consultationId: validConsultationId,
      email: 'not-an-email',
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('existing functionality unchanged: amount, currency, metadata still present when email is provided', async () => {
    const { POST } = await import('@/app/api/payment/create-intent/route');
    const request = createRequest({
      consultationId: validConsultationId,
      email: 'user@example.com',
    });
    await POST(request);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 599,
        currency: 'eur',
        automatic_payment_methods: { enabled: true },
        metadata: expect.objectContaining({
          consultationId: validConsultationId,
        }),
        receipt_email: 'user@example.com',
      })
    );
  });

  it('does NOT pass receipt_email when email is explicitly null-like (omitted)', async () => {
    const { POST } = await import('@/app/api/payment/create-intent/route');
    const request = createRequest({ consultationId: validConsultationId, type: 'first' });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const callArg = mockCreate.mock.calls[0][0] as Record<string, unknown>;
    expect(callArg).not.toHaveProperty('receipt_email');
  });
});
