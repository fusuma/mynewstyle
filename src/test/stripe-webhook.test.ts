import { describe, it, expect, vi, beforeEach } from 'vitest';

// Set env vars before any module imports
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_testing';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake_secret';

// ---------------------------------------------------------------------------
// Mock stripe module
// ---------------------------------------------------------------------------
const mockConstructEvent = vi.fn();
const mockRefundsCreate = vi.fn().mockResolvedValue({ id: 're_test_123' });

vi.mock('stripe', () => {
  function MockStripe() {
    return {
      paymentIntents: { create: vi.fn() },
      webhooks: { constructEvent: mockConstructEvent },
      refunds: { create: mockRefundsCreate },
    };
  }
  MockStripe.prototype = {};
  return { default: MockStripe };
});

// ---------------------------------------------------------------------------
// Mock supabase — expose as vi.fn() so each test can configure it
// ---------------------------------------------------------------------------
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

// Import AFTER vi.mock declarations
import { createServerSupabaseClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Mock fetch globally for generate endpoint calls
// ---------------------------------------------------------------------------
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ---------------------------------------------------------------------------
// Supabase chain builder helpers
// ---------------------------------------------------------------------------

/** Creates a supabase mock where .from().select().eq().single() resolves to `singleResult` */
function makeSupabaseWithSelect(
  singleResult: { data: unknown; error: unknown }
) {
  const mockSingle = vi.fn().mockResolvedValue(singleResult);
  const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect, update: vi.fn() });
  return { from: mockFrom, _mockSingle: mockSingle, _mockEq: mockEq, _mockSelect: mockSelect };
}

/** Creates a supabase mock where:
 *  - .from().select().eq().single() resolves to `singleResult`
 *  - .from().update().eq() resolves to `updateResult`
 */
function makeSupabaseWithSelectAndUpdate(
  singleResult: { data: unknown; error: unknown },
  updateResults: Array<{ error: unknown }> = [{ error: null }]
) {
  const mockSingle = vi.fn().mockResolvedValue(singleResult);
  const mockSelectEq = vi.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });

  let updateCallCount = 0;
  const mockUpdateEq = vi.fn().mockImplementation(() => {
    const result = updateResults[updateCallCount] ?? { error: null };
    updateCallCount++;
    return Promise.resolve(result);
  });
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect, update: mockUpdate });

  return {
    from: mockFrom,
    _mockSingle: mockSingle,
    _mockUpdate: mockUpdate,
    _mockUpdateEq: mockUpdateEq,
  };
}

/** Creates a supabase mock for processPaymentFailed — only needs update */
function makeSupabaseForFailed(updateResult: { error: unknown } = { error: null }) {
  const mockUpdateEq = vi.fn().mockResolvedValue(updateResult);
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });
  const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });
  return { from: mockFrom, _mockUpdate: mockUpdate, _mockUpdateEq: mockUpdateEq };
}

// ---------------------------------------------------------------------------
// Helper: build a PaymentIntent-like object
// ---------------------------------------------------------------------------
function makePaymentIntent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pi_test_123',
    metadata: { consultationId: 'cid-test-uuid' },
    last_payment_error: null,
    ...overrides,
  };
}

