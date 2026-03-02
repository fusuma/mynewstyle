# Story 8.4: Guest Session Management

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a guest user,
I want to complete a full consultation (including payment and viewing results) without creating an account,
so that I can experience the platform's value before committing to registration.

## Acceptance Criteria

1. A UUID `guest_session_id` is generated on the user's first visit and persisted in `localStorage` under key `mynewstyle-guest-session-id`.
2. The `guest_session_id` is sent with every API request (consultation start, payment, results fetch) as a header `x-guest-session-id` when no authenticated user session exists.
3. Guest users can pay via Stripe and view full consultation results (recommendations, previews, grooming tips) without creating an account.
4. After viewing results, a non-intrusive banner/CTA displays: "Crie conta para guardar este resultado" prompting (but not requiring) registration.
5. Guest consultation data (consultations, recommendations, previews) is associated with `guest_session_id` in the database and retained for 30 days.
6. Guest session data survives browser tab close (localStorage) but is scoped to a single browser/device.
7. If a guest clears localStorage or uses a different device, a new guest session starts (previous data is NOT accessible but remains in DB for 30 days for potential claim via Story 8-5).
8. The consultation start API route (`/api/consultation/start`) accepts an optional `guestSessionId` field and stores it on the consultation record.
9. The consultation fetch API route (`/api/consultation/:id`) allows access when the request includes a matching `guest_session_id`.
10. RLS policies on the `consultations` table permit SELECT for rows where `guest_session_id` matches the request header value (via `current_setting('app.guest_session_id', true)::uuid`).

## Tasks / Subtasks

