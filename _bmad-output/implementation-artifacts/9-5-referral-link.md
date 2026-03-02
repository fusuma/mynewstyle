# Story 9.5: Referral Link

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want a unique referral link so friends can try mynewstyle,
so that I can share the platform with others while enabling future referral rewards tracking.

## Acceptance Criteria

1. Each authenticated user gets a unique referral code, generated deterministically from their user ID (not random — same user always gets the same code). The code is a short alphanumeric string (6-8 characters, URL-safe, case-insensitive).
2. The referral link format is `mynewstyle.com/?ref=CODE`. The `ref` query parameter is preserved through navigation until a consultation is started or the session ends.
3. When a visitor arrives via a referral link, the `ref` parameter value is captured and stored in `localStorage` (key: `mynewstyle_ref`) and persisted for 30 days. If the visitor already has a referral attribution, it is NOT overwritten (first-touch attribution).
4. When a consultation is started (POST `/api/consultation/start`), the stored referral code is included in the request payload (`referralCode` field) and persisted on the `consultations` record in a new `referral_code` column.
5. A new API route `GET /api/referral/code` returns the authenticated user's referral code and full referral link. Returns 401 for unauthenticated users.
6. A `ReferralLinkCard` component is displayed on the profile page (below the tabs) showing the user's referral link with a "Copiar link" (copy link) button. Tapping the copy button copies the full URL to the clipboard and shows a success toast ("Link copiado!").
7. The referral link is also available from the results page actions footer via a "Convidar amigos" button that opens a share sheet (if Web Share API available) or copies the link with toast confirmation.
8. Referral tracking data is queryable: an admin can query consultations grouped by `referral_code` to see which users drive referrals. No admin UI is needed — just the database column and index.
9. The `referral_codes` database table stores the mapping between `user_id` and `referral_code`, with a unique constraint on `referral_code` to prevent collisions.
10. All referral infrastructure works for both authenticated and guest users on the receiving end (the person clicking the referral link may or may not have an account).

## Tasks / Subtasks