// ===========================================================================
// verifyWebhookSignature
// ===========================================================================
describe('verifyWebhookSignature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake_secret';
  });

  it('calls stripe.webhooks.constructEvent with rawBody, signature, and STRIPE_WEBHOOK_SECRET', async () => {
    mockConstructEvent.mockReturnValueOnce({
      type: 'payment_intent.succeeded',
      data: { object: {} },
    });

    const { verifyWebhookSignature } = await import('@/lib/stripe/webhooks');
    const result = verifyWebhookSignature('raw-body', 'sig-header');

    expect(mockConstructEvent).toHaveBeenCalledWith(
      'raw-body',
      'sig-header',
      'whsec_test_fake_secret'
    );
    expect(result).toHaveProperty('type', 'payment_intent.succeeded');
  });

  it('throws when constructEvent throws (invalid signature)', async () => {
    mockConstructEvent.mockImplementationOnce(() => {
      throw new Error('No signatures found matching the expected signature');
    });

    const { verifyWebhookSignature } = await import('@/lib/stripe/webhooks');
    expect(() => verifyWebhookSignature('bad-body', 'bad-sig')).toThrow(
      'No signatures found'
    );
  });

  it('throws a descriptive error when STRIPE_WEBHOOK_SECRET is not set', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;

    vi.resetModules();

    // Re-mock after resetModules
    vi.mock('stripe', () => {
      function MockStripe() {
        return {
          webhooks: { constructEvent: mockConstructEvent },
          refunds: { create: mockRefundsCreate },
        };
      }
      MockStripe.prototype = {};
      return { default: MockStripe };
    });
    vi.mock('@/lib/supabase/server', () => ({
      createServerSupabaseClient: vi.fn(),
    }));

    const { verifyWebhookSignature } = await import('@/lib/stripe/webhooks');
    expect(() => verifyWebhookSignature('body', 'sig')).toThrow(
      'STRIPE_WEBHOOK_SECRET is not set'
    );

    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake_secret';
  });
});

// ===========================================================================
// processPaymentSucceeded
// ===========================================================================
describe('processPaymentSucceeded', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefundsCreate.mockResolvedValue({ id: 're_test_123' });
  });

  it('returns error result when consultationId is missing from metadata', async () => {
    const { processPaymentSucceeded } = await import('@/lib/stripe/webhooks');
    const pi = makePaymentIntent({ metadata: {} });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await processPaymentSucceeded(pi as any);
    expect(result).toEqual({
      status: 'error',
      message: 'Missing consultationId in metadata',
    });
  });

  it('returns error result when consultation is not found in DB', async () => {
    const supabase = makeSupabaseWithSelect({ data: null, error: { message: 'not found' } });
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(supabase);

    const { processPaymentSucceeded } = await import('@/lib/stripe/webhooks');
    const pi = makePaymentIntent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await processPaymentSucceeded(pi as any);
    expect(result).toEqual({
      status: 'error',
      message: 'Consultation not found',
    });
  });

  it('returns "Already processed" for idempotent call (paid + complete)', async () => {
    const supabase = makeSupabaseWithSelect({
      data: { id: 'cid-test-uuid', payment_status: 'paid', status: 'complete' },
      error: null,
    });
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(supabase);

    const { processPaymentSucceeded } = await import('@/lib/stripe/webhooks');
    const pi = makePaymentIntent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await processPaymentSucceeded(pi as any);
    expect(result).toEqual({ status: 'ok', message: 'Already processed' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('updates payment_status to paid and triggers consultation generation', async () => {
    const supabase = makeSupabaseWithSelectAndUpdate(
      { data: { id: 'cid-test-uuid', payment_status: 'pending', status: 'pending' }, error: null },
      [{ error: null }]
    );
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(supabase);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ consultation: {}, cached: false }),
    });

    const { processPaymentSucceeded } = await import('@/lib/stripe/webhooks');
    const pi = makePaymentIntent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await processPaymentSucceeded(pi as any);

    expect(supabase._mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ payment_status: 'paid', payment_intent_id: 'pi_test_123' })
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/consultation/generate'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(result.status).toBe('ok');
    expect(result.message).toContain('generated');
  });

  it('returns cached message when generate returns cached=true', async () => {
    const supabase = makeSupabaseWithSelectAndUpdate(
      { data: { id: 'cid-test-uuid', payment_status: 'pending', status: 'pending' }, error: null },
      [{ error: null }]
    );
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(supabase);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ consultation: {}, cached: true }),
    });

    const { processPaymentSucceeded } = await import('@/lib/stripe/webhooks');
    const pi = makePaymentIntent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await processPaymentSucceeded(pi as any);
    expect(result.status).toBe('ok');
    expect(result.message).toContain('cached');
  });

  it('triggers auto-refund and sets payment_status to refunded when generation fails (422)', async () => {
    const supabase = makeSupabaseWithSelectAndUpdate(
      { data: { id: 'cid-test-uuid', payment_status: 'pending', status: 'pending' }, error: null },
      [{ error: null }, { error: null }] // first update: paid, second update: refunded
    );
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(supabase);

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ error: 'AI validation failed' }),
    });

    const { processPaymentSucceeded } = await import('@/lib/stripe/webhooks');
    const pi = makePaymentIntent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await processPaymentSucceeded(pi as any);

    expect(mockRefundsCreate).toHaveBeenCalledWith({ payment_intent: 'pi_test_123' });
    expect(supabase._mockUpdate).toHaveBeenLastCalledWith({ payment_status: 'refunded' });
    expect(result).toEqual({
      status: 'ok',
      message: 'Generation failed, refunded',
      refunded: true,
    });
  });

  it('triggers auto-refund and sets payment_status to refunded when generation fails (500)', async () => {
    const supabase = makeSupabaseWithSelectAndUpdate(
      { data: { id: 'cid-test-uuid', payment_status: 'pending', status: 'pending' }, error: null },
      [{ error: null }, { error: null }]
    );
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(supabase);

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal error' }),
    });

    const { processPaymentSucceeded } = await import('@/lib/stripe/webhooks');
    const pi = makePaymentIntent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await processPaymentSucceeded(pi as any);

    expect(mockRefundsCreate).toHaveBeenCalledWith({ payment_intent: 'pi_test_123' });
    expect(result.refunded).toBe(true);
  });

  it('triggers auto-refund when fetch itself throws a network error', async () => {
    const supabase = makeSupabaseWithSelectAndUpdate(
      { data: { id: 'cid-test-uuid', payment_status: 'pending', status: 'pending' }, error: null },
      [{ error: null }, { error: null }]
    );
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(supabase);

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { processPaymentSucceeded } = await import('@/lib/stripe/webhooks');
    const pi = makePaymentIntent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await processPaymentSucceeded(pi as any);

    expect(mockRefundsCreate).toHaveBeenCalled();
    expect(result.refunded).toBe(true);
  });

  it('returns error result when DB update for payment_status fails', async () => {
    const supabase = makeSupabaseWithSelectAndUpdate(
      { data: { id: 'cid-test-uuid', payment_status: 'pending', status: 'pending' }, error: null },
      [{ error: { message: 'DB write failed' } }]
    );
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(supabase);

    const { processPaymentSucceeded } = await import('@/lib/stripe/webhooks');
    const pi = makePaymentIntent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await processPaymentSucceeded(pi as any);
    expect(result.status).toBe('error');
    expect(result.message).toContain('Failed to update payment status');
  });
});

