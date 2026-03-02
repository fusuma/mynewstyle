# Story 10.4: Funnel Analytics

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a business owner,
I want to track the conversion funnel from landing to share,
so that I can identify drop-off points, optimize conversion, and make data-driven decisions about the user experience.

## Acceptance Criteria

1. A SQL view (or set of SQL queries) computes the full 10-step conversion funnel: `landing` -> `gender_selected` -> `photo_captured` -> `questionnaire_completed` -> `face_analysis_completed` -> `paywall_shown` -> `payment_completed` -> `consultation_completed` -> `preview_requested` -> `share_generated`. Each step shows total count and drop-off rate relative to the previous step.
2. Funnel data is segmentable by gender (`male`/`female`) and device type (`mobile`/`desktop`/`tablet`). Gender is extracted from the `event_data` jsonb field or from the linked consultation record. Device type is derived from `device_info` jsonb field in the `analytics_events` table.
3. A weekly summary query produces a report covering the prior 7 days: total users entering each funnel step, drop-off percentage per step, overall landing-to-payment conversion rate, overall landing-to-share conversion rate, and comparison deltas vs the previous 7-day period.
4. An admin API route `GET /api/admin/funnel-analytics` returns the funnel data as JSON. Accepts optional query parameters: `gender` (male|female), `device` (mobile|desktop|tablet), `from` (ISO date), `to` (ISO date), `period` (daily|weekly|monthly — defaults to weekly). Protected by the same `ADMIN_SECRET` pattern used in `/api/admin/ai-cost-summary`.
5. A second admin API route `GET /api/admin/funnel-analytics/weekly-summary` returns the weekly comparison report (current 7 days vs previous 7 days). Same ADMIN_SECRET auth.
6. All funnel queries operate on the `analytics_events` table created by story 10-1. If the table does not exist yet, the API routes return a clear error: `{ error: "analytics_events table not available", hint: "Complete story 10-1 first" }`.
7. Funnel computation handles edge cases: users who skip steps (e.g. returning users who skip gender selection), users who enter at non-landing steps (deep links), and duplicate events for the same session/step (count unique sessions per step, not raw event count).
8. SQL views/functions are created via a Supabase migration file so they are version-controlled and reproducible across environments.

## Tasks / Subtasks

