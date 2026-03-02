# Story 8.4: Guest Session Management

Status: ready-for-dev

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

- [ ] Task 1: Guest Session ID Generation and Persistence (AC: #1, #6, #7)
  - [ ] 1.1 Create `src/lib/guest-session.ts` utility module
  - [ ] 1.2 Implement `getOrCreateGuestSessionId(): string` — reads from `localStorage` key `mynewstyle-guest-session-id`; if absent, generates a `crypto.randomUUID()`, stores it, and returns it
  - [ ] 1.3 Implement `getGuestSessionId(): string | null` — reads without creating
  - [ ] 1.4 Implement `clearGuestSessionId(): void` — removes from `localStorage` (used after auth claim in Story 8-5)
  - [ ] 1.5 Add validation: if stored value is not a valid UUID, regenerate
  - [ ] 1.6 Write unit tests for all guest-session utility functions

- [ ] Task 2: API Client Integration — Attach Guest Header (AC: #2)
  - [ ] 2.1 Create `src/lib/api/headers.ts` (or extend existing API utility) that attaches `x-guest-session-id` header to all fetch calls when user is not authenticated
  - [ ] 2.2 Integrate with existing API call sites: `/api/consultation/start`, `/api/consultation/:id/status`, `/api/payment/create-intent`, `/api/preview/generate`, `/api/preview/:id/status`
  - [ ] 2.3 Logic: if Supabase auth session exists, do NOT send guest header (authenticated user takes precedence); if no auth session, send `x-guest-session-id`
  - [ ] 2.4 Write tests verifying header is sent only when unauthenticated

- [ ] Task 3: Server-Side Guest Session Handling (AC: #8, #9, #10)
  - [ ] 3.1 Update `POST /api/consultation/start` route: accept optional `guestSessionId` in request body; store it on the consultation record's `guest_session_id` column
  - [ ] 3.2 Update `GET /api/consultation/:id` routes to read `x-guest-session-id` header; use server Supabase client to set `app.guest_session_id` session variable before querying, so RLS policy grants access
  - [ ] 3.3 Create helper `src/lib/supabase/guest-context.ts` with `setGuestContext(supabaseClient, guestSessionId)` that calls `supabase.rpc('set_config', { setting: 'app.guest_session_id', value: guestSessionId })`
  - [ ] 3.4 Validate `x-guest-session-id` header is a valid UUID on every API route that accepts it (reject with 400 if malformed)
  - [ ] 3.5 Write integration tests for guest access to consultation data

- [ ] Task 4: Database Schema — Guest Session Column and RLS (AC: #5, #10)
  - [ ] 4.1 Create Supabase migration: ensure `consultations.guest_session_id` column exists (uuid, nullable, indexed)
  - [ ] 4.2 Create RLS policy: `guest_read_own_consultations` — allows SELECT on `consultations` where `guest_session_id = current_setting('app.guest_session_id', true)::uuid`
  - [ ] 4.3 Create RLS policy for `recommendations` table: allows SELECT where `consultation_id IN (SELECT id FROM consultations WHERE guest_session_id = current_setting('app.guest_session_id', true)::uuid)`
  - [ ] 4.4 Add migration SQL file to `supabase/migrations/` following existing naming convention
  - [ ] 4.5 Add index on `consultations.guest_session_id` for query performance
  - [ ] 4.6 Set 30-day data retention note (actual cleanup via cron/edge function is deferred — document in migration comments)

- [ ] Task 5: Update Consultation Store for Guest Context (AC: #1, #2)
  - [ ] 5.1 Add `guestSessionId: string | null` to the `ConsultationStore` interface in `src/stores/consultation.ts`
  - [ ] 5.2 Initialize `guestSessionId` from `getOrCreateGuestSessionId()` on store hydration
  - [ ] 5.3 Include `guestSessionId` in the `partialize` config so it persists to `sessionStorage`
  - [ ] 5.4 Update `reset()` to NOT clear `guestSessionId` (it must survive across consultations)
  - [ ] 5.5 Update `SessionData` interface in `src/lib/persistence/session-db.ts` — `guestSessionId` field already exists, verify it's populated correctly

- [ ] Task 6: Save Prompt CTA After Results (AC: #4)
  - [ ] 6.1 Create `src/components/consultation/GuestSaveBanner.tsx` — a non-intrusive, dismissible banner shown below results for guest users
  - [ ] 6.2 Content: "Crie conta para guardar este resultado" with a secondary CTA button linking to `/register`
  - [ ] 6.3 Only render when user is a guest (no auth session) AND results are displayed
  - [ ] 6.4 Dismissible: once dismissed, do not show again for this session (use sessionStorage flag)
  - [ ] 6.5 Follows existing theme (male dark / female light) using current gender context
  - [ ] 6.6 Write component tests

- [ ] Task 7: Update Payment Flow for Guest Users (AC: #3)
  - [ ] 7.1 Update `/api/payment/create-intent` route: replace the hardcoded `isGuest = true` placeholder (line 62) with actual guest detection — check for auth session; if absent, check `x-guest-session-id` header
  - [ ] 7.2 Guests always pay first-consultation price (EUR 5.99) since history cannot be verified without auth
  - [ ] 7.3 Store `guest_session_id` in Stripe PaymentIntent metadata for reconciliation
  - [ ] 7.4 Write tests for guest vs. authenticated payment intent creation

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

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
