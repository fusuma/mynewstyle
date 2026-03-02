# Story 5.1: Stripe Setup and Configuration

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want Stripe configured for EUR payments with Apple Pay and Google Pay,
so that the payment infrastructure is ready for the paywall integration in subsequent stories.

## Acceptance Criteria

1. Stripe server-side SDK (`stripe` npm package) is installed and configured with a singleton client exported from `src/lib/stripe/server.ts`, using `STRIPE_SECRET_KEY` environment variable (server-side only, never exposed to client bundle).
2. Stripe client-side SDK (`@stripe/stripe-js` and `@stripe/react-stripe-js` npm packages) is installed. A lazy-loaded Stripe instance is exported from `src/lib/stripe/client.ts` using `loadStripe(NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)`.
3. API keys are configured as environment variables: `STRIPE_SECRET_KEY` (server-side only), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (client-safe), `STRIPE_WEBHOOK_SECRET` (server-side only for future webhook verification). All three are added to `.env.example` with descriptive comments.
4. Stripe.js is NOT loaded on any page until the paywall screen — the `loadStripe()` call is deferred (lazy-loaded) so that Stripe.js bundle is only fetched when the payment component mounts.
5. Apple Pay and Google Pay are enabled via Stripe's Payment Element / Express Checkout Element configuration — no separate Payment Request API integration needed. Stripe Dashboard must have Apple Pay and Google Pay enabled for the account (documented in dev notes as a manual step).
6. Test mode keys are used for development (`sk_test_*`, `pk_test_*`); live keys for production (`sk_live_*`, `pk_live_*`). The code must NOT hardcode any keys — all from environment variables.
7. A `StripeProvider` wrapper component is created at `src/components/payment/StripeProvider.tsx` that wraps children in `<Elements>` from `@stripe/react-stripe-js` with EUR currency configuration and appearance theme matching the app's design system.
8. All new files have corresponding unit tests. Tests verify: singleton pattern for server client, lazy-loading behavior for client, provider component renders without errors, environment variable validation.

## Tasks / Subtasks

- [x] Task 1: Install Stripe dependencies (AC: 1, 2)
  - [x] Run `npm install stripe @stripe/stripe-js @stripe/react-stripe-js`
  - [x] Verify packages added to `package.json` dependencies

- [x] Task 2: Create `src/lib/stripe/server.ts` — server-side Stripe client (AC: 1, 6)
  - [x] Export `getStripeServer()` function that returns a singleton `Stripe` instance
  - [x] Use `new Stripe(process.env.STRIPE_SECRET_KEY!)` with explicit API version
  - [x] Validate `STRIPE_SECRET_KEY` exists at runtime — throw descriptive error if missing
  - [x] Add TypeScript types for the exported function

- [x] Task 3: Create `src/lib/stripe/client.ts` — client-side Stripe loader (AC: 2, 4)
  - [x] Export `getStripeClient()` function that returns `Promise<Stripe | null>` via `loadStripe()`
  - [x] Use `loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)` — called only once (memoized)
  - [x] Validate `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` exists — return `null` and log warning if missing
  - [x] Ensure lazy-loading: `loadStripe` is NOT called at module import time — only when `getStripeClient()` is invoked

- [x] Task 4: Create `src/lib/stripe/index.ts` — barrel export (AC: 1, 2)
  - [x] Re-export `getStripeServer` from `./server`
  - [x] Re-export `getStripeClient` from `./client`

- [x] Task 5: Update `.env.example` with Stripe environment variables (AC: 3, 6)
  - [x] Add `STRIPE_SECRET_KEY=` with comment: `# Server-side only - Stripe secret key (sk_test_* for dev, sk_live_* for prod)`
  - [x] Add `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=` with comment: `# Client-safe - Stripe publishable key (pk_test_* for dev, pk_live_* for prod)`
  - [x] Add `STRIPE_WEBHOOK_SECRET=` with comment: `# Server-side only - Stripe webhook signing secret (whsec_*) - used in Story 5.5`

- [x] Task 6: Create `src/components/payment/StripeProvider.tsx` (AC: 7, 5)
  - [x] Create a client component (`'use client'`) that wraps children in `<Elements>` provider
  - [x] Accept `clientSecret` prop (required for Payment Element to render)
  - [x] Configure `options.appearance` to match the app's design system (use CSS variables from Tailwind theme)
  - [x] Set `options.locale` to `'pt-BR'` for Brazilian Portuguese labels
  - [x] Enable `wallets` configuration for Apple Pay / Google Pay via Payment Element defaults (automatic when `automatic_payment_methods` is enabled on PaymentIntent)
  - [x] Lazy-load Stripe instance using `getStripeClient()` — do NOT call `loadStripe()` at top level

