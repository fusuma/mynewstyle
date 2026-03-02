import { loadStripe, type Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Returns a lazy-loaded Stripe client instance.
 * Stripe.js is NOT fetched until this function is called.
 * Memoized: subsequent calls return the same promise.
 */
export function getStripeClient(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.warn(
        'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set. Stripe will not load.'
      );
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}
