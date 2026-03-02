# Story 5.2: Payment Intent Creation

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want to create a payment intent API endpoint with correct pricing based on user history,
so that the frontend can collect payment using Stripe Elements with the correct amount.

## Acceptance Criteria

1. A `POST /api/payment/create-intent` API route exists at `src/app/api/payment/create-intent/route.ts` that creates a Stripe PaymentIntent and returns the `clientSecret` to the frontend.
2. First-time consultation pricing is EUR 5.99 (599 cents). Returning users (users who have at least one previous paid consultation) pay EUR 2.99 (299 cents).
3. Guest users (no authenticated user) always pay EUR 5.99 (599 cents) since their payment history cannot be verified without an account.
4. The endpoint accepts `{ consultationId, type?: 'first' | 'repeat' }` in the request body. If `type` is not provided, the server determines pricing by checking consultation history.
5. The PaymentIntent is created with `automatic_payment_methods: { enabled: true }` to support Apple Pay, Google Pay, and card payments through Stripe Payment Element.
6. The PaymentIntent `metadata` includes `consultationId` and `userType` ('guest' | 'returning' | 'first') for webhook reconciliation in Story 5.5.
7. The consultation record's `payment_intent_id` field is updated with the created PaymentIntent ID, and `payment_status` is set to `'pending'`.
8. Input validation uses Zod: `consultationId` must be a valid UUID, `type` is optional enum. Invalid input returns 400 with descriptive error.
9. If the consultation does not exist or does not belong to the requesting user/guest session, return 404.
10. All new files have corresponding unit tests. Tests verify: pricing logic, guest vs returning detection, Zod validation, error handling, PaymentIntent creation parameters, and consultation record update.

## Tasks / Subtasks

- [x] Task 1: Create Zod request schema and types (AC: 8)
  - [x] Define `CreatePaymentIntentSchema` with `consultationId` (uuid string) and optional `type` ('first' | 'repeat')
  - [x] Define response type: `{ clientSecret: string; amount: number; currency: string; userType: string }`

- [x] Task 2: Create pricing utility `src/lib/stripe/pricing.ts` (AC: 2, 3)
  - [x] Export constants: `FIRST_CONSULTATION_PRICE = 599` and `RETURNING_CONSULTATION_PRICE = 299` (cents)
  - [x] Export `CURRENCY = 'eur'`
  - [x] Export `determinePrice(hasPreviousPaidConsultation: boolean): { amount: number; userType: 'first' | 'returning' }`
  - [x] Guest users always resolve to `'first'` pricing

- [x] Task 3: Create `POST /api/payment/create-intent` route (AC: 1, 4, 5, 6, 7, 9)
  - [x] Create `src/app/api/payment/create-intent/route.ts`
  - [x] Parse and validate request body with Zod schema
  - [x] Look up consultation by ID (in-memory map, same pattern as `/api/consultation/start`)
  - [x] Verify consultation belongs to requesting user/guest (check `guest_session_id` from header or cookie)
  - [x] Determine pricing: check if user has previous paid consultations, apply first/returning logic
  - [x] Create PaymentIntent via `getStripeServer().paymentIntents.create({ amount, currency: 'eur', automatic_payment_methods: { enabled: true }, metadata: { consultationId, userType } })`
  - [x] Update consultation record: set `payment_intent_id` and `payment_status = 'pending'`
  - [x] Return `{ clientSecret: paymentIntent.client_secret, amount, currency: 'eur', userType }`

- [x] Task 4: Update barrel export (AC: 1)
  - [x] Add `pricing.ts` exports to `src/lib/stripe/index.ts`

- [x] Task 5: Write unit tests (AC: 10)
  - [x] Create `src/test/payment-create-intent.test.ts`: API route tests (mock Stripe, mock consultations)
  - [x] Create `src/test/stripe-pricing.test.ts`: pricing utility tests
  - [x] Test cases: first-time pricing (599), returning pricing (299), guest pricing (599), invalid consultationId, missing consultation, Zod validation errors, PaymentIntent metadata correctness
  - [x] Run full test suite -- all 903 existing + new tests must pass

## Dev Notes

### Architecture Compliance

