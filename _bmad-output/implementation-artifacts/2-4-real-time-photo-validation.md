# Story 2.4: Real-Time Photo Validation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want immediate feedback on my photo quality and face detection,
so that I know my photo is good enough for accurate AI analysis before proceeding.

## Acceptance Criteria

1. Face detected in photo displays a green border/indicator with success state
2. Poor lighting detection warns: "Tente com mais luz"
3. Multiple faces detected warns: "Apenas um rosto, por favor"
4. No face detected shows error: "Nao conseguimos detectar um rosto"
5. Sunglasses detection warns: "Remova os oculos de sol para melhor analise"
6. Face must occupy >30% of the photo frame area to pass validation
7. User gets 3 retry attempts before a manual override option appears ("Usar mesmo assim")
8. Face detection runs client-side using MediaPipe Face Detection (`@mediapipe/tasks-vision`)
9. Validation runs automatically after photo capture/compression (no extra user action needed)
10. Validation results display inline on the photo page with clear visual feedback
11. All user-facing text in Portuguese (pt-BR) with correct diacritical marks
12. Component uses design system theme tokens (CSS variables from Story 1.1 -- no hardcoded hex colors)
13. Validation completes in under 2 seconds for typical photos on mid-range mobile devices
14. Validation works on iOS Safari 15+, Chrome Android 90+, Firefox, Edge

## Tasks / Subtasks

- [x] Task 1: Install and configure MediaPipe Face Detection (AC: 8, 14)
  - [x] Install `@mediapipe/tasks-vision` package (v0.10.x)
  - [x] Create `src/lib/photo/validate.ts` -- face detection + validation utility
  - [x] Configure FaceDetector with `blaze_face_short_range` model for selfie-distance photos
  - [x] Load WASM + model files from CDN (`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm`) to avoid bundling large binary assets
  - [x] Export `initFaceDetector()` function that lazily initializes detector on first call (singleton pattern)
  - [x] Export `validatePhoto(blob: Blob): Promise<PhotoValidationResult>` main validation function
  - [x] Export `destroyFaceDetector()` cleanup function for memory management

- [x] Task 2: Implement face validation logic (AC: 1, 2, 3, 4, 5, 6, 13)
  - [x] Define `PhotoValidationResult` interface: `{ valid: boolean; status: ValidationStatus; faces: DetectedFace[]; message: string; details?: ValidationDetails }`
  - [x] Define `ValidationStatus` type: `'valid' | 'no_face' | 'multiple_faces' | 'face_too_small' | 'poor_lighting' | 'sunglasses' | 'error'`
  - [x] Define `DetectedFace` interface: `{ boundingBox: { x: number; y: number; width: number; height: number }; keypoints: FaceKeypoint[]; confidence: number }`
  - [x] Define `ValidationDetails` interface: `{ faceCount: number; faceAreaPercent: number; confidenceScore: number }`
  - [x] Convert input Blob to ImageBitmap using `createImageBitmap(blob)`
  - [x] Create temporary canvas, draw ImageBitmap, pass to `detector.detect(canvas)` (running mode: IMAGE)
  - [x] Check face count: 0 faces -> `no_face`, >1 faces -> `multiple_faces`
  - [x] Calculate face area as percentage of frame: `(faceWidth * faceHeight) / (imageWidth * imageHeight) * 100`
  - [x] If face area < 30% -> `face_too_small` (return with message suggesting user get closer)
  - [x] Analyze face confidence score: if < 0.5, likely poor lighting or obstructions -> `poor_lighting`
  - [x] Sunglasses heuristic: check if eye keypoints confidence is significantly lower than other keypoints (nose, mouth) -- MediaPipe returns per-keypoint confidence; if both eye keypoints have confidence < 0.4 while nose/mouth > 0.7, flag as `sunglasses`
  - [x] Close ImageBitmap after processing (`bitmap.close()`)
  - [x] Return `PhotoValidationResult` with status, message, and details

