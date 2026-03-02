# Story 7.6: Preview Fallback (Gemini Pro Direct)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want a fallback preview generation path using Gemini Pro Image directly when Kie.ai is unavailable,
so that users can still generate "Ver como fico" previews even when the primary provider (Kie.ai Nano Banana 2) fails or times out, ensuring reliable preview availability.

## Acceptance Criteria

1. If Kie.ai returns an error (non-200 status, including 401, 402, 429, 500, 501, 505) OR times out (>90s), the system automatically falls back to Gemini 3 Pro Image (direct Google API)
2. The fallback uses the same preview prompt content (gender-specific, style-preserving) as the primary Kie.ai path -- only the provider and API call mechanism differ
3. The user does not see the provider switch -- the UX remains identical (same polling pattern, same loading state, same result display)
4. All fallback usage is logged to the `ai_calls` table with `provider: 'gemini'`, `model: 'gemini-3-pro-image-preview'`, `task: 'preview'` for monitoring and cost tracking
5. The face similarity check (story 7-3) is applied to fallback-generated previews with the same 0.7 threshold -- no quality gate bypass
6. The fallback path uses a synchronous request-response model (not async webhook) since Gemini generateContent returns the image inline
7. The fallback-generated image is uploaded to Supabase Storage in the same `preview-images` bucket with the same path convention as Kie.ai-generated images
8. If BOTH Kie.ai and Gemini Pro Image fail, the recommendation's `preview_status` is set to `'failed'` with error details logged

## Tasks / Subtasks

