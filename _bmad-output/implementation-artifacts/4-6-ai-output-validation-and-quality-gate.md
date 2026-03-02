# Story 4.6: AI Output Validation & Quality Gate

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want all AI outputs validated with confidence thresholds, sanity checks, and quality gate enforcement,
so that users never see garbage data and all validation failures are logged for quality monitoring.

## Acceptance Criteria

1. A dedicated validation utility module `src/lib/ai/validation.ts` is created that exports:
   - `validateFaceAnalysis(result: unknown): { valid: true; data: FaceAnalysisOutput } | { valid: false; reason: string; details: ZodIssue[] }` — wraps `FaceAnalysisSchema.safeParse()` plus confidence threshold check
   - `validateConsultation(result: unknown): { valid: true; data: ConsultationOutput } | { valid: false; reason: string; details: ZodIssue[] }` — wraps `ConsultationSchema.safeParse()` plus sanity checks
   - `logValidationFailure(context: ValidationFailureContext): void` — logs structured validation failures
2. Face analysis confidence gate: if `faceShape.confidence < 0.6`, `validateFaceAnalysis` returns `{ valid: false, reason: 'low_confidence', details: [] }` even when schema is valid
3. Consultation match_score sanity check: if all `recommendations[].matchScore` values are identical (all equal the same number), `validateConsultation` returns `{ valid: false, reason: 'match_scores_all_equal', details: [] }` — prevents degenerate AI output
4. Consultation justification word-count enforcement: each `recommendation.justification` must be between 50–200 words (enforced inside `validateConsultation`, not inside `ConsultationSchema` — the schema itself is NOT modified)
5. `logValidationFailure` writes a structured entry to the existing `logAICall` sink (via `console.error` + a dedicated `AICallLog`-like struct) including: `context` (which route), `reason` (why it failed), `details` (Zod issues array), `timestamp`
6. `POST /api/consultation/analyze` (`src/app/api/consultation/analyze/route.ts`) is updated to call `validateFaceAnalysis()` instead of `FaceAnalysisSchema.safeParse()` directly — all existing behavior preserved, confidence gate added
7. `POST /api/consultation/generate` (`src/app/api/consultation/generate/route.ts`) is updated to call `validateConsultation()` instead of `ConsultationSchema.safeParse()` directly — all existing behavior preserved, sanity checks added
8. Both routes call `logValidationFailure()` when validation fails (before returning 422)
9. All validation failure logs are structured and searchable (consistent field names: `context`, `reason`, `details`, `timestamp`)
10. All existing 843 tests pass with zero regressions after implementation; new tests added for `validation.ts`

## Tasks / Subtasks

- [x] Task 1: Create `src/lib/ai/validation.ts` utility module (AC: 1, 2, 3, 4, 5)
  - [x] Define `ValidationResult<T>` type: `{ valid: true; data: T } | { valid: false; reason: string; details: ZodIssue[] }`
  - [x] Define `ValidationFailureContext` type: `{ context: string; reason: string; details: ZodIssue[]; timestamp: string }`
  - [x] Implement `validateFaceAnalysis(result: unknown)`: call `FaceAnalysisSchema.safeParse()`, then check `data.confidence < 0.6` → return `{ valid: false, reason: 'low_confidence', details: [] }`
  - [x] Implement `validateConsultation(result: unknown)`: call `ConsultationSchema.safeParse()`, then run sanity checks (all-equal matchScores, word count per justification)
  - [x] Implement `logValidationFailure(ctx: ValidationFailureContext)`: `console.error('[AI Validation Failure]', JSON.stringify(ctx))`
  - [x] Export all from `src/lib/ai/validation.ts`
  - [x] Export `validateFaceAnalysis`, `validateConsultation`, `logValidationFailure` from `src/lib/ai/index.ts`

- [x] Task 2: Update `POST /api/consultation/analyze` to use new validation (AC: 6, 8)
  - [x] Import `validateFaceAnalysis`, `logValidationFailure` from `@/lib/ai`
  - [x] Replace `FaceAnalysisSchema.safeParse(rawResult)` → `validateFaceAnalysis(rawResult)`
  - [x] Replace `validated.success` → `validated.valid`
  - [x] Replace `validated.data` → `validated.data` (same field, different shape)
  - [x] Replace `validated.error.issues` → `validated.details`
  - [x] Add `logValidationFailure({ context: 'analyze', reason: validated.reason, details: validated.details, timestamp: new Date().toISOString() })` before returning 422

