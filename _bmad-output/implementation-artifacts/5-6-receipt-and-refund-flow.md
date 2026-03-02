# Story 5.6: Receipt & Refund Flow

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to receive an email receipt after payment and see a clear refund message if the AI fails,
so that I have transaction proof and trust that I will not lose money on a failed consultation.

## Acceptance Criteria

1. Stripe sends an email receipt automatically after successful payment by setting `receipt_email` on the PaymentIntent at creation time in `POST /api/payment/create-intent`.
2. If consultation generation fails completely (after retries) and an auto-refund is issued (by Story 5.5's webhook handler), the user sees: "Ocorreu um erro. O seu pagamento foi reembolsado." on the results page.
3. The refund status is reflected in the Zustand consultation store via a new `paymentStatus` value `'refunded'` and the results page renders the refund banner when this status is active.
4. The refund notification banner includes a shield/refund icon, the refund message in Portuguese, and a "Nova consultoria" (new consultation) CTA button that resets the flow and navigates to `/start`.
5. A new `GET /api/consultation/:id/status` API endpoint returns the current `payment_status` and `status` of a consultation from Supabase, enabling the client to poll for refund status after payment.
6. The results page polls `GET /api/consultation/:id/status` after payment success (every 5 seconds, max 60 seconds) to detect if the server-side webhook triggered an auto-refund, and updates the Zustand store accordingly.
7. The refund is logged in the consultation record: `payment_status = 'refunded'` is already set by Story 5.5's `triggerAutoRefund` function -- this story reads and surfaces it to the user.
8. All new files have corresponding unit tests. Tests verify: receipt_email on PaymentIntent creation, consultation status endpoint responses, refund banner rendering, polling behavior, and store state transitions.

## Tasks / Subtasks

- [x] Task 1: Add `receipt_email` to PaymentIntent creation (AC: 1)
  - [x] Modify `src/app/api/payment/create-intent/route.ts` to accept an optional `email` field in the request body
  - [x] Add `email: z.string().email().optional()` to `CreatePaymentIntentSchema`
  - [x] Pass `receipt_email: email` to `stripe.paymentIntents.create()` when email is provided
  - [x] Stripe automatically sends a receipt to this email on successful payment -- no additional webhook handling needed
  - [x] Note: Guest users may not have an email -- `receipt_email` is optional. Auth users (Epic 8) will always have one.

- [x] Task 2: Create `GET /api/consultation/:id/status` endpoint (AC: 5)
  - [x] Create `src/app/api/consultation/[id]/status/route.ts`
  - [x] Accept consultation ID from dynamic route param `[id]`
  - [x] Validate `id` is a valid UUID using Zod
  - [x] Query Supabase: `consultations.select('id, status, payment_status').eq('id', id).single()`
  - [x] Return `{ id, status, paymentStatus }` on success (camelCase for client consistency)
  - [x] Return 404 if consultation not found
  - [x] Return 400 if `id` is not a valid UUID
  - [x] Use `createServerSupabaseClient()` from `@/lib/supabase/server`

- [x] Task 3: Add `'refunded'` to Zustand store paymentStatus (AC: 3)
  - [x] Update `paymentStatus` union type in `src/stores/consultation.ts` to include `'refunded'`: `'none' | 'pending' | 'paid' | 'failed' | 'refunded'`
  - [x] The `setPaymentStatus` action already accepts any value in the union -- no logic change needed, just type update

- [x] Task 4: Create `RefundBanner` component (AC: 2, 4)
  - [x] Create `src/components/consultation/RefundBanner.tsx`
  - [x] Display: shield/refund icon (Lucide `ShieldAlert` or `AlertTriangle`), message "Ocorreu um erro. O seu pagamento foi reembolsado.", and a "Nova consultoria" button
  - [x] "Nova consultoria" button calls `reset()` on the consultation store and navigates to `/start`
  - [x] Use Framer Motion fade-in animation (consistent with UX spec: 400ms ease-out)
  - [x] Respect `prefers-reduced-motion`
  - [x] Style: card with border, destructive/warning color theme, centered layout
  - [x] Accessible: `role="alert"` on the refund message, proper aria labels

- [x] Task 5: Create `useConsultationStatus` polling hook (AC: 6)
  - [x] Create `src/hooks/useConsultationStatus.ts`
  - [x] Accept `consultationId: string` and `enabled: boolean` parameters
  - [x] When `enabled` is true, poll `GET /api/consultation/${consultationId}/status` every 5 seconds
  - [x] Max polling duration: 60 seconds (12 attempts), then stop
  - [x] If response shows `paymentStatus === 'refunded'`, call `setPaymentStatus('refunded')` on the store and stop polling
  - [x] If response shows `status === 'complete'`, stop polling (consultation generated successfully)
  - [x] Clean up interval on unmount
  - [x] Return `{ isPolling, consultationStatus }` for the component to use

- [x] Task 6: Integrate refund flow into results page (AC: 2, 3, 6)
  - [x] Modify `src/app/consultation/results/[id]/page.tsx`
  - [x] Import and use `useConsultationStatus` hook -- enable polling when `paymentStatus === 'paid'`
  - [x] Add a third render state: when `paymentStatus === 'refunded'`, render `RefundBanner` instead of `PaidResultsPlaceholder`
  - [x] The `AnimatePresence` should handle transition from paid placeholder to refund banner smoothly

- [x] Task 7: Write unit tests (AC: 8)
  - [x] Create `src/test/receipt-email.test.ts`: test that `receipt_email` is passed to `stripe.paymentIntents.create()` when email is provided, and omitted when not
  - [x] Create `src/test/consultation-status.test.ts`: test the GET status endpoint with valid/invalid IDs, found/not-found consultations
  - [x] Create `src/test/refund-banner.test.tsx`: test `RefundBanner` renders message, icon, and CTA; test reset+navigate on CTA click
  - [x] Create `src/test/use-consultation-status.test.ts`: test polling starts when enabled, stops on refund/complete, cleans up on unmount, respects max attempts
  - [x] Create `src/test/results-page-refund.test.tsx`: test results page renders refund banner when `paymentStatus === 'refunded'`
  - [x] Run full test suite -- all 1059 tests pass (1023 existing + 36 new)

## Dev Notes

### Architecture Compliance

- **Receipt email via Stripe's built-in mechanism:** Stripe automatically sends a receipt email when `receipt_email` is set on a PaymentIntent and payment succeeds. No custom email service needed. This is the architecture-compliant approach -- "Stripe handles all card data (PCI DSS compliant)" and payment receipts are part of Stripe's native capabilities. [Source: architecture.md#7.4 Payment Security]
- **Consultation status endpoint follows API pattern:** `GET /api/consultation/:id/status` follows the existing API pattern from architecture.md Section 5.1: `GET /api/consultation/:id` returns consultation data. The `/status` sub-route provides a lightweight polling endpoint without fetching full consultation data. [Source: architecture.md#5.1 Consultation Flow]
- **Auto-refund mechanism already exists:** Story 5.5 implemented `triggerAutoRefund` in `src/lib/stripe/webhooks.ts` which calls `stripe.refunds.create()` and updates `payment_status = 'refunded'` in Supabase. This story READS that status and surfaces it to the user. DO NOT re-implement refund logic. [Source: src/lib/stripe/webhooks.ts lines 47-79]
- **Client-side polling pattern matches architecture:** "Long-polling or status polling for AI processing progress updates" is the established pattern. The 5-second interval matches the preview polling interval in architecture.md Section 14. [Source: architecture.md#5.1, prd.md#Real-Time Considerations]
- **`src/types/index.ts` is FROZEN:** Do NOT add any types to this file. Define types locally in their respective files. [Source: 5-1-stripe-setup-and-configuration.md#Architecture Compliance]
- **Stripe API version pinned:** `apiVersion: '2026-02-25.clover'` -- the `getStripeServer()` singleton already pins this. [Source: src/lib/stripe/server.ts]
- **Supabase service role client:** Use `createServerSupabaseClient()` from `@/lib/supabase/server` for the status endpoint (bypasses RLS). [Source: src/lib/supabase/server.ts]

### receipt_email Implementation Detail

```typescript
// In src/app/api/payment/create-intent/route.ts
// Add to existing PaymentIntent creation:
const paymentIntent = await stripe.paymentIntents.create({
  amount,
  currency: CURRENCY,
  automatic_payment_methods: { enabled: true },
  metadata: { consultationId, userType: String(userType) },
  // NEW: Stripe sends email receipt automatically on successful payment
  ...(email ? { receipt_email: email } : {}),
});
```

**Key points:**
- `receipt_email` is optional on PaymentIntent. When set, Stripe sends a branded receipt email to that address upon successful charge.
- The receipt email includes: amount charged, date, description, payment method last 4 digits.
- No custom email templates needed for MVP -- Stripe's default receipt template is sufficient.
- The Stripe Dashboard (Settings > Emails) allows customizing receipt branding (logo, colors, support email).
- For guest users without email, receipt is simply not sent. When Epic 8 (Auth) is implemented, the user's email from Supabase Auth will be available.
- In test mode, receipt emails are only sent to verified email addresses or Stripe's test email.

### Consultation Status Endpoint Implementation

```typescript
// src/app/api/consultation/[id]/status/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const ParamsSchema = z.object({
  id: z.string().uuid('Invalid consultation ID'),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const parseResult = ParamsSchema.safeParse(resolvedParams);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid consultation ID' },
      { status: 400 }
    );
  }

  const { id } = parseResult.data;
  const supabase = createServerSupabaseClient();

  const { data: consultation, error } = await supabase
    .from('consultations')
    .select('id, status, payment_status')
    .eq('id', id)
    .single();

  if (error || !consultation) {
    return NextResponse.json(
      { error: 'Consultation not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    id: consultation.id,
    status: consultation.status,
    paymentStatus: consultation.payment_status,
  });
}
```

**Key points:**
- Next.js 14+ App Router uses `params` as a `Promise` that must be awaited -- DO NOT destructure directly.
- Returns camelCase `paymentStatus` for client consistency (DB stores as `payment_status` snake_case).
- Lightweight endpoint: only fetches 3 columns, no joins.
- No authentication required for MVP (guest sessions). When Epic 8 auth is implemented, add user_id check.

### RefundBanner Component Guide

```typescript
// src/components/consultation/RefundBanner.tsx
'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useConsultationStore } from '@/stores/consultation';

export function RefundBanner() {
  const router = useRouter();
  const reset = useConsultationStore((state) => state.reset);
  const shouldReduceMotion = useReducedMotion();

  const handleNewConsultation = () => {
    reset();
    router.push('/start');
  };

  const fadeIn = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, ease: 'easeOut' as const },
      };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <motion.div
        className="w-full max-w-md rounded-xl border border-destructive/30 bg-card p-8 text-center space-y-6"
        {...fadeIn}
      >
        <ShieldAlert
          className="mx-auto h-12 w-12 text-destructive"
          aria-hidden="true"
        />
        <p
          className="text-lg font-medium text-foreground"
          role="alert"
        >
          Ocorreu um erro. O seu pagamento foi reembolsado.
        </p>
        <p className="text-sm text-muted-foreground">
          O reembolso será processado em 5-10 dias úteis.
        </p>
        <button
          onClick={handleNewConsultation}
          className="w-full min-h-[48px] rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          type="button"
        >
          Nova consultoria
        </button>
      </motion.div>
    </div>
  );
}
```

### useConsultationStatus Polling Hook Guide

```typescript
// src/hooks/useConsultationStatus.ts
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useConsultationStore } from '@/stores/consultation';

interface ConsultationStatusResponse {
  id: string;
  status: string;
  paymentStatus: string;
}

const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_DURATION_MS = 60_000;
const MAX_ATTEMPTS = MAX_POLL_DURATION_MS / POLL_INTERVAL_MS; // 12

export function useConsultationStatus(
  consultationId: string,
  enabled: boolean
) {
  const [isPolling, setIsPolling] = useState(false);
  const [consultationStatus, setConsultationStatus] =
    useState<ConsultationStatusResponse | null>(null);
  const setPaymentStatus = useConsultationStore((state) => state.setPaymentStatus);
  const attemptRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const pollStatus = useCallback(async () => {
    attemptRef.current += 1;

    if (attemptRef.current > MAX_ATTEMPTS) {
      stopPolling();
      return;
    }

    try {
      const response = await fetch(
        `/api/consultation/${consultationId}/status`
      );
      if (!response.ok) return;

      const data: ConsultationStatusResponse = await response.json();
      setConsultationStatus(data);

      if (data.paymentStatus === 'refunded') {
        setPaymentStatus('refunded');
        stopPolling();
      } else if (data.status === 'complete') {
        stopPolling();
      }
    } catch {
      // Silently fail -- next poll will retry
    }
  }, [consultationId, setPaymentStatus, stopPolling]);

  useEffect(() => {
    if (!enabled || !consultationId) {
      stopPolling();
      return;
    }

    attemptRef.current = 0;
    setIsPolling(true);

    // Immediate first poll
    pollStatus();

    intervalRef.current = setInterval(pollStatus, POLL_INTERVAL_MS);

    return () => stopPolling();
  }, [enabled, consultationId, pollStatus, stopPolling]);

  return { isPolling, consultationStatus };
}
```

### Results Page Integration Guide

```typescript
// In src/app/consultation/results/[id]/page.tsx
// Add to existing imports:
import { RefundBanner } from '@/components/consultation/RefundBanner';
import { useConsultationStatus } from '@/hooks/useConsultationStatus';

// In ResultsPage component, after existing hooks:
const { isPolling } = useConsultationStatus(
  consultationId ?? '',
  paymentStatus === 'paid' // Only poll when payment just succeeded
);

// Update the AnimatePresence render to handle 3 states:
return (
  <AnimatePresence mode="wait">
    {paymentStatus === 'refunded' ? (
      <motion.div key="refund" {...resultsEntranceVariants}>
        <RefundBanner />
      </motion.div>
    ) : paymentStatus !== 'paid' ? (
      <motion.div key="paywall" {...paywallExitVariants}>
        <PaywallWrapper ... />
      </motion.div>
    ) : (
      <motion.div key="results" {...resultsEntranceVariants}>
        <PaidResultsPlaceholder shouldReduceMotion={shouldReduceMotion} />
      </motion.div>
    )}
  </AnimatePresence>
);
```

### Project Structure Notes

```
src/
├── app/
│   └── api/
│       ├── consultation/
│       │   ├── [id]/
│       │   │   └── status/
│       │   │       └── route.ts           NEW: consultation status polling endpoint
│       │   ├── start/route.ts              EXISTS -- no changes
│       │   ├── analyze/route.ts            EXISTS -- no changes
│       │   └── generate/route.ts           EXISTS -- no changes (auto-refund is in webhook)
│       ├── payment/
│       │   └── create-intent/route.ts      MODIFIED: add receipt_email to PaymentIntent
│       └── webhook/
│           └── stripe/route.ts             EXISTS -- no changes (refund logic already here)
├── components/
│   └── consultation/
│       ├── Paywall.tsx                     EXISTS -- no changes
│       └── RefundBanner.tsx                NEW: refund notification component
├── hooks/
│   └── useConsultationStatus.ts            NEW: polling hook for consultation status
├── lib/
│   └── stripe/
│       ├── webhooks.ts                     EXISTS -- no changes (triggerAutoRefund already works)
│       └── server.ts                       EXISTS -- no changes
├── stores/
│   └── consultation.ts                     MODIFIED: add 'refunded' to paymentStatus type
└── test/
    ├── receipt-email.test.ts               NEW
    ├── consultation-status.test.ts         NEW
    ├── refund-banner.test.ts               NEW
    ├── use-consultation-status.test.ts     NEW
    └── results-page-refund.test.ts         NEW
```

**Files that must NOT be modified:**
- `src/types/index.ts` -- types are frozen
- `src/lib/stripe/webhooks.ts` -- refund logic already complete from Story 5.5
- `src/lib/stripe/server.ts` -- Stripe singleton unchanged
- `src/lib/stripe/client.ts` -- client-side only, no changes needed
- `src/lib/stripe/pricing.ts` -- pricing logic unchanged
- `src/app/api/webhook/stripe/route.ts` -- webhook handler unchanged
- `src/app/api/consultation/generate/route.ts` -- generation logic unchanged
- `src/components/consultation/Paywall.tsx` -- paywall display unchanged (trust badge "Reembolso automatico se a IA falhar" already there)
- `src/components/payment/PaymentForm.tsx` -- payment form unchanged
- `src/components/payment/StripeProvider.tsx` -- provider unchanged

### Library & Framework Requirements

| Library | Version | Usage in This Story |
|---------|---------|---------------------|
| `stripe` | ^20.4.0 (installed in 5.1) | `receipt_email` parameter on `paymentIntents.create()` |
| `next` | already installed | `NextResponse`, App Router dynamic route `[id]` |
| `@supabase/supabase-js` | already installed | `createServerSupabaseClient()` for status endpoint |
| `zod` | already installed | UUID validation on status endpoint |
| `framer-motion` | already installed | RefundBanner animation |
| `lucide-react` | already installed | `ShieldAlert` icon |
| `zustand` | already installed | Store type update for 'refunded' status |
| `vitest` | already installed | Test runner |
| `@testing-library/react` | already installed | Component tests for RefundBanner |

**0 NEW DEPENDENCIES** -- everything needed is already installed from previous stories.

### Cross-Story Dependencies

- **Story 5.1 (Stripe Setup) -- DONE:** Provides `getStripeServer()` singleton. The `receipt_email` parameter is part of the standard Stripe PaymentIntent API -- no additional Stripe configuration needed. [Source: src/lib/stripe/server.ts]
- **Story 5.2 (Payment Intent Creation) -- DONE:** The `create-intent` route is modified in this story to accept optional `email` and pass it as `receipt_email`. The existing `metadata: { consultationId, userType }` is unchanged. [Source: src/app/api/payment/create-intent/route.ts]
- **Story 5.3 (Paywall UI) -- DONE:** Already displays "Reembolso automatico se a IA falhar" trust badge. No changes needed. [Source: src/components/consultation/Paywall.tsx line 144]
- **Story 5.4 (Payment Processing & Unlock) -- DONE:** Client-side payment flow is unchanged. The `PaymentForm` component does not need to collect email -- that is handled by the parent page if desired. The optimistic `paymentStatus: 'paid'` set in store enables the polling hook to start. [Source: src/components/payment/PaymentForm.tsx]
- **Story 5.5 (Stripe Webhook Handler) -- DONE:** Auto-refund is already implemented in `triggerAutoRefund()` which calls `stripe.refunds.create()` and sets `payment_status = 'refunded'` in Supabase. This story READS that status -- it does NOT trigger refunds. [Source: src/lib/stripe/webhooks.ts lines 47-79]
- **Epic 6 (Results Page) -- FUTURE:** Will replace `PaidResultsPlaceholder` with actual consultation data. The refund flow integration in this story will persist into Epic 6 -- the `paymentStatus === 'refunded'` check should remain. [Source: epics-and-stories.md#E6]
- **Epic 8 (Auth & User Profile) -- FUTURE:** Once auth is implemented, the user's email from Supabase Auth should be used as `receipt_email` automatically (no manual entry needed). The status endpoint should also add user_id authorization. [Source: epics-and-stories.md#E8]

### Previous Story Intelligence

**From Story 5.5 (Stripe Webhook Handler) -- DONE:**
- Auto-refund mechanism: `triggerAutoRefund()` in `webhooks.ts` calls `stripe.refunds.create({ payment_intent: paymentIntentId })` and updates Supabase `payment_status = 'refunded'`. If the Supabase update fails but refund succeeds, it logs for manual reconciliation.
- The webhook handler returns 200 even if refund fails, to prevent Stripe retries.
- AbortController with 25s timeout on the generate fetch prevents Stripe webhook timeout.
- Test count after 5.5: **1023 tests** (all passing).
- Code review found and fixed: `already_complete` handling, fetch timeout, error-level logging, event.id in logs, triggerAutoRefund Supabase error checking, NEXT_PUBLIC_APP_URL documentation.

**From Story 5.4 (Payment Processing & Unlock) -- DONE:**
- `handlePaymentSuccess()` sets `paymentStatus: 'paid'` optimistically in the Zustand store.
- This is the trigger point for the polling hook -- when the store shows `'paid'`, start polling the status endpoint.
- If the server-side webhook detects a generation failure and refunds, the poll will pick up `payment_status = 'refunded'` from Supabase and update the store.

**From Story 5.2 (Payment Intent Creation) -- DONE:**
- PaymentIntent created with `metadata: { consultationId, userType }`.
- Currently all users are treated as guests (`isGuest = true`).
- The request body schema is `{ consultationId: uuid, type?: 'first' | 'repeat' }` -- this story adds optional `email`.

### Git Intelligence

Recent commits (Epic 5):
```
cccf452 review(epic-5): code review story 5-5-stripe-webhook-handler
9c504b8 feat(epic-5): implement story 5-5-stripe-webhook-handler
48b4752 review(epic-5): code review story 5-4-payment-processing-and-unlock
a6625ce feat(epic-5): implement story 5-4-payment-processing-and-unlock
fb48126 feat(epic-5): implement story 5-3-paywall-ui
```

Patterns established:
- Commit message format: `feat(epic-5): implement story 5-X-story-slug`
- Test files in `src/test/` directory (NOT co-located with source files)
- Stripe mocking: mock `stripe` module with `vi.mock('stripe', ...)`, mock specific methods
- Route handler testing: use `Request` constructor with explicit URL, method, headers, body
- Supabase mocking: mock `@/lib/supabase/server` with chainable query builder pattern
- Component testing: `@testing-library/react` with `vi.mock` for stores and router
- Framer Motion in tests: mock `framer-motion` to render children directly

Suggested commit message: `feat(epic-5): implement story 5-6-receipt-and-refund-flow`

### Environment Variables

No new environment variables required. All needed variables are already configured:

| Variable | Side | Already Set By | Used In This Story For |
|----------|------|----------------|------------------------|
| `STRIPE_SECRET_KEY` | Server only | Story 5.1 | `getStripeServer()` for receipt_email on PaymentIntent |
| `NEXT_PUBLIC_SUPABASE_URL` | Server | Story 2.6 | `createServerSupabaseClient()` for status endpoint |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Story 2.6 | `createServerSupabaseClient()` admin access |

### Stripe receipt_email API Notes (v20.4.0)

**`receipt_email` on PaymentIntent:**
- Type: `string | null` (optional)
- When set: Stripe sends a branded receipt email to this address after successful charge
- When null/omitted: No receipt email sent
- Can be set at creation or updated before payment confirmation
- Receipt content: amount, date, description, last 4 of card, currency
- Customization: Stripe Dashboard > Settings > Emails > Receipts (branding, logo, support email)
- Test mode: receipts only sent to verified email addresses or Stripe's test email `test@example.com`

**Refund behavior:**
- When `stripe.refunds.create()` is called, Stripe also sends a refund notification email if `receipt_email` was set on the original PaymentIntent
- Refund processing: 5-10 business days for card refunds
- No additional API calls needed for refund receipts -- Stripe handles it automatically

### Critical Guardrails

- **DO NOT** re-implement refund logic. The auto-refund is handled by `triggerAutoRefund()` in `src/lib/stripe/webhooks.ts` (Story 5.5). This story only READS the refund status and displays it to the user.
- **DO NOT** add types to `src/types/index.ts` -- types are frozen. Define local types in their respective files.
- **DO NOT** modify `src/lib/stripe/webhooks.ts` or `src/app/api/webhook/stripe/route.ts` -- the refund mechanism is complete.
- **DO NOT** modify `src/components/consultation/Paywall.tsx` -- the trust badge is already there and no changes are needed.
- **DO NOT** create a new Stripe instance. Use `getStripeServer()` from `@/lib/stripe/server`.
- **DO NOT** use `request.json()` for the webhook route (it uses `request.text()`) -- but this story doesn't touch the webhook route.
- **DO** use Next.js 14+ App Router `params` as `Promise<{ id: string }>` in the status route handler -- the params must be awaited.
- **DO** add the `'refunded'` value to the Zustand store's `paymentStatus` union type. This is a backward-compatible change.
- **DO** handle the polling edge case where the component unmounts (user navigates away) -- clean up the interval.
- **DO** handle the case where polling times out (60s max) without detecting refund -- the user stays on the paid results placeholder (normal behavior for successful consultations).
- **DO** ensure the RefundBanner uses the theme-aware design tokens (not hardcoded colors) to work with both male/female themes.
- **DO** run `npm test` before considering done -- all 1023 existing + new tests must pass.

### Testing Requirements

**Receipt email tests (`src/test/receipt-email.test.ts`):**
- Test that `receipt_email` is passed to `stripe.paymentIntents.create()` when `email` is provided in the request body
- Test that `receipt_email` is NOT passed when `email` is omitted
- Test that invalid email format returns 400 validation error
- Test that existing functionality (amount, currency, metadata) is unchanged

**Consultation status endpoint tests (`src/test/consultation-status.test.ts`):**
- Test valid consultation ID returns correct `{ id, status, paymentStatus }`
- Test invalid UUID returns 400
- Test non-existent consultation returns 404
- Test `payment_status` is mapped to camelCase `paymentStatus` in response

**RefundBanner tests (`src/test/refund-banner.test.ts`):**
- Test renders refund message text "Ocorreu um erro. O seu pagamento foi reembolsado."
- Test renders "Nova consultoria" button
- Test CTA click calls `reset()` on store and navigates to `/start`
- Test `role="alert"` is present on the message element
- Test refund processing timeline message is shown

**Polling hook tests (`src/test/use-consultation-status.test.ts`):**
- Test polling starts when `enabled` is true
- Test polling does NOT start when `enabled` is false
- Test polling stops when response has `paymentStatus === 'refunded'`
- Test polling stops when response has `status === 'complete'`
- Test polling stops after max attempts (12)
- Test `setPaymentStatus('refunded')` is called on refund detection
- Test interval is cleaned up on unmount

**Results page refund tests (`src/test/results-page-refund.test.ts`):**
- Test results page renders `RefundBanner` when `paymentStatus === 'refunded'`
- Test results page renders `Paywall` when `paymentStatus !== 'paid'`
- Test results page renders `PaidResultsPlaceholder` when `paymentStatus === 'paid'`

### References

- [Source: epics-and-stories.md#S5.6] -- ACs: Stripe email receipt, auto-refund user message, refund logged in consultation record
- [Source: architecture.md#7.4 Payment Security] -- "Refund automation: if AI fails after payment, auto-refund via Stripe API"
- [Source: architecture.md#5.1 Consultation Flow] -- `GET /api/consultation/:id` pattern for consultation status
- [Source: architecture.md#5.2 Payment] -- Payment API patterns, webhook handling
- [Source: prd.md#Payment Infrastructure] -- "Auto-refund on AI processing failure"
- [Source: prd.md#Business & Monetization Model] -- Pricing tiers: EUR 5.99 first, EUR 2.99 returning
- [Source: ux-design.md#11.4 Payment Failure] -- "Pagamento nao processado. Tente outro metodo." error pattern
- [Source: ux-design.md#11.7 Elicitation] -- Chaos Monkey: Stripe down mitigation, Pre-mortem: users felt tricked
- [Source: ux-design.md#11.2 Paywall Screen] -- Trust badge: "Reembolso automatico se a IA falhar"
- [Source: 5-5-stripe-webhook-handler.md] -- triggerAutoRefund implementation, WebhookResult type, auto-refund on generation failure
- [Source: 5-4-payment-processing-and-unlock.md] -- Optimistic paymentStatus='paid' on client side, polling trigger point
- [Source: 5-2-payment-intent-creation.md] -- PaymentIntent metadata includes consultationId, request body schema
- [Source: src/lib/stripe/webhooks.ts] -- triggerAutoRefund() function, refund logic, Supabase update
- [Source: src/app/api/payment/create-intent/route.ts] -- Existing create-intent route to modify
- [Source: src/stores/consultation.ts] -- Zustand store with paymentStatus type
- [Source: src/app/consultation/results/[id]/page.tsx] -- Results page with AnimatePresence, 3-state rendering needed

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No debug issues encountered. Implementation followed the Dev Notes guide closely.

### Completion Notes List

- Task 1: Added optional `email` field to `CreatePaymentIntentSchema` with Zod email validation. When provided, `receipt_email` is spread into the `stripe.paymentIntents.create()` call. Guest users without email simply omit it.
- Task 2: Created `GET /api/consultation/[id]/status/route.ts` following Next.js 14+ App Router pattern with `params` as an awaited Promise. UUID validated via Zod, Supabase queried with service role client. Maps snake_case `payment_status` to camelCase `paymentStatus`.
- Task 3: Extended `paymentStatus` union type in `src/stores/consultation.ts` to include `'refunded'`. Both the interface type and `setPaymentStatus` action signature updated.
- Task 4: Created `RefundBanner` component with `ShieldAlert` icon, Portuguese refund message with `role="alert"`, refund timeline info, and "Nova consultoria" CTA. Uses Framer Motion fade-in (400ms ease-out) with `useReducedMotion` support.
- Task 5: Created `useConsultationStatus` polling hook. Polls every 5 seconds, max 12 attempts (60s), stops on `paymentStatus === 'refunded'` (calls `setPaymentStatus('refunded')`) or `status === 'complete'`. Cleans up interval on unmount.
- Task 6: Updated results page to import `RefundBanner` and `useConsultationStatus`. Added polling enabled when `paymentStatus === 'paid'`. AnimatePresence now handles 3 states: refunded (RefundBanner), not-paid (PaywallWrapper), paid (PaidResultsPlaceholder).
- Task 7: Wrote 36 tests across 5 test files covering all ACs. Full suite: 1059 tests, all passing.

### File List

- `src/app/api/payment/create-intent/route.ts` (modified)
- `src/app/api/consultation/[id]/status/route.ts` (new)
- `src/stores/consultation.ts` (modified)
- `src/components/consultation/RefundBanner.tsx` (new)
- `src/hooks/useConsultationStatus.ts` (new)
- `src/app/consultation/results/[id]/page.tsx` (modified)
- `src/test/receipt-email.test.ts` (new)
- `src/test/consultation-status.test.ts` (new)
- `src/test/refund-banner.test.tsx` (new)
- `src/test/use-consultation-status.test.ts` (new)
- `src/test/results-page-refund.test.tsx` (new)

### Senior Developer Review (AI)

**Reviewer:** claude-sonnet-4-6 | **Date:** 2026-03-02 | **Outcome:** Approved (after fixes)

**Findings Fixed:**

- **HIGH: Status endpoint returned 404 for ALL Supabase errors** — DB connection failures, auth errors, etc. were masked as "not found". Fixed: now checks `error.code === 'PGRST116'` (PostgREST not-found code) and returns 404 only for genuine not-found; all other Supabase errors return 500.
- **HIGH: `ConsultationStatusResponse.paymentStatus` typed as loose `string`** — Polling hook had no type safety when calling `setPaymentStatus`. Fixed: added `ConsultationPaymentStatus` and `ConsultationStatus` named types in the hook file.
- **HIGH: Concurrent polling requests not guarded** — If the first immediate fetch took >5s, the interval could fire a second fetch while the first was still in-flight. Fixed: added `isFetchingRef` concurrency guard that skips interval polls if a fetch is already in-flight.
- **MEDIUM: `PaymentConsultationRecord` local type used `'free'`** — Inconsistent with Zustand store's `'none'` initial status. Fixed: aligned to `'none' | 'pending' | 'paid' | 'failed' | 'refunded'`.
- **LOW: Unnecessary `'use client'` directive** — Custom hooks don't need it (only components do). Removed from `useConsultationStatus.ts`.
- **Tests added:** 2 new tests — 500 response for unexpected DB error in consultation-status endpoint; concurrency guard verification in polling hook. Total: 1061 tests, all passing.

**Not Fixed (deferred to Epic 8):**
- Status endpoint has no auth/RLS — any UUID can be polled. Story notes explicitly defer this to Epic 8 (auth implementation).

### Change Log

- 2026-03-02: Implemented story 5-6-receipt-and-refund-flow. Added receipt_email to PaymentIntent creation, consultation status polling endpoint, refunded state in Zustand store, RefundBanner component, useConsultationStatus hook, and results page integration. 36 new tests added; all 1059 tests pass.
- 2026-03-02: Code review (AI) — fixed 4 issues (HIGH: proper Supabase error code handling in status endpoint; HIGH: typed ConsultationStatusResponse; HIGH: polling concurrency guard with isFetchingRef; MEDIUM: PaymentConsultationRecord type aligned to 'none' not 'free'; LOW: removed unnecessary 'use client' from hook). 2 new tests added; all 1061 tests pass. Status → done.
