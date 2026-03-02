# Story 8.6: User Profile & History

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a registered user,
I want to see my past consultations and favorite recommendations in a profile page,
so that I can revisit results, reference recommendations at the barber, and track my style journey over time.

## Acceptance Criteria

1. The profile page is accessible at `/profile` and requires authentication. Unauthenticated users are redirected to `/login` with a `?redirect=/profile` query parameter.
2. The profile page has two tabs: "Consultorias" (consultations history) and "Favoritos" (favorites), with "Consultorias" selected by default.
3. The "Consultorias" tab displays consultation history cards sorted by date (newest first). Each card shows: consultation date, face shape badge, gender indicator, top recommendation thumbnail (style name), and a "Ver novamente" button.
4. Tapping "Ver novamente" navigates to `/consultation/results/:id` to display the full saved consultation results.
5. The "Favoritos" tab displays a responsive grid of saved/favorited recommendations. Each card shows: style name, match score, face shape badge, and the consultation date it came from.
6. Tapping a favorite card navigates to the parent consultation results page.
7. Empty states are displayed with illustrations and a CTA: "Ainda nao tem consultorias. Descubra o seu estilo!" for empty history, and "Guarde os seus estilos favoritos aqui" for empty favorites.
8. The profile page header displays the user's display name (or email if no display name) and a gender-themed design matching the user's `gender_preference` from their profile.
9. All data is fetched via API routes (`GET /api/profile/consultations`, `GET /api/profile/favorites`) that enforce RLS (user can only see their own data).
10. The profile page is responsive: single column on mobile, two-column grid for favorites on tablet+.

## Tasks / Subtasks

