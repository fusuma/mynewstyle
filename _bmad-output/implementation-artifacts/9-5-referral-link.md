# Story 9.5: Referral Link

Status: ready-for-dev

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

- [ ] Task 1: Database Migration — Referral Infrastructure (AC: #8, #9)
  - [ ] 1.1 Create Supabase migration `supabase/migrations/YYYYMMDDHHMMSS_add_referral_infrastructure.sql`
  - [ ] 1.2 Create `referral_codes` table: `id (uuid PK DEFAULT gen_random_uuid())`, `user_id (uuid FK references auth.users NOT NULL UNIQUE)`, `referral_code (varchar(8) NOT NULL UNIQUE)`, `created_at (timestamptz DEFAULT now())`
  - [ ] 1.3 Enable RLS on `referral_codes` table
  - [ ] 1.4 Create RLS policy: authenticated users can SELECT their own row (`user_id = auth.uid()`)
  - [ ] 1.5 REVOKE ALL ON referral_codes FROM anon, authenticated; GRANT SELECT ON referral_codes TO authenticated
  - [ ] 1.6 Add index on `referral_codes.referral_code` for lookup performance
  - [ ] 1.7 Add `referral_code` column (varchar(8), nullable) to `consultations` table: `ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS referral_code VARCHAR(8) NULL`
  - [ ] 1.8 Add index on `consultations.referral_code` for analytics queries: `CREATE INDEX IF NOT EXISTS idx_consultations_referral_code ON public.consultations (referral_code) WHERE referral_code IS NOT NULL`

- [ ] Task 2: Referral Code Generation Utility (AC: #1)
  - [ ] 2.1 Create `src/lib/referral/generate-code.ts` — deterministic code generation from user UUID
  - [ ] 2.2 Algorithm: take first 8 chars of SHA-256 hex hash of `user_id + REFERRAL_SALT` (salt from env var `REFERRAL_CODE_SALT` or fallback constant). Convert to uppercase alphanumeric (base36 encoding of the hash prefix, 6-8 chars). Ensure output is URL-safe and case-insensitive.
  - [ ] 2.3 Export `generateReferralCode(userId: string): string`
  - [ ] 2.4 Write unit tests: deterministic (same input = same output), correct length (6-8 chars), URL-safe characters only, different users produce different codes

- [ ] Task 3: Referral Code API Route (AC: #5, #9)
  - [ ] 3.1 Create `src/app/api/referral/code/route.ts` — GET route
  - [ ] 3.2 Auth check: extract user from Supabase Auth session; return 401 if not authenticated
  - [ ] 3.3 Query `referral_codes` table for `user_id = auth.uid()`
  - [ ] 3.4 If no row exists, generate code via `generateReferralCode(userId)`, INSERT into `referral_codes` (handle unique constraint violation with retry using different salt iteration), return the new code
  - [ ] 3.5 Return JSON: `{ referralCode: string, referralLink: string }` where `referralLink` = `https://mynewstyle.com/?ref=${referralCode}`
  - [ ] 3.6 Use `NEXT_PUBLIC_SITE_URL` env var (or fallback to `https://mynewstyle.com`) for base URL construction
  - [ ] 3.7 Write unit tests: returns 401 when unauthenticated, returns existing code for user with code, creates new code for user without code, returns correct link format

- [ ] Task 4: Client-Side Referral Capture (AC: #2, #3, #10)
  - [ ] 4.1 Create `src/lib/referral/capture.ts` — client-side referral capture utility
  - [ ] 4.2 Export `captureReferralFromUrl(): void` — reads `ref` from current URL search params, stores in `localStorage` under key `mynewstyle_ref` with `{code: string, capturedAt: ISO string}` JSON value. Does NOT overwrite existing attribution (first-touch).
  - [ ] 4.3 Export `getStoredReferralCode(): string | null` — reads from localStorage, checks 30-day expiry, returns code or null (clears expired entries)
  - [ ] 4.4 Export `clearReferralCode(): void` — removes from localStorage
  - [ ] 4.5 Call `captureReferralFromUrl()` in the root layout component (`src/app/layout.tsx`) or a dedicated `ReferralCapture` client component mounted in the root layout — runs once on app load
  - [ ] 4.6 Write unit tests: captures ref param, respects first-touch (no overwrite), expires after 30 days, handles missing/empty ref gracefully, returns null for expired codes

- [ ] Task 5: Include Referral Code in Consultation Start (AC: #4)
  - [ ] 5.1 Modify `src/app/api/consultation/start/route.ts` — add optional `referralCode` field to the Zod schema (string, max 8 chars, alphanumeric, optional)
  - [ ] 5.2 When `referralCode` is present in the request body, store it on the consultation record's `referral_code` column
  - [ ] 5.3 Modify the client-side consultation submission (in `src/app/consultation/questionnaire/page.tsx` or wherever the POST call is made) to include `getStoredReferralCode()` in the payload
  - [ ] 5.4 Write unit tests: consultation start with referral code stores it, consultation start without referral code leaves column null, invalid referral code format is rejected

- [ ] Task 6: ReferralLinkCard Component (AC: #6)
  - [ ] 6.1 Create `src/components/profile/ReferralLinkCard.tsx` — client component displayed on profile page
  - [ ] 6.2 Fetches referral link from `GET /api/referral/code` on mount
  - [ ] 6.3 Displays: referral URL in a styled read-only input/display field, "Copiar link" button
  - [ ] 6.4 Copy button uses `navigator.clipboard.writeText()` with fallback to `document.execCommand('copy')` for older browsers
  - [ ] 6.5 On successful copy, show toast via `sonner`: "Link copiado!" (success type)
  - [ ] 6.6 Loading state: skeleton shimmer matching card dimensions
  - [ ] 6.7 Error state: subtle inline error with retry
  - [ ] 6.8 Style: uses `Card` component from shadcn/ui, accent-colored copy button, gender-themed via ThemeProvider
  - [ ] 6.9 Add `ReferralLinkCard` to profile page (`src/components/profile/ProfilePage.tsx`) below the tabs section
  - [ ] 6.10 Write component tests: renders referral link, copy button triggers clipboard, loading state renders skeleton, error state renders retry

- [ ] Task 7: "Convidar amigos" Button on Results Footer (AC: #7)
  - [ ] 7.1 Modify `src/components/consultation/ResultsActionsFooter.tsx` to add "Convidar amigos" button (with `Users` or `UserPlus` icon from lucide-react)
  - [ ] 7.2 Button behavior: if `navigator.share` is available (Web Share API), open native share sheet with `{ title: 'mynewstyle', text: 'Descubra o corte perfeito para o seu rosto!', url: referralLink }`
  - [ ] 7.3 Fallback: if Web Share API not available, copy referral link to clipboard and show toast "Link copiado!"
  - [ ] 7.4 For authenticated users: fetch referral link from `GET /api/referral/code`
  - [ ] 7.5 For guest users: use the base URL without referral code (`https://mynewstyle.com`)
  - [ ] 7.6 Write unit tests: share button renders, authenticated user gets personalized link, guest gets base URL, Web Share API called when available, clipboard fallback works

- [ ] Task 8: Write Integration Tests (all ACs)
  - [ ] 8.1 Create `src/test/referral-code-api.test.ts` — API route tests: 401 for unauth, creates code on first call, returns same code on subsequent calls, correct link format
  - [ ] 8.2 Create `src/test/referral-capture.test.ts` — unit tests for client-side capture: localStorage read/write, first-touch preservation, 30-day expiry, cleanup
  - [ ] 8.3 Create `src/test/referral-generate-code.test.ts` — unit tests for code generation: deterministic, correct format, uniqueness across different UUIDs
  - [ ] 8.4 Create `src/test/referral-link-card.test.tsx` — component tests: fetch and display, copy interaction, loading/error states
  - [ ] 8.5 Create `src/test/referral-results-footer.test.tsx` — component tests: "Convidar amigos" button for auth and guest users, Web Share API and clipboard fallback
  - [ ] 8.6 Create `src/test/consultation-start-referral.test.ts` — API route test: referral code included in consultation record

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

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
