# Story 11.5: RLS Audit in CI/CD

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want automated RLS checks in CI/CD so no table is accidentally exposed,
so that the application is protected against data leaks caused by missing or misconfigured Row-Level Security policies (the "SOSLeiria lesson").

## Acceptance Criteria

1. **AC-1: RLS Enabled Check** -- A CI script verifies that every public-schema table in the Supabase database has RLS enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`). The check must parse all migration files in `supabase/migrations/` and flag any `CREATE TABLE` in the `public` schema that is not followed (in the same or a later migration) by a corresponding `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.

2. **AC-2: REVOKE ALL Check** -- The CI script verifies that for every public-schema table, `REVOKE ALL ... FROM anon, authenticated` has been applied before any `GRANT` statements. This enforces the SOSLeiria-derived pattern: deny by default, then grant only what is needed.

3. **AC-3: Fail Deployment on Violation** -- If any public table lacks RLS policies or the REVOKE-before-GRANT pattern is violated, the CI pipeline must exit with a non-zero status code and produce a clear, human-readable error message listing the offending tables and the specific violation (missing RLS, missing REVOKE, or GRANT before REVOKE).

4. **AC-4: Integration with Existing Build** -- The RLS audit script is integrated into the project's existing build/lint pipeline. It runs as a `package.json` script (e.g., `npm run audit:rls`) and is invokable both locally and in CI. A GitHub Actions workflow file is created to run this check on every PR and push to `main`.

5. **AC-5: Passing on Current Codebase** -- The audit script passes cleanly on the current set of migrations in `supabase/migrations/`. All existing tables already follow the correct RLS + REVOKE pattern.

## Tasks / Subtasks

