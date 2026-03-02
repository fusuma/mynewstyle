# Story 5.4: Payment Processing & Unlock

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user who has received a free face shape analysis,
I want my consultation unlocked immediately after payment,
so that I can see my full personalized hairstyle recommendations without delay.

## Acceptance Criteria

1. A `PaymentForm` component exists at `src/components/payment/PaymentForm.tsx` that renders the Stripe `<PaymentElement>` for card input and `<ExpressCheckoutElement>` for Apple Pay / Google Pay inside the existing `StripeProvider` wrapper.
2. The `PaymentForm` component calls `stripe.confirmPayment()` on form submission. On success, it updates the consultation store `paymentStatus` to `'paid'` and triggers the paywall dissolve animation.
3. On payment success, the paywall dissolves with a smooth blur-to-clear animation (500ms CSS/Framer Motion transition) revealing the paid results placeholder (Epic 6 content).
4. Results reveal uses a staggered animation (150ms per element) consistent with the UX design spec results reveal pattern.
5. On payment failure, an inline error message is displayed: "Pagamento nao processado. Tente outro metodo." The user's photo, questionnaire, and face shape data are NEVER lost. A retry button remains visible.
6. The `ExpressCheckoutElement` (Apple Pay / Google Pay) is the primary CTA (rendered first, largest). The `PaymentElement` (card input) is the secondary payment method below it.
7. The existing `Paywall.tsx` component is updated to render `PaymentForm` inside the `StripeProvider` when `clientSecret` is available, replacing the placeholder buttons from Story 5.3.
8. The existing results page route (`src/app/consultation/results/[id]/page.tsx`) transitions from `Paywall` to a paid results view (placeholder for Epic 6) when `paymentStatus === 'paid'`, with the staggered reveal animation.
9. The `usePayment` hook (`src/hooks/usePayment.ts`) is extended with a `confirmPayment` function that wraps `stripe.confirmPayment()` and handles success/failure state transitions.
10. All `paymentStatus` transitions are persisted in the Zustand store (already configured in Story 5.3).
11. The payment flow works for guest users without requiring authentication (no account needed to pay).
12. All new files have corresponding unit tests. Tests verify: PaymentForm renders PaymentElement and ExpressCheckoutElement, confirmPayment success/failure flows, paywall dissolve animation triggers, results page transition from paywall to paid state, and error display with retry.

## Tasks / Subtasks

- [x] Task 1: Create `PaymentForm` component (AC: 1, 6)
  - [x] Create `src/components/payment/PaymentForm.tsx` as a `'use client'` component
  - [x] Render `<ExpressCheckoutElement>` as the primary payment CTA with `onConfirm` handler
  - [x] Render `<PaymentElement>` below for card input (secondary method)
  - [x] Add a "Pagar" submit button for the card payment form
  - [x] Accept props: `{ onPaymentSuccess: () => void; onPaymentError: (message: string) => void }`
  - [x] Use `useStripe()` and `useElements()` hooks from `@stripe/react-stripe-js`
  - [x] On ExpressCheckout confirm: call `stripe.confirmPayment({ elements, redirect: 'if_required' })`
  - [x] On card form submit: call `stripe.confirmPayment({ elements, confirmParams: { return_url: window.location.href }, redirect: 'if_required' })`
  - [x] Handle success: call `onPaymentSuccess()` callback
  - [x] Handle failure: call `onPaymentError(error.message)` callback
  - [x] Disable submit button and show "A processar..." while confirming
  - [x] Style: mobile-first, min-h-[48px] touch targets, consistent with design system

- [x] Task 2: Update `Paywall.tsx` to use `PaymentForm` (AC: 7)
  - [x] Replace placeholder buttons inside `StripeProvider` with `<PaymentForm>` component
  - [x] Pass `onPaymentSuccess` callback that updates store `paymentStatus` to `'paid'`
  - [x] Pass `onPaymentError` callback that sets local error state for display
  - [x] Keep the pre-intent "Desbloquear consultoria completa" button for the no-clientSecret state

- [x] Task 3: Implement paywall dissolve animation (AC: 3, 4)
  - [x] In results page, add an `AnimatePresence` wrapper around the paywall/results transition
  - [x] Paywall exit animation: blur increases + opacity fades (500ms)
  - [x] Paid results entrance: staggered fade-in from bottom (150ms per element)
  - [x] Respect `prefers-reduced-motion` -- skip animations, use instant transitions
  - [x] Use `motion.div` with `key` prop to trigger AnimatePresence transitions

