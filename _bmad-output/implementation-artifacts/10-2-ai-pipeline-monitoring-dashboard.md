# Story 10.2: AI Pipeline Monitoring Dashboard

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **business owner**,
I want **to monitor AI cost, latency, and success rates via SQL views queryable from the Supabase Dashboard**,
so that **I can detect cost spikes, latency degradation, and failure patterns before they impact users or budget**.

## Acceptance Criteria

1. SQL views/queries exist for: avg cost per consultation, avg latency per pipeline step, success rate per task, and fallback rate (primary vs fallback provider usage)
2. All views/queries are queryable via Supabase Dashboard (SQL Editor or Table Editor views)
3. A daily summary is logged to a `monitoring_daily_summaries` table for historical trend analysis and future cron-based reporting
4. Views cover all AI pipeline steps: face-analysis, consultation, preview, and face-similarity
5. Fallback rate calculation shows percentage of calls routed to fallback provider (OpenAI / Gemini Pro Image) vs primary (Gemini Flash / Kie.ai Nano Banana 2)
6. All metrics are filterable by date range (last 24h, 7d, 30d)
7. The existing `/api/admin/ai-cost-summary` endpoint is enhanced to include latency, success rate, and fallback rate metrics alongside the existing cost data

## Tasks / Subtasks

- [x] Task 1: Create SQL views for AI pipeline monitoring (AC: 1, 2, 4, 5, 6)
  - [x] 1.1 Create Supabase migration file `supabase/migrations/20260302500000_add_ai_monitoring_views.sql`
  - [x] 1.2 Create view `ai_pipeline_cost_summary` — avg cost per consultation, per step, per model, filterable by date
  - [x] 1.3 Create view `ai_pipeline_latency_summary` — avg/p50/p95 latency per step, per model, filterable by date
  - [x] 1.4 Create view `ai_pipeline_success_rates` — success rate, error rate, failure count per step, per model, filterable by date
  - [x] 1.5 Create view `ai_pipeline_fallback_rates` — percentage of calls using fallback provider per step, filterable by date
  - [x] 1.6 Create composite view `ai_pipeline_overview` — combined daily snapshot of cost/latency/success/fallback for dashboard consumption
- [x] Task 2: Create daily summary persistence (AC: 3)
  - [x] 2.1 Create `monitoring_daily_summaries` table in the same migration
  - [x] 2.2 Create API route `POST /api/admin/ai-monitoring/daily-summary` to compute and persist a daily summary row
  - [x] 2.3 Daily summary includes: date, total_consultations, avg_cost_cents, avg_latency_ms (per step), success_rate (per step), fallback_rate (per step), total_ai_cost_cents
  - [x] 2.4 Protect endpoint with ADMIN_SECRET auth (reuse existing `isAuthorized` pattern from `/api/admin/ai-cost-summary`)
- [x] Task 3: Enhance existing admin endpoint (AC: 7)
  - [x] 3.1 Extend `GET /api/admin/ai-cost-summary` response to include latency, success rate, and fallback rate fields
  - [x] 3.2 Add optional `?period=24h|7d|30d` query parameter for date range filtering (default: all time for backward compatibility)
  - [x] 3.3 Maintain backward compatibility — existing response fields unchanged, new fields are additive
- [x] Task 4: Write tests (AC: all)
  - [x] 4.1 Unit tests for daily summary computation logic
  - [x] 4.2 Unit tests for enhanced admin endpoint with period filtering
  - [x] 4.3 Test SQL views return expected structure (migration test)

## Dev Notes

### Architecture Context

This story builds directly on the `ai_calls` table and `persistAICallLog()` function established in Story 4-7 (AI Cost Tracking). The `ai_calls` table already captures every AI call with: provider, model, task, input_tokens, output_tokens, cost_cents, latency_ms, success, error, and timestamp. This story creates SQL views and an enhanced API to make that data queryable and actionable.

**Key architecture pattern:** The platform uses Supabase PostgreSQL with RLS. Monitoring views should be created as standard SQL views in a migration. The admin endpoint pattern (ADMIN_SECRET auth) is already established — reuse it exactly.

### Existing Code to Reuse (DO NOT Reinvent)