- **API route pattern follows architecture.md Section 5.2:** `POST /api/payment/create-intent` returns `{ clientSecret, amount }`. The architecture specifies Body: `{ consultationId, type: 'first' | 'repeat' }` and Returns: `{ clientSecret, amount }`. [Source: architecture.md#5.2 Payment]
- **Follow existing API route pattern from `/api/consultation/start/route.ts`:** Use `NextRequest`/`NextResponse` from `next/server`, Zod schema validation, try/catch with structured error responses (400 for validation, 404 for not found, 500 for server errors). [Source: src/app/api/consultation/start/route.ts]
- **Use `getStripeServer()` singleton from Story 5.1:** Import from `@/lib/stripe/server` (or `@/lib/stripe`). Do NOT create a new Stripe instance. [Source: src/lib/stripe/server.ts]
- **Payment security architecture:** "Server verifies payment via webhook before unlocking results. Client never sees raw payment credentials." The `client_secret` returned by PaymentIntent is safe for client use -- it allows confirmation but not capture. [Source: architecture.md#7.4 Payment Security]
- **`src/types/index.ts` is FROZEN:** Do NOT add any payment-related types to this file. Define types locally in the API route file or in `src/lib/stripe/pricing.ts`. [Source: 5-1-stripe-setup-and-configuration.md#Architecture Compliance]
- **In-memory storage (current pattern):** The `/api/consultation/start` route uses an in-memory `Map<string, ConsultationRecord>` for consultation storage. This story must follow the same pattern -- import and use the same map. Supabase DB integration is deferred. [Source: src/app/api/consultation/start/route.ts:21]
- **Consultation record has payment fields:** The `consultations` table schema includes `payment_status` (free/pending/paid/refunded) and `payment_intent_id` (Stripe). These fields must be set when creating the PaymentIntent. [Source: architecture.md#3.1 Data Model]

### Stripe PaymentIntent Creation (EXACT Implementation)

```typescript
// Inside the API route handler
import { getStripeServer } from '@/lib/stripe/server';
import { FIRST_CONSULTATION_PRICE, RETURNING_CONSULTATION_PRICE, CURRENCY } from '@/lib/stripe/pricing';

const stripe = getStripeServer();

const paymentIntent = await stripe.paymentIntents.create({
  amount: price,          // 599 or 299 (cents)
  currency: CURRENCY,     // 'eur'
  automatic_payment_methods: {
    enabled: true,        // Enables card, Apple Pay, Google Pay, etc.
  },
  metadata: {
    consultationId: consultationId,
    userType: userType,   // 'first' | 'returning' | 'guest'
  },
});

// Return to client
return NextResponse.json({
  clientSecret: paymentIntent.client_secret,
  amount: price,
  currency: CURRENCY,
  userType: userType,
});
```

**Key Stripe parameters:**
- `automatic_payment_methods: { enabled: true }` -- required for Payment Element to show all available payment methods including Apple Pay and Google Pay (set up in Story 5.1 StripeProvider).
- `metadata` -- critical for Story 5.5 webhook handler to match PaymentIntent to consultation record.
- `currency: 'eur'` -- must match the locale configured in StripeProvider (`pt-BR` locale, EUR currency).

### Pricing Logic (EXACT Implementation)

```typescript
// src/lib/stripe/pricing.ts

/** First consultation price in EUR cents */
export const FIRST_CONSULTATION_PRICE = 599;

/** Returning user consultation price in EUR cents */
export const RETURNING_CONSULTATION_PRICE = 299;

/** Payment currency (EUR) */
export const CURRENCY = 'eur' as const;

export type UserPricingType = 'first' | 'returning' | 'guest';

export interface PricingResult {
  amount: number;
  userType: UserPricingType;
}

/**
 * Determines the consultation price based on user history.
 * - First-time users or guests: EUR 5.99 (599 cents)
 * - Returning users with previous paid consultation: EUR 2.99 (299 cents)
 */
export function determinePrice(
  isGuest: boolean,
  hasPreviousPaidConsultation: boolean
): PricingResult {
  if (isGuest) {
    return { amount: FIRST_CONSULTATION_PRICE, userType: 'guest' };
  }
  if (hasPreviousPaidConsultation) {
    return { amount: RETURNING_CONSULTATION_PRICE, userType: 'returning' };
  }
  return { amount: FIRST_CONSULTATION_PRICE, userType: 'first' };
}
```

### Request/Response Schema (EXACT Implementation)

```typescript
// Inside src/app/api/payment/create-intent/route.ts

import { z } from 'zod';

const CreatePaymentIntentSchema = z.object({
  consultationId: z.string().uuid('consultationId must be a valid UUID'),
  type: z.enum(['first', 'repeat']).optional(),
});
```

### Guest Session Detection Pattern

The current codebase does not yet have authentication (Epic 8). For now, ALL users are guests. The pricing logic should:
1. Default `isGuest = true` for all requests in the current state.
2. When auth is added (Epic 8), check `request.headers` for auth token and look up user history.
3. The `type` field in the request body can be used as a client-side override (trusted for now, validated server-side when auth exists).

```typescript
// Temporary guest detection (until Epic 8 auth)
const isGuest = true; // All users are guests until auth is implemented
const hasPreviousPaidConsultation = false; // Cannot verify without auth

// When auth is implemented, this becomes:
// const user = await getAuthUser(request);
// const isGuest = !user;
// const hasPreviousPaidConsultation = user ? await checkPaidHistory(user.id) : false;
```

### ConsultationRecord Extension

The `ConsultationRecord` type in `src/types/index.ts` currently does NOT include `payment_status` or `payment_intent_id` fields. Since `src/types/index.ts` is frozen, the API route should extend the record type locally:

```typescript
// Local type extension in the route file
interface PaymentConsultationFields {
  paymentStatus: 'free' | 'pending' | 'paid' | 'refunded';
  paymentIntentId: string | null;
}

// Use the in-memory map from /api/consultation/start
// The record in the map can have these additional fields added at runtime
```

**IMPORTANT:** The in-memory `consultations` Map from `/api/consultation/start/route.ts` must be importable by this route. If it is not currently exported, the create-intent route must import from the same module. Check if the `consultations` map is exported -- the current code does export it at line 68: `export { consultations };`

### Project Structure Notes

```
src/
├── app/
│   └── api/
│       └── payment/
│           └── create-intent/
│               └── route.ts          NEW: POST handler for PaymentIntent creation
├── lib/
│   └── stripe/
│       ├── client.ts                 EXISTS (Story 5.1)
│       ├── server.ts                 EXISTS (Story 5.1)
│       ├── index.ts                  MODIFIED: add pricing exports
│       └── pricing.ts               NEW: pricing constants and determinePrice()
├── test/
│   ├── payment-create-intent.test.ts NEW: API route tests
│   └── stripe-pricing.test.ts       NEW: pricing utility tests
```

**Files modified:**
- `src/lib/stripe/index.ts` -- add pricing barrel exports

**Files that must NOT be modified:**
- `src/types/index.ts` -- types are frozen
- `src/lib/stripe/server.ts` -- already correct from Story 5.1
- `src/lib/stripe/client.ts` -- not needed for server-side PaymentIntent creation
- `src/stores/consultation.ts` -- store changes deferred to Story 5.3/5.4

### Library & Framework Requirements

| Library | Version | Usage in This Story |
|---------|---------|---------------------|
| `stripe` | ^20.4.0 (installed in 5.1) | `stripe.paymentIntents.create()` |
| `zod` | already installed | Request body validation |
| `next` | already installed | `NextRequest`, `NextResponse` for API route |
| `vitest` | already installed | test runner |

**0 NEW DEPENDENCIES** -- everything needed is already installed from Story 5.1 and prior epics.

### Cross-Story Dependencies

- **Story 5.1 (Stripe Setup) -- DONE:** Provides `getStripeServer()` singleton, `StripeProvider`, lazy-loaded `getStripeClient()`. This story uses `getStripeServer()` to create PaymentIntents. [Source: 5-1-stripe-setup-and-configuration.md]
- **Story 5.2 (THIS STORY):** Creates the `/api/payment/create-intent` endpoint. Returns `clientSecret` for frontend use in Story 5.3.
- **Story 5.3 (Paywall UI) -- NEXT:** Will call `POST /api/payment/create-intent` to get the `clientSecret`, then pass it to `StripeProvider` which wraps `<PaymentElement>`.
- **Story 5.4 (Payment Processing & Unlock) -- FUTURE:** Will use `stripe.confirmPayment()` on the client with the `clientSecret` from this story's endpoint.
- **Story 5.5 (Stripe Webhook Handler) -- FUTURE:** Will match `payment_intent.succeeded` webhook events to consultations using the `metadata.consultationId` set in this story.
- **Story 5.6 (Receipt & Refund) -- FUTURE:** Will use `payment_intent_id` stored in consultation record by this story to issue refunds.
- **Epic 8 (Auth) -- FUTURE:** When auth is implemented, the pricing logic in this story should check user's consultation history for returning user discount. Current implementation defaults all users to guest/first-time pricing.

### Previous Story Intelligence (Story 5.1 -- Stripe Setup and Configuration)

Key patterns and learnings from Story 5.1:
- **apiVersion:** `'2026-02-25.clover'` is the pinned Stripe API version. Do NOT change this.
- **Singleton pattern:** `getStripeServer()` returns a singleton -- safe to call multiple times.
- **Test pattern:** Mock the `stripe` module with `vi.mock('stripe', ...)` and mock the constructor. For PaymentIntent tests, mock `stripe.paymentIntents.create()`.
- **Test count baseline:** 903 tests (all passing as of Story 5.1 code review).
- **Barrel export pattern:** `src/lib/stripe/index.ts` re-exports from `./server` and `./client`. Add `./pricing` exports in the same pattern.
- **Code review fix from 5.1:** apiVersion was initially wrong (`2025-12-18.acacia` does not exist) -- was fixed to `2026-02-25.clover`. Ensure no version strings are guessed.

### Git Intelligence

Recent commits:
- `feat(epic-5): implement story 5-1-stripe-setup-and-configuration`
- `chore(epic-4): mark epic-4 as done -- all 8 stories complete`

Suggested commit message: `feat(epic-5): implement story 5-2-payment-intent-creation`

### Critical Guardrails

- **DO NOT** import `stripe` server SDK in any client component -- `getStripeServer()` is server-side only.
- **DO NOT** hardcode prices -- use the constants from `pricing.ts` (FIRST_CONSULTATION_PRICE, RETURNING_CONSULTATION_PRICE).
- **DO NOT** return the full PaymentIntent object to the client -- only return `client_secret`, `amount`, `currency`, and `userType`.
- **DO NOT** modify `src/types/index.ts` -- define payment types locally.
- **DO NOT** modify the consultation Zustand store -- that is for Story 5.3/5.4.
- **DO NOT** implement webhook handling -- that is Story 5.5.
- **DO NOT** implement the paywall UI -- that is Story 5.3.
- **DO** use `automatic_payment_methods: { enabled: true }` on PaymentIntent (required for Payment Element).
- **DO** set `metadata` with `consultationId` and `userType` (critical for webhook reconciliation).
- **DO** update the consultation record with `payment_intent_id` and `payment_status: 'pending'`.
- **DO** validate input with Zod (consistent with existing API route patterns).
- **DO** handle errors gracefully: 400 for bad input, 404 for missing consultation, 500 for Stripe errors.
- **DO** run `npm test` before considering done -- all 903 existing + new tests must pass.

### Testing Requirements

**Pricing utility tests (`src/test/stripe-pricing.test.ts`):**

```typescript
import { describe, it, expect } from 'vitest';
import {
  determinePrice,
  FIRST_CONSULTATION_PRICE,
  RETURNING_CONSULTATION_PRICE,
  CURRENCY,
} from '@/lib/stripe/pricing';

describe('Pricing Constants', () => {
  it('first consultation price is 599 cents (EUR 5.99)', () => {
    expect(FIRST_CONSULTATION_PRICE).toBe(599);
  });

  it('returning consultation price is 299 cents (EUR 2.99)', () => {
    expect(RETURNING_CONSULTATION_PRICE).toBe(299);
  });

  it('currency is EUR', () => {
    expect(CURRENCY).toBe('eur');
  });
});

describe('determinePrice', () => {
  it('returns first-time price for guests', () => {
    const result = determinePrice(true, false);
    expect(result).toEqual({ amount: 599, userType: 'guest' });
  });

  it('returns first-time price for guests even with paid history flag', () => {
    const result = determinePrice(true, true);
    expect(result).toEqual({ amount: 599, userType: 'guest' });
  });

  it('returns first-time price for authenticated first-time user', () => {
    const result = determinePrice(false, false);
    expect(result).toEqual({ amount: 599, userType: 'first' });
  });

  it('returns returning price for authenticated returning user', () => {
    const result = determinePrice(false, true);
    expect(result).toEqual({ amount: 299, userType: 'returning' });
  });
});
```

**API route tests (`src/test/payment-create-intent.test.ts`):**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock stripe module
const mockCreate = vi.fn().mockResolvedValue({
  id: 'pi_test_123',
  client_secret: 'pi_test_123_secret_abc',
});

vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      paymentIntents: { create: mockCreate },
    })),
  };
});

