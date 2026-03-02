import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import {
  verifyWebhookSignature,
  processPaymentSucceeded,
  processPaymentFailed,
} from '@/lib/stripe/webhooks';

/**
 * POST /api/webhook/stripe
 *
 * Receives Stripe webhook events, verifies signatures, and dispatches
 * handlers for each event type.
 *
 * CRITICAL: Uses request.text() NOT request.json() -- raw body is required
 * for Stripe signature verification.
 *
 * Always returns 200 for verified events (even on internal errors) to
 * prevent Stripe from retrying events that may cause duplicate processing.
 * Returns 400 only for signature verification failures.
 */
export async function POST(request: Request) {
  // 1. Get raw body (NOT json) -- required for signature verification
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  // 2. Verify webhook signature
  let event: Stripe.Event;
  try {
    event = verifyWebhookSignature(rawBody, signature);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown verification error';
    console.error('[webhook/stripe] Signature verification failed:', message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  // 3. Process event by type
  // Log event.id for correlation with Stripe Dashboard during debugging
  console.log(`[webhook/stripe] Received event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const result = await processPaymentSucceeded(paymentIntent);
        if (result.status === 'error') {
          console.error(
            `[webhook/stripe] payment_intent.succeeded processing error (${event.id}):`,
            result.message
          );
        } else {
          console.log(
            `[webhook/stripe] payment_intent.succeeded (${event.id}):`,
            result.message
          );
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const result = await processPaymentFailed(paymentIntent);
        if (result.status === 'error') {
          console.error(
            `[webhook/stripe] payment_intent.payment_failed processing error (${event.id}):`,
            result.message
          );
        } else {
          console.log(
            `[webhook/stripe] payment_intent.payment_failed (${event.id}):`,
            result.message
          );
        }
        break;
      }
      default:
        console.log(`[webhook/stripe] Unhandled event type: ${event.type} (${event.id})`);
    }
  } catch (error) {
    // Return 200 to acknowledge receipt -- Stripe will not retry.
    // Internal processing errors are logged but don't cause 500.
    // This prevents Stripe from retrying events that will always fail.
    console.error(`[webhook/stripe] Error processing ${event.type} (${event.id}):`, error);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