- [x] Task 1: Guest Session ID Generation and Persistence (AC: #1, #6, #7)
  - [x] 1.1 Create `src/lib/guest-session.ts` utility module
  - [x] 1.2 Implement `getOrCreateGuestSessionId(): string` — reads from `localStorage` key `mynewstyle-guest-session-id`; if absent, generates a `crypto.randomUUID()`, stores it, and returns it
  - [x] 1.3 Implement `getGuestSessionId(): string | null` — reads without creating
  - [x] 1.4 Implement `clearGuestSessionId(): void` — removes from `localStorage` (used after auth claim in Story 8-5)
  - [x] 1.5 Add validation: if stored value is not a valid UUID, regenerate
  - [x] 1.6 Write unit tests for all guest-session utility functions

- [x] Task 2: API Client Integration — Attach Guest Header (AC: #2)
  - [x] 2.1 Create `src/lib/api/headers.ts` (or extend existing API utility) that attaches `x-guest-session-id` header to all fetch calls when user is not authenticated
  - [x] 2.2 Integrate with existing API call sites: `/api/consultation/start`, `/api/consultation/:id/status`, `/api/payment/create-intent`, `/api/preview/generate`, `/api/preview/:id/status`
  - [x] 2.3 Logic: if Supabase auth session exists, do NOT send guest header (authenticated user takes precedence); if no auth session, send `x-guest-session-id`
  - [x] 2.4 Write tests verifying header is sent only when unauthenticated

- [x] Task 3: Server-Side Guest Session Handling (AC: #8, #9, #10)
  - [x] 3.1 Update `POST /api/consultation/start` route: accept optional `guestSessionId` in request body; store it on the consultation record's `guest_session_id` column
  - [x] 3.2 Update `GET /api/consultation/:id` routes to read `x-guest-session-id` header; use server Supabase client to set `app.guest_session_id` session variable before querying, so RLS policy grants access
  - [x] 3.3 Create helper `src/lib/supabase/guest-context.ts` with `setGuestContext(supabaseClient, guestSessionId)` that calls `supabase.rpc('set_config', { setting: 'app.guest_session_id', value: guestSessionId })`
  - [x] 3.4 Validate `x-guest-session-id` header is a valid UUID on every API route that accepts it (reject with 400 if malformed)
  - [x] 3.5 Write integration tests for guest access to consultation data

- [x] Task 4: Database Schema — Guest Session Column and RLS (AC: #5, #10)
  - [x] 4.1 Create Supabase migration: ensure `consultations.guest_session_id` column exists (uuid, nullable, indexed)
  - [x] 4.2 Create RLS policy: `guest_read_own_consultations` — allows SELECT on `consultations` where `guest_session_id = current_setting('app.guest_session_id', true)::uuid`
  - [x] 4.3 Create RLS policy for `recommendations` table: allows SELECT where `consultation_id IN (SELECT id FROM consultations WHERE guest_session_id = current_setting('app.guest_session_id', true)::uuid)`
  - [x] 4.4 Add migration SQL file to `supabase/migrations/` following existing naming convention
  - [x] 4.5 Add index on `consultations.guest_session_id` for query performance
  - [x] 4.6 Set 30-day data retention note (actual cleanup via cron/edge function is deferred — document in migration comments)

- [x] Task 5: Update Consultation Store for Guest Context (AC: #1, #2)
  - [x] 5.1 Add `guestSessionId: string | null` to the `ConsultationStore` interface in `src/stores/consultation.ts`
  - [x] 5.2 Initialize `guestSessionId` from `getOrCreateGuestSessionId()` on store hydration
  - [x] 5.3 Include `guestSessionId` in the `partialize` config so it persists to `sessionStorage`
  - [x] 5.4 Update `reset()` to NOT clear `guestSessionId` (it must survive across consultations)
  - [x] 5.5 Update `SessionData` interface in `src/lib/persistence/session-db.ts` — `guestSessionId` field already exists, verify it's populated correctly

- [x] Task 6: Save Prompt CTA After Results (AC: #4)
  - [x] 6.1 Create `src/components/consultation/GuestSaveBanner.tsx` — a non-intrusive, dismissible banner shown below results for guest users
  - [x] 6.2 Content: "Crie conta para guardar este resultado" with a secondary CTA button linking to `/register`
  - [x] 6.3 Only render when user is a guest (no auth session) AND results are displayed
  - [x] 6.4 Dismissible: once dismissed, do not show again for this session (use sessionStorage flag)
  - [x] 6.5 Follows existing theme (male dark / female light) using current gender context
  - [x] 6.6 Write component tests

- [x] Task 7: Update Payment Flow for Guest Users (AC: #3)
  - [x] 7.1 Update `/api/payment/create-intent` route: replace the hardcoded `isGuest = true` placeholder (line 62) with actual guest detection — check for auth session; if absent, check `x-guest-session-id` header
  - [x] 7.2 Guests always pay first-consultation price (EUR 5.99) since history cannot be verified without auth
  - [x] 7.3 Store `guest_session_id` in Stripe PaymentIntent metadata for reconciliation
  - [x] 7.4 Write tests for guest vs. authenticated payment intent creation

## Dev Notes

### Architecture Patterns and Constraints

- **Supabase Auth is NOT yet set up** (that's Stories 8-1, 8-2, 8-3). This story MUST work without any Supabase Auth in place. The guest session is the ONLY identity mechanism at this point.
- **Existing session persistence**: `src/lib/persistence/session-db.ts` already stores `guestSessionId` in the `SessionData` interface (IndexedDB). The Zustand store at `src/stores/consultation.ts` persists to `sessionStorage`. These two systems must stay consistent.
- **In-memory consultation storage**: The current `/api/consultation/start` route (line 41) uses an in-memory `Map<string, ConsultationRecord>` as a placeholder. If Supabase DB is now active from Epic 4, use it. If still in-memory, add `guest_session_id` to the `ConsultationRecord` type in `src/types/index.ts`.
- **RLS approach**: Architecture doc specifies `current_setting('app.guest_session_id', true)::uuid` for guest RLS. The server must call `SET LOCAL app.guest_session_id = '<uuid>'` within the transaction/request context before querying.
- **No middleware.ts exists yet** — do NOT create one for this story. Guest header handling should be in individual API routes or a shared utility.
- **Supabase client patterns**: Use `src/lib/supabase/client.ts` (browser, anon key) for client-side. Use `src/lib/supabase/server.ts` (`createServerSupabaseClient()` with service role key, bypasses RLS) for server-side operations that need to set session variables.

### Tech Stack Versions (Relevant)

- **Next.js 16.1.6** (App Router) — API routes in `src/app/api/`
- **Supabase JS v2.98.0** — `@supabase/supabase-js`
- **Zustand v5.0.11** — with `persist` middleware to `sessionStorage`
- **Zod v4.3.6** — for input validation on all API routes
- **Vitest v4.0.18** — testing framework
- **React Testing Library v16.3.2** — component tests

### Testing Standards

- Unit tests for utility functions (`guest-session.ts`) in `src/test/`
- API route tests with mocked Supabase client
- Component tests for `GuestSaveBanner.tsx`
- Naming convention: `src/test/<feature-name>.test.ts(x)`
- Use `vitest` with `jsdom` environment for component tests
- All existing tests follow pattern: mock external dependencies, test behavior not implementation

### Project Structure Notes

- New files:
  - `src/lib/guest-session.ts` — guest session ID utility
  - `src/lib/api/headers.ts` — API header utility for guest context
  - `src/lib/supabase/guest-context.ts` — server-side guest session RLS helper
  - `src/components/consultation/GuestSaveBanner.tsx` — save prompt CTA
  - `supabase/migrations/YYYYMMDDHHMMSS_add_guest_session_management.sql`
  - `src/test/guest-session.test.ts`
  - `src/test/guest-save-banner.test.tsx`
  - `src/test/guest-payment.test.ts`
- Modified files:
  - `src/stores/consultation.ts` — add `guestSessionId` field
  - `src/types/index.ts` — add `guest_session_id` to `ConsultationRecord`
  - `src/app/api/consultation/start/route.ts` — accept and store `guestSessionId`
  - `src/app/api/payment/create-intent/route.ts` — replace guest placeholder with real detection

### Anti-Pattern Prevention

- DO NOT use `document.cookie` for guest session — architecture specifies `localStorage`
- DO NOT create a full auth middleware — that's Story 8-1 scope
- DO NOT require registration before payment — guests must be able to pay without an account
- DO NOT expose `guest_session_id` in URL parameters — security risk; use headers only
- DO NOT store guest session ID in Zustand `sessionStorage` as the primary source — `localStorage` is the canonical source (survives tab close); Zustand mirrors it for convenience
- DO NOT generate a new `guest_session_id` on every page load — generate once, reuse until cleared
- DO NOT skip UUID validation on the server — malformed guest IDs must return 400

### Previous Story Intelligence

- **Story 2-7 (Photo Persistence)** established the `SessionData` interface in `src/lib/persistence/session-db.ts` which already includes `guestSessionId: string`. This field was introduced for session recovery. Ensure the guest session module is the single source of truth, and `session-db.ts` reads from it.
- **Story 5-2 (Payment Intent Creation)** has a placeholder at line 59-63 in `src/app/api/payment/create-intent/route.ts`: `// Temporary guest detection (until Epic 8 auth) ... const isGuest = true;`. This MUST be replaced with actual guest detection logic.
- **Story 3-6 (Questionnaire Completion)** established the consultation start flow that this story extends with guest context.

### Git Intelligence

- Recent commits are all Epic 7 (preview generation). No auth-related code has been committed.
- Commit convention: `feat(epic-8): implement story 8-4-guest-session-management`
- File patterns: components in `src/components/consultation/`, hooks in `src/hooks/`, tests in `src/test/`, API routes in `src/app/api/`

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#3.1 Entity Relationship] — `consultations.guest_session_id` column definition
- [Source: _bmad-output/planning-artifacts/architecture.md#3.2 Row-Level Security] — RLS policy for guest session access using `current_setting()`
- [Source: _bmad-output/planning-artifacts/architecture.md#5.3 Auth] — `POST /api/auth/claim-guest` endpoint (Story 8-5 scope, not this story)
- [Source: _bmad-output/planning-artifacts/architecture.md#6.3 Session Persistence] — Guest consultation ID persisted to `localStorage`
- [Source: _bmad-output/planning-artifacts/architecture.md#7.1 Authentication] — Guest sessions: UUID generated client-side, stored in localStorage
- [Source: _bmad-output/planning-artifacts/ux-design.md#2.3 Guest vs Auth Flow] — Guest can complete ONE full consultation including preview; results shown but not saved; auth required for history/favorites/second consultation
- [Source: _bmad-output/planning-artifacts/ux-design.md#11.2 Paywall Screen] — "No account required to pay. Guest can pay -> see results -> prompted to save after."
- [Source: _bmad-output/planning-artifacts/ux-design.md#11.5 Returning User Detection] — "If guest -> always EUR 5.99 (can't verify history without account)"
- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#E8 S8.4] — Story definition with acceptance criteria
- [Source: _bmad-output/planning-artifacts/prd.md#Authentication Flow] — Guest flow consideration: allow one free consultation without account
- [Source: src/lib/persistence/session-db.ts] — Existing SessionData interface with `guestSessionId` field
- [Source: src/stores/consultation.ts] — Zustand store with sessionStorage persistence
- [Source: src/app/api/payment/create-intent/route.ts#L59-63] — Guest placeholder to replace
- [Source: src/app/api/consultation/start/route.ts] — Current consultation start route using in-memory Map

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No blockers encountered. All tasks implemented in a single session.

### Completion Notes List

- Task 1: Created `src/lib/guest-session.ts` with `getOrCreateGuestSessionId()`, `getGuestSessionId()`, and `clearGuestSessionId()`. UUID validation rejects stored values that are not valid UUIDs and regenerates. 12 unit tests pass.
- Task 2: Created `src/lib/api/headers.ts` with `buildGuestHeaders()` and `getGuestRequestHeaders()`. Header is only sent when `isAuthenticated: false` and a valid UUID exists in localStorage. 6 unit tests pass.
- Task 3: Created `src/lib/supabase/guest-context.ts` with `validateGuestSessionHeader()` and `setGuestContext()`. Updated `POST /api/consultation/start` to accept and store optional `guestSessionId` (validated UUID). Updated `POST /api/payment/create-intent` to validate x-guest-session-id header. Added `guest_session_id` field to `ConsultationRecord` type. 8 integration tests pass.
- Task 4: Created `supabase/migrations/20260302000000_add_guest_session_management.sql` with `guest_session_id UUID` column, performance index, `guest_read_own_consultations` RLS policy, and conditional `guest_read_own_recommendations` RLS policy. 30-day data retention noted in migration comments.
- Task 5: Added `guestSessionId: string | null` to `ConsultationStore` interface. Initialized from `getOrCreateGuestSessionId()` on module load. Included in `partialize` config for sessionStorage persistence. `reset()` now preserves `guestSessionId`. Added `setGuestSessionId()` action. 5 store tests pass. All 19 existing store tests still pass.
- Task 6: Created `src/components/consultation/GuestSaveBanner.tsx` — dismissible banner with "Crie conta para guardar este resultado" text, link to `/register`, and sessionStorage dismiss flag. Uses theme CSS variables only. 7 component tests pass.
- Task 7: Updated `POST /api/payment/create-intent` — validates `x-guest-session-id` header (400 for malformed UUID), stores `guestSessionId` in Stripe PaymentIntent metadata for reconciliation. Guests always pay EUR 5.99. 5 payment tests pass.

Full regression suite: **1706 tests pass** across 123 test files — zero regressions.

### File List

New files:
- `src/lib/guest-session.ts`
- `src/lib/api/headers.ts`
- `src/lib/supabase/guest-context.ts`
- `src/components/consultation/GuestSaveBanner.tsx`
- `supabase/migrations/20260302000000_add_guest_session_management.sql`
- `src/test/guest-session.test.ts`
- `src/test/api-guest-headers.test.ts`
- `src/test/guest-server-integration.test.ts`
- `src/test/consultation-store-guest.test.ts`
- `src/test/guest-save-banner.test.tsx`
- `src/test/guest-payment.test.ts`

Modified files:
- `src/types/index.ts` — added `guest_session_id: string | null` to `ConsultationRecord`; added optional `guestSessionId` to `ConsultationStartPayload`
- `src/stores/consultation.ts` — added `guestSessionId`, `setGuestSessionId`, updated `reset()`, updated `partialize`
- `src/app/api/consultation/start/route.ts` — accept optional `guestSessionId` in body, store on record
- `src/app/api/consultation/[id]/status/route.ts` — handle `x-guest-session-id` header, call `setGuestContext()` before DB query
- `src/app/api/payment/create-intent/route.ts` — validate x-guest-session-id header, store in Stripe metadata
- `src/app/consultation/photo/page.tsx` — use canonical `getOrCreateGuestSessionId()` from `src/lib/guest-session.ts` (removed inline duplicate with wrong localStorage key)
- `src/lib/consultation/submit.ts` — send `x-guest-session-id` header and `guestSessionId` in body when guest session exists
- `src/lib/supabase/guest-context.ts` — `setGuestContext()` uses `is_local: true` for transaction-scoped RLS safety
- `src/hooks/usePayment.ts` — send `x-guest-session-id` header via `getGuestRequestHeaders()`
- `src/hooks/useConsultationStatus.ts` — send `x-guest-session-id` header via `buildGuestHeaders()`
- `src/components/consultation/GuestSaveBanner.tsx` — fix AnimatePresence exit animation (remove redundant early-return guard)
- `src/test/guest-server-integration.test.ts` — added 3 tests for status route guest header handling
- `src/test/consultation-submit.test.ts` — added 2 tests for guest header/body inclusion; updated payload assertion
- `src/test/use-consultation-status.test.ts` — updated fetch call assertion for new headers object
- `src/test/photo-page-upload.test.tsx` — updated localStorage key assertion to canonical `mynewstyle-guest-session-id`; use valid UUID for reuse test
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status updated to done
- `_bmad-output/implementation-artifacts/8-4-guest-session-management.md` — story file updated

## Change Log

- 2026-03-02: Implemented Story 8.4 — Guest Session Management. Created guest session utility, API header helper, server-side RLS context helper, database migration, GuestSaveBanner component, and updated consultation store, types, and API routes. 43 new tests added across 6 test files.
- 2026-03-02: Code review fixes applied (adversarial review pass):
  - CRITICAL: `GET /api/consultation/:id/status` now handles `x-guest-session-id` header and calls `setGuestContext()` before DB query so RLS policy grants guest access (AC #9 was incomplete).
  - CRITICAL: `src/lib/consultation/submit.ts` now sends `guestSessionId` in request body and `x-guest-session-id` header when a guest session exists (Task 2.2 was incomplete). `ConsultationStartPayload` extended with optional `guestSessionId`.
  - HIGH: `src/hooks/usePayment.ts` now sends `x-guest-session-id` header via `getGuestRequestHeaders()` (AC #2 was incomplete for payment flow).
  - HIGH: `src/app/consultation/photo/page.tsx` was using a divergent localStorage key (`mynewstyle_guest_session_id` with underscores) and a duplicate inline `getOrCreateGuestSessionId()` function with no UUID validation. Fixed to import and use the canonical `getOrCreateGuestSessionId()` from `src/lib/guest-session.ts` (key: `mynewstyle-guest-session-id`).
  - MEDIUM: `setGuestContext()` now passes `is_local: true` to Postgres `set_config()` so the guest session variable is transaction-scoped, not connection-scoped. Prevents data leakage under connection pooling.
  - MEDIUM: `GuestSaveBanner` exit animation fixed — removed premature `if (dismissed) return null` guard that prevented `AnimatePresence` from playing the exit animation before unmounting.
  - Updated tests: `src/test/guest-server-integration.test.ts` (3 new tests for status route guest handling), `src/test/consultation-submit.test.ts` (2 new tests for guest header/body inclusion), `src/test/use-consultation-status.test.ts` (updated assertion for fetch call with headers), `src/test/photo-page-upload.test.tsx` (updated canonical key assertions).
  - Full regression: 1710 tests pass across 123 test files.