- [x] Task 3: Update `POST /api/consultation/generate` to use new validation (AC: 7, 8)
  - [x] Import `validateConsultation`, `logValidationFailure` from `@/lib/ai`
  - [x] Replace both `ConsultationSchema.safeParse(rawResult)` and `ConsultationSchema.safeParse(retryResult)` → `validateConsultation(...)`
  - [x] Replace `validated.success` → `validated.valid`
  - [x] Replace `validated.data` → `validated.data`
  - [x] Replace `validated.error.issues` → `validated.details`
  - [x] Add `logValidationFailure(...)` before returning 422

- [x] Task 4: Export from index barrel (AC: 1)
  - [x] Add `export { validateFaceAnalysis, validateConsultation, logValidationFailure } from './validation'` to `src/lib/ai/index.ts`
  - [x] Add `export type { ValidationResult, ValidationFailureContext } from './validation'` to `src/lib/ai/index.ts`

- [x] Task 5: Write tests (AC: 10)
  - [x] Create `src/test/ai-validation.test.ts`
  - [x] Test `validateFaceAnalysis`: valid input → `{ valid: true, data: ... }`
  - [x] Test `validateFaceAnalysis`: invalid schema (bad faceShape) → `{ valid: false, reason: 'schema_invalid', details: [...] }`
  - [x] Test `validateFaceAnalysis`: schema valid but confidence < 0.6 → `{ valid: false, reason: 'low_confidence', details: [] }`
  - [x] Test `validateFaceAnalysis`: confidence exactly 0.6 → `{ valid: true }` (boundary: 0.6 passes)
  - [x] Test `validateFaceAnalysis`: confidence 0.599 → `{ valid: false, reason: 'low_confidence' }` (boundary: just below fails)
  - [x] Test `validateConsultation`: valid consultation → `{ valid: true, data: ... }`
  - [x] Test `validateConsultation`: invalid schema → `{ valid: false, reason: 'schema_invalid', details: [...] }`
  - [x] Test `validateConsultation`: all match_scores equal → `{ valid: false, reason: 'match_scores_all_equal' }`
  - [x] Test `validateConsultation`: match_scores varying → passes sanity check
  - [x] Test `validateConsultation`: justification under 50 words → `{ valid: false, reason: 'justification_too_short' }`
  - [x] Test `validateConsultation`: justification over 200 words → `{ valid: false, reason: 'justification_too_long' }`
  - [x] Test `validateConsultation`: justification exactly 50 words → passes
  - [x] Test `validateConsultation`: justification exactly 200 words → passes
  - [x] Test `logValidationFailure`: calls `console.error` with structured JSON
  - [x] Run full test suite to verify 843 + new tests all pass

## Dev Notes

### Architecture Compliance