- [x] Task 4: Update results page for payment transition (AC: 8)
  - [x] Update `src/app/consultation/results/[id]/page.tsx` to handle the paid transition
  - [x] When `paymentStatus` changes from non-paid to `'paid'`: trigger dissolve animation
  - [x] Paid state renders placeholder with staggered reveal: "Consultoria completa desbloqueada!" message with animation
  - [x] Ensure transition is smooth (no flash of empty content between paywall and results)

- [x] Task 5: Extend `usePayment` hook (AC: 9)
  - [x] Add `confirmPayment` function to `usePayment` return value
  - [x] `confirmPayment` accepts Stripe instance and Elements from `PaymentForm`
  - [x] On success: set `paymentStatus` to `'paid'` in store, set `isLoading: false`
  - [x] On failure: set error message, set `isLoading: false`, keep `paymentStatus` as `'pending'`
  - [x] Handle edge cases: null stripe instance, null elements, network errors

- [x] Task 6: Write unit tests (AC: 12)
  - [x] Create `src/test/payment-form.test.tsx`: PaymentForm renders ExpressCheckoutElement and PaymentElement, handles success/error callbacks
  - [x] Update `src/test/paywall.test.tsx`: verify PaymentForm renders when clientSecret is available
  - [x] Create `src/test/payment-transition.test.tsx`: results page transitions from paywall to paid state
  - [x] Update `src/test/use-payment.test.ts`: add confirmPayment success/failure tests
  - [x] Run full test suite -- all 965 existing + 29 new tests pass (994 total)

## Dev Notes

### Architecture Compliance

