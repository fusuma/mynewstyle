# Story 4.1: AI Provider Abstraction Layer

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a provider-agnostic AI interface with automatic fallback routing,
so that the application can swap AI providers without changing application code and survive provider outages gracefully.

## Acceptance Criteria

1. An `AIProvider` interface exists with `analyzeFace(photo: Buffer, options?: AnalysisOptions): Promise<FaceAnalysis>` and `generateConsultation(analysis: FaceAnalysis, questionnaire: QuestionnaireData): Promise<Consultation>` methods
2. A `GeminiProvider` class implements the `AIProvider` interface using the `@google/genai` SDK (Gemini 2.5 Flash as primary model for both face analysis and consultation generation)
3. An `OpenAIProvider` class implements the `AIProvider` interface using the `openai` SDK (GPT-4o as fallback model for both face analysis and consultation generation)
4. An `AIRouter` class accepts primary and fallback providers, and executes AI tasks with automatic fallback: if the primary provider fails with a retryable error, it retries once on the primary, then falls back to the fallback provider
5. All AI calls are logged with a structured `AICallLog` record containing: provider name, model version, input token count, output token count, cost in cents, latency in milliseconds, and success/failure status
6. AI call logs are stored in-memory (array) for now -- database persistence deferred to Story 4.7
7. Environment variables for API keys are validated at startup: `GOOGLE_AI_API_KEY` and `OPENAI_API_KEY` must be present, or the server logs a clear warning and the respective provider is disabled
8. The `isRetryable(error)` utility correctly classifies transient errors (rate limits, timeouts, 5xx) vs permanent errors (auth failures, invalid requests, 4xx) for both providers
9. Type definitions for `FaceAnalysis`, `Consultation`, `AnalysisOptions`, `QuestionnaireData`, `AICallLog`, and provider configuration are exported from `src/types/index.ts`
10. All existing 698 tests pass with zero regressions after implementation

## Tasks / Subtasks

- [x] Task 1: Install AI SDK dependencies (AC: 2, 3)
  - [x] Install `@google/genai` (latest stable, ~1.43.x) for Gemini API access
  - [x] Install `openai` (latest stable, ~6.25.x) for OpenAI API access
  - [x] Verify both packages install cleanly with no peer dependency conflicts

- [x] Task 2: Define AI type definitions (AC: 1, 5, 9)
  - [x] Add to `src/types/index.ts`:
    - `FaceShape` enum type: `'oval' | 'round' | 'square' | 'oblong' | 'heart' | 'diamond' | 'triangle'`
    - `FaceProportions` interface: `{ foreheadRatio: number; cheekboneRatio: number; jawRatio: number; faceLength: number }`
    - `HairAssessment` interface: `{ type: string; texture: string; density: string; currentStyle: string }`
    - `FaceAnalysis` interface: `{ faceShape: FaceShape; confidence: number; proportions: FaceProportions; hairAssessment: HairAssessment }`
    - `AnalysisOptions` interface: `{ temperature?: number; maxRetries?: number }`
    - `QuestionnaireData` type: `Record<string, string | string[] | number>`
    - `StyleRecommendation` interface: `{ styleName: string; justification: string; matchScore: number; difficultyLevel: 'low' | 'medium' | 'high' }`
    - `StyleToAvoid` interface: `{ styleName: string; reason: string }`
    - `GroomingTip` interface: `{ category: 'products' | 'routine' | 'barber_tips'; tipText: string; icon: string }`
    - `Consultation` interface: `{ recommendations: StyleRecommendation[]; stylesToAvoid: StyleToAvoid[]; groomingTips: GroomingTip[] }`
    - `AICallLog` interface: `{ id: string; provider: 'gemini' | 'openai'; model: string; task: 'face-analysis' | 'consultation'; inputTokens: number; outputTokens: number; costCents: number; latencyMs: number; success: boolean; error?: string; timestamp: string }`
    - `AIProviderConfig` interface: `{ apiKey: string; model: string; maxTokens?: number; temperature?: number }`