- [x] Task 7: Write unit tests (AC: 8)
  - [x] Create `src/test/stripe-server.test.ts`: test singleton pattern, env var validation
  - [x] Create `src/test/stripe-client.test.ts`: test lazy-loading, memoization, missing env var handling
  - [x] Create `src/test/stripe-provider.test.tsx`: test component renders, passes options correctly
  - [x] Run full test suite — all existing tests must still pass (893 as of Story 4.8)

## Dev Notes

### Architecture Compliance

- **Project structure follows architecture.md Section 6.1:** `src/lib/stripe/client.ts` and `src/lib/stripe/server.ts` match the defined file tree exactly. [Source: architecture.md#6.1 Project Structure]
- **Barrel export pattern:** Follow the same pattern used in `src/lib/ai/index.ts` and `src/lib/consultation/index.ts`. [Source: 4-8-deterministic-results.md#Architecture Compliance]
- **Server client pattern:** Follow `src/lib/supabase/server.ts` pattern — `createServerSupabaseClient()` exports a factory function. Stripe server client should use a similar `getStripeServer()` pattern but as a **singleton** (Stripe client is stateless, safe to reuse). [Source: src/lib/supabase/server.ts]
- **API keys server-side only:** Architecture mandates all secret keys (AI keys, Stripe secret) are server-side only, never in client bundle. Only `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is client-safe. [Source: architecture.md#7.3 API Security]
- **Lazy-loading Stripe.js:** Architecture Section 8.1 specifies "Stripe.js: Lazy-loaded on paywall." The `loadStripe()` call must be deferred — not at module top level. [Source: architecture.md#8.1 Loading Strategy]
- **Payment security:** "Stripe handles all card data (PCI DSS compliant). Server verifies payment via webhook before unlocking results. Client never sees raw payment credentials." [Source: architecture.md#7.4 Payment Security]
- **`src/types/index.ts` is FROZEN** — Do NOT add any Stripe-related types to this file. Use Stripe's own TypeScript types from the `stripe` and `@stripe/stripe-js` packages. [Source: 4-8-deterministic-results.md#Architecture Compliance]

### Stripe SDK Versions (Latest as of March 2026)

| Package | Version | Purpose |
|---------|---------|---------|
| `stripe` | ^20.4.0 | Server-side Node.js SDK for PaymentIntents, webhooks, refunds |
| `@stripe/stripe-js` | ^8.8.0 | Client-side Stripe.js loader (lazy loadable) |
| `@stripe/react-stripe-js` | ^5.6.0 | React components: `<Elements>`, `<PaymentElement>`, `<ExpressCheckoutElement>` |

### Server Client Implementation (EXACT)

```typescript
// src/lib/stripe/server.ts
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
```

**Note on `apiVersion`:** Stripe recommends pinning to a specific API version. Use the latest stable version available when implementing. Check Stripe Dashboard > Developers > API version for the account's default version.

### Client Loader Implementation (EXACT)

```typescript
// src/lib/stripe/client.ts
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
```

### StripeProvider Component Pattern

```typescript
// src/components/payment/StripeProvider.tsx
'use client';

import { Elements } from '@stripe/react-stripe-js';
import { getStripeClient } from '@/lib/stripe/client';
import type { ReactNode } from 'react';
import type { StripeElementsOptions } from '@stripe/stripe-js';

interface StripeProviderProps {
  clientSecret: string;
  children: ReactNode;
}

export function StripeProvider({ clientSecret, children }: StripeProviderProps) {
  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: 'hsl(var(--primary))',
        colorBackground: 'hsl(var(--background))',
        colorText: 'hsl(var(--foreground))',
        borderRadius: '8px',
        fontFamily: 'inherit',
      },
    },
    locale: 'pt-BR',
  };

  return (
    <Elements stripe={getStripeClient()} options={options}>
      {children}
    </Elements>
  );
}
```

**IMPORTANT:** The `stripe` prop of `<Elements>` accepts a `Promise<Stripe | null>`, which is exactly what `getStripeClient()` returns. React Stripe.js handles the async loading internally.

### Apple Pay / Google Pay Setup

Apple Pay and Google Pay work automatically through Stripe's Payment Element when:
1. `automatic_payment_methods: { enabled: true }` is set on the PaymentIntent (server-side, Story 5.2)
2. Apple Pay / Google Pay are enabled in Stripe Dashboard > Settings > Payment methods
3. The page is served over HTTPS (required for wallet APIs)
4. The user's device/browser supports the wallet

**No additional code is needed in this story** for Apple Pay / Google Pay beyond the standard Payment Element setup. The Express Checkout Element (from `@stripe/react-stripe-js`) will show wallet buttons when available.

**Manual Stripe Dashboard steps (document for deployment):**
- Enable Apple Pay in Dashboard > Settings > Payment methods
- Enable Google Pay in Dashboard > Settings > Payment methods
- For Apple Pay: verify domain in Dashboard > Settings > Payment methods > Apple Pay > Add new domain
- Set default currency to EUR in Dashboard > Settings > Payments > Default currency

### Project Structure Notes

```
src/
├── lib/
│   └── stripe/
│       ├── client.ts              NEW: getStripeClient() — lazy-loaded loadStripe
│       ├── server.ts              NEW: getStripeServer() — singleton Stripe instance
│       └── index.ts               NEW: barrel export
├── components/
│   └── payment/
│       └── StripeProvider.tsx      NEW: <Elements> wrapper with EUR + theme config
├── test/
│   ├── stripe-server.test.ts      NEW: server client tests
│   ├── stripe-client.test.ts      NEW: client loader tests
│   └── stripe-provider.test.tsx   NEW: provider component tests
```

**Files modified:**
- `.env.example` — add 3 Stripe env vars
- `package.json` — 3 new dependencies added by npm install

**Files that must NOT be modified:**
- `src/types/index.ts` — types are frozen; use Stripe's own types
- `src/stores/consultation.ts` — payment fields already exist (`paymentStatus`, `isReturningUser`) for future stories
- Any existing API routes — this story is infrastructure-only, no API routes created

### Library & Framework Requirements

| Library | Version | Usage in This Story |
|---------|---------|---------------------|
| `stripe` | ^20.4.0 | Server-side: `new Stripe(secretKey, { apiVersion })` |
| `@stripe/stripe-js` | ^8.8.0 | Client-side: `loadStripe(publishableKey)` |
| `@stripe/react-stripe-js` | ^5.6.0 | React: `<Elements>` provider, future `<PaymentElement>` |
| `vitest` | already installed | test runner |
| `@testing-library/react` | already installed | component testing for StripeProvider |

**3 NEW DEPENDENCIES** — `stripe`, `@stripe/stripe-js`, `@stripe/react-stripe-js`.

### Cross-Story Dependencies

- **Epic 4 (AI Pipeline) -- DONE:** All 8 stories complete. Payment sits between the free face analysis (Step 1) and paid consultation generation (Step 2). The `consultations` table already has `payment_status` and `payment_intent_id` columns. [Source: architecture.md#3.1 Data Model]
- **Story 5.1 (THIS STORY):** Infrastructure only -- installs packages, creates client/server modules, provider component. No API routes, no database changes.
- **Story 5.2 (Payment Intent Creation) -- NEXT:** Will use `getStripeServer()` from this story to create PaymentIntents with `automatic_payment_methods: { enabled: true }` and EUR pricing.
- **Story 5.3 (Paywall UI) -- FUTURE:** Will use `StripeProvider` from this story to wrap the paywall page. Will use `<PaymentElement>` and `<ExpressCheckoutElement>` inside the provider.
- **Story 5.4 (Payment Processing & Unlock) -- FUTURE:** Will use `<PaymentElement>` for card input and `stripe.confirmPayment()` for processing.
- **Story 5.5 (Stripe Webhook Handler) -- FUTURE:** Will use `getStripeServer()` and `STRIPE_WEBHOOK_SECRET` for webhook signature verification.
- **Story 5.6 (Receipt & Refund) -- FUTURE:** Will use `getStripeServer()` for programmatic refunds.

### Previous Story Intelligence (Story 4.8 -- Deterministic Results)

Key patterns from the last completed story to carry forward:
- **Barrel export pattern:** `src/lib/consultation/index.ts` pattern -- create `src/lib/stripe/index.ts` the same way.
- **Singleton pattern:** The Supabase server client creates a new instance per call; Stripe server client should be a **singleton** (Stripe recommends reusing the client instance).
- **Environment variable validation:** Stripe server module should throw on missing `STRIPE_SECRET_KEY` (fail-fast), similar to how Supabase server client uses `!` assertion but more explicit.
- **Test count baseline:** 893 tests (55+ test files, all passing as of Story 4.8 code review).
- **Commit message pattern:** `feat(epic-5): implement story 5-1-stripe-setup-and-configuration`

### Git Intelligence

Recent commits follow this pattern:
- `feat(epic-4): implement story 4-8-deterministic-results`
- `chore(epic-4): mark epic-4 as done -- all 8 stories complete`

Suggested commit message: `feat(epic-5): implement story 5-1-stripe-setup-and-configuration`

### Critical Guardrails

- **DO NOT** hardcode any Stripe API keys in source code -- all from environment variables.
- **DO NOT** import `stripe` (server SDK) in any client component or file marked with `'use client'`.
- **DO NOT** call `loadStripe()` at module top level -- it must be lazy (called inside a function, memoized).
- **DO NOT** add Stripe types to `src/types/index.ts` -- use types from `stripe` and `@stripe/stripe-js` packages directly.
- **DO NOT** create any API routes in this story -- that is Story 5.2+.
- **DO NOT** modify the consultation store -- `paymentStatus` and `isReturningUser` fields already exist.
- **DO NOT** add any `<script>` tags for Stripe.js -- `@stripe/stripe-js` handles the loading via `loadStripe()`.
- **DO** use `getStripeServer()` as a singleton (not per-request instantiation).
- **DO** validate environment variables at runtime with descriptive error messages.
- **DO** set an explicit `apiVersion` when creating the Stripe server instance.
- **DO** configure the Elements provider with `locale: 'pt-BR'` for Brazilian Portuguese.
- **DO** run `npm test` before considering done -- all 893 existing + new tests must pass.

### Environment Variables Required

| Variable | Side | Example Value | Purpose |
|----------|------|---------------|---------|
| `STRIPE_SECRET_KEY` | Server only | `sk_test_...` | Stripe server SDK authentication |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client-safe | `pk_test_...` | Stripe.js client initialization |
| `STRIPE_WEBHOOK_SECRET` | Server only | `whsec_...` | Webhook signature verification (Story 5.5) |

### Testing Requirements

**Server client tests (`src/test/stripe-server.test.ts`):**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the stripe module
vi.mock('stripe', () => {
  const MockStripe = vi.fn().mockImplementation(() => ({
    paymentIntents: {},
    webhooks: {},
  }));
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
```

