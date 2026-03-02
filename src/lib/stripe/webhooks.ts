import type Stripe from 'stripe';
import { getStripeServer } from '@/lib/stripe/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WebhookResult {
  status: 'ok' | 'error';
  message: string;
  refunded?: boolean;
}

// ---------------------------------------------------------------------------
// verifyWebhookSignature
// ---------------------------------------------------------------------------

/**
 * Verifies the Stripe webhook signature and constructs the event.
 *
 * CRITICAL: rawBody must be the raw request body string (NOT parsed JSON).
 * Use `await request.text()` in the route handler.
 *
 * Throws on invalid signature or missing STRIPE_WEBHOOK_SECRET.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET is not set. Add it to .env.local (whsec_* value from Stripe Dashboard or CLI).'
    );
  }

  const stripe = getStripeServer();
  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function triggerAutoRefund(
  paymentIntentId: string,
  consultationId: string,
  supabase: ReturnType<typeof createServerSupabaseClient>
): Promise<WebhookResult> {
  try {
    const stripe = getStripeServer();
    await stripe.refunds.create({ payment_intent: paymentIntentId });

    const { error: refundUpdateError } = await supabase
      .from('consultations')
      .update({ payment_status: 'refunded' })
      .eq('id', consultationId);

    if (refundUpdateError) {
      // Refund was issued by Stripe but DB update failed — log for manual reconciliation.
      // The consultation still shows payment_status='paid' in DB, but the money is refunded.
      console.error(
        '[webhook/stripe] Refund issued but DB update failed (manual reconciliation needed):',
        paymentIntentId,
        refundUpdateError
      );
    }

    console.log('[webhook/stripe] Auto-refund issued for:', paymentIntentId);
    return { status: 'ok', message: 'Generation failed, refunded', refunded: true };
  } catch (refundError) {
    console.error('[webhook/stripe] Auto-refund failed:', refundError);
    // Even if refund fails, return ok to Stripe (don't retry).
    // Manual intervention needed -- alert ops.
    return { status: 'error', message: 'Auto-refund failed' };
  }
}

// ---------------------------------------------------------------------------
// processPaymentSucceeded
// ---------------------------------------------------------------------------

/**
 * Handles the `payment_intent.succeeded` webhook event.
 *
 * Flow:
 * 1. Extract consultationId from metadata
 * 2. Idempotency check: if already paid + complete, return early
 * 3. Update payment_status to 'paid' in Supabase
 * 4. Trigger consultation generation via POST /api/consultation/generate
 * 5. Auto-refund if generation fails
 */
export async function processPaymentSucceeded(
  paymentIntent: Stripe.PaymentIntent
): Promise<WebhookResult> {
  const consultationId = paymentIntent.metadata?.consultationId;

  if (!consultationId) {
    console.error(
      '[webhook/stripe] Missing consultationId in PaymentIntent metadata:',
      paymentIntent.id
    );
    return { status: 'error', message: 'Missing consultationId in metadata' };
  }

  const supabase = createServerSupabaseClient();

  // 1. Idempotency check
  const { data: consultation, error: fetchError } = await supabase
    .from('consultations')
    .select('id, payment_status, status')
    .eq('id', consultationId)
    .single();

  if (fetchError || !consultation) {
    console.error('[webhook/stripe] Consultation not found:', consultationId);
    return { status: 'error', message: 'Consultation not found' };
  }

  if (consultation.payment_status === 'paid' && consultation.status === 'complete') {
    return { status: 'ok', message: 'Already processed' };
  }

  // 2. Update payment_status to 'paid'
  const { error: updateError } = await supabase
    .from('consultations')
    .update({
      payment_status: 'paid',
      payment_intent_id: paymentIntent.id,
    })
    .eq('id', consultationId);

  if (updateError) {
    console.error('[webhook/stripe] Failed to update payment_status:', updateError);
    return { status: 'error', message: 'Failed to update payment status' };
  }

  // 3. Trigger consultation generation
  // Use NEXT_PUBLIC_APP_URL or fall back to VERCEL_URL or localhost
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  // Use AbortController to enforce a 25s timeout (Stripe webhook timeout is 30s).
  // Without a timeout, a slow AI response could cause Stripe to retry while the first
  // request is still in-flight, risking duplicate generation.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25_000);

  try {
    const generateResponse = await fetch(`${baseUrl}/api/consultation/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consultationId }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const generateData = await generateResponse.json();

    if (generateResponse.ok) {
      // Handle already_complete response from generate endpoint (idempotent duplicate)
      if (generateData.status === 'already_complete') {
        return { status: 'ok', message: 'Already complete' };
      }
      const message = generateData.cached
        ? 'Consultation generated (cached)'
        : 'Consultation generated';
      return { status: 'ok', message };
    }

    // Generation failed -- trigger auto-refund
    console.error('[webhook/stripe] Consultation generation failed:', generateData);
    return await triggerAutoRefund(paymentIntent.id, consultationId, supabase);
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[webhook/stripe] Generate request failed:', error);
    return await triggerAutoRefund(paymentIntent.id, consultationId, supabase);
  }
}

// ---------------------------------------------------------------------------
// processPaymentFailed
// ---------------------------------------------------------------------------

/**
 * Handles the `payment_intent.payment_failed` webhook event.
 *
 * Flow:
 * 1. Extract consultationId from metadata
 * 2. Update payment_status to 'failed' in Supabase
 * 3. Log the failure reason
 */
export async function processPaymentFailed(
  paymentIntent: Stripe.PaymentIntent
): Promise<WebhookResult> {
  const consultationId = paymentIntent.metadata?.consultationId;

  if (!consultationId) {
    console.error(
      '[webhook/stripe] Missing consultationId in PaymentIntent metadata:',
      paymentIntent.id
    );
    return { status: 'error', message: 'Missing consultationId in metadata' };
  }

  const supabase = createServerSupabaseClient();

  const { error: updateError } = await supabase
    .from('consultations')
    .update({ payment_status: 'failed' })
    .eq('id', consultationId);

  if (updateError) {
    console.error(
      '[webhook/stripe] Failed to update payment_status to failed:',
      updateError
    );
    return { status: 'error', message: 'Failed to update payment status' };
  }

  const failureMessage = paymentIntent.last_payment_error?.message ?? 'Unknown reason';
  console.log(
    `[webhook/stripe] Payment failed for ${consultationId}: ${failureMessage}`
  );

  return { status: 'ok', message: 'Payment failure recorded' };
}