// Mock consultation start to get access to consultations map
vi.mock('@/app/api/consultation/start/route', () => {
  const map = new Map();
  return { consultations: map, POST: vi.fn() };
});

describe('POST /api/payment/create-intent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for invalid consultationId', async () => {
    // Test with non-UUID consultationId
  });

  it('returns 404 when consultation not found', async () => {
    // Test with valid UUID but no matching consultation
  });

  it('creates PaymentIntent with correct amount for first-time user', async () => {
    // Verify stripe.paymentIntents.create called with amount: 599
  });

  it('sets automatic_payment_methods enabled', async () => {
    // Verify automatic_payment_methods: { enabled: true }
  });

  it('includes consultationId in PaymentIntent metadata', async () => {
    // Verify metadata.consultationId matches input
  });

  it('updates consultation record with payment_intent_id', async () => {
    // Verify consultation record is updated after PaymentIntent creation
  });

  it('returns clientSecret, amount, currency, and userType', async () => {
    // Verify response shape
  });
});
```

### Environment Variables Required

| Variable | Side | Required By | Purpose |
|----------|------|-------------|---------|
| `STRIPE_SECRET_KEY` | Server only | `getStripeServer()` | Creates PaymentIntents via Stripe API |

No new environment variables needed -- all required variables were added in Story 5.1.

### References

- [Source: epics-and-stories.md#S5.2] -- ACs: POST /api/payment/create-intent, first EUR 5.99, returning EUR 2.99, guest always EUR 5.99, returns client_secret
- [Source: architecture.md#5.2 Payment] -- POST /api/payment/create-intent: Body { consultationId, type }, Returns { clientSecret, amount }, pricing logic
- [Source: architecture.md#3.1 Data Model] -- consultations table: payment_status, payment_intent_id fields
- [Source: architecture.md#7.4 Payment Security] -- Server verifies payment via webhook, client never sees raw credentials
- [Source: architecture.md#7.3 API Security] -- Zod schemas on all API inputs, API keys server-side only
- [Source: 5-1-stripe-setup-and-configuration.md] -- getStripeServer() singleton, apiVersion '2026-02-25.clover', 903 test baseline
- [Source: src/app/api/consultation/start/route.ts] -- existing API route pattern (NextRequest/NextResponse, Zod, in-memory Map)
- [Source: src/lib/stripe/server.ts] -- getStripeServer() implementation
- [Source: src/stores/consultation.ts:24-26] -- paymentStatus and isReturningUser fields in Zustand store (for future stories)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Pricing tests (7) passed immediately on first implementation.
- API route tests initially failed due to missing `STRIPE_SECRET_KEY` env var. Fixed by setting `process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_testing'` at the top of the test file before any module imports.
- All 926 tests pass after fix (903 existing + 23 new).

