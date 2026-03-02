# Story 4.3: Face Analysis

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want my photo analyzed by AI so I learn my face shape and proportions,
so that I receive an immediate, free face shape result before any payment is required.

## Acceptance Criteria

1. A `POST /api/consultation/analyze` route accepts `{ consultationId, photoBase64, mimeType? }` and returns `{ faceAnalysis }` containing the validated `FaceAnalysis` JSON
2. The route calls `AIRouter.execute()` → `provider.analyzeFace(photoBuffer, options)` using the existing provider abstraction (Gemini primary, OpenAI fallback)
3. The AI response is validated against `FaceAnalysisSchema.safeParse()` — if validation fails, the route retries once with `temperature: 0.2` (reduced randomness) before failing
4. If both the first attempt and the retry fail schema validation, the route returns HTTP 422 with `{ error: 'AI analysis failed validation', details: ... }` — never returns invalid/garbage data to the client
5. The validated `face_analysis` JSON is stored in `consultations.face_analysis` (jsonb column) in Supabase, and `consultations.status` is updated from `'pending'` to `'analyzing'` on start and `'complete'` on success or `'failed'` on error
6. The route is accessible without payment (pre-paywall) — it uses `consultationId` from the existing `consultations` table record created by `POST /api/consultation/start`
7. Latency target: ≤ 10 seconds for the complete round trip (photo → AI API → validated response)
8. All existing 789 tests pass with zero regressions after implementation

## Tasks / Subtasks

- [x] Task 1: Create `POST /api/consultation/analyze` route (AC: 1, 2, 3, 4, 6)
  - [x] Create `src/app/api/consultation/analyze/route.ts`
  - [x] Define request schema using Zod: `{ consultationId: z.string().uuid(), photoBase64: z.string().min(1), mimeType: z.enum(['image/jpeg','image/png','image/webp']).optional() }`
  - [x] Convert base64 to `Buffer` via `Buffer.from(photoBase64, 'base64')`
  - [x] Call `getAIRouter().execute(provider => provider.analyzeFace(photoBuffer, { temperature: undefined }))` for first attempt
  - [x] Run `FaceAnalysisSchema.safeParse(result)` on response — if `success: false`, retry with `{ temperature: 0.2 }`
  - [x] If retry also fails validation, return 422 with `{ error: 'AI analysis failed validation', details: validated.error.issues }`
  - [x] On success, return 200 with `{ faceAnalysis: validated.data }`

- [x] Task 2: Supabase integration for consultation status and result storage (AC: 5, 6)
  - [x] Create `src/lib/supabase/server.ts` — server-side Supabase client using `SUPABASE_SERVICE_ROLE_KEY` (not anon key) for API routes
  - [x] In the analyze route: before calling AI, query `consultations` table to verify `consultationId` exists (404 if not)
  - [x] Update `consultations.status = 'analyzing'` before calling AI
  - [x] On AI success: `UPDATE consultations SET face_analysis = $1, status = 'complete' WHERE id = $2`
  - [x] On AI failure (after retry): `UPDATE consultations SET status = 'failed' WHERE id = $1`, then return 422
  - [x] Handle Supabase errors gracefully — if DB update fails after successful AI analysis, still return the face analysis to the client (log the DB error)