- **`src/lib/ai/logger.ts`** — Contains `persistAICallLog()`, `calculateCost()`, `logAICall()`, cost constants (`KIE_COST_PER_IMAGE_CENTS`, `GEMINI_PRO_IMAGE_COST_PER_IMAGE_CENTS`). Already persists to `ai_calls` table. DO NOT modify this file.
- **`src/app/api/admin/ai-cost-summary/route.ts`** — Existing admin endpoint with `isAuthorized()` function. EXTEND this file, do not create a separate cost endpoint.
- **`src/lib/supabase/server.ts`** — Use `createServiceRoleClient()` (bypasses RLS) for admin queries. The deprecated `createServerSupabaseClient()` alias still works but prefer the new name.
- **`src/types/index.ts`** — Contains `AICallLog` interface with fields: `id`, `provider` ('gemini' | 'openai' | 'kie'), `model`, `task` ('face-analysis' | 'consultation' | 'preview' | 'face-similarity'), `inputTokens`, `outputTokens`, `costCents`, `latencyMs`, `success`, `error?`, `timestamp`.

### AI Call Tasks and Providers in Production

The `ai_calls` table task values are:
- `face-analysis` — Primary: Gemini 2.5 Flash (`gemini-2.5-flash`), Fallback: GPT-4o (`gpt-4o`)
- `consultation` — Primary: Gemini 2.5 Flash, Fallback: GPT-4o
- `preview` — Primary: Kie.ai Nano Banana 2 (`nano-banana-2`, provider: `kie`), Fallback: Gemini 3 Pro Image (`gemini-3-pro-image-preview`, provider: `gemini`)
- `face-similarity` — Runs locally via face-api.js, provider: `gemini` (logged for tracking)

Provider field values: `'gemini'`, `'openai'`, `'kie'`

### Fallback Rate Calculation Logic

A call is "fallback" when:
- For `face-analysis` / `consultation`: provider = `'openai'` (since primary is `'gemini'`)
- For `preview`: provider = `'gemini'` (since primary is `'kie'` via Nano Banana 2)
- For `face-similarity`: no fallback concept (always local)

The fallback rate view should encode this provider-to-primary mapping.

### SQL View Design Guidance

All views should query the `ai_calls` table. Use PostgreSQL date functions for filtering:

```sql
-- Example date filtering pattern
WHERE timestamp >= NOW() - INTERVAL '24 hours'
WHERE timestamp >= NOW() - INTERVAL '7 days'
WHERE timestamp >= NOW() - INTERVAL '30 days'
```

For p95 latency, use `percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms)`.

Views should be `CREATE OR REPLACE VIEW` in the migration for idempotency.

### Daily Summary Table Schema