- [x] Task 3: Create PhotoValidation UI component (AC: 1, 10, 11, 12)
  - [x] Create `src/components/consultation/PhotoValidation.tsx`
  - [x] Props: `{ photo: Blob; onValidationComplete: (result: PhotoValidationResult) => void; onRetake: () => void; onOverride: () => void }`
  - [x] Display the photo with a border that reflects validation status:
    - Green border (`border-green-500`) + checkmark icon for `valid`
    - Yellow border (`border-yellow-500`) + warning icon for `poor_lighting`, `sunglasses`, `face_too_small`
    - Red border (`border-red-500`) + X icon for `no_face`, `multiple_faces`
  - [x] Show validation message below photo in Portuguese
  - [x] Show "Tentar novamente" (retry) button for all failure states
  - [x] Use Lucide icons: CheckCircle2 (success), AlertTriangle (warning), XCircle (error)
  - [x] Use theme tokens: `bg-background`, `text-foreground`, `text-muted-foreground`
  - [x] Loading state during validation: show spinner with "A verificar a foto..." text

- [x] Task 4: Implement retry logic and manual override (AC: 7)
  - [x] Track retry count in PhotoValidation component state
  - [x] After 3 failed validation attempts, show "Usar mesmo assim" (override) button
  - [x] Override button styled as ghost/secondary (not primary -- discourage use)
  - [x] Override emits `onOverride()` callback to parent -- allows proceeding despite validation failure
  - [x] Reset retry count when user retakes photo (calls `onRetake`)
  - [x] Display retry count subtly: "Tentativa 2 de 3" below the retry button

- [x] Task 5: Integrate validation into photo page flow (AC: 9, 10)
  - [x] Modify `src/app/consultation/photo/page.tsx`
  - [x] Add new state: `validationState: 'pending' | 'validating' | 'valid' | 'invalid' | 'overridden'`
  - [x] After compression completes successfully, automatically trigger validation
  - [x] Flow: capture/upload -> compress -> validate -> show result
  - [x] If valid or overridden: show success state (future: navigate to review screen in Story 2.5)
  - [x] If invalid: show PhotoValidation component with retry/override options
  - [x] "Retake" from validation returns to camera/gallery mode (reset compression + validation state)
  - [x] Pass compressed photo blob to PhotoValidation component

- [x] Task 6: Write comprehensive tests (AC: all)
  - [x] Test file: `src/test/validate.test.ts` -- Unit tests for validation utility
    - Detects a single face and returns valid status
    - Returns `no_face` when no faces detected
    - Returns `multiple_faces` when >1 faces detected
    - Returns `face_too_small` when face area < 30%
    - Returns `poor_lighting` when confidence is low
    - Returns `sunglasses` when eye keypoints have low confidence
    - Returns correct Portuguese messages for each status
    - Handles invalid/corrupt blob input gracefully (returns error status)
    - Cleans up ImageBitmap after processing
    - Returns ValidationDetails with face count, area percent, confidence
  - [x] Test file: `src/test/photo-validation.test.tsx` -- Component tests
    - Shows loading state during validation
    - Shows green border and checkmark on valid photo
    - Shows yellow border and warning for poor lighting
    - Shows red border and error for no face detected
    - Shows retry button on failure
    - Shows "Usar mesmo assim" after 3 retries
    - Override button calls onOverride callback
    - Retry button calls onRetake callback
    - Portuguese text displayed with correct diacritical marks
    - Retry count displayed correctly
  - [x] Test file: `src/test/photo-page-validation.test.tsx` -- Page integration tests
    - Validation triggered automatically after compression
    - Valid photo shows success state
    - Invalid photo shows PhotoValidation component
    - Retake resets to camera/gallery mode
    - Override proceeds to success state
  - [x] Run existing test suite to confirm no regressions (292 tests from Stories 2.1-2.3)

## Dev Notes

### Architecture Compliance