- [x] Task 3: Create the AIProvider interface and AIRouter (AC: 1, 4, 8)
  - [x] Create `src/lib/ai/provider.ts` with:
    - `AIProvider` interface defining `analyzeFace()` and `generateConsultation()` methods
    - `AIRouter` class with `primary` and `fallback` providers
    - `execute<T>(task)` method: try primary -> if retryable error, retry primary once -> if fails again, try fallback -> if fallback fails, throw
    - `isRetryable(error)` utility function: returns `true` for rate limit (429), timeout, 5xx status codes; returns `false` for auth errors (401/403), bad request (400), not found (404)
  - [x] Create `src/lib/ai/logger.ts` with:
    - In-memory `aiCallLogs: AICallLog[]` array
    - `logAICall(log: Omit<AICallLog, 'id' | 'timestamp'>): AICallLog` function that adds id + timestamp
    - `getAICallLogs(): AICallLog[]` getter
    - `clearAICallLogs(): void` for testing
    - `calculateCost(provider, model, inputTokens, outputTokens): number` helper using known pricing

- [x] Task 4: Implement GeminiProvider (AC: 2, 5)
  - [x] Create `src/lib/ai/gemini.ts` with:
    - `GeminiProvider` class implementing `AIProvider`
    - Constructor accepts `AIProviderConfig` (apiKey, model defaults to `'gemini-2.5-flash'`)
    - `analyzeFace()`: sends photo as base64 to Gemini Vision, requests structured JSON output matching `FaceAnalysis` type, logs call via `logAICall()`
    - `generateConsultation()`: sends analysis JSON + questionnaire data to Gemini text, requests structured JSON output matching `Consultation` type, logs call via `logAICall()`
    - Both methods measure latency with `performance.now()` and calculate cost using known Gemini pricing
    - Error handling: wraps SDK errors with provider context, maps to retryable/non-retryable

- [x] Task 5: Implement OpenAIProvider (AC: 3, 5)
  - [x] Create `src/lib/ai/openai.ts` with:
    - `OpenAIProvider` class implementing `AIProvider`
    - Constructor accepts `AIProviderConfig` (apiKey, model defaults to `'gpt-4o'`)
    - `analyzeFace()`: sends photo as base64 URL to GPT-4o Vision, requests structured JSON output matching `FaceAnalysis` type, logs call via `logAICall()`
    - `generateConsultation()`: sends analysis JSON + questionnaire data, requests structured JSON output matching `Consultation` type, logs call via `logAICall()`
    - Both methods measure latency and calculate cost using known OpenAI pricing
    - Error handling: wraps SDK errors with provider context, maps to retryable/non-retryable

- [x] Task 6: Create AI configuration and initialization (AC: 7)
  - [x] Create `src/lib/ai/config.ts` with:
    - `getAIConfig()` function that reads `GOOGLE_AI_API_KEY` and `OPENAI_API_KEY` from `process.env`
    - Validates keys are present, logs warning if missing (not fatal -- provider just disabled)
    - Returns `{ gemini: AIProviderConfig | null, openai: AIProviderConfig | null }`
  - [x] Create `src/lib/ai/index.ts` as the public API:
    - `createAIRouter()` factory function that initializes providers from config
    - `getAIRouter()` singleton getter for the configured router
    - Exports all types and the router