- [x] Task 1: Database Migration — Referral Infrastructure (AC: #8, #9)
  - [x] 1.1 Create Supabase migration `supabase/migrations/YYYYMMDDHHMMSS_add_referral_infrastructure.sql`
  - [x] 1.2 Create `referral_codes` table: `id (uuid PK DEFAULT gen_random_uuid())`, `user_id (uuid FK references auth.users NOT NULL UNIQUE)`, `referral_code (varchar(8) NOT NULL UNIQUE)`, `created_at (timestamptz DEFAULT now())`
  - [x] 1.3 Enable RLS on `referral_codes` table
  - [x] 1.4 Create RLS policy: authenticated users can SELECT their own row (`user_id = auth.uid()`)
  - [x] 1.5 REVOKE ALL ON referral_codes FROM anon, authenticated; GRANT SELECT ON referral_codes TO authenticated
  - [x] 1.6 Add index on `referral_codes.referral_code` for lookup performance
  - [x] 1.7 Add `referral_code` column (varchar(8), nullable) to `consultations` table: `ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS referral_code VARCHAR(8) NULL`
  - [x] 1.8 Add index on `consultations.referral_code` for analytics queries: `CREATE INDEX IF NOT EXISTS idx_consultations_referral_code ON public.consultations (referral_code) WHERE referral_code IS NOT NULL`

- [x] Task 2: Referral Code Generation Utility (AC: #1)
  - [x] 2.1 Create `src/lib/referral/generate-code.ts` — deterministic code generation from user UUID
  - [x] 2.2 Algorithm: SHA-256 of `userId:SALT`, first 7 hex chars uppercased. URL-safe and case-insensitive.
  - [x] 2.3 Export `generateReferralCode(userId: string): string`
  - [x] 2.4 Write unit tests: deterministic (same input = same output), correct length (6-8 chars), URL-safe characters only, different users produce different codes — 9 tests all pass

- [x] Task 3: Referral Code API Route (AC: #5, #9)
  - [x] 3.1 Create `src/app/api/referral/code/route.ts` — GET route
  - [x] 3.2 Auth check: extract user from Supabase Auth session; return 401 if not authenticated
  - [x] 3.3 Query `referral_codes` table for `user_id = auth.uid()`
  - [x] 3.4 If no row exists, generate code via `generateReferralCode(userId)`, INSERT via service role client (RLS bypass for INSERT), handle unique constraint violation (race condition retry)
  - [x] 3.5 Return JSON: `{ referralCode: string, referralLink: string }` where `referralLink` = `${SITE_URL}/?ref=${referralCode}`
  - [x] 3.6 Use `NEXT_PUBLIC_SITE_URL` env var (or fallback to `https://mynewstyle.com`) for base URL construction
  - [x] 3.7 Write unit tests: returns 401 when unauthenticated, returns existing code for user with code, creates new code for user without code, returns correct link format — 6 tests all pass

- [x] Task 4: Client-Side Referral Capture (AC: #2, #3, #10)
  - [x] 4.1 Create `src/lib/referral/capture.ts` — client-side referral capture utility
  - [x] 4.2 Export `captureReferralFromUrl(): void` — reads `ref` from current URL search params, stores in `localStorage` under key `mynewstyle_ref` with `{code: string, capturedAt: ISO string}` JSON value. Does NOT overwrite existing attribution (first-touch).
  - [x] 4.3 Export `getStoredReferralCode(): string | null` — reads from localStorage, checks 30-day expiry, returns code or null (clears expired entries)
  - [x] 4.4 Export `clearReferralCode(): void` — removes from localStorage
  - [x] 4.5 Created `src/components/referral/ReferralCapture.tsx` client component, mounted in `src/app/layout.tsx` via `<Suspense>` — runs on app load and when search params change
  - [x] 4.6 Write unit tests: captures ref param, respects first-touch (no overwrite), expires after 30 days, handles missing/empty ref gracefully, returns null for expired codes — 12 tests all pass

- [x] Task 5: Include Referral Code in Consultation Start (AC: #4)
  - [x] 5.1 Modify `src/app/api/consultation/start/route.ts` — added optional `referralCode` field to the Zod schema (string, max 8 chars, alphanumeric, optional)
  - [x] 5.2 When `referralCode` is present in the request body, stored on consultation record's `referral_code` field
  - [x] 5.3 Modified `src/lib/consultation/submit.ts` to include `getStoredReferralCode()` in the payload
  - [x] 5.4 Write unit tests: consultation start with referral code stores it, without referral code leaves null, invalid format rejected — 6 tests all pass

- [x] Task 6: ReferralLinkCard Component (AC: #6)
  - [x] 6.1 Create `src/components/profile/ReferralLinkCard.tsx` — client component displayed on profile page
  - [x] 6.2 Fetches referral link from `GET /api/referral/code` on mount
  - [x] 6.3 Displays: referral URL in a styled read-only display field, "Copiar link" button
  - [x] 6.4 Copy button uses `navigator.clipboard.writeText()` with fallback to `document.execCommand('copy')` for older browsers
  - [x] 6.5 On successful copy, shows toast via `sonner`: "Link copiado!" (success type)
  - [x] 6.6 Loading state: skeleton shimmer matching card dimensions (`data-testid="referral-skeleton"`)
  - [x] 6.7 Error state: inline error with "Tentar novamente" retry button
  - [x] 6.8 Style: uses `Card` component from shadcn/ui, Copy/Check/Link icons from lucide-react
  - [x] 6.9 Added `ReferralLinkCard` to `src/components/profile/ProfilePage.tsx` below the tabs section
  - [x] 6.10 Write component tests: renders referral link, copy button triggers clipboard, loading state renders skeleton, error state renders retry — 7 tests all pass

- [x] Task 7: "Convidar amigos" Button on Results Footer (AC: #7)
  - [x] 7.1 Modified `src/components/consultation/ResultsActionsFooter.tsx` to add "Convidar amigos" button with `UserPlus` icon
  - [x] 7.2 Button behavior: if `navigator.share` is available, opens native share sheet with `{ title: 'mynewstyle', text: 'Descubra o corte perfeito para o seu rosto!', url: referralLink }`
  - [x] 7.3 Fallback: if Web Share API not available, copies referral link to clipboard and shows toast "Link copiado!"
  - [x] 7.4 For authenticated users: attempts to fetch referral link from `GET /api/referral/code`; also checks localStorage for stored referral code
  - [x] 7.5 For guest users: uses base URL `https://mynewstyle.com` as fallback
  - [x] 7.6 Write unit tests: share button renders, UserPlus icon present, Web Share API called when available, clipboard fallback works — 5 tests all pass

- [x] Task 8: Write Integration Tests (all ACs)
  - [x] 8.1 Created `src/test/referral-code-api.test.ts` — 6 tests (401 for unauth, existing code, new code creation, link format)
  - [x] 8.2 Created `src/test/referral-capture.test.ts` — 12 tests (localStorage read/write, first-touch, 30-day expiry, cleanup)
  - [x] 8.3 Created `src/test/referral-generate-code.test.ts` — 9 tests (deterministic, format, uniqueness)
  - [x] 8.4 Created `src/test/referral-link-card.test.tsx` — 7 tests (fetch and display, copy interaction, loading/error states)
  - [x] 8.5 Created `src/test/referral-results-footer.test.tsx` — 5 tests ("Convidar amigos" button, Web Share API, clipboard fallback)
  - [x] 8.6 Created `src/test/consultation-start-referral.test.ts` — 6 tests (referral code stored, null when absent, invalid format rejected)

## Dev Notes

### Architecture Patterns and Constraints

- **Supabase Auth is fully implemented** (Epic 8). The referral code API route MUST use the authenticated Supabase client (`src/lib/supabase/auth-server.ts`) for RLS-aware queries. Service role client (`src/lib/supabase/server.ts`) is ONLY for server-side operations that need to bypass RLS (e.g., inserting the referral_code row in the referral_codes table if using service role for initial insert).
- **Referral code generation must be deterministic.** Do NOT use `crypto.randomUUID()` — use a hash of the user's ID so the same user always gets the same code. This avoids multiple codes per user and simplifies the lookup.
- **First-touch attribution for referral tracking.** The `localStorage` referral code must NOT be overwritten if it already exists. This ensures the first referrer gets credit, preventing attribution gaming.
- **30-day expiry on referral attribution.** Store `capturedAt` timestamp alongside the code in localStorage. Check expiry on read.
- **The `referral_code` column on `consultations` is for analytics only.** No business logic depends on it in this story. Future stories (Epic 12 or post-MVP) may add referral rewards.
- **Guest users clicking referral links**: The referral code is stored in `localStorage` (client-side), so it works regardless of authentication state. When the guest eventually starts a consultation (authenticated or not), the code is sent along.
- **No admin UI is needed** — referral analytics are queryable via Supabase SQL dashboard or future Epic 10 analytics.

### Tech Stack Versions (Relevant)

- **Next.js 16.1.6** (App Router) — API routes in `src/app/api/`, middleware in `src/middleware.ts`
- **Supabase JS v2.98.0** — `@supabase/supabase-js` + `@supabase/ssr` v0.9.0
- **Zod v4.3.6** — input validation on all API routes
- **Vitest v4.0.18** — testing framework
- **React Testing Library v16.3.2** — component tests
- **sonner v2.0.7** — toast notifications (already used in the project for success/error messages)
- **lucide-react v0.575.0** — icons (use `UserPlus`, `Copy`, `Check`, `Link` as appropriate)
- **shadcn/ui** — Card, Button, Skeleton, Badge components
- **Zustand v5.0.11** — store (no changes needed for this story — referral is localStorage-based)
- **Framer Motion v12.34.3** — animations (optional for card reveal on profile page)

### Testing Standards

- Unit tests for API routes with mocked Supabase client in `src/test/`
- Component tests using `@testing-library/react` with `vitest` + `jsdom`
- Naming convention: `src/test/<feature-name>.test.ts(x)`
- Mock external dependencies: `navigator.clipboard`, `navigator.share`, `localStorage`, `fetch`, Supabase client
- All tests follow established pattern: mock external dependencies, test behavior not implementation
- Mock `next/navigation` (`useRouter`, `useSearchParams`) in component tests

### Project Structure Notes

- New files:
  - `src/lib/referral/generate-code.ts` — deterministic referral code generation from user UUID
  - `src/lib/referral/capture.ts` — client-side referral capture and localStorage management
  - `src/app/api/referral/code/route.ts` — GET referral code API
  - `src/components/profile/ReferralLinkCard.tsx` — referral link card for profile page
  - `src/components/referral/ReferralCapture.tsx` — root-level client component for URL param capture
  - `supabase/migrations/YYYYMMDDHHMMSS_add_referral_infrastructure.sql` — referral_codes table + consultations.referral_code column
  - `src/test/referral-code-api.test.ts`
  - `src/test/referral-capture.test.ts`
  - `src/test/referral-generate-code.test.ts`
  - `src/test/referral-link-card.test.tsx`
  - `src/test/referral-results-footer.test.tsx`
  - `src/test/consultation-start-referral.test.ts`
- Modified files:
  - `src/app/layout.tsx` — mount `ReferralCapture` client component
  - `src/app/api/consultation/start/route.ts` — add optional `referralCode` field to schema and persist to record
  - `src/components/profile/ProfilePage.tsx` — add `ReferralLinkCard` below tabs
  - `src/components/consultation/ResultsActionsFooter.tsx` — add "Convidar amigos" button
  - `src/types/index.ts` — extend `ConsultationRecord` with optional `referral_code` field (if not already present)

### Anti-Pattern Prevention

- DO NOT use `crypto.randomUUID()` for referral codes — they must be deterministic (same user = same code). Use a SHA-256 hash of user ID + salt.
- DO NOT overwrite existing referral attribution in localStorage — first-touch wins.
- DO NOT create a separate page for referral management — it lives on the profile page as a card.
- DO NOT add referral reward logic — this story is TRACKING INFRASTRUCTURE ONLY. Rewards are explicitly deferred (epics file: "Future: referral rewards (not MVP, just tracking infrastructure)").
- DO NOT use the service role Supabase client for the GET /api/referral/code route — use the RLS-aware authenticated client from `src/lib/supabase/auth-server.ts`. Exception: the INSERT of a new referral code row may need service role if the RLS policy only allows SELECT for authenticated users.
- DO NOT store the referral code in the Zustand consultation store — use localStorage directly for simplicity and cross-session persistence.
- DO NOT make the referral code visible in the URL after initial capture — read it from `window.location.search` once, store it, and let normal navigation clear it.
- DO NOT add middleware-level URL rewriting for `?ref=` — keep the implementation simple with a client-side capture component.
- DO NOT block page rendering on referral code fetch — the ReferralLinkCard should show a skeleton/loading state while fetching.
- DO NOT create long referral codes — keep them 6-8 characters for easy sharing and readability in URLs.

### Previous Story Intelligence

- **Story 8-6 (User Profile & History)** established the profile page at `src/app/profile/page.tsx` with a `ProfilePage.tsx` client component. The `ReferralLinkCard` should be added BELOW the existing Tabs section in `ProfilePage.tsx`.
- **Story 8-6** established the auth-checked API route pattern using `src/lib/supabase/auth-server.ts`. The referral code API should follow the exact same pattern.
- **Story 8-6** established Supabase migration conventions: file naming `YYYYMMDDHHMMSS_<description>.sql`, REVOKE ALL before GRANT, RLS enabled on all tables.
- **Story 8-4 (Guest Session Management)** established `localStorage` usage patterns for cross-session persistence (similar to how referral codes should be stored).
- **Story 6-7 (Results Actions Footer)** created `src/components/consultation/ResultsActionsFooter.tsx` with action buttons. The "Convidar amigos" button should follow the same pattern (Button component, icon, theme-aware styling).
- **Story 3-6 (Questionnaire Completion)** established the consultation start API call pattern. The referral code inclusion must be added at this call site.
- **Epic 8 commit convention**: `feat(epic-9): implement story 9-5-referral-link`
- **All 1791 tests currently pass** — zero regressions allowed.

### Git Intelligence

- Latest commits are Epic 8 (Auth & User Profile). Epic 9 is brand new territory.
- Commit convention: `feat(epic-N): implement story N-X-story-name`
- File patterns: components in `src/components/`, hooks in `src/hooks/`, libs in `src/lib/`, tests in `src/test/`, API routes in `src/app/api/`, pages in `src/app/`
- Migration files in `supabase/migrations/` with timestamp prefix
- No share or referral infrastructure exists yet — all files in this story are new except for the modifications listed above.

### Referral Code Algorithm Detail

```typescript
// src/lib/referral/generate-code.ts
import { createHash } from 'crypto';

const REFERRAL_SALT = process.env.REFERRAL_CODE_SALT || 'mynewstyle-referral-v1';

export function generateReferralCode(userId: string): string {
  const hash = createHash('sha256')
    .update(`${userId}:${REFERRAL_SALT}`)
    .digest('hex');
  // Take first 7 chars of hex hash, convert to uppercase
  // This gives ~268M unique codes (16^7), far more than needed
  return hash.slice(0, 7).toUpperCase();
}
```

### Referral Capture Client Component Pattern

```typescript
// src/components/referral/ReferralCapture.tsx
'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { captureReferralFromUrl } from '@/lib/referral/capture';

export function ReferralCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    captureReferralFromUrl();
  }, [searchParams]);

  return null; // Invisible component
}
```

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#E9 S9.5] — Story definition: unique referral code, link format `mynewstyle.com/?ref=CODE`, track referral source in analytics, future referral rewards (not MVP, just tracking infrastructure)
- [Source: _bmad-output/planning-artifacts/architecture.md#3.1 Entity Relationship] — `consultations` table structure (add `referral_code` column), `analytics_events` table (future tracking)
- [Source: _bmad-output/planning-artifacts/architecture.md#3.2 Row-Level Security] — RLS patterns: REVOKE ALL, then GRANT specific permissions
- [Source: _bmad-output/planning-artifacts/architecture.md#5.1 Consultation Flow] — POST /api/consultation/start (add referralCode to payload)
- [Source: _bmad-output/planning-artifacts/architecture.md#6.1 Project Structure] — `src/components/share/` directory (not yet created), `src/lib/utils/share.ts` (not yet created)
- [Source: _bmad-output/planning-artifacts/architecture.md#7.1 Authentication] — Supabase Auth with JWT, guest sessions with localStorage
- [Source: _bmad-output/planning-artifacts/ux-design.md#7 Sharing & Virality] — JTBD for sharing: show friends, show barber, flex cool tool. SCAMPER: combine share + referral link
- [Source: _bmad-output/planning-artifacts/prd.md#Business & Monetization Model] — Referral tracking as growth mechanism
- [Source: src/lib/supabase/auth-server.ts] — Authenticated Supabase client helper for RLS-aware queries
- [Source: src/lib/supabase/server.ts] — Service role client (use sparingly, only for admin operations)
- [Source: src/lib/supabase/client.ts] — Browser Supabase client
- [Source: src/components/profile/ProfilePage.tsx] — Profile page where ReferralLinkCard will be added
- [Source: src/components/consultation/ResultsActionsFooter.tsx] — Results footer where "Convidar amigos" button will be added
- [Source: src/app/api/consultation/start/route.ts] — Consultation start API route to modify
- [Source: src/stores/consultation.ts] — Zustand store (do NOT store referral data here)
- [Source: src/app/layout.tsx] — Root layout where ReferralCapture component will be mounted
- [Source: _bmad-output/implementation-artifacts/8-6-user-profile-and-history.md] — Previous story: profile page patterns, auth API route patterns, migration conventions

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No significant debug issues encountered. All tasks implemented cleanly on first attempt.

### Completion Notes List

- Task 1: Created Supabase migration with `referral_codes` table (RLS, REVOKE/GRANT, index) and `consultations.referral_code` column with partial index.
- Task 2: Implemented deterministic code generation using SHA-256 hex hash (first 7 chars uppercased). 9 unit tests pass.
- Task 3: GET /api/referral/code route uses RLS-aware client (auth-server.ts) for SELECT, service role client for INSERT (RLS only GRANTs SELECT to authenticated users per migration). Handles race conditions via unique constraint violation retry. 6 tests pass.
- Task 4: Client-side capture utility uses `window.location.search` for URL param reading. ReferralCapture component mounted in root layout via Suspense. First-touch attribution preserved. 30-day expiry enforced on read. 12 tests pass.
- Task 5: Added `referralCode` Zod field (optional, max 8 chars, alphanumeric) to consultation start schema. Modified `src/lib/consultation/submit.ts` to call `getStoredReferralCode()` and include in payload. 6 tests pass. Existing 10 consultation-submit tests still pass.
- Task 6: ReferralLinkCard uses Card from shadcn/ui, skeleton loading state, inline error with retry, clipboard copy with execCommand fallback. 7 component tests pass. Added to ProfilePage below Tabs.
- Task 7: Added "Convidar amigos" button with UserPlus icon. Uses localStorage referral code first, then falls back to API fetch, then to base URL for guests. Web Share API with clipboard fallback. 5 tests pass.
- Task 8: 45 new tests total across 6 test files. All 1974 tests pass (zero regressions). Updated 4 existing test files (results-actions-footer, barber-card-integration, share-card-square-integration, profile-page) to add UserPlus/referral icon mocks and URL-aware fetch mocks.

### File List

- supabase/migrations/20260302300000_add_referral_infrastructure.sql (new)
- src/lib/referral/generate-code.ts (new)
- src/lib/referral/capture.ts (new)
- src/components/referral/ReferralCapture.tsx (new)
- src/app/api/referral/code/route.ts (new)
- src/components/profile/ReferralLinkCard.tsx (new)
- src/test/referral-generate-code.test.ts (new)
- src/test/referral-capture.test.ts (new)
- src/test/referral-code-api.test.ts (new)
- src/test/consultation-start-referral.test.ts (new)
- src/test/referral-link-card.test.tsx (new)
- src/test/referral-results-footer.test.tsx (new)
- src/app/api/consultation/start/route.ts (modified — added referralCode Zod field, referral_code on record)
- src/lib/consultation/submit.ts (modified — include getStoredReferralCode() in payload)
- src/components/profile/ProfilePage.tsx (modified — added ReferralLinkCard below tabs)
- src/components/consultation/ResultsActionsFooter.tsx (modified — added "Convidar amigos" button with UserPlus)
- src/app/layout.tsx (modified — mounted ReferralCapture component via Suspense)
- src/types/index.ts (modified — added referral_code to ConsultationRecord, referralCode to ConsultationStartPayload)
- src/test/results-actions-footer.test.tsx (modified — added UserPlus to lucide-react mock)
- src/test/results-actions-footer-share.test.tsx (modified — added UserPlus to lucide-react mock)
- src/test/barber-card-integration.test.tsx (modified — added UserPlus to lucide-react mock)
- src/test/share-card-square-integration.test.tsx (modified — added UserPlus to lucide-react mock)
- src/test/profile-page.test.tsx (modified — added referral icons to lucide-react mock, URL-aware fetch mock for /api/referral/code)

## Senior Developer Review (AI)

**Reviewer:** Fusuma on 2026-03-02
**Review Status:** APPROVED (issues fixed during review)

### Findings Summary
- **0 Critical** | **1 High (fixed)** | **3 Medium (fixed)** | **1 Low (fixed)**

### HIGH Issues Fixed

1. **[FIXED] AC #2 Violation — `clearReferralCode()` never called after consultation start**
   - `clearReferralCode()` was exported from `src/lib/referral/capture.ts` but never called anywhere.
   - AC #2 requires the referral attribution to be cleared "until a consultation is started".
   - **Fix**: Added `clearReferralCode()` import and call in `src/lib/consultation/submit.ts` immediately after a successful API response.
   - **Tests added**: 3 new tests in `src/test/consultation-submit.test.ts` covering clear-on-success, preserve-on-failure, and referral code in payload.

### MEDIUM Issues Fixed

2. **[FIXED] Hardcoded `https://mynewstyle.com` in `ResultsActionsFooter.tsx`**
   - Lines 88 and 94 of `ResultsActionsFooter.tsx` used hardcoded base URL for the invite share link, inconsistent with the API route using `NEXT_PUBLIC_SITE_URL`.
   - **Fix**: Updated `handleInviteFriends` to use `process.env.NEXT_PUBLIC_SITE_URL || 'https://mynewstyle.com'` as the base URL.

3. **[FIXED] Confusing redundant conditional logic in `GET /api/referral/code` route**
   - The original `if (!selectError || selectError.code === 'PGRST116') { ... } else if (selectError.code !== 'PGRST116') { ... }` pattern had a dead inner condition (`else if` was always true in that branch).
   - **Fix**: Refactored to a cleaner, inverted guard: `if (selectError && selectError.code !== 'PGRST116') { return 500; }` followed by a simple `if (existingRow?.referral_code) { return code; }`.

4. **[FIXED] `REFERRAL_CODE_SALT` env var missing from `.env.example`**
   - The `generate-code.ts` uses `process.env.REFERRAL_CODE_SALT` as a security salt for referral code generation, but the variable was undocumented.
   - **Fix**: Added `REFERRAL_CODE_SALT` with documentation comment to `.env.example`.

### LOW Issues (cosmetic, no action needed)

5. Migration timestamp `20260302300000` has an impossible time component (hour=30). Supabase uses the number purely for ordering, so this is functionally harmless. Consistent with the project's convention of using offset numbers (`000000`, `120000`, `200000`, `300000`) rather than real clock times.

### Final Test Count
- All 1977 tests pass (was 1974 before review; 3 new tests added for `clearReferralCode` behavior in submit.ts)

---

## Change Log

- 2026-03-02: Code review by AI (claude-sonnet-4-6) — fixed AC #2 violation (clearReferralCode not called after submission), fixed hardcoded site URL in ResultsActionsFooter, refactored confusing conditional in referral API route, documented REFERRAL_CODE_SALT in .env.example. Added 3 tests. All 1977 tests pass.
- 2026-03-02: Implemented Story 9.5 — complete referral link infrastructure including DB migration, code generation utility, API route, client-side capture, consultation integration, ReferralLinkCard component, "Convidar amigos" footer button, and 45 new tests. All 1974 tests pass.
