import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

/**
 * Returns a singleton Stripe server-side client.
 * Uses STRIPE_SECRET_KEY from environment variables.
 * NEVER import this in client components — server-side only.
 */
export function getStripeServer(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      'STRIPE_SECRET_KEY is not set. Add it to .env.local (sk_test_* for dev, sk_live_* for prod).'
    );
  }

  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-18.acacia',
      typescript: true,
    });
  }

  return stripeInstance;
}