- [x] Task 7: Write tests (AC: 1-10)
  - [x] Create `src/test/ai-provider.test.ts`:
    - Test AIProvider interface contract (both providers implement required methods)
    - Test AIRouter fallback: primary succeeds -> returns primary result
    - Test AIRouter fallback: primary fails retryable -> retries primary -> succeeds
    - Test AIRouter fallback: primary fails retryable twice -> falls back to fallback -> succeeds
    - Test AIRouter fallback: primary fails non-retryable -> throws immediately (no fallback)
    - Test AIRouter: both providers fail -> throws last error
    - Test isRetryable: 429 -> true, 500 -> true, 503 -> true, timeout -> true
    - Test isRetryable: 401 -> false, 403 -> false, 400 -> false, 404 -> false
  - [x] Create `src/test/ai-logger.test.ts`:
    - Test logAICall creates log with id and timestamp
    - Test getAICallLogs returns all logs
    - Test clearAICallLogs empties the array
    - Test calculateCost returns correct cost for Gemini Flash pricing
    - Test calculateCost returns correct cost for GPT-4o pricing
  - [x] Create `src/test/ai-gemini.test.ts`:
    - Test GeminiProvider.analyzeFace calls Gemini API with correct parameters (mocked)
    - Test GeminiProvider.analyzeFace returns parsed FaceAnalysis on success
    - Test GeminiProvider.analyzeFace logs the call via logAICall
    - Test GeminiProvider.generateConsultation calls API with analysis + questionnaire (mocked)
    - Test GeminiProvider.generateConsultation returns parsed Consultation on success
    - Test GeminiProvider error handling wraps SDK errors correctly
  - [x] Create `src/test/ai-openai.test.ts`:
    - Test OpenAIProvider.analyzeFace calls OpenAI API with correct parameters (mocked)
    - Test OpenAIProvider.analyzeFace returns parsed FaceAnalysis on success
    - Test OpenAIProvider.analyzeFace logs the call via logAICall
    - Test OpenAIProvider.generateConsultation calls API with analysis + questionnaire (mocked)
    - Test OpenAIProvider.generateConsultation returns parsed Consultation on success
    - Test OpenAIProvider error handling wraps SDK errors correctly
  - [x] Create `src/test/ai-config.test.ts`:
    - Test getAIConfig returns both configs when both env vars present
    - Test getAIConfig returns null for gemini when GOOGLE_AI_API_KEY missing
    - Test getAIConfig returns null for openai when OPENAI_API_KEY missing
    - Test getAIConfig logs warning for missing keys
  - [x] Run full test suite to verify zero regressions

- [x] Task 8: Run full test suite and verify zero regressions (AC: 10)
  - [x] Run `npx vitest run` to execute all tests
  - [x] Verify all 698 existing tests pass + new tests pass (742 total: 698 + 44 new)
  - [x] Verify no TypeScript compilation errors in story 4.1 files (pre-existing framer-motion issues in Epic 2/3 unrelated)

## Dev Notes

### Architecture Compliance