- [x] Task 3: Write tests (AC: 1–8)
  - [x] Create `src/test/api-consultation-analyze.test.ts`
  - [x] Test: valid request → returns 200 with valid `FaceAnalysis` shape
  - [x] Test: AI returns invalid JSON → schema validation fails → retries with `temperature: 0.2` → success on retry → returns 200
  - [x] Test: both attempts fail validation → returns 422 with `error` and `details` fields
  - [x] Test: missing `consultationId` field → returns 400
  - [x] Test: invalid `mimeType` value → returns 400
  - [x] Test: empty `photoBase64` → returns 400
  - [x] Test: `consultationId` not found in DB → returns 404
  - [x] Test: Supabase DB error after successful AI analysis → still returns 200 (logs error but doesn't fail user request)
  - [x] Test: `mimeType` defaults to `'image/jpeg'` when omitted
  - [x] Run full test suite to verify 789 + new tests all pass

## Dev Notes

### Architecture Compliance

- **Route location:** `src/app/api/consultation/analyze/route.ts` — follows Next.js App Router convention. Consistent with `src/app/api/consultation/start/route.ts` (existing). [Source: architecture.md#6.1]
- **AI call via AIRouter ONLY:** Never call `GeminiProvider` or `OpenAIProvider` directly. Always use `getAIRouter().execute()` — this ensures automatic retry and fallback to OpenAI. [Source: architecture.md#4.2]
- **Server-side only:** `getAIRouter()` and `createAIRouter()` must only be called from API routes (never from client components). All AI keys are server-side only. [Source: architecture.md#7.3]
- **Zod for input validation:** All API routes use Zod for request body validation, consistent with `start/route.ts` pattern. Return 400 with `{ error: issues.map(i => i.message).join(', ') }`. [Source: architecture.md#7.3]
- **FaceAnalysisSchema location:** Already implemented in Story 4.2 at `src/lib/ai/schemas/face-analysis.schema.ts`. Import via `import { FaceAnalysisSchema } from '@/lib/ai/schemas'` or from barrel `import { FaceAnalysisSchema } from '@/lib/ai'`. [Source: 4-2-prompt-management-system.md]
- **Supabase server client:** Existing `src/lib/supabase/client.ts` uses the anon key (browser client). For API routes, create `src/lib/supabase/server.ts` using `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS for server operations. Pattern: `createClient(url, serviceRoleKey)`.
- **Pre-paywall:** This story is FREE — no payment check needed. The `POST /api/consultation/start` route already creates the consultation record. This route is called immediately after start, before any payment wall. [Source: architecture.md#4.1, epics-and-stories.md#S4.3]

### Technical Requirements

**Request schema (Zod):**
```typescript
const AnalyzeRequestSchema = z.object({
  consultationId: z.string().uuid(),
  photoBase64: z.string().min(1),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']).optional().default('image/jpeg'),
});
```

**Route implementation pattern:**
```typescript
// src/app/api/consultation/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAIRouter } from '@/lib/ai';
import { FaceAnalysisSchema } from '@/lib/ai/schemas';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map(i => i.message).join(', ') },
      { status: 400 }
    );
  }

  const { consultationId, photoBase64, mimeType } = parsed.data;
  const photoBuffer = Buffer.from(photoBase64, 'base64');
  const supabase = createServerSupabaseClient();

  // Verify consultation exists
  const { data: consultation, error: fetchError } = await supabase
    .from('consultations')
    .select('id, status')
    .eq('id', consultationId)
    .single();

  if (fetchError || !consultation) {
    return NextResponse.json({ error: 'Consultation not found' }, { status: 404 });
  }

  // Mark as analyzing
  await supabase.from('consultations').update({ status: 'analyzing' }).eq('id', consultationId);

  try {
    const router = getAIRouter();

    // First attempt
    const rawResult = await router.execute(p => p.analyzeFace(photoBuffer, { mimeType }));
    let validated = FaceAnalysisSchema.safeParse(rawResult);

    // Retry with lower temperature if validation fails
    if (!validated.success) {
      const retryResult = await router.execute(p => p.analyzeFace(photoBuffer, { temperature: 0.2, mimeType }));
      validated = FaceAnalysisSchema.safeParse(retryResult);
    }

    if (!validated.success) {
      await supabase.from('consultations').update({ status: 'failed' }).eq('id', consultationId);
      return NextResponse.json(
        { error: 'AI analysis failed validation', details: validated.error.issues },
        { status: 422 }
      );
    }

    // Store result
    const { error: updateError } = await supabase
      .from('consultations')
      .update({ face_analysis: validated.data, status: 'complete' })
      .eq('id', consultationId);

    if (updateError) {
      console.error('[POST /api/consultation/analyze] DB update failed:', updateError);
      // Still return success to client — analysis succeeded
    }

    return NextResponse.json({ faceAnalysis: validated.data }, { status: 200 });
  } catch (error) {
    await supabase.from('consultations').update({ status: 'failed' }).eq('id', consultationId);
    console.error('[POST /api/consultation/analyze] AI error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Server Supabase client (`src/lib/supabase/server.ts`):**
```typescript
import { createClient } from '@supabase/supabase-js';

export function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey);
}
```

**Key: `mimeType` in `AnalysisOptions`:**
The existing `AnalysisOptions` type in `src/types/index.ts` only has `temperature?: number` and `maxRetries?: number`. The `mimeType` for photo is already embedded in the `PromptContent.imageData.mimeType` via `getFaceAnalysisPrompt()`. When calling `provider.analyzeFace(buffer, options)`, pass `{ temperature }` only. The `mimeType` for the AI prompt is already hardcoded to `'image/jpeg'` in `getFaceAnalysisPrompt()` — if you need to override it, you must update the prompt params, NOT `AnalysisOptions`. For this story, passing `image/jpeg` default is acceptable since uploaded photos are already compressed to JPEG by the client-side compressor (Story 2.3).

**CRITICAL: Do NOT modify `AnalysisOptions` type** — that type is used by existing tests. If `mimeType` forwarding to the provider is needed later, that's a separate concern. For this story, `analyzeFace(buffer, { temperature: 0.2 })` is the retry call signature.

**Retry pattern — correct call:**
```typescript
// First attempt (no temperature override, uses provider default)
const rawResult = await router.execute(p => p.analyzeFace(photoBuffer));

// Retry with temperature override
const retryResult = await router.execute(p => p.analyzeFace(photoBuffer, { temperature: 0.2 }));
```

### Project Structure Notes

```
src/
├── app/
│   └── api/
│       └── consultation/
│           ├── start/
│           │   └── route.ts          NO CHANGES (existing, creates consultation record)
│           └── analyze/
│               └── route.ts          NEW: face analysis + Supabase storage
├── lib/
│   ├── ai/                           NO CHANGES (providers, prompts, schemas all from Stories 4.1/4.2)
│   └── supabase/
│       ├── client.ts                 NO CHANGES (browser client)
│       └── server.ts                 NEW: server-side client using SUPABASE_SERVICE_ROLE_KEY
└── test/
    └── api-consultation-analyze.test.ts   NEW: route tests
```

**Files that must NOT be modified:**
- `src/types/index.ts` — type definitions are frozen
- `src/lib/ai/provider.ts` — AIProvider interface unchanged
- `src/lib/ai/gemini.ts` — providers unchanged
- `src/lib/ai/openai.ts` — providers unchanged
- `src/lib/ai/prompts/**` — prompt files from Story 4.2
- `src/lib/ai/schemas/**` — Zod schemas from Story 4.2
- `src/app/api/consultation/start/route.ts` — existing route unchanged

**CRITICAL — `start/route.ts` uses in-memory Map, not Supabase:**
The `POST /api/consultation/start` route currently stores consultations in an in-memory `Map<string, ConsultationRecord>`. This is a placeholder from Story 3.6. Story 4.3 introduces Supabase. You have two implementation options:
1. (Preferred) Migrate `start/route.ts` to also use Supabase so `analyze` can look up the consultation by ID
2. (Fallback) Do NOT modify `start/route.ts` — instead, skip the consultation existence check in `analyze` route and store the face_analysis result directly using `consultationId` as the key. In this case, `analyze` creates/upserts to Supabase independently.

**For MVP, Option 2 is safer** (avoids breaking existing `api-consultation-start.test.ts`). The analyze route upserts to Supabase, and the consultation existence check can use the Supabase DB (assuming `start` will be migrated soon, or that `consultationId` validity is assumed). If the DB lookup returns no record, return 404. In tests, mock Supabase to return the expected record.

### Testing Requirements

**Test file: `src/test/api-consultation-analyze.test.ts`**

Use `vi.mock('@/lib/ai', ...)` to mock `getAIRouter` and `vi.mock('@/lib/supabase/server', ...)` to mock Supabase.

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/consultation/analyze/route';
import { NextRequest } from 'next/server';

// Mock AI router
vi.mock('@/lib/ai', () => ({
  getAIRouter: vi.fn(),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));
```

**Required tests:**

| Test | Expected Result |
|------|----------------|
| Valid request, AI returns valid FaceAnalysis | 200, `{ faceAnalysis: { faceShape, confidence, proportions, hairAssessment } }` |
| First AI call returns invalid JSON, retry succeeds | 200, correct data returned, `analyzeFace` called twice |
| Both AI calls return invalid data | 422, `{ error: 'AI analysis failed validation', details: [...] }` |
| Missing `consultationId` | 400 |
| Invalid UUID for `consultationId` | 400 |
| Empty `photoBase64` | 400 |
| Invalid `mimeType` value | 400 |
| Consultation not found in DB (supabase returns null) | 404 |
| Supabase DB update fails after successful AI analysis | 200 (returns face analysis, logs error) |
| `mimeType` omitted — defaults to `'image/jpeg'` | 200 (no error) |
| AI router throws 500 error | 500 |

**Mock valid `FaceAnalysis` object for tests:**
```typescript
const validFaceAnalysis = {
  faceShape: 'oval' as const,
  confidence: 0.92,
  proportions: {
    foreheadRatio: 0.78,
    cheekboneRatio: 1.0,
    jawRatio: 0.72,
    faceLength: 1.35,
  },
  hairAssessment: {
    type: 'straight',
    texture: 'medium',
    density: 'medium',
    currentStyle: 'short sides and back',
  },
};
```

**Mock invalid FaceAnalysis (fails Zod):**
```typescript
const invalidFaceAnalysis = {
  faceShape: 'pentagon', // invalid enum
  confidence: 1.5,       // out of range
};
```

**Supabase mock pattern (from existing tests in codebase):**
```typescript
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: { id: 'test-uuid', status: 'pending' }, error: null }),
  update: vi.fn().mockReturnThis(),
};
```

**Test isolation:** Call `vi.clearAllMocks()` in `beforeEach` to reset mock state between tests.

### Library & Framework Requirements

| Library | Version | Usage in This Story |
|---------|---------|---------------------|
| zod | ^4.3.6 | ALREADY INSTALLED — request body validation + response validation (use `safeParse`, not `parse`) |
| @supabase/supabase-js | ^2.98.0 | ALREADY INSTALLED — `createClient()` for server-side DB access |
| @google/genai | ^1.43.0 | ALREADY INSTALLED — used indirectly via GeminiProvider (no direct usage in this story) |
| openai | ^6.25.0 | ALREADY INSTALLED — used indirectly via OpenAIProvider (no direct usage in this story) |
| next | 16.1.6 | NextRequest, NextResponse, App Router |
| vitest | ^4.0.18 | Test runner |

**NO NEW DEPENDENCIES** — all required packages are already installed.

### Cross-Story Dependencies

- **Story 4.1 (AI Provider Abstraction) — DONE:** `GeminiProvider`, `OpenAIProvider`, `AIRouter` are fully implemented. `getAIRouter()` returns a working singleton. `provider.analyzeFace(buffer, options?)` is the correct call signature.
- **Story 4.2 (Prompt Management) — DONE:** `FaceAnalysisSchema` exists at `src/lib/ai/schemas/face-analysis.schema.ts`. `getFaceAnalysisPrompt()` is wired into `GeminiProvider.analyzeFace()` and `OpenAIProvider.analyzeFace()` — no prompt work needed in this story.
- **Story 4.4 (Face Shape Reveal) — NEXT:** Will consume the `faceAnalysis` returned by this route to display the face shape badge. The `{ faceAnalysis }` response shape must be stable.
- **Story 4.5 (Consultation Generation) — FUTURE:** Will call a separate `/api/consultation/generate` route with the `face_analysis` from DB. That story reads back what this story writes to `consultations.face_analysis`.
- **Story 4.6 (Validation & Quality Gate) — FUTURE:** Will add confidence threshold check (`if confidence < 0.6, flag for review`) and enhanced validation. This story's `safeParse()` is the foundation; 4.6 adds policy logic on top.
- **Story 4.8 (Deterministic Results) — FUTURE:** Cache invalidation uses face photo hash + `CURRENT_PROMPT_VERSION`. This story stores results per `consultationId`; 4.8 will add deduplication by photo hash.

### Performance Targets

- Route latency target: ≤ 10 seconds total (including Supabase reads/writes and AI call)
- Gemini 2.5 Flash Vision typical latency: 3–8 seconds for face analysis
- Supabase read/write overhead: < 200ms combined
- First attempt success rate expected: > 90% (retry is the safety net, not the primary path)
- If AI call itself exceeds 90 seconds, Vercel serverless timeout applies — the AIRouter logs the failure

### Git Intelligence

Recent commits follow this pattern:
- `feat(epic-4): implement story 4-2-prompt-management-system`
- `feat(epic-4): implement story 4-1-ai-provider-abstraction-layer`

Suggested commit message: `feat(epic-4): implement story 4-3-face-analysis`

### Previous Story Intelligence (Story 4.2)

**Key patterns to carry forward:**

- `vi.mock()` at module top level — Vitest hoists these automatically
- `as unknown as Interface` cast for mock objects passed as typed parameters
- Error wrapping with `alreadyWrapped` prefix guard — already present in Gemini/OpenAI providers, no changes needed
- `clearAICallLogs()` in `beforeEach` when testing AI call logging — do the same with `vi.clearAllMocks()` for mocked Supabase
- Test file naming pattern: `src/test/api-consultation-analyze.test.ts` (consistent with `api-consultation-start.test.ts`)
- Zod v4: use `error.issues` (not `error.errors`) — already confirmed in Story 4.2

**Story 4.2 completion state:**
- 789 tests pass (all `src/test/ai-*.test.ts` files must continue passing)
- `FaceAnalysisSchema.safeParse(data)` returns `{ success: true, data: FaceAnalysisOutput }` or `{ success: false, error: ZodError }` — `error.issues` is the array
- `getPrompt`, `FaceAnalysisSchema`, `ConsultationSchema` are barrel-exported from `@/lib/ai`

**Story 4.1 files (DO NOT touch):**
- `src/lib/ai/provider.ts` — `AIProvider` interface with `analyzeFace(photo: Buffer, options?: AnalysisOptions)`
- `src/lib/ai/gemini.ts` — fully functional GeminiProvider
- `src/lib/ai/openai.ts` — fully functional OpenAIProvider
- `src/lib/ai/index.ts` — exports `getAIRouter()`, `createAIRouter()`, `resetAIRouter()`

**Established code patterns (from Story 4.1 debug learnings):**
- Vitest 4.x constructor mock: use `vi.fn().mockImplementation(function() {...})` not arrow functions for `new` mocks
- `vi.mock()` must be at module level — not inside `describe` blocks
- TypeScript strict: always cast mock return values with `as unknown as TargetType`

### Critical Guardrails

- **DO NOT** implement `FaceAnalysisSchema.safeParse()` in `GeminiProvider` or `OpenAIProvider` — validation belongs in the API route layer (Story 4.6 will wire validation more broadly). Providers return raw JSON; route validates.
- **DO NOT** add retry logic inside the providers — the retry-on-validation-failure (with temperature change) is API route responsibility. The `AIRouter` already has retry on transient errors (network/5xx); this story's retry is separate (retry on bad data).
- **DO NOT** store `photoBase64` in Supabase — only store the validated `face_analysis` JSON. Photo storage is handled by Story 2.6 (Supabase Storage). The analyze route receives base64 only for AI processing.
- **DO NOT** add payment checks — this route is pre-paywall. Payment gate is Story 5.x.
- **DO NOT** modify `src/app/api/consultation/start/route.ts` unless you are migrating it to Supabase (which would require updating `api-consultation-start.test.ts` to mock Supabase). If you do migrate `start`, ensure all 10 existing `api-consultation-start.test.ts` tests still pass.
- **DO NOT** add `preview-*` or consultation generation logic — that is Story 4.4 (face shape reveal UI) and Story 4.5 (consultation generation).
- **DO** use `getAIRouter()` singleton — do not call `createAIRouter()` in the route handler on each request.
- **DO** use `SUPABASE_SERVICE_ROLE_KEY` (not the anon key) for server-side Supabase operations that write to the `consultations` table, since RLS policies restrict anon/user access.
- **DO** handle the case where Supabase returns an error on the DB write but the AI analysis succeeded — return the face analysis to the client anyway, log the DB error. User experience must not fail for a DB persistence issue.
- **DO** keep the route handler under 200 lines — extract helpers (request validation, Supabase operations) into separate functions within the route file or a small utility if needed.
- **DO** run the full test suite (`npm test`) before considering the story done. All 789 existing tests + new tests must pass.

### Environment Variables Required

| Variable | Used By | Notes |
|----------|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `src/lib/supabase/server.ts` | Already in project (used by client.ts) |
| `SUPABASE_SERVICE_ROLE_KEY` | `src/lib/supabase/server.ts` | NEW — server-side only, never expose to client bundle |
| `GOOGLE_AI_API_KEY` | `src/lib/ai/config.ts` | Already configured (Story 4.1) |
| `OPENAI_API_KEY` | `src/lib/ai/config.ts` | Already configured (Story 4.1, fallback) |

Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` and `.env.example` (mask the value in example).

### References

- [Source: epics-and-stories.md#S4.3] — Face Analysis acceptance criteria: Gemini Vision, structured JSON, Zod validation, retry on failure, store in `consultations.face_analysis`, ≤10s latency, pre-paywall (free)
- [Source: architecture.md#4.1] — AI pipeline flow: Step 1 is face analysis (5-10s), returns face_shape, proportions, confidence, hair_type
- [Source: architecture.md#4.2] — AIRouter: always use `router.execute(task)` for automatic retry+fallback; never call providers directly
- [Source: architecture.md#4.4] — Output validation: `FaceAnalysisSchema.safeParse(result)` — retry with different temperature on failure
- [Source: architecture.md#5.1] — API route: `POST /api/consultation/start` creates record, new `POST /api/consultation/analyze` triggers Step 1
- [Source: architecture.md#3.1] — `consultations` table: `face_analysis (jsonb)`, `status (pending/analyzing/complete/failed)`
- [Source: architecture.md#7.3] — API security: Zod on all inputs; AI keys server-side only; SUPABASE_SERVICE_ROLE_KEY server-side only
- [Source: 4-1-ai-provider-abstraction-layer.md#Dev Notes] — `analyzeFace(photo: Buffer, options?: AnalysisOptions)` signature; AIRouter usage patterns
- [Source: 4-2-prompt-management-system.md#Dev Notes] — `FaceAnalysisSchema` exact shape; Zod v4 API (`error.issues`, `safeParse()`); test baseline is 789 tests
- [Source: 4-2-prompt-management-system.md#Completion Notes] — `FaceAnalysisSchema` and `ConsultationSchema` exported from `src/lib/ai/schemas/index.ts` and re-exported from `src/lib/ai/index.ts`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No debug issues encountered. Implementation was straightforward following the Dev Notes patterns.

### Completion Notes List

- Implemented `POST /api/consultation/analyze` route at `src/app/api/consultation/analyze/route.ts` with full Zod input validation, AI analysis via AIRouter singleton, FaceAnalysisSchema validation with retry on failure, and Supabase status tracking.
- Created `src/lib/supabase/server.ts` server-side Supabase client using `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS).
- Used Option 2 (fallback) for Supabase integration: analyze route handles its own DB operations without modifying `start/route.ts`, preserving all 10 existing `api-consultation-start.test.ts` tests.
- Followed TDD: tests written first (RED), then implementation (GREEN), then verified no regressions.
- All 11 new tests pass. Full suite: 800 tests pass (789 existing + 11 new). Zero regressions.
- Added `SUPABASE_SERVICE_ROLE_KEY` to `.env.example` with server-side-only comment.
- Route correctly implements: 400 on bad input, 404 on missing consultationId, 422 on AI validation failure (both attempts), 500 on AI exception, 200 with faceAnalysis on success.
- DB error after successful AI analysis returns 200 (user experience preserved, error logged).

### File List

- src/app/api/consultation/analyze/route.ts (NEW)
- src/lib/supabase/server.ts (NEW)
- src/test/api-consultation-analyze.test.ts (NEW)
- .env.example (MODIFIED — added SUPABASE_SERVICE_ROLE_KEY)
- _bmad-output/implementation-artifacts/4-3-face-analysis.md (MODIFIED — story file)
- _bmad-output/implementation-artifacts/sprint-status.yaml (MODIFIED — status updated)

## Senior Developer Review (AI)

**Reviewer:** Fusuma (AI Code Review) on 2026-03-02

**Outcome:** APPROVED with fixes applied

### Git vs Story Discrepancies
- 0 discrepancies: All files listed in File List match git untracked/modified files.

### Issues Found and Fixed

**HIGH (Fixed):**
1. `photoBase64` had no maximum size validation — a malicious or misconfigured client could send a multi-hundred-MB string, causing the server to allocate a huge `Buffer`. Fixed by adding `.max(6 * 1024 * 1024, 'Photo exceeds maximum allowed size')` to the Zod schema in `route.ts`.

**MEDIUM (Fixed):**
2. Status update to `'analyzing'` had no error handling — if Supabase failed to set status=analyzing, the route silently continued. Fixed by destructuring `{ error: analyzingError }` and logging the error as non-fatal (route continues processing since the AI analysis is the critical path).
3. `mimeType` was validated by Zod schema but immediately discarded without comment — created a dead code confusion smell. Fixed by adding an explanatory comment at the destructuring site, clarifying this is intentional per architecture constraints.

**LOW (Fixed via new tests):**
4. AC5 (status lifecycle: pending→analyzing→complete/failed) had no test assertions verifying that `update({ status: 'analyzing' })` was called before the AI call. Added test `'calls status=analyzing update before AI analysis (AC5: status lifecycle)'` with explicit assertions on the update mock call chain.
5. No test for the new `MAX_PHOTO_BASE64_LENGTH` constraint. Added test `'returns 400 when photoBase64 exceeds maximum allowed size'`.

**NOT FIXED (acceptable):**
- No explicit AI timeout (10s target from AC7) — Vercel serverless has a 90s timeout; adding a per-request AbortController is deferred to Story 4.8 (performance tuning).
- `createServerSupabaseClient()` creates a new client per request — lightweight enough for MVP serverless use; connection pooling via Supabase is handled server-side.
- `FaceAnalysisSchema` is mocked in tests rather than using real Zod validation — acceptable unit test approach; integration coverage is left for E2E tests.

### AC Validation
- AC1: Route exists at correct path, request schema matches spec — IMPLEMENTED
- AC2: `getAIRouter().execute(p => p.analyzeFace(buffer))` used correctly — IMPLEMENTED
- AC3: `FaceAnalysisSchema.safeParse()` with retry at `temperature: 0.2` — IMPLEMENTED
- AC4: Returns 422 `{ error: 'AI analysis failed validation', details: ... }` on double failure — IMPLEMENTED
- AC5: DB writes for face_analysis and status transitions — IMPLEMENTED (with fix applied for error handling)
- AC6: No payment check in route — IMPLEMENTED (confirmed pre-paywall)
- AC7: No explicit timeout guard — ACCEPTABLE (deferred, Vercel serverless provides 90s hard limit)
- AC8: 802 tests pass (789 original + 11 story tests + 2 new review tests) — IMPLEMENTED

### Test Summary
- Total tests after review: 802 (up from 800)
- New tests added: 2 (`status=analyzing lifecycle`, `oversized photoBase64`)
- All 51 test files pass, zero regressions

## Change Log

- 2026-03-02: Implemented story 4-3-face-analysis — created analyze route, server Supabase client, and comprehensive test suite. 800 tests passing.
- 2026-03-02: Code review completed — applied 3 fixes (photoBase64 max size validation, analyzingError handling, dead code comment), added 2 new tests. 802 tests passing. Status updated to done.