- [ ] Task 1: Create GeminiProImageProvider class (AC: #2, #6)
  - [ ] 1.1 Create `src/lib/ai/gemini-image.ts` with `GeminiProImageProvider` class
  - [ ] 1.2 Implement `generatePreview(photoBuffer: Buffer, stylePrompt: string): Promise<Buffer>` method
  - [ ] 1.3 Use `@google/genai` SDK (already installed) with model `'gemini-3-pro-image-preview'`
  - [ ] 1.4 Send image editing request with user photo as `inlineData` (base64) plus the style prompt text
  - [ ] 1.5 Set `generationConfig.responseModalities: ['IMAGE']` to get image-only response
  - [ ] 1.6 Set `generationConfig.imageConfig: { aspectRatio: '3:4' }` to match Kie.ai output format
  - [ ] 1.7 Parse response: extract `inline_data.data` (base64) from the first image part in `candidates[0].content.parts`
  - [ ] 1.8 Convert base64 response to Buffer and return
  - [ ] 1.9 Handle API errors: throw typed errors with status codes for retry logic

- [ ] Task 2: Create PreviewRouter with fallback logic (AC: #1, #3, #8)
  - [ ] 2.1 Create `src/lib/ai/preview-router.ts` with `PreviewRouter` class
  - [ ] 2.2 Define `PreviewProvider` interface: `{ generatePreview(photoUrl: string, stylePrompt: string, callbackUrl: string): Promise<PreviewResult> }`
  - [ ] 2.3 `PreviewResult` type: `{ taskId?: string; imageBuffer?: Buffer; provider: 'kie' | 'gemini'; isSync: boolean }`
  - [ ] 2.4 Implement `generatePreview()` method: try Kie.ai primary -> on retryable error or timeout -> try Gemini Pro fallback
  - [ ] 2.5 Primary path (Kie.ai): calls existing `KieClient.createPreviewTask()` (async, returns taskId)
  - [ ] 2.6 Fallback path (Gemini Pro): downloads photo from URL, calls `GeminiProImageProvider.generatePreview()` (synchronous, returns imageBuffer)
  - [ ] 2.7 On primary timeout: abort after 90 seconds, log timeout, proceed to fallback
  - [ ] 2.8 On fallback success with sync image: immediately run face similarity check, upload to storage, update recommendation status
  - [ ] 2.9 On both providers failing: set `preview_status = 'failed'`, log comprehensive error details

- [ ] Task 3: Update POST /api/preview/generate route for fallback handling (AC: #1, #3, #5, #6, #7, #8)
  - [ ] 3.1 Import `PreviewRouter` in `src/app/api/preview/generate/route.ts`
  - [ ] 3.2 Replace direct `KieClient.createPreviewTask()` call with `PreviewRouter.generatePreview()`
  - [ ] 3.3 Handle two response paths based on `PreviewResult.isSync`:
    - Async (Kie.ai): store taskId, set `preview_status = 'generating'`, return `{ status: 'generating' }` (existing behavior)
    - Sync (Gemini fallback): run face similarity check on returned imageBuffer, upload to Supabase Storage, set `preview_status = 'ready'` or `'unavailable'`, return `{ status: 'ready', previewUrl }` or `{ status: 'unavailable' }`
  - [ ] 3.4 For sync fallback: download original photo from Supabase Storage (Buffer) for face similarity comparison
  - [ ] 3.5 For sync fallback: upload generated image to `preview-images` bucket at `previews/{consultationId}/{recommendationId}.jpg`
  - [ ] 3.6 Log fallback trigger event: `console.warn('[Preview] Primary provider (Kie.ai) failed, falling back to Gemini Pro Image')`

- [ ] Task 4: Implement AI cost tracking for fallback (AC: #4)
  - [ ] 4.1 Add `'gemini-3-pro-image-preview'` to PRICING map in `src/lib/ai/logger.ts` with per-image cost (inputPer1M: 0, outputPer1M: 0, fixedCostCents: 13 for ~$0.134/image at 1K-2K resolution)
  - [ ] 4.2 Log Gemini Pro Image calls to `ai_calls` table via `persistAICallLog()` with: `provider: 'gemini'`, `model: 'gemini-3-pro-image-preview'`, `task: 'preview'`, `inputTokens: 0`, `outputTokens: 1120` (approximate token consumption for 1K-2K image), `costCents: 13`
  - [ ] 4.3 Track fallback-specific metadata in `preview_generation_params`: `{ provider: 'gemini-pro-image', fallbackReason: 'kie_error' | 'kie_timeout', ... }`

- [ ] Task 5: Environment variable and configuration updates (AC: #1, #6)
  - [ ] 5.1 Verify `GOOGLE_AI_API_KEY` env var is available (already set for face analysis/consultation -- same key works for image generation)
  - [ ] 5.2 Add `PREVIEW_FALLBACK_ENABLED` env var (default: `'true'`) to allow disabling fallback if needed
  - [ ] 5.3 Add `PREVIEW_PRIMARY_TIMEOUT_MS` env var (default: `'90000'`) for configurable timeout
  - [ ] 5.4 Update `.env.example` with new env vars and documentation

- [ ] Task 6: Write tests (AC: all)
  - [ ] 6.1 Unit test `GeminiProImageProvider.generatePreview()`: mock `@google/genai` SDK, verify correct request format and response parsing
  - [ ] 6.2 Unit test `PreviewRouter`: test primary success (no fallback), primary failure + fallback success, both failure
  - [ ] 6.3 Unit test timeout handling: verify 90s timeout triggers fallback
  - [ ] 6.4 Integration test: POST /api/preview/generate with mocked Kie.ai failure triggers Gemini fallback and returns sync result
  - [ ] 6.5 Test face similarity check is applied to fallback-generated images (not bypassed)
  - [ ] 6.6 Test AI cost logging: verify `persistAICallLog` called with correct Gemini Pro Image params
  - [ ] 6.7 Test both-providers-fail scenario: verify preview_status set to 'failed'
  - [ ] 6.8 Test `PREVIEW_FALLBACK_ENABLED=false` disables fallback (Kie.ai failure = immediate failure)

## Dev Notes

### Architecture Patterns and Constraints

- **Separate PreviewProvider interface**: The architecture doc (Section 14) explicitly defines preview generation as a SEPARATE interface from the `AIProvider` used for face analysis/consultation. The existing `AIRouter` handles `AIProvider` (text/vision). Preview routing needs its own `PreviewRouter` that understands two fundamentally different interaction models:
  - **Kie.ai (primary)**: Async webhook -- submit job, get taskId, wait for callback
  - **Gemini Pro Image (fallback)**: Synchronous -- send request, get image back immediately
- **Use existing `@google/genai` SDK**: The `GeminiProImageProvider` should use the same `GoogleGenAI` client from `@google/genai` that `GeminiProvider` uses in `src/lib/ai/gemini.ts`. Use the same API key (`GOOGLE_AI_API_KEY`). Do NOT install a separate SDK or use raw REST calls.
- **Use existing `isRetryable()` function**: Import from `src/lib/ai/provider.ts` to determine if Kie.ai errors should trigger fallback. The function already handles 429, 5xx, timeouts, and connection resets.
- **Synchronous fallback within the API route**: Unlike the Kie.ai async webhook flow, the Gemini Pro fallback generates the image synchronously within the `/api/preview/generate` request. This means the API route response changes:
  - Kie.ai path: returns `{ status: 'generating' }`, client polls
  - Gemini fallback: returns `{ status: 'ready', previewUrl: '...' }` immediately (after face similarity check)
  - The client polling loop in `usePreviewGeneration` (story 7-4) already handles both `'generating'` and `'ready'` statuses -- no frontend changes needed
- **90-second timeout for Kie.ai**: Architecture doc (Section 8.3) specifies "90s max per AI call." Use `AbortController` with `setTimeout(90000)` to cancel the Kie.ai request if it doesn't return a taskId within 90 seconds. Note: this is the timeout for the Kie.ai *createTask* API call itself, not the total preview generation time.
- **Face similarity check on fallback images**: Story 7-3's `compareFaces()` function MUST be called on fallback-generated images. The function takes `(originalPhoto: Buffer, previewImage: Buffer)` and returns `{ similarity, passed, reason }`. If `passed === false`, set `preview_status = 'unavailable'` (not `'ready'`).

### Gemini 3 Pro Image API Details

**Model ID**: `gemini-3-pro-image-preview`

**IMPORTANT DEPRECATION**: Gemini 3 Pro Preview is deprecated and shuts down March 9, 2026. The migration path is to `gemini-3.1-pro-preview` for text tasks, but for image generation, `gemini-3-pro-image-preview` remains active. Monitor Google's deprecation timeline and be prepared to switch to `gemini-3.1-flash-image-preview` if needed.

**Request format using @google/genai SDK:**
```typescript
import { GoogleGenAI } from '@google/genai';

const client = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY });

const response = await client.models.generateContent({
  model: 'gemini-3-pro-image-preview',
  contents: [
    {
      role: 'user',
      parts: [
        { text: stylePrompt },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: photoBase64, // base64-encoded user photo
          },
        },
      ],
    },
  ],
  config: {
    responseModalities: ['IMAGE'],
    imageConfig: {
      aspectRatio: '3:4',
    },
  },
});
```

**Response parsing:**
```typescript
// Response contains inline image data
const parts = response.candidates?.[0]?.content?.parts ?? [];
const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));
if (!imagePart?.inlineData?.data) {
  throw new Error('Gemini: No image in response');
}
const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
```

**Supported aspect ratios**: `'3:4'` is supported (matching Kie.ai output).

**Cost**: ~$0.134 per image at 1K-2K resolution (1,120 output tokens at $120/M). This is 2.5-6x more expensive than Kie.ai (~$0.02-0.05/image), which is why it is the fallback, not the primary.

**Known reliability issues**: Peak hour failure rates ~45% (as of Feb 2026). This means fallback may also fail. Both-fail scenario MUST be handled gracefully.

### PreviewRouter Implementation Pattern

```typescript
// src/lib/ai/preview-router.ts

export interface PreviewResult {
  taskId?: string;        // Set if async (Kie.ai)
  imageBuffer?: Buffer;   // Set if sync (Gemini)
  provider: 'kie' | 'gemini';
  isSync: boolean;        // true = image available now, false = poll for status
}

export class PreviewRouter {
  private kieClient: KieClient;
  private geminiImage: GeminiProImageProvider;
  private fallbackEnabled: boolean;
  private timeoutMs: number;

  constructor() {
    this.kieClient = new KieClient();
    this.geminiImage = new GeminiProImageProvider();
    this.fallbackEnabled = process.env.PREVIEW_FALLBACK_ENABLED !== 'false';
    this.timeoutMs = parseInt(process.env.PREVIEW_PRIMARY_TIMEOUT_MS ?? '90000', 10);
  }

  async generatePreview(
    photoUrl: string,
    stylePrompt: string,
    callbackUrl: string
  ): Promise<PreviewResult> {
    // Try primary (Kie.ai)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const { taskId } = await this.kieClient.createPreviewTask(
          photoUrl, stylePrompt, callbackUrl, controller.signal
        );
        clearTimeout(timeout);
        return { taskId, provider: 'kie', isSync: false };
      } finally {
        clearTimeout(timeout);
      }
    } catch (primaryError) {
      console.warn('[Preview] Kie.ai failed:', primaryError);

      if (!this.fallbackEnabled) {
        throw primaryError;
      }

      // Try fallback (Gemini Pro Image)
      try {
        // Download photo from URL for Gemini (needs base64, not URL)
        const photoResponse = await fetch(photoUrl);
        const photoBuffer = Buffer.from(await photoResponse.arrayBuffer());

        const imageBuffer = await this.geminiImage.generatePreview(
          photoBuffer, stylePrompt
        );
        return { imageBuffer, provider: 'gemini', isSync: true };
      } catch (fallbackError) {
        console.error('[Preview] Both providers failed:', {
          primary: primaryError,
          fallback: fallbackError,
        });
        throw fallbackError;
      }
    }
  }
}
```

### Integration with POST /api/preview/generate

The existing route (from story 7-1) calls `KieClient.createPreviewTask()` directly. This story replaces that with `PreviewRouter.generatePreview()` and handles the two response paths:

```typescript
// In src/app/api/preview/generate/route.ts

const result = await previewRouter.generatePreview(signedUrl, stylePrompt, callbackUrl);

if (result.isSync && result.imageBuffer) {
  // Gemini fallback: image is ready now
  // 1. Run face similarity check
  const originalPhotoBuffer = await downloadFromStorage(consultation.photo_url);
  const similarity = await compareFaces(originalPhotoBuffer, result.imageBuffer);

  if (!similarity.passed) {
    await updateRecommendation(recommendationId, {
      preview_status: 'unavailable',
      preview_generation_params: {
        ...existingParams,
        provider: 'gemini-pro-image',
        quality_gate_reason: similarity.reason,
        similarity_score: similarity.similarity,
      },
    });
    return Response.json({ status: 'unavailable' });
  }

  // 2. Upload to Supabase Storage
  const storagePath = `previews/${consultationId}/${recommendationId}.jpg`;
  await supabase.storage.from('preview-images').upload(storagePath, result.imageBuffer, {
    contentType: 'image/jpeg',
    upsert: true,
  });

  // 3. Update recommendation
  await updateRecommendation(recommendationId, {
    preview_url: storagePath,
    preview_status: 'ready',
    preview_generation_params: {
      ...existingParams,
      provider: 'gemini-pro-image',
      fallbackReason: 'kie_failure',
      completedAt: new Date().toISOString(),
    },
  });

  // 4. Log AI call
  await persistAICallLog(supabase, consultationId, {
    id: crypto.randomUUID(),
    provider: 'gemini',
    model: 'gemini-3-pro-image-preview',
    task: 'preview',
    inputTokens: 0,
    outputTokens: 1120,
    costCents: 13,
    latencyMs,
    success: true,
    timestamp: new Date().toISOString(),
  });

  return Response.json({ status: 'ready', previewUrl: storagePath });
} else {
  // Kie.ai primary: async path (existing behavior)
  // ... store taskId, set generating, return { status: 'generating' }
}
```

### Existing Code to Modify (DO NOT Recreate)

- **`src/app/api/preview/generate/route.ts`** (from story 7-1): Replace direct `KieClient.createPreviewTask()` call with `PreviewRouter.generatePreview()`. Add sync response handling for fallback path.
- **`src/lib/ai/logger.ts`**: Add `'gemini-3-pro-image-preview'` to `PRICING` map. Since image generation uses fixed per-image pricing (not per-token), add a `fixedCostCents` field or use the approximate token-based calculation.
- **`src/lib/ai/index.ts`**: Export `GeminiProImageProvider` and `PreviewRouter`.
- **`src/types/index.ts`**: The `AICallLog` type already has `provider: 'gemini' | 'openai'` and `task: 'face-analysis' | 'consultation'` -- story 7-1 adds `'kie'` to provider and `'preview'` to task. No additional type changes needed for this story (Gemini Pro Image uses `provider: 'gemini'`, which already exists).

### New Files to Create

- `src/lib/ai/gemini-image.ts` -- Gemini Pro Image client for synchronous image generation
- `src/lib/ai/preview-router.ts` -- PreviewRouter with Kie.ai primary + Gemini Pro fallback logic

### Prompt Reuse

The preview prompts (`src/lib/ai/prompts/v1/preview-male.ts` and `preview-female.ts`, created in story 7-1) are reused for the fallback. The prompt content is identical -- it instructs the model to preserve the user's face and only change the hairstyle. The only difference is the delivery mechanism:
- Kie.ai: prompt sent as `input.prompt` string field with `image_input` URL array
- Gemini Pro: prompt sent as `text` part alongside `inlineData` (base64 image) in `contents`

### Timeout Implementation

```typescript
// AbortController pattern for Kie.ai timeout
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 90_000);

try {
  const result = await kieClient.createPreviewTask(
    photoUrl, stylePrompt, callbackUrl, controller.signal
  );
  clearTimeout(timeout);
  return result;
} catch (error) {
  clearTimeout(timeout);
  if (error.name === 'AbortError') {
    console.warn('[Preview] Kie.ai timed out after 90s, falling back to Gemini Pro');
    // proceed to fallback
  }
  throw error;
}
```

Note: The `KieClient.createPreviewTask()` method (story 7-1) should accept an optional `AbortSignal` parameter to pass to `fetch()`. If story 7-1 did not implement this, add `signal` support to the `KieClient` as part of this story.

### Database Schema Impact

No new tables or columns needed. This story uses:
- `recommendations.preview_status`: existing enum (none/generating/ready/failed/unavailable)
- `recommendations.preview_url`: existing nullable field
- `recommendations.preview_generation_params`: existing jsonb -- add `provider`, `fallbackReason` fields
- `ai_calls` table: existing table, logs with `provider: 'gemini'`, `model: 'gemini-3-pro-image-preview'`

### Project Structure Notes

Files to create:
- `src/lib/ai/gemini-image.ts` -- Gemini Pro Image provider (synchronous image generation)
- `src/lib/ai/preview-router.ts` -- Preview routing with fallback logic

Files to modify:
- `src/app/api/preview/generate/route.ts` -- Replace direct Kie.ai call with PreviewRouter
- `src/lib/ai/logger.ts` -- Add Gemini Pro Image pricing
- `src/lib/ai/index.ts` -- Export new modules
- `src/lib/ai/kie.ts` -- Add AbortSignal support to `createPreviewTask()` if not already present

Alignment: Follows established patterns:
- AI clients in `src/lib/ai/` following `gemini.ts` pattern
- Uses `@google/genai` SDK (already installed, already configured)
- Cost logging via `persistAICallLog()` following existing pattern
- Error handling with `isRetryable()` from `src/lib/ai/provider.ts`
- Supabase Storage uploads following pattern from story 7-2

### Environment Variables

| Variable | Description | Status |
|----------|-------------|--------|
| `GOOGLE_AI_API_KEY` | Google AI API key (for Gemini Pro Image) | Already exists (used for face analysis) |
| `KIE_API_KEY` | Kie.ai API key (for primary provider) | Already exists (from story 7-1) |
| `PREVIEW_FALLBACK_ENABLED` | Enable/disable Gemini fallback (default: true) | NEW -- add to .env.example |
| `PREVIEW_PRIMARY_TIMEOUT_MS` | Kie.ai timeout before fallback (default: 90000) | NEW -- add to .env.example |

### Testing Standards

- Test files: `src/test/gemini-image.test.ts`, `src/test/preview-router.test.ts`
- Testing framework: Vitest (project standard)
- Mock `@google/genai` SDK for GeminiProImageProvider tests (do NOT make real API calls)
- Mock `KieClient` for PreviewRouter tests
- Mock `compareFaces` for face similarity integration
- Test timeout with `vi.useFakeTimers()` to simulate 90s Kie.ai timeout
- Test `PREVIEW_FALLBACK_ENABLED=false` disabling fallback
- Test both-providers-fail error propagation

### Cross-Story Dependencies

- **Depends on (MUST be implemented first)**:
  - Story 7-1 (Kie.ai Integration): KieClient class, `POST /api/preview/generate` route, preview prompt templates, PreviewGenerationParams type, AI cost logging for preview
  - Story 7-2 (Kie.ai Webhook Handler): Webhook route (async path still uses Kie.ai webhooks for primary)
  - Story 7-3 (Face Similarity Check): `compareFaces()` function for quality gate on fallback images
- **Depended on by**:
  - Story 7-5 (Preview Display & Before/After): Frontend displays preview regardless of which provider generated it
  - Story 7-7 (Barber Reference Card): Uses preview images regardless of source

### Previous Story Intelligence

**From Story 7-1 (Kie.ai Integration):**
- `KieClient` class is in `src/lib/ai/kie.ts`
- Preview prompts are in `src/lib/ai/prompts/v1/preview-male.ts` and `preview-female.ts`
- `POST /api/preview/generate` route is in `src/app/api/preview/generate/route.ts`
- Sequential queue logic: check for existing `preview_status === 'generating'` before starting new preview
- Payment gate: verify `payment_status === 'paid'` before generating preview
- Preview prompt includes: style name, difficulty level, gender-specific framing, instruction to preserve face

**From Story 7-2 (Kie.ai Webhook Handler):**
- Webhook route at `src/app/api/webhook/kie/route.ts`
- Image download and upload pattern: download from CDN -> upload to Supabase Storage `preview-images` bucket
- Storage path convention: `previews/{consultationId}/{recommendationId}.jpg`
- Uses `upsert: true` for idempotent uploads

**From Story 7-3 (Face Similarity Check):**
- `compareFaces(originalPhoto: Buffer, previewImage: Buffer): Promise<FaceSimilarityResult>` exported from `src/lib/ai/face-similarity/`
- Returns `{ similarity: number; passed: boolean; reason?: string }`
- Threshold: 0.7 (similarity >= 0.7 = pass)
- The same check MUST be applied to Gemini-generated previews
- Downloads original photo as Buffer from Supabase Storage for comparison

**From Story 7-4 (Preview Loading UX):**
- `usePreviewGeneration` hook polls `GET /api/preview/:recommendationId/status` every 5 seconds
- Hook handles states: `'idle' | 'generating' | 'ready' | 'failed' | 'unavailable'`
- Client already handles `'ready'` with `previewUrl` -- no frontend changes needed for sync fallback
- 90-second client-side timeout already implemented

**From existing AI infrastructure (Stories 4-1 through 4-8):**
- `GeminiProvider` in `src/lib/ai/gemini.ts` uses `GoogleGenAI` from `@google/genai` -- reuse same SDK pattern
- `logAICall()` and `persistAICallLog()` in `src/lib/ai/logger.ts` -- reuse for cost tracking
- `isRetryable()` in `src/lib/ai/provider.ts` -- reuse for error classification
- `createServerSupabaseClient()` from `src/lib/supabase/server.ts` -- reuse for database and storage operations

### Key Implementation Warnings

1. **DO NOT create a new `AIProvider` implementation** -- `GeminiProImageProvider` is NOT an `AIProvider` (which handles text/vision tasks). It is a standalone class for image generation only.
2. **DO NOT bypass the face similarity check** -- fallback-generated images MUST go through the same quality gate as Kie.ai images.
3. **DO NOT change the client polling behavior** -- the frontend already handles `'ready'` status from polling. The sync fallback just means the first poll will already return `'ready'`.
4. **DO NOT use `response.text`** for image generation -- use `responseModalities: ['IMAGE']` and parse `inline_data` from parts.
5. **DO NOT send the photo as a URL to Gemini** -- unlike Kie.ai which accepts `image_input` URLs, the Gemini API requires base64 `inlineData`. Download the photo first.
6. **WATCH for the Gemini 3 Pro deprecation** (March 9, 2026) -- the model ID may need updating to `gemini-3.1-flash-image-preview` in the near future.

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#S7.6] -- Story definition and acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 14] -- Kie.ai integration, PreviewProvider interface, cost comparison, GeminiProImage as fallback
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 4.1] -- AI pipeline flow, Step 3 preview generation with fallback path
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 4.2] -- Provider Abstraction Layer, AIRouter with primary/fallback pattern
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 4.4] -- Output Validation, face similarity check applied to all preview sources
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 4.5] -- Cost tracking per AI call
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 8.3] -- 90s max per AI call timeout
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 2.3] -- AI Layer: Nano Banana 2 primary, Gemini 3 Pro Image fallback
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 9.3] -- Alerts: >20% unavailable in 1 day triggers investigation
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 3.7] -- AI Preview UX: user doesn't see provider switch
- [Source: _bmad-output/planning-artifacts/prd.md#FR20-FR23] -- AI visual preview functional requirements
- [Source: _bmad-output/planning-artifacts/prd.md#NFR19] -- AI integration with graceful fallback on provider outage
- [Source: _bmad-output/planning-artifacts/prd.md#NFR20] -- AI image generation timeout handling (90-second max)
- [Source: src/lib/ai/provider.ts] -- isRetryable() function, AIRouter pattern
- [Source: src/lib/ai/gemini.ts] -- GeminiProvider pattern using @google/genai SDK
- [Source: src/lib/ai/logger.ts] -- AI call logging and cost calculation (PRICING map)
- [Source: src/lib/ai/index.ts] -- AI module barrel exports
- [Source: src/lib/ai/config.ts] -- GOOGLE_AI_API_KEY env var loading
- [Source: _bmad-output/implementation-artifacts/7-1-kie-ai-integration.md] -- KieClient, preview generate route, prompt system
- [Source: _bmad-output/implementation-artifacts/7-2-kie-ai-webhook-handler.md] -- Webhook handler, storage upload pattern
- [Source: _bmad-output/implementation-artifacts/7-3-face-similarity-check.md] -- compareFaces() function, quality gate logic
- [Source: _bmad-output/implementation-artifacts/7-4-preview-loading-ux.md] -- usePreviewGeneration hook, polling pattern, client-side state handling
- [Source: https://ai.google.dev/gemini-api/docs/image-generation] -- Gemini image generation API docs
- [Source: https://ai.google.dev/gemini-api/docs/models] -- Gemini model IDs and capabilities

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