- **AI Module Location:** `src/lib/ai/` -- this is a new directory following the `lib/` pattern established in the architecture. All AI-related code lives here. [Source: architecture.md#6.1, architecture.md#4.2]
- **Provider Abstraction Pattern:** The architecture explicitly defines this pattern in section 4.2 with `AIProvider` interface, `GeminiProvider`, `OpenAIProvider`, and `AIRouter` classes. Follow this pattern exactly. [Source: architecture.md#4.2]
- **Server-Side Only:** All AI provider code runs exclusively in Next.js API routes (server-side). API keys must NEVER be exposed to the client. The `src/lib/ai/` module should only be imported from `src/app/api/` routes. [Source: architecture.md#7.3]
- **Zod Already Installed:** Zod 4.3.6 is in `package.json` from Story 3.6. Use it for AI output validation in future stories (4.2+). This story focuses on the provider abstraction layer, not prompt/output schemas. [Source: 3-6-questionnaire-completion-and-data-submission.md]
- **Existing Consultation Store:** The `ConsultationStore` (Zustand) has `faceAnalysis: unknown | null` and `consultation: unknown | null` fields already typed as `unknown`. These will be properly typed when the AI types are integrated in Stories 4.3+. Do NOT modify the store in this story.
- **In-Memory Patterns:** Story 3.6 established the in-memory pattern for the consultation API route (`Map<string, ConsultationRecord>`). Follow the same pattern for AI call logs -- in-memory array for now, database in Story 4.7.

### Technical Requirements

- **Provider Interface (must match architecture exactly):**
  ```typescript
  // src/lib/ai/provider.ts
  interface AIProvider {
    analyzeFace(photo: Buffer, options?: AnalysisOptions): Promise<FaceAnalysis>;
    generateConsultation(
      analysis: FaceAnalysis,
      questionnaire: QuestionnaireData
    ): Promise<Consultation>;
  }
  ```

- **AIRouter Pattern (from architecture.md#4.2):**
  ```typescript
  class AIRouter {
    private primary: AIProvider;
    private fallback: AIProvider;

    async execute<T>(task: (provider: AIProvider) => Promise<T>): Promise<T> {
      try {
        return await task(this.primary);
      } catch (error) {
        if (isRetryable(error)) {
          try {
            return await task(this.primary); // retry once
          } catch (retryError) {
            return await task(this.fallback); // then fallback
          }
        }
        throw error; // non-retryable, throw immediately
      }
    }
  }
  ```

- **Gemini SDK Usage (`@google/genai`):**
  ```typescript
  import { GoogleGenAI } from '@google/genai';

  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY });

  // For face analysis (vision):
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { text: 'Analyze this face...' },
          { inlineData: { mimeType: 'image/jpeg', data: photoBase64 } }
        ]
      }
    ],
    config: {
      responseMimeType: 'application/json',
    }
  });
  ```
  IMPORTANT: The `@google/genai` package is the NEW unified SDK (GA since May 2025). Do NOT use the deprecated `@google/generative-ai` package which will lose support.

- **OpenAI SDK Usage:**
  ```typescript
  import OpenAI from 'openai';

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // For face analysis (vision):
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze this face...' },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${photoBase64}` } }
        ]
      }
    ]
  });
  ```

- **Cost Calculation Constants:**
  ```typescript
  // Known pricing as of March 2026
  const PRICING = {
    'gemini-2.5-flash': { inputPer1M: 0.15, outputPer1M: 0.60 }, // USD
    'gpt-4o': { inputPer1M: 2.50, outputPer1M: 10.00 }, // USD
  } as const;
  ```
  Convert to cents: `(inputTokens / 1_000_000) * pricePerMillion * 100`

- **Error Classification:**
  ```typescript
  function isRetryable(error: unknown): boolean {
    if (error instanceof Error) {
      const status = (error as any).status ?? (error as any).statusCode;
      if (status === 429) return true; // Rate limited
      if (status >= 500) return true;  // Server error
      if (error.message?.includes('timeout')) return true;
      if (error.message?.includes('ECONNRESET')) return true;
    }
    return false;
  }
  ```

- **Environment Variable Validation:**
  ```typescript
  // src/lib/ai/config.ts
  export function getAIConfig() {
    const geminiKey = process.env.GOOGLE_AI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!geminiKey) {
      console.warn('[AI] GOOGLE_AI_API_KEY not set -- Gemini provider disabled');
    }
    if (!openaiKey) {
      console.warn('[AI] OPENAI_API_KEY not set -- OpenAI provider disabled');
    }

    return {
      gemini: geminiKey ? { apiKey: geminiKey, model: 'gemini-2.5-flash' } : null,
      openai: openaiKey ? { apiKey: openaiKey, model: 'gpt-4o' } : null,
    };
  }
  ```

### Project Structure Notes

```
src/
+-- lib/
|   +-- ai/                                    # NEW DIRECTORY: AI provider abstraction
|   |   +-- provider.ts                        # NEW: AIProvider interface + AIRouter class + isRetryable()
|   |   +-- gemini.ts                          # NEW: GeminiProvider implementation
|   |   +-- openai.ts                          # NEW: OpenAIProvider implementation
|   |   +-- logger.ts                          # NEW: AI call logging (in-memory)
|   |   +-- config.ts                          # NEW: Environment config and provider initialization
|   |   +-- index.ts                           # NEW: Public API exports
|   +-- consultation/
|       +-- submit.ts                          # NO CHANGES (from Story 3.6)
+-- types/
|   +-- index.ts                               # MODIFIED: Add AI type definitions
+-- test/
    +-- ai-provider.test.ts                    # NEW: AIRouter + isRetryable tests
    +-- ai-logger.test.ts                      # NEW: AI call logging tests
    +-- ai-gemini.test.ts                      # NEW: GeminiProvider tests (mocked SDK)
    +-- ai-openai.test.ts                      # NEW: OpenAIProvider tests (mocked SDK)
    +-- ai-config.test.ts                      # NEW: Config validation tests
