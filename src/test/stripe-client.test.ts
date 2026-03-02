import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @stripe/stripe-js
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn().mockResolvedValue({ elements: vi.fn() }),
}));

describe('getStripeClient', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns null and warns if publishable key is missing', async () => {
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { getStripeClient } = await import('../lib/stripe/client');
    const result = await getStripeClient();
    expect(result).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('memoizes null result — warns only once when key is missing and called multiple times', async () => {
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { getStripeClient } = await import('../lib/stripe/client');
    const p1 = getStripeClient();
    const p2 = getStripeClient();
    expect(p1).toBe(p2);
    expect(warn).toHaveBeenCalledTimes(1);
    await p1;
    warn.mockRestore();
  });

  it('calls loadStripe with the publishable key', async () => {
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_fake';
    const { loadStripe } = await import('@stripe/stripe-js');
    const { getStripeClient } = await import('../lib/stripe/client');
    await getStripeClient();
    expect(loadStripe).toHaveBeenCalledWith('pk_test_fake');
  });

  it('memoizes the stripe promise (lazy-loaded once)', async () => {
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_fake';
    const { loadStripe } = await import('@stripe/stripe-js');
    const { getStripeClient } = await import('../lib/stripe/client');
    await getStripeClient();
    await getStripeClient();
    expect(loadStripe).toHaveBeenCalledTimes(1);
  });
});