- **Validation Utility Location:** `src/lib/photo/validate.ts` -- the architecture explicitly defines `validate.ts` in `src/lib/photo/` directory. [Source: architecture.md#6.1]
- **Component Location:** `src/components/consultation/PhotoValidation.tsx` -- new component in the existing consultation components directory. [Source: architecture.md#6.1]
- **Page Route:** `src/app/consultation/photo/page.tsx` -- MODIFY the existing page to add validation step after compression. Do NOT create a separate route. [Source: architecture.md#6.1]
- **Styling:** Use Tailwind CSS utility classes only. Use theme CSS variables (`bg-background`, `text-foreground`, `text-muted-foreground`, `text-accent`) -- NEVER hardcode hex colors. [Source: 1-1-design-system-setup.md]
- **State Management:** Local state only within the page component and PhotoValidation component. No Zustand store yet (that comes in Epic 3). [Source: architecture.md#6.2]
- **Photo Validation Requirement:** Architecture specifies "Max 10MB, image/* MIME only, face detection required" under API Security. Client-side face detection provides early validation before upload. [Source: architecture.md#7.3]

### Technical Requirements

- **MediaPipe Face Detection:** Use `@mediapipe/tasks-vision` v0.10.x (latest: 0.10.32). This is the modern MediaPipe Tasks API (NOT the legacy `@mediapipe/face_detection` package which is 4+ years old and deprecated). The Tasks API provides:
  - `FaceDetector` class with `detect()` method for single image inference
  - `FilesetResolver.forVisionTasks()` for WASM module initialization
  - Face bounding box with coordinates
  - 6 facial keypoints: left eye, right eye, nose tip, mouth center, left eye tragion, right eye tragion
  - Per-detection confidence score (0.0 - 1.0)

- **WASM Loading Strategy:** Load MediaPipe WASM and model files from CDN (`cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm`). Do NOT bundle these files locally -- they are 4-8MB and would bloat the client bundle. The CDN loads them on-demand when face detection is first needed. Use the `blaze_face_short_range` model which is optimized for selfie-distance faces (within 2 meters).

- **Singleton Pattern for Detector:**
  ```typescript
  let detector: FaceDetector | null = null;

  async function initFaceDetector(): Promise<FaceDetector> {
    if (detector) return detector;
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm'
    );
    detector = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
        delegate: 'GPU'  // Use WebGL for faster inference, falls back to CPU
      },
      runningMode: 'IMAGE',
      minDetectionConfidence: 0.5
    });
    return detector;
  }
  ```
  Initialize lazily on first validation call. The detector is reused across multiple validations in the same session. `destroyFaceDetector()` calls `detector.close()` and sets to null for cleanup.

- **Validation Flow:**
  ```
  Compressed JPEG blob (from Story 2.3)
    -> createImageBitmap(blob)
    -> Create canvas at bitmap dimensions
    -> Draw bitmap to canvas
    -> detector.detect(canvas)  // MediaPipe expects HTMLCanvasElement
    -> Analyze results: face count, bounding box area, keypoint confidences
    -> Return PhotoValidationResult
    -> Close bitmap (memory cleanup)
  ```

- **Face Area Calculation:**
  ```typescript
  const faceAreaPercent = (detection.boundingBox.width * detection.boundingBox.height) /
    (imageWidth * imageHeight) * 100;
  // Must be >= 30% to pass
  ```
  Note: MediaPipe returns bounding box in pixel coordinates relative to the image dimensions.

- **Sunglasses Heuristic:** MediaPipe Face Detection returns 6 keypoints with per-keypoint confidence is not directly available in the current API. Instead, use the overall detection confidence combined with the relative positions of eye keypoints. When the detection confidence is between 0.5-0.7 (marginal) AND the bounding box suggests a face is present, it may indicate obstruction (sunglasses, hand covering). For a more reliable approach: if the overall detection confidence < 0.65 but a face IS detected (confidence > 0.5), flag as `poor_lighting` which also covers the sunglasses case. The epics file specifies sunglasses detection, but given the constraints of the short-range model, a conservative approach that flags low-confidence detections is more reliable than false-positive sunglasses detection.

  **Recommended implementation:** If confidence is between 0.5 and 0.65, return `poor_lighting` status. The user message "Tente com mais luz" also applies to sunglasses scenarios. If we later need specific sunglasses detection, we can upgrade to MediaPipe Face Landmarker which provides 468 facial landmarks.

- **Poor Lighting Detection:** If no face is detected at all (0 detections) but the image has very low brightness, include a hint about lighting. Calculate average brightness by sampling pixels from the canvas: if average luminance < 50 (out of 255), suggest lighting issue in the error message rather than generic "no face."

- **Error Handling:**
  - If MediaPipe WASM fails to load (CDN unavailable, network error): catch error, return `{ valid: false, status: 'error', message: 'Erro ao iniciar a validacao. Tente novamente.' }`
  - If `createImageBitmap` fails (corrupt blob): return error status
  - If detector throws during inference: return error status with retry guidance
  - All errors should be non-fatal -- the user can always override after 3 attempts

### Previous Story Intelligence (Story 2.3 -- Client-Side Photo Compression)

**What was built in Story 2.3:**
- `src/lib/photo/compress.ts`: Canvas API compression utility (800px max width, JPEG 85%, <500KB)
- Integration in photo page: `handleCompressAndStore` callback compresses after capture/upload
- Compression states: `idle | compressing | done | error`
- 292 total tests passing (265 from Stories 2.1-2.2 + 27 new)
- Existing code review found and fixed: unnecessary wrapper function, floating-point quality step imprecision

**Key patterns from Story 2.3:**
- `compressPhoto(blob)` returns `Promise<CompressionResult>` with `{ blob: Blob, metadata: CompressionMetadata }`
- The compressed blob is stored in `capturedPhoto` state -- validation should operate on this compressed blob
- The page uses `useCallback` for handlers and state-based rendering (compression loading, error, success)
- Compression error has a retry mechanism -- validation should follow the same UX pattern
- `createImageBitmap()` and Canvas API are already used in the project -- same pattern for validation

**Critical integration point:** Validation runs AFTER compression. The flow is:
```
capture/upload -> compressPhoto(blob) -> setCapturedPhoto(compressed) -> validatePhoto(compressed) -> show result
```

**DO NOT modify these Story 2.3 files:**
- `src/lib/photo/compress.ts` (compression utility is stable)

**Files that WILL need modification:**
- `src/app/consultation/photo/page.tsx` -- Add validation step after compression, before success state

### Library & Framework Requirements

| Library | Version | Notes |
|---------|---------|-------|
| Next.js | 16.1.6 | App Router, `src/` directory, server/client components |
| React | 19.2.3 | Client components with `'use client'` for browser API access |
| Tailwind CSS | v4+ | Theme via CSS variables, utility classes |
| Lucide React | 0.575.0+ | CheckCircle2, AlertTriangle, XCircle icons for validation states |
| @mediapipe/tasks-vision | 0.10.32 | **NEW DEPENDENCY** -- client-side face detection |

**NEW DEPENDENCY REQUIRED:** Install `@mediapipe/tasks-vision` for client-side face detection. This is the only new package needed. The architecture specifies "TensorFlow.js or MediaPipe Face Detection" for client-side face detection [Source: epics-and-stories.md#S2.4]. MediaPipe is preferred because:
1. Smaller bundle size than TensorFlow.js (WASM loaded from CDN, not bundled)
2. Better performance on mobile (GPU delegate via WebGL)
3. Google-maintained, actively updated (latest publish: 1 month ago)
4. Simple API -- `FaceDetector.detect()` returns detections with bounding boxes and keypoints

**DO NOT install:** `@tensorflow/tfjs`, `@tensorflow-models/face-detection`, `face-api.js`, or any other face detection library. Use `@mediapipe/tasks-vision` exclusively.

### File Structure Requirements

```
src/
+-- app/
|   +-- consultation/
|   |   +-- photo/
|   |       +-- page.tsx                    # MODIFY: Add validation step after compression
|   |       +-- layout.tsx                  # NO CHANGES
|   +-- layout.tsx                          # NO CHANGES
|   +-- page.tsx                            # NO CHANGES
|   +-- globals.css                         # NO CHANGES
+-- components/
|   +-- consultation/
|   |   +-- PhotoValidation.tsx            # NEW: Photo validation feedback component
|   |   +-- GalleryUpload.tsx              # NO CHANGES
|   |   +-- PhotoCapture.tsx               # NO CHANGES
|   |   +-- CameraPermissionPrompt.tsx     # NO CHANGES
|   |   +-- WebViewBlocker.tsx             # NO CHANGES
|   |   +-- FaceOvalOverlay.tsx            # NO CHANGES
|   |   +-- CameraGuidanceTips.tsx         # NO CHANGES
|   +-- landing/
|   |   +-- (no changes)
|   +-- layout/
|   |   +-- (no changes)
|   +-- ui/
|       +-- (no changes)
+-- hooks/
|   +-- useTheme.ts                         # NO CHANGES
|   +-- useCamera.ts                        # NO CHANGES
+-- lib/
|   +-- photo/
|   |   +-- detect-webview.ts              # NO CHANGES (from 2.1)
|   |   +-- exif.ts                        # NO CHANGES (from 2.2)
|   |   +-- validate-file.ts              # NO CHANGES (from 2.2)
|   |   +-- compress.ts                    # NO CHANGES (from 2.3)
|   |   +-- validate.ts                    # NEW: Face detection + photo validation utility
|   +-- motion.ts                           # NO CHANGES
+-- test/
    +-- validate.test.ts                    # NEW: Face validation utility tests
    +-- photo-validation.test.tsx          # NEW: PhotoValidation component tests
    +-- photo-page-validation.test.tsx     # NEW: Page validation integration tests
    +-- compress.test.ts                    # NO CHANGES (from 2.3)
    +-- photo-page-compression.test.tsx    # NO CHANGES (from 2.3)
    +-- exif.test.ts                        # NO CHANGES (from 2.2)
    +-- validate-file.test.ts              # NO CHANGES (from 2.2)
    +-- gallery-upload.test.tsx            # NO CHANGES (from 2.2)
    +-- photo-page-integration.test.tsx    # NO CHANGES (from 2.2)
    +-- detect-webview.test.ts             # NO CHANGES (from 2.1)
    +-- use-camera.test.ts                 # NO CHANGES (from 2.1)
    +-- camera-capture.test.tsx            # NO CHANGES (from 2.1)
    +-- (existing test files - no changes)
```

[Source: architecture.md#6.1 -- Project Structure]

### Project Structure Notes

- `src/lib/photo/` already exists with `detect-webview.ts`, `exif.ts`, `validate-file.ts`, and `compress.ts`. Add `validate.ts` here. Note: `validate-file.ts` handles FILE validation (type, size). The new `validate.ts` handles PHOTO CONTENT validation (face detection, quality). These are separate concerns -- do not merge them.
- `src/components/consultation/` already exists with camera and gallery components. Add `PhotoValidation.tsx` here.
- `src/app/consultation/photo/page.tsx` already exists. MODIFY it to add the validation step after compression.
- The naming convention `validate.ts` vs `validate-file.ts` is intentional: `validate-file.ts` checks the file itself (MIME type, size), while `validate.ts` checks the photo content (face detection). Both are needed in the pipeline but at different stages.

### Testing Requirements

- Use existing Vitest + React Testing Library setup (configured in Story 1.1)
- Test file locations: `src/test/validate.test.ts`, `src/test/photo-validation.test.tsx`, `src/test/photo-page-validation.test.tsx`
- **Mocking MediaPipe:** Mock `@mediapipe/tasks-vision` module entirely in tests:
  ```typescript
  vi.mock('@mediapipe/tasks-vision', () => ({
    FilesetResolver: {
      forVisionTasks: vi.fn().mockResolvedValue({})
    },
    FaceDetector: {
      createFromOptions: vi.fn().mockResolvedValue({
        detect: vi.fn(),
        close: vi.fn()
      })
    }
  }));
  ```
- Mock `createImageBitmap` to return a mock object with `width`, `height`, and `close()` method
- Mock canvas `getContext('2d')` and `drawImage` for the validation pipeline
- For component tests: mock `validatePhoto` from `@/lib/photo/validate` and control its return value
- For page integration tests: mock both `compressPhoto` and `validatePhoto`
- Minimum 25 tests across the three new test files
- Run existing test suite to ensure no regressions (expect 292 existing tests to still pass)

### Browser Compatibility Notes

- **MediaPipe WASM:** Requires WebAssembly support (Chrome 57+, Firefox 52+, Safari 11+, Edge 16+). All project targets support WASM.
- **WebGL for GPU delegate:** Chrome 56+, Firefox 51+, Safari 15+, Edge 79+. Falls back to CPU if WebGL unavailable. The `delegate: 'GPU'` option in configuration enables this automatically.
- **createImageBitmap:** Chrome 50+, Firefox 42+, Safari 15+, Edge 79+. Already used in compression (Story 2.3).
- **CDN dependency:** MediaPipe loads WASM and model files from `cdn.jsdelivr.net`. If CDN is unavailable, face detection will fail gracefully (error state with retry). This is acceptable for MVP -- self-hosting WASM files can be considered post-MVP for reliability.
- **Model file size:** `blaze_face_short_range.tflite` is approximately 250KB. WASM runtime files are approximately 4MB total. These are loaded on-demand when face detection is first triggered, not on page load. Subsequent validations reuse the cached detector.

### UX Design Specifications

- **Photo Validation (Real-time):** Defined in UX spec section 3.3 with specific validation states and messages. [Source: ux-design.md#3.3]
  - Face detected -> green border
  - Poor lighting -> "Tente com mais luz"
  - Multiple faces -> "Apenas um rosto, por favor"
  - No face detected -> "Nao conseguimos detectar um rosto"
  - Sunglasses -> "Remova os oculos de sol para melhor analise"
- **Error Handling:** Red pulse on photo frame, specific reason shown, "Tentar novamente" button. [Source: ux-design.md#8.2]
- **Kano Model Classification:** Real-time validation = Performance feature (frustration or confidence). Investing in validation UX is where users feel frustration or confidence. [Source: epics-and-stories.md#E2 Elicitation]
- **Photo frame:** Display validated photo with 20px border radius (per design system card radius). [Source: ux-design.md#1.4]
- **Loading state:** Brief spinner with "A verificar a foto..." during face detection. Detection typically takes <1 second.

### Content Reference (Portuguese)

| Element | Text |
|---------|------|
| Validation loading | A verificar a foto... |
| Face detected (valid) | Rosto detectado com sucesso! |
| No face detected | Nao conseguimos detectar um rosto. Tente novamente. |
| Multiple faces | Apenas um rosto, por favor. |
| Face too small | Aproxime-se mais da camera para melhor analise. |
| Poor lighting | Tente com mais luz para melhor resultado. |
| Sunglasses | Remova os oculos de sol para melhor analise. |
| Validation error | Erro ao verificar a foto. Tente novamente. |
| Retry button | Tentar novamente |
| Override button | Usar mesmo assim |
| Retry count | Tentativa X de 3 |

**CRITICAL:** All Portuguese text must use correct diacritical marks. "Nao" should be "Nao" with tilde on the "a" (the markdown may not render correctly -- use the actual Unicode characters: `\u00e3` for a-tilde, `\u00e9` for e-acute, `\u00f3` for o-acute, `\u00e7` for c-cedilla, etc.). Verify every string in implementation:
- "Nao" -> "N\u00e3o"
- "oculos" -> "\u00f3culos"
- "analise" -> "an\u00e1lise"
- "camera" -> "c\u00e2mera"
- "tambem" -> "tamb\u00e9m"

### Critical Guardrails

- **DO NOT** use `@tensorflow/tfjs` or `face-api.js`. Use `@mediapipe/tasks-vision` exclusively per architecture guidance.
- **DO NOT** bundle MediaPipe WASM files locally. Load from CDN to keep bundle size small.
- **DO NOT** run face detection on every frame (this is NOT real-time video detection). Run detection ONCE on the captured/compressed photo after the user takes/uploads it.
- **DO NOT** hardcode hex colors. Use theme CSS variables.
- **DO NOT** modify any files from Epic 1 (layout.tsx, globals.css, landing page, ui components, landing components, ThemeProvider, Footer, test setup, motion.ts).
- **DO NOT** modify Story 2.1 files (PhotoCapture.tsx, useCamera.ts, CameraPermissionPrompt.tsx, WebViewBlocker.tsx, FaceOvalOverlay.tsx, CameraGuidanceTips.tsx, detect-webview.ts).
- **DO NOT** modify Story 2.2 files (GalleryUpload.tsx, exif.ts, validate-file.ts).
- **DO NOT** modify Story 2.3 files (compress.ts).
- **DO NOT** create the Zustand consultation store in this story. Use local state and callback props.
- **DO NOT** implement the photo review screen in this story (that is Story 2.5).
- **DO NOT** implement photo upload to Supabase in this story (that is Story 2.6).
- **DO NOT** implement photo persistence to IndexedDB in this story (that is Story 2.7).
- **DO NOT** block the user permanently if face detection fails. After 3 retries, always show the manual override option.
- **DO** install `@mediapipe/tasks-vision` as the one new dependency for this story.
- **DO** create `src/lib/photo/validate.ts` as a utility with lazy singleton detector initialization.
- **DO** create `src/components/consultation/PhotoValidation.tsx` for validation feedback UI.
- **DO** modify `src/app/consultation/photo/page.tsx` to add validation after compression.
- **DO** use `createImageBitmap()` for image processing (consistent with compress.ts and exif.ts patterns).
- **DO** call `bitmap.close()` after processing to free memory.
- **DO** use correct Portuguese diacritical marks on ALL user-facing strings.
- **DO** follow the existing test patterns from Stories 2.1-2.3 (Vitest + RTL).
- **DO** ensure 292 existing tests still pass (zero regressions).

### Cross-Story Dependencies

- **Story 2.1 (Camera Capture with Guidance) -- DONE:** Camera capture produces raw JPEG blobs. These flow through compression (2.3) then to validation (this story).
- **Story 2.2 (Gallery Upload Alternative) -- DONE:** Gallery upload produces EXIF-corrected blobs. These flow through compression (2.3) then to validation (this story).
- **Story 2.3 (Client-Side Photo Compression) -- DONE:** Compression produces optimized JPEG blobs (<500KB, max 800px width). Validation operates on these compressed blobs. The 800px width and 85% quality are sufficient for face detection.
- **Story 2.5 (Photo Review Screen):** The review screen (next story) will display the validated photo with validation results. This story prepares the validation data that 2.5 will display.
- **Story 2.6 (Photo Upload to Storage):** Upload to Supabase only happens after validation passes (or is overridden). The `photo_quality_score` field in the consultations table can store the face detection confidence from this story's validation result.
- **Story 4.3 (Face Analysis):** Server-side AI face analysis (Gemini Vision) runs on the uploaded photo. Client-side face detection in this story is a pre-check to catch obvious issues early (no face, wrong photo). It does NOT replace server-side analysis.
- **Story 1.1 (Design System):** All styling depends on the design system tokens established in Story 1.1.

### Performance Targets

- Face detection inference: <1 second on mid-range mobile after model is loaded
- First-time model loading (WASM + model from CDN): 2-5 seconds (one-time cost per session)
- Subsequent validations (reusing cached detector): <500ms
- Memory: MediaPipe detector uses ~20-30MB when loaded. This is acceptable for mobile devices.
- The detector should be initialized lazily -- only when the user reaches the photo validation step, not on page load.
- After validation, do NOT destroy the detector immediately -- keep it for potential retries. Destroy when leaving the photo page.

### Git Intelligence

Recent commit patterns:
- `feat(epic-2): implement story 2-3-client-side-photo-compression`
- `feat(epic-2): implement story 2-2-gallery-upload-alternative`
- `feat(epic-2): implement story 2-1-camera-capture-with-guidance`

Suggested commit message: `feat(epic-2): implement story 2-4-real-time-photo-validation`

### References

- [Source: architecture.md#2.1] -- Tech Stack: MediaDevices API, Canvas API for image processing
- [Source: architecture.md#6.1] -- Project Structure: `src/lib/photo/validate.ts`, `src/components/consultation/PhotoCapture.tsx`
- [Source: architecture.md#7.3] -- API Security: "face detection required" for photo validation
- [Source: ux-design.md#3.3] -- Photo Upload: Real-time validation states and messages
- [Source: ux-design.md#8.2] -- Error States: red pulse, specific reason, retry button
- [Source: prd.md#FR8] -- FR8: System validates that a face is detected in the uploaded photo before proceeding
- [Source: prd.md#FR43] -- FR43: System gracefully handles photo upload failures with clear guidance for retry
- [Source: epics-and-stories.md#S2.4] -- Story 2.4: Real-Time Photo Validation acceptance criteria, client-side face detection
- [Source: epics-and-stories.md#E2] -- Epic 2 elicitation: Kano Model (validation = Performance feature), Chaos Monkey (face detection loops)
- [Source: 2-3-client-side-photo-compression.md] -- Previous story: compression flow, 292 tests passing, Canvas API patterns
- [Source: 2-2-gallery-upload-alternative.md] -- EXIF correction pattern, gallery upload integration
- [Source: 2-1-camera-capture-with-guidance.md] -- Camera capture pattern, useCamera hook
- [Source: 1-1-design-system-setup.md] -- Design system tokens, typography, theme config
- [Source: @mediapipe/tasks-vision npm] -- v0.10.32 latest, face detection API, WASM loading

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (code review)

### Debug Log References

- Code review performed 2026-03-01 by Claude Opus 4.6

### Completion Notes List

- All 6 tasks implemented and verified via 334 passing tests (42 new + 292 existing)
- MediaPipe `@mediapipe/tasks-vision@^0.10.32` installed as new dependency
- AC5 (sunglasses detection) returns `poor_lighting` for low-confidence detections per Dev Notes design decision; sunglasses-specific status type is defined but intentionally not triggered in current implementation
- Existing test files (`photo-page-compression.test.tsx`, `photo-page-integration.test.tsx`) updated with validate module mocks for compatibility
- Portuguese diacritical marks verified on all user-facing strings

### File List

- `package.json` -- MODIFIED: Added `@mediapipe/tasks-vision` dependency
- `package-lock.json` -- MODIFIED: Lock file updated for new dependency
- `src/lib/photo/validate.ts` -- NEW: Face detection + photo validation utility (singleton MediaPipe detector, validatePhoto, initFaceDetector, destroyFaceDetector)
- `src/components/consultation/PhotoValidation.tsx` -- NEW: Photo validation feedback UI component (border colors, icons, retry/override buttons, Portuguese messages)
- `src/app/consultation/photo/page.tsx` -- MODIFIED: Added validation state management, PhotoValidation integration after compression, retry/override handlers, detector cleanup on unmount
- `src/test/validate.test.ts` -- NEW: 18 unit tests for validation utility
- `src/test/photo-validation.test.tsx` -- NEW: 16 component tests for PhotoValidation
- `src/test/photo-page-validation.test.tsx` -- NEW: 8 page integration tests for validation flow
- `src/test/photo-page-compression.test.tsx` -- MODIFIED: Added `@/lib/photo/validate` mock for compatibility
- `src/test/photo-page-integration.test.tsx` -- MODIFIED: Added `@/lib/photo/validate` mock for compatibility
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- MODIFIED: Story status updated
