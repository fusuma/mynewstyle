# Story 10.3: Cost & Quality Alerts

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want automatic alerts when AI cost, error rate, preview quality, or latency metrics degrade,
so that I can detect and respond to operational issues before they impact user experience or costs spiral.

## Acceptance Criteria

1. **Cost Alert:** When the average AI cost per consultation exceeds 25 cents (EUR 0.25) over a rolling 1-hour window, an alert is triggered. The threshold is configurable via environment variable `ALERT_COST_THRESHOLD_CENTS` (default: 25).
2. **Error Rate Alert:** When the AI error rate (failed calls / total calls) exceeds 5% within a rolling 1-hour window, an alert is triggered. The threshold is configurable via environment variable `ALERT_ERROR_RATE_PERCENT` (default: 5).
3. **Preview Quality Alert:** When the preview quality gate failure rate (previews with status "unavailable" due to quality_gate / total completed previews) exceeds 20% within a rolling 24-hour window, an alert is triggered. The threshold is configurable via environment variable `ALERT_PREVIEW_QUALITY_PERCENT` (default: 20).
4. **Latency Alert:** When the p95 latency for face-analysis AI calls exceeds 45 seconds within a rolling 1-hour window, an alert is triggered. The threshold is configurable via environment variable `ALERT_LATENCY_P95_MS` (default: 45000).
5. **Alert delivery via Supabase webhook:** Alerts are delivered by calling a configurable webhook URL (environment variable `ALERT_WEBHOOK_URL`). The webhook payload includes: alert type, current metric value, threshold value, time window, sample size, and ISO timestamp. If no webhook URL is configured, alerts are logged to the server console with `[ALERT]` prefix as a fallback.
6. **Alert check API route:** A new admin-authenticated API route `GET /api/admin/alerts/check` runs all four alert checks and returns a JSON summary of each check (metric name, current value, threshold, triggered boolean, sample size). This route uses the same `ADMIN_SECRET` authentication pattern as the existing `/api/admin/ai-cost-summary` route.
7. **Alert deduplication:** Each alert type can only fire once per time window (1 hour for cost/error/latency, 24 hours for preview quality). A simple in-memory or database-backed deduplication mechanism prevents alert fatigue. The `alert_history` table stores: id, alert_type, metric_value, threshold, triggered_at, and is used to check if an alert of the same type was already sent within the deduplication window.
8. **Alert check is callable from Vercel Cron or external cron:** The `/api/admin/alerts/check` route is designed to be called periodically (every 10-15 minutes) by Vercel Cron Jobs (configured in `vercel.json`) or an external monitoring service. The route returns results regardless of whether alerts were triggered, enabling monitoring dashboards to consume the response.
9. **All alert thresholds and time windows are queryable from the JSON response**, enabling external monitoring tools to consume and display the data. The response includes a `summary` object with all four checks and an `alertsTriggered` count.

## Tasks / Subtasks

