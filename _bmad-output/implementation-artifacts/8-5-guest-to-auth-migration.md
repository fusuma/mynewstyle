# Story 8.5: Guest-to-Auth Migration

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a guest user who just created an account,
I want my previous guest consultation data (consultations, recommendations, previews, photos) seamlessly migrated to my new authenticated profile,
so that I don't lose any work or paid results when I register.

## Acceptance Criteria

1. A `POST /api/auth/claim-guest` endpoint exists that accepts `{ guestSessionId: string }` in the request body.
2. The endpoint requires an authenticated Supabase session (JWT) -- unauthenticated requests return 401.
3. On success, all `consultations` rows where `guest_session_id` matches the provided value have their `user_id` updated to the authenticated user's `auth.uid()` and `guest_session_id` set to `NULL`.
4. Associated `recommendations`, `styles_to_avoid`, `grooming_tips`, and `favorites` records (joined via `consultation_id`) are automatically accessible to the authenticated user through existing RLS policies on `consultations`.
5. Photos in Supabase Storage under the guest-scoped path are moved/copied to the user-scoped path, and `consultations.photo_url` is updated to reflect the new storage path.
6. After successful migration, the client clears `localStorage` key `mynewstyle-guest-session-id` using the `clearGuestSessionId()` utility from `src/lib/guest-session.ts` (Story 8-4).
7. The migration is seamless -- the user sees their consultation in their profile/history immediately after registration without additional steps.
8. If the `guestSessionId` has no matching consultations, the endpoint returns a success response (no-op, not an error) so the registration flow is never blocked.
9. If the user already has consultations under their `user_id` (edge case: re-claim or duplicate), the endpoint does NOT duplicate records -- it only migrates unclaimed guest records.
10. The claim operation is idempotent: calling it multiple times with the same `guestSessionId` does not cause errors or duplicate data.

## Tasks / Subtasks

