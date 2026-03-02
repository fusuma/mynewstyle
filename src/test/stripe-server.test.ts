import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the stripe module
vi.mock('stripe', () => {
  function MockStripe() {
    return {
      paymentIntents: {},
      webhooks: {},
    };
  }
  MockStripe.prototype = {};
  return { default: MockStripe };
});

describe('getStripeServer', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('throws if STRIPE_SECRET_KEY is not set', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const { getStripeServer } = await import('../lib/stripe/server');
    expect(() => getStripeServer()).toThrow('STRIPE_SECRET_KEY is not set');
  });

  it('returns a Stripe instance when key is set', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
    const { getStripeServer } = await import('../lib/stripe/server');
    const stripe = getStripeServer();
    expect(stripe).toBeDefined();
  });

  it('returns the same instance on subsequent calls (singleton)', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
    const { getStripeServer } = await import('../lib/stripe/server');
    const a = getStripeServer();
    const b = getStripeServer();
    expect(a).toBe(b);
  });
});