### Completion Notes List

- Implemented `src/lib/stripe/pricing.ts` with `FIRST_CONSULTATION_PRICE = 599`, `RETURNING_CONSULTATION_PRICE = 299`, `CURRENCY = 'eur'`, and `determinePrice(isGuest, hasPreviousPaidConsultation)` function.
- Implemented `POST /api/payment/create-intent` route at `src/app/api/payment/create-intent/route.ts` following the existing consultation/start pattern.
- All users treated as guests (`isGuest = true`) until Epic 8 auth is implemented.
- PaymentIntent created with `automatic_payment_methods: { enabled: true }`, `currency: 'eur'`, and `metadata: { consultationId, userType }`.
- Consultation record updated in-memory with `paymentIntentId` and `paymentStatus: 'pending'`.
- Payment types defined locally (not in frozen `src/types/index.ts`).
- Updated `src/lib/stripe/index.ts` barrel to export pricing utilities.
- 23 new tests created (7 pricing + 16 API route tests). All 926 tests pass.

### File List

- `src/lib/stripe/pricing.ts` - NEW: Pricing constants and determinePrice() utility
- `src/app/api/payment/create-intent/route.ts` - NEW: POST handler for PaymentIntent creation
- `src/lib/stripe/index.ts` - MODIFIED: Added pricing exports to barrel
- `src/test/stripe-pricing.test.ts` - NEW: Unit tests for pricing utility (7 tests)
- `src/test/payment-create-intent.test.ts` - NEW: Unit tests for API route (16 tests)

## Change Log

- 2026-03-02: Implemented Story 5.2 -- Payment Intent Creation. Created pricing utility, API route, barrel export, and comprehensive tests. All 926 tests pass (903 existing + 23 new).
