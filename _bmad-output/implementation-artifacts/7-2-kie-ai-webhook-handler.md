# Story 7.2: Kie.ai Webhook Handler

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want to receive completed preview images via webhook callback from Kie.ai,
so that generated previews are downloaded, stored, and linked to recommendations without polling.

## Acceptance Criteria

1. POST /api/webhook/kie endpoint receives Kie.ai task completion callbacks
2. Webhook signature is verified using HMAC-SHA256 with the webhookHmacKey, comparing X-Webhook-Signature header via constant-time comparison (crypto.timingSafeEqual) — reject 401 on failure
3. On successful completion (code 200, state "success"): download the generated image from Kie.ai CDN resultUrls
4. Upload downloaded image to Supabase Storage `preview-images` bucket with path scoped to consultation/recommendation
5. Update the recommendation record: set preview_url to the Supabase Storage path and preview_status to "ready"
6. On failure (state "fail" or error code): update preview_status to "failed" with error details in preview_generation_params
7. Idempotent processing: if the same taskId callback arrives multiple times, it is handled safely without duplicate uploads or status corruption
8. Return 200 to Kie.ai for all verified callbacks (even on internal processing errors) to prevent unnecessary retries

## Tasks / Subtasks

- [x] Task 1: Create webhook route handler (AC: #1, #8)
  - [x] 1.1 Create `src/app/api/webhook/kie/route.ts` with POST handler
  - [x] 1.2 Parse raw body as JSON from callback
  - [x] 1.3 Always return 200 for verified webhooks (match Stripe webhook pattern)
- [x] Task 2: Implement webhook signature verification (AC: #2)
  - [x] 2.1 Create `src/lib/kie/webhooks.ts` with `verifyKieWebhook()` function
  - [x] 2.2 Extract X-Webhook-Timestamp and X-Webhook-Signature headers
  - [x] 2.3 Reconstruct signature: HMAC-SHA256(taskId + "." + timestamp, KIE_WEBHOOK_HMAC_KEY) then Base64 encode
  - [x] 2.4 Compare using crypto.timingSafeEqual to prevent timing attacks
  - [x] 2.5 Return 401 on signature mismatch
- [x] Task 3: Implement image download and storage (AC: #3, #4)
  - [x] 3.1 Query task details from recordInfo endpoint to get resultUrls (callback payload only contains taskId, not output URLs)
  - [x] 3.2 Download image from first resultUrl (Kie.ai CDN, URLs expire after 24h)
  - [x] 3.3 Upload to Supabase Storage `preview-images` bucket: `previews/{consultationId}/{recommendationId}.jpg`
  - [x] 3.4 Handle download failures gracefully (CDN timeout, 404)
- [x] Task 4: Update recommendation record (AC: #5, #6)
  - [x] 4.1 Look up recommendation by taskId stored in preview_generation_params
  - [x] 4.2 On success: set preview_url = storage path, preview_status = "ready"
  - [x] 4.3 On failure: set preview_status = "failed", store error details in preview_generation_params
- [x] Task 5: Idempotency handling (AC: #7)
  - [x] 5.1 Before processing, check if recommendation already has preview_status = "ready"
  - [x] 5.2 If already processed, return 200 immediately (no-op)
  - [x] 5.3 Log duplicate callback for monitoring
- [x] Task 6: Environment variables and configuration
  - [x] 6.1 Add KIE_WEBHOOK_HMAC_KEY to .env.local / .env.example
  - [x] 6.2 Add KIE_API_KEY for recordInfo API calls (reuse from 7-1 if already set)
  - [x] 6.3 Document env vars in the env.example

## Dev Notes

### Architecture Patterns — MUST Follow

**Follow the Stripe webhook pattern exactly.** The existing `src/app/api/webhook/stripe/route.ts` is the canonical reference for webhook handling in this project. Key patterns:

1. **Route handler is thin** — delegates to library functions in `src/lib/kie/webhooks.ts`
2. **Always return 200** for verified webhooks (even on internal errors) to prevent retry storms
3. **Return 400/401 only** for signature verification failures
4. **Structured logging** with `[webhook/kie]` prefix for all console.log/error calls
5. **Idempotency check early** — check before doing any work

**Supabase server client pattern:**
```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';
const supabase = createServerSupabaseClient();
```
This uses the service role key and bypasses RLS. Already established in `src/lib/supabase/server.ts`.

### Kie.ai Webhook Callback Details (from API docs)

**Callback payload structure:**
```json
{
  "taskId": "ee9c2715375b7837f8bb51d641ff5863",
  "code": 200,
  "msg": "Success",
  "data": {
    "task_id": "ee9c2715375b7837f8bb51d641ff5863",
    "callbackType": "task_completed"
  }
}
```

**CRITICAL: The callback payload does NOT contain the output image URLs.** You must call the recordInfo API to get the actual results:

```
GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId={taskId}
Authorization: Bearer {KIE_API_KEY}
```

Response when successful:
```json
{
  "code": 200,
  "data": {
    "taskId": "...",
    "state": "success",
    "resultJson": "{\"resultUrls\":[\"https://cdn.kie.ai/generated-image.jpg\"]}",
    "failCode": "",
    "failMsg": "",
    "costTime": 15000
  }
}
```

- `resultJson` is a **JSON string** that must be parsed — it contains `resultUrls` array
- CDN URLs **expire after 24 hours** — download immediately and store in Supabase Storage
- Possible state values: "waiting", "queuing", "generating", "success", "fail"

**Webhook signature verification (HMAC-SHA256):**
- Headers: `X-Webhook-Timestamp` (unix seconds), `X-Webhook-Signature` (base64)
- Algorithm: `HMAC-SHA256(taskId + "." + timestamp, webhookHmacKey)` then base64 encode
- Use `crypto.timingSafeEqual()` for comparison (prevent timing attacks)
- The `webhookHmacKey` is obtained from Kie.ai dashboard (stored as `KIE_WEBHOOK_HMAC_KEY`)

### Database Context

The `recommendations` table has these relevant columns (from architecture.md data model):
- `preview_url` (nullable, Supabase Storage path)
- `preview_status` (none/generating/ready/failed/unavailable)
- `preview_generation_params` (jsonb) — stores `{ taskId, model, ... }` set by story 7-1

**Lookup pattern:** Story 7-1 stores the Kie.ai `taskId` in `preview_generation_params.taskId`. The webhook handler must look up the recommendation by this taskId to find which recommendation to update.

Query approach:
```typescript
const { data: recommendation } = await supabase
  .from('recommendations')
  .select('id, consultation_id, preview_status, preview_generation_params')
  .filter('preview_generation_params->>taskId', 'eq', taskId)
  .single();
```

### Supabase Storage — preview-images Bucket

Storage path convention: `previews/{consultationId}/{recommendationId}.jpg`

Upload pattern:
```typescript
const { data, error } = await supabase.storage
  .from('preview-images')
  .upload(storagePath, imageBuffer, {
    contentType: 'image/jpeg',
    upsert: true  // Idempotent: overwrite if re-processed
  });
```

Using `upsert: true` ensures idempotency at the storage level — if the same callback triggers twice, the second upload just overwrites harmlessly.

### Error Handling Strategy

| Scenario | Action |
|----------|--------|
| Invalid signature | Return 401, do NOT process |
| Task not found in DB | Log warning, return 200 (may be orphaned task) |
| Already processed (preview_status = "ready") | Log info, return 200 (idempotent no-op) |
| recordInfo API fails | Set preview_status = "failed", log error, return 200 |
| Image download fails (CDN error) | Set preview_status = "failed", log error, return 200 |
| Supabase storage upload fails | Set preview_status = "failed", log error, return 200 |
| DB update fails | Log error, return 200 (manual reconciliation needed) |

### Dependency on Story 7-1

This story depends on story 7-1 (Kie.ai Integration) which:
- Creates the `src/lib/kie/` directory structure
- Sets up `KIE_API_KEY` environment variable
- Implements `POST /api/preview/generate` which calls Kie.ai createTask
- Stores the `taskId` in `recommendation.preview_generation_params`
- Sets `preview_status = "generating"` on the recommendation

If 7-1 is not yet implemented when developing this story, create the `src/lib/kie/` directory and stub the necessary types. The webhook handler should work independently once it receives a callback.

### File Structure

```
src/
├── app/api/webhook/kie/
│   └── route.ts          # NEW — Kie.ai webhook endpoint
├── lib/kie/
│   ├── webhooks.ts       # NEW — Webhook verification + processing logic
│   └── types.ts          # NEW (or extend from 7-1) — Kie.ai types
```

### Anti-Patterns to AVOID

1. **DO NOT use request.json()** before signature verification — read raw body first with `request.text()` then parse after verification. The Stripe webhook pattern uses raw body for signature check, but Kie.ai's HMAC is computed from taskId+timestamp (not the body), so you CAN parse JSON first. However, still verify BEFORE processing.
2. **DO NOT poll for results** — this is the webhook handler, not a polling endpoint. The callback triggers the download.
3. **DO NOT store Kie.ai CDN URLs as preview_url** — CDN URLs expire in 24h. Always download and re-upload to Supabase Storage.
4. **DO NOT return 500** to Kie.ai — always return 200 for verified webhooks. Internal errors are logged, not propagated.
5. **DO NOT create a new AIProvider interface** for this — the Kie.ai webhook is a separate integration pattern (async callback), not the synchronous AIProvider interface used for Gemini/OpenAI.

### Testing Approach

- Unit test `verifyKieWebhook()` with valid/invalid signatures
- Unit test idempotency logic (duplicate taskId handling)
- Integration test full webhook flow with mocked Kie.ai recordInfo response
- Test error paths: invalid signature, missing task, CDN download failure
- Use Kie.ai test webhook feature or curl to simulate callbacks locally

### Environment Variables Required

| Variable | Description | Location |
|----------|-------------|----------|
| `KIE_WEBHOOK_HMAC_KEY` | HMAC key for webhook signature verification (from Kie.ai dashboard) | Server-side only |
| `KIE_API_KEY` | API key for recordInfo endpoint calls (may already exist from 7-1) | Server-side only |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (already exists) | Already configured |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (already exists) | Already configured |

### Project Structure Notes

- Alignment with existing webhook pattern: follows `src/app/api/webhook/stripe/route.ts` exactly
- Library code goes in `src/lib/kie/` (parallel to `src/lib/stripe/`)
- Types extend `src/types/index.ts` if shared, or stay in `src/lib/kie/types.ts` if Kie-specific
- No changes to existing files required (additive only)

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#14 — Kie.ai Integration section]
- [Source: _bmad-output/planning-artifacts/architecture.md#4.2 — Provider Abstraction Layer]
- [Source: _bmad-output/planning-artifacts/architecture.md#3.1 — Data Model (recommendations table)]
- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#S7.2 — Story definition and acceptance criteria]
- [Source: src/app/api/webhook/stripe/route.ts — Canonical webhook handler pattern]
- [Source: src/lib/stripe/webhooks.ts — Webhook verification + processing pattern]
- [Source: src/lib/supabase/server.ts — Server-side Supabase client]
- [Source: Kie.ai API docs — https://docs.kie.ai/market/google/nano-banana-2]
- [Source: Kie.ai Webhook Verification — https://docs.kie.ai/common-api/webhook-verification]
- [Source: Kie.ai Get Task Detail — https://docs.kie.ai/market/common/get-task-detail]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No blocking issues encountered. Implementation followed Stripe webhook pattern exactly.

### Completion Notes List

- Implemented `verifyKieWebhook()` in `src/lib/kie/webhooks.ts` using Node.js `crypto` module: HMAC-SHA256(taskId + "." + timestamp, KIE_WEBHOOK_HMAC_KEY) then base64 encode, compared via `timingSafeEqual` to prevent timing attacks.
- Implemented `processKieCallback()` in `src/lib/kie/webhooks.ts` covering the full async flow: recordInfo fetch → image download → Supabase Storage upload → recommendation DB update.
- Route handler in `src/app/api/webhook/kie/route.ts` is intentionally thin — all logic in the library module, following the Stripe pattern exactly.
- Idempotency implemented at two levels: (1) early check for `preview_status = "ready"` returns no-op; (2) storage upload uses `upsert: true` so duplicate uploads overwrite harmlessly.
- All error paths (recordInfo failure, CDN download failure, storage upload failure, DB update failure) set `preview_status = "failed"` with error details in `preview_generation_params` and return 200 to prevent Kie.ai retry storms.
- Orphaned task callbacks (no matching recommendation in DB) log a warning and return 200.
- `src/lib/kie/` directory created as sibling to `src/lib/stripe/` following project structure conventions.
- `KIE_API_KEY` was already established by story 7-1; `KIE_WEBHOOK_HMAC_KEY` added as new env var.
- 24 new tests added across 2 test files covering all ACs, including signature validity/invalidity, idempotency, success path, and all error paths.
- All 1374 tests pass with zero regressions.
- **Code review fixes applied (2026-03-02):**
  - Added empty/missing `taskId` guard in route.ts (returns 400) — prevents empty-string DB queries and ambiguous HMAC computations.
  - Added replay attack protection in `verifyKieWebhook()` — timestamps older than 5 minutes (or non-numeric) are rejected, preventing webhook replay attacks.
  - Added SSRF protection in `downloadImage()` via `validateCdnUrl()` — rejects non-HTTPS URLs and URLs from untrusted hostnames (must be `*.cdn.kie.ai`).
  - Fixed `processKieCallback()` to return `status: 'error'` on internal processing failures (recordInfo, CDN download, storage upload, DB update) instead of always returning `'ok'` — enables proper error differentiation in the route handler log.
  - Fixed DB update failure after successful upload: now calls `markPreviewFailed()` to set `preview_status='failed'` instead of leaving the recommendation stuck in `'generating'` state permanently.
  - Updated `TIMESTAMP` in route test to use `Math.floor(Date.now() / 1000)` so tests are not broken by the new replay-attack timestamp freshness check.
  - 9 new tests added for: replay attack, stale timestamp, non-numeric timestamp, empty taskId (400), SSRF HTTP URL, SSRF untrusted domain, `status='error'` on recordInfo failure/CDN failure, and DB update failure marking `failed`.
  - All 1383 tests pass with zero regressions.

### File List

- src/app/api/webhook/kie/route.ts (NEW)
- src/lib/kie/webhooks.ts (NEW)
- src/test/kie-webhooks.test.ts (NEW)
- src/test/kie-webhook-route.test.ts (NEW)
- .env.example (MODIFIED — added KIE_API_KEY and KIE_WEBHOOK_HMAC_KEY)
- _bmad-output/implementation-artifacts/sprint-status.yaml (MODIFIED — status: review)
- _bmad-output/implementation-artifacts/7-2-kie-ai-webhook-handler.md (MODIFIED — story file)

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-02 | Implemented Kie.ai webhook handler: POST /api/webhook/kie with HMAC-SHA256 signature verification, recordInfo API call, CDN image download, Supabase Storage upload, recommendation DB update, idempotency, and comprehensive error handling. 24 new tests. | Dev Agent (claude-sonnet-4-6) |
| 2026-03-02 | Code review fixes: added empty taskId guard (400), replay attack protection (5-min timestamp window), SSRF protection (HTTPS + cdn.kie.ai hostname validation), corrected status='error' returns on failure paths, fixed stuck-in-generating bug after upload+DB-update failure. 9 new tests. 1383 total passing. | Code Review Agent (claude-sonnet-4-6) |
