# Story 4.8: Deterministic Results (Same Input = Same Output)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want consistent results when I submit the same photo and questionnaire answers,
so that I trust the AI isn't random and can confidently share or revisit my consultation.

## Acceptance Criteria

1. A `photo_hash` (SHA-256 hex of the raw photo bytes) is computed on the server during the analyze step and stored in `consultations.photo_hash` (new column, text nullable).
2. A `questionnaire_hash` (SHA-256 hex of a canonical JSON serialization of `questionnaire_responses`) is computed on the server during the analyze step and stored in `consultations.questionnaire_hash` (new column, text nullable).
3. Before executing the AI face-analysis call in `POST /api/consultation/analyze`, the route queries the `consultations` table for a prior completed consultation with matching `photo_hash`, `questionnaire_hash`, and `gender` whose `status = 'complete'`.
4. If a cache hit is found, the `POST /api/consultation/analyze` route returns the cached `face_analysis` JSON from the matched consultation — no AI call is made. The current consultation's `face_analysis` and `status` are updated from the cached row (and `ai_cost_cents` remains 0 for this step).
5. Before executing the AI consultation-generation call in `POST /api/consultation/generate`, the route queries for a prior completed consultation with matching `photo_hash`, `questionnaire_hash`, and `gender` whose `status = 'complete'` AND that has recommendations in the `recommendations` table.
6. If a cache hit is found for the generate step, the route copies the recommendations, styles_to_avoid, and grooming_tips from the matched consultation into the current consultation's normalized tables, sets `status = 'complete'`, and returns `{ consultation: ..., cached: true }` — no AI call is made.
7. Cache invalidation: the cache is keyed by `photo_hash + questionnaire_hash + gender`. A new prompt version (e.g., upgrading `CURRENT_PROMPT_VERSION` from `'v1'` to `'v2'`) does NOT automatically invalidate cached results — caching is purely input-based per the AC.
8. When a cache hit occurs (either step), `ai_cost_cents` for the current consultation is 0 and no rows are written to `ai_calls` table.
9. All existing 879 tests pass with zero regressions. New tests are added for hash computation, cache lookup, and cache-hit paths.

## Tasks / Subtasks

- [x] Task 1: Add `photo_hash` and `questionnaire_hash` columns to `consultations` table (AC: 1, 2)
  - [x] Create `src/lib/supabase/schema/consultation-hash-columns.sql` with ALTER TABLE statements
  - [x] Add `photo_hash TEXT` and `questionnaire_hash TEXT` columns (nullable for backward compatibility)
  - [x] Add composite index on `(photo_hash, questionnaire_hash, gender)` for cache lookup performance
  - [x] Add partial index `WHERE status = 'complete'` to the composite index (optimize cache queries)

- [x] Task 2: Create `src/lib/consultation/hash.ts` — hash utility functions (AC: 1, 2)
  - [x] Export `computePhotoHash(photoBase64: string): string` — SHA-256 of decoded photo bytes
  - [x] Export `computeQuestionnaireHash(questionnaire: QuestionnaireData): string` — SHA-256 of canonical JSON
  - [x] Canonical JSON: `JSON.stringify(questionnaire, Object.keys(questionnaire).sort())` (sorted keys, stable serialization)
  - [x] Use Node.js built-in `crypto.createHash('sha256')` — NO new dependencies
  - [x] Export both functions from `src/lib/consultation/index.ts` (create if needed)