- [x] Task 1: Create `POST /api/auth/claim-guest` API route (AC: #1, #2, #3, #8, #9, #10)
  - [x] 1.1 Create file `src/app/api/auth/claim-guest/route.ts`
  - [x] 1.2 Define Zod schema: `{ guestSessionId: z.string().uuid() }`
  - [x] 1.3 Authenticate the request: use Supabase server client (cookie-based from `@supabase/ssr` per Story 8-1) to call `supabase.auth.getUser()`. If no authenticated user, return 401 `{ error: 'Authentication required' }`
  - [x] 1.4 Query `consultations` table for rows matching `guest_session_id = guestSessionId` AND `user_id IS NULL` (only unclaimed records)
  - [x] 1.5 If no matching rows, return `{ migrated: 0, message: 'No guest consultations found' }` with status 200 (not an error)
  - [x] 1.6 Update all matching consultation rows: set `user_id = auth.uid()`, set `guest_session_id = NULL`
  - [x] 1.7 Use a single Supabase RPC or transaction to ensure atomicity (all-or-nothing migration)
  - [x] 1.8 Return `{ migrated: <count>, consultationIds: [...] }` with status 200

- [x] Task 2: Photo Storage Migration (AC: #5)
  - [x] 2.1 For each migrated consultation, read the current `photo_url` (guest-scoped storage path)
  - [x] 2.2 Copy the photo from guest path to user-scoped path: `consultation-photos/{user_id}/{consultation_id}.jpg`
  - [x] 2.3 Update `consultations.photo_url` with the new storage path
  - [x] 2.4 Also migrate any `preview_url` values in `recommendations` table (preview images in `preview-images` bucket)
  - [x] 2.5 Delete the original guest-scoped files after successful copy (cleanup)
  - [x] 2.6 If storage migration fails for a specific file, log a warning but do NOT fail the entire claim operation -- the consultation record is still migrated, and the old storage path remains valid until bucket cleanup

- [x] Task 3: Database Migration -- RPC Function for Atomic Claim (AC: #3, #9, #10)
  - [x] 3.1 Create Supabase migration file: `supabase/migrations/20260302120000_add_claim_guest_function.sql`
  - [x] 3.2 Create a PostgreSQL function `claim_guest_consultations(p_guest_session_id UUID, p_user_id UUID)` that:
    - Updates `consultations` SET `user_id = p_user_id`, `guest_session_id = NULL` WHERE `guest_session_id = p_guest_session_id` AND `user_id IS NULL`
    - Returns the count and IDs of updated rows
  - [x] 3.3 Grant EXECUTE on the function to the `authenticated` role only
  - [x] 3.4 Add safety check: function verifies `p_user_id = auth.uid()` to prevent claiming for another user

- [x] Task 4: Client-Side Integration -- Auto-Claim After Registration (AC: #6, #7)
  - [x] 4.1 Create `src/lib/auth/claim-guest.ts` client utility module
  - [x] 4.2 Implement `claimGuestSession(): Promise<{ migrated: number }>`:
    - Read `guestSessionId` from `localStorage` via `getGuestSessionId()` from `src/lib/guest-session.ts`
    - If no guest session ID exists, return `{ migrated: 0 }` immediately (no-op)
    - Call `POST /api/auth/claim-guest` with `{ guestSessionId }`
    - On success: call `clearGuestSessionId()` to remove from localStorage
    - On failure: log error but do NOT block the registration flow
  - [x] 4.3 Integrate `claimGuestSession()` into the registration success handler:
    - After successful registration/login in the registration page (Story 8-2), call `claimGuestSession()` automatically
    - Also call after Google OAuth successful callback (Story 8-1 auth callback route)
  - [x] 4.4 Integrate into login flow as well: if a guest session ID exists when a user logs in, auto-claim
  - [x] 4.5 After claim, invalidate any cached consultation data in the Zustand store so the profile page fetches fresh data from the server

- [x] Task 5: Registration/Login Page Integration Points (AC: #7)
  - [x] 5.1 In the registration success handler (Story 8-2 `src/app/register/page.tsx`), after `supabase.auth.signUp()` succeeds, call `claimGuestSession()`
  - [x] 5.2 In the login success handler (Story 8-3 `src/app/login/page.tsx`), after `supabase.auth.signInWithPassword()` or OAuth succeeds, call `claimGuestSession()`
  - [x] 5.3 In the auth callback route (Story 8-1 `src/app/auth/callback/route.ts`), after code exchange for OAuth, trigger client-side claim on redirect
  - [x] 5.4 Display a brief toast notification on successful migration: "Sua consultoria foi salva no seu perfil!" (using Sonner toast, already installed)

- [x] Task 6: Testing (All ACs)
  - [x] 6.1 Write API route tests for `/api/auth/claim-guest`:
    - Test: authenticated request with valid guest session ID migrates consultations
    - Test: unauthenticated request returns 401
    - Test: invalid UUID returns 400
    - Test: no matching consultations returns 200 with `migrated: 0`
    - Test: already-claimed consultations are not re-migrated (idempotency)
    - Test: only unclaimed records (user_id IS NULL) are migrated
  - [x] 6.2 Write unit tests for `claimGuestSession()` client utility:
    - Test: calls API and clears localStorage on success
    - Test: no-op when no guest session ID exists
    - Test: does not throw on API failure (graceful degradation)
  - [x] 6.3 Test file locations: `src/test/claim-guest-api.test.ts`, `src/test/claim-guest-client.test.ts`

## Dev Notes

### Architecture Patterns and Constraints

- **Dependency on Stories 8-1 through 8-4**: This story REQUIRES that Stories 8-1 (Supabase Auth Setup), 8-2 (Registration Page), 8-3 (Login Page), and 8-4 (Guest Session Management) are ALL implemented before this story can be developed. The claim endpoint requires an authenticated user (8-1), registration/login pages to integrate with (8-2/8-3), and the guest session infrastructure (8-4).
- **Stories 8-1 through 8-4 are currently `ready-for-dev` (NOT done)**: As of the current sprint status, none of the prerequisite stories have been implemented. The code for `@supabase/ssr`, middleware, registration page, login page, and guest session utilities does NOT exist yet. The developer implementing this story must verify all prerequisites are in place.
- **Supabase Auth pattern**: Story 8-1 establishes `@supabase/ssr` with cookie-based session management. The server client uses `createServerClient` from `@supabase/ssr` with `cookies()` from `next/headers`. Use the user-scoped server client (anon key + cookies) for operations that respect RLS, and the service role client (`createServiceRoleClient`) for admin operations like storage migration that bypass RLS.
- **Guest session infrastructure**: Story 8-4 creates `src/lib/guest-session.ts` with `getGuestSessionId()`, `getOrCreateGuestSessionId()`, and `clearGuestSessionId()`. It also creates `src/lib/supabase/guest-context.ts` for server-side guest RLS. These modules MUST exist before this story's implementation.
- **RLS implications**: After migration, the `user_id` column on `consultations` is set to the auth user's ID. Existing RLS policies from architecture doc (Section 3.2) grant SELECT to rows where `user_id = auth.uid()`. This means migrated consultations are automatically visible to the user without additional RLS changes. The `recommendations`, `styles_to_avoid`, and `grooming_tips` tables have RLS policies that cascade from consultation access.
- **Storage bucket structure**: Architecture doc (Section 3.3) defines `consultation-photos` bucket (user-scoped, signed URLs, 15-min expiry) and `preview-images` bucket (user-scoped). Guest photos are stored under a guest-session-scoped path. After migration, files must move to the user-scoped path so RLS storage policies work correctly.
- **In-memory consultation storage**: The current `src/app/api/consultation/start/route.ts` uses an in-memory `Map<string, ConsultationRecord>`. If Supabase DB is active by the time this story is implemented (likely, given Epic 4 stories are done), the claim-guest route should query the actual Supabase `consultations` table. If still in-memory, this story cannot fully function (it requires persistent DB).

### Tech Stack Versions (Relevant)

- **Next.js 16.1.6** (App Router) -- API routes in `src/app/api/`
- **Supabase JS v2.98.0** -- `@supabase/supabase-js`
- **@supabase/ssr** -- installed by Story 8-1 (cookie-based auth)
- **Zod v4.3.6** -- input validation on all API routes
- **Zustand v5.0.11** -- with `persist` middleware to `sessionStorage`
- **Vitest v4.0.18** -- testing framework
- **Sonner v2.0.7** -- toast notifications (already installed)

### Testing Standards

- API route tests with mocked Supabase client in `src/test/claim-guest-api.test.ts`
- Client utility tests in `src/test/claim-guest-client.test.ts`
- Naming convention: `src/test/<feature-name>.test.ts`
- Use `vitest` with `jsdom` environment for client-side tests
- Mock `localStorage`, `fetch`, and Supabase client methods
- All tests follow existing pattern: mock external dependencies, test behavior not implementation

### Project Structure Notes

- New files:
  - `src/app/api/auth/claim-guest/route.ts` -- API route for guest claim
  - `src/lib/auth/claim-guest.ts` -- client-side claim utility
  - `src/components/auth/GuestClaimHandler.tsx` -- client component for OAuth redirect claim trigger
  - `supabase/migrations/20260302120000_add_claim_guest_function.sql` -- PostgreSQL function
  - `src/test/claim-guest-api.test.ts` -- API route tests
  - `src/test/claim-guest-client.test.ts` -- client utility tests
- Modified files:
  - `src/app/register/page.tsx` (Story 8-2) -- add `claimGuestSession()` call after successful registration
  - `src/components/auth/LoginForm.tsx` (Story 8-3) -- add `claimGuestSession()` call after successful login
  - `src/app/auth/callback/route.ts` (Story 8-1) -- appends `?claim_guest=1` after OAuth callback

### Anti-Pattern Prevention

- DO NOT create a separate migration for each table (consultations, recommendations, etc.) -- only `consultations.user_id` needs updating; child tables cascade via RLS policies based on `consultation_id`
- DO NOT require the user to manually trigger migration -- it must be automatic on registration/login
- DO NOT fail the registration/login flow if claim fails -- migration is best-effort; user can re-try later or support can manually resolve
- DO NOT use the service role client for the claim operation itself -- use the authenticated server client so `auth.uid()` is available in RLS context. Use service role ONLY for storage file operations that bypass bucket RLS
- DO NOT delete guest data from the DB after migration -- set `guest_session_id = NULL` (not delete rows). The consultation records remain, just re-owned
- DO NOT expose the claim endpoint without authentication -- it must require a valid JWT
- DO NOT move photos synchronously in the API response -- if storage migration is slow, run it async or accept best-effort. The consultation record migration (DB update) is the critical path
- DO NOT skip UUID validation on the `guestSessionId` parameter -- malformed IDs must return 400
- DO NOT create new Supabase client patterns -- reuse `createClient` (user-scoped) from `src/lib/supabase/server.ts` as refactored by Story 8-1, and `createServiceRoleClient` for admin operations

### Previous Story Intelligence

- **Story 8-4 (Guest Session Management)** establishes the entire guest session infrastructure this story depends on:
  - `src/lib/guest-session.ts` -- `getGuestSessionId()`, `clearGuestSessionId()` utilities
  - `src/lib/api/headers.ts` -- attaches `x-guest-session-id` header when unauthenticated
  - `src/lib/supabase/guest-context.ts` -- server-side RLS helper for guest sessions
  - `src/components/consultation/GuestSaveBanner.tsx` -- displays "Crie conta para guardar este resultado" CTA
  - RLS policies for guest access on `consultations` and `recommendations` tables
  - `consultations.guest_session_id` column (uuid, nullable, indexed)
- **Story 8-1 (Supabase Auth Setup)** establishes:
  - `@supabase/ssr` package and cookie-based auth pattern
  - `src/middleware.ts` for token refresh
  - `src/app/auth/callback/route.ts` for OAuth redirect handling
  - `profiles` table with trigger on user creation
  - Refactored `src/lib/supabase/client.ts` and `src/lib/supabase/server.ts`
- **Story 8-2 (Registration Page)** creates `src/app/register/page.tsx` with registration form and Google OAuth
- **Story 8-3 (Login Page)** creates `src/app/login/page.tsx` with login form and OAuth
- **Story 5-2 (Payment Intent Creation)** has the guest detection placeholder at lines 59-63 in `src/app/api/payment/create-intent/route.ts` that Story 8-4 replaces. After guest-to-auth migration, the `isGuest` flag should be `false` for the migrated user, enabling repeat consultation pricing (EUR 2.99)
- **Story 2-7 (Photo Persistence)** established `SessionData` interface in `src/lib/persistence/session-db.ts` with `guestSessionId` field

### Git Intelligence

- Recent commits are all Epic 7 (preview generation). No auth-related code has been committed yet.
- Commit convention: `feat(epic-8): implement story 8-5-guest-to-auth-migration`
- File patterns: API routes in `src/app/api/`, utilities in `src/lib/`, tests in `src/test/`, components in `src/components/`

### Key Architecture References

- [Source: architecture.md#3.1 Entity Relationship] -- `consultations.user_id` (FK to profiles, nullable for guests) and `consultations.guest_session_id` (uuid, for guest tracking)
- [Source: architecture.md#3.2 Row-Level Security] -- RLS policies: users read own consultations via `user_id = auth.uid()`; guests via `guest_session_id = current_setting('app.guest_session_id')`
- [Source: architecture.md#3.3 Storage Buckets] -- `consultation-photos` (user-scoped, signed URLs), `preview-images` (user-scoped)
- [Source: architecture.md#5.3 Auth] -- `POST /api/auth/claim-guest` endpoint spec: accepts `{ guestSessionId }`, migrates guest consultations to authenticated user
- [Source: architecture.md#7.1 Authentication] -- Guest-to-Auth migration: `POST /api/auth/claim-guest` transfers consultations
- [Source: epics-and-stories.md#E8 S8.5] -- Story definition: POST /api/auth/claim-guest, migrate consultations, migrate photos, clear localStorage, seamless experience
- [Source: ux-design.md#2.3 Guest vs Auth Flow] -- Guest can complete ONE consultation; auth required for history, favorites, second consultation
- [Source: ux-design.md#11.5 Returning User Detection] -- After migration, user is authenticated and can get repeat pricing (EUR 2.99)
- [Source: prd.md#Authentication Flow] -- Guest flow: allow one consultation without account, convert to registered on save

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Pre-existing TypeScript errors in `src/components/consultation/CameraPermissionPrompt.tsx`, `GuestSaveBanner.tsx`, `SessionRecoveryBanner.tsx` (motion `ease` type) and `src/test/ai-cost-tracking.test.ts` (SupabaseClient cast) are NOT introduced by this story.
- After code review fixes: photo migration stderr noise eliminated from API tests (mock now correctly matches `.select().eq().single()` chain). Full suite: 1733/1733 passing.

### Completion Notes List

- Implemented `POST /api/auth/claim-guest` API route with Zod UUID validation, Supabase auth check, atomic RPC call, and async photo migration (Tasks 1, 2).
- Created `claim_guest_consultations` PostgreSQL function in `supabase/migrations/20260302120000_add_claim_guest_function.sql` using CTE UPDATE RETURNING for atomicity, with `auth.uid()` safety check and `authenticated`-role-only GRANT (Task 3).
- Created `src/lib/auth/claim-guest.ts` client utility implementing `claimGuestSession()` with full graceful degradation -- never throws, never blocks auth flow. Added Zustand store `reset()` call after successful migration so profile page fetches fresh server data (Tasks 4.1–4.5).
- Integrated `claimGuestSession()` into `src/app/register/page.tsx` (email/password registration success) and `src/components/auth/LoginForm.tsx` (login success via `onAuthStateChange`) with Sonner toast notification "Sua consultoria foi salva no seu perfil!" when `migrated > 0` (Tasks 5.1, 5.2, 5.4).
- Modified `src/app/auth/callback/route.ts` to append `?claim_guest=1` to redirect URL after successful OAuth code exchange. Created `src/components/auth/GuestClaimHandler.tsx` client component, placed in root layout (`src/app/layout.tsx`) wrapped in Suspense so it runs at every OAuth destination page (Task 5.3).
- AC #4: Associated records (recommendations, styles_to_avoid, grooming_tips, favorites) are automatically accessible via existing RLS policies once `consultations.user_id` is set -- no additional DB changes needed.
- AC #9/#10 idempotency is enforced by the SQL function: only updates rows WHERE `user_id IS NULL`, so repeated calls with the same `guestSessionId` return `migrated: 0` safely.
- 22 new tests written (10 API + 12 client), all pass. Full suite: 1733 tests pass, 0 regressions.

### Senior Developer Review (AI)

**Reviewer:** claude-sonnet-4-6 | **Date:** 2026-03-02

**Outcome: APPROVED with fixes applied**

#### Issues Found and Fixed

**[CRITICAL] GuestClaimHandler never mounted -- OAuth claim path was dead code**
- `GuestClaimHandler.tsx` was created but never imported in any page or layout.
- The `?claim_guest=1` query parameter appended by the auth callback would never be processed.
- Fix: Added `<GuestClaimHandler />` to `src/app/layout.tsx` wrapped in `<Suspense fallback={null}>` (required because `useSearchParams()` needs a Suspense boundary in Next.js App Router).
- This activates the OAuth migration path for all destination pages, including the future `/profile` page (Story 8-6).

**[MEDIUM] Task 4.5 not implemented -- Zustand store cache not invalidated after migration**
- Story task 4.5 required invalidating cached consultation data after claim so the profile page fetches fresh server data.
- `claimGuestSession()` did not call `useConsultationStore.getState().reset()`.
- Fix: Added `useConsultationStore.getState().reset()` call in `src/lib/auth/claim-guest.ts` when `migrated > 0`. Only resets on actual migration, not no-op calls.

**[MEDIUM] API test mock for `createServiceRoleClient` mismatched actual call chain**
- Mock used `.select().in()` but the route uses `.select().eq().single()` (for photo fetch) and `.select().eq().not()` (for recommendations fetch).
- This caused photo migration to always throw and fall into the warn path during tests, masking the real behavior. The misleading stderr `"serviceClient.from(...).select(...).eq is not a function"` was incorrectly documented as "expected".
- Fix: Updated mock in `src/test/claim-guest-api.test.ts` to match the actual query chains: `.select().eq().single()` and `.select().eq().not()`.

**[LOW] Missing tests for store invalidation (Task 4.5)**
- Added 2 tests to `src/test/claim-guest-client.test.ts`: one verifying `reset()` is called when `migrated > 0`, one verifying it is NOT called when `migrated === 0`.

#### ACs Verified
- AC #1: POST /api/auth/claim-guest exists with UUID validation -- IMPLEMENTED
- AC #2: Requires authenticated session, returns 401 -- IMPLEMENTED
- AC #3: Consultations.user_id updated, guest_session_id nulled via atomic RPC -- IMPLEMENTED
- AC #4: Child tables accessible via existing RLS (no DB changes needed) -- IMPLEMENTED
- AC #5: Photos migrated to user-scoped paths, photo_url updated -- IMPLEMENTED
- AC #6: clearGuestSessionId() called on success -- IMPLEMENTED
- AC #7: Auto-claim on registration/login/OAuth; seamless -- IMPLEMENTED (after fix to place GuestClaimHandler in root layout)
- AC #8: No-op 200 when no consultations found -- IMPLEMENTED
- AC #9: Only unclaimed records migrated (user_id IS NULL guard) -- IMPLEMENTED
- AC #10: Idempotent via SQL WHERE user_id IS NULL -- IMPLEMENTED

### File List

New files:
- src/app/api/auth/claim-guest/route.ts
- src/lib/auth/claim-guest.ts
- src/components/auth/GuestClaimHandler.tsx
- supabase/migrations/20260302120000_add_claim_guest_function.sql
- src/test/claim-guest-api.test.ts
- src/test/claim-guest-client.test.ts

Modified files:
- src/app/layout.tsx (code review fix: mount GuestClaimHandler in Suspense)
- src/app/register/page.tsx
- src/components/auth/LoginForm.tsx
- src/app/auth/callback/route.ts
- src/test/auth-callback-route.test.ts
- src/test/claim-guest-client.test.ts (code review fix: add store mock + 2 new tests)

## Change Log

- 2026-03-02: Implemented Story 8.5 -- Guest-to-Auth Migration. Created `POST /api/auth/claim-guest` endpoint, `claim_guest_consultations` PostgreSQL RPC, `claimGuestSession()` client utility, and `GuestClaimHandler` component. Integrated auto-claim into registration, login, and OAuth callback flows with Sonner toast notification. 20 new tests added. Full regression suite: 1731/1731 passing.
- 2026-03-02: Code review (claude-sonnet-4-6) -- Fixed 3 issues: (1) mounted GuestClaimHandler in root layout wrapped in Suspense so OAuth claim path is active; (2) added Zustand store reset after migration (Task 4.5); (3) corrected serviceClient mock query chain in API tests. Added 2 tests. Full suite: 1733/1733 passing.