- [x] Task 1: Create RLS audit script (AC: #1, #2, #3)
  - [x] 1.1 Create `scripts/audit-rls.ts` -- a TypeScript script that:
    - Reads all `.sql` files from `supabase/migrations/` in lexicographic order
    - Extracts all `CREATE TABLE public.<name>` statements
    - For each table, checks that a corresponding `ALTER TABLE public.<name> ENABLE ROW LEVEL SECURITY` exists in the same or a later migration
    - For each table, checks that `REVOKE ALL ON public.<name> FROM anon, authenticated` exists before any `GRANT ON public.<name>` in execution order
    - Outputs a pass/fail summary with specific violations
    - Exits with code 0 on success, code 1 on failure
  - [x] 1.2 Handle edge cases: tables created via `DO $$ ... EXECUTE` blocks, `IF NOT EXISTS` clauses, schema-qualified vs unqualified table names
  - [x] 1.3 Handle existing patterns: `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated` counts as a blanket REVOKE for all tables

- [x] Task 2: Add npm script (AC: #4)
  - [x] 2.1 Add `"audit:rls": "npx tsx scripts/audit-rls.ts"` to `package.json` scripts
  - [x] 2.2 Verify script runs successfully via `npm run audit:rls`

- [x] Task 3: Create GitHub Actions workflow (AC: #4)
  - [x] 3.1 Create `.github/workflows/rls-audit.yml` that:
    - Triggers on push to `main` and on pull requests
    - Checks out the code
    - Sets up Node.js
    - Installs dependencies (or uses a minimal install)
    - Runs `npm run audit:rls`
  - [x] 3.2 Ensure the workflow fails the CI check if the audit script exits non-zero

- [x] Task 4: Write tests for the audit script (AC: #1, #2, #3, #5)
  - [x] 4.1 Create `src/test/audit-rls.test.ts` with unit tests covering:
    - Detection of tables missing RLS
    - Detection of tables missing REVOKE
    - Detection of GRANT before REVOKE
    - Correct handling of blanket REVOKE ALL ON ALL TABLES
    - Correct parsing of existing migrations (all pass)
    - Tables in non-public schemas are ignored
  - [x] 4.2 All tests pass with `npm run test`

- [x] Task 5: Verify on current migrations (AC: #5)
  - [x] 5.1 Run `npm run audit:rls` against the current `supabase/migrations/` directory
  - [x] 5.2 Confirm all tables pass both RLS and REVOKE checks
  - [x] 5.3 Fix any false positives in the script logic

## Dev Notes

### Architecture & Patterns

- **No runtime database connection required.** The audit is a static analysis of SQL migration files, not a live database query. This makes it fast, reliable, and runnable in any CI environment without Supabase credentials.
- **TypeScript over bash.** The project uses TypeScript throughout. The script should be written in TypeScript and run with `tsx` (already available as a transitive dependency via vitest/vite ecosystem, or install explicitly).
- **Regex-based SQL parsing.** Full SQL parsing is overkill for this use case. Use regex patterns to extract CREATE TABLE, ALTER TABLE ENABLE RLS, REVOKE, and GRANT statements. The patterns are well-defined and consistent across all existing migrations.
- **Existing RLS patterns in the codebase:**
  - Tables use `ALTER TABLE public.<name> ENABLE ROW LEVEL SECURITY;`
  - Security follows `REVOKE ALL ON public.<name> FROM anon, authenticated;` then `GRANT <perms> ON public.<name> TO <roles>;`
  - Some migrations use the blanket `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;` (seen in architecture doc section 3.2)
  - Views created via `CREATE VIEW` / `CREATE OR REPLACE VIEW` do NOT need RLS (RLS applies to tables, not views)

### Key Technical Decisions

- **Static file analysis, not live DB introspection.** This is deliberate: the audit runs pre-deploy without credentials, catches issues before they reach any environment, and works in any CI system.
- **Migration-order-aware.** The script reads migration files in lexicographic order (which is chronological given the timestamp-prefixed naming convention). A REVOKE in migration `20260302400000` covers a table created in `20260302000000`.
- **No Supabase CLI dependency for the audit itself.** The Supabase CLI is used for migrations (`supabase db push`), but the audit script only reads `.sql` files. This avoids requiring Supabase CLI installation in CI for the audit step.

### Existing Migrations to Audit

The following migration files exist in `supabase/migrations/`:
1. `20260302000000_add_guest_session_management.sql` -- Adds guest_session_id, creates RLS policies on consultations + recommendations
2. `20260302120000_add_claim_guest_function.sql` -- Adds claim-guest RPC function
3. `20260302200000_add_favorites_table.sql` -- Creates favorites table
4. `20260302300000_add_referral_infrastructure.sql` -- Creates referral tables
5. `20260302400000_add_analytics_events.sql` -- Creates analytics_events with RLS + REVOKE + GRANT
6. `20260302500000_add_ai_monitoring_views.sql` -- Creates monitoring views
7. `20260302600000_add_alert_history_table.sql` -- Creates alert_history table
8. `20260302230000_add_funnel_analytics_views.sql` -- Creates funnel views
9. `20260302700000_add_consultation_rating.sql` -- Creates consultation_rating table

**Important:** The core tables (profiles, consultations, recommendations, styles_to_avoid, grooming_tips) are defined in the initial Supabase schema setup (referenced in architecture section 3.2), NOT in the migrations directory. The script must handle the case where some tables are defined outside of tracked migrations -- or the initial schema SQL should also be included. Check `src/lib/supabase/schema/*.sql` for additional schema definitions.

### Schema Files Outside Migrations

The following schema files exist in `src/lib/supabase/schema/`:
- `ai-calls.sql` -- AI call logging table
- `consultation-hash-columns.sql` -- Hash columns on consultations
- `profiles.sql` -- Profiles table definition

The audit script should scan BOTH `supabase/migrations/*.sql` AND `src/lib/supabase/schema/*.sql` directories for completeness.

### Testing Standards

- Tests use Vitest (see `vitest.config.ts`)
- Test files go in `src/test/` directory
- Test naming convention: `<feature>.test.ts`
- Use `describe` / `it` / `expect` from vitest globals
- No external services needed (pure static analysis tests)

### GitHub Actions Notes

- No `.github/workflows/` directory exists yet -- this story creates the first workflow file
- Use `actions/checkout@v4` and `actions/setup-node@v4`
- Node version: match project (check `.nvmrc` or use 20.x LTS)
- Consider caching `node_modules` with `actions/cache` for faster runs

### Project Structure Notes

- Script location: `scripts/audit-rls.ts` (alongside existing `scripts/download-face-api-models.js`)
- Test location: `src/test/audit-rls.test.ts` (follows existing pattern)
- CI workflow: `.github/workflows/rls-audit.yml` (new directory)
- The script should be self-contained with minimal dependencies (Node.js `fs`, `path`, regex)

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Section 3.2 Row-Level Security (RLS)] -- RLS policy patterns and REVOKE ALL before GRANT
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 10.2 CI/CD] -- Pre-deploy checks including "RLS policy audit (automated check that all tables have RLS)"
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 13 Architecture Summary] -- Item #3 "REVOKE ALL before GRANT" and #10 "RLS audit in CI/CD"
- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#S11.5] -- Story definition and acceptance criteria
- [Source: supabase/migrations/20260302400000_add_analytics_events.sql] -- Example of correct REVOKE + GRANT pattern
- [Source: supabase/migrations/20260302000000_add_guest_session_management.sql] -- Example of RLS policy creation pattern

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation was straightforward following TDD.

### Completion Notes List

- Implemented `scripts/audit-rls.ts` as a TypeScript static analysis script using regex-based SQL parsing (no live DB connection required).
- Script scans both `supabase/migrations/*.sql` and `src/lib/supabase/schema/*.sql` in lexicographic order.
- Handles all edge cases: schema-qualified vs unqualified table names, IF NOT EXISTS, DO $$ blocks (ignored to avoid false positives), blanket REVOKE ALL ON ALL TABLES IN SCHEMA public, deny-all policies (USING false), separate REVOKE FROM anon + REVOKE FROM authenticated, service-role-only tables with no GRANT.
- Fixed a real security gap: `src/lib/supabase/schema/ai-calls.sql` had no RLS or REVOKE — added both (table is service-role-only, accessed via SECURITY DEFINER functions).
- 35 unit/integration tests cover all AC scenarios. All 2362 tests pass (no regressions).
- GitHub Actions workflow `.github/workflows/rls-audit.yml` created as the first CI workflow in the project.
- `npm run audit:rls` exits 0 for the current codebase (7 tables all pass).

### File List

- scripts/audit-rls.ts (new)
- src/test/audit-rls.test.ts (new)
- .github/workflows/rls-audit.yml (new)
- package.json (modified — added audit:rls script + tsx devDependency)
- src/lib/supabase/schema/ai-calls.sql (modified — added RLS + REVOKE)

### Change Log

- 2026-03-03: Implemented Story 11.5 — RLS audit script, tests, GitHub Actions workflow, npm script; fixed ai_calls RLS gap.
- 2026-03-03: Code review fixes — added tsx to devDependencies, fixed blanket REVOKE ordering bug (GRANT before blanket REVOKE now correctly flagged), added TEMPORARY table skip, added 3 new tests (blanket REVOKE ordering, TEMPORARY table, both-violations). 38 tests, 2365 total pass.
