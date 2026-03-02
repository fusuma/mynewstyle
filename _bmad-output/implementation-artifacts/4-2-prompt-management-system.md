# Story 4.2: Prompt Management System

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want versioned, structured prompts with Zod-validated output schemas,
so that AI prompts can be tested, rolled back, and A/B tested without changing provider code.

## Acceptance Criteria

1. Prompts stored in `src/lib/ai/prompts/v1/` directory with three files: `face-analysis.ts`, `consultation-male.ts`, `consultation-female.ts`
2. `face-analysis.ts` exports a `getFaceAnalysisPrompt(photoBase64: string): PromptContent` function returning a structured prompt with explicit JSON output instructions matching the `FaceAnalysis` type
3. `consultation-male.ts` exports a `getMaleConsultationPrompt(analysis: FaceAnalysis, questionnaire: QuestionnaireData): PromptContent` function with male-specific guidance and "styles to avoid" section
4. `consultation-female.ts` exports a `getFemaleConsultationPrompt(analysis: FaceAnalysis, questionnaire: QuestionnaireData): PromptContent` function with female-specific guidance and "styles to avoid" section
5. Zod schemas defined in `src/lib/ai/schemas/`: `face-analysis.schema.ts` (exports `FaceAnalysisSchema`), `consultation.schema.ts` (exports `ConsultationSchema`)
6. `FaceAnalysisSchema` validates: `faceShape` (enum of 7 exact values), `confidence` (number 0–1), `proportions` (object with 4 numeric fields), `hairAssessment` (object with 4 string fields)
7. `ConsultationSchema` validates: `recommendations` (array, 2–3 items), `stylesToAvoid` (array, 2–3 items), `groomingTips` (array of categorized tips)
8. `src/lib/ai/prompts/index.ts` exports a `getPrompt(task: PromptTask, version: string, params: PromptParams): PromptContent` function enabling version routing (defaults to `'v1'`)
9. A `PromptVersion` type and `CURRENT_PROMPT_VERSION = 'v1'` constant exported from `prompts/index.ts` for A/B testing readiness
10. All existing 746 tests pass with zero regressions after implementation

## Tasks / Subtasks

- [x] Task 1: Create Zod validation schemas (AC: 5, 6, 7)
  - [x] Create `src/lib/ai/schemas/face-analysis.schema.ts` with `FaceAnalysisSchema`
  - [x] Create `src/lib/ai/schemas/consultation.schema.ts` with `ConsultationSchema`
  - [x] Ensure schemas match existing TypeScript types in `src/types/index.ts` exactly
  - [x] Export schemas from `src/lib/ai/schemas/index.ts` barrel file

- [x] Task 2: Create versioned prompt files (AC: 1, 2, 3, 4)
  - [x] Create `src/lib/ai/prompts/v1/face-analysis.ts` with `getFaceAnalysisPrompt()`
  - [x] Create `src/lib/ai/prompts/v1/consultation-male.ts` with `getMaleConsultationPrompt()`
  - [x] Create `src/lib/ai/prompts/v1/consultation-female.ts` with `getFemaleConsultationPrompt()`

- [x] Task 3: Create prompt version router (AC: 8, 9)
  - [x] Create `src/lib/ai/prompts/index.ts` with `getPrompt()`, `PromptVersion`, `CURRENT_PROMPT_VERSION`
  - [x] Implement version routing map: `{ v1: v1Prompts }` pattern for easy v2 addition

- [x] Task 4: Update AI provider implementations to use prompt system (AC: 2, 3, 4)
  - [x] Update `src/lib/ai/gemini.ts`: replace inline prompt strings with calls to `getPrompt()`
  - [x] Update `src/lib/ai/openai.ts`: replace inline prompt strings with calls to `getPrompt()`
  - [x] GeminiProvider passes gender from questionnaire to select male/female prompt

- [x] Task 5: Write tests (AC: 1–10)
  - [x] Create `src/test/ai-schemas.test.ts`: Zod schema validation tests
  - [x] Create `src/test/ai-prompts.test.ts`: prompt generation and version routing tests
  - [x] Run full test suite to verify zero regressions (must pass 746 + new tests)

