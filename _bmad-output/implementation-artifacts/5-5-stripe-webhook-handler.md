# Story 5.5: Stripe Webhook Handler

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want payment confirmation via Stripe webhook so the server-side consultation generation is triggered securely,
so that paid consultations are only unlocked after verified payment, with automatic refunds if AI generation fails.

## Acceptance Criteria

1. A `POST /api/webhook/stripe` route handler exists at `src/app/api/webhook/stripe/route.ts` that receives Stripe webhook events.
2. The webhook handler verifies the `stripe-signature` header using `stripe.webhooks.constructEvent()` with `STRIPE_WEBHOOK_SECRET`. Invalid signatures return 400.
3. The handler processes `payment_intent.succeeded` events by: extracting `consultationId` from `paymentIntent.metadata`, updating the consultation's `payment_status` to `'paid'` in Supabase, and calling `POST /api/consultation/generate` internally to trigger consultation generation (Step 2 of AI pipeline).
4. The handler processes `payment_intent.payment_failed` events by: extracting `consultationId` from `paymentIntent.metadata` and updating the consultation's `payment_status` to `'failed'` in Supabase.
5. The handler is idempotent: processing the same webhook event twice has no side effects. If a consultation already has `payment_status = 'paid'` and `status = 'complete'`, the handler returns 200 without re-triggering generation.
6. Auto-refund: if consultation generation fails (consultation `status` becomes `'failed'` after the generate call), the handler triggers a full refund via `stripe.refunds.create({ payment_intent: paymentIntentId })` and updates `payment_status` to `'refunded'`.
7. A `src/lib/stripe/webhooks.ts` utility module exports `verifyWebhookSignature()` and `processWebhookEvent()` functions for testability and separation of concerns.
8. Unhandled event types are acknowledged with 200 (logged but not processed) to prevent Stripe from retrying.
9. All new files have corresponding unit tests. Tests verify: signature verification (valid/invalid), `payment_intent.succeeded` flow (idempotent + generate trigger), `payment_intent.payment_failed` flow, auto-refund on generation failure, and unhandled event passthrough.
10. The route handler exports a `config` object or uses the App Router convention to disable body parsing (raw body required for signature verification).

## Tasks / Subtasks

- [x] Task 1: Create `src/lib/stripe/webhooks.ts` utility module (AC: 7)
  - [x] Export `verifyWebhookSignature(rawBody: string, signature: string): Stripe.Event` that wraps `stripe.webhooks.constructEvent()` with `STRIPE_WEBHOOK_SECRET`
  - [x] Export `processPaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<WebhookResult>` that handles the succeeded flow
  - [x] Export `processPaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<WebhookResult>` that handles the failed flow
  - [x] Define `WebhookResult` type: `{ status: 'ok' | 'error'; message: string; refunded?: boolean }`
  - [x] Use `getStripeServer()` from `@/lib/stripe/server` (reuse existing singleton, do NOT create a new Stripe instance)
  - [x] Use `createServerSupabaseClient()` from `@/lib/supabase/server` for DB operations

- [x] Task 2: Implement `processPaymentSucceeded` logic (AC: 3, 5, 6)
  - [x] Extract `consultationId` from `paymentIntent.metadata.consultationId`
  - [x] If `consultationId` is missing, log error and return `{ status: 'error', message: 'Missing consultationId in metadata' }`
  - [x] Fetch consultation from Supabase: `consultations.select('id, payment_status, status').eq('id', consultationId).single()`
  - [x] **Idempotency check:** If `payment_status === 'paid'` AND `status === 'complete'`, return `{ status: 'ok', message: 'Already processed' }` without re-triggering
  - [x] Update `payment_status` to `'paid'` and `payment_intent_id` to `paymentIntent.id` in Supabase
  - [x] Call consultation generation: make internal HTTP request to `POST /api/consultation/generate` with `{ consultationId }` OR call the generate logic directly
  - [x] If generation returns success (200): return `{ status: 'ok', message: 'Consultation generated' }`
  - [x] If generation returns failure (422 or 500): trigger auto-refund via `stripe.refunds.create({ payment_intent: paymentIntent.id })`, update `payment_status` to `'refunded'` in Supabase, return `{ status: 'ok', message: 'Generation failed, refunded', refunded: true }`
  - [x] If generation returns `already_complete` (200 with `{ status: 'already_complete' }`): return `{ status: 'ok', message: 'Already complete' }`