- [x] Task 3: Update `POST /api/consultation/analyze` for cache lookup and hash storage (AC: 1, 3, 4, 8)
  - [x] Import `computePhotoHash`, `computeQuestionnaireHash` from `@/lib/consultation`
  - [x] After parsing request body, compute `photoHash = computePhotoHash(photoBase64)`
  - [x] Fetch `questionnaire_responses` and `gender` from the consultation DB record (expand the existing SELECT)
  - [x] Compute `questionnaireHash = computeQuestionnaireHash(questionnaire)`
  - [x] Query for cache hit: find a completed consultation with same `photo_hash`, `questionnaire_hash`, `gender`; exclude the current `consultationId`
  - [x] If cache hit: update current consultation with `{ face_analysis: cached.face_analysis, status: 'complete', photo_hash: photoHash, questionnaire_hash: questionnaireHash }` and return `{ faceAnalysis: cached.face_analysis, cached: true }` — skip AI call entirely
  - [x] If cache miss: proceed with existing AI call, then persist `{ photo_hash: photoHash, questionnaire_hash: questionnaireHash }` alongside the existing `{ face_analysis, status, ai_cost_cents }` update

- [x] Task 4: Update `POST /api/consultation/generate` for cache lookup (AC: 5, 6, 8)
  - [x] Expand existing SELECT to include `photo_hash`, `questionnaire_hash`, `gender`
  - [x] After fetching consultation, query for cache hit: find a completed consultation with same `photo_hash`, `questionnaire_hash`, `gender` that has at least one recommendation row
  - [x] If cache hit: read recommendations, styles_to_avoid, grooming_tips from the matched consultation
  - [x] Copy those rows into current consultation (insert with new `consultation_id`), set current consultation `status = 'complete'`, `completed_at = now()`
  - [x] Return `{ consultation: <rebuilt from copied data>, cached: true }` — skip AI call entirely
  - [x] If cache miss: proceed with existing AI call flow (no changes to non-cache path)

- [x] Task 5: Write tests (AC: 9)
  - [x] Create `src/test/consultation-hash.test.ts`
  - [x] Test `computePhotoHash`: same base64 input → same hash; different input → different hash
  - [x] Test `computeQuestionnaireHash`: same questionnaire different key order → same hash (canonical)
  - [x] Test `computeQuestionnaireHash`: different values → different hash
  - [x] Update `src/test/api-consultation-analyze.test.ts`: add cache-hit path test (mocked DB returns a matching consultation → route returns `{ faceAnalysis, cached: true }` with no AI call)
  - [x] Update `src/test/api-consultation-analyze.test.ts`: add cache-miss path test (no DB match → AI call proceeds, hash columns updated)
  - [x] Update `src/test/api-consultation-generate.test.ts`: add cache-hit path test (mocked DB returns matching consultation with recommendations → route returns `{ consultation, cached: true }` with no AI call)
  - [x] Update `src/test/api-consultation-generate.test.ts`: add cache-miss path test (no DB match → AI call proceeds normally)
  - [x] Run full test suite to verify 879 + new tests all pass

## Dev Notes

### Architecture Compliance