// ===========================================================================
// processPaymentFailed
// ===========================================================================
describe('processPaymentFailed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error result when consultationId is missing from metadata', async () => {
    const { processPaymentFailed } = await import('@/lib/stripe/webhooks');
    const pi = makePaymentIntent({ metadata: {} });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await processPaymentFailed(pi as any);
    expect(result).toEqual({
      status: 'error',
      message: 'Missing consultationId in metadata',
    });
  });

  it('updates payment_status to failed in Supabase', async () => {
    const supabase = makeSupabaseForFailed({ error: null });
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(supabase);

    const { processPaymentFailed } = await import('@/lib/stripe/webhooks');
    const pi = makePaymentIntent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await processPaymentFailed(pi as any);

    expect(supabase._mockUpdate).toHaveBeenCalledWith({ payment_status: 'failed' });
    expect(result).toEqual({ status: 'ok', message: 'Payment failure recorded' });
  });

  it('returns error result when DB update fails', async () => {
    const supabase = makeSupabaseForFailed({ error: { message: 'DB error' } });
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(supabase);

    const { processPaymentFailed } = await import('@/lib/stripe/webhooks');
    const pi = makePaymentIntent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await processPaymentFailed(pi as any);
    expect(result.status).toBe('error');
    expect(result.message).toContain('Failed to update payment status');
  });

  it('logs failure reason from last_payment_error', async () => {
    const supabase = makeSupabaseForFailed({ error: null });
    (createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(supabase);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { processPaymentFailed } = await import('@/lib/stripe/webhooks');
    const pi = makePaymentIntent({
      last_payment_error: { message: 'Card declined' },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await processPaymentFailed(pi as any);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Card declined')
    );
    consoleSpy.mockRestore();
  });
});