- [x] Task 3: Implement `processPaymentFailed` logic (AC: 4)
  - [x] Extract `consultationId` from `paymentIntent.metadata.consultationId`
  - [x] If `consultationId` is missing, log error and return error result
  - [x] Update `payment_status` to `'failed'` in Supabase for the consultation
  - [x] Log the failure reason: `paymentIntent.last_payment_error?.message`
  - [x] Return `{ status: 'ok', message: 'Payment failure recorded' }`

- [x] Task 4: Create `src/app/api/webhook/stripe/route.ts` (AC: 1, 2, 8, 10)
  - [x] Import `verifyWebhookSignature`, `processPaymentSucceeded`, `processPaymentFailed` from `@/lib/stripe/webhooks`
  - [x] Export `async function POST(request: Request)` handler
  - [x] Get raw body via `await request.text()` (NOT `request.json()` -- raw body required for signature verification)
  - [x] Get signature via `request.headers.get('stripe-signature')`
  - [x] Call `verifyWebhookSignature(rawBody, signature)` in try-catch; return 400 on failure
  - [x] Switch on `event.type`: `payment_intent.succeeded` calls `processPaymentSucceeded`, `payment_intent.payment_failed` calls `processPaymentFailed`
  - [x] Unhandled event types: log `[webhook/stripe] Unhandled event type: ${event.type}` and return 200
  - [x] Return `NextResponse.json({ received: true })` with status 200 on success

- [x] Task 5: Update `src/lib/stripe/index.ts` barrel export (AC: 7)
  - [x] Add exports for `verifyWebhookSignature`, `processPaymentSucceeded`, `processPaymentFailed`, `WebhookResult` type

- [x] Task 6: Write unit tests (AC: 9)
  - [x] Create `src/test/stripe-webhook.test.ts`: test `verifyWebhookSignature` with valid/invalid signatures
  - [x] Create `src/test/webhook-route.test.ts`: test the POST route handler end-to-end
  - [x] Test `payment_intent.succeeded` flow: verify consultation `payment_status` updated to `'paid'`, generate endpoint called
  - [x] Test idempotency: second call for same event returns 200 without re-triggering generation
  - [x] Test `payment_intent.payment_failed` flow: verify `payment_status` updated to `'failed'`
  - [x] Test auto-refund: when generation fails, verify `stripe.refunds.create()` called and `payment_status` set to `'refunded'`
  - [x] Test unhandled event types return 200 with `{ received: true }`
  - [x] Test missing `stripe-signature` header returns 400
  - [x] Test invalid signature returns 400
  - [x] Run full test suite -- all 994 existing + new tests must pass (1019 total: 994 + 25 new)

## Dev Notes

### Architecture Compliance