## Dev Notes

### Architecture Compliance

- **Prompt File Location:** `src/lib/ai/prompts/v1/` — exactly as specified in architecture section 4.3. Do NOT place prompts elsewhere. [Source: architecture.md#4.3]
- **Schema File Location:** `src/lib/ai/schemas/` — exactly as specified in architecture section 4.3. [Source: architecture.md#4.3]
- **Versioning Rule:** Prompts are versioned (v1/, v2/) — NEVER overwrite, always create new version directory. [Source: architecture.md#4.3]
- **Structured Output:** Zod schemas are for validating AI outputs — AI returns JSON, Zod validates it. This is the "structured output" pipeline. [Source: architecture.md#4.3]
- **Server-Side Only:** All prompt and schema code is consumed only from `src/lib/ai/` which is server-side. Never import these in client components. [Source: architecture.md#7.3]
- **Zod Already Installed:** Zod v4.3.6 is in `package.json`. Use `import { z } from 'zod'`. The Zod v4 API differs from v3 — see specific usage notes below. [Source: 4-1-ai-provider-abstraction-layer.md#Dev Notes]
- **Gender from Questionnaire:** The questionnaire data passed to `generateConsultation()` contains the `gender` field. The provider must extract it to select male vs female prompt. See `QuestionnaireData` type: `Record<string, string | string[] | number>`.

### Technical Requirements

**`PromptContent` type** — define in `src/lib/ai/prompts/index.ts`:
```typescript
export interface PromptContent {
  systemPrompt?: string;  // Optional system-level instruction
  userPrompt: string;     // Main user message
  imageData?: {           // For vision tasks (face analysis)
    base64: string;
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  };
}

export type PromptTask = 'face-analysis' | 'consultation-male' | 'consultation-female';
export type PromptVersion = 'v1'; // Extend as: 'v1' | 'v2'
export const CURRENT_PROMPT_VERSION: PromptVersion = 'v1';
```

**`getPrompt()` function signature:**
```typescript
export function getPrompt(
  task: PromptTask,
  params: FaceAnalysisPromptParams | ConsultationPromptParams,
  version: PromptVersion = CURRENT_PROMPT_VERSION
): PromptContent
```

**`FaceAnalysisSchema` (src/lib/ai/schemas/face-analysis.schema.ts):**
```typescript
import { z } from 'zod';

export const FaceAnalysisSchema = z.object({
  faceShape: z.enum(['oval', 'round', 'square', 'oblong', 'heart', 'diamond', 'triangle']),
  confidence: z.number().min(0).max(1),
  proportions: z.object({
    foreheadRatio: z.number(),
    cheekboneRatio: z.number(),
    jawRatio: z.number(),
    faceLength: z.number(),
  }),
  hairAssessment: z.object({
    type: z.string(),
    texture: z.string(),
    density: z.string(),
    currentStyle: z.string(),
  }),
});

export type FaceAnalysisOutput = z.infer<typeof FaceAnalysisSchema>;
```

**`ConsultationSchema` (src/lib/ai/schemas/consultation.schema.ts):**
```typescript
import { z } from 'zod';

const StyleRecommendationSchema = z.object({
  styleName: z.string(),
  justification: z.string().min(10).max(500),
  matchScore: z.number().min(0).max(1),
  difficultyLevel: z.enum(['low', 'medium', 'high']),
});

const StyleToAvoidSchema = z.object({
  styleName: z.string(),
  reason: z.string().min(10),
});

const GroomingTipSchema = z.object({
  category: z.enum(['products', 'routine', 'barber_tips']),
  tipText: z.string().min(5),
  icon: z.string(),
});

export const ConsultationSchema = z.object({
  recommendations: z.array(StyleRecommendationSchema).min(2).max(3),
  stylesToAvoid: z.array(StyleToAvoidSchema).min(2).max(3),
  groomingTips: z.array(GroomingTipSchema).min(1),
});

export type ConsultationOutput = z.infer<typeof ConsultationSchema>;
```

**CRITICAL — Zod v4 API differences from v3:**
- `z.enum(['a', 'b'])` is the same in v4
- `z.string().min(n).max(n)` works the same
- `z.number().min(n).max(n)` works the same
- `z.array(schema).min(n).max(n)` works the same
- Use `schema.safeParse(data)` — returns `{ success: true, data }` or `{ success: false, error }`
- `error.issues` (not `error.errors`) in Zod v4 for the issues array
- Do NOT use `.parse()` in production paths — use `.safeParse()` only

**Face Analysis Prompt** (must produce JSON matching `FaceAnalysis` type):
```typescript
// src/lib/ai/prompts/v1/face-analysis.ts
export interface FaceAnalysisPromptParams {
  photoBase64: string;
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp';
}

export function getFaceAnalysisPrompt(params: FaceAnalysisPromptParams): PromptContent {
  return {
    systemPrompt: `You are an expert facial analysis AI. Analyze faces with scientific precision and return structured JSON only. Never include explanatory text outside the JSON structure.`,
    userPrompt: `Analyze this facial photograph and return a JSON object with this exact structure:
{
  "faceShape": "<one of: oval, round, square, oblong, heart, diamond, triangle>",
  "confidence": <number between 0.0 and 1.0>,
  "proportions": {
    "foreheadRatio": <number, forehead width relative to cheekbones>,
    "cheekboneRatio": <number, widest point ratio>,
    "jawRatio": <number, jaw width relative to cheekbones>,
    "faceLength": <number, length-to-width ratio>
  },
  "hairAssessment": {
    "type": "<straight|wavy|curly|coily>",
    "texture": "<fine|medium|coarse>",
    "density": "<thin|medium|thick>",
    "currentStyle": "<brief description of current style>"
  }
}

Return ONLY the JSON object. No markdown, no explanation.`,
    imageData: {
      base64: params.photoBase64,
      mimeType: params.mimeType ?? 'image/jpeg',
    },
  };
}
```

**Male Consultation Prompt structure** (must include "styles to avoid"):
```typescript
// src/lib/ai/prompts/v1/consultation-male.ts
export interface ConsultationPromptParams {
  analysis: FaceAnalysis;
  questionnaire: QuestionnaireData;
}

export function getMaleConsultationPrompt(params: ConsultationPromptParams): PromptContent {
  return {
    systemPrompt: `You are an expert men's hairstyle consultant. You provide personalized recommendations based on face shape analysis and lifestyle. Always return structured JSON. Be specific and practical.`,
    userPrompt: `Based on this male client's face analysis and questionnaire responses, provide a personalized hairstyle consultation.

Face Analysis: ${JSON.stringify(params.analysis)}

Questionnaire Responses: ${JSON.stringify(params.questionnaire)}

Return a JSON object with this exact structure:
{
  "recommendations": [
    {
      "styleName": "<specific style name>",
      "justification": "<50-200 word explanation referencing their face shape and questionnaire answers>",
      "matchScore": <number 0.0 to 1.0>,
      "difficultyLevel": "<low|medium|high>"
    }
  ],
  "stylesToAvoid": [
    {
      "styleName": "<style to avoid>",
      "reason": "<why this style doesn't work for their face shape>"
    }
  ],
  "groomingTips": [
    {
      "category": "<products|routine|barber_tips>",
      "tipText": "<specific actionable tip>",
      "icon": "<emoji or icon name>"
    }
  ]
}

Rules:
- Provide exactly 2-3 recommendations
- Provide exactly 2-3 styles to avoid
- Provide at least 3 grooming tips covering all 3 categories
- Base recommendations on the face shape: ${params.analysis.faceShape}
- Match difficulty to lifestyle preferences from questionnaire
- Return ONLY the JSON object. No markdown, no explanation.`,
  };
}
```

**Female Consultation Prompt** — same structure as male but with female-specific language:
- System prompt: "You are an expert women's hairstyle consultant..."
- Include feminine style terminology and considerations (layers, fringe, updos)
- Reference female hair types and styling tools in grooming tips
- Maintain same JSON output structure

**Provider Integration — updating `gemini.ts`:**
```typescript
// In analyzeFace():
import { getPrompt } from './prompts';
const promptContent = getPrompt('face-analysis', { photoBase64, mimeType: 'image/jpeg' });

const response = await this.client.models.generateContent({
  model: this.config.model,
  contents: [{
    role: 'user',
    parts: [
      { text: promptContent.systemPrompt ? `${promptContent.systemPrompt}\n\n${promptContent.userPrompt}` : promptContent.userPrompt },
      { inlineData: { mimeType: promptContent.imageData!.mimeType, data: promptContent.imageData!.base64 } },
    ],
  }],
  config: {
    responseMimeType: 'application/json',
    ...(options?.temperature !== undefined && { temperature: options.temperature }),
  },
});
```

**Provider Integration — gender detection from questionnaire:**
```typescript
// In generateConsultation(), detect gender from questionnaire:
const gender = (questionnaire['gender'] as string) ?? 'male';
const task: PromptTask = gender === 'female' ? 'consultation-female' : 'consultation-male';
const promptContent = getPrompt(task, { analysis, questionnaire });
```

### Project Structure Notes

```
src/
+-- lib/
|   +-- ai/
|   |   +-- provider.ts             NO CHANGES (from Story 4.1)
|   |   +-- gemini.ts               MODIFIED: use getPrompt() instead of inline strings
|   |   +-- openai.ts               MODIFIED: use getPrompt() instead of inline strings
|   |   +-- logger.ts               NO CHANGES
|   |   +-- config.ts               NO CHANGES
|   |   +-- index.ts                MODIFIED: re-export PromptContent, getPrompt, schemas
|   |   +-- prompts/                NEW DIRECTORY
|   |   |   +-- v1/                 NEW DIRECTORY
|   |   |   |   +-- face-analysis.ts         NEW: getFaceAnalysisPrompt()
|   |   |   |   +-- consultation-male.ts     NEW: getMaleConsultationPrompt()
|   |   |   |   +-- consultation-female.ts   NEW: getFemaleConsultationPrompt()
|   |   |   +-- index.ts            NEW: getPrompt(), PromptContent, PromptTask, PromptVersion
|   |   +-- schemas/                NEW DIRECTORY
|   |       +-- face-analysis.schema.ts      NEW: FaceAnalysisSchema
|   |       +-- consultation.schema.ts       NEW: ConsultationSchema
|   |       +-- index.ts            NEW: barrel exports
+-- test/
    +-- ai-schemas.test.ts          NEW: Zod schema tests
    +-- ai-prompts.test.ts          NEW: prompt function tests
    # All existing ai-*.test.ts files: NO CHANGES
```

**Alignment with architecture.md#4.3 directory layout** — exactly matches specified structure.

### References

- [Source: architecture.md#4.3] — Prompt management: `lib/ai/prompts/v1/`, `lib/ai/schemas/`, versioned prompts, Zod schemas
- [Source: architecture.md#4.4] — Output validation: `FaceAnalysisSchema.safeParse()` — output validation happens in Story 4.6, but schemas created here
- [Source: architecture.md#4.3] — "Prompts are code — version them. A/B testable: route % of traffic to different prompt versions"
- [Source: epics-and-stories.md#S4.2] — Acceptance criteria: prompts in `lib/ai/prompts/v1/`, Zod schemas, version routing, styles to avoid section
- [Source: epics-and-stories.md#S4.3] — Story 4.3 will use `FaceAnalysisSchema` for validation — schemas created here must be ready
- [Source: epics-and-stories.md#S4.5] — Story 4.5 will use `ConsultationSchema` and gender-specific prompts created here
- [Source: 4-1-ai-provider-abstraction-layer.md#Dev Notes] — "DO NOT create any prompt templates in this story. Prompts are Story 4.2." Confirms this is the right story for prompts
- [Source: 4-1-ai-provider-abstraction-layer.md#Dev Notes] — "Zod v4 API already installed" — use `z.enum()`, `z.string()`, `z.record()`, `z.union()` patterns
- [Source: 4-1-ai-provider-abstraction-layer.md#Completion Notes] — 746 tests baseline

### Library & Framework Requirements

| Library | Version | Usage in This Story |
|---------|---------|---------------------|
| zod | ^4.3.6 | **ALREADY INSTALLED** — FaceAnalysisSchema + ConsultationSchema. Use Zod v4 API |
| @google/genai | ^1.43.0 | Already installed — no changes needed |
| openai | ^6.25.0 | Already installed — no changes needed |
| next | 16.1.6 | No changes |
| typescript | ^5 | Type inference from Zod schemas via `z.infer<typeof Schema>` |
| vitest | ^4.0.18 | Test runner |

**NO NEW DEPENDENCIES** — all required packages are already installed.

### File Structure Requirements

```
src/lib/ai/
├── prompts/
│   ├── v1/
│   │   ├── face-analysis.ts          getFaceAnalysisPrompt(params)
│   │   ├── consultation-male.ts      getMaleConsultationPrompt(params)
│   │   └── consultation-female.ts    getFemaleConsultationPrompt(params)
│   └── index.ts                      getPrompt(), PromptContent, PromptTask, PromptVersion, CURRENT_PROMPT_VERSION
└── schemas/
    ├── face-analysis.schema.ts       FaceAnalysisSchema, FaceAnalysisOutput
    ├── consultation.schema.ts        ConsultationSchema, ConsultationOutput
    └── index.ts                      barrel exports
```

### Testing Requirements

**`src/test/ai-schemas.test.ts` (Zod schema validation):**
- Test FaceAnalysisSchema: valid full object passes
- Test FaceAnalysisSchema: invalid faceShape enum value fails
- Test FaceAnalysisSchema: confidence out of range (1.5) fails
- Test FaceAnalysisSchema: missing proportions field fails
- Test FaceAnalysisSchema: missing hairAssessment.type field fails
- Test FaceAnalysisSchema: confidence exactly 0 passes, confidence exactly 1 passes
- Test ConsultationSchema: valid full object passes
- Test ConsultationSchema: recommendations less than 2 items fails
- Test ConsultationSchema: recommendations more than 3 items fails
- Test ConsultationSchema: invalid difficultyLevel enum fails
- Test ConsultationSchema: invalid grooming tip category fails
- Test ConsultationSchema: justification shorter than 10 chars fails
- Test ConsultationSchema.safeParse() returns `{ success: false }` not throw on invalid input
- Test `z.infer<typeof FaceAnalysisSchema>` is compatible with `FaceAnalysis` TypeScript type (compile-time check via assignability test)

**`src/test/ai-prompts.test.ts` (prompt functions):**
- Test getFaceAnalysisPrompt returns object with `userPrompt` string
- Test getFaceAnalysisPrompt includes `imageData` with base64 and mimeType
- Test getFaceAnalysisPrompt userPrompt contains all 7 face shape enum values
- Test getFaceAnalysisPrompt userPrompt mentions required JSON keys: faceShape, confidence, proportions, hairAssessment
- Test getMaleConsultationPrompt returns object with `userPrompt` string
- Test getMaleConsultationPrompt includes face analysis JSON in prompt
- Test getMaleConsultationPrompt includes questionnaire data in prompt
- Test getMaleConsultationPrompt includes "styles to avoid" section reference
- Test getMaleConsultationPrompt references face shape from analysis
- Test getFemaleConsultationPrompt returns object with `userPrompt` string
- Test getFemaleConsultationPrompt has different content from male prompt (gender-specific)
- Test getPrompt('face-analysis', params) returns same result as getFaceAnalysisPrompt(params)
- Test getPrompt('consultation-male', params) routes to male prompt
- Test getPrompt('consultation-female', params) routes to female prompt
- Test getPrompt with explicit version='v1' works correctly
- Test CURRENT_PROMPT_VERSION equals 'v1'
- Test getPrompt with unknown version throws descriptive error

### Critical Guardrails

- **DO NOT** implement Zod validation on AI responses in this story. Creating schemas is this story's job; USING them to validate AI outputs is Story 4.6. The schemas just need to exist and be correct.
- **DO NOT** add retry-on-validation-failure logic. That is Story 4.6.
- **DO NOT** modify `src/types/index.ts`. The `FaceAnalysis` and `Consultation` TypeScript interfaces remain authoritative. Zod schemas must match those interfaces.
- **DO NOT** modify any existing test files (`ai-provider.test.ts`, `ai-logger.test.ts`, `ai-gemini.test.ts`, `ai-openai.test.ts`, `ai-config.test.ts`).
- **DO NOT** modify any Epic 1/2/3 files.
- **DO NOT** add prompt preview parameters (`preview-male.ts`, `preview-female.ts`) — those are for Story 7.1 (Kie.ai). Only create face-analysis, consultation-male, consultation-female.
- **DO NOT** add `preview-params.schema.ts` — that is for Epic 7.
- **DO** update `gemini.ts` and `openai.ts` to use `getPrompt()` calls (replaces inline prompt strings from Story 4.1 placeholder prompts).
- **DO** export `PromptContent`, `getPrompt`, `FaceAnalysisSchema`, `ConsultationSchema` from `src/lib/ai/index.ts` barrel file.
- **DO** keep `CURRENT_PROMPT_VERSION = 'v1'` as a constant so Story 4.8 (Deterministic Results) can use it for cache invalidation on prompt version change.
- **DO** use `z.enum([...] as const)` pattern for arrays of string literals if needed for TypeScript inference.
- **DO** run the full test suite to verify zero regressions.
- **DO** make gender selection in providers backward-compatible: if `questionnaire['gender']` is missing, default to `'male'` prompt.

### Cross-Story Dependencies

- **Story 4.1 (AI Provider Abstraction) — DONE:** Created `GeminiProvider`, `OpenAIProvider`, `AIRouter`, `AICallLog`. This story updates those providers to use structured prompts. The placeholder inline prompts from 4.1 are replaced here.
- **Story 4.3 (Face Analysis) — NEXT:** Will call `GeminiProvider.analyzeFace()` (updated by this story to use `getFaceAnalysisPrompt()`) and then validate via `FaceAnalysisSchema.safeParse()` (created here). Schema must be correct before 4.3 starts.
- **Story 4.5 (Consultation Generation) — FUTURE:** Will use gender-specific prompts created here via `generateConsultation()` with updated providers.
- **Story 4.6 (Validation & Quality Gate) — FUTURE:** Will wire `FaceAnalysisSchema.safeParse()` and `ConsultationSchema.safeParse()` into the API route with retry logic. Schemas created here must be importable.
- **Story 4.8 (Deterministic Results) — FUTURE:** Cache invalidation uses `CURRENT_PROMPT_VERSION` exported from `prompts/index.ts`.

### Performance Targets

- `getPrompt()` execution: < 1ms (pure string interpolation, no I/O)
- Schema validation (`.safeParse()`): < 5ms for typical AI response size
- No impact on existing page performance (server-side only, compile-time tree-shaken)

### Git Intelligence

Recent commits follow this pattern:
- `feat(epic-4): implement story 4-1-ai-provider-abstraction-layer`
- `feat(epic-3): implement story 3-6-questionnaire-completion-and-data-submission`

Suggested commit message: `feat(epic-4): implement story 4-2-prompt-management-system`

### Previous Story Intelligence (Story 4.1)

**Key patterns to follow:**
- Module barrel exports via `index.ts` — all new types/functions exported through `src/lib/ai/index.ts`
- `vi.mock()` for mocking dependencies in tests
- TypeScript `as unknown as Interface` cast pattern for mock objects in tests
- `crypto.randomUUID()` for IDs (not used here, but consistent with project patterns)
- Error wrapping with `alreadyWrapped` guard (not needed in prompt files, but keep in providers)
- Test file naming: `src/test/ai-{topic}.test.ts`

**Files modified in Story 4.1 (must not regress):**
- `src/types/index.ts` — type definitions, DO NOT modify
- `src/lib/ai/provider.ts` — AIProvider interface, DO NOT modify
- `src/lib/ai/gemini.ts` — WILL BE MODIFIED to use prompts
- `src/lib/ai/openai.ts` — WILL BE MODIFIED to use prompts
- `src/lib/ai/logger.ts` — DO NOT modify
- `src/lib/ai/config.ts` — DO NOT modify
- `src/lib/ai/index.ts` — WILL BE MODIFIED to add prompt/schema exports

**Debug learnings from Story 4.1:**
- Vitest 4.x constructor mock: use `vi.fn().mockImplementation(function() {...})` not arrow functions for `new` mocks
- `vi.mock()` at module level hoisted automatically by vitest
- TypeScript strict: mock objects need `as unknown as Interface` cast
- Test isolation: call `clearAICallLogs()` in `beforeEach` when testing logger state

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No blockers encountered. Implementation straightforward following spec exactly.

### Completion Notes List

- Implemented Task 1: Created `FaceAnalysisSchema` (Zod v4, 7-value enum, confidence 0–1, proportions with 4 numerics, hairAssessment with 4 strings) and `ConsultationSchema` (recommendations 2–3 items, stylesToAvoid 2–3 items, groomingTips min 1) with barrel export via `src/lib/ai/schemas/index.ts`.
- Implemented Task 2: Created versioned prompt files under `src/lib/ai/prompts/v1/` — `getFaceAnalysisPrompt()` with imageData support, `getMaleConsultationPrompt()` with male-specific language and "styles to avoid" section, `getFemaleConsultationPrompt()` with feminine style terminology (layers, fringe, updos, styling tools).
- Implemented Task 3: Created `src/lib/ai/prompts/index.ts` with `PromptContent` interface, `PromptTask` type, `PromptVersion` type, `CURRENT_PROMPT_VERSION = 'v1'`, and `getPrompt()` function using version routing map pattern for easy v2 addition.
- Implemented Task 4: Updated `gemini.ts` and `openai.ts` to call `getPrompt()` instead of inline prompt strings. Both providers now detect gender from `questionnaire['gender']` defaulting to 'male' when missing, and route to the appropriate consultation prompt.
- Implemented Task 5 (TDD): Tests written first (RED), then implementation (GREEN). `ai-schemas.test.ts` covers 21 tests for FaceAnalysisSchema and ConsultationSchema validation. `ai-prompts.test.ts` covers 21 tests for prompt generation, content validation, and version routing.
- Full test suite: 788 tests pass (746 baseline + 42 new). Zero regressions.
- `src/lib/ai/index.ts` updated to export `getPrompt`, `CURRENT_PROMPT_VERSION`, `PromptContent`, `PromptTask`, `PromptVersion`, `FaceAnalysisSchema`, `ConsultationSchema` and their inferred types.

### File List

- src/lib/ai/schemas/face-analysis.schema.ts (NEW)
- src/lib/ai/schemas/consultation.schema.ts (NEW)
- src/lib/ai/schemas/index.ts (NEW)
- src/lib/ai/prompts/v1/face-analysis.ts (NEW)
- src/lib/ai/prompts/v1/consultation-male.ts (NEW)
- src/lib/ai/prompts/v1/consultation-female.ts (NEW)
- src/lib/ai/prompts/index.ts (NEW)
- src/lib/ai/gemini.ts (MODIFIED)
- src/lib/ai/openai.ts (MODIFIED)
- src/lib/ai/index.ts (MODIFIED)
- src/test/ai-schemas.test.ts (NEW)
- src/test/ai-prompts.test.ts (NEW)

## Change Log

- 2026-03-02: Implemented Story 4.2 — Prompt Management System. Created Zod validation schemas (FaceAnalysisSchema, ConsultationSchema), versioned prompt files (v1/), prompt version router with getPrompt() and CURRENT_PROMPT_VERSION, updated GeminiProvider and OpenAIProvider to use structured prompts, added 42 new tests. 788 total tests pass.