- **PaymentForm component path follows architecture.md Section 6.1:** `src/components/payment/PaymentForm.tsx` is placed alongside the existing `StripeProvider.tsx` in the payment components directory. [Source: architecture.md#6.1 Project Structure]
- **Results page route already exists from Story 5.3:** `src/app/consultation/results/[id]/page.tsx` -- modify, do NOT recreate. [Source: 5-3-paywall-ui.md#Task 5]
- **Payment flow architecture:** "On payment success: paywall dissolves (blur to clear, 500ms animation). Results reveal with staggered animation." [Source: ux-design.md#11.3 Payment Success]
- **Payment failure UX:** "Inline error: Pagamento nao processado. Tente outro metodo. Retry button stays visible. User's progress (photo, questionnaire, face shape) is NEVER lost." [Source: ux-design.md#11.4 Payment Failure]
- **Security: Server-side gating remains intact.** The paywall dissolve reveals a PLACEHOLDER for Epic 6 results. Real consultation data is still not sent to the client -- that requires the webhook (Story 5.5) to trigger server-side consultation generation. Payment confirmation on the client is optimistic; the server-side webhook is the source of truth. [Source: architecture.md#7.4 Payment Security]
- **Stripe.js lazy-loaded on paywall:** Already implemented in Story 5.1 via `getStripeClient()` in `StripeProvider`. No changes needed. [Source: architecture.md#8.1 Loading Strategy]
- **`src/types/index.ts` is FROZEN:** Do NOT add any types to this file. Define types locally in the component files. [Source: 5-1-stripe-setup-and-configuration.md#Architecture Compliance]
- **Stripe API version pinned:** `apiVersion: '2026-02-25.clover'` -- do NOT change. [Source: src/lib/stripe/server.ts]
- **Zustand store persistence:** `paymentStatus` is already persisted to `sessionStorage` via the `partialize` config. Changing it to `'paid'` will survive page refreshes within the same tab. [Source: src/stores/consultation.ts]

### PaymentForm Component Implementation Guide

```typescript
// src/components/payment/PaymentForm.tsx
'use client';

import { useState } from 'react';
import {
  PaymentElement,
  ExpressCheckoutElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import type { StripeExpressCheckoutElementConfirmEvent } from '@stripe/stripe-js';

interface PaymentFormProps {
  onPaymentSuccess: () => void;
  onPaymentError: (message: string) => void;
}

export function PaymentForm({ onPaymentSuccess, onPaymentError }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirmPayment = async () => {
    if (!stripe || !elements) return;

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: 'if_required',
    });

    if (error) {
      onPaymentError(error.message ?? 'Pagamento nao processado. Tente outro metodo.');
      setIsProcessing(false);
    } else {
      onPaymentSuccess();
    }
  };

  const handleExpressCheckoutConfirm = async (
    _event: StripeExpressCheckoutElementConfirmEvent
  ) => {
    await handleConfirmPayment();
  };

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleConfirmPayment();
  };

  return (
    <div className="space-y-4">
      {/* Primary: Apple Pay / Google Pay */}
      <ExpressCheckoutElement
        onConfirm={handleExpressCheckoutConfirm}
        options={{
          buttonType: { applePay: 'buy', googlePay: 'buy' },
          buttonTheme: { applePay: 'black', googlePay: 'black' },
          buttonHeight: 48,
        }}
      />

      {/* Divider */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">ou</span>
        </div>
      </div>

      {/* Secondary: Card payment */}
      <form onSubmit={handleCardSubmit}>
        <PaymentElement options={{ layout: 'accordion' }} />
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          aria-busy={isProcessing}
          className="mt-4 w-full min-h-[48px] rounded-xl border border-border bg-background px-6 py-4 text-base font-medium text-foreground transition-opacity hover:opacity-80 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'A processar...' : 'Pagar'}
        </button>
      </form>
    </div>
  );
}
```

**Key implementation notes:**
- `PaymentForm` MUST be rendered INSIDE `<StripeProvider>` (which provides the Elements context). The `useStripe()` and `useElements()` hooks only work inside `<Elements>`.
- `redirect: 'if_required'` prevents full-page redirects for most payment methods. The payment completes inline.
- `ExpressCheckoutElement` automatically detects available wallets (Apple Pay on Safari, Google Pay on Chrome). If no wallets are available, it renders nothing -- that is expected behavior.
- The `confirmParams.return_url` is required by Stripe but only used if the payment method requires a redirect (e.g., 3D Secure). Set it to the current page URL.
- After `stripe.confirmPayment()` succeeds (no error returned), call `onPaymentSuccess()`. The Stripe webhook (Story 5.5) will later confirm server-side.

### Updated Paywall Integration

The Paywall component's `StripeProvider` section changes from placeholder buttons to the `PaymentForm`:

```typescript
// In Paywall.tsx, replace the StripeProvider content:
{clientSecret ? (
  <StripeProvider clientSecret={clientSecret}>
    <PaymentForm
      onPaymentSuccess={() => {
        // Update store to trigger paywall dissolve
        setPaymentStatus('paid');
      }}
      onPaymentError={(message) => {
        setPaymentError(message);
      }}
    />
  </StripeProvider>
) : (
  /* Pre-intent state unchanged: "Desbloquear consultoria completa" button */
)}
```

**Critical changes to Paywall.tsx:**
- Add `setPaymentStatus` from consultation store
- Add local `setPaymentError` state (or accept from parent -- keep pattern consistent with current implementation)
- Import `PaymentForm` from `@/components/payment/PaymentForm`
- The `Paywall` component needs to accept a new prop OR manage the `onPaymentSuccess`/`onPaymentError` internally. Since the current design passes `onInitiatePayment` from the parent, extend the pattern: add `onPaymentSuccess` prop to `PaywallProps` to notify the results page.

### Paywall Props Extension

```typescript
interface PaywallProps {
  faceAnalysis: FaceAnalysisOutput;
  consultationId: string;
  amount: number | null;
  currency: string | null;
  userType: string | null;
  clientSecret: string | null;
  isLoadingPayment: boolean;
  paymentError: string | null;
  onInitiatePayment: () => void;
  onPaymentSuccess: () => void; // NEW: triggers paywall dissolve
}
```

### Results Page Transition

```typescript
// In results page, the transition from paywall to paid state:
import { AnimatePresence, motion } from 'framer-motion';

// Inside ResultsPage component:
<AnimatePresence mode="wait">
  {paymentStatus !== 'paid' ? (
    <motion.div
      key="paywall"
      exit={{ filter: 'blur(20px)', opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <PaywallWrapper
        consultationId={consultationId}
        onPaymentSuccess={() => setPaymentStatus('paid')}
      />
    </motion.div>
  ) : (
    <motion.div
      key="results"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      {/* Paid results placeholder (Epic 6) */}
      <PaidResultsPlaceholder />
    </motion.div>
  )}
</AnimatePresence>
```

**Reduced motion:** When `useReducedMotion()` returns `true`, use instant transitions (no blur, no stagger, no delay). Set `exit={}` and `initial={}` as empty objects.

### Paywall Dissolve Animation Spec (from UX Design)

```
Payment success flow:
1. stripe.confirmPayment() returns success (no error)
2. Store paymentStatus set to 'paid'
3. AnimatePresence detects key change: "paywall" -> "results"
4. Paywall exit animation: blur(0) -> blur(20px), opacity 1 -> 0, 500ms
5. Brief pause (300ms)
6. Results entrance: staggered fade-in from y:20, 150ms per element
7. Subtle confetti or sparkle micro-animation (optional, nice-to-have)
```
[Source: ux-design.md#11.3 Payment Success]

### Payment Failure Handling

```typescript
// Error states to handle:
// 1. Card declined: error.type === 'card_error'
// 2. Validation error: error.type === 'validation_error'
// 3. Network error: error.type === 'api_connection_error'
// 4. General error: any other error

// User-visible message:
// "Pagamento nao processado. Tente outro metodo."
// (from ux-design.md#11.4)

// CRITICAL: On failure:
// - Display inline error (role="alert" for screen readers)
// - Keep retry button visible
// - NEVER clear user's photo, questionnaire, or face analysis data
// - NEVER reset the consultation store
// - paymentStatus stays as 'pending' (not 'failed')
//   so user can retry without needing to re-create the PaymentIntent
```
[Source: ux-design.md#11.4 Payment Failure]

### Project Structure Notes

```
src/
├── app/
│   └── consultation/
│       └── results/
│           └── [id]/
│               └── page.tsx              MODIFIED: add AnimatePresence transition, onPaymentSuccess flow
├── components/
│   ├── consultation/
│   │   ├── Paywall.tsx                   MODIFIED: render PaymentForm, add onPaymentSuccess prop
│   │   └── BlurredRecommendationCard.tsx EXISTS -- no changes
│   └── payment/
│       ├── StripeProvider.tsx            EXISTS (Story 5.1) -- no changes
│       └── PaymentForm.tsx              NEW: Stripe PaymentElement + ExpressCheckoutElement
├── hooks/
│   └── usePayment.ts                    EXISTS -- no changes needed (payment confirmation handled in PaymentForm directly via useStripe)
├── stores/
│   └── consultation.ts                  EXISTS -- no changes (setPaymentStatus already exists)
├── lib/
│   └── stripe/
│       ├── client.ts                    EXISTS -- no changes
│       ├── server.ts                    EXISTS -- no changes
│       ├── pricing.ts                   EXISTS -- no changes
│       └── index.ts                     EXISTS -- no changes
└── test/
    ├── payment-form.test.tsx            NEW: PaymentForm component tests
    ├── payment-transition.test.tsx       NEW: results page transition tests
    ├── paywall.test.tsx                 MODIFIED: update for PaymentForm rendering
    └── use-payment.test.ts              EXISTS -- minimal or no changes
```

**Files modified:**
- `src/components/consultation/Paywall.tsx` -- replace placeholder buttons with `PaymentForm`, add `onPaymentSuccess` prop
- `src/app/consultation/results/[id]/page.tsx` -- add `AnimatePresence` transition, handle `onPaymentSuccess`

**Files that must NOT be modified:**
- `src/types/index.ts` -- types are frozen
- `src/lib/stripe/server.ts` -- server-side only, not relevant to client payment flow
- `src/lib/stripe/pricing.ts` -- pricing logic unchanged
- `src/lib/stripe/client.ts` -- Stripe client loading unchanged
- `src/components/payment/StripeProvider.tsx` -- already complete from Story 5.1
- `src/app/api/payment/create-intent/route.ts` -- already complete from Story 5.2
- `src/stores/consultation.ts` -- `setPaymentStatus` already exists from Story 5.3

### Library & Framework Requirements

| Library | Version | Usage in This Story |
|---------|---------|---------------------|
| `@stripe/react-stripe-js` | ^5.6.0 (installed in 5.1) | `PaymentElement`, `ExpressCheckoutElement`, `useStripe`, `useElements` |
| `@stripe/stripe-js` | ^8.8.0 (installed in 5.1) | Type definitions for Stripe events |
| `framer-motion` | already installed | `AnimatePresence`, `motion.div` for paywall dissolve and results reveal |
| `zustand` | already installed | Consultation store `setPaymentStatus` |
| `vitest` | already installed | Test runner |
| `@testing-library/react` | already installed | Component testing |

**0 NEW DEPENDENCIES** -- everything needed is already installed from previous stories.

### Cross-Story Dependencies

- **Story 5.1 (Stripe Setup) -- DONE:** Provides `StripeProvider` component, `getStripeClient()`, `@stripe/react-stripe-js` package. The `PaymentForm` component MUST be rendered inside `StripeProvider` to access `useStripe()` and `useElements()`. [Source: 5-1-stripe-setup-and-configuration.md]
- **Story 5.2 (Payment Intent Creation) -- DONE:** Provides `POST /api/payment/create-intent` endpoint. The `usePayment` hook calls this to get `clientSecret` which is passed to `StripeProvider`. [Source: 5-2-payment-intent-creation.md]
- **Story 5.3 (Paywall UI) -- DONE:** Provides `Paywall` component, `usePayment` hook, results page route, `BlurredRecommendationCard`, `setPaymentStatus` store action. This story MODIFIES the Paywall to include `PaymentForm` and adds the dissolve animation. [Source: 5-3-paywall-ui.md]
- **Story 5.4 (THIS STORY):** Adds `PaymentForm` with `PaymentElement` + `ExpressCheckoutElement`, integrates into Paywall, implements payment confirmation flow, adds paywall dissolve animation, and handles payment success/failure UX.
- **Story 5.5 (Stripe Webhook Handler) -- NEXT:** Server-side payment confirmation. Until 5.5 is implemented, payment success is tracked OPTIMISTICALLY on the client. The client sets `paymentStatus: 'paid'` after `stripe.confirmPayment()` succeeds. The webhook will later confirm server-side and trigger actual consultation generation. [Source: epics-and-stories.md#S5.5]
- **Story 5.6 (Receipt & Refund) -- FUTURE:** Uses `payment_intent_id` for refunds. [Source: epics-and-stories.md#S5.6]
- **Epic 6 (Results Page) -- FUTURE:** The paid state currently shows a placeholder. Epic 6 will implement full consultation results display (face shape analysis, recommendation cards, grooming tips, styling tips, actions footer). The staggered reveal animation established in this story MUST be preserved in Epic 6. [Source: epics-and-stories.md#E6]

### Previous Story Intelligence

**From Story 5.3 (Paywall UI):**
- The `Paywall` component currently has placeholder buttons inside `StripeProvider` when `clientSecret` is available. This story replaces those with `PaymentForm`.
- Paywall accepts these props: `faceAnalysis`, `consultationId`, `amount`, `currency`, `userType`, `clientSecret`, `isLoadingPayment`, `paymentError`, `onInitiatePayment`. Add `onPaymentSuccess` prop.
- `paymentError` is currently managed in the results page via `usePayment` hook. When `PaymentForm` is added, payment errors from `stripe.confirmPayment()` need to flow back to the error display in `Paywall`.
- The `consultationId` prop is currently unused in Paywall (prefixed with `_`). It may be needed for analytics tracking but is not required for payment confirmation.
- Face shape labels are imported from `@/lib/consultation/face-shape-labels` (shared module extracted in 5.3 code review).
- Portuguese diacritics were corrected in the 5.3 code review. Maintain proper diacritics: "Visualizacao" -> "Visualizacao" is acceptable in code, but user-visible strings should use proper characters.
- Test count baseline: **965 tests** (all passing as of Story 5.3 code review).

**From Story 5.1 (Stripe Setup):**
- `StripeProvider` wraps children in `<Elements stripe={getStripeClient()} options={options}>`.
- The `options` object includes `clientSecret`, `appearance` (theme), and `locale: 'pt-BR'`.
- `appearance` uses CSS custom properties: `hsl(var(--primary))`, `hsl(var(--background))`, `hsl(var(--foreground))`.
- `borderRadius: '8px'` and `fontFamily: 'inherit'` for consistency with design system.

### Git Intelligence

Recent commits:
- `feat(epic-5): implement story 5-3-paywall-ui`
- `feat(epic-5): implement story 5-2-payment-intent-creation`
- `feat(epic-5): implement story 5-1-stripe-setup-and-configuration`

Suggested commit message: `feat(epic-5): implement story 5-4-payment-processing-and-unlock`

### Critical Guardrails

- **DO NOT** send real consultation data (recommendations, tips, grooming) to the client before the webhook confirms payment server-side (Story 5.5). The paid state shows a PLACEHOLDER, not actual results.
- **DO NOT** reset the consultation store on payment failure. The user's photo, questionnaire, and face shape data must persist.
- **DO NOT** change `paymentStatus` to `'failed'` on payment decline. Keep it as `'pending'` so the user can retry with the same PaymentIntent. Only set `'failed'` if the PaymentIntent itself is cancelled.
- **DO NOT** implement a full-page redirect after payment. Use `redirect: 'if_required'` to keep the user on the same page.
- **DO NOT** create a "thank you" page. The paywall dissolves in-place per UX design spec. [Source: ux-design.md#11.3]
- **DO NOT** import `stripe` (server SDK) in any client component. Only use `@stripe/react-stripe-js` hooks (`useStripe`, `useElements`) on the client.
- **DO NOT** modify `src/types/index.ts` -- types are frozen.
- **DO NOT** modify `src/lib/stripe/server.ts` -- server-side only.
- **DO NOT** create the full results display (recommendation cards, grooming tips, etc.) -- that is Epic 6.
- **DO** use `PaymentElement` from `@stripe/react-stripe-js` for card input (NOT custom card fields).
- **DO** use `ExpressCheckoutElement` from `@stripe/react-stripe-js` for Apple Pay / Google Pay (NOT the legacy `PaymentRequestButtonElement`).
- **DO** handle `prefers-reduced-motion` -- skip blur/stagger animations when reduced motion is preferred.
- **DO** use `role="alert"` on error messages for screen reader accessibility.
- **DO** follow the dual theme system -- payment form should work in both male (dark) and female (light) themes. The `StripeProvider` appearance already uses CSS custom properties for theming.
- **DO** run `npm test` before considering done -- all 965 existing + new tests must pass.

### Testing Requirements

**PaymentForm component tests (`src/test/payment-form.test.tsx`):**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock @stripe/react-stripe-js
const mockConfirmPayment = vi.fn();
const mockUseStripe = vi.fn(() => ({
  confirmPayment: mockConfirmPayment,
}));
const mockUseElements = vi.fn(() => ({}));

vi.mock('@stripe/react-stripe-js', () => ({
  PaymentElement: (props: any) => <div data-testid="payment-element" {...props} />,
  ExpressCheckoutElement: ({ onConfirm, ...props }: any) => (
    <div data-testid="express-checkout-element" onClick={() => onConfirm?.({})} {...props} />
  ),
  useStripe: () => mockUseStripe(),
  useElements: () => mockUseElements(),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useReducedMotion: () => false,
}));

describe('PaymentForm', () => {
  it('renders PaymentElement for card input', () => {
    // Verify data-testid="payment-element" exists
  });

  it('renders ExpressCheckoutElement for Apple Pay / Google Pay', () => {
    // Verify data-testid="express-checkout-element" exists
  });

  it('renders "Pagar" submit button', () => {
    // Verify submit button text
  });

  it('calls stripe.confirmPayment on form submit', async () => {
    mockConfirmPayment.mockResolvedValueOnce({ error: null });
    // Submit form, verify confirmPayment called
  });

  it('calls onPaymentSuccess on successful payment', async () => {
    mockConfirmPayment.mockResolvedValueOnce({ error: null });
    // Verify onPaymentSuccess callback
  });

  it('calls onPaymentError with message on payment failure', async () => {
    mockConfirmPayment.mockResolvedValueOnce({
      error: { message: 'Card declined' },
    });
    // Verify onPaymentError called with 'Card declined'
  });

  it('disables submit button while processing', async () => {
    // Verify button disabled and shows "A processar..." during confirmation
  });

  it('disables submit when stripe is not loaded', () => {
    mockUseStripe.mockReturnValueOnce(null);
    // Verify button disabled
  });
});
```

**Payment transition tests (`src/test/payment-transition.test.tsx`):**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'test-uuid-123' }),
  useRouter: () => ({ replace: vi.fn() }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useReducedMotion: () => false,
}));

// Mock consultation store
const mockStore = {
  consultationId: 'test-uuid-123',
  faceAnalysis: { /* valid face analysis */ },
  paymentStatus: 'none' as const,
  setPaymentStatus: vi.fn(),
};

describe('Results page payment transition', () => {
  it('renders Paywall when paymentStatus is not paid', () => {
    // Verify Paywall component rendered
  });

  it('renders paid placeholder when paymentStatus is paid', () => {
    mockStore.paymentStatus = 'paid';
    // Verify "Consultoria completa desbloqueada!" text
  });

  it('transitions from paywall to paid state', () => {
    // Simulate paymentStatus change, verify transition
  });
});
```

**Updated paywall tests (`src/test/paywall.test.tsx`):**

```typescript
// Add these tests to existing paywall test suite:
it('renders PaymentForm when clientSecret is available', () => {
  // Render with clientSecret, verify PaymentForm is rendered
});

it('does NOT render PaymentForm when clientSecret is null', () => {
  // Render without clientSecret, verify unlock button is shown instead
});
```

### Environment Variables Required

| Variable | Side | Required By | Purpose |
|----------|------|-------------|---------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client-safe | `StripeProvider` (via `getStripeClient()`) | Initializes Stripe.js for Payment Element |
| `STRIPE_SECRET_KEY` | Server only | `create-intent` route (existing) | Creates PaymentIntents |

No new environment variables needed -- all required variables were added in Story 5.1.

### Stripe API Notes

**`@stripe/react-stripe-js` v5.6.0 components used:**
- `PaymentElement`: Renders a dynamic payment form that accepts cards, bank transfers, etc. Automatically adapts to the Payment Intent's allowed payment methods. Configure with `automatic_payment_methods: { enabled: true }` on the PaymentIntent (already done in Story 5.2).
- `ExpressCheckoutElement`: Renders Apple Pay / Google Pay buttons. Replaces the legacy `PaymentRequestButtonElement`. Only renders if the user's browser/device supports a wallet payment method.
- `useStripe()`: Returns the Stripe instance. Returns `null` while Stripe.js is loading.
- `useElements()`: Returns the Elements instance for passing to `stripe.confirmPayment()`.

**`stripe.confirmPayment()` options:**
- `elements`: Required. Pass the Elements instance from `useElements()`.
- `confirmParams.return_url`: Required. Used for redirect-based payment methods (3D Secure, bank redirects). Set to current page URL.
- `redirect: 'if_required'`: Prevents automatic redirect for card payments that don't need 3D Secure. The function resolves with `{ error }` or `{ paymentIntent }` instead.

### References

- [Source: epics-and-stories.md#S5.4] -- ACs: Payment Element, paywall dissolve (blur to clear 500ms), staggered results reveal, consultation generation on webhook, inline error on failure, data never lost
- [Source: ux-design.md#11.1 Paywall Placement] -- Paywall between free face shape and full consultation
- [Source: ux-design.md#11.2 Paywall Screen] -- Layout with Apple Pay / Google Pay primary, card secondary
- [Source: ux-design.md#11.3 Payment Success] -- No redirect. Paywall dissolves (blur to clear, 500ms). Staggered animation. Subtle confetti optional.
- [Source: ux-design.md#11.4 Payment Failure] -- Inline error "Pagamento nao processado. Tente outro metodo." Retry visible. Data never lost.
- [Source: ux-design.md#11.6 Motion] -- Results reveal: staggered 150ms per element
- [Source: architecture.md#5.2 Payment] -- POST /api/payment/create-intent, webhook/stripe
- [Source: architecture.md#6.1 Project Structure] -- PaymentForm.tsx in components/payment/
- [Source: architecture.md#6.2 State Management] -- paymentStatus transitions in Zustand store
- [Source: architecture.md#7.4 Payment Security] -- Server verifies via webhook, client confirmation is optimistic
- [Source: architecture.md#8.1 Loading Strategy] -- Stripe.js lazy-loaded on paywall
- [Source: 5-1-stripe-setup-and-configuration.md] -- StripeProvider, getStripeClient(), locale pt-BR, apiVersion pinned
- [Source: 5-2-payment-intent-creation.md] -- create-intent API, automatic_payment_methods enabled
- [Source: 5-3-paywall-ui.md] -- Paywall component, usePayment hook, results page route, 965 test baseline
- [Source: prd.md#Business & Monetization Model] -- EUR 5.99 first, EUR 2.99 repeat, auto-refund on AI failure

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No debug issues encountered. All tasks completed cleanly on first attempt.

### Completion Notes List

- Task 1 (PaymentForm): Created `src/components/payment/PaymentForm.tsx` with `ExpressCheckoutElement` (primary) and `PaymentElement` (secondary/card). Uses `useStripe()` and `useElements()`. Handles payment via `stripe.confirmPayment()` with `redirect: 'if_required'`. Shows "A processar..." and disables button while processing. Calls `onPaymentSuccess()` on success, `onPaymentError(message)` on failure with Portuguese fallback message.

- Task 2 (Paywall update): Updated `src/components/consultation/Paywall.tsx` to replace placeholder buttons with `<PaymentForm>` inside `<StripeProvider>`. Added `onPaymentSuccess` prop to `PaywallProps`. Added `internalPaymentError` state so card payment errors from `PaymentForm.onPaymentError` display inline. Pre-intent unlock button unchanged.

- Task 3 & 4 (Animation + Results page): Updated `src/app/consultation/results/[id]/page.tsx` with `AnimatePresence mode="wait"` wrapper. Paywall has `exit={{ filter: 'blur(20px)', opacity: 0 }}` (500ms). Paid results use `PaidResultsPlaceholder` with `staggerChildren: 0.15` (150ms per element). `useReducedMotion()` disables all animations. `PaywallWrapper` now accepts and passes `onPaymentSuccess` callback that calls `setPaymentStatus('paid')`.

- Task 5 (usePayment hook): Extended `src/hooks/usePayment.ts` with `confirmPayment(stripe, elements)` function. Returns `{ success: boolean, error: string | null }`. On success: calls `setPaymentStatus('paid')`. On failure: sets error in local state, keeps `paymentStatus` as `'pending'` for retry. Handles null stripe/elements edge cases.

- Task 6 (Tests): Created 13 tests in `payment-form.test.tsx`, 9 tests in `payment-transition.test.tsx`. Updated `paywall.test.tsx` (added PaymentForm mock, added 1 new test, updated 1 test). Added 7 tests to `use-payment.test.ts`. Total: 994 tests passing (965 baseline + 29 new).

- All ACs satisfied: PaymentForm with Express+Card (AC1, AC6), confirmPayment flow (AC2), paywall dissolve animation 500ms (AC3), staggered reveal 150ms/element (AC4), inline error with retry (AC5), primary/secondary CTA order (AC6), Paywall uses PaymentForm (AC7), results page transition (AC8), usePayment.confirmPayment (AC9), paymentStatus persisted in Zustand (AC10), guest users supported (AC11), comprehensive tests (AC12).

### File List

src/components/payment/PaymentForm.tsx (NEW)
src/components/consultation/Paywall.tsx (MODIFIED)
src/app/consultation/results/[id]/page.tsx (MODIFIED)
src/hooks/usePayment.ts (MODIFIED)
src/test/payment-form.test.tsx (NEW)
src/test/payment-transition.test.tsx (NEW)
src/test/paywall.test.tsx (MODIFIED)
src/test/use-payment.test.ts (MODIFIED)
_bmad-output/implementation-artifacts/5-4-payment-processing-and-unlock.md (MODIFIED)
_bmad-output/implementation-artifacts/sprint-status.yaml (MODIFIED)

### Senior Developer Review (AI)

**Reviewer:** Fusuma (AI Code Review) — 2026-03-02

**Review Outcome:** APPROVED WITH FIXES APPLIED

**Git vs Story File List:** 0 discrepancies — all 10 files in story File List matched git diff HEAD~1 exactly.

**Issues Found and Fixed (4 total):**

**HIGH - Fixed: Missing diacritics in user-visible error messages (AC 5 violation)**
- UX spec (ux-design.md#11.4) requires: "Pagamento **não** processado. Tente outro **método**."
- Code had: "Pagamento nao processado. Tente outro metodo." (3 occurrences in `usePayment.ts`, 1 in `PaymentForm.tsx`)
- Fixed: All occurrences corrected to proper Portuguese with diacritics in source + test files.

**HIGH - Fixed: Exit animation duration not scoped correctly (AC 3 violation)**
- In `results/[id]/page.tsx`, `paywallExitVariants` spread `transition: { duration: 0.5 }` as a top-level peer of `exit`. In Framer Motion, a top-level `transition` prop controls `initial→animate` transitions, NOT exit animations. The exit animation was using Framer Motion's default 0.3s, not the specified 500ms.
- Fixed: Moved `transition: { duration: 0.5 }` inside the `exit` object: `exit: { filter: 'blur(20px)', opacity: 0, transition: { duration: 0.5 } }`.

**MEDIUM - Fixed: `isProcessing` not reset before `onPaymentSuccess()` callback in PaymentForm**
- On the success path, `onPaymentSuccess()` was called with `isProcessing` still `true`. If parent re-renders with animation delay, the submit button could briefly show "A processar..." incorrectly.
- Fixed: Added `setIsProcessing(false)` before `onPaymentSuccess()` call.

**MEDIUM - Fixed: `internalPaymentError` never cleared on retry in Paywall**
- After a payment failure, `internalPaymentError` persisted as stale state when the user retried payment. The error message would remain visible during the next payment attempt until a new error (or success) replaced it.
- Fixed: Added `onPaymentStart` optional prop to `PaymentForm`. Paywall passes `onPaymentStart={() => setInternalPaymentError(null)}` so the stale error is cleared when a new attempt begins.

**LOW - Fixed: Missing diacritic in placeholder text**
- `"disponiveis"` should be `"disponíveis"` in `PaidResultsPlaceholder` (results page).
- Fixed: Corrected to `"disponíveis"`.

**All Acceptance Criteria verified as IMPLEMENTED:**
AC1 (PaymentForm renders both Elements), AC2 (confirmPayment flow + store update), AC3 (paywall blur dissolve 500ms — fixed), AC4 (staggered 150ms reveal), AC5 (inline error with role=alert — fixed diacritics), AC6 (ExpressCheckout primary, Card secondary), AC7 (Paywall uses PaymentForm), AC8 (results page transition), AC9 (usePayment.confirmPayment), AC10 (paymentStatus in Zustand), AC11 (guest-only payment, no auth required), AC12 (994 tests passing).

**Test Suite:** 994/994 passing after fixes.

### Change Log

- feat(epic-5): implement story 5-4-payment-processing-and-unlock (Date: 2026-03-02)
  - Created PaymentForm component with Stripe PaymentElement + ExpressCheckoutElement
  - Updated Paywall to render PaymentForm inside StripeProvider
  - Added AnimatePresence paywall dissolve animation (500ms blur-to-clear) and staggered results reveal (150ms/element)
  - Extended usePayment hook with confirmPayment function
  - Added 29 new tests across 4 test files (994 total, all passing)
- review(epic-5): code review story 5-4-payment-processing-and-unlock (Date: 2026-03-02)
  - Fixed: Portuguese diacritics in error messages (PaymentForm.tsx, usePayment.ts, test files)
  - Fixed: Framer Motion exit animation duration now correctly scoped inside exit object (results page)
  - Fixed: isProcessing reset before onPaymentSuccess() callback to prevent stale button state
  - Fixed: Added onPaymentStart prop to PaymentForm; Paywall clears internalPaymentError on retry
  - Fixed: "disponiveis" → "disponíveis" in PaidResultsPlaceholder
  - Status: review → done