- [x] Task 1: Database Migration — Alert History Table (AC: #7)
  - [x] 1.1 Create Supabase migration `supabase/migrations/YYYYMMDDHHMMSS_add_alert_history_table.sql`
  - [x] 1.2 Create `alert_history` table: `id (uuid PK DEFAULT gen_random_uuid())`, `alert_type (varchar(50) NOT NULL)`, `metric_value (numeric NOT NULL)`, `threshold (numeric NOT NULL)`, `sample_size (integer NOT NULL DEFAULT 0)`, `triggered_at (timestamptz DEFAULT now())`
  - [x] 1.3 Create index on `alert_history(alert_type, triggered_at)` for deduplication lookups
  - [x] 1.4 Enable RLS on `alert_history` table — no public access (service role only)
  - [x] 1.5 REVOKE ALL ON alert_history FROM anon, authenticated; — no user-facing access needed
  - [x] 1.6 Add SQL comment documenting the table purpose: "Stores alert firing history for deduplication. Accessed only by service role from /api/admin/alerts/check."

- [x] Task 2: Alert Configuration Module (AC: #1, #2, #3, #4)
  - [x] 2.1 Create `src/lib/alerts/config.ts` — defines alert threshold constants read from environment variables with defaults
  - [x] 2.2 Define `AlertType` enum: `'cost'`, `'error_rate'`, `'preview_quality'`, `'latency_p95'`
  - [x] 2.3 Define `AlertConfig` interface: `{ type: AlertType, thresholdEnvVar: string, defaultThreshold: number, windowMs: number, description: string }`
  - [x] 2.4 Export `ALERT_CONFIGS: Record<AlertType, AlertConfig>` with all four alert configurations
  - [x] 2.5 Export `getAlertThreshold(type: AlertType): number` — reads env var, falls back to default
  - [x] 2.6 Write unit tests: default values applied when env vars missing, env var overrides work, all 4 alert types defined

- [x] Task 3: Alert Metric Queries (AC: #1, #2, #3, #4)
  - [x] 3.1 Create `src/lib/alerts/metrics.ts` — Supabase queries for each metric
  - [x] 3.2 Implement `getAvgCostPerConsultation(supabase, windowMs): Promise<{ value: number, sampleSize: number }>` — queries `consultations` table for completed consultations in the time window, returns average `ai_cost_cents`
  - [x] 3.3 Implement `getErrorRate(supabase, windowMs): Promise<{ value: number, sampleSize: number }>` — queries `ai_calls` table for calls in time window, calculates `failed / total` as a percentage
  - [x] 3.4 Implement `getPreviewQualityFailureRate(supabase, windowMs): Promise<{ value: number, sampleSize: number }>` — queries `recommendations` table for previews with `preview_status` in ('ready', 'unavailable') in time window, calculates `unavailable / total` as a percentage
  - [x] 3.5 Implement `getLatencyP95(supabase, windowMs): Promise<{ value: number, sampleSize: number }>` — queries `ai_calls` table for face-analysis calls in time window, calculates p95 of `latency_ms` column
  - [x] 3.6 Each function returns `{ value: number, sampleSize: number }` — sampleSize indicates data points used (0 if no data, in which case alert is NOT triggered)
  - [x] 3.7 Write unit tests with mocked Supabase client: test each metric query returns correct values, handles empty data (returns 0 with sampleSize 0), handles edge cases

- [x] Task 4: Alert Dispatcher (AC: #5, #7)
  - [x] 4.1 Create `src/lib/alerts/dispatcher.ts` — handles alert delivery and deduplication
  - [x] 4.2 Define `AlertPayload` interface: `{ alertType: AlertType, metricValue: number, threshold: number, windowDescription: string, sampleSize: number, triggeredAt: string }`
  - [x] 4.3 Implement `isAlertDuplicate(supabase, alertType, windowMs): Promise<boolean>` — queries `alert_history` for recent alerts of the same type within the deduplication window
  - [x] 4.4 Implement `recordAlert(supabase, payload: AlertPayload): Promise<void>` — inserts into `alert_history` table
  - [x] 4.5 Implement `dispatchAlert(payload: AlertPayload): Promise<void>` — sends POST to `ALERT_WEBHOOK_URL` with JSON body. If no webhook URL configured, logs to console with `[ALERT]` prefix. Catches and logs errors (non-throwing — alert delivery is best-effort).
  - [x] 4.6 Implement `processAlert(supabase, payload: AlertPayload, windowMs: number): Promise<{ dispatched: boolean }>` — orchestrates: check duplicate → if not duplicate, dispatch alert + record in history → return whether dispatched
  - [x] 4.7 Write unit tests: deduplication prevents re-firing within window, alerts dispatch to webhook URL, fallback to console.log when no webhook URL, alert history recorded, best-effort (errors caught)

- [x] Task 5: Alert Check API Route (AC: #6, #8, #9)
  - [x] 5.1 Create `src/app/api/admin/alerts/check/route.ts` — GET route
  - [x] 5.2 Reuse the `isAuthorized()` admin authentication pattern from `src/app/api/admin/ai-cost-summary/route.ts` (extract to shared utility `src/lib/admin/auth.ts` if not already extracted)
  - [x] 5.3 For each alert type: fetch metric → compare to threshold → if triggered AND sample size > 0, process alert (deduplicate + dispatch) → build result object
  - [x] 5.4 Return JSON response with timestamp, alertsTriggered, and checks object with cost/error_rate/preview_quality/latency_p95
  - [x] 5.5 Return 401 for unauthorized requests, 500 for unexpected errors
  - [x] 5.6 Write unit tests: authorized access returns all checks, unauthorized returns 401, triggered alerts dispatched, deduplication respected, empty data (sampleSize 0) does not trigger

- [x] Task 6: Vercel Cron Configuration (AC: #8)
  - [x] 6.1 Create or update `vercel.json` with a cron job configuration calling `/api/admin/alerts/check` every 10 minutes
  - [x] 6.2 The cron endpoint must accept `Authorization: Bearer CRON_SECRET` — Vercel Cron uses `CRON_SECRET` env var automatically
  - [x] 6.3 Update `isAuthorized()` in the alerts route to also accept `CRON_SECRET` as a valid bearer token (in addition to `ADMIN_SECRET`)
  - [x] 6.4 Document in Dev Notes that `CRON_SECRET` is auto-set by Vercel for cron jobs and must also be added to local `.env` for development testing

- [x] Task 7: Update Environment Configuration (AC: #1-#5)
  - [x] 7.1 Add alert-related environment variables to `.env.example`:
    - `ALERT_COST_THRESHOLD_CENTS=25`
    - `ALERT_ERROR_RATE_PERCENT=5`
    - `ALERT_PREVIEW_QUALITY_PERCENT=20`
    - `ALERT_LATENCY_P95_MS=45000`
    - `ALERT_WEBHOOK_URL=` (empty = console logging fallback)
    - `CRON_SECRET=` (auto-set by Vercel for cron jobs)
  - [x] 7.2 Add documentation comments for each env var explaining its purpose

- [x] Task 8: Write Integration Tests (all ACs)
  - [x] 8.1 Create `src/test/alerts-config.test.ts` — 11 tests (default values, env overrides, all types defined)
  - [x] 8.2 Create `src/test/alerts-metrics.test.ts` — 13 tests (each metric query: correct calculation, empty data, edge cases)
  - [x] 8.3 Create `src/test/alerts-dispatcher.test.ts` — 9 tests (deduplication, webhook dispatch, console fallback, error handling, history recording)
  - [x] 8.4 Create `src/test/alerts-check-api.test.ts` — 9 tests (auth, all checks returned, alert triggering, deduplication, empty data, error handling)

## Dev Notes

### Architecture Patterns and Constraints

- **Existing AI cost tracking infrastructure** is already built (Story 4-7). The `ai_calls` table stores every AI call with `cost_cents`, `latency_ms`, `success`, `task` type, and `timestamp`. The `consultations` table has `ai_cost_cents` (aggregated cost per consultation). This is the data foundation for all alert metrics.
- **Existing admin route pattern** at `src/app/api/admin/ai-cost-summary/route.ts` uses `ADMIN_SECRET` bearer token authentication. The alert check route MUST follow the exact same pattern. Consider extracting the `isAuthorized()` function to a shared `src/lib/admin/auth.ts` utility.
- **The `recommendations` table** has a `preview_status` column with values `'none' | 'generating' | 'ready' | 'failed' | 'unavailable'`. The preview quality alert checks the ratio of `'unavailable'` (quality gate failures) to `'ready'` + `'unavailable'` (all completed previews).
- **Service role client required**: Alert checks query across ALL consultations/ai_calls (not user-scoped), so the route MUST use `createServiceRoleClient()` from `src/lib/supabase/server.ts` (bypasses RLS).
- **Best-effort alert delivery**: Webhook dispatch failures MUST NOT cause the API route to return an error. Alert delivery is a side effect — the route should always return metric data regardless of dispatch success/failure.
- **No external monitoring dependencies**: This story uses only Supabase (database + queries) and a configurable webhook URL. No Datadog, PagerDuty, or third-party monitoring SDKs. The webhook URL can be pointed at Slack (via Slack Incoming Webhooks), Discord, or any HTTP endpoint.
- **Vercel Cron Jobs** are configured in `vercel.json` and support schedules down to every 1 minute on Pro plan. The cron request includes `Authorization: Bearer ${CRON_SECRET}` automatically. This is separate from `ADMIN_SECRET`.

### Tech Stack Versions (Relevant)

- **Next.js 16.1.6** (App Router) — API routes in `src/app/api/`, cron configuration in `vercel.json`
- **Supabase JS v2.98.0** — `@supabase/supabase-js` + `@supabase/ssr` v0.9.0
- **Zod v4.3.6** — input validation (not needed for this route, but consistent with project patterns)
- **Vitest v4.0.18** — testing framework
- **TypeScript v5** — strict mode
- **Vercel Pro plan** — supports cron jobs (configured in `vercel.json`)

### Key Database Tables for Alert Queries

```
ai_calls table (exists — created in Story 4-7):
  id, consultation_id, provider, model, task, input_tokens, output_tokens,
  cost_cents, latency_ms, success, error, timestamp

consultations table (exists):
  id, ..., ai_cost_cents, status, completed_at, created_at

recommendations table (exists):
  id, consultation_id, ..., preview_status, created_at

alert_history table (NEW — this story):
  id (uuid PK), alert_type (varchar), metric_value (numeric),
  threshold (numeric), sample_size (integer), triggered_at (timestamptz)
```

### Metric Query SQL Patterns

```sql
-- AC1: Average cost per consultation (1-hour window)
SELECT AVG(ai_cost_cents) as avg_cost, COUNT(*) as sample_size
FROM consultations
WHERE status = 'complete'
  AND completed_at >= NOW() - INTERVAL '1 hour';

-- AC2: Error rate (1-hour window)
SELECT
  COUNT(*) FILTER (WHERE success = false)::float / NULLIF(COUNT(*), 0) * 100 as error_rate,
  COUNT(*) as sample_size
FROM ai_calls
WHERE timestamp >= NOW() - INTERVAL '1 hour';

-- AC3: Preview quality gate failure rate (24-hour window)
SELECT
  COUNT(*) FILTER (WHERE preview_status = 'unavailable')::float
    / NULLIF(COUNT(*) FILTER (WHERE preview_status IN ('ready', 'unavailable')), 0) * 100 as failure_rate,
  COUNT(*) FILTER (WHERE preview_status IN ('ready', 'unavailable')) as sample_size
FROM recommendations
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- AC4: P95 latency for face-analysis (1-hour window)
SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95,
  COUNT(*) as sample_size
FROM ai_calls
WHERE task = 'face-analysis'
  AND timestamp >= NOW() - INTERVAL '1 hour';
```

**NOTE for Supabase JS queries**: Supabase JS client does not support `PERCENTILE_CONT` or window functions directly. For the p95 latency query, use one of these approaches:
1. **RPC function** — create a Supabase database function `get_p95_latency(window_interval interval)` that returns the p95 value, then call it via `supabase.rpc('get_p95_latency', { window_interval: '1 hour' })`.
2. **Client-side calculation** — fetch all `latency_ms` values in the window, sort client-side, and pick the 95th percentile index. Acceptable for MVP volume.
3. **SQL view** — create a materialized view.

Recommended approach: **Option 1 (RPC function)** for accuracy and efficiency. Add the function in the same migration as the `alert_history` table.

```sql
-- In migration: Supabase RPC function for p95 latency
CREATE OR REPLACE FUNCTION get_face_analysis_p95_latency(window_interval interval)
RETURNS TABLE(p95_ms numeric, sample_size bigint) AS $$
  SELECT
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95_ms,
    COUNT(*) as sample_size
  FROM ai_calls
  WHERE task = 'face-analysis'
    AND success = true
    AND timestamp >= NOW() - window_interval;
$$ LANGUAGE sql SECURITY DEFINER;
```

### Webhook Payload Format

```json
{
  "alertType": "cost",
  "metricValue": 32.5,
  "threshold": 25,
  "windowDescription": "1 hour",
  "sampleSize": 42,
  "triggeredAt": "2026-03-02T14:30:00.000Z",
  "project": "mynewstyle",
  "environment": "production"
}
```

This format is compatible with Slack Incoming Webhooks (wrap in `{ "text": "..." }` or `{ "blocks": [...] }`) or generic HTTP endpoints. The dispatcher should format the payload for generic consumption; Slack-specific formatting is out of scope for this story.

### Vercel Cron Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/admin/alerts/check",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

Vercel automatically adds `Authorization: Bearer ${CRON_SECRET}` to cron requests. The route must accept both `ADMIN_SECRET` (for manual checks) and `CRON_SECRET` (for automated cron).

### Testing Standards

- Unit tests for each module (config, metrics, dispatcher) with mocked Supabase client
- API route tests with mocked Supabase and fetch
- Naming convention: `src/test/alerts-*.test.ts`
- Mock external dependencies: `fetch` (for webhook dispatch), Supabase client (for DB queries)
- All tests follow established pattern: mock external dependencies, test behavior not implementation
- Test that alerts are NOT triggered when sampleSize is 0 (no data in window)
- Test deduplication: fire alert, then run check again within window — second time should NOT dispatch

### Project Structure Notes

- New files:
  - `src/lib/alerts/config.ts` — alert threshold configuration
  - `src/lib/alerts/metrics.ts` — metric query functions
  - `src/lib/alerts/dispatcher.ts` — alert dispatch and deduplication
  - `src/lib/admin/auth.ts` — extracted admin auth utility (shared between ai-cost-summary and alerts routes)
  - `src/app/api/admin/alerts/check/route.ts` — alert check API route
  - `supabase/migrations/YYYYMMDDHHMMSS_add_alert_history_table.sql` — alert_history table + p95 RPC function
  - `src/test/alerts-config.test.ts`
  - `src/test/alerts-metrics.test.ts`
  - `src/test/alerts-dispatcher.test.ts`
  - `src/test/alerts-check-api.test.ts`
- Modified files:
  - `src/app/api/admin/ai-cost-summary/route.ts` — refactor `isAuthorized()` to use shared `src/lib/admin/auth.ts`
  - `.env.example` — add alert environment variables
  - `vercel.json` — add cron job configuration (create if doesn't exist)

### Anti-Pattern Prevention

- DO NOT use external monitoring SDKs (Datadog, Sentry, PagerDuty) — this is a lightweight, self-hosted alert system using only Supabase and webhooks.
- DO NOT create a UI dashboard for alerts — this story is backend infrastructure only. Visual dashboards are covered by Story 10-2 (AI Pipeline Monitoring Dashboard).
- DO NOT send alerts when there is no data (sampleSize = 0) — an empty window does not mean metrics are degraded; it means there's no traffic. Zero-data windows should return `triggered: false`.
- DO NOT throw errors from alert dispatch — webhook failures are logged but NEVER propagate to the route response. The check route ALWAYS returns metric data.
- DO NOT hardcode thresholds — all thresholds read from environment variables with sensible defaults.
- DO NOT use `setInterval` or background timers in the Next.js API route — serverless functions are stateless. Use Vercel Cron (external trigger) instead.
- DO NOT query the entire ai_calls or consultations table without a time window filter — always scope queries with `timestamp >= NOW() - interval` to prevent performance degradation as data grows.
- DO NOT use client-side p95 calculation for latency if the dataset could be large — use the Supabase RPC function approach for accuracy.
- DO NOT create Supabase Edge Functions — the project uses Next.js API routes on Vercel; keep the pattern consistent.
- DO NOT modify the existing `src/lib/ai/logger.ts` — the AI call logging system is stable and working. Alert metrics READ from the logged data; they don't modify the logging pipeline.
- DO NOT use the deprecated `createServerSupabaseClient()` — use `createServiceRoleClient()` from `src/lib/supabase/server.ts` for admin/service-level database access.

### Dependencies on Other Stories

- **Story 10-1 (Analytics Event System):** NOT a dependency. Cost & Quality Alerts use the `ai_calls` and `consultations` tables (from Story 4-7), NOT the `analytics_events` table. These stories are independent and can be built in parallel.
- **Story 10-2 (AI Pipeline Monitoring Dashboard):** NOT a dependency. The monitoring dashboard provides visual views; alerts provide automated notifications. They complement each other but are independent.
- **Story 4-7 (AI Cost Tracking):** DEPENDENCY (already done). The `ai_calls` table with cost_cents, latency_ms, success, and task columns is required. This is already implemented and working.

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#E10 S10.3] — Story definition: avg AI cost > EUR 0.25, error rate > 5% in 1 hour, preview quality gate > 20% "unavailable" in 1 day, p95 latency > 45s, alerts via Supabase webhook or cron check
- [Source: _bmad-output/planning-artifacts/architecture.md#4.5 Cost Tracking] — Every AI call logs model, tokens, cost, latency, success. Dashboard alert if average exceeds EUR 0.60.
- [Source: _bmad-output/planning-artifacts/architecture.md#9.3 Alerts] — Alert table: AI error rate spike > 5% in 1hr, AI cost spike avg > EUR 0.60/consultation, payment failure rate > 10% in 1hr, preview quality gate > 20% in 1 day, completion rate drop < 70% 7-day rolling
- [Source: _bmad-output/planning-artifacts/architecture.md#9.1 Monitoring Stack] — Vercel Analytics for web vitals, custom dashboard (Supabase) for AI pipeline, Stripe Dashboard for payments
- [Source: src/app/api/admin/ai-cost-summary/route.ts] — Existing admin route pattern: ADMIN_SECRET bearer token auth, service role Supabase client, query ai_calls and consultations tables
- [Source: src/lib/ai/logger.ts] — AI call logging: persistAICallLog writes to ai_calls table, cost calculation in calculateCost()
- [Source: src/lib/ai/provider.ts] — AIRouter with primary/fallback pattern, isRetryable error classification
- [Source: src/lib/supabase/server.ts] — createServiceRoleClient() for admin/service-level database access (bypasses RLS)
- [Source: src/types/index.ts#AICallLog] — AICallLog interface: provider, model, task, inputTokens, outputTokens, costCents, latencyMs, success, error, timestamp
- [Source: _bmad-output/implementation-artifacts/4-7-ai-cost-tracking.md] — Story 4-7 created the ai_calls table and persistAICallLog infrastructure

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No blocking issues encountered. All implementations followed TDD (RED → GREEN → REFACTOR).

### Completion Notes List

- Task 1: Created Supabase migration `20260302600000_add_alert_history_table.sql` with alert_history table, index on (alert_type, triggered_at), RLS enabled, anon/authenticated revoked, and `get_face_analysis_p95_latency` RPC function for PERCENTILE_CONT support.
- Task 2: Implemented `src/lib/alerts/config.ts` with AlertType enum, AlertConfig interface, ALERT_CONFIGS for all 4 alert types, and getAlertThreshold() reading env vars with defaults. 11 tests pass.
- Task 3: Implemented `src/lib/alerts/metrics.ts` with 4 metric query functions (getAvgCostPerConsultation, getErrorRate, getPreviewQualityFailureRate, getLatencyP95). Used RPC approach for p95 latency as recommended. All functions return {value, sampleSize=0} on empty data. 13 tests pass.
- Task 4: Implemented `src/lib/alerts/dispatcher.ts` with isAlertDuplicate, recordAlert, dispatchAlert (webhook + console fallback), processAlert orchestration. Best-effort error handling (non-throwing). 9 tests pass.
- Task 5: Created `src/lib/admin/auth.ts` shared auth utility accepting both ADMIN_SECRET and CRON_SECRET. Refactored `ai-cost-summary/route.ts` to use shared utility. Created `src/app/api/admin/alerts/check/route.ts` with all 4 checks, proper JSON response shape. 9 tests pass.
- Task 6: Created `vercel.json` with `*/10 * * * *` cron schedule for `/api/admin/alerts/check`.
- Task 7: Added 6 alert env vars to `.env.example` with documentation comments.
- Task 8: All 4 test files created with 42 total tests (11+13+9+9). Full regression suite: 2111 tests across 162 files all pass.

### File List

- NEW: `supabase/migrations/20260302600000_add_alert_history_table.sql`
- NEW: `src/lib/alerts/config.ts`
- NEW: `src/lib/alerts/metrics.ts`
- NEW: `src/lib/alerts/dispatcher.ts`
- NEW: `src/lib/admin/auth.ts`
- NEW: `src/app/api/admin/alerts/check/route.ts`
- NEW: `vercel.json`
- NEW: `src/test/alerts-config.test.ts`
- NEW: `src/test/alerts-metrics.test.ts`
- NEW: `src/test/alerts-dispatcher.test.ts`
- NEW: `src/test/alerts-check-api.test.ts`
- MODIFIED: `src/app/api/admin/ai-cost-summary/route.ts` (refactored to use shared isAuthorized from src/lib/admin/auth.ts)
- MODIFIED: `.env.example` (added alert env vars)

## Change Log

- 2026-03-02: Story 10.3 implemented — Cost & Quality Alerts backend infrastructure. Created alert_history database migration with p95 latency RPC function, alert configuration module, metric query functions, alert dispatcher with deduplication, GET /api/admin/alerts/check API route, Vercel cron configuration, shared admin auth utility. 42 new tests added; all 2111 tests pass.
- 2026-03-02: Code review fixes applied — (1) Security: CRON_SECRET no longer accepted via query param in src/lib/admin/auth.ts to prevent token leakage in logs/referrer headers; (2) Deduplication safety: processAlert now records alert in DB before dispatching to prevent dedup bypass if serverless function times out mid-flight; (3) AC9 compliance: CheckResult response now includes window field for each check so time windows are queryable from JSON; (4) Config-driven windowDescription: hardcoded magic strings replaced with windowDescription field on AlertConfig, derived from config in route; (5) Consistency: ai-cost-summary alertTriggered threshold now uses getAlertThreshold(AlertType.cost) from shared config instead of hardcoded constant. All 2111 tests pass.