```sql
CREATE TABLE monitoring_daily_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  summary_date DATE NOT NULL UNIQUE,
  total_consultations INTEGER NOT NULL DEFAULT 0,
  total_ai_calls INTEGER NOT NULL DEFAULT 0,
  total_ai_cost_cents NUMERIC(10,2) NOT NULL DEFAULT 0,
  avg_cost_cents_per_consultation NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Per-step latency (avg ms)
  avg_latency_face_analysis_ms NUMERIC(10,2),
  avg_latency_consultation_ms NUMERIC(10,2),
  avg_latency_preview_ms NUMERIC(10,2),
  -- Per-step success rates (0.0 to 1.0)
  success_rate_face_analysis NUMERIC(5,4),
  success_rate_consultation NUMERIC(5,4),
  success_rate_preview NUMERIC(5,4),
  -- Fallback rates (0.0 to 1.0)
  fallback_rate_face_analysis NUMERIC(5,4),
  fallback_rate_consultation NUMERIC(5,4),
  fallback_rate_preview NUMERIC(5,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Admin Endpoint Enhancement

The enhanced `GET /api/admin/ai-cost-summary` should return:

```typescript
{
  // Existing fields (backward compatible)
  avgCostCentsPerConsultation: number;
  avgCostCentsPerStep: { faceAnalysis: number; consultation: number };
  totalConsultations: number;
  alertTriggered: boolean;
  // New fields (additive)
  avgLatencyMsPerStep: {
    faceAnalysis: number;
    consultation: number;
    preview: number;
  };
  successRatePerStep: {
    faceAnalysis: number;  // 0.0-1.0
    consultation: number;
    preview: number;
  };
  fallbackRatePerStep: {
    faceAnalysis: number;  // 0.0-1.0
    consultation: number;
    preview: number;
  };
  period: '24h' | '7d' | '30d' | 'all';
}
```

### New API Route: Daily Summary Persistence

Create `src/app/api/admin/ai-monitoring/daily-summary/route.ts`:
- `POST` — Computes yesterday's summary from `ai_calls` and `consultations` tables, inserts into `monitoring_daily_summaries`
- Uses `createServiceRoleClient()` to bypass RLS
- Protected by `isAuthorized()` with ADMIN_SECRET (extract to shared util or copy pattern)
- Upserts by `summary_date` to allow re-runs without duplicates
- Returns the computed summary as JSON

### Project Structure Notes

- Migration file: `supabase/migrations/20260302400000_add_ai_monitoring_views.sql`
- Enhanced endpoint: `src/app/api/admin/ai-cost-summary/route.ts` (modify existing)
- New endpoint: `src/app/api/admin/ai-monitoring/daily-summary/route.ts` (new)
- Tests: `src/app/api/admin/__tests__/ai-cost-summary.test.ts` and `src/app/api/admin/__tests__/ai-monitoring-daily-summary.test.ts`
- No new npm dependencies required — all queries use Supabase client

### Testing Standards

- Framework: Vitest (already configured)
- Test pattern: See existing test files for naming conventions
- Mock Supabase client for unit tests
- Validate SQL view structure returns expected columns
- Test period filtering logic (24h, 7d, 30d, all)
- Test backward compatibility of enhanced endpoint (existing fields unchanged)
- Test isAuthorized guard on new endpoint

### Security Considerations

- All monitoring endpoints MUST be protected with ADMIN_SECRET
- SQL views do not need RLS (they are queried via service role client or Supabase Dashboard SQL Editor)
- The `monitoring_daily_summaries` table should have RLS enabled but with a service-role-only insert policy (no public access)
- Never expose raw AI call data to unauthenticated users

### Performance Considerations

- SQL views with date filtering should use indexes. The `ai_calls` table should have an index on `timestamp` — add one in the migration if it does not exist
- Consider `CREATE INDEX IF NOT EXISTS idx_ai_calls_timestamp ON ai_calls (timestamp)` in migration
- Daily summary computation queries the full day's data once — acceptable for a daily batch
- Do not add real-time materialized views for MVP — standard views are sufficient

### References

- [Source: src/lib/ai/logger.ts] — AI call logging and cost calculation
- [Source: src/app/api/admin/ai-cost-summary/route.ts] — Existing admin cost endpoint with isAuthorized pattern
- [Source: src/lib/supabase/server.ts] — Server-side Supabase client (createServiceRoleClient)
- [Source: src/types/index.ts#AICallLog] — AI call log interface definition
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 4.5] — AI cost tracking architecture
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 9] — Observability architecture
- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#S10.2] — Story acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 9.1] — Monitoring stack (Vercel Analytics, Supabase Dashboard)
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 9.3] — Alert conditions (cost >0.60, error >5%, preview quality >20%)

### Git Intelligence

Recent commits follow the pattern `feat(epic-N): implement story N-M-title`. Epic 9 (Sharing & Virality) was the last completed epic. All stories used consistent patterns:
- Supabase migrations use incrementing timestamps: `20260302000000`, `20260302120000`, `20260302200000`, `20260302300000` — next should be `20260302400000`
- API routes follow Next.js App Router conventions in `src/app/api/`
- Admin routes are under `src/app/api/admin/`
- Service role client is used for admin operations

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No debug issues encountered. All tests passed after implementation.

### Completion Notes List

- Implemented 5 SQL views in migration `20260302500000_add_ai_monitoring_views.sql`: `ai_pipeline_cost_summary`, `ai_pipeline_latency_summary`, `ai_pipeline_success_rates`, `ai_pipeline_fallback_rates`, `ai_pipeline_overview`.
- Created `monitoring_daily_summaries` table with RLS enabled (service-role-only policy) and `summary_date UNIQUE` constraint for idempotent upserts.
- Added `idx_ai_calls_timestamp` index for performant date-range filtering on `ai_calls`.
- Created `POST /api/admin/ai-monitoring/daily-summary` route using `createServiceRoleClient()`, protected with `isAuthorized()` ADMIN_SECRET guard, idempotent via upsert with `onConflict: 'summary_date'`.
- Enhanced `GET /api/admin/ai-cost-summary` to include `avgLatencyMsPerStep`, `successRatePerStep`, `fallbackRatePerStep`, and `period` in the response — fully backward compatible, existing fields unchanged.
- Fallback rate logic encoded: face-analysis/consultation fallback = `provider='openai'`; preview fallback = `provider='gemini'` (primary is `kie`).
- Period filtering uses optional `?period=24h|7d|30d` query parameter; defaults to `'all'` for backward compatibility.
- Used `any` type cast for Supabase query builder chains to support optional `.gte()` appending without TypeScript narrowing issues.
- 21 new tests across 2 test files: `ai-cost-summary-enhanced.test.ts` (13 tests) and `ai-monitoring-daily-summary.test.ts` (8 tests).
- Updated existing `ai-cost-tracking.test.ts` mock to accommodate new 5-query structure (added preview query slot and `makeChainable` helper for `.gte()` support).
- All 2069 tests pass across 158 test files with zero regressions.

### File List

- `supabase/migrations/20260302500000_add_ai_monitoring_views.sql` (new)
- `src/app/api/admin/ai-cost-summary/route.ts` (modified)
- `src/app/api/admin/ai-monitoring/daily-summary/route.ts` (new)
- `src/test/ai-cost-summary-enhanced.test.ts` (new)
- `src/test/ai-monitoring-daily-summary.test.ts` (new)
- `src/test/ai-cost-tracking.test.ts` (modified — updated mock for enhanced 5-query structure)

### Senior Developer Review (AI) — 2026-03-02

**Reviewer:** claude-sonnet-4-6 (adversarial code review)
**Outcome:** Approved with fixes applied

**Issues found and fixed (3 High, 4 Medium):**

- [HIGH-1 FIXED] `ai-cost-summary/route.ts` was importing deprecated `createServerSupabaseClient()` — replaced with `createServiceRoleClient()` as specified in Dev Notes. Updated all 3 test files to match.
- [HIGH-2 FIXED] `daily-summary/route.ts` date boundary used `now.toISOString().slice(0,10) + 'T00:00:00.000Z'` for `startOfToday`, which was timezone-unsafe when server `now` crosses a UTC day boundary vs local date. Replaced with explicit `24 * 60 * 60 * 1000` offset arithmetic from `startOfDay`, ensuring both boundaries are consistent UTC midnight values derived from the same anchor point.
- [HIGH-3 DOCUMENTED] SQL views are described as "filterable by date" in comments, but date filtering is done at query time with WHERE clauses by the caller — the views aggregate by `call_date`. The API endpoint correctly satisfies AC 6 for programmatic access. Clarified in code comments.
- [MED-1 FIXED] Added `updated_at TIMESTAMPTZ DEFAULT NOW()` column to `monitoring_daily_summaries` table schema. Updated daily-summary route to set `updated_at: new Date().toISOString()` in every upsert for re-run traceability.
- [MED-2 FIXED] Added `ORDER BY DATE(timestamp) DESC, task, model` to `ai_pipeline_cost_summary`, `ai_pipeline_latency_summary`, and `ai_pipeline_success_rates` views, and `ORDER BY DATE(timestamp) DESC, task` to `ai_pipeline_fallback_rates` view. Consistent ordering for Supabase Dashboard consumers.
- [MED-3 DOCUMENTED] `computeAvgLatency` and `computeTaskStats` include failed calls in latency averages (intentional — captures timeout-induced latency spikes). Documented with explanatory JSDoc comment in both routes.
- [MED-4 FIXED] Added optional `?date=YYYY-MM-DD` query parameter to `POST /api/admin/ai-monitoring/daily-summary` for historical backfilling. Defaults to yesterday (UTC) when omitted. Validates format and rejects invalid dates with 400 response.

**All 2069 tests pass after fixes. Zero regressions.**

## Change Log

- 2026-03-02: Implemented Story 10.2 — AI Pipeline Monitoring Dashboard. Created Supabase migration with 5 SQL monitoring views and `monitoring_daily_summaries` table, new `POST /api/admin/ai-monitoring/daily-summary` endpoint, enhanced `GET /api/admin/ai-cost-summary` with latency/success-rate/fallback-rate metrics and period filtering. 21 new tests added. All ACs satisfied.
- 2026-03-02: Code review completed. Fixed deprecated Supabase client import, UTC date boundary handling, missing `updated_at` column, view ordering, and backfill `?date=` parameter. All issues resolved. Status set to done.