```

### References

- [Source: architecture.md#4.2] -- Provider abstraction: `AIProvider` interface, `GeminiProvider`, `OpenAIProvider`, `AIRouter` classes with fallback routing
- [Source: architecture.md#4.1] -- Pipeline flow: Face Analysis (Gemini Flash primary, GPT-4o fallback) -> Consultation Gen (same fallback pattern)
- [Source: architecture.md#4.5] -- Cost tracking: every AI call logs model, tokens, cost, latency, success/failure
- [Source: architecture.md#2.3] -- AI Layer: Gemini 2.5 Flash primary, GPT-4o fallback for both face analysis and consultation
- [Source: architecture.md#7.3] -- API keys server-side only, never in client bundle
- [Source: architecture.md#8.3] -- 90s max per AI call, auto-retry once, then fail gracefully
- [Source: architecture.md#13] -- Top insight #1: "Provider abstraction is non-negotiable"
- [Source: architecture.md#12] -- Elicitation: Chaos Monkey -> provider outage -> dual provider fallback
- [Source: epics-and-stories.md#S4.1] -- Story acceptance criteria: AIProvider interface, GeminiProvider, OpenAIProvider, AIRouter, retry logic, call logging
- [Source: epics-and-stories.md#E4] -- Epic objectives: sequential pipeline, dual provider fallback, structured outputs
- [Source: prd.md] -- AI cost per consultation <= $0.50, end-to-end error rate < 2%
- [Source: 3-6-questionnaire-completion-and-data-submission.md] -- Previous story: 698 tests, zod already installed, in-memory patterns established

### Library & Framework Requirements

| Library | Version | Usage in This Story |
|---------|---------|-------------------|
| @google/genai | ^1.43.0 | **NEW DEPENDENCY** -- Gemini AI SDK (unified, GA). Face analysis + consultation generation |
| openai | ^6.25.0 | **NEW DEPENDENCY** -- OpenAI SDK. GPT-4o fallback for face analysis + consultation |
| react | 19.2.3 | Not directly used (server-side only module) |
| next | 16.1.6 | API route context (process.env for keys) |
| zod | 4.3.6 | Already installed. NOT used in this story (used in Story 4.2 for schemas) |
| vitest | 4.0.18 | Test runner |

**TWO NEW DEPENDENCIES:** `@google/genai` and `openai` -- required for AI provider implementations per architecture spec.

CRITICAL: Do NOT install `@google/generative-ai` (deprecated, support ends Nov 2025). Install `@google/genai` (the new unified SDK).

### File Structure Requirements

```
src/
+-- lib/
|   +-- ai/                                    # NEW DIRECTORY
|   |   +-- provider.ts                        # AIProvider interface, AIRouter, isRetryable()
|   |   +-- gemini.ts                          # GeminiProvider class
|   |   +-- openai.ts                          # OpenAIProvider class
|   |   +-- logger.ts                          # AICallLog in-memory store + helpers
|   |   +-- config.ts                          # Env var validation + provider config factory
|   |   +-- index.ts                           # Re-exports: createAIRouter, getAIRouter, types
+-- types/
|   +-- index.ts                               # MODIFIED: Add FaceAnalysis, Consultation, AICallLog, etc.
+-- test/
    +-- ai-provider.test.ts                    # AIRouter + isRetryable tests
    +-- ai-logger.test.ts                      # Logging tests
    +-- ai-gemini.test.ts                      # GeminiProvider tests (mocked)
    +-- ai-openai.test.ts                      # OpenAIProvider tests (mocked)
    +-- ai-config.test.ts                      # Config tests
