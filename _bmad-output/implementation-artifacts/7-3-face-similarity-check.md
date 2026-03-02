# Story 7.3: Face Similarity Check (Quality Gate)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want to verify that the AI-generated preview looks like the original user before displaying it,
so that users never see a preview showing a different person, preserving trust and product quality.

## Acceptance Criteria

1. Compare face embedding of the original photo vs the AI-generated preview image
2. If face similarity score < 0.7, set `recommendation.preview_status = 'unavailable'` with reason `'quality_gate'`
3. User sees: "Visualizacao indisponivel para este estilo" when a preview fails the quality gate
4. Never show a preview that looks like a different person
5. Log all quality gate triggers (pass/fail, similarity score, recommendation_id, consultation_id) for model quality monitoring

## Tasks / Subtasks

- [ ] Task 1: Install and configure face comparison library (AC: #1)
  - [ ] 1.1 Add `@vladmandic/face-api` and `@tensorflow/tfjs-node` as dependencies
  - [ ] 1.2 Download and store required face-api model weights (ssd_mobilenetv1 for face detection + face_recognition_model for 128-d descriptor)
  - [ ] 1.3 Create model loader utility at `src/lib/ai/face-similarity/model-loader.ts` that lazily loads models once per serverless cold start and caches them in module scope
  - [ ] 1.4 Verify models load correctly in a Node.js serverless environment (Next.js API route context)

- [ ] Task 2: Implement face embedding extraction (AC: #1)
  - [ ] 2.1 Create `src/lib/ai/face-similarity/extract-descriptor.ts`
  - [ ] 2.2 Implement `extractFaceDescriptor(imageBuffer: Buffer): Promise<Float32Array | null>` function
  - [ ] 2.3 Handle edge cases: no face detected (return null), multiple faces (use largest bounding box), image decode failures
  - [ ] 2.4 Add timeout guard (10 second max per image) to prevent serverless function hangs

- [ ] Task 3: Implement face similarity comparison (AC: #1, #2)
  - [ ] 3.1 Create `src/lib/ai/face-similarity/compare.ts`
  - [ ] 3.2 Implement `compareFaces(originalPhoto: Buffer, previewImage: Buffer): Promise<FaceSimilarityResult>` function
  - [ ] 3.3 Compute Euclidean distance between 128-d face descriptors, then convert to 0-1 similarity score (1 - clampedDistance)
  - [ ] 3.4 Define `FaceSimilarityResult` type: `{ similarity: number; passed: boolean; reason?: string }`
  - [ ] 3.5 Apply threshold: similarity >= 0.7 = pass, < 0.7 = fail with reason `'quality_gate'`
  - [ ] 3.6 Handle null descriptors (face not detected in either image): return `{ similarity: 0, passed: false, reason: 'face_not_detected' }`

- [ ] Task 4: Integrate into webhook handler (AC: #2, #4)
  - [ ] 4.1 Import `compareFaces` in `src/app/api/webhook/kie/route.ts` (will be created by story 7-2)
  - [ ] 4.2 After downloading the generated preview image from Kie.ai CDN, run face similarity check BEFORE uploading to Supabase Storage
  - [ ] 4.3 If similarity check passes: proceed with upload and set `preview_status = 'ready'`
  - [ ] 4.4 If similarity check fails: skip upload, set `preview_status = 'unavailable'` and `preview_generation_params.quality_gate_reason = 'face_similarity_below_threshold'`
  - [ ] 4.5 Also integrate into the Gemini Pro fallback path (story 7-6 will use same check)

- [ ] Task 5: Implement quality gate logging (AC: #5)
  - [ ] 5.1 Create structured log entries for every quality gate evaluation
  - [ ] 5.2 Log fields: `consultation_id`, `recommendation_id`, `similarity_score`, `threshold`, `passed`, `provider` (kie/gemini), `latency_ms`, `timestamp`
  - [ ] 5.3 Use the existing `console.error('[Quality Gate]', JSON.stringify(...))` pattern from `src/lib/ai/validation.ts`
  - [ ] 5.4 Persist quality gate results to the `ai_calls` table with task type `'face-similarity'` using the existing `persistAICallLog` function pattern

- [ ] Task 6: Export public API and barrel file (AC: #1, #2)
  - [ ] 6.1 Create `src/lib/ai/face-similarity/index.ts` barrel exporting `compareFaces` and `FaceSimilarityResult`
  - [ ] 6.2 Re-export from `src/lib/ai/index.ts` so consumers import from `@/lib/ai`
  - [ ] 6.3 Add `'face-similarity'` to the `AICallLog.task` union type in `src/types/index.ts`

- [ ] Task 7: Write unit and integration tests (AC: #1, #2, #3, #4, #5)
  - [ ] 7.1 Unit test `extractFaceDescriptor` with mock images (face present, no face, multiple faces)
  - [ ] 7.2 Unit test `compareFaces` with known-same and known-different face pairs
  - [ ] 7.3 Unit test threshold logic: score 0.71 = pass, 0.69 = fail, 0.0 = fail (no face)
  - [ ] 7.4 Integration test: webhook handler correctly gates preview display based on similarity result
  - [ ] 7.5 Test timeout handling: ensure extraction doesn't hang beyond 10 seconds

## Dev Notes

### Architecture Context

This story implements the **face similarity check** described in Architecture Section 4.4 (Output Validation). The architecture document explicitly states:

```typescript
const similarityScore = await compareFaceEmbeddings(originalPhoto, previewImage);
if (similarityScore < 0.7) {
  return { status: 'unavailable', reason: 'quality_gate' };
}
```

This is one of the "Top 10 Architecture Insights from Elicitation" (#6): "Face similarity check prevents 'wrong person' previews."

### Technology Choice: @vladmandic/face-api

**Why this library:**
- Active fork of face-api.js with maintained TensorFlow.js compatibility
- Provides 128-dimensional face descriptors via a ResNet-34-like architecture
- Works in Node.js (server-side) via `@tensorflow/tfjs-node` -- critical for serverless API route execution
- Euclidean distance comparison with well-established 0.6 threshold for face recognition (we use 0.7 for a more conservative quality gate)
- No external API calls needed -- runs locally, preserving user privacy (LGPD compliance: photos never leave our infrastructure for face comparison)
- Lightweight enough for Vercel serverless functions

**Alternative considered and rejected:**
- External face comparison APIs (Eden AI, AWS Rekognition): Adds latency, cost, and sends user photos to third parties (LGPD privacy concern)
- Gemini Vision API comparison: Not designed for face embedding -- text embedding models don't produce face descriptors
- Client-side comparison: Preview image arrives via webhook on server side, not available on client during comparison

### Model Weight Management

Face-api requires pre-trained model weights (`.bin` files). These must be:
- Stored in `public/models/face-api/` directory (accessible to serverless functions)
- Required models: `ssd_mobilenetv1_model-weights_manifest.json` + shards, `face_recognition_model-weights_manifest.json` + shards
- Total size: approximately 6-7MB
- Loaded once per serverless cold start, cached in module scope for subsequent invocations

### Similarity Score Calculation

```
Euclidean distance = sqrt(sum((descriptor1[i] - descriptor2[i])^2))
Similarity = max(0, 1 - (distance / NORMALIZATION_FACTOR))
```

The face-api library's 128-d descriptors typically produce Euclidean distances between:
- 0.0 - 0.4: Same person (high confidence)
- 0.4 - 0.6: Possibly same person
- 0.6+: Different people

Our threshold of 0.7 similarity (approximately 0.3 Euclidean distance) is intentionally conservative -- we would rather show "unavailable" than risk showing a wrong-person preview.

### Integration Point with Stories 7-1, 7-2, and 7-6

This story creates a **standalone face similarity module** that will be called by:
- **Story 7-2** (Kie.ai Webhook Handler): After receiving the generated preview, before uploading to storage
- **Story 7-6** (Gemini Pro Fallback): Same check applied to fallback-generated previews

The module is designed to be imported and called as a pure function -- it does NOT depend on Kie.ai or any specific preview provider. It takes two `Buffer` arguments (original photo, generated preview) and returns a result.

**If stories 7-1 and 7-2 are not yet implemented:** The face similarity module can still be fully built and tested in isolation. The webhook integration (Task 4) can be implemented as a helper function that story 7-2 will import.

### Database Schema Impact

This story does NOT require new database tables or columns. It uses:
- `recommendations.preview_status`: existing enum (`'none' | 'generating' | 'ready' | 'failed' | 'unavailable'`)
- `recommendations.preview_generation_params`: existing jsonb column for storing quality gate metadata
- `ai_calls` table: existing table for logging (adds `'face-similarity'` as a new task type value)

### Performance Considerations

- Face descriptor extraction: ~500ms-1500ms per image on serverless (cold start adds ~2-3s for model loading)
- Total face similarity check: ~1-3s (two extractions + distance calculation)
- This runs INSIDE the webhook handler, adding to preview generation latency but NOT to user-perceived latency (user is already polling for preview status)
- Model caching in module scope means cold start penalty only on first invocation per serverless instance

### Security and Privacy (LGPD)

- Face comparison runs entirely server-side within our infrastructure
- No user photos are sent to external face comparison services
- Face descriptors (128-d vectors) are NOT stored -- computed on-the-fly and discarded
- This aligns with LGPD data minimization: we use the biometric data (face geometry) only for the specific purpose of quality validation, then discard it immediately

### Existing Code Patterns to Follow

- **Validation pattern**: Follow `src/lib/ai/validation.ts` for structured validation results and logging
- **Logger pattern**: Follow `src/lib/ai/logger.ts` for AI call logging with `logAICall()` and `persistAICallLog()`
- **Provider pattern**: Follow `src/lib/ai/provider.ts` for error handling and type definitions
- **Schema pattern**: Follow `src/lib/ai/schemas/` for Zod schema definitions
- **Test pattern**: Follow existing vitest test patterns in the project

### Project Structure Notes

New files to create:
```
src/lib/ai/face-similarity/
  ├── model-loader.ts        # Lazy model loading + caching
  ├── extract-descriptor.ts  # Face descriptor extraction from Buffer
  ├── compare.ts             # Face similarity comparison logic
  └── index.ts               # Barrel export
```

Model weights location:
```
public/models/face-api/
  ├── ssd_mobilenetv1_model-weights_manifest.json
  ├── ssd_mobilenetv1_model-shard1  (etc.)
  ├── face_recognition_model-weights_manifest.json
  └── face_recognition_model-shard1  (etc.)
```

This structure follows the existing `src/lib/ai/` organization pattern (e.g., `src/lib/ai/schemas/`, `src/lib/ai/prompts/`).

### Dependencies to Add

```json
{
  "@vladmandic/face-api": "^1.7.14",
  "@tensorflow/tfjs-node": "^4.22.0"
}
```

**IMPORTANT:** `@tensorflow/tfjs-node` requires native bindings. On Vercel serverless, ensure the build includes the native `.node` files. If Vercel deployment issues arise with native deps, consider using `@tensorflow/tfjs` (pure JS, slower but portable) as fallback.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Section 4.4 Output Validation] - Face similarity check pattern and 0.7 threshold
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 13] - Top 10 Architecture Insight #6: "Face similarity check prevents wrong person previews"
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 14] - Kie.ai webhook handler integration showing where compareFaces is called
- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#E7 S7.3] - Story requirements and acceptance criteria
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 3.7] - Quality gate UX: "Visualizacao indisponivel para este estilo" message
- [Source: _bmad-output/planning-artifacts/prd.md#FR20-FR23] - AI visual preview functional requirements
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 9.3] - Alerts: ">20% unavailable in 1 day" triggers investigation
- [Source: src/lib/ai/validation.ts] - Existing validation pattern to follow
- [Source: src/lib/ai/logger.ts] - Existing AI call logging pattern to follow
- [Source: src/lib/ai/provider.ts] - Existing AIProvider interface and error handling patterns
- [Source: src/types/index.ts] - Type definitions including AICallLog

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