- [x] Task 1: Supabase Migration — Funnel SQL Views (AC: #1, #2, #7, #8)
  - [x] 1.1 Create migration file `supabase/migrations/YYYYMMDDHHMMSS_add_funnel_analytics_views.sql`
  - [x] 1.2 Create SQL function `funnel_counts(from_date timestamptz, to_date timestamptz, gender_filter text DEFAULT NULL, device_filter text DEFAULT NULL)` that returns a table of (step_name text, step_order int, unique_sessions bigint, previous_step_sessions bigint, dropoff_rate numeric). Uses `COUNT(DISTINCT session_id)` per `event_type` from `analytics_events`, filtered by date range and optional gender/device. Handle missing steps gracefully (coalesce to 0).
  - [x] 1.3 Funnel step mapping: `landing` (event_type='page_view' AND event_data->>'page'='landing' OR event_type='landing_visited'), `gender_selected`, `photo_captured`, `questionnaire_completed`, `face_analysis_completed`, `paywall_shown`, `payment_completed`, `consultation_completed`, `preview_requested`, `share_generated`. The exact event_type values must align with the enum defined in story 10-1 and the architecture's AnalyticsEvent type union.
  - [x] 1.4 Device type extraction: `device_info->>'deviceType'` (expected values: 'mobile', 'desktop', 'tablet'). If device_info is null, classify as 'unknown'.
  - [x] 1.5 Gender extraction: `event_data->>'gender'` from gender_selected event, or joined from `consultations.gender` via `analytics_events.session_id`. For funnel queries, filter all steps for sessions where the gender_selected event matches the filter.
  - [x] 1.6 Create SQL function `funnel_weekly_summary(reference_date date DEFAULT CURRENT_DATE)` that returns current 7-day funnel + previous 7-day funnel + delta percentages per step. Reuses `funnel_counts` internally.
  - [x] 1.7 Add index `CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type)` and `CREATE INDEX IF NOT EXISTS idx_analytics_events_session_step ON analytics_events(session_id, event_type)` for funnel query performance.

- [x] Task 2: Admin API Route — Funnel Analytics (AC: #4, #6)
  - [x] 2.1 Create `src/app/api/admin/funnel-analytics/route.ts` — GET route
  - [x] 2.2 Reuse the `isAuthorized(request)` pattern from `src/app/api/admin/ai-cost-summary/route.ts` (extract to shared util if not already shared, or duplicate the pattern inline)
  - [x] 2.3 Parse query params: `gender` (optional, validate against 'male'|'female'), `device` (optional, validate against 'mobile'|'desktop'|'tablet'), `from` (optional, ISO date string, default 7 days ago), `to` (optional, ISO date string, default now), `period` (optional, default 'weekly')
  - [x] 2.4 Call the `funnel_counts` SQL function via `supabase.rpc('funnel_counts', { from_date, to_date, gender_filter, device_filter })`
  - [x] 2.5 Return JSON: `{ funnel: Array<{ step: string, order: number, sessions: number, previousStepSessions: number, dropoffRate: number }>, filters: { gender, device, from, to }, generatedAt: ISO string }`
  - [x] 2.6 Graceful degradation: if RPC call fails with "relation analytics_events does not exist" or similar, return 503 with `{ error: "analytics_events table not available", hint: "Complete story 10-1 first" }`

- [x] Task 3: Admin API Route — Weekly Summary (AC: #5, #6)
  - [x] 3.1 Create `src/app/api/admin/funnel-analytics/weekly-summary/route.ts` — GET route
  - [x] 3.2 Same ADMIN_SECRET auth check
  - [x] 3.3 Call `funnel_weekly_summary` SQL function via `supabase.rpc('funnel_weekly_summary', { reference_date })`
  - [x] 3.4 Return JSON: `{ currentWeek: { from, to, funnel: [...] }, previousWeek: { from, to, funnel: [...] }, deltas: Array<{ step: string, currentSessions: number, previousSessions: number, deltaPercent: number }>, overallConversion: { landingToPayment: { current: number, previous: number, delta: number }, landingToShare: { current: number, previous: number, delta: number } }, generatedAt: ISO string }`

- [x] Task 4: Tests (AC: all)
  - [x] 4.1 Unit test for funnel-analytics route: returns 401 without ADMIN_SECRET, returns funnel data with valid auth, respects gender/device/date filters, returns 503 when analytics_events table missing
  - [x] 4.2 Unit test for weekly-summary route: returns 401 without ADMIN_SECRET, returns comparison data, includes delta calculations
  - [x] 4.3 Integration test: verify SQL function returns correct funnel shape with mock data (if Supabase local dev available), or verify API response shape matches expected contract

## Dev Notes

### Architecture Patterns and Constraints

- **Admin auth pattern**: Reuse the exact `ADMIN_SECRET` bearer token / query param pattern from `/api/admin/ai-cost-summary/route.ts`. The `isAuthorized(request)` function checks `process.env.ADMIN_SECRET` against the `Authorization: Bearer <secret>` header or `?secret=<value>` query param.
- **Supabase RPC**: Use `supabase.rpc()` to call PostgreSQL functions. The server Supabase client is created via `createServerSupabaseClient()` from `@/lib/supabase/server`.
- **analytics_events table schema** (from architecture, created in story 10-1):
  ```
  analytics_events
    id (uuid, PK)
    session_id (uuid)
    user_id (nullable)
    event_type (enum/text)
    event_data (jsonb)
    created_at (timestamptz)
    device_info (jsonb)
  ```
- **Event types** (from architecture AnalyticsEvent type): `gender_selected`, `photo_captured`, `photo_rejected`, `questionnaire_started`, `questionnaire_completed`, `questionnaire_abandoned`, `face_analysis_completed`, `paywall_shown`, `payment_completed`, `payment_failed`, `consultation_completed`, `preview_requested`, `preview_completed`, `barber_card_generated`, `share_generated`, `results_rated`. For funnel purposes, a landing event needs to be inferred from page_view data or a dedicated `landing_visited` event type.
- **No ORM**: Raw SQL functions for analytics. This is consistent with the ai-cost-summary approach that queries Supabase tables directly.
- **Next.js 16+ with App Router**: API routes use `export async function GET(request: NextRequest)` pattern.
- **TypeScript strict mode**: All types must be explicit. Use Zod for input validation on query params if complexity warrants it, but simple string validation is acceptable for admin routes (matching ai-cost-summary pattern).

### Tech Stack Versions

- Next.js 16.1.6 (App Router)
- Supabase JS v2.98.0
- Zod v4.3.6 (only if needed for query param validation)
- TypeScript strict mode
- PostgreSQL (Supabase-managed)

### Source Tree — Files to Create/Modify

**Create:**
- `supabase/migrations/YYYYMMDDHHMMSS_add_funnel_analytics_views.sql` — SQL functions for funnel computation
- `src/app/api/admin/funnel-analytics/route.ts` — Funnel analytics admin API
- `src/app/api/admin/funnel-analytics/weekly-summary/route.ts` — Weekly comparison admin API

**Tests to create:**
- `src/test/funnel-analytics-api.test.ts` — Unit tests for funnel analytics route
- `src/test/funnel-weekly-summary-api.test.ts` — Unit tests for weekly summary route

**Do NOT modify:**
- `src/lib/utils/analytics.ts` — This file is for client-side event emission (story 10-1 scope). Funnel analytics is server-side querying only.
- `src/app/api/admin/ai-cost-summary/route.ts` — Reference only for auth pattern. Do not refactor shared auth unless it is trivial (e.g. extracting `isAuthorized` to a shared file). If extraction is done, keep ai-cost-summary working identically.

### Testing Standards

- Tests in `src/test/` directory (project convention)
- Mock Supabase RPC calls — do not require a running database
- Test auth (401 without secret), happy path (funnel data shape), error handling (503 for missing table), and filter application
- Follow test patterns from `src/test/referral-code-api.test.ts` and `src/test/consultation-start-referral.test.ts` for API route testing

### Project Structure Notes

- Admin API routes are under `src/app/api/admin/` — already established pattern (ai-cost-summary exists there)
- Supabase migrations in `supabase/migrations/` — use timestamp prefix format matching existing: `YYYYMMDDHHMMSS_descriptive_name.sql`
- SQL functions (not views) are preferred for parameterized queries. Views cannot accept parameters.
- No frontend UI is required for this story — admin queries the API directly or uses Supabase Dashboard

### Key Implementation Warnings

1. **Do NOT create a frontend dashboard** — this story is backend/SQL only. The admin queries the API with curl or Supabase Dashboard.
2. **Do NOT modify the analytics event tracking** — that is story 10-1 scope. This story only reads from the analytics_events table.
3. **Funnel must use unique session counts** — not raw event counts. A user who fires `photo_captured` three times (retries) should count as 1 session in the funnel.
4. **Handle the "no analytics_events table" case gracefully** — stories 10-1 through 10-3 may not be implemented yet. Return 503 with a helpful error, never crash.
5. **The isAuthorized function** in ai-cost-summary returns false if ADMIN_SECRET env var is not set (denies all access). Maintain this safety behavior.
6. **PostgreSQL function naming**: Use snake_case. Use `CREATE OR REPLACE FUNCTION` for idempotency.
7. **Drop-off rate calculation**: `dropoff_rate = 1 - (current_step_sessions / previous_step_sessions)`. Handle division by zero (if previous step has 0 sessions, dropoff is 0 or null).

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#E10] — Story S10.4 acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 9] — Observability stack, analytics events type definition
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 3.1] — analytics_events table schema
- [Source: src/app/api/admin/ai-cost-summary/route.ts] — ADMIN_SECRET auth pattern, Supabase server query pattern
- [Source: src/lib/supabase/server.ts] — createServerSupabaseClient import
- [Source: src/lib/utils/analytics.ts] — Existing analytics event types (client-side, reference only)
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 9.2] — AnalyticsEvent type union with all event types

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No blocking issues encountered. All tasks completed in a single pass.

### Completion Notes List

- Implemented `funnel_counts` SQL function with `COUNT(DISTINCT session_id)` per step (AC #7), LEFT JOIN against a static VALUES list so missing steps coalesce to 0 (AC #7), and `LAG()` window function for previous-step session counts.
- Implemented `funnel_weekly_summary` SQL function that internally calls `funnel_counts` for two 7-day windows and builds a delta comparison JSONB object.
- Performance indexes added on `event_type` and `(session_id, event_type)` (AC #8).
- `funnel_counts` landing step matches both `landing_visited` and `page_view` with `event_data->>'page' = 'landing'` (AC #1).
- Gender filter implemented by first collecting matching session IDs from `gender_selected` events, then filtering all funnel steps (AC #2, #5).
- Device filter via `device_info->>'deviceType'` (AC #2, #4).
- Drop-off rate uses `ROUND(1.0 - (current/previous), 6)` with NULL guard for division by zero (AC #1).
- Both API routes use the shared `isAuthorized()` from `@/lib/admin/auth` (AC #4, #5).
- Both routes return 503 with `{ error: "analytics_events table not available", hint: "Complete story 10-1 first" }` for PostgreSQL 42P01 or message-matching errors (AC #6).
- 34 unit tests written and passing: 19 for funnel-analytics route and 15 for weekly-summary route.
- Full test suite (2145 tests) passes with zero regressions.

### File List

- supabase/migrations/20260302700000_add_funnel_analytics_views.sql
- src/app/api/admin/funnel-analytics/route.ts
- src/app/api/admin/funnel-analytics/weekly-summary/route.ts
- src/test/funnel-analytics-api.test.ts
- src/test/funnel-weekly-summary-api.test.ts
- _bmad-output/implementation-artifacts/10-4-funnel-analytics.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

### Change Log

- 2026-03-02: Implemented Story 10.4 Funnel Analytics — created SQL migration with `funnel_counts` and `funnel_weekly_summary` PostgreSQL functions, two admin API routes, and 34 unit tests covering auth, happy path, filter application, and graceful error handling for missing table.
