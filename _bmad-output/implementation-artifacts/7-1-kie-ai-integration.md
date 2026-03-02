# Story 7.1: Kie.ai Integration (Nano Banana 2)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want to integrate preview generation via Kie.ai's Nano Banana 2 API so that users can trigger AI hairstyle previews from the results page,
so that the "Ver como fico" feature can generate photorealistic previews showing the user with a recommended hairstyle applied.

## Acceptance Criteria

1. POST request to `https://api.kie.ai/api/v1/jobs/createTask` creates a preview generation task
2. Model is set to `"nano-banana-2"` in the request payload
3. Input includes the user's photo URL (from Supabase Storage signed URL) and a style-specific prompt
4. Callback URL is set to `/api/webhook/kie` (full URL constructed from `NEXT_PUBLIC_APP_URL` env var)
5. Aspect ratio is `"3:4"` for portrait-oriented previews
6. Resolution is `"2K"` for high-quality output suitable for before/after comparison
7. The returned `taskId` is stored in `recommendations.preview_generation_params` (jsonb column) for the target recommendation
8. `KIE_API_KEY` is stored in server-side environment variables only -- never exposed to the client bundle
9. The recommendation's `preview_status` is updated from `"none"` to `"generating"` when the task is successfully created
10. The API route `POST /api/preview/generate` accepts `{ consultationId, recommendationId }`, validates payment status, and triggers the Kie.ai job
11. The API route `GET /api/preview/:recommendationId/status` returns the current `preview_status` and `preview_url` for client polling
12. Only one preview can generate at a time per consultation (sequential queue -- other "Ver como fico" buttons disabled during generation)
13. Error handling: if Kie.ai returns a non-200 status, the recommendation's `preview_status` is set to `"failed"` and the error is logged
14. AI cost tracking: Kie.ai job cost is logged to the `ai_calls` table using the existing `persistAICallLog` pattern

## Tasks / Subtasks