- **DO NOT modify `ConsultationSchema` or `FaceAnalysisSchema`** — these Zod schemas are already used in tests across the codebase. Additional checks (confidence threshold, word count, sanity checks) go INSIDE the new `validateFaceAnalysis()` / `validateConsultation()` functions, NOT inside the schemas. [Source: src/lib/ai/schemas/face-analysis.schema.ts, src/lib/ai/schemas/consultation.schema.ts]
- **DO NOT modify `src/lib/ai/logger.ts`** — `logAICall` logs AI call metrics (cost, latency, tokens). Validation failures are a different concern. Use `console.error` in `logValidationFailure` for now. Story 4.7 will add persistent DB logging. [Source: src/lib/ai/logger.ts]
- **DO NOT modify `src/types/index.ts`** — type definitions are frozen per Story 4.1 contract. [Source: architecture.md#4.2]
- **DO NOT modify `src/lib/ai/provider.ts`** — AIProvider interface is unchanged. [Source: src/lib/ai/provider.ts]
- **Validation module location:** `src/lib/ai/validation.ts` — consistent with other `src/lib/ai/` utilities (provider.ts, logger.ts, config.ts). [Source: architecture.md#6.1]
- **Export via barrel:** Add new exports to `src/lib/ai/index.ts` following the existing pattern. Never import directly from `./validation` in routes — always via `@/lib/ai`. [Source: src/lib/ai/index.ts]
- **Zod import in validation.ts:** Import `z` from `zod` and use `z.ZodIssue` for type. Import `FaceAnalysisSchema` and `ConsultationSchema` from `./schemas`. [Source: src/lib/ai/schemas/index.ts]

### Current State of Validation (CRITICAL — Read Before Implementing)

**What already exists (DO NOT recreate):**

The codebase already has schema-based validation + retry in both routes:

In `src/app/api/consultation/analyze/route.ts`:
```typescript
const rawResult = await router.execute((p) => p.analyzeFace(photoBuffer));
let validated = FaceAnalysisSchema.safeParse(rawResult);          // ← currently direct safeParse
if (!validated.success) {
  const retryResult = await router.execute((p) => p.analyzeFace(photoBuffer, { temperature: 0.2 }));
  validated = FaceAnalysisSchema.safeParse(retryResult);          // ← currently direct safeParse
}
if (!validated.success) {
  // ... return 422 with validated.error.issues
}
```

In `src/app/api/consultation/generate/route.ts`:
```typescript
const rawResult = await router.execute((p) => p.generateConsultation(faceAnalysis, questionnaire));
let validated = ConsultationSchema.safeParse(rawResult);          // ← currently direct safeParse
if (!validated.success) {
  const retryResult = await router.execute((p) => p.generateConsultation(faceAnalysis, questionnaire));
  validated = ConsultationSchema.safeParse(retryResult);          // ← currently direct safeParse
}
if (!validated.success) {
  // ... return 422 with validated.error.issues
}
```

**What Story 4.6 adds:**
- `validateFaceAnalysis()` / `validateConsultation()` wrappers that do schema + business-rule validation
- Confidence threshold check on face analysis
- Match score sanity check + word count enforcement on consultation
- `logValidationFailure()` call before 422 returns
- The retry logic and 422 response format are UNCHANGED

### Technical Implementation

**`src/lib/ai/validation.ts` — complete implementation:**

```typescript
import { z } from 'zod';
import { FaceAnalysisSchema, ConsultationSchema } from './schemas';
import type { FaceAnalysisOutput, ConsultationOutput } from './schemas';

export type ValidationResult<T> =
  | { valid: true; data: T }
  | { valid: false; reason: string; details: z.ZodIssue[] };

export interface ValidationFailureContext {
  context: string;     // e.g. 'analyze' | 'generate'
  reason: string;      // e.g. 'schema_invalid' | 'low_confidence' | 'match_scores_all_equal'
  details: z.ZodIssue[];
  timestamp: string;
}

const CONFIDENCE_THRESHOLD = 0.6;
const JUSTIFICATION_MIN_WORDS = 50;
const JUSTIFICATION_MAX_WORDS = 200;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function validateFaceAnalysis(result: unknown): ValidationResult<FaceAnalysisOutput> {
  const parsed = FaceAnalysisSchema.safeParse(result);
  if (!parsed.success) {
    return { valid: false, reason: 'schema_invalid', details: parsed.error.issues };
  }
  if (parsed.data.confidence < CONFIDENCE_THRESHOLD) {
    return { valid: false, reason: 'low_confidence', details: [] };
  }
  return { valid: true, data: parsed.data };
}

export function validateConsultation(result: unknown): ValidationResult<ConsultationOutput> {
  const parsed = ConsultationSchema.safeParse(result);
  if (!parsed.success) {
    return { valid: false, reason: 'schema_invalid', details: parsed.error.issues };
  }

  const { recommendations } = parsed.data;

  // Sanity check: all match scores must not be identical
  if (recommendations.length >= 2) {
    const scores = recommendations.map((r) => r.matchScore);
    const allEqual = scores.every((s) => s === scores[0]);
    if (allEqual) {
      return { valid: false, reason: 'match_scores_all_equal', details: [] };
    }
  }

  // Word count check on each justification
  for (const rec of recommendations) {
    const wordCount = countWords(rec.justification);
    if (wordCount < JUSTIFICATION_MIN_WORDS) {
      return { valid: false, reason: 'justification_too_short', details: [] };
    }
    if (wordCount > JUSTIFICATION_MAX_WORDS) {
      return { valid: false, reason: 'justification_too_long', details: [] };
    }
  }

  return { valid: true, data: parsed.data };
}

export function logValidationFailure(ctx: ValidationFailureContext): void {
  console.error('[AI Validation Failure]', JSON.stringify(ctx));
}
```

**Updated `src/app/api/consultation/analyze/route.ts` — diff:**

```typescript
// REMOVE:
import { getAIRouter, FaceAnalysisSchema } from '@/lib/ai';

// ADD:
import { getAIRouter, validateFaceAnalysis, logValidationFailure } from '@/lib/ai';

// REMOVE (first attempt):
let validated = FaceAnalysisSchema.safeParse(rawResult);
// ADD:
let validated = validateFaceAnalysis(rawResult);

// REMOVE (retry):
validated = FaceAnalysisSchema.safeParse(retryResult);
// ADD:
validated = validateFaceAnalysis(retryResult);

// CHANGE guard (both places):
// REMOVE: if (!validated.success)
// ADD:    if (!validated.valid)

// CHANGE data access:
// REMOVE: validated.data
// ADD:    validated.data   ← same field name, no change needed

// CHANGE error details (before 422 return):
// ADD logValidationFailure call:
logValidationFailure({ context: 'analyze', reason: validated.reason, details: validated.details, timestamp: new Date().toISOString() });
// REMOVE: details: validated.error.issues
// ADD:    details: validated.details
```

**Updated `src/app/api/consultation/generate/route.ts` — diff:**

```typescript
// REMOVE:
import { getAIRouter, ConsultationSchema, getAICallLogs } from '@/lib/ai';

// ADD:
import { getAIRouter, validateConsultation, logValidationFailure, getAICallLogs } from '@/lib/ai';

// REMOVE (first attempt):
let validated = ConsultationSchema.safeParse(rawResult);
// ADD:
let validated = validateConsultation(rawResult);

// REMOVE (retry):
validated = ConsultationSchema.safeParse(retryResult);
// ADD:
validated = validateConsultation(retryResult);

// CHANGE guard (both places):
// REMOVE: if (!validated.success)
// ADD:    if (!validated.valid)

// ADD logValidationFailure call before 422 return:
logValidationFailure({ context: 'generate', reason: validated.reason, details: validated.details, timestamp: new Date().toISOString() });
// REMOVE: details: validated.error.issues
// ADD:    details: validated.details
```

**`src/lib/ai/index.ts` — additions:**

```typescript
// ADD these exports after existing exports:
export { validateFaceAnalysis, validateConsultation, logValidationFailure } from './validation';
export type { ValidationResult, ValidationFailureContext } from './validation';
```

### Project Structure Notes

```
src/
├── lib/
│   └── ai/
│       ├── provider.ts           NO CHANGES
│       ├── gemini.ts             NO CHANGES
│       ├── openai.ts             NO CHANGES
│       ├── logger.ts             NO CHANGES
│       ├── config.ts             NO CHANGES
│       ├── schemas/              NO CHANGES (ConsultationSchema, FaceAnalysisSchema unchanged)
│       ├── prompts/              NO CHANGES
│       ├── index.ts              MODIFIED: add validation exports
│       └── validation.ts         NEW: validation utility module
├── app/
│   └── api/
│       └── consultation/
│           ├── analyze/
│           │   └── route.ts      MODIFIED: use validateFaceAnalysis + logValidationFailure
│           └── generate/
│               └── route.ts      MODIFIED: use validateConsultation + logValidationFailure
└── test/
    └── ai-validation.test.ts     NEW: 14 tests
```

**Files that must NOT be modified:**
- `src/lib/ai/schemas/face-analysis.schema.ts` — schema frozen, additional validation is in `validation.ts`
- `src/lib/ai/schemas/consultation.schema.ts` — schema frozen, word-count enforcement is in `validation.ts`
- `src/lib/ai/logger.ts` — AI call cost logger, unrelated to validation failure logging
- `src/lib/ai/provider.ts` — AIProvider interface unchanged
- `src/lib/ai/gemini.ts` — provider unchanged
- `src/lib/ai/openai.ts` — provider unchanged
- `src/types/index.ts` — types frozen
- Any story files from E1–E4 previously implemented

### Testing Requirements

**Test file:** `src/test/ai-validation.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateFaceAnalysis, validateConsultation, logValidationFailure } from '../lib/ai/validation';

const validFaceAnalysis = {
  faceShape: 'oval',
  confidence: 0.85,
  proportions: { foreheadRatio: 0.33, cheekboneRatio: 0.35, jawRatio: 0.32, faceLength: 1.5 },
  hairAssessment: { type: 'straight', texture: 'medium', density: 'medium', currentStyle: 'short' },
};

// 50-word justification (minimum)
const fiftyWordJustification = 'This style suits your oval face shape perfectly by adding structure around the sides and highlighting your strong cheekbones. The cut is easy to maintain and works well with your medium texture hair type and density, making it ideal.';

// 200-word justification (maximum) — build a long one
const twoHundredWordJustification = Array(200).fill('word').join(' ');

const validConsultation = {
  recommendations: [
    { styleName: 'Style A', justification: fiftyWordJustification, matchScore: 0.9, difficultyLevel: 'low' },
    { styleName: 'Style B', justification: fiftyWordJustification, matchScore: 0.75, difficultyLevel: 'medium' },
  ],
  stylesToAvoid: [
    { styleName: 'Avoid A', reason: 'Makes face appear wider.' },
    { styleName: 'Avoid B', reason: 'Elongates face unfavorably.' },
  ],
  groomingTips: [
    { category: 'products', tipText: 'Use matte pomade', icon: '💈' },
  ],
};
```

**Required tests and expected results:**

| Test | Expected |
|------|----------|
| `validateFaceAnalysis`: valid input | `{ valid: true, data: {...} }` |
| `validateFaceAnalysis`: invalid faceShape | `{ valid: false, reason: 'schema_invalid', details: [...] }` |
| `validateFaceAnalysis`: confidence < 0.6 (e.g. 0.55) | `{ valid: false, reason: 'low_confidence', details: [] }` |
| `validateFaceAnalysis`: confidence exactly 0.6 | `{ valid: true }` (boundary passes) |
| `validateFaceAnalysis`: confidence 0.599 | `{ valid: false, reason: 'low_confidence' }` |
| `validateConsultation`: valid consultation with varying scores | `{ valid: true, data: {...} }` |
| `validateConsultation`: invalid schema | `{ valid: false, reason: 'schema_invalid', details: [...] }` |
| `validateConsultation`: all matchScores equal (e.g., all 0.8) | `{ valid: false, reason: 'match_scores_all_equal', details: [] }` |
| `validateConsultation`: justification under 50 words | `{ valid: false, reason: 'justification_too_short' }` |
| `validateConsultation`: justification over 200 words | `{ valid: false, reason: 'justification_too_long' }` |
| `validateConsultation`: justification exactly 50 words | `{ valid: true }` |
| `validateConsultation`: justification exactly 200 words | `{ valid: true }` |
| `logValidationFailure`: structured console.error output | `console.error` called with `'[AI Validation Failure]'` prefix |
| Single recommendation (only 1): no match_score check | `{ valid: false, reason: 'schema_invalid' }` (schema requires min 2) |

**Test isolation:** `vi.spyOn(console, 'error').mockImplementation(() => {})` for `logValidationFailure` test.

**Word count helper test:** Verify `countWords` (tested implicitly via `validateConsultation` boundary tests).

**Note on word count implementation:** Use `text.trim().split(/\s+/).filter(Boolean).length` — consistent with standard word counting. Each word separated by whitespace is 1 word. Do NOT use character-based counting.

### Library & Framework Requirements

| Library | Version | Usage in This Story |
|---------|---------|---------------------|
| zod | ^4.3.6 | ALREADY INSTALLED — `z.ZodIssue` type, `safeParse` inside validation functions |
| next | 16.1.6 | ALREADY INSTALLED — routes use NextRequest/NextResponse |
| vitest | ^4.0.18 | ALREADY INSTALLED — test runner |

**NO NEW DEPENDENCIES** — all packages already installed.

### Cross-Story Dependencies

- **Story 4.1 (AI Provider Abstraction) — DONE:** `getAIRouter()` and `AIRouter.execute()` unchanged. [Source: src/lib/ai/provider.ts]
- **Story 4.2 (Prompt Management) — DONE:** `FaceAnalysisSchema`, `ConsultationSchema` are the BASE schemas that `validation.ts` wraps. Import from `./schemas`. [Source: src/lib/ai/schemas/]
- **Story 4.3 (Face Analysis) — DONE:** `POST /api/consultation/analyze` is the route updated in Task 2. The `analyzeFace()` call and retry logic are UNCHANGED — only the validation call changes. [Source: src/app/api/consultation/analyze/route.ts]
- **Story 4.5 (Consultation Generation) — DONE:** `POST /api/consultation/generate` is the route updated in Task 3. The `generateConsultation()` call and retry logic are UNCHANGED — only the validation call changes. [Source: src/app/api/consultation/generate/route.ts]
- **Story 4.7 (AI Cost Tracking) — NEXT:** Will add persistent DB logging for AI call costs. `logValidationFailure` in this story uses `console.error` only — Story 4.7 may extend this to DB persistence.
- **Story 4.8 (Deterministic Results) — FUTURE:** Will add cache lookup before AI calls. The validation layer runs AFTER cache miss → AI call → result, so no conflict.
- **Epic 10 (Observability) — FUTURE:** Story 10.3 adds alerting for validation failures. The structured `console.error` format established here will feed into that system.

### Performance Targets

- `validateFaceAnalysis()`: < 1ms (pure in-memory Zod parse + confidence check)
- `validateConsultation()`: < 1ms (pure in-memory Zod parse + word count iteration)
- No network calls, no DB calls, no async — synchronous validation only
- No impact on route latency targets (analyze ≤10s, generate ≤15s)

### Previous Story Intelligence (Story 4.5 — Consultation Generation)

**Key patterns to carry forward:**

- `vi.mock()` at module top level (Vitest hoists these) — not inside `describe`
- `vi.clearAllMocks()` in `beforeEach` for test isolation
- Zod v4: use `error.issues` (not `error.errors`) — already handled since `validateFaceAnalysis` / `validateConsultation` return `details: parsed.error.issues`
- Existing test baseline: **843 tests** (53 test files, all passing as of Story 4.5 code review)
- `ConsultationOutput` type: `z.infer<typeof ConsultationSchema>` — import from `@/lib/ai/schemas/consultation.schema` or via `@/lib/ai`
- `FaceAnalysisOutput` type: `z.infer<typeof FaceAnalysisSchema>` — import from `@/lib/ai/schemas/face-analysis.schema` or via `@/lib/ai`

**Story 4.5 completion state (verified):**
- Test baseline is 843 tests (52 test files × passing + 1 new file with 14 tests from 4.5)
- Routes `analyze/route.ts` and `generate/route.ts` use direct `Schema.safeParse()` — Story 4.6 replaces these with `validateFaceAnalysis()` / `validateConsultation()`
- `getAICallLogs()` is already exported from `@/lib/ai` — do NOT re-export it

**Story 4.3 test pattern (for route tests that exist already):**
- `api-consultation-analyze.test.ts` mocks `getAIRouter` and `createServerSupabaseClient` — those tests will still pass because they mock the route's imports. After Story 4.6, those tests will automatically use the new `validateFaceAnalysis` function (imported via `@/lib/ai`). Ensure existing analyze tests still pass by verifying the route behavior is identical (422 path, 200 path, retry path).

### Git Intelligence

Recent commits follow this pattern:
- `feat(epic-4): implement story 4-5-consultation-generation`
- `feat(epic-4): implement story 4-4-instant-face-shape-reveal`

Suggested commit message: `feat(epic-4): implement story 4-6-ai-output-validation-and-quality-gate`

### Critical Guardrails

- **DO NOT** modify `FaceAnalysisSchema` or `ConsultationSchema` to add new constraints. All additional validation logic belongs in `validation.ts`. Modifying schemas would break existing tests in `ai-schemas.test.ts`, `api-consultation-analyze.test.ts`, and `api-consultation-generate.test.ts`.
- **DO NOT** add async operations to `validateFaceAnalysis()` or `validateConsultation()` — these must remain synchronous.
- **DO NOT** import from `./schemas` directly in route files. Always import from `@/lib/ai` barrel.
- **DO NOT** change the 422 response body format: `{ error: 'AI analysis failed validation', details: [...] }` and `{ error: 'AI consultation failed validation', details: [...] }`. These error messages must remain identical for downstream consumers (tests, error handlers).
- **DO NOT** change the retry logic in either route — validation now catches more cases (confidence < 0.6, degenerate scores), so the retry is even more valuable. The retry pattern is unchanged: call AI again, validate again, if still fails → 422.
- **DO** set confidence threshold at exactly `0.6` (strict less than: `confidence < 0.6` passes at exactly 0.6).
- **DO** count words using whitespace splitting: `text.trim().split(/\s+/).filter(Boolean).length`. This is the simplest, most predictable word count.
- **DO** check all-equal match scores only when `recommendations.length >= 2` (single recommendation cannot be compared — but schema already enforces min 2, so this is defensive).
- **DO** run the full test suite (`npm test`) before considering the story done. All 843 existing tests + new tests must pass.

### Environment Variables Required

No new environment variables. All existing variables remain unchanged.

### References

- [Source: epics-and-stories.md#S4.6] — ACs: Zod schema validation on every AI response; confidence threshold < 0.6; recommendation match_score sanity check (sum should vary, not all equal); text length limits on justifications (50-200 words); reject and retry on schema validation failure; log all validation failures for quality monitoring
- [Source: architecture.md#4.4] — Output Validation: every AI response through validation; if fails → retry with different temperature; if still fails → return error, don't show wrong results
- [Source: architecture.md#4.2] — Provider Abstraction: AIRouter.execute() handles provider retry/fallback; validation is application-level concern separate from transport-level retry
- [Source: src/lib/ai/schemas/face-analysis.schema.ts] — `FaceAnalysisSchema`: `confidence: z.number().min(0).max(1)` — schema allows 0-1, business rule threshold 0.6 is enforced in `validateFaceAnalysis()`
- [Source: src/lib/ai/schemas/consultation.schema.ts] — `ConsultationSchema`: `justification: z.string().min(10).max(500)` — schema allows 10-500 chars; story 4.6 enforces 50-200 WORDS as business rule in `validateConsultation()`
- [Source: src/app/api/consultation/analyze/route.ts] — existing safeParse pattern at lines 66-74, 77-87; this is what Task 2 updates
- [Source: src/app/api/consultation/generate/route.ts] — existing safeParse pattern at lines 120-129, 140-149; this is what Task 3 updates
- [Source: src/lib/ai/logger.ts] — `logAICall` is for AI cost/latency tracking; `logValidationFailure` is separate concern using `console.error`
- [Source: src/lib/ai/index.ts] — barrel export pattern; add validation exports following existing export style

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation proceeded cleanly with no blocking issues.

### Completion Notes List

- Created `src/lib/ai/validation.ts` as a new synchronous validation utility module exporting `validateFaceAnalysis`, `validateConsultation`, and `logValidationFailure` plus their types.
- `validateFaceAnalysis` wraps `FaceAnalysisSchema.safeParse()` and adds a `confidence < 0.6` threshold check returning `{ valid: false, reason: 'low_confidence', details: [] }`.
- `validateConsultation` wraps `ConsultationSchema.safeParse()` and adds two business-rule checks: all-equal matchScores (sanity check) and per-justification word count (50–200 words).
- `logValidationFailure` writes structured JSON to `console.error` with fields: `context`, `reason`, `details`, `timestamp`.
- Neither `FaceAnalysisSchema` nor `ConsultationSchema` were modified — all additional validation lives in `validation.ts`.
- Both API routes updated: replaced direct `Schema.safeParse()` calls with `validateFaceAnalysis()`/`validateConsultation()`, updated guards from `.success` to `.valid`, and added `logValidationFailure()` calls before 422 returns.
- The 422 response body format is unchanged: `{ error: 'AI analysis failed validation', details: [...] }`.
- TDD followed: test file written first (RED), then implementation (GREEN), then refactor. All tests verified to fail before implementation and pass after.
- Existing route tests updated to mock `validateFaceAnalysis`/`validateConsultation` instead of the removed `FaceAnalysisSchema.safeParse`/`ConsultationSchema.safeParse` references.
- Final test count: 863 tests (54 test files), all passing. Zero regressions.

### File List

src/lib/ai/validation.ts (NEW)
src/lib/ai/index.ts (MODIFIED)
src/app/api/consultation/analyze/route.ts (MODIFIED)
src/app/api/consultation/generate/route.ts (MODIFIED)
src/test/ai-validation.test.ts (NEW)
src/test/api-consultation-analyze.test.ts (MODIFIED)
src/test/api-consultation-generate.test.ts (MODIFIED)

## Change Log

- 2026-03-02: Implemented Story 4.6 — created `validation.ts` module with `validateFaceAnalysis`, `validateConsultation`, `logValidationFailure`; updated analyze and generate routes to use new validation with `logValidationFailure` on failure; added 18 new validation tests; updated route tests to mock new API. 863 total tests passing.
- 2026-03-02: Code review fixes — fixed `beforeEach` ordering in `logValidationFailure` test suite (clearAllMocks before spyOn); added missing single-recommendation schema_invalid test case per story spec table; added `logValidationFailure` not-called assertions to retry-success tests in both route test files. 864 total tests passing.