```

### Testing Requirements

- Verify all 698 existing tests pass after changes
- All AI SDK calls must be mocked (vi.mock) -- no real API calls in tests
- New tests organized in 5 files:

**`src/test/ai-provider.test.ts` (AIRouter + isRetryable):**
  - Test AIRouter: primary succeeds -> returns result, no fallback called
  - Test AIRouter: primary fails (retryable) -> retries -> succeeds on retry
  - Test AIRouter: primary fails (retryable) twice -> falls back -> fallback succeeds
  - Test AIRouter: primary fails (non-retryable) -> throws immediately, no retry/fallback
  - Test AIRouter: both fail -> throws error from fallback
  - Test AIRouter: primary and fallback both null -> throws configuration error
  - Test isRetryable: status 429 -> true
  - Test isRetryable: status 500, 502, 503 -> true
  - Test isRetryable: timeout error message -> true
  - Test isRetryable: status 401, 403 -> false
  - Test isRetryable: status 400, 404 -> false
  - Test isRetryable: generic Error -> false

**`src/test/ai-logger.test.ts` (logging):**
  - Test logAICall creates entry with generated id (UUID) and timestamp (ISO string)
  - Test getAICallLogs returns all logged entries in order
  - Test clearAICallLogs empties the log
  - Test calculateCost for gemini-2.5-flash: 1000 input + 500 output tokens
  - Test calculateCost for gpt-4o: 1000 input + 500 output tokens

**`src/test/ai-gemini.test.ts` (GeminiProvider mocked):**
  - Test analyzeFace sends photo as inline data with correct MIME type
  - Test analyzeFace parses JSON response into FaceAnalysis
  - Test analyzeFace calls logAICall with correct provider/model/task
  - Test generateConsultation sends analysis + questionnaire as text
  - Test generateConsultation parses response into Consultation
  - Test error wrapping for SDK errors

**`src/test/ai-openai.test.ts` (OpenAIProvider mocked):**
  - Test analyzeFace sends photo as base64 data URL
  - Test analyzeFace parses JSON response into FaceAnalysis
  - Test analyzeFace calls logAICall with correct provider/model/task
  - Test generateConsultation sends analysis + questionnaire
  - Test generateConsultation parses response into Consultation
  - Test error wrapping for SDK errors

**`src/test/ai-config.test.ts` (configuration):**
  - Test both keys present -> both configs returned
  - Test GOOGLE_AI_API_KEY missing -> gemini is null, warning logged
  - Test OPENAI_API_KEY missing -> openai is null, warning logged
  - Test both keys missing -> both null, both warnings logged
  - Test default model values (gemini-2.5-flash, gpt-4o)

### Critical Guardrails

- **DO NOT** create any prompt templates in this story. Prompts are Story 4.2. The provider methods should accept prompt text as part of their internal implementation but use simple placeholder prompts for testing.
- **DO NOT** add Zod schema validation for AI outputs in this story. Output validation is Story 4.6. The providers should return parsed JSON but not validate against schemas.
- **DO NOT** modify the `ConsultationStore` or any Zustand store.
- **DO NOT** modify any existing API routes (`/api/consultation/start`).
- **DO NOT** create any new API routes. This story is the library layer only.
- **DO NOT** modify any files from Epic 1, 2, or 3.
- **DO NOT** modify any existing test files.
- **DO NOT** install `@google/generative-ai` (deprecated). Use `@google/genai` (unified SDK).
- **DO NOT** expose API keys in any client-side code. All AI code is server-side only.
- **DO NOT** make real API calls in tests. Mock all SDK calls with `vi.mock()`.
- **DO NOT** add database persistence for logs. Use in-memory array (database comes in Story 4.7).
- **DO** install `@google/genai` and `openai` as the two new dependencies.
- **DO** follow the exact interface signatures from architecture.md section 4.2.
- **DO** measure latency using `performance.now()` (available in Node.js).
- **DO** use `crypto.randomUUID()` for log entry IDs (consistent with Story 3.6 pattern).
- **DO** keep all module exports clean through `src/lib/ai/index.ts` barrel file.
- **DO** run the full test suite to verify zero regressions.

### Cross-Story Dependencies

- **Story 3.6 (Questionnaire Completion) -- DONE:** Established in-memory pattern, zod installed, 698 tests baseline. The `/api/consultation/start` route stores consultations in-memory -- this story's AI module will be called by that route in Story 4.3.
- **Story 4.2 (Prompt Management) -- NEXT:** Will create versioned prompts in `lib/ai/prompts/` and Zod schemas in `lib/ai/schemas/`. This story creates the provider layer that prompts will be injected into.
- **Story 4.3 (Face Analysis) -- FUTURE:** Will wire `GeminiProvider.analyzeFace()` into the `/api/consultation/start` route with actual prompts from 4.2.
- **Story 4.5 (Consultation Generation) -- FUTURE:** Will wire `GeminiProvider.generateConsultation()` with actual prompts from 4.2.
- **Story 4.6 (Validation & Quality Gate) -- FUTURE:** Will add Zod schema validation on AI responses.
- **Story 4.7 (Cost Tracking) -- FUTURE:** Will persist `AICallLog` entries to Supabase database.

### Performance Targets

- AIRouter.execute() overhead: < 5ms (excluding actual AI call time)
- isRetryable() classification: < 1ms
- logAICall() write: < 1ms (in-memory push)
- Module initialization (createAIRouter): < 50ms
- Zero impact on existing page load performance (server-side only module)

### Git Intelligence

Recent commit pattern:
- `feat(epic-3): implement story 3-6-questionnaire-completion-and-data-submission`
- `feat(epic-3): implement story 3-5-progress-bar-and-conversational-tone`

Suggested commit message: `feat(epic-4): implement story 4-1-ai-provider-abstraction-layer`

### Previous Story Intelligence (Story 3.6)

**Key patterns established that must be followed:**
- In-memory storage pattern: `Map` for consultations, array for logs
- `crypto.randomUUID()` for ID generation
- Zod v4 API: uses `z.enum()`, `z.string()`, `z.record()`, `z.union()` -- follow same patterns
- Test mocking pattern: `vi.mock()` for external dependencies
- Error class pattern: `ConsultationSubmissionError` extends `Error` with typed properties
- API route pattern: `NextRequest`/`NextResponse` with JSON parsing

**Issues found in code review of Story 3.6 that apply here:**
- Always distinguish between client errors (4xx) and server errors (5xx) in error handling
- Always log errors with `console.error` before re-throwing
- Keep dependencies clean -- no unused imports

### SDK Version Notes

**@google/genai (v1.43.x):**
- Unified SDK replacing deprecated `@google/generative-ai`
- GA since May 2025, stable for production
- Supports Gemini 2.5 Flash (vision + text)
- Structured output via `responseMimeType: 'application/json'`
- Token counting available in response metadata

**openai (v6.25.x):**
- Stable, widely adopted (8700+ npm dependents)
- Supports GPT-4o (vision + text)
- JSON mode via `response_format: { type: 'json_object' }`
- Token usage in `response.usage` object
- Requires Node.js >= 20 LTS

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Fixed vitest 4.x constructor mock issue: `vi.fn().mockImplementation(arrowFn)` cannot be used with `new` in vitest 4.x. Changed mock implementations in `ai-gemini.test.ts` and `ai-openai.test.ts` to use regular functions instead of arrow functions.
- Fixed TypeScript TS2783 "model specified more than once" in gemini.ts and openai.ts by using `config.model ?? 'default'` pattern instead of spreading after default.
- Fixed TypeScript type error in ai-provider.test.ts: `vi.fn()` mock doesn't satisfy `AIProvider` interface; used `as unknown as AIProvider` cast and imported `AIProvider` from correct source (`../lib/ai/provider`).
- Code review fix: `calculateCost` had unused `provider` parameter removed (only `model` is used for pricing lookup).
- Code review fix: `AnalysisOptions.temperature` was silently ignored; now passed to Gemini `config.temperature` and OpenAI `temperature` field via conditional spread.
- Code review fix: Added `console.error` logging before re-throwing in all provider error paths.
- Code review fix: `JSON.parse` of AI response now in isolated inner try/catch with meaningful error messages (e.g. "Gemini: Invalid JSON response for face-analysis").
- Code review fix: Restructured error handling to avoid double `logAICall` entries when JSON.parse fails after successful API call.
- Code review fix: Added double-wrap guard using `alreadyWrapped` check (prevents "Gemini: Gemini: message" duplication).
- Code review fix: Added `resetAIRouter()` export to `index.ts` for test isolation.
- Code review fix: Added `generateConsultation` error path tests for both GeminiProvider and OpenAIProvider.
- Code review fix: Added invalid JSON response tests for both providers.

### Completion Notes List

- Implemented complete AI Provider Abstraction Layer for Story 4.1
- Created `src/lib/ai/` module with 6 new files: provider.ts, logger.ts, gemini.ts, openai.ts, config.ts, index.ts
- Created 5 test files covering 48 new tests across all AC requirements (4 additional from code review)
- All 746 tests pass (698 existing + 48 new), zero regressions
- AIProvider interface, AIRouter with retry/fallback, GeminiProvider, OpenAIProvider, AI call logging, and environment config all implemented per architecture spec
- Pre-existing TypeScript errors in framer-motion components (CameraPermissionPrompt, SessionRecoveryBanner) from Epic 2/3 remain but are unrelated to this story
- Code review completed and all HIGH/MEDIUM issues fixed

### File List

- `src/types/index.ts` (MODIFIED: AI type definitions already present, confirmed)
- `src/lib/ai/provider.ts` (NEW: AIProvider interface, AIRouter class, isRetryable utility)
- `src/lib/ai/logger.ts` (MODIFIED in review: removed unused provider param from calculateCost)
- `src/lib/ai/gemini.ts` (MODIFIED in review: temperature option support, console.error logging, JSON parse isolation, double-wrap guard)
- `src/lib/ai/openai.ts` (MODIFIED in review: temperature option support, console.error logging, JSON parse isolation, double-wrap guard)
- `src/lib/ai/config.ts` (NEW: getAIConfig reads env vars, logs warnings, returns provider configs)
- `src/lib/ai/index.ts` (MODIFIED in review: added resetAIRouter export)
- `src/test/ai-provider.test.ts` (NEW: 18 tests for AIRouter and isRetryable)
- `src/test/ai-logger.test.ts` (MODIFIED in review: updated calculateCost call signatures to 3 args)
- `src/test/ai-gemini.test.ts` (MODIFIED in review: added generateConsultation error test + invalid JSON test)
- `src/test/ai-openai.test.ts` (MODIFIED in review: added generateConsultation error test + invalid JSON test)
- `src/test/ai-config.test.ts` (NEW: 5 tests for environment config validation)

## Change Log

- 2026-03-02: Implemented Story 4.1 - AI Provider Abstraction Layer. Added @google/genai and openai SDKs, created src/lib/ai/ module with AIProvider interface, GeminiProvider, OpenAIProvider, AIRouter with retry/fallback, in-memory call logging, and environment config. 44 new tests added, 742 total tests passing.
- 2026-03-02: Code review fixes applied. calculateCost provider param removed, AnalysisOptions.temperature now passed through to SDKs, console.error added to all error paths, JSON parse isolated with context-aware error messages, double-wrap guard added, resetAIRouter() exported, error path tests added for generateConsultation and invalid JSON. 4 additional tests added, 746 total tests passing.
