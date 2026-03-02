# Story 4.5: Consultation Generation (Step 2)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a paid user,
I want personalized hairstyle recommendations generated based on my face shape and lifestyle answers,
so that I receive a complete consultation — 2-3 style recommendations, styles to avoid, and grooming tips — immediately after payment is confirmed.

## Acceptance Criteria

1. A `POST /api/consultation/generate` route accepts `{ consultationId }` and triggers Step 2 AI consultation generation using the stored `face_analysis` and `questionnaire_responses` from the `consultations` table in Supabase
2. The route calls `AIRouter.execute()` → `provider.generateConsultation(faceAnalysis, questionnaire)` using the existing provider abstraction (Gemini primary, OpenAI fallback)
3. The gender field from questionnaire (`questionnaire['gender']`) determines which prompt is used: `consultation-female` for `'female'`, `consultation-male` for everything else — this routing is already implemented in `GeminiProvider.generateConsultation()` and `OpenAIProvider.generateConsultation()`
4. The AI response is validated against `ConsultationSchema.safeParse()` — if validation fails, retry once with `temperature: 0.2` before failing
5. If both attempts fail schema validation, return HTTP 422 with `{ error: 'AI consultation failed validation', details: ... }` — never return invalid data
6. On success, store the consultation result in normalized Supabase tables: `recommendations` (2–3 rows), `styles_to_avoid` (2–3 rows), `grooming_tips` (3+ rows), and update `consultations.status = 'complete'`
7. The route is protected: only consultations with `payment_status = 'paid'` may trigger generation — return 403 if payment is not confirmed
8. The route is idempotent: if consultation is already `status = 'complete'`, return 200 with `{ status: 'already_complete' }` without re-generating
9. The `consultations.ai_cost_cents` column is updated with the cumulative cost of this Step 2 AI call (appended to any existing Step 1 cost)
10. Latency target: ≤ 15 seconds end-to-end (Gemini Flash text generation ~5–12s + DB writes ~200ms)
11. All existing 829 tests pass with zero regressions after implementation

## Tasks / Subtasks

- [x] Task 1: Create `POST /api/consultation/generate` route (AC: 1, 2, 3, 4, 5, 7, 8)
  - [x] Create `src/app/api/consultation/generate/route.ts`
  - [x] Define request schema using Zod: `{ consultationId: z.string().uuid() }`
  - [x] Query Supabase to fetch consultation record (404 if not found)
  - [x] Check `payment_status === 'paid'` — return 403 if not paid
  - [x] Check idempotency: if `status === 'complete'` and `recommendations` table has rows for this `consultationId`, return 200 `{ status: 'already_complete' }`
  - [x] Extract `face_analysis` (jsonb) and `questionnaire_responses` (jsonb) from consultation record
  - [x] Call `getAIRouter().execute(provider => provider.generateConsultation(faceAnalysis, questionnaire))`
  - [x] Run `ConsultationSchema.safeParse(result)` — if fails, retry with `{ temperature: 0.2 }`
  - [x] If retry also fails, update `status = 'failed'`, return 422 with validation details
  - [x] On success, call Supabase insertion helper for normalized tables

- [x] Task 2: Store consultation results in normalized Supabase tables (AC: 6, 9)
  - [x] Insert rows into `recommendations` table: `{ consultation_id, rank, style_name, justification, match_score, difficulty_level }`
  - [x] Insert rows into `styles_to_avoid` table: `{ consultation_id, style_name, reason }`
  - [x] Insert rows into `grooming_tips` table: `{ consultation_id, category, tip_text, icon }`
  - [x] Update `consultations` record: `status = 'complete'`, `completed_at = now()`, `ai_cost_cents += Step2 cost`
  - [x] Use `createServerSupabaseClient()` (service role key) for all DB operations
  - [x] Wrap all inserts in a logical group (insert recommendations → styles_to_avoid → grooming_tips → update consultation) — if any insert fails, still attempt the remaining and log errors (best-effort, user gets result even if partial DB write fails)

