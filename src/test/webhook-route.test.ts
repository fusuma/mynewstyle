import { describe, it, expect, vi, beforeEach } from 'vitest';

// Set env vars before any imports
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_testing';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake_secret';

// --- Mock the webhooks utility module ---
const mockVerify = vi.fn();
const mockProcessSucceeded = vi.fn().mockResolvedValue({ status: 'ok', message: 'done' });
const mockProcessFailed = vi.fn().mockResolvedValue({ status: 'ok', message: 'done' });

vi.mock('@/lib/stripe/webhooks', () => ({
  verifyWebhookSignature: (...args: unknown[]) => mockVerify(...args),
  processPaymentSucceeded: (...args: unknown[]) => mockProcessSucceeded(...args),
  processPaymentFailed: (...args: unknown[]) => mockProcessFailed(...args),
}));

// -------------------------------------------------------------------------
// Helper: create a simulated webhook Request
// -------------------------------------------------------------------------
function createWebhookRequest(body: string, signature?: string): Request {
  return new Request('http://localhost:3000/api/webhook/stripe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(signature ? { 'stripe-signature': signature } : {}),
    },
    body,
  });
}

// -------------------------------------------------------------------------
describe('POST /api/webhook/stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: verification succeeds
    mockVerify.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test', metadata: { consultationId: 'test-id' } } },
    });
  });

  it('returns 400 when stripe-signature header is missing', async () => {
    const { POST } = await import('@/app/api/webhook/stripe/route');
    const request = createWebhookRequest('{}');
    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('Missing stripe-signature');
  });

  it('returns 400 when signature verification fails', async () => {
    mockVerify.mockImplementationOnce(() => {
      throw new Error('Invalid signature');
    });
    const { POST } = await import('@/app/api/webhook/stripe/route');
    const request = createWebhookRequest('{}', 'bad_sig');
    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('calls processPaymentSucceeded for payment_intent.succeeded event', async () => {
    mockVerify.mockReturnValueOnce({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test', metadata: { consultationId: 'test-id' } } },
    });
    const { POST } = await import('@/app/api/webhook/stripe/route');
    const request = createWebhookRequest('{}', 'valid_sig');
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(mockProcessSucceeded).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'pi_test' })
    );
    const data = await response.json();
    expect(data).toHaveProperty('received', true);
  });

  it('calls processPaymentFailed for payment_intent.payment_failed event', async () => {
    mockVerify.mockReturnValueOnce({
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_test', metadata: { consultationId: 'test-id' } } },
    });
    const { POST } = await import('@/app/api/webhook/stripe/route');
    const request = createWebhookRequest('{}', 'valid_sig');
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(mockProcessFailed).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'pi_test' })
    );
    const data = await response.json();
    expect(data).toHaveProperty('received', true);
  });

  it('returns 200 with { received: true } for unhandled event types', async () => {
    mockVerify.mockReturnValueOnce({
      type: 'charge.refunded',
      data: { object: {} },
    });
    const { POST } = await import('@/app/api/webhook/stripe/route');
    const request = createWebhookRequest('{}', 'valid_sig');
    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('received', true);
    // processSucceeded and processFailed should NOT be called
    expect(mockProcessSucceeded).not.toHaveBeenCalled();
    expect(mockProcessFailed).not.toHaveBeenCalled();
  });

  it('returns 200 even when processPaymentSucceeded throws (prevents Stripe retries)', async () => {
    mockVerify.mockReturnValueOnce({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test', metadata: {} } },
    });
    mockProcessSucceeded.mockRejectedValueOnce(new Error('DB down'));
    const { POST } = await import('@/app/api/webhook/stripe/route');
    const request = createWebhookRequest('{}', 'valid_sig');
    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('received', true);
  });

  it('returns 200 even when processPaymentFailed throws', async () => {
    mockVerify.mockReturnValueOnce({
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_test', metadata: {} } },
    });
    mockProcessFailed.mockRejectedValueOnce(new Error('DB down'));
    const { POST } = await import('@/app/api/webhook/stripe/route');
    const request = createWebhookRequest('{}', 'valid_sig');
    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('received', true);
  });

  it('passes the raw body string (not parsed JSON) to verifyWebhookSignature', async () => {
    mockVerify.mockReturnValueOnce({
      type: 'charge.updated',
      data: { object: {} },
    });
    const rawBody = '{"id":"evt_test","type":"charge.updated"}';
    const { POST } = await import('@/app/api/webhook/stripe/route');
    const request = createWebhookRequest(rawBody, 'test_sig');
    await POST(request);
    // verifyWebhookSignature should receive the exact raw body string
    expect(mockVerify).toHaveBeenCalledWith(rawBody, 'test_sig');
  });

  it('logs unhandled event type to console', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockVerify.mockReturnValueOnce({
      type: 'customer.created',
      id: 'evt_test_unhandled',
      data: { object: {} },
    });
    const { POST } = await import('@/app/api/webhook/stripe/route');
    const request = createWebhookRequest('{}', 'valid_sig');
    await POST(request);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('customer.created')
    );
    consoleSpy.mockRestore();
  });

  it('logs event.id in the received event log for debugging', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockVerify.mockReturnValueOnce({
      type: 'charge.refunded',
      id: 'evt_test_abc123',
      data: { object: {} },
    });
    const { POST } = await import('@/app/api/webhook/stripe/route');
    const request = createWebhookRequest('{}', 'valid_sig');
    await POST(request);
    // The route should log event.id for correlation with Stripe Dashboard
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('evt_test_abc123')
    );
    consoleSpy.mockRestore();
  });

  it('logs error via console.error when processPaymentSucceeded returns error status', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockVerify.mockReturnValueOnce({
      type: 'payment_intent.succeeded',
      id: 'evt_test_err',
      data: { object: { id: 'pi_test', metadata: { consultationId: 'test-id' } } },
    });
    mockProcessSucceeded.mockResolvedValueOnce({ status: 'error', message: 'Consultation not found' });
    const { POST } = await import('@/app/api/webhook/stripe/route');
    const request = createWebhookRequest('{}', 'valid_sig');
    const response = await POST(request);
    // Still returns 200 (prevent Stripe retries), but error is logged
    expect(response.status).toBe(200);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('processing error'),
      expect.anything()
    );
    consoleErrorSpy.mockRestore();
    vi.restoreAllMocks();
  });
});