- [ ] Task 1: Create Profile API Routes (AC: #9)
  - [ ] 1.1 Create `src/app/api/profile/consultations/route.ts` — GET route that fetches user's consultations with joined recommendations (top rank=1), face_analysis, ordered by `created_at DESC`
  - [ ] 1.2 Implement auth check: extract user from Supabase Auth session (`supabase.auth.getUser()` using the request cookie/Authorization header); return 401 if not authenticated
  - [ ] 1.3 Query: `SELECT c.id, c.gender, c.face_analysis, c.status, c.payment_status, c.created_at, c.completed_at, r.style_name, r.match_score FROM consultations c LEFT JOIN recommendations r ON r.consultation_id = c.id AND r.rank = 1 WHERE c.user_id = :userId AND c.payment_status = 'paid' ORDER BY c.created_at DESC LIMIT 50`
  - [ ] 1.4 Return JSON: `{ consultations: ConsultationHistoryItem[] }`
  - [ ] 1.5 Create `src/app/api/profile/favorites/route.ts` — GET route that fetches user's favorites with joined recommendation and consultation data
  - [ ] 1.6 Query: `SELECT f.id, f.created_at AS favorited_at, r.id AS recommendation_id, r.style_name, r.match_score, r.consultation_id, c.face_analysis, c.gender, c.created_at AS consultation_date FROM favorites f JOIN recommendations r ON r.id = f.recommendation_id JOIN consultations c ON c.id = r.consultation_id WHERE f.user_id = :userId ORDER BY f.created_at DESC LIMIT 100`
  - [ ] 1.7 Return JSON: `{ favorites: FavoriteItem[] }`
  - [ ] 1.8 Validate inputs with Zod (pagination params if added later); handle errors consistently (401 for unauth, 500 for DB errors)

- [ ] Task 2: Create Auth-Aware Supabase Client Helper (AC: #9)
  - [ ] 2.1 Create `src/lib/supabase/auth-server.ts` — a helper that creates a Supabase client from the incoming request's cookies or Authorization header, enabling RLS-aware queries as the authenticated user
  - [ ] 2.2 Implement `createAuthenticatedSupabaseClient(request: Request)` that reads the `sb-access-token` and `sb-refresh-token` from cookies (or `Authorization: Bearer` header) and creates a Supabase client with the user's session
  - [ ] 2.3 This is distinct from `server.ts` (service role, bypasses RLS) — this client respects RLS policies
  - [ ] 2.4 Write unit tests for the helper

- [ ] Task 3: Create Profile Page Route and Auth Guard (AC: #1, #8)
  - [ ] 3.1 Create `src/app/profile/page.tsx` — server component that checks auth status
  - [ ] 3.2 If not authenticated, redirect to `/login?redirect=/profile` using `redirect()` from `next/navigation`
  - [ ] 3.3 If authenticated, fetch user profile data (display_name, gender_preference) and render the `ProfilePage` client component
  - [ ] 3.4 Pass initial profile data as props to avoid client-side re-fetch

- [ ] Task 4: Create ProfilePage Client Component (AC: #2, #8, #10)
  - [ ] 4.1 Create `src/components/profile/ProfilePage.tsx` — main profile client component with tab navigation
  - [ ] 4.2 Implement tab switching between "Consultorias" and "Favoritos" using URL search params (`?tab=consultorias` / `?tab=favoritos`) for shareable/bookmarkable URLs
  - [ ] 4.3 Display user's display name (or email fallback) in header
  - [ ] 4.4 Apply gender-themed styling based on `gender_preference` from profile (dark theme for male, light theme for female, neutral if null)
  - [ ] 4.5 Responsive layout: full-width on mobile, max-width 1200px centered on desktop

- [ ] Task 5: Create ConsultationHistoryTab Component (AC: #3, #4, #7)
  - [ ] 5.1 Create `src/components/profile/ConsultationHistoryTab.tsx` — fetches and displays consultation history
  - [ ] 5.2 Use `useSWR` or `useEffect` + `fetch` to call `GET /api/profile/consultations`
  - [ ] 5.3 Create `src/components/profile/ConsultationHistoryCard.tsx` — individual card with: formatted date, face shape badge (reuse existing `Badge` component from design system), gender icon, top recommendation style name, "Ver novamente" button
  - [ ] 5.4 "Ver novamente" button navigates to `/consultation/results/:consultationId` using `next/navigation` `useRouter().push()`
  - [ ] 5.5 Loading state: skeleton cards (3 shimmer placeholders)
  - [ ] 5.6 Empty state: illustration + "Ainda nao tem consultorias. Descubra o seu estilo!" + CTA button linking to `/start`
  - [ ] 5.7 Error state: retry button with error message

- [ ] Task 6: Create FavoritesTab Component (AC: #5, #6, #7)
  - [ ] 6.1 Create `src/components/profile/FavoritesTab.tsx` — fetches and displays favorites grid
  - [ ] 6.2 Use `useSWR` or `useEffect` + `fetch` to call `GET /api/profile/favorites`
  - [ ] 6.3 Create `src/components/profile/FavoriteCard.tsx` — individual card with: style name, match score badge, face shape badge, consultation date
  - [ ] 6.4 Tapping a favorite card navigates to `/consultation/results/:consultationId`
  - [ ] 6.5 Responsive grid: 1 column mobile, 2 columns tablet+, 3 columns desktop
  - [ ] 6.6 Loading state: skeleton grid cards
  - [ ] 6.7 Empty state: illustration + "Guarde os seus estilos favoritos aqui" + CTA linking to `/start`

- [ ] Task 7: Database — Favorites Table and RLS (AC: #5, #9)
  - [ ] 7.1 Create Supabase migration: `favorites` table with columns: `id (uuid PK DEFAULT gen_random_uuid())`, `user_id (uuid FK references auth.users NOT NULL)`, `recommendation_id (uuid FK references recommendations NOT NULL)`, `created_at (timestamptz DEFAULT now())`
  - [ ] 7.2 Add unique constraint on `(user_id, recommendation_id)` to prevent duplicate favorites
  - [ ] 7.3 Enable RLS on `favorites` table
  - [ ] 7.4 Create RLS policies: SELECT where `user_id = auth.uid()`, INSERT where `user_id = auth.uid()`, DELETE where `user_id = auth.uid()`
  - [ ] 7.5 REVOKE ALL ON favorites FROM anon, authenticated; then GRANT SELECT, INSERT, DELETE ON favorites TO authenticated
  - [ ] 7.6 Add index on `favorites.user_id` for query performance
  - [ ] 7.7 Add migration SQL file to `supabase/migrations/` following naming convention

- [ ] Task 8: Add TypeScript Types for Profile Data (AC: #3, #5)
  - [ ] 8.1 Add `ConsultationHistoryItem` interface to `src/types/index.ts`: `{ id: string; gender: 'male' | 'female'; faceShape: FaceShape; confidence: number; status: string; paymentStatus: string; createdAt: string; completedAt: string | null; topRecommendation: { styleName: string; matchScore: number } | null }`
  - [ ] 8.2 Add `FavoriteItem` interface to `src/types/index.ts`: `{ id: string; favoritedAt: string; recommendationId: string; styleName: string; matchScore: number; consultationId: string; faceShape: FaceShape; gender: 'male' | 'female'; consultationDate: string }`
  - [ ] 8.3 Add `UserProfile` interface to `src/types/index.ts`: `{ id: string; displayName: string | null; genderPreference: 'male' | 'female' | null; createdAt: string }`

- [ ] Task 9: Write Tests (all ACs)
  - [ ] 9.1 Create `src/test/profile-consultations-route.test.ts` — API route tests: returns 401 when unauthenticated, returns consultation list for authenticated user, returns empty array for user with no consultations
  - [ ] 9.2 Create `src/test/profile-favorites-route.test.ts` — API route tests: returns 401 when unauthenticated, returns favorites for authenticated user, returns empty array for user with no favorites
  - [ ] 9.3 Create `src/test/consultation-history-card.test.tsx` — component tests: renders date, face shape badge, style name; "Ver novamente" navigates correctly
  - [ ] 9.4 Create `src/test/favorite-card.test.tsx` — component tests: renders style name, match score, face shape; tap navigates to consultation
  - [ ] 9.5 Create `src/test/profile-page.test.tsx` — component tests: tab switching works, empty states render, loading states render
  - [ ] 9.6 Create `src/test/profile-auth-guard.test.ts` — auth redirect test: unauthenticated user redirected to login

## Dev Notes

### Architecture Patterns and Constraints

- **Supabase Auth is a prerequisite** (Story 8-1). This story MUST assume Supabase Auth is fully configured with JWT sessions. If auth is not yet implemented when this story is picked up, Stories 8-1 through 8-5 must be completed first.
- **RLS is mandatory for all profile queries.** The profile API routes must use an authenticated Supabase client (respecting RLS), NOT the service role client. The service role client (`src/lib/supabase/server.ts`) bypasses RLS and must NOT be used for user-facing data queries.
- **Data model reference:** The `profiles` table has `id (FK to auth.users)`, `display_name`, `gender_preference`, `created_at`, `updated_at`. The `consultations` table has `user_id (FK to profiles)`. The `favorites` table has `user_id (FK to auth.users)`, `recommendation_id (FK to recommendations)`. The `recommendations` table has `consultation_id (FK)`, `rank`, `style_name`, `match_score`.
- **No `src/app/profile/` directory exists yet.** This story creates it from scratch.
- **No login/register pages exist yet.** Stories 8-2 and 8-3 create them. The auth guard redirect to `/login?redirect=/profile` assumes that page will exist. If it does not exist at dev time, use a fallback redirect to `/` (landing page).
- **Existing consultation results page** at `src/app/consultation/results/[id]/page.tsx` — the "Ver novamente" button in consultation history must navigate to this existing route, not create a new one.
- **Existing components to reuse:**
  - `Badge` component from shadcn/ui for face shape badges and match score badges
  - `Card` component from shadcn/ui for consultation history and favorite cards
  - Face shape badge styling patterns from `src/components/consultation/FaceShapeReveal.tsx`
  - Theme provider from `src/components/layout/ThemeProvider.tsx` for gender-based theming
  - `lucide-react` icons: `User`, `Star`, `Calendar`, `ChevronRight`, `Heart`
- **Framer Motion** for tab transitions and card reveal animations (staggered 150ms per card, matching results page pattern)
- **No pagination in v1** — limit to 50 consultations and 100 favorites. Pagination can be added in a future story if needed.

### Tech Stack Versions (Relevant)

- **Next.js 16.1.6** (App Router) — API routes in `src/app/api/`, pages in `src/app/`
- **Supabase JS v2.98.0** — `@supabase/supabase-js`
- **Zustand v5.0.11** — with `persist` middleware to `sessionStorage`
- **Zod v4.3.6** — for input validation on all API routes
- **Vitest v4.0.18** — testing framework
- **React Testing Library v16.3.2** — component tests
- **Framer Motion v12.34.3** — animations
- **lucide-react v0.575.0** — icons
- **shadcn/ui** — component library (Button, Card, Badge, Tabs, Skeleton)

### Testing Standards

- Unit tests for API routes with mocked Supabase client in `src/test/`
- Component tests for profile components using `@testing-library/react`
- Naming convention: `src/test/<feature-name>.test.ts(x)`
- Use `vitest` with `jsdom` environment for component tests
- All tests follow established pattern: mock external dependencies, test behavior not implementation
- Mock `next/navigation` (`useRouter`, `useSearchParams`, `redirect`) in component tests

### Project Structure Notes

- New files:
  - `src/app/profile/page.tsx` — profile page route (server component with auth guard)
  - `src/app/api/profile/consultations/route.ts` — consultation history API
  - `src/app/api/profile/favorites/route.ts` — favorites list API
  - `src/lib/supabase/auth-server.ts` — authenticated Supabase client helper
  - `src/components/profile/ProfilePage.tsx` — main profile client component
  - `src/components/profile/ConsultationHistoryTab.tsx` — history tab
  - `src/components/profile/ConsultationHistoryCard.tsx` — individual history card
  - `src/components/profile/FavoritesTab.tsx` — favorites tab
  - `src/components/profile/FavoriteCard.tsx` — individual favorite card
  - `src/components/profile/EmptyState.tsx` — reusable empty state with illustration + CTA
  - `supabase/migrations/YYYYMMDDHHMMSS_add_favorites_table.sql` — favorites table + RLS
  - `src/test/profile-consultations-route.test.ts`
  - `src/test/profile-favorites-route.test.ts`
  - `src/test/consultation-history-card.test.tsx`
  - `src/test/favorite-card.test.tsx`
  - `src/test/profile-page.test.tsx`
  - `src/test/profile-auth-guard.test.ts`
- Modified files:
  - `src/types/index.ts` — add `ConsultationHistoryItem`, `FavoriteItem`, `UserProfile` interfaces

### Anti-Pattern Prevention

- DO NOT use the service role Supabase client (`createServerSupabaseClient()`) for profile data queries — it bypasses RLS. Create an authenticated client that respects RLS.
- DO NOT fetch all consultation fields (especially `questionnaire_responses` jsonb) in the history list — only fetch what the card needs (id, gender, face_analysis.faceShape, face_analysis.confidence, status, created_at, top recommendation).
- DO NOT create a separate favorites "add/remove" API in this story — the favorites table creation and read API are in scope. The "add/remove favorite" action is likely triggered from the results page and may need a small addition there, but the primary CRUD should be a simple POST/DELETE endpoint. Include the POST and DELETE endpoints alongside the GET.
- DO NOT store consultation results in the Zustand store when navigating from profile — let the results page fetch fresh data by consultation ID.
- DO NOT build a custom tab component — use shadcn/ui `Tabs` component (`TabsList`, `TabsTrigger`, `TabsContent`).
- DO NOT hardcode Portuguese strings — use them directly as per the UX spec but keep them in one place for future i18n.
- DO NOT use `useEffect` for data fetching without proper cleanup and error handling — prefer a pattern with loading/error/data states.
- DO NOT skip the auth check on API routes — every profile endpoint MUST verify the user session before querying.
- DO NOT create the `profiles` table — it should already exist from Story 8-1 (Supabase Auth Setup). If it does not exist, document the dependency.

### Previous Story Intelligence

- **Story 8-4 (Guest Session Management)** established the guest session pattern. The profile page is ONLY for authenticated users. Guests see the `GuestSaveBanner.tsx` prompting registration — they do NOT access `/profile`.
- **Story 8-4** also established that `src/lib/supabase/server.ts` uses the service role key (bypasses RLS). For profile queries, a new authenticated client helper is needed that respects RLS.
- **Story 8-4** established the API header pattern with `x-guest-session-id`. The profile API routes do NOT use guest headers — they require full authentication.
- **Story 6-7 (Results Actions Footer)** created `src/components/consultation/ResultsActionsFooter.tsx` which has a "Guardar" (save) button — this button should eventually trigger the favorites POST API created in this story. However, wiring the save button is NOT in scope for this story — it will be connected in a follow-up or the dev agent can add it as a bonus if straightforward.
- **Stories 6-1 through 6-8** established the results page component patterns (cards, badges, animations). Reuse these patterns for consistency.
- **Story 1-1 (Design System)** established the dual theme system (male dark / female light). The profile page must use `ThemeProvider` and adapt based on the user's `gender_preference`.

### Git Intelligence

- Recent commits are all Epic 7 (preview generation) and a "mark epic-7 as done" chore commit. No auth or profile code exists yet.
- Commit convention: `feat(epic-8): implement story 8-6-user-profile-and-history`
- File patterns: components in `src/components/`, hooks in `src/hooks/`, tests in `src/test/`, API routes in `src/app/api/`, pages in `src/app/`

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#3.1 Entity Relationship] — `profiles` table schema (id, display_name, gender_preference), `consultations` table (user_id FK), `favorites` table (user_id FK, recommendation_id FK), `recommendations` table (consultation_id, rank, style_name, match_score)
- [Source: _bmad-output/planning-artifacts/architecture.md#3.2 Row-Level Security] — RLS policies for profiles (users read/update own), consultations (user-scoped), recommendations (cascade from consultation access)
- [Source: _bmad-output/planning-artifacts/architecture.md#6.1 Project Structure] — `src/app/profile/page.tsx` (consultation history), `src/app/profile/favorites/page.tsx` (saved styles)
- [Source: _bmad-output/planning-artifacts/architecture.md#7.1 Authentication] — Supabase Auth with JWT, 24h expiry, auto-refresh
- [Source: _bmad-output/planning-artifacts/ux-design.md#3.8 Profile & History] — Tab-based layout: "Consultorias" | "Favoritos"; history cards with date, face shape badge, top recommendation, "Ver novamente"; favorites as grid of saved recommendations
- [Source: _bmad-output/planning-artifacts/ux-design.md#8.3 Empty States] — "Ainda nao tem consultorias" illustration + CTA, "Guarde os seus estilos favoritos aqui"
- [Source: _bmad-output/planning-artifacts/ux-design.md#2.3 Guest vs Auth Flow] — Auth required for history, favorites, second consultation
- [Source: _bmad-output/planning-artifacts/prd.md#User Profile & History] — FR28 (consultation history with dates and results), FR29 (favorite/save styles), FR30 (start new consultation), FR31 (view previously generated previews)
- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#E8 S8.6] — Story definition with acceptance criteria
- [Source: src/app/consultation/results/[id]/page.tsx] — Existing results page route that "Ver novamente" navigates to
- [Source: src/components/consultation/FaceShapeReveal.tsx] — Face shape badge styling to reuse
- [Source: src/components/consultation/ResultsActionsFooter.tsx] — "Guardar" button that will connect to favorites API
- [Source: src/lib/supabase/server.ts] — Service role client (DO NOT use for profile queries)
- [Source: src/lib/supabase/client.ts] — Browser client (anon key)
- [Source: src/stores/consultation.ts] — Zustand store structure (do not store profile data here)
- [Source: _bmad-output/implementation-artifacts/8-4-guest-session-management.md] — Previous story: guest patterns, auth client patterns, API header patterns

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