- [x] Task 3: Write tests (AC: 1–11)
  - [x] Create `src/test/api-consultation-generate.test.ts`
  - [x] Test: valid paid consultation → 200 with `{ consultation: ConsultationOutput }`
  - [x] Test: AI returns invalid response, retry succeeds → 200, `generateConsultation` called twice
  - [x] Test: both AI attempts fail validation → 422 with `{ error: 'AI consultation failed validation', details: [...] }`
  - [x] Test: missing `consultationId` → 400
  - [x] Test: invalid UUID → 400
  - [x] Test: consultation not found in DB → 404
  - [x] Test: consultation exists but `payment_status !== 'paid'` → 403
  - [x] Test: consultation already `status === 'complete'` → 200 `{ status: 'already_complete' }` (no AI call)
  - [x] Test: DB write fails after successful AI generation → 200 (returns consultation, logs error)
  - [x] Test: `getAIRouter()` throws 500 → 500
  - [x] Test: gender `'female'` in questionnaire → `generateConsultation` called (provider uses female prompt internally — no mock-level assertion needed since routing is inside provider)
  - [x] Run full test suite to verify 829 + new tests all pass

## Dev Notes

### Architecture Compliance

- **Route location:** `src/app/api/consultation/generate/route.ts` — follows Next.js App Router convention. Consistent with `src/app/api/consultation/analyze/route.ts`. [Source: architecture.md#6.1]
- **AI call via AIRouter ONLY:** Never call `GeminiProvider` or `OpenAIProvider` directly. Always use `getAIRouter().execute()`. [Source: architecture.md#4.2]
- **Gender routing happens INSIDE the provider:** `GeminiProvider.generateConsultation()` and `OpenAIProvider.generateConsultation()` already extract `questionnaire['gender']` and select the correct prompt (`consultation-male` or `consultation-female`). The generate route does NOT need to handle this — just pass the `questionnaire` object as-is. [Source: src/lib/ai/gemini.ts#generateConsultation]
- **ConsultationSchema location:** Already implemented in Story 4.2 at `src/lib/ai/schemas/consultation.schema.ts`. Import via `import { ConsultationSchema } from '@/lib/ai/schemas'` or barrel `import { ConsultationSchema } from '@/lib/ai'`. [Source: 4-2-prompt-management-system.md]
- **Supabase server client:** Use existing `createServerSupabaseClient()` from `src/lib/supabase/server.ts` — already tested and working. Never use the browser `createClient` in API routes. [Source: 4-3-face-analysis.md, src/lib/supabase/server.ts]
- **Post-paywall ONLY:** This route MUST check `payment_status === 'paid'` before triggering AI. This is a critical security boundary. Payment is confirmed server-side via Stripe webhook (Story 5.5 sets `payment_status = 'paid'`). [Source: architecture.md#4.1, architecture.md#5.1]
- **Data already in DB from Story 4.3:** `consultations.face_analysis` (jsonb) and `questionnaire_responses` (jsonb) were written by `POST /api/consultation/analyze` (Story 4.3) and `POST /api/consultation/start` respectively. Read them back from Supabase — do NOT pass them in the request body to avoid re-sending large data payloads. [Source: architecture.md#3.1, 4-3-face-analysis.md]
- **Zod for input validation:** All API routes use Zod for request body validation — return 400 with `{ error: issues.map(i => i.message).join(', ') }`. [Source: architecture.md#7.3]

### Technical Requirements

**Request schema (Zod):**
```typescript
const GenerateRequestSchema = z.object({
  consultationId: z.string().uuid(),
});
```

**Route implementation pattern:**
```typescript
// src/app/api/consultation/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAIRouter, ConsultationSchema } from '@/lib/ai';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { FaceAnalysis, QuestionnaireData } from '@/types';

const GenerateRequestSchema = z.object({
  consultationId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(', ') },
      { status: 400 }
    );
  }

  const { consultationId } = parsed.data;
  const supabase = createServerSupabaseClient();

  // 1. Fetch consultation record
  const { data: consultation, error: fetchError } = await supabase
    .from('consultations')
    .select('id, status, payment_status, face_analysis, questionnaire_responses, ai_cost_cents')
    .eq('id', consultationId)
    .single();

  if (fetchError || !consultation) {
    return NextResponse.json({ error: 'Consultation not found' }, { status: 404 });
  }

  // 2. Payment gate
  if (consultation.payment_status !== 'paid') {
    return NextResponse.json({ error: 'Payment required' }, { status: 403 });
  }

  // 3. Idempotency check
  if (consultation.status === 'complete') {
    return NextResponse.json({ status: 'already_complete' }, { status: 200 });
  }

  // 4. Extract analysis + questionnaire from DB
  const faceAnalysis = consultation.face_analysis as FaceAnalysis;
  const questionnaire = consultation.questionnaire_responses as QuestionnaireData;

  // 5. Run AI consultation generation with retry on validation failure
  try {
    const router = getAIRouter();

    // First attempt
    const rawResult = await router.execute((p) =>
      p.generateConsultation(faceAnalysis, questionnaire)
    );
    let validated = ConsultationSchema.safeParse(rawResult);

    // Retry with lower temperature if validation fails
    if (!validated.success) {
      // Note: generateConsultation does not accept options param — use a workaround
      // AIRouter.execute is a generic wrapper; retry must be handled at the route level
      const retryResult = await router.execute((p) =>
        p.generateConsultation(faceAnalysis, questionnaire)
      );
      validated = ConsultationSchema.safeParse(retryResult);
    }

    if (!validated.success) {
      await supabase
        .from('consultations')
        .update({ status: 'failed' })
        .eq('id', consultationId);
      return NextResponse.json(
        { error: 'AI consultation failed validation', details: validated.error.issues },
        { status: 422 }
      );
    }

    // 6. Store in normalized tables (best-effort)
    const consultationData = validated.data;
    await storeConsultationResults(supabase, consultationId, consultationData);

    // 7. Update consultation status
    const { error: updateError } = await supabase
      .from('consultations')
      .update({ status: 'complete', completed_at: new Date().toISOString() })
      .eq('id', consultationId);

    if (updateError) {
      console.error('[POST /api/consultation/generate] Status update failed:', updateError);
    }

    return NextResponse.json({ consultation: consultationData }, { status: 200 });
  } catch (error) {
    await supabase.from('consultations').update({ status: 'failed' }).eq('id', consultationId);
    console.error('[POST /api/consultation/generate] AI error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**CRITICAL NOTE on retry with temperature:** `generateConsultation(analysis, questionnaire)` does NOT take an `AnalysisOptions` param (unlike `analyzeFace`). The AIProvider interface does not expose temperature for consultation generation. For the retry, simply call `generateConsultation` a second time — the temperature variation is handled by slight natural variance in LLM outputs. Do NOT modify the `AIProvider` interface or `generateConsultation` signature to add options — that breaks Story 4.1's contract. [Source: src/lib/ai/provider.ts, src/types/index.ts]

**Normalized table insertion helper:**
```typescript
async function storeConsultationResults(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  consultationId: string,
  data: ConsultationOutput
): Promise<void> {
  // Insert recommendations (ranked 1, 2, 3)
  const recsToInsert = data.recommendations.map((rec, index) => ({
    consultation_id: consultationId,
    rank: index + 1,
    style_name: rec.styleName,
    justification: rec.justification,
    match_score: rec.matchScore,
    difficulty_level: rec.difficultyLevel,
    preview_status: 'none', // Story 7.1 will populate this
  }));
  const { error: recError } = await supabase.from('recommendations').insert(recsToInsert);
  if (recError) console.error('[generate] recommendations insert failed:', recError);

  // Insert styles to avoid
  const avoidsToInsert = data.stylesToAvoid.map((s) => ({
    consultation_id: consultationId,
    style_name: s.styleName,
    reason: s.reason,
  }));
  const { error: avoidError } = await supabase.from('styles_to_avoid').insert(avoidsToInsert);
  if (avoidError) console.error('[generate] styles_to_avoid insert failed:', avoidError);

  // Insert grooming tips
  const tipsToInsert = data.groomingTips.map((tip) => ({
    consultation_id: consultationId,
    category: tip.category,
    tip_text: tip.tipText,
    icon: tip.icon,
  }));
  const { error: tipError } = await supabase.from('grooming_tips').insert(tipsToInsert);
  if (tipError) console.error('[generate] grooming_tips insert failed:', tipError);
}
```

**Column name mapping (TypeScript camelCase → Supabase snake_case):**

| TypeScript (ConsultationOutput) | Supabase column |
|---|---|
| `rec.styleName` | `style_name` |
| `rec.justification` | `justification` |
| `rec.matchScore` | `match_score` |
| `rec.difficultyLevel` | `difficulty_level` |
| `avoid.styleName` | `style_name` |
| `avoid.reason` | `reason` |
| `tip.tipText` | `tip_text` |
| `tip.category` | `category` |
| `tip.icon` | `icon` |

### Project Structure Notes

```
src/
├── app/
│   └── api/
│       └── consultation/
│           ├── analyze/
│           │   └── route.ts          NO CHANGES (Story 4.3)
│           ├── start/
│           │   └── route.ts          NO CHANGES (Story 3.6)
│           └── generate/
│               └── route.ts          NEW: consultation generation + normalized DB storage
├── lib/
│   ├── ai/                           NO CHANGES (providers, prompts, schemas from 4.1/4.2)
│   └── supabase/
│       ├── client.ts                 NO CHANGES
│       └── server.ts                 NO CHANGES (already exists from Story 4.3)
└── test/
    └── api-consultation-generate.test.ts   NEW: route tests
```

**Files that must NOT be modified:**
- `src/types/index.ts` — type definitions are frozen
- `src/lib/ai/provider.ts` — AIProvider interface unchanged (do NOT add temperature param to `generateConsultation`)
- `src/lib/ai/gemini.ts` — provider unchanged
- `src/lib/ai/openai.ts` — provider unchanged
- `src/lib/ai/schemas/**` — Zod schemas from Story 4.2
- `src/lib/ai/prompts/**` — prompt files from Story 4.2
- `src/app/api/consultation/analyze/route.ts` — Story 4.3, do not touch
- `src/app/api/consultation/start/route.ts` — Story 3.6, do not touch
- `src/lib/supabase/server.ts` — created in Story 4.3, do not touch

### Testing Requirements

**Test file:** `src/test/api-consultation-generate.test.ts`

Use `vi.mock('@/lib/ai', ...)` to mock `getAIRouter` and `vi.mock('@/lib/supabase/server', ...)` to mock Supabase.

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/consultation/generate/route';
import { NextRequest } from 'next/server';

// Mock AI router
vi.mock('@/lib/ai', () => ({
  getAIRouter: vi.fn(),
  ConsultationSchema: {
    safeParse: vi.fn(),
  },
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));
```

**Mock valid ConsultationOutput for tests:**
```typescript
const validConsultation = {
  recommendations: [
    {
      styleName: 'Undercut Clássico',
      justification: 'Este corte complementa o rosto oval ao adicionar estrutura nas laterais. A versatilidade do undercut permite múltiplos estilos no topo.',
      matchScore: 0.92,
      difficultyLevel: 'medium' as const,
    },
    {
      styleName: 'Fade Lateral',
      justification: 'O fade lateral cria uma transição suave que realça as proporções do rosto oval. Fácil de manter com visitas regulares ao barbeiro.',
      matchScore: 0.85,
      difficultyLevel: 'low' as const,
    },
  ],
  stylesToAvoid: [
    {
      styleName: 'Franja Volumosa',
      reason: 'Adiciona peso excessivo ao topo, desequilibrando as proporções naturais do rosto oval.',
    },
    {
      styleName: 'Topknot Volumoso',
      reason: 'Cria altura excessiva no topo, fazendo o rosto parecer mais comprido do que é.',
    },
  ],
  groomingTips: [
    { category: 'products' as const, tipText: 'Use pomada de fixação média para styling', icon: '💆' },
    { category: 'routine' as const, tipText: 'Lavar o cabelo em dias alternados', icon: '🚿' },
    { category: 'barber_tips' as const, tipText: 'Visita ao barbeiro a cada 3-4 semanas para manter o fade', icon: '✂️' },
  ],
};
```

**Mock Supabase pattern (consistent with api-consultation-analyze.test.ts):**
```typescript
const mockSelectChain = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({
    data: {
      id: 'test-uuid-1234',
      status: 'analyzing',
      payment_status: 'paid',
      face_analysis: {
        faceShape: 'oval',
        confidence: 0.92,
        proportions: { foreheadRatio: 0.78, cheekboneRatio: 1.0, jawRatio: 0.72, faceLength: 1.35 },
        hairAssessment: { type: 'straight', texture: 'medium', density: 'medium', currentStyle: 'short' },
      },
      questionnaire_responses: { gender: 'male', lifestyle: 'active', maintenance: 'low' },
      ai_cost_cents: 1,
    },
    error: null,
  }),
  update: vi.fn().mockReturnThis(),
  insert: vi.fn().mockResolvedValue({ error: null }),
};

// In beforeEach:
(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(mockSelectChain);
```

**Required tests and expected results:**

| Test | Expected Result |
|---|---|
| Valid paid consultation, AI succeeds | 200, `{ consultation: validConsultation }` |
| First AI call fails validation, retry succeeds | 200, `generateConsultation` called twice |
| Both AI attempts fail validation | 422, `{ error: 'AI consultation failed validation', details: [...] }` |
| Missing `consultationId` in body | 400 |
| Invalid UUID for `consultationId` | 400 |
| Consultation not found (Supabase returns null) | 404 |
| Consultation `payment_status = 'free'` | 403, `{ error: 'Payment required' }` |
| Consultation `payment_status = 'pending'` | 403, `{ error: 'Payment required' }` |
| Consultation `status = 'complete'` (idempotent) | 200, `{ status: 'already_complete' }`, `getAIRouter` NOT called |
| Supabase insert fails after successful AI generation | 200 (returns consultation, logs error) |
| `getAIRouter().execute()` throws error | 500, status updated to 'failed' |

**Test isolation:** Call `vi.clearAllMocks()` in `beforeEach` to reset mock state.

### Library & Framework Requirements

| Library | Version | Usage in This Story |
|---|---|---|
| zod | ^4.3.6 | ALREADY INSTALLED — request validation + ConsultationSchema.safeParse() |
| @supabase/supabase-js | ^2.98.0 | ALREADY INSTALLED — normalized table inserts via createServerSupabaseClient() |
| @google/genai | ^1.43.0 | ALREADY INSTALLED — used indirectly via GeminiProvider (no direct usage) |
| openai | ^6.25.0 | ALREADY INSTALLED — used indirectly via OpenAIProvider (no direct usage) |
| next | 16.1.6 | NextRequest, NextResponse, App Router |
| vitest | ^4.0.18 | Test runner |

**NO NEW DEPENDENCIES** — all required packages are already installed.

### Cross-Story Dependencies

- **Story 4.1 (AI Provider Abstraction) — DONE:** `getAIRouter()` singleton fully implemented. `provider.generateConsultation(analysis, questionnaire)` is the correct call signature — no options param. [Source: src/lib/ai/provider.ts]
- **Story 4.2 (Prompt Management) — DONE:** `ConsultationSchema` exists at `src/lib/ai/schemas/consultation.schema.ts`. Gender-specific prompt routing is already wired inside `GeminiProvider.generateConsultation()` and `OpenAIProvider.generateConsultation()`. [Source: src/lib/ai/gemini.ts]
- **Story 4.3 (Face Analysis) — DONE:** `consultations.face_analysis` (jsonb) is stored in Supabase by the analyze route. This generate route reads it back. Do NOT re-send photo data. [Source: 4-3-face-analysis.md]
- **Story 4.4 (Face Shape Reveal) — DONE:** Navigation to `/consultation/results/:id` sets up the destination where this consultation data will be displayed. [Source: 4-4-instant-face-shape-reveal.md]
- **Story 4.6 (AI Output Validation) — NEXT:** Will add confidence threshold check and text length enforcement on top of this story's `ConsultationSchema.safeParse()`. The pattern established here (safeParse → retry → 422) is the foundation.
- **Story 4.7 (AI Cost Tracking) — NEXT:** Will read `consultations.ai_cost_cents` set here for cost aggregation dashboards.
- **Story 4.8 (Deterministic Results) — FUTURE:** Cache by `photo_hash + questionnaire_hash + CURRENT_PROMPT_VERSION`. This story writes the results; 4.8 will add cache lookup before calling this route.
- **Story 5.5 (Stripe Webhook) — FUTURE:** The Stripe webhook handler calls `POST /api/consultation/generate` after `payment_intent.succeeded`. The route's payment gate (`payment_status === 'paid'`) ensures security. [Source: epics-and-stories.md#S5.5, architecture.md#5.2]
- **Epic 6 (Results Page) — FUTURE:** Results page (`/consultation/results/:id`) fetches `recommendations`, `styles_to_avoid`, `grooming_tips` from Supabase using the `consultationId`. Data stored in normalized tables by this story is the source for Epic 6.

### Performance Targets

- Route latency target: ≤ 15 seconds total (Gemini Flash text generation ~5–12s + Supabase reads/writes ~300ms)
- Supabase reads: single `.single()` query → < 50ms
- Supabase inserts: 3 separate insert calls, each < 100ms (sequential, not parallel — simpler for error handling)
- If AI call exceeds 90 seconds, Vercel serverless timeout applies — `AIRouter` logs the failure
- This route is triggered server-side from the Stripe webhook (not directly by the user), so 15s latency is acceptable

### Previous Story Intelligence (Story 4.4 — Instant Face Shape Reveal)

**Key patterns to carry forward:**

- `vi.mock()` must be at module top level (Vitest hoists these) — not inside `describe`
- `as unknown as ReturnType<typeof vi.fn>` cast pattern for mocked functions
- `vi.clearAllMocks()` in `beforeEach` for test isolation
- Zod v4: use `error.issues` (not `error.errors`)
- Existing test baseline: **829 tests** (52 test files, all passing as of Story 4.4 code review)
- `ConsultationOutput` type: `z.infer<typeof ConsultationSchema>` — import from `@/lib/ai/schemas/consultation.schema` or barrel `@/lib/ai/schemas`
- Pattern for Supabase mock with chained methods from `api-consultation-analyze.test.ts`: mock `.from().select().eq().single()` chain returning `{ data, error }` objects

**Story 4.3 patterns that directly apply here:**
- `createServerSupabaseClient()` mock pattern for service-role Supabase
- `getAIRouter().execute()` mock: `(getAIRouter as ...).mockReturnValue({ execute: vi.fn().mockResolvedValue(rawResult) })`
- Best-effort DB writes: log errors, return success to user if AI analysis succeeded
- Status lifecycle: set `status = 'failed'` on catch before returning 500

**Story 4.4 completion state (verified):**
- Test baseline is 829 tests (802 from 4.3 review + 27 from 4.4 review)
- `faceAnalysis` is stored in Zustand store AND in Supabase `consultations.face_analysis`
- Navigation: processing page → `/consultation/results/:id` — results page is where this story's data will be displayed

### Git Intelligence

Recent commits follow this pattern:
- `feat(epic-4): implement story 4-4-instant-face-shape-reveal`
- `feat(epic-4): implement story 4-3-face-analysis`

Suggested commit message: `feat(epic-4): implement story 4-5-consultation-generation`

### Critical Guardrails

- **DO NOT** call `getAIRouter()` or any AI provider directly from frontend components. This route is a server-side API route only. [Source: architecture.md#7.3]
- **DO NOT** modify `src/lib/ai/provider.ts` to add a temperature/options parameter to `generateConsultation()` — that would break Story 4.1's contract and existing tests. For the retry, call `generateConsultation` a second time without temperature override. [Source: src/lib/ai/provider.ts, src/types/index.ts]
- **DO NOT** accept `face_analysis` or `questionnaire_responses` in the request body — read them from Supabase by `consultationId`. This prevents re-sending large data payloads and ensures data integrity. [Source: architecture.md#5.1]
- **DO NOT** skip the payment gate check (`payment_status === 'paid'`). This is a critical security boundary between free and paid content. [Source: architecture.md#4.1]
- **DO NOT** add results-page rendering or Zustand store updates. This is a server-side API route — it stores data in Supabase. The results page (Epic 6) fetches from Supabase. No client-side state management in this story.
- **DO NOT** implement the Stripe webhook handler (`POST /api/webhook/stripe`) — that is Story 5.5. This story only creates the generation endpoint that the webhook will call.
- **DO NOT** modify the `ConsultationSchema` — it was finalized in Story 4.2 and is used in tests across the codebase.
- **DO** use `SUPABASE_SERVICE_ROLE_KEY` via `createServerSupabaseClient()` for all DB operations — RLS restricts anon access to `recommendations`, `styles_to_avoid`, `grooming_tips` tables.
- **DO** implement idempotency: if `status === 'complete'`, return early without re-generating. The Stripe webhook may deliver the same event multiple times.
- **DO** keep the route handler under 200 lines — extract `storeConsultationResults()` as a helper function within the same route file.
- **DO** run the full test suite (`npm test`) before considering the story done. All 829 existing tests + new tests must pass.
- **DO** set `preview_status: 'none'` when inserting into `recommendations` — this field is required by the table schema and will be updated by Story 7.1 (Kie.ai preview generation). [Source: architecture.md#3.1]

### Environment Variables Required

No new environment variables needed. All required variables are already configured:

| Variable | Used By | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `src/lib/supabase/server.ts` | Already configured |
| `SUPABASE_SERVICE_ROLE_KEY` | `src/lib/supabase/server.ts` | Added in Story 4.3 |
| `GOOGLE_AI_API_KEY` | `src/lib/ai/config.ts` | Already configured |
| `OPENAI_API_KEY` | `src/lib/ai/config.ts` | Already configured (fallback) |

### References

- [Source: epics-and-stories.md#S4.5] — Consultation Generation AC: face_analysis + questionnaire + gender input, 2-3 recommendations with style_name/justification/match_score/difficulty_level, 2-3 styles_to_avoid, grooming_tips by category, gender-specific prompts, ConsultationSchema validation, normalized table storage, post-payment trigger, ≤15s latency
- [Source: architecture.md#4.1] — AI pipeline: Step 2 (10-15s) uses Gemini Flash text → recommendations + justifications + grooming tips + styles_to_avoid; Steps 1+2 behind paywall
- [Source: architecture.md#4.2] — AIRouter: always use `router.execute(task)` for automatic retry+fallback; never call providers directly
- [Source: architecture.md#4.3] — Prompt management: gender-specific prompts (`consultation-male.ts`, `consultation-female.ts`) — already wired in providers
- [Source: architecture.md#5.1] — API: `POST /api/consultation/unlock` triggers full consultation generation (async); `GET /api/consultation/:id` returns full data if paid
- [Source: architecture.md#3.1] — DB schema: `recommendations` table (rank, style_name, justification, match_score, difficulty_level, preview_status='none'), `styles_to_avoid` table (style_name, reason), `grooming_tips` table (category, tip_text, icon)
- [Source: architecture.md#7.3] — API security: AI keys server-side only; Zod on all inputs; SUPABASE_SERVICE_ROLE_KEY server-side only
- [Source: 4-1-ai-provider-abstraction-layer.md] — `generateConsultation(analysis: FaceAnalysis, questionnaire: QuestionnaireData): Promise<Consultation>` — no options param
- [Source: 4-2-prompt-management-system.md] — `ConsultationSchema` shape: `{ recommendations: StyleRecommendationSchema[], stylesToAvoid: StyleToAvoidSchema[], groomingTips: GroomingTipSchema[] }`; `ConsultationOutput` type = `z.infer<typeof ConsultationSchema>`
- [Source: 4-3-face-analysis.md] — `createServerSupabaseClient()` at `src/lib/supabase/server.ts`; Supabase mock pattern; service role key usage; DB error handling best-practices (log, don't fail user)
- [Source: src/lib/ai/gemini.ts] — `generateConsultation()` already extracts `questionnaire['gender']` and routes to correct prompt — no changes needed in provider
- [Source: src/lib/ai/schemas/consultation.schema.ts] — `ConsultationSchema` exact structure with sub-schemas for StyleRecommendation, StyleToAvoid, GroomingTip
- [Source: epics-and-stories.md#S5.5] — Stripe webhook triggers consultation generation on `payment_intent.succeeded`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No debug issues encountered. Implementation was straightforward following the analyze route pattern.

### Completion Notes List

- Implemented `POST /api/consultation/generate` route at `src/app/api/consultation/generate/route.ts` following the exact pattern from `src/app/api/consultation/analyze/route.ts`
- Zod request validation with `GenerateRequestSchema` (uuid-validated `consultationId`)
- Payment gate enforces `payment_status === 'paid'` before any AI call (403 if not paid)
- Idempotency: returns `{ status: 'already_complete' }` without AI call if `status === 'complete'` AND recommendations rows exist for this consultationId (double-check guards against false positives from partial DB write failures)
- AI consultation via `getAIRouter().execute()` with `ConsultationSchema.safeParse()` validation
- Retry pattern: calls `generateConsultation` a second time on validation failure (no temperature param available on consultation — natural LLM variance handles retry)
- Both failures: sets `status = 'failed'`, returns 422 with Zod issue details
- `storeConsultationResults()` helper stores to `recommendations`, `styles_to_avoid`, `grooming_tips` tables (best-effort, logs errors without failing user response)
- Updates `consultations.status = 'complete'`, `completed_at`, and `ai_cost_cents` (cumulative: existing Step 1 cost + Step 2 cost) on success using `getAICallLogs()` to retrieve Step 2 cost
- `preview_status: 'none'` set on recommendations rows (Story 7.1 will populate)
- 14 new tests added; full suite: 843 tests passed (829 existing + 14 new), zero regressions

### Code Review Fixes Applied (2026-03-02)

- **HIGH (AC9)**: `ai_cost_cents` was never written to the DB. Fixed: route now reads `getAICallLogs()` before/after AI calls to compute Step 2 cost, then writes `ai_cost_cents: existingCost + step2Cost` in the final update
- **MEDIUM (AC8 idempotency)**: Idempotency check only verified `status === 'complete'` but did not verify normalized table data exists. Fixed: now also queries `recommendations` table for existing rows before returning `already_complete` — prevents false positives from partial DB write failures
- **MEDIUM (test accuracy)**: AC9 test was labeled "cost tracking" but only asserted `status: 'complete'`. Fixed: test now mocks `getAICallLogs()` with a simulated cost entry and asserts the exact `ai_cost_cents` value (existing 1 + step2 2 = 3) in the update call

### File List

- `src/app/api/consultation/generate/route.ts` — NEW: consultation generation API route (updated in review: AC9 cost tracking, idempotency hardening)
- `src/test/api-consultation-generate.test.ts` — NEW: 14 tests covering all ACs (updated in review: AC9 test now asserts ai_cost_cents, idempotency test now provides existingRecommendations)

## Change Log

- 2026-03-02: Story 4.5 implemented — created `POST /api/consultation/generate` route with payment gate, idempotency check, AI consultation generation with retry, normalized Supabase table inserts, and 14 comprehensive tests. Full suite: 843 tests passing.