**Client loader tests (`src/test/stripe-client.test.ts`):**

```typescript
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
```

**Provider component tests (`src/test/stripe-provider.test.tsx`):**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

// Mock @stripe/react-stripe-js
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div data-testid="stripe-elements">{children}</div>,
}));

// Mock the stripe client
vi.mock('@/lib/stripe/client', () => ({
  getStripeClient: vi.fn().mockResolvedValue(null),
}));

describe('StripeProvider', () => {
  it('renders children inside Elements wrapper', async () => {
    const { StripeProvider } = await import('../components/payment/StripeProvider');
    const { getByText, getByTestId } = render(
      <StripeProvider clientSecret="pi_test_secret">
        <div>Payment Form</div>
      </StripeProvider>
    );
    expect(getByTestId('stripe-elements')).toBeDefined();
    expect(getByText('Payment Form')).toBeDefined();
  });
});
```

### References

- [Source: epics-and-stories.md#S5.1] -- ACs: Stripe account for EUR, API keys in env vars, Stripe.js lazy-loaded, Apple Pay/Google Pay via Payment Request API, test/live mode
- [Source: architecture.md#2.1 Frontend] -- Payments: Stripe.js + Elements, PCI compliant, Apple Pay/Google Pay built-in
- [Source: architecture.md#2.2 Backend] -- Payments: Stripe, one-time payments, webhooks, Apple/Google Pay
- [Source: architecture.md#5.2 Payment] -- POST /api/payment/create-intent, POST /api/webhook/stripe
- [Source: architecture.md#6.1 Project Structure] -- src/lib/stripe/client.ts, src/lib/stripe/webhooks.ts, src/hooks/usePayment.ts, src/components/consultation/Paywall.tsx
- [Source: architecture.md#7.3 API Security] -- API keys server-side only, never in client bundle; Stripe publishable key is the ONLY client-side secret
- [Source: architecture.md#7.4 Payment Security] -- Stripe handles PCI; server verifies via webhook; refund automation
- [Source: architecture.md#8.1 Loading Strategy] -- Stripe.js lazy-loaded on paywall
- [Source: 4-8-deterministic-results.md#Architecture Compliance] -- barrel export pattern, frozen types/index.ts
- [Source: src/lib/supabase/server.ts] -- server client factory pattern to follow
- [Source: src/stores/consultation.ts:24-26] -- paymentStatus and isReturningUser fields already exist

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Stripe mock in vitest required a proper constructor function (not `vi.fn().mockImplementation()`) to support `new Stripe(...)` syntax — fixed by using a named function with `MockStripe.prototype = {}`.
- The Elements spy test in stripe-provider.test.tsx was simplified since `vi.mocked()` on a non-spy raises TypeError — replaced with DOM-based assertions that verify the mock renders correctly.

### Completion Notes List

- Installed `stripe@^20.4.0`, `@stripe/stripe-js@^8.8.0`, `@stripe/react-stripe-js@^5.6.0` (3 new dependencies, 0 vulnerabilities).
- Created `src/lib/stripe/server.ts` with singleton `getStripeServer()` — throws descriptive error on missing `STRIPE_SECRET_KEY`, pins `apiVersion: '2026-02-25.clover'` (stripe@20.4.0 latest).
- Created `src/lib/stripe/client.ts` with lazy-loaded `getStripeClient()` — memoized promise, warns and returns null if `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is missing.
- Created `src/lib/stripe/index.ts` barrel export following the pattern from `src/lib/consultation/index.ts` and `src/lib/ai/index.ts`.
- Updated `.env.example` with 3 Stripe env vars and descriptive comments.
- Created `src/components/payment/StripeProvider.tsx` — `'use client'` component wrapping `<Elements>` with `locale: 'pt-BR'`, Tailwind CSS variable appearance theme, and lazy-loaded Stripe instance via `getStripeClient()`.
- Wrote 8 unit tests across 3 test files covering: singleton pattern, env var validation, lazy-loading, memoization, missing key handling, and component render.
- Full test suite result: **901 tests pass** (893 pre-existing + 8 new), 0 failures, 0 regressions.
- **Code review fixes (2026-03-02):** Fixed apiVersion `'2025-12-18.acacia'` → `'2026-02-25.clover'` (was non-existent, caused TypeScript compile error). Fixed `getStripeClient()` memoization bug for missing-key path — now sets `stripePromise` instead of returning early, preventing repeated console.warn calls. Added `useMemo` to `StripeProvider` options to prevent unnecessary `<Elements>` re-mounts on re-render. Added JSDoc to `StripeProvider`. Improved `stripe-provider.test.tsx` to capture and assert on `options` prop (clientSecret, locale, appearance). Added missing-key memoization test to `stripe-client.test.ts`. Final test suite: **903 tests pass** (2 additional tests from review).

### File List

- `src/lib/stripe/server.ts` (NEW)
- `src/lib/stripe/client.ts` (NEW)
- `src/lib/stripe/index.ts` (NEW)
- `src/components/payment/StripeProvider.tsx` (NEW)
- `src/test/stripe-server.test.ts` (NEW)
- `src/test/stripe-client.test.ts` (NEW)
- `src/test/stripe-provider.test.tsx` (NEW)
- `.env.example` (MODIFIED — added 3 Stripe env vars)
- `package.json` (MODIFIED — 3 new Stripe dependencies)
- `package-lock.json` (MODIFIED — lockfile updated)

## Change Log

- 2026-03-02: Implemented Story 5.1 — Stripe Setup and Configuration. Installed 3 Stripe packages, created server/client/index lib modules, StripeProvider component, 3 test files. All 901 tests pass.
- 2026-03-02: Code review (claude-sonnet-4-6) — fixed 5 issues: (1) apiVersion wrong/non-existent `2025-12-18.acacia` → `2026-02-25.clover` (TypeScript error); (2) getStripeClient() memoization bug in missing-key path; (3) StripeProvider options useMemo for stable references; (4) StripeProvider JSDoc added; (5) test assertions improved with options capture and memoization edge case. 903 tests pass.