- [x] Task 1: Create Kie.ai client module (AC: #1, #2, #5, #6, #8)
  - [x] 1.1: Create `src/lib/ai/kie.ts` with `KieClient` class
  - [x] 1.2: Implement `createPreviewTask(photoUrl, stylePrompt, callbackUrl)` method
  - [x] 1.3: Define `KieJobRequest` and `KieJobResponse` TypeScript interfaces
  - [x] 1.4: Use `KIE_API_KEY` from `process.env` (server-side only, never imported in client code)
  - [x] 1.5: Set `model: "nano-banana-2"`, `aspect_ratio: "3:4"`, `resolution: "2K"`, `output_format: "jpg"`, `google_search: false`

- [x] Task 2: Create preview prompt builder (AC: #3)
  - [x] 2.1: Create `src/lib/ai/prompts/v1/preview-male.ts` with male hairstyle preview prompt template
  - [x] 2.2: Create `src/lib/ai/prompts/v1/preview-female.ts` with female hairstyle preview prompt template
  - [x] 2.3: Register `"preview-male"` and `"preview-female"` as prompt tasks in `src/lib/ai/prompts/index.ts`
  - [x] 2.4: Prompt must instruct AI to preserve face, skin tone, facial features, and expression -- only change the hairstyle
  - [x] 2.5: Include style name, difficulty level, and any gender-specific styling details in the prompt

- [x] Task 3: Create `POST /api/preview/generate` API route (AC: #7, #9, #10, #12, #13, #14)
  - [x] 3.1: Create `src/app/api/preview/generate/route.ts`
  - [x] 3.2: Validate request body with Zod: `{ consultationId: uuid, recommendationId: uuid }`
  - [x] 3.3: Verify consultation exists and `payment_status === 'paid'` (security gate)
  - [x] 3.4: Check sequential queue: query recommendations for this consultation where `preview_status === 'generating'` -- if any found, return 409 Conflict
  - [x] 3.5: Fetch recommendation record and verify it belongs to the consultation
  - [x] 3.6: Get the consultation's `photo_url` and generate a Supabase Storage signed URL (15-min expiry)
  - [x] 3.7: Build the style prompt using the recommendation's `style_name` and consultation `gender`
  - [x] 3.8: Construct callback URL: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/kie`
  - [x] 3.9: Call `KieClient.createPreviewTask()` with photo signed URL, style prompt, and callback URL
  - [x] 3.10: On success: update recommendation with `preview_status = 'generating'`, `preview_generation_params = { taskId, model, requestedAt, ... }`
  - [x] 3.11: Log AI call to `ai_calls` table using `persistAICallLog` with task type `'preview'`
  - [x] 3.12: Return `{ status: 'generating', estimatedSeconds: 30 }`
  - [x] 3.13: On Kie.ai error: set `preview_status = 'failed'`, log error, return 502

- [x] Task 4: Create `GET /api/preview/[recommendationId]/status` API route (AC: #11)
  - [x] 4.1: Create `src/app/api/preview/[recommendationId]/status/route.ts`
  - [x] 4.2: Validate `recommendationId` as UUID
  - [x] 4.3: Fetch recommendation's `preview_status` and `preview_url` from database
  - [x] 4.4: Return `{ status: preview_status, previewUrl: preview_url | null }`

- [x] Task 5: Extend TypeScript types and AI infrastructure (AC: #7, #14)
  - [x] 5.1: Add `'preview'` to `AICallLog.task` union type in `src/types/index.ts`
  - [x] 5.2: Add `PreviewGenerationParams` interface to `src/types/index.ts`
  - [x] 5.3: Add `'kie'` to `AICallLog.provider` union type in `src/types/index.ts`
  - [x] 5.4: Update AI logger pricing in `src/lib/ai/logger.ts` to include `'nano-banana-2'` model cost
  - [x] 5.5: Export Kie client from `src/lib/ai/index.ts`

- [x] Task 6: Write tests (AC: all)
  - [x] 6.1: Create `src/test/kie-client.test.ts` -- test KieClient createPreviewTask with mock fetch
  - [x] 6.2: Create `src/test/preview-generate-route.test.ts` -- test POST /api/preview/generate
  - [x] 6.3: Create `src/test/preview-status-route.test.ts` -- test GET /api/preview/[id]/status
  - [x] 6.4: Test payment gate (403 if not paid)
  - [x] 6.5: Test sequential queue (409 if another preview is generating)
  - [x] 6.6: Test Kie.ai error handling (502 on failure, preview_status set to 'failed')
  - [x] 6.7: Test AI cost logging (persistAICallLog called with correct params)
  - [x] 6.8: Test preview prompt generation for both male and female

## Dev Notes

### Architecture Patterns and Constraints

- **AI Provider Abstraction**: The existing `AIProvider` interface in `src/lib/ai/provider.ts` handles face analysis and consultation generation. Preview generation is a DIFFERENT kind of AI task (image generation, not text/vision) with a DIFFERENT interaction model (async webhook, not synchronous request-response). Create a **separate** `PreviewProvider` interface and `KieClient` class -- do NOT try to force it into the existing `AIProvider` interface. The architecture doc (Section 14) explicitly defines a separate `PreviewProvider` interface.
- **Existing AIRouter pattern**: The `AIRouter` in `provider.ts` uses primary/fallback with retry. Preview generation will need its own routing (Kie.ai primary, Gemini Pro Image fallback -- Story 7-6). For this story, implement the Kie.ai client only. The fallback integration comes in Story 7-6.
- **Async webhook model**: Unlike face analysis and consultation (synchronous API calls), preview generation uses an async job model: submit task -> receive taskId -> Kie.ai calls back when done (Story 7-2 handles the webhook). This story ONLY handles task creation and status polling.
- **Server-side only**: All Kie.ai API calls MUST be in API routes (server-side). The `KIE_API_KEY` must never appear in client-side code. Follow the same pattern as `GOOGLE_AI_API_KEY` and `OPENAI_API_KEY`.
- **Supabase Storage signed URLs**: The user's photo is in Supabase Storage (`consultation-photos` bucket). To pass the photo URL to Kie.ai, generate a signed URL with 15-minute expiry using `supabase.storage.from('consultation-photos').createSignedUrl()`. Do NOT pass base64 -- Kie.ai accepts image URLs in the `image_input` array.
- **Sequential queue per consultation**: Only one preview can generate at a time per consultation. Before creating a new task, query: `SELECT id FROM recommendations WHERE consultation_id = $1 AND preview_status = 'generating'`. If any row exists, return 409 Conflict. This prevents Kie.ai API abuse and ensures users see one preview complete before starting another.

### Kie.ai API Reference (Nano Banana 2)

**Create Task Endpoint:**
```
POST https://api.kie.ai/api/v1/jobs/createTask
Authorization: Bearer {KIE_API_KEY}
Content-Type: application/json

{
  "model": "nano-banana-2",
  "callBackUrl": "https://mynewstyle.com/api/webhook/kie",
  "input": {
    "prompt": "Edit this person's hairstyle to show them with a [style description]. Keep the person's face, skin tone, facial features, and expression exactly the same. Only change the hairstyle. Photorealistic result.",
    "aspect_ratio": "3:4",
    "resolution": "2K",
    "output_format": "jpg",
    "google_search": false,
    "image_input": ["https://signed-url-to-user-photo.jpg"]
  }
}
```

**Response (success):**
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "task_nano-banana-2_1765178625768"
  }
}
```

**Error codes:** 401 (unauthorized), 402 (insufficient credits), 404 (not found), 422 (validation error), 429 (rate limited), 500 (server error), 501 (generation failed), 505 (feature disabled).

**Get Task Status (for polling fallback):**
```
GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId={taskId}
Authorization: Bearer {KIE_API_KEY}
```

Task states: `waiting`, `queuing`, `generating`, `success`, `fail`.

**Callback Webhook Payload (handled in Story 7-2):**
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "task_nano-banana-2_...",
    "info": {
      "originImageUrl": "https://...",
      "resultImageUrl": "https://..."
    }
  }
}
```

Note: Callback URLs must be publicly accessible. Kie.ai retries 3 times on timeout (15s response deadline). Image URLs in callback are valid for 10 minutes -- download immediately.

### Critical Implementation Details

- **prompt construction**: The preview prompt is critical for quality. It MUST instruct the model to preserve the person's identity and only change the hairstyle. Use the versioned prompt system (`src/lib/ai/prompts/v1/preview-male.ts` and `preview-female.ts`) following the exact same pattern as `face-analysis.ts` and `consultation-male.ts`. Include the specific style name from the recommendation, difficulty level context, and gender-appropriate framing.
- **preview_generation_params column**: The `recommendations` table already has a `preview_generation_params` jsonb column (see architecture data model Section 3.1). Store: `{ taskId, model, callbackUrl, requestedAt, photoUrl (storage path, not signed URL), stylePrompt }`. This is used by the webhook handler (Story 7-2) to match callbacks to recommendations.
- **preview_status column**: The `recommendations` table already has a `preview_status` column with enum values: `none`, `generating`, `ready`, `failed`, `unavailable`. This story transitions: `none` -> `generating` (on task creation) and `none` -> `failed` (on Kie.ai error). Story 7-2 handles `generating` -> `ready` or `failed`.
- **AI cost tracking**: Kie.ai charges per image (approximately $0.02-0.05). Since there are no input/output tokens, set `inputTokens: 0`, `outputTokens: 0` in the AI call log. Set `costCents` based on an estimated per-image cost constant (e.g., `KIE_COST_PER_IMAGE_CENTS = 4`). Update the logger's `PRICING` map to include `'nano-banana-2'` pricing.
- **`NEXT_PUBLIC_APP_URL` env var**: This environment variable holds the base URL of the app (e.g., `https://mynewstyle.com` in production, `https://preview-xxx.vercel.app` for previews). Use it to construct the callback URL. It should already exist for Stripe webhook construction (Story 5-5).
- **DO NOT implement the webhook handler** -- that is Story 7-2. This story only creates the Kie.ai task and sets up status polling.
- **DO NOT implement the face similarity check** -- that is Story 7-3.
- **DO NOT implement the fallback to Gemini Pro Image** -- that is Story 7-6.

### Database Schema Context

The `recommendations` table (already created in earlier stories) includes these columns relevant to this story:
```sql
recommendations
  ├── id (uuid, PK)
  ├── consultation_id (FK)
  ├── rank (1, 2, 3)
  ├── style_name
  ├── justification (text)
  ├── match_score (float, 0-1)
  ├── difficulty_level (low/medium/high)
  ├── preview_url (nullable, Supabase Storage)
  ├── preview_status (none/generating/ready/failed/unavailable)
  ├── preview_generation_params (jsonb)
  └── created_at
```

The `ai_calls` table (created in Story 4-7) includes:
```sql
ai_calls
  ├── id (uuid, PK)
  ├── consultation_id (FK)
  ├── provider ('gemini' | 'openai' | 'kie')
  ├── model (text)
  ├── task ('face-analysis' | 'consultation' | 'preview')
  ├── input_tokens (integer)
  ├── output_tokens (integer)
  ├── cost_cents (number)
  ├── latency_ms (number)
  ├── success (boolean)
  ├── error (text, nullable)
  └── timestamp (timestamptz)
```

### Data Flow

```
User taps "Ver como fico" on recommendation card
  → Client calls POST /api/preview/generate { consultationId, recommendationId }
  → API route validates: payment_status === 'paid', no other generating preview
  → API route fetches photo_url from consultations table
  → API route generates Supabase Storage signed URL (15-min expiry)
  → API route builds style prompt (gender-specific, from recommendation style_name)
  → API route calls Kie.ai createTask API
  → Kie.ai returns taskId
  → API route stores taskId in recommendations.preview_generation_params
  → API route updates recommendations.preview_status = 'generating'
  → API route logs AI call to ai_calls table
  → API route returns { status: 'generating', estimatedSeconds: 30 }

Client polls GET /api/preview/{recommendationId}/status every 5 seconds
  → Returns { status: 'generating', previewUrl: null }
  → (Story 7-2 webhook updates to 'ready' with previewUrl)
  → Eventually returns { status: 'ready', previewUrl: '...' }
```

### Project Structure Notes

Files to create:
- `src/lib/ai/kie.ts` -- Kie.ai client (KieClient class, interfaces)
- `src/lib/ai/prompts/v1/preview-male.ts` -- Male preview prompt template
- `src/lib/ai/prompts/v1/preview-female.ts` -- Female preview prompt template
- `src/app/api/preview/generate/route.ts` -- POST endpoint for triggering preview generation
- `src/app/api/preview/[recommendationId]/status/route.ts` -- GET endpoint for polling preview status
- `src/test/kie-client.test.ts` -- KieClient unit tests
- `src/test/preview-generate-route.test.ts` -- Preview generate API route tests
- `src/test/preview-status-route.test.ts` -- Preview status API route tests

Files to modify:
- `src/types/index.ts` -- Add `'preview'` to AICallLog.task, `'kie'` to AICallLog.provider, add PreviewGenerationParams interface
- `src/lib/ai/logger.ts` -- Add `'nano-banana-2'` to PRICING map
- `src/lib/ai/index.ts` -- Export KieClient and related types
- `src/lib/ai/prompts/index.ts` -- Register preview-male and preview-female prompt tasks

Alignment: Follows established patterns:
- API routes in `src/app/api/` using Next.js App Router convention
- AI client modules in `src/lib/ai/` following `gemini.ts` and `openai.ts` patterns
- Versioned prompts in `src/lib/ai/prompts/v1/` following existing face-analysis.ts and consultation-*.ts patterns
- Zod validation on API inputs (consistent with all existing API routes)
- Test files in `src/test/` following existing naming conventions

### Environment Variables Required

```
KIE_API_KEY=your_kie_ai_api_key       # Server-side only, add to .env.local and Vercel
NEXT_PUBLIC_APP_URL=https://mynewstyle.com  # Already exists for Stripe webhooks
```

### Type References

```typescript
// New types to add to src/types/index.ts
interface PreviewGenerationParams {
  taskId: string;
  model: 'nano-banana-2';
  callbackUrl: string;
  requestedAt: string;        // ISO timestamp
  photoStoragePath: string;   // Supabase Storage path (NOT signed URL)
  stylePrompt: string;
  styleName: string;
  gender: 'male' | 'female';
}

// Updated AICallLog task and provider unions
type AICallLog = {
  // ...existing fields
  provider: 'gemini' | 'openai' | 'kie';
  task: 'face-analysis' | 'consultation' | 'preview';
};

// New interfaces for Kie.ai client
interface KieJobRequest {
  model: 'nano-banana-2';
  callBackUrl: string;
  input: {
    prompt: string;
    aspect_ratio: '3:4';
    resolution: '2K';
    output_format: 'jpg';
    google_search: false;
    image_input: string[];
  };
}

interface KieJobResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
  };
}
```

### Testing Standards

- Test file locations: `src/test/kie-client.test.ts`, `src/test/preview-generate-route.test.ts`, `src/test/preview-status-route.test.ts`
- Testing framework: Vitest + React Testing Library (follow existing test patterns in `src/test/`)
- Mock `global.fetch` for Kie.ai API calls (do NOT make real API calls in tests)
- Mock `createServerSupabaseClient` for Supabase operations (follow pattern in existing route tests)
- Test payment gate: request without `payment_status === 'paid'` returns 403
- Test sequential queue: request while another preview is `'generating'` returns 409
- Test successful task creation: verify Kie.ai was called with correct params, recommendation updated, AI call logged
- Test Kie.ai error handling: simulate 401, 429, 500 responses, verify preview_status set to 'failed'
- Test prompt generation: verify male/female prompts include style name and correct framing

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@google/genai` | ^1.43.0 | NOT used for this story (Kie.ai is a separate API) |
| `@supabase/supabase-js` | ^2.98.0 | Database operations, Storage signed URLs |
| `next` | 16.1.6 | API routes (App Router) |
| `zod` | ^4.3.6 | Request validation |

No new npm dependencies required. Kie.ai uses a standard REST API -- use native `fetch()`.

### Cross-Story Dependencies

- **Depends on**: Stories 4-1 through 4-8 (AI pipeline infrastructure, recommendations table, ai_calls table) -- all DONE
- **Depends on**: Stories 5-1 through 5-6 (Payment integration, payment_status tracking) -- all DONE
- **Depended on by**: Story 7-2 (Kie.ai Webhook Handler -- receives completed previews)
- **Depended on by**: Story 7-3 (Face Similarity Check -- validates preview quality)
- **Depended on by**: Story 7-4 (Preview Loading UX -- frontend polls status endpoint)
- **Depended on by**: Story 7-6 (Preview Fallback -- uses same PreviewProvider interface)

### Previous Story Intelligence

**From Story 6-8 (Results Page Animated Reveal):**
- `ResultsPageAnimatedReveal` is the wrapper component for the results page sections
- `HeroRecommendationCard` and `AlternativeRecommendationCard` components already exist and will need "Ver como fico" button integration (Story 7-4/7-5, not this story)
- Framer Motion animation patterns are well-established in the codebase
- The consultation store has a `previews: Map<string, unknown>` field ready for preview status tracking
- All 1301 tests pass as of the last story completion

**From Epic 6 Git Commits:**
- Consistent commit pattern: `feat(epic-N): implement story N-M-description`
- All components in `src/components/consultation/` directory
- Tests in `src/test/` following `description.test.ts(x)` naming
- Supabase database operations use `createServerSupabaseClient()` from `src/lib/supabase/server.ts`

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#S7.1] Story definition and acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 14] Kie.ai Integration (Nano Banana 2) -- complete API reference, interfaces, and flow
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 4.1] AI Pipeline Flow -- Step 3: Preview Generation (on-demand, async)
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 4.2] Provider Abstraction Layer -- PreviewProvider interface
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 4.3] Prompt Management -- versioned prompts in lib/ai/prompts/v1/
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 4.5] Cost Tracking -- every AI call logs model, tokens, cost, latency
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 5.1] API Routes -- POST /api/preview/generate, GET /api/preview/:recommendationId/status
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 3.1] Data Model -- recommendations table with preview_url, preview_status, preview_generation_params
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 3.3] Storage Buckets -- preview-images bucket
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 3.7] AI Preview UX -- loading state, quality gate, share preview
- [Source: _bmad-output/planning-artifacts/prd.md#FR20-FR23] Functional requirements for AI visual preview
- [Source: _bmad-output/planning-artifacts/prd.md#NFR20] AI image generation timeout handling (90-second max)
- [Source: src/lib/ai/provider.ts] Existing AIProvider interface and AIRouter pattern
- [Source: src/lib/ai/gemini.ts] GeminiProvider implementation pattern (for reference)
- [Source: src/lib/ai/logger.ts] AI call logging and cost calculation pattern
- [Source: src/lib/ai/config.ts] AI config pattern (env var loading)
- [Source: src/lib/ai/index.ts] AI module exports
- [Source: src/lib/ai/prompts/index.ts] Prompt management system
- [Source: src/lib/supabase/server.ts] Server-side Supabase client pattern
- [Source: src/types/index.ts] Shared TypeScript types
- [Source: src/app/api/consultation/generate/route.ts] Existing API route pattern (Zod validation, Supabase queries, AI call logging)
- [Source: https://docs.kie.ai/market/google/nano-banana-2] Kie.ai Nano Banana 2 API documentation
- [Source: https://docs.kie.ai/market/common/get-task-detail] Kie.ai Get Task Details API documentation

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No blockers encountered. Post-review fixes applied. 45 new tests pass with zero regressions (1350 total tests passing).

### Completion Notes List

- Implemented `KieClient` class in `src/lib/ai/kie.ts` with `createPreviewTask(photoUrl, stylePrompt, callbackUrl)` method. Uses native `fetch()` with Bearer auth. Throws `KieApiError` (with `.status` property) on non-200 responses. Reads `KIE_API_KEY` from server-side `process.env` only -- never client-accessible.
- Created versioned preview prompt templates (`preview-male.ts`, `preview-female.ts`) under `src/lib/ai/prompts/v1/`. Both explicitly instruct Kie.ai to preserve face identity and produce photorealistic output, including style name and difficulty level context. A `buildPreviewPrompt(gender, styleName, difficultyLevel)` helper in `src/lib/ai/prompts/preview.ts` routes to the correct gender template.
- Implemented `POST /api/preview/generate` with full security gates: Zod validation, payment gate (403), sequential queue enforcement (409), Supabase Storage signed URL generation (15-min expiry), Kie.ai task creation, `preview_status` update to `'generating'`, AI call logging via `persistAICallLog`, and error handling (sets `'failed'` status and returns 502 on Kie.ai errors).
- Implemented `GET /api/preview/[recommendationId]/status` with UUID validation, database fetch, and `{ status, previewUrl }` response for client polling.
- Extended `src/types/index.ts`: added `'kie'` to `AICallLog.provider` union, `'preview'` to `AICallLog.task` union, and new `PreviewGenerationParams` interface.
- Added `KIE_COST_PER_IMAGE_CENTS = 4` constant to `src/lib/ai/logger.ts` for per-image cost tracking.
- Exported `KieClient`, `KieApiError`, `KIE_COST_PER_IMAGE_CENTS` from `src/lib/ai/index.ts`.
- Updated `src/lib/ai/prompts/index.ts` to export preview prompt builders. Removed `'preview-male'` and `'preview-female'` from the `PromptTask` union to avoid a TypeScript compile error -- preview tasks use `buildPreviewPrompt()` directly (returns a plain `string` for Kie.ai), not `getPrompt()` (returns `PromptContent` for Gemini/OpenAI). This correctly separates the two prompt subsystems as intended by the architecture.
- Code review (2026-03-02) identified and fixed 3 issues: (1) `PROMPT_VERSION_MAP` TypeScript compile error from incorrectly including preview tasks in the `PromptTask` union; (2) `response.json()` called before `response.ok` check in `kie.ts` -- now handles non-JSON error bodies gracefully; (3) missing `NEXT_PUBLIC_APP_URL` guard in generate route -- now returns 500 with clear error if env var is missing. Added 3 new tests for these cases.
- 45 new tests total (3 added during review); 1350 total tests pass with no regressions.

### File List

**Created:**
- `src/lib/ai/kie.ts`
- `src/lib/ai/prompts/v1/preview-male.ts`
- `src/lib/ai/prompts/v1/preview-female.ts`
- `src/lib/ai/prompts/preview.ts`
- `src/app/api/preview/generate/route.ts`
- `src/app/api/preview/[recommendationId]/status/route.ts`
- `src/test/kie-client.test.ts`
- `src/test/preview-generate-route.test.ts`
- `src/test/preview-status-route.test.ts`
- `src/test/preview-prompts.test.ts`

**Modified:**
- `src/types/index.ts`
- `src/lib/ai/logger.ts`
- `src/lib/ai/index.ts`
- `src/lib/ai/prompts/index.ts`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-03-02: Implemented Story 7-1 Kie.ai Integration (Nano Banana 2). Created KieClient module, preview prompt templates, POST /api/preview/generate route, GET /api/preview/[recommendationId]/status route, extended TypeScript types (AICallLog provider/task unions, PreviewGenerationParams), added KIE_COST_PER_IMAGE_CENTS cost tracking. 42 new tests added; 1347 total tests passing.
- 2026-03-02: Code review fixes applied. Fixed TypeScript compile error in prompts/index.ts (PromptTask union incorrectly included preview task types that bypass getPrompt()); fixed kie.ts non-JSON error body handling (response.ok now checked before response.json()); added NEXT_PUBLIC_APP_URL env var guard in generate route. Added 3 new tests. 1350 total tests passing. Status: done.