- **CRITICAL: `src/types/index.ts` is FROZEN** — Do NOT add `photo_hash`/`questionnaire_hash` to any TypeScript interface. These are DB columns only; they're never exposed in API responses. [Source: src/types/index.ts]
- **CRITICAL: Do NOT modify `AICallLog` type** — Story 4.8 makes no changes to the logger or the `ai_calls` table. When cache hits, simply no `persistAICallLog` call is made. [Source: src/lib/ai/logger.ts]
- **CRITICAL: `consultations` table already exists** — Story 4.8 adds two nullable columns via ALTER TABLE; do NOT redefine the whole table. [Source: architecture.md#3.1 DB Schema]
- **Supabase client pattern:** Always use `createServerSupabaseClient()` from `@/lib/supabase/server` in route files. [Source: src/lib/supabase/server.ts]
- **Export via barrel:** Place hash utilities in `src/lib/consultation/hash.ts` and export through `src/lib/consultation/index.ts`. Follow the barrel pattern used in `src/lib/ai/index.ts`.
- **No Redis/Upstash:** The architecture notes Redis for Phase 2 (1K-10K consultations). Story 4.8 uses the existing Supabase DB as the cache store — pure DB lookup, no external cache service. [Source: architecture.md#11.1 Phase 1]
- **Cache is persistent, not ephemeral:** Cached results live in the `consultations` table forever (TTL: Forever per architecture caching table). [Source: architecture.md#8.4 Caching]

### Hash Implementation (EXACT — Use This)

```typescript
// src/lib/consultation/hash.ts
import { createHash } from 'crypto';
import type { QuestionnaireData } from '@/types';

/**
 * Compute SHA-256 hash of photo bytes from base64-encoded photo.
 * Used as cache key component for deterministic results.
 */
export function computePhotoHash(photoBase64: string): string {
  const photoBuffer = Buffer.from(photoBase64, 'base64');
  return createHash('sha256').update(photoBuffer).digest('hex');
}

/**
 * Compute SHA-256 hash of questionnaire data using canonical JSON serialization.
 * Sorted keys ensure stable hash regardless of property insertion order.
 */
export function computeQuestionnaireHash(questionnaire: QuestionnaireData): string {
  const canonical = JSON.stringify(questionnaire, Object.keys(questionnaire).sort());
  return createHash('sha256').update(canonical).digest('hex');
}
```

**Note:** `crypto` is a Node.js built-in — no import from npm, no new dependency.

### DB Schema Changes (EXACT SQL)

```sql
-- src/lib/supabase/schema/consultation-hash-columns.sql
-- Add deterministic cache columns to consultations table (Story 4.8)
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS photo_hash TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS questionnaire_hash TEXT;

-- Composite index for cache lookup: same photo + questionnaire + gender = cache hit
CREATE INDEX IF NOT EXISTS idx_consultations_cache_lookup
  ON consultations (photo_hash, questionnaire_hash, gender)
  WHERE status = 'complete';
```

**IMPORTANT: Use ALTER TABLE (not CREATE TABLE)** — the `consultations` table already exists in production. ALTER is the safe migration approach.

### `POST /api/consultation/analyze` — Cache-Aware Implementation Pattern

```typescript
// MODIFY existing SELECT to also fetch questionnaire_responses and gender:
const { data: consultation, error: fetchError } = await supabase
  .from('consultations')
  .select('id, status, questionnaire_responses, gender')
  .eq('id', consultationId)
  .single();

// After parsing request body, compute hashes:
import { computePhotoHash, computeQuestionnaireHash } from '@/lib/consultation';
const photoHash = computePhotoHash(photoBase64);
const questionnaireHash = computeQuestionnaireHash(
  consultation.questionnaire_responses as QuestionnaireData
);

// Cache lookup — BEFORE AI call, AFTER status update to 'analyzing':
const { data: cached } = await supabase
  .from('consultations')
  .select('face_analysis')
  .eq('photo_hash', photoHash)
  .eq('questionnaire_hash', questionnaireHash)
  .eq('gender', consultation.gender)
  .eq('status', 'complete')
  .neq('id', consultationId)   // exclude current consultation
  .limit(1)
  .maybeSingle();

if (cached?.face_analysis) {
  // Cache HIT: update current consultation with cached data + hashes
  await supabase
    .from('consultations')
    .update({
      face_analysis: cached.face_analysis,
      status: 'complete',
      photo_hash: photoHash,
      questionnaire_hash: questionnaireHash,
      // ai_cost_cents intentionally left at 0 (no AI call made)
    })
    .eq('id', consultationId);
  return NextResponse.json({ faceAnalysis: cached.face_analysis, cached: true }, { status: 200 });
}

// Cache MISS: run existing AI call flow, then add hash columns to the DB update:
// MODIFY existing update to include photo_hash and questionnaire_hash:
await supabase
  .from('consultations')
  .update({
    face_analysis: validated.data,
    status: 'complete',
    ai_cost_cents: Math.round(step1CostCents),
    photo_hash: photoHash,         // NEW
    questionnaire_hash: questionnaireHash,  // NEW
  })
  .eq('id', consultationId);
```

### `POST /api/consultation/generate` — Cache-Aware Implementation Pattern

```typescript
// MODIFY existing SELECT to also fetch photo_hash, questionnaire_hash, gender:
const { data: consultation, error: fetchError } = await supabase
  .from('consultations')
  .select('id, status, payment_status, face_analysis, questionnaire_responses, ai_cost_cents, photo_hash, questionnaire_hash, gender')
  .eq('id', consultationId)
  .single();

// Cache lookup — AFTER payment gate, BEFORE AI call:
// Only attempt cache lookup if both hashes are available
if (consultation.photo_hash && consultation.questionnaire_hash) {
  const { data: cachedConsultation } = await supabase
    .from('consultations')
    .select('id')
    .eq('photo_hash', consultation.photo_hash)
    .eq('questionnaire_hash', consultation.questionnaire_hash)
    .eq('gender', consultation.gender)
    .eq('status', 'complete')
    .neq('id', consultationId)
    .limit(1)
    .maybeSingle();

  if (cachedConsultation) {
    // Verify it has recommendations (not just a status='complete' with no data)
    const { data: cachedRecs } = await supabase
      .from('recommendations')
      .select('id, rank, style_name, justification, match_score, difficulty_level')
      .eq('consultation_id', cachedConsultation.id)
      .order('rank');

    if (cachedRecs && cachedRecs.length > 0) {
      // Cache HIT: copy data from cached consultation into current
      const cachedStylesAvoid = await supabase
        .from('styles_to_avoid')
        .select('style_name, reason')
        .eq('consultation_id', cachedConsultation.id);

      const cachedTips = await supabase
        .from('grooming_tips')
        .select('category, tip_text, icon')
        .eq('consultation_id', cachedConsultation.id);

      // Insert copied rows under current consultationId
      await storeConsultationResults(supabase, consultationId, {
        recommendations: cachedRecs.map(r => ({
          styleName: r.style_name,
          justification: r.justification,
          matchScore: r.match_score,
          difficultyLevel: r.difficulty_level,
        })),
        stylesToAvoid: (cachedStylesAvoid.data ?? []).map(s => ({
          styleName: s.style_name,
          reason: s.reason,
        })),
        groomingTips: (cachedTips.data ?? []).map(t => ({
          category: t.category,
          tipText: t.tip_text,
          icon: t.icon,
        })),
      });

      await supabase
        .from('consultations')
        .update({ status: 'complete', completed_at: new Date().toISOString() })
        .eq('id', consultationId);

      // Rebuild ConsultationOutput shape for response
      const consultationOutput = {
        recommendations: cachedRecs.map(r => ({
          styleName: r.style_name,
          justification: r.justification,
          matchScore: r.match_score,
          difficultyLevel: r.difficulty_level,
        })),
        stylesToAvoid: (cachedStylesAvoid.data ?? []).map(s => ({
          styleName: s.style_name, reason: s.reason,
        })),
        groomingTips: (cachedTips.data ?? []).map(t => ({
          category: t.category, tipText: t.tip_text, icon: t.icon,
        })),
      };

      return NextResponse.json({ consultation: consultationOutput, cached: true }, { status: 200 });
    }
  }
}
// Cache MISS (or hashes not available): proceed with existing AI call flow unchanged
```

### Idempotency Interaction (IMPORTANT)

The generate route already has an idempotency check (AC from Story 4.5): if `status = 'complete'` AND recommendations exist, return `{ status: 'already_complete' }`. The cache check must happen **after the idempotency check** to preserve the existing behavior for same-consultation repeat calls.

Order in generate route:
1. Parse + validate request
2. Fetch consultation
3. Payment gate (403 if not paid)
4. Idempotency check (return 200 `already_complete` if status=complete + recs exist)
5. **NEW: Cache lookup** (return 200 `{ consultation, cached: true }` if cache hit)
6. Extract analysis + questionnaire
7. Run AI flow (existing)

### `storeConsultationResults` Reuse

The `storeConsultationResults` private function in `generate/route.ts` takes a `ConsultationOutput` type (`{ recommendations, stylesToAvoid, groomingTips }`). The cache-hit path must rebuild data into this shape from raw DB rows before calling `storeConsultationResults`. This avoids code duplication for the insert logic.

### Project Structure Notes

```
src/
├── lib/
│   ├── consultation/
│   │   ├── hash.ts                NEW: computePhotoHash, computeQuestionnaireHash
│   │   └── index.ts               NEW: barrel export
│   └── supabase/
│       └── schema/
│           └── consultation-hash-columns.sql  NEW: ALTER TABLE + index
├── app/
│   └── api/
│       └── consultation/
│           ├── analyze/
│           │   └── route.ts       MODIFIED: add hash computation + cache lookup
│           └── generate/
│               └── route.ts       MODIFIED: add cache lookup after idempotency check
└── test/
    ├── consultation-hash.test.ts  NEW: tests for hash functions
    ├── api-consultation-analyze.test.ts  MODIFIED: add cache-hit/miss test cases
    └── api-consultation-generate.test.ts MODIFIED: add cache-hit/miss test cases
```

**Files that must NOT be modified:**
- `src/types/index.ts` — types are frozen
- `src/lib/ai/logger.ts` — no changes; when cache hits, simply no `persistAICallLog` call
- `src/lib/ai/index.ts` — no changes
- `src/lib/ai/schemas/` — unchanged
- `src/lib/ai/validation.ts` — unchanged
- `src/lib/ai/prompts/` — unchanged (prompt version change does NOT bust cache per AC7)

### Library & Framework Requirements

| Library | Version | Usage in This Story |
|---------|---------|---------------------|
| `crypto` | Node.js built-in | SHA-256 hash computation via `createHash('sha256')` |
| `@supabase/supabase-js` | already installed | DB queries for cache lookup |
| `next` | already installed | API route modifications |
| `vitest` | already installed | test runner |

**NO NEW DEPENDENCIES** — all packages already installed. `crypto` is a Node.js built-in, not an npm package.

### Cross-Story Dependencies

- **Story 4.1 (AI Provider Abstraction) — DONE:** `getAICallLogs`, `persistAICallLog`, `getAIRouter` all available. Story 4.8 skips these calls entirely on cache hit (no `persistAICallLog` call = 0 rows in `ai_calls` = 0 `ai_cost_cents`). [Source: src/lib/ai/index.ts]
- **Story 4.3 (Face Analysis) — DONE:** `POST /api/consultation/analyze` exists with full retry + validation logic. Story 4.8 inserts a cache check BEFORE the AI call, and adds hash columns to the DB update on cache miss. [Source: src/app/api/consultation/analyze/route.ts]
- **Story 4.5 (Consultation Generation) — DONE:** `POST /api/consultation/generate` + `storeConsultationResults` exist. Story 4.8 reuses `storeConsultationResults` for copying cached data. Idempotency check (existing) runs BEFORE the new cache check. [Source: src/app/api/consultation/generate/route.ts]
- **Story 4.6 (AI Output Validation) — DONE:** `validateFaceAnalysis`, `validateConsultation` in place. Cache-hit path bypasses validation (cached data was already validated when first stored). [Source: src/lib/ai/validation.ts]
- **Story 4.7 (AI Cost Tracking) — DONE:** `ai_calls` table exists; `persistAICallLog` is called in analyze/generate routes. Cache-hit path does NOT call `persistAICallLog` — this is intentional and correct (noted in Story 4.7 dev notes: "When cache hits, AI calls are skipped → `ai_calls` will have no entry for that request. The `ai_cost_cents` will be 0 for cached results. This is expected and correct behavior."). [Source: 4-7-ai-cost-tracking.md#Cross-Story Dependencies]
- **Story 4.8 (THIS STORY):** Cache key = `photo_hash + questionnaire_hash + gender`. Prompt version changes do NOT bust the cache (AC7).
- **Epic 5 (Payment) — FUTURE:** Payment happens between analyze (Step 1 free) and generate (Step 2 paid). Cache lookup in analyze runs before payment; cache lookup in generate runs after payment gate but before AI call.

### Previous Story Intelligence (Story 4.7 — AI Cost Tracking)

Key patterns from Story 4.7 to carry forward:

- **Supabase mock pattern in tests:** `vi.mock('@supabase/supabase-js', ...)` or use existing `mockFrom` / `mockInsert` pattern from test files. For cache-hit tests: mock the SELECT query to return a consultation record; verify AI call mock was NOT called.
- **`vi.clearAllMocks()` in `beforeEach`** — maintain for test isolation.
- **`maybeSingle()` vs `single()`:** Use `.maybeSingle()` for cache lookups (returns `null` if no row found, not an error). Use `.single()` only when you expect exactly one row. [Source: src/app/api/consultation/generate/route.ts uses `.single()` for fetching consultation]
- **`limit(1)` on cache query** — always add `.limit(1)` before `.maybeSingle()` for efficiency.
- **Test baseline: 879 tests** (55 test files, all passing as of Story 4.7 code review).
- **`neq('id', consultationId)` in cache query** — critical to exclude the current consultation from its own cache lookup (prevents false self-match on retry scenarios).

### Git Intelligence

Recent commits follow this pattern:
- `feat(epic-4): implement story 4-7-ai-cost-tracking`
- `review(epic-4): code review fixes for story 4-6-ai-output-validation-and-quality-gate`

Suggested commit message: `feat(epic-4): implement story 4-8-deterministic-results`

### Critical Guardrails

- **DO NOT** call the AI (face analysis or consultation generation) when a cache hit is found — return immediately with cached data.
- **DO NOT** insert into `ai_calls` table on cache hit — `persistAICallLog` should NOT be called.
- **DO NOT** set `ai_cost_cents > 0` on cache hit — leave it at 0.
- **DO NOT** add `photo_hash`/`questionnaire_hash` to any TypeScript type — DB-only columns.
- **DO NOT** compute photo hash from `photoUrl` (the storage path) — always compute from the raw `photoBase64` bytes sent in the request body. The URL could point to a compressed/resized version.
- **DO NOT** use `JSON.stringify(questionnaire)` without sorted keys — key insertion order in JavaScript objects is not guaranteed across platforms/engines. Always use `JSON.stringify(questionnaire, Object.keys(questionnaire).sort())`.
- **DO NOT** block on cache lookup failure — wrap cache query in try/catch and fall through to AI call if DB lookup throws. Cache is an optimization, not a requirement.
- **DO** use `.maybeSingle()` for cache queries (returns `null` rather than throwing when no row found).
- **DO** exclude the current `consultationId` from the cache query using `.neq('id', consultationId)`.
- **DO** place the cache check in analyze AFTER the `status = 'analyzing'` update (so we track that the request was received even on cache hit).
- **DO** place the cache check in generate AFTER the idempotency check (idempotency check is the existing early-return for repeated Stripe webhook delivery).
- **DO** run `npm test` before considering done — all 879 existing + new tests must pass.
- **DO** handle `null` `photo_hash` / `questionnaire_hash` gracefully in the generate route — if hashes are null (backward compat with old consultations), skip cache lookup and fall through to AI call.

### Environment Variables Required

No new environment variables. All existing Supabase variables remain unchanged:
- `NEXT_PUBLIC_SUPABASE_URL` — already set
- `SUPABASE_SERVICE_ROLE_KEY` — already set per existing routes

### Testing Requirements

**New test file:** `src/test/consultation-hash.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { computePhotoHash, computeQuestionnaireHash } from '../lib/consultation/hash';

describe('computePhotoHash', () => {
  it('returns same hash for same base64 input', () => {
    const b64 = Buffer.from('test photo data').toString('base64');
    expect(computePhotoHash(b64)).toBe(computePhotoHash(b64));
  });
  it('returns different hash for different input', () => {
    const a = Buffer.from('photo A').toString('base64');
    const b = Buffer.from('photo B').toString('base64');
    expect(computePhotoHash(a)).not.toBe(computePhotoHash(b));
  });
  it('returns 64-char hex string (SHA-256)', () => {
    const b64 = Buffer.from('x').toString('base64');
    expect(computePhotoHash(b64)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('computeQuestionnaireHash', () => {
  it('returns same hash regardless of key insertion order', () => {
    const q1 = { b: 'val', a: 'val2' };
    const q2 = { a: 'val2', b: 'val' };
    expect(computeQuestionnaireHash(q1)).toBe(computeQuestionnaireHash(q2));
  });
  it('returns different hash for different values', () => {
    expect(computeQuestionnaireHash({ a: '1' })).not.toBe(computeQuestionnaireHash({ a: '2' }));
  });
});
```

**Analyze route — cache-hit test pattern:**

```typescript
// In api-consultation-analyze.test.ts — add these test cases:

it('returns cached face analysis when cache hit found (no AI call)', async () => {
  const cachedFaceAnalysis = { faceShape: 'oval', confidence: 0.9, proportions: {}, hairAssessment: {} };

  // Mock DB: first .select returns consultation with questionnaire + gender
  // Second .select (cache lookup) returns a cached consultation
  mockFrom.mockImplementationOnce(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'c-id', status: 'pending', questionnaire_responses: {q: 'a'}, gender: 'male' }, error: null }),
  }));
  // ... mock cache lookup returning a hit, then verify:
  // expect(mockAnalyzeFace).not.toHaveBeenCalled();
  // expect(response.json.cached).toBe(true);
});

it('calls AI and stores hashes when cache miss', async () => {
  // Mock: cache lookup returns null, AI call proceeds
  // Verify mockAnalyzeFace was called
  // Verify DB update includes photo_hash and questionnaire_hash fields
});
```

### References

- [Source: epics-and-stories.md#S4.8] — ACs: generate photo hash on upload; cache by photo_hash + questionnaire_hash + gender; same inputs → return cached results; cache invalidation only on prompt version update; improves consistency AND cost
- [Source: architecture.md#8.4 Caching] — "Face analysis (same photo) | DB lookup by photo hash | Forever"
- [Source: architecture.md#3.1 DB Schema] — consultations table definition (basis for ALTER TABLE additions)
- [Source: architecture.md#11.1 Phase 1] — "No caching layer needed" (confirms: use Supabase DB, not Redis, for Phase 1)
- [Source: src/app/api/consultation/analyze/route.ts] — existing analyze route to modify (logsBefore/logsAfter pattern, DB update structure)
- [Source: src/app/api/consultation/generate/route.ts:92-103] — existing idempotency check (cache lookup goes AFTER this)
- [Source: src/app/api/consultation/generate/route.ts:16-52] — `storeConsultationResults` function to reuse for copied data insert
- [Source: 4-7-ai-cost-tracking.md#Cross-Story Dependencies] — explicit note that Story 4.8 cache hits produce 0 ai_cost_cents and no ai_calls rows

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No debug issues encountered. Implementation followed story spec exactly.

### Completion Notes List

- Implemented TDD: wrote failing tests first for hash utilities, analyze cache-hit/miss, generate cache-hit/miss before implementing any production code.
- Created `src/lib/consultation/hash.ts` with `computePhotoHash` (SHA-256 of decoded photo bytes from base64) and `computeQuestionnaireHash` (SHA-256 of canonical JSON with sorted keys). Used Node.js built-in `crypto` — no new npm dependencies.
- Created `src/lib/consultation/index.ts` as barrel export, exporting hash functions alongside existing `submitConsultation`.
- Created `src/lib/supabase/schema/consultation-hash-columns.sql` with two nullable `ALTER TABLE` columns (`photo_hash TEXT`, `questionnaire_hash TEXT`) and a composite partial index `WHERE status = 'complete'` for efficient cache lookups.
- Modified `POST /api/consultation/analyze`: expanded SELECT to include `questionnaire_responses` and `gender`; compute hashes after parsing; cache lookup AFTER `status='analyzing'` update; on cache hit return `{ faceAnalysis, cached: true }` with no AI call; on cache miss add `photo_hash` and `questionnaire_hash` to the final DB update.
- Modified `POST /api/consultation/generate`: expanded SELECT to include `photo_hash`, `questionnaire_hash`, `gender`; cache lookup AFTER idempotency check but BEFORE AI call; guards against null hashes (backward compat); on cache hit reuses `storeConsultationResults` to copy data; on cache hit returns `{ consultation, cached: true }` with no AI call.
- Both cache lookups wrapped in try/catch — cache is an optimization; DB failure falls through to AI call.
- `persistAICallLog` is NOT called on cache hits — `ai_cost_cents` stays 0, no rows written to `ai_calls` table.
- `src/types/index.ts` was NOT modified — `photo_hash`/`questionnaire_hash` are DB-only columns per story constraint.
- All 893 tests pass: 879 original (no regressions) + 14 new (9 hash unit tests + 2 analyze cache tests + 3 generate cache tests).

### File List

- `src/lib/supabase/schema/consultation-hash-columns.sql` (NEW)
- `src/lib/consultation/hash.ts` (NEW)
- `src/lib/consultation/index.ts` (NEW)
- `src/app/api/consultation/analyze/route.ts` (MODIFIED)
- `src/app/api/consultation/generate/route.ts` (MODIFIED)
- `src/test/consultation-hash.test.ts` (NEW)
- `src/test/api-consultation-analyze.test.ts` (MODIFIED)
- `src/test/api-consultation-generate.test.ts` (MODIFIED)

### Senior Developer Review (AI)

**Reviewer:** Fusuma on 2026-03-02
**Outcome:** Approved with fixes applied

**Issues Found and Fixed:**

- **[MEDIUM][Fixed]** `analyze/route.ts`: Cache-hit DB update had no error logging. The non-cache path logs DB update errors (`if (updateError) { console.error(...) }`), but the cache-hit path silently discarded the update result. Fixed: added `const { error: cacheUpdateError }` capture and `console.error` log. This is non-fatal (client receives correct cached data) but the lack of observability was inconsistent with the rest of the route.
- **[MEDIUM][Fixed]** `generate/route.ts`: Cache-hit status update (`status='complete', completed_at`) had no error logging. Same inconsistency pattern as above. Fixed: added `const { error: cacheStatusUpdateError }` capture and `console.error` log.

**Issues Not Fixed (LOW):**
- No explicit test for AC7 (prompt version does not bust cache). This is structural by design — the implementation simply has no prompt version in the cache key. No test needed.
- Analyze cache-hit test doesn't verify the specific DB update fields (face_analysis, photo_hash, questionnaire_hash). Response-level assertions are sufficient for this path.
- Generate cache-hit test doesn't assert specific consultation data fields. The `consultation: defined` assertion is adequate coverage.

**Checklist Results:**
- All 9 Acceptance Criteria: IMPLEMENTED
- All Tasks marked [x]: VERIFIED DONE
- File List: COMPLETE (matches git status exactly)
- Tests: 893 pass (879 existing + 14 new), zero regressions
- Security: No vulnerabilities introduced
- Performance: Cache queries use partial composite index (`WHERE status='complete'`)
- Architecture compliance: `src/types/index.ts` NOT modified, `crypto` built-in used, Supabase DB cache (no Redis), barrel export pattern followed

### Change Log

- 2026-03-02: Implemented Story 4.8 — Deterministic Results (same input = same output). Added photo_hash and questionnaire_hash DB columns, hash utility functions, cache lookup in analyze and generate routes. 14 new tests added. All 893 tests pass.
- 2026-03-02: Code review fixes — Added error logging for cache-hit DB update in analyze route and cache-hit status update in generate route (consistency with non-cache error handling pattern). All 893 tests still pass.