- **Webhook route path follows architecture.md Section 5.2:** `POST /api/webhook/stripe` maps to `src/app/api/webhook/stripe/route.ts`. The architecture explicitly defines this endpoint for payment confirmation. [Source: architecture.md#5.2 Payment]
- **Server-side payment verification is the source of truth:** "Server verifies payment via webhook before unlocking results." The client-side `paymentStatus: 'paid'` set in Story 5.4 is OPTIMISTIC. The webhook is what actually triggers consultation generation. [Source: architecture.md#7.4 Payment Security]
- **Consultation generation endpoint already exists:** `POST /api/consultation/generate` at `src/app/api/consultation/generate/route.ts` (Story 4.5) handles the full AI pipeline Step 2. It requires `payment_status === 'paid'` (payment gate at line 86-88). The webhook MUST update `payment_status` to `'paid'` in Supabase BEFORE calling generate. [Source: src/app/api/consultation/generate/route.ts]
- **Idempotency is already built into the generate endpoint:** The generate route checks `consultation.status === 'complete'` and verifies recommendations exist (lines 92-103). The webhook handler should also check before calling to avoid unnecessary HTTP requests.
- **Auto-refund on AI failure:** "Refund automation: if AI fails after payment, auto-refund via Stripe API." This is the FIRST implementation of the refund path -- Story 5.6 will add user-facing receipt/refund UI. [Source: architecture.md#7.4 Payment Security]
- **`src/types/index.ts` is FROZEN:** Do NOT add any types to this file. Define types locally in `webhooks.ts`. [Source: 5-1-stripe-setup-and-configuration.md#Architecture Compliance]
- **Stripe API version pinned:** `apiVersion: '2026-02-25.clover'` -- the webhook handler MUST use `getStripeServer()` which already pins this version. Do NOT create a separate Stripe instance. [Source: src/lib/stripe/server.ts]
- **Supabase service role client for DB operations:** Use `createServerSupabaseClient()` from `@/lib/supabase/server` which bypasses RLS for server-side operations. [Source: src/lib/supabase/server.ts]

### Webhook Signature Verification -- Critical Implementation Detail

```typescript
// src/lib/stripe/webhooks.ts
import { getStripeServer } from '@/lib/stripe/server';
import type Stripe from 'stripe';

export interface WebhookResult {
  status: 'ok' | 'error';
  message: string;
  refunded?: boolean;
}

/**
 * Verifies Stripe webhook signature and constructs the event.
 * Throws Stripe.errors.StripeSignatureVerificationError on invalid signature.
 *
 * CRITICAL: rawBody must be the raw request body string (NOT parsed JSON).
 * Use `await request.text()` in the route handler.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): Stripe.Event {
  const stripe = getStripeServer();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET is not set. Add it to .env.local (whsec_* value from Stripe Dashboard or CLI).'
    );
  }

  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}
```

**Key points:**
- `stripe.webhooks.constructEvent()` takes raw body string, signature header, and webhook secret.
- The raw body MUST NOT be parsed as JSON first -- `await request.text()` is correct, NOT `await request.json()`.
- The Stripe SDK v20+ (installed: `^20.4.0`) uses `stripe.webhooks.constructEvent()` (synchronous method that returns the event or throws).
- The webhook secret (`whsec_*`) is different from the API secret key (`sk_*`). It's obtained from the Stripe Dashboard (Developers > Webhooks) or `stripe listen --forward-to` CLI output.

### Route Handler Implementation Guide

```typescript
// src/app/api/webhook/stripe/route.ts
import { NextResponse } from 'next/server';
import {
  verifyWebhookSignature,
  processPaymentSucceeded,
  processPaymentFailed,
} from '@/lib/stripe/webhooks';
import type Stripe from 'stripe';

export async function POST(request: Request) {
  // 1. Get raw body (NOT json) for signature verification
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
  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const result = await processPaymentSucceeded(paymentIntent);
        console.log('[webhook/stripe] payment_intent.succeeded:', result.message);
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const result = await processPaymentFailed(paymentIntent);
        console.log('[webhook/stripe] payment_intent.payment_failed:', result.message);
        break;
      }
      default:
        console.log(`[webhook/stripe] Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error(`[webhook/stripe] Error processing ${event.type}:`, error);
    // Return 200 to acknowledge receipt -- Stripe will not retry.
    // Internal processing errors are logged but don't cause 500.
    // This prevents Stripe from retrying events that will always fail.
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
```

**Critical implementation notes:**
- Always return 200 for successfully verified events, even if internal processing fails. Returning 500 causes Stripe to retry the event, which could cause duplicate processing.
- Exception: Return 400 ONLY for signature verification failures (genuinely invalid events).
- Use `request.text()` not `request.json()` -- Stripe signature verification requires the raw body.
- The Next.js App Router does NOT require explicit body parser disabling (unlike Pages Router which needed `export const config = { api: { bodyParser: false } }`). The App Router uses Web API Request natively.

### processPaymentSucceeded Implementation Guide

```typescript
export async function processPaymentSucceeded(
  paymentIntent: Stripe.PaymentIntent
): Promise<WebhookResult> {
  const consultationId = paymentIntent.metadata?.consultationId;

  if (!consultationId) {
    console.error('[webhook/stripe] Missing consultationId in PaymentIntent metadata:', paymentIntent.id);
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
  // Call the generate endpoint internally using absolute URL
  // In Vercel, use NEXT_PUBLIC_APP_URL or construct from VERCEL_URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  try {
    const generateResponse = await fetch(`${baseUrl}/api/consultation/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consultationId }),
    });

    const generateData = await generateResponse.json();

    if (generateResponse.ok) {
      return { status: 'ok', message: generateData.cached ? 'Consultation generated (cached)' : 'Consultation generated' };
    }

    // Generation failed -- trigger auto-refund
    console.error('[webhook/stripe] Consultation generation failed:', generateData);
    return await triggerAutoRefund(paymentIntent.id, consultationId, supabase);
  } catch (error) {
    console.error('[webhook/stripe] Generate request failed:', error);
    return await triggerAutoRefund(paymentIntent.id, consultationId, supabase);
  }
}

async function triggerAutoRefund(
  paymentIntentId: string,
  consultationId: string,
  supabase: ReturnType<typeof createServerSupabaseClient>
): Promise<WebhookResult> {
  try {
    const stripe = getStripeServer();
    await stripe.refunds.create({ payment_intent: paymentIntentId });

    await supabase
      .from('consultations')
      .update({ payment_status: 'refunded' })
      .eq('id', consultationId);

    console.log('[webhook/stripe] Auto-refund issued for:', paymentIntentId);
    return { status: 'ok', message: 'Generation failed, refunded', refunded: true };
  } catch (refundError) {
    console.error('[webhook/stripe] Auto-refund failed:', refundError);
    // Even if refund fails, return ok to Stripe (don't retry).
    // Manual intervention needed -- alert ops.
    return { status: 'error', message: 'Auto-refund failed' };
  }
}
```

### processPaymentFailed Implementation Guide

```typescript
export async function processPaymentFailed(
  paymentIntent: Stripe.PaymentIntent
): Promise<WebhookResult> {
  const consultationId = paymentIntent.metadata?.consultationId;

  if (!consultationId) {
    console.error('[webhook/stripe] Missing consultationId in PaymentIntent metadata:', paymentIntent.id);
    return { status: 'error', message: 'Missing consultationId in metadata' };
  }

  const supabase = createServerSupabaseClient();

  const { error: updateError } = await supabase
    .from('consultations')
    .update({ payment_status: 'failed' })
    .eq('id', consultationId);

  if (updateError) {
    console.error('[webhook/stripe] Failed to update payment_status to failed:', updateError);
    return { status: 'error', message: 'Failed to update payment status' };
  }

  const failureMessage = paymentIntent.last_payment_error?.message ?? 'Unknown reason';
  console.log(`[webhook/stripe] Payment failed for ${consultationId}: ${failureMessage}`);

  return { status: 'ok', message: 'Payment failure recorded' };
}
```

### Project Structure Notes

```
src/
├── app/
│   └── api/
│       ├── consultation/
│       │   ├── start/route.ts              EXISTS -- no changes
│       │   ├── analyze/route.ts            EXISTS -- no changes
│       │   └── generate/route.ts           EXISTS -- called by webhook on payment success
│       ├── payment/
│       │   └── create-intent/route.ts      EXISTS -- sets metadata.consultationId on PaymentIntent
│       └── webhook/
│           └── stripe/
│               └── route.ts               NEW: Stripe webhook handler
├── lib/
│   └── stripe/
│       ├── server.ts                      EXISTS -- getStripeServer() singleton (reuse)
│       ├── client.ts                      EXISTS -- no changes
│       ├── pricing.ts                     EXISTS -- no changes
│       ├── index.ts                       MODIFIED: add webhook exports
│       └── webhooks.ts                    NEW: webhook utility functions
└── test/
    ├── stripe-webhook.test.ts             NEW: webhooks.ts unit tests
    └── webhook-route.test.ts              NEW: route handler integration tests
```

**Files that must NOT be modified:**
- `src/types/index.ts` -- types are frozen
- `src/lib/stripe/server.ts` -- Stripe singleton unchanged
- `src/lib/stripe/client.ts` -- client-side only
- `src/lib/stripe/pricing.ts` -- pricing logic unchanged
- `src/app/api/consultation/generate/route.ts` -- already handles payment gate and idempotency
- `src/app/api/payment/create-intent/route.ts` -- already stores `consultationId` in PaymentIntent metadata
- `src/stores/consultation.ts` -- client-side only, not relevant to webhook
- `src/components/**` -- no frontend changes in this story

### Library & Framework Requirements

| Library | Version | Usage in This Story |
|---------|---------|---------------------|
| `stripe` | ^20.4.0 (installed in 5.1) | `stripe.webhooks.constructEvent()`, `stripe.refunds.create()`, Stripe types |
| `next` | already installed | `NextResponse`, App Router route handler |
| `@supabase/supabase-js` | already installed | `createServerSupabaseClient()` for DB operations |
| `zod` | already installed | NOT needed in this story (webhook payload is verified by Stripe SDK) |
| `vitest` | already installed | Test runner |

**0 NEW DEPENDENCIES** -- everything needed is already installed from previous stories.

### Cross-Story Dependencies

- **Story 5.1 (Stripe Setup) -- DONE:** Provides `getStripeServer()` singleton with pinned API version `2026-02-25.clover`. The webhook handler MUST reuse this singleton. [Source: 5-1-stripe-setup-and-configuration.md]
- **Story 5.2 (Payment Intent Creation) -- DONE:** Stores `consultationId` in PaymentIntent `metadata` (line 82-84 of create-intent/route.ts). The webhook handler extracts `consultationId` from `paymentIntent.metadata.consultationId`. This is the critical link between payment and consultation. [Source: src/app/api/payment/create-intent/route.ts]
- **Story 5.3 (Paywall UI) -- DONE:** Provides the client-side paywall component. No server-side interaction with this story. [Source: 5-3-paywall-ui.md]
- **Story 5.4 (Payment Processing & Unlock) -- DONE:** Client-side payment confirmation is OPTIMISTIC (`paymentStatus: 'paid'` set after `stripe.confirmPayment()` succeeds). This story implements the AUTHORITATIVE server-side confirmation. Story 5.4 dev notes state: "The Stripe webhook (Story 5.5) will later confirm server-side." [Source: 5-4-payment-processing-and-unlock.md#Architecture Compliance]
- **Story 4.5 (Consultation Generation) -- DONE:** `POST /api/consultation/generate` exists and has: payment gate (`payment_status !== 'paid'` returns 403), idempotency check, cache lookup, AI pipeline with retry, cost tracking. The webhook calls this endpoint after updating `payment_status` to `'paid'`. [Source: src/app/api/consultation/generate/route.ts]
- **Story 5.6 (Receipt & Refund Flow) -- NEXT:** Will add user-facing refund messaging ("Ocorreu um erro. O seu pagamento foi reembolsado.") and Stripe email receipts. This story (5.5) implements the server-side auto-refund mechanism that 5.6 builds upon. [Source: epics-and-stories.md#S5.6]
- **Epic 6 (Results Page) -- FUTURE:** Will replace the paid results placeholder with actual consultation data fetched from Supabase. Consultation data is populated by the generate endpoint triggered by this webhook. [Source: epics-and-stories.md#E6]

### Previous Story Intelligence

**From Story 5.4 (Payment Processing & Unlock):**
- Client-side payment flow uses `stripe.confirmPayment()` with `redirect: 'if_required'`. On success, `paymentStatus` is set to `'paid'` in Zustand store (optimistic). The webhook provides the authoritative server-side confirmation.
- The `PaymentForm` component calls `onPaymentSuccess()` immediately after `stripe.confirmPayment()` returns without error. There's no client-side polling for webhook confirmation -- the paywall dissolves optimistically.
- Code review found 4 issues (all fixed): Portuguese diacritics, Framer Motion exit animation scoping, isProcessing reset timing, and stale error clearing on retry.
- Test count baseline: **994 tests** (all passing after Story 5.4).
- `paymentStatus` persisted to `sessionStorage` via Zustand `partialize` config.

**From Story 5.2 (Payment Intent Creation):**
- PaymentIntent is created with `metadata: { consultationId, userType }` (line 82-84 of create-intent/route.ts). This metadata is available on the webhook event's `paymentIntent.metadata`.
- The in-memory `consultations` Map is used for pre-auth guest tracking. The Supabase `consultations` table is the persistent store used by the generate endpoint.
- Currently all users are treated as guests (`isGuest = true`). Auth integration is Epic 8.

**From Story 4.5 (Consultation Generation):**
- The generate endpoint has a payment gate at line 86-88: `if (consultation.payment_status !== 'paid') return 403`.
- Idempotency: checks `status === 'complete'` AND verifies recommendations exist in DB (lines 92-103).
- On AI validation failure after retry, sets `status: 'failed'` and returns 422.
- On unexpected error, sets `status: 'failed'` and returns 500.
- Cache lookup by `photo_hash + questionnaire_hash + gender` before AI call.

### Git Intelligence

Recent commits (Epic 5):
```
48b4752 review(epic-5): code review story 5-4-payment-processing-and-unlock
a6625ce feat(epic-5): implement story 5-4-payment-processing-and-unlock
fb48126 feat(epic-5): implement story 5-3-paywall-ui
bf05489 feat(epic-5): implement story 5-3-paywall-ui
ee28574 feat(epic-5): implement story 5-2-payment-intent-creation
66fdb58 feat(epic-5): implement story 5-2-payment-intent-creation
b5ecab3 feat(epic-5): implement story 5-1-stripe-setup-and-configuration
97c09ed feat(epic-5): implement story 5-1-stripe-setup-and-configuration
```

Patterns established:
- Commit message format: `feat(epic-5): implement story 5-X-story-slug`
- Test files in `src/test/` directory (NOT co-located with source files)
- Stripe mocking pattern: mock the `stripe` module with `vi.mock('stripe', ...)`, create mock functions for specific methods
- Route handler testing: use `NextRequest` constructor with explicit URL, method, headers, body
- Supabase mocking: mock `@/lib/supabase/server` with chainable query builder pattern

Suggested commit message: `feat(epic-5): implement story 5-5-stripe-webhook-handler`

### Environment Variables Required

| Variable | Side | Required By | Purpose |
|----------|------|-------------|---------|
| `STRIPE_SECRET_KEY` | Server only | `getStripeServer()` | Stripe API operations (refunds) |
| `STRIPE_WEBHOOK_SECRET` | Server only | `verifyWebhookSignature()` | Webhook signature verification (`whsec_*` value) |
| `NEXT_PUBLIC_APP_URL` | Server | `processPaymentSucceeded()` | Base URL for internal API calls. Falls back to `VERCEL_URL` or `localhost:3000` |
| `NEXT_PUBLIC_SUPABASE_URL` | Server | `createServerSupabaseClient()` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | `createServerSupabaseClient()` | Supabase admin access |

**1 NEW VARIABLE:** `STRIPE_WEBHOOK_SECRET` -- obtain from Stripe Dashboard (Developers > Webhooks > Signing secret) or `stripe listen` CLI output during development.

### Stripe Webhook Development & Testing

**Local development with Stripe CLI:**
```bash
# Install Stripe CLI (if not already)
brew install stripe/stripe-cli/stripe

# Login to Stripe account
stripe login

# Forward webhooks to local dev server
stripe listen --forward-to localhost:3000/api/webhook/stripe

# Copy the webhook signing secret (whsec_*) to .env.local
# STRIPE_WEBHOOK_SECRET=whsec_test_...

# In another terminal, trigger a test event
stripe trigger payment_intent.succeeded
```

**Stripe Dashboard configuration (production):**
1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://mynewstyle.com/api/webhook/stripe`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy the signing secret to Vercel environment variables as `STRIPE_WEBHOOK_SECRET`

### Critical Guardrails

- **DO NOT** parse the request body as JSON before signature verification. Use `await request.text()` to get the raw body string. Parsing first will cause signature verification to fail.
- **DO NOT** create a new Stripe instance. Use `getStripeServer()` from `@/lib/stripe/server` to reuse the singleton with pinned API version.
- **DO NOT** return 500 for internal processing errors after successful signature verification. Always return 200 to Stripe to prevent retries. Log the error internally.
- **DO NOT** skip the idempotency check. Stripe may deliver the same event multiple times (at-least-once delivery). Processing the same event twice must be safe.
- **DO NOT** add types to `src/types/index.ts` -- types are frozen. Define `WebhookResult` and any other types locally in `webhooks.ts`.
- **DO NOT** modify `src/app/api/consultation/generate/route.ts` -- it already has the payment gate and idempotency built in.
- **DO NOT** call the generate endpoint BEFORE updating `payment_status` to `'paid'` in Supabase. The generate endpoint checks `payment_status !== 'paid'` and will return 403.
- **DO NOT** import Stripe client-side modules (`@stripe/stripe-js`, `@stripe/react-stripe-js`) in the webhook handler. This is 100% server-side code.
- **DO** handle the case where `STRIPE_WEBHOOK_SECRET` is not set (throw descriptive error).
- **DO** log all webhook events with structured console.log for debugging (include event.id, event.type, consultationId).
- **DO** use `paymentIntent.metadata.consultationId` (string) -- this was set in Story 5.2's create-intent route.
- **DO** handle the auto-refund gracefully: even if the refund API call fails, return 200 to Stripe and log the error for manual intervention.
- **DO** run `npm test` before considering done -- all 994 existing + new tests must pass.

### Testing Requirements

**Webhook utility tests (`src/test/stripe-webhook.test.ts`):**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Set env vars before imports
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_testing';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake_secret';

// Mock stripe module
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

// Mock supabase
const mockUpdate = vi.fn().mockReturnValue({ error: null });
const mockEq = vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: null }) });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom = vi.fn().mockReturnValue({
  select: mockSelect,
  update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
});

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => ({ from: mockFrom }),
}));

describe('verifyWebhookSignature', () => {
  it('calls stripe.webhooks.constructEvent with correct params', () => {
    mockConstructEvent.mockReturnValueOnce({ type: 'payment_intent.succeeded', data: {} });
    // Verify constructEvent called with rawBody, signature, webhookSecret
  });

  it('throws on invalid signature', () => {
    mockConstructEvent.mockImplementationOnce(() => { throw new Error('Invalid signature'); });
    // Verify error propagates
  });
});

describe('processPaymentSucceeded', () => {
  it('updates payment_status to paid and triggers generation', async () => {
    // Mock consultation lookup, update, and generate call
  });

  it('returns "Already processed" for idempotent calls', async () => {
    // Mock consultation with payment_status='paid' and status='complete'
  });

  it('triggers auto-refund when generation fails', async () => {
    // Mock generate endpoint returning 422/500
    // Verify stripe.refunds.create() called
    // Verify payment_status updated to 'refunded'
  });

  it('handles missing consultationId in metadata', async () => {
    // Verify error result returned
  });
});

describe('processPaymentFailed', () => {
  it('updates payment_status to failed', async () => {
    // Verify Supabase update called
  });

  it('handles missing consultationId in metadata', async () => {
    // Verify error result returned
  });
});
```

**Route handler tests (`src/test/webhook-route.test.ts`):**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_testing';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake_secret';

// Mock the webhooks module
const mockVerify = vi.fn();
const mockProcessSucceeded = vi.fn().mockResolvedValue({ status: 'ok', message: 'done' });
const mockProcessFailed = vi.fn().mockResolvedValue({ status: 'ok', message: 'done' });

vi.mock('@/lib/stripe/webhooks', () => ({
  verifyWebhookSignature: (...args: unknown[]) => mockVerify(...args),
  processPaymentSucceeded: (...args: unknown[]) => mockProcessSucceeded(...args),
  processPaymentFailed: (...args: unknown[]) => mockProcessFailed(...args),
}));

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

describe('POST /api/webhook/stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when stripe-signature header is missing', async () => {
    const { POST } = await import('@/app/api/webhook/stripe/route');
    const request = createWebhookRequest('{}');
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns 400 when signature verification fails', async () => {
    mockVerify.mockImplementationOnce(() => { throw new Error('Invalid sig'); });
    const { POST } = await import('@/app/api/webhook/stripe/route');
    const request = createWebhookRequest('{}', 'bad_sig');
    const response = await POST(request);
    expect(response.status).toBe(400);
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
    expect(mockProcessSucceeded).toHaveBeenCalled();
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
    expect(mockProcessFailed).toHaveBeenCalled();
  });

  it('returns 200 for unhandled event types', async () => {
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
  });

  it('returns 200 even when processing throws an error', async () => {
    mockVerify.mockReturnValueOnce({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test', metadata: {} } },
    });
    mockProcessSucceeded.mockRejectedValueOnce(new Error('DB down'));
    const { POST } = await import('@/app/api/webhook/stripe/route');
    const request = createWebhookRequest('{}', 'valid_sig');
    const response = await POST(request);
    expect(response.status).toBe(200); // Still 200 to prevent Stripe retries
  });
});
```

### Stripe API Notes (v20.4.0)

**`stripe.webhooks.constructEvent(rawBody, signature, secret)`:**
- Synchronous method (not async).
- Returns `Stripe.Event` on success.
- Throws `Stripe.errors.StripeSignatureVerificationError` on invalid signature.
- The `rawBody` MUST be the raw string body, not a parsed object.

**`stripe.refunds.create({ payment_intent: paymentIntentId })`:**
- Creates a full refund for the payment intent.
- Returns a `Stripe.Refund` object.
- If the payment intent has already been refunded, throws an error (handle gracefully).
- Refund processing time: 5-10 business days for card refunds.

**`Stripe.PaymentIntent` type (from event data):**
- `id`: PaymentIntent ID (`pi_*`)
- `status`: 'succeeded' | 'requires_payment_method' | etc.
- `metadata`: `Record<string, string>` -- contains `consultationId` and `userType` set in Story 5.2
- `last_payment_error`: `{ message: string, type: string, code: string }` or null

### References

- [Source: epics-and-stories.md#S5.5] -- ACs: POST /api/webhook/stripe, verify signature, handle succeeded/failed, idempotent, auto-refund on AI failure
- [Source: architecture.md#5.2 Payment] -- POST /api/webhook/stripe endpoint definition, payment_intent.succeeded and payment_intent.payment_failed handling
- [Source: architecture.md#7.4 Payment Security] -- "Server verifies payment via webhook before unlocking results", "Refund automation: if AI fails after payment, auto-refund via Stripe API"
- [Source: prd.md#Payment Infrastructure] -- "Auto-refund on AI processing failure"
- [Source: ux-design.md#11.7 Elicitation] -- Chaos Monkey: "Stripe goes down during peak" mitigation strategy
- [Source: 5-4-payment-processing-and-unlock.md#Architecture Compliance] -- "Payment confirmation on the client is optimistic; the server-side webhook is the source of truth"
- [Source: 5-2-payment-intent-creation.md] -- PaymentIntent metadata includes consultationId
- [Source: src/app/api/payment/create-intent/route.ts] -- metadata: { consultationId, userType } on PaymentIntent
- [Source: src/app/api/consultation/generate/route.ts] -- Payment gate (line 86-88), idempotency check (lines 92-103), AI pipeline with retry
- [Source: src/lib/stripe/server.ts] -- getStripeServer() singleton, apiVersion pinned to '2026-02-25.clover'
- [Source: src/lib/supabase/server.ts] -- createServerSupabaseClient() with service role key

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No blocking issues encountered. All tasks completed in a single session.

### Completion Notes List

- Implemented `src/lib/stripe/webhooks.ts` with `verifyWebhookSignature`, `processPaymentSucceeded`, `processPaymentFailed`, and internal `triggerAutoRefund` helper. `WebhookResult` type defined locally as required (types file is frozen).
- Implemented `src/app/api/webhook/stripe/route.ts` using `request.text()` (not `request.json()`) for raw body; returns 200 for all verified events (even on internal errors) to prevent Stripe retries; returns 400 only for signature verification failures.
- Idempotency: `processPaymentSucceeded` checks `payment_status === 'paid' && status === 'complete'` before re-triggering generation.
- Auto-refund: on generation failure (HTTP non-2xx or network error), `stripe.refunds.create({ payment_intent: paymentIntentId })` is called and `payment_status` updated to `'refunded'`.
- Barrel export in `src/lib/stripe/index.ts` updated with all new exports.
- 25 new tests across 2 test files. Full suite: 1019 tests, all passing. No regressions.
- Followed TDD: test files written first (RED), then implementation (GREEN), then verified with full suite.
- Reused `getStripeServer()` singleton (no new Stripe instance created). Reused `createServerSupabaseClient()` for DB ops.
- App Router convention used (no `export const config` needed for body parser — handled by `request.text()`).

### File List

- `src/lib/stripe/webhooks.ts` (NEW)
- `src/app/api/webhook/stripe/route.ts` (NEW)
- `src/lib/stripe/index.ts` (MODIFIED — added webhook exports)
- `src/test/stripe-webhook.test.ts` (NEW)
- `src/test/webhook-route.test.ts` (NEW)
- `.env.example` (MODIFIED — added NEXT_PUBLIC_APP_URL documentation)

## Senior Developer Review (AI)

**Reviewer:** claude-sonnet-4-6 on 2026-03-02
**Result:** Changes Requested → All Fixed → Approved

### Issues Found and Fixed

**HIGH (2 fixed):**
1. **Missing `already_complete` handling** — Task 2 subtask claimed `already_complete` response from `/api/consultation/generate` is handled with `{ status: 'ok', message: 'Already complete' }`, but the implementation only checked `generateData.cached`. Fixed by adding explicit `generateData.status === 'already_complete'` check before the cached message check.
2. **No fetch timeout on generate call** — The `fetch` to `/api/consultation/generate` had no timeout. AI calls can take >30s, causing Stripe's webhook timeout to trigger and retry the event. On the retry, if the DB hasn't yet been updated to `status='complete'`, the idempotency check fails and generation is triggered a second time. Fixed by adding `AbortController` with a 25s timeout (within Stripe's 30s window). `clearTimeout` called on both success and catch paths.

**MEDIUM (4 fixed):**
3. **Error results logged at info level** — Route handler logged `result.message` with `console.log` even when `result.status === 'error'`. Errors now logged via `console.error` with explicit "processing error" label.
4. **`event.id` not logged** — Dev Notes specify "include event.id, event.type, consultationId" in logs. Added `console.log` for each received event including `event.id`, and included `event.id` in all event-specific log messages for Stripe Dashboard correlation.
5. **`triggerAutoRefund` ignored Supabase update errors** — If `stripe.refunds.create()` succeeded but the DB update to `payment_status='refunded'` failed, the refund was issued but the DB still showed `paid`. The next Stripe retry would bypass idempotency and re-trigger generation. Fixed by checking and logging the Supabase update error for manual reconciliation.
6. **`NEXT_PUBLIC_APP_URL` undocumented** — Used in `webhooks.ts` for the internal generate fetch but missing from `.env.example`. Added with descriptive comment explaining the fallback chain.

**LOW (2 fixed via new tests):**
7. **No test for `already_complete` response** — Added test verifying `processPaymentSucceeded` returns `{ status: 'ok', message: 'Already complete' }` when generate returns `{ status: 'already_complete' }`, and that auto-refund is NOT triggered.
8. **No test for `stripe.refunds.create()` throwing** — Added test verifying auto-refund API failure returns `{ status: 'error', message: 'Auto-refund failed' }` with `refunded` undefined.

### Post-Fix Test Count

4 new tests added (1019 → 1023 total). All 1023 tests pass.

## Change Log

- 2026-03-02: Implemented Story 5-5 — Stripe webhook handler with signature verification, payment succeeded/failed processing, idempotency, auto-refund on AI failure, and 25 new unit tests.
- 2026-03-02: Code review (AI) — 6 issues fixed: already_complete handling, fetch timeout (25s AbortController), error-level logging for errors, event.id in all log messages, triggerAutoRefund Supabase error checking, NEXT_PUBLIC_APP_URL in .env.example. 4 new tests added (1023 total).
