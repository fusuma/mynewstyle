# Story 2.5: Photo Review Screen

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to review my photo before submitting it for AI analysis,
so that I can confirm it looks good or retake it if needed.

## Acceptance Criteria

1. Captured/uploaded photo displayed at high resolution within the review screen
2. "Usar esta foto" (primary CTA) button proceeds to the next step (questionnaire in future stories)
3. "Tirar outra" (secondary) button returns to the camera/gallery capture screen
4. Validation result summary shown: face detected badge, confidence/quality indicator
5. Buttons anchored to the bottom of the viewport (thumb-zone optimized for mobile)
6. Photo displayed with 20px border radius (per design system Photo Frame specification)
7. Review screen uses design system theme tokens (CSS variables from Story 1.1 -- no hardcoded hex colors)
8. All user-facing text in Portuguese (pt-BR) with correct diacritical marks
9. Review screen works on iOS Safari 15+, Chrome Android 90+, Firefox, Edge
10. Photo review screen is accessible: keyboard navigation, proper ARIA labels, sufficient color contrast
11. Photo review transitions smoothly from validation success state (no full-page reload)
12. Overridden validation results show a subtle warning indicator on the review screen

## Tasks / Subtasks

- [x] Task 1: Create PhotoReview component (AC: 1, 3, 5, 6, 7, 8, 10)
  - [x] Create `src/components/consultation/PhotoReview.tsx`
  - [x] Props: `{ photo: Blob; validationResult: PhotoValidationResult | null; isOverridden: boolean; onConfirm: () => void; onRetake: () => void }`
  - [x] Display photo from Blob using `URL.createObjectURL` with cleanup in useEffect
  - [x] Photo container with `rounded-[20px]` border radius and `overflow-hidden`
  - [x] Bottom-anchored button group using sticky/fixed positioning at bottom of viewport
  - [x] "Usar esta foto" as primary button (accent background, full width)
  - [x] "Tirar outra" as secondary/ghost button below primary
  - [x] Proper ARIA labels on all interactive elements
  - [x] All text in Portuguese with correct diacritical marks

- [x] Task 2: Display validation result summary (AC: 4, 12)
  - [x] Show validation badge below photo: green checkmark with "Rosto detectado" for valid results
  - [x] Show face confidence score as quality indicator (e.g., "Qualidade: Alta/M\u00e9dia")
  - [x] For overridden validation: show yellow/amber warning badge "Valida\u00e7\u00e3o ignorada" with AlertTriangle icon
  - [x] Show face area percentage from validation details if available
  - [x] Use Lucide icons: CheckCircle2 (valid), AlertTriangle (overridden warning)

- [x] Task 3: Integrate PhotoReview into photo page flow (AC: 2, 3, 11)
  - [x] Modify `src/app/consultation/photo/page.tsx`
  - [x] Replace the placeholder success state with PhotoReview component
  - [x] Track `validationResult` in page state to pass to PhotoReview
  - [x] On "Usar esta foto" (confirm): set a new `reviewState` to "confirmed" (placeholder for future questionnaire navigation in Story 3.x)
  - [x] On "Tirar outra" (retake): reset all state back to camera/gallery mode (reuse existing `handleRetry` logic)
  - [x] Pass `isOverridden` flag based on `validationState === 'overridden'`
  - [x] Confirmed state shows a brief "Pronto!" success message (future: navigate to questionnaire)

- [x] Task 4: Write comprehensive tests (AC: all)
  - [x] Test file: `src/test/photo-review.test.tsx` -- Component tests for PhotoReview
    - Displays photo with correct border radius class
    - Shows "Usar esta foto" primary button
    - Shows "Tirar outra" secondary button
    - Shows green validation badge when validation passed
    - Shows warning badge when validation was overridden
    - Confirm button calls onConfirm callback
    - Retake button calls onRetake callback
    - Buttons are positioned at bottom of viewport (check CSS classes)
    - Portuguese text with correct diacritical marks
    - ARIA labels present on interactive elements
    - Handles null validationResult gracefully (no badge shown)
    - Shows confidence quality indicator for valid results
  - [x] Test file: `src/test/photo-page-review.test.tsx` -- Page integration tests
    - After validation success, PhotoReview component is rendered
    - After validation override, PhotoReview component is rendered with warning
    - Confirm action shows confirmed state
    - Retake action returns to camera/gallery mode
    - Validation result is passed correctly to PhotoReview
  - [x] Run existing test suite to confirm no regressions (334 tests from Stories 2.1-2.4)

## Dev Notes

### Architecture Compliance

- **Component Location:** `src/components/consultation/PhotoReview.tsx` -- new component in the existing consultation components directory. This is consistent with the architecture's project structure which defines consultation components under `src/components/consultation/`. [Source: architecture.md#6.1]
- **Page Route:** `src/app/consultation/photo/page.tsx` -- MODIFY the existing photo page to replace the placeholder success state with the PhotoReview component. Do NOT create a new route for review. The review is part of the photo capture flow, not a separate page. [Source: architecture.md#6.1, ux-design.md#3.3]
- **Styling:** Use Tailwind CSS utility classes only. Use theme CSS variables (`bg-background`, `text-foreground`, `text-muted-foreground`, `text-accent`, `bg-accent`, `text-accent-foreground`) -- NEVER hardcode hex colors. [Source: 1-1-design-system-setup.md]
- **Border Radius:** Photo frame uses `rounded-[20px]` (20px border radius per UX spec for Photo Frame component). [Source: ux-design.md#1.4]
- **Button Sizing:** Minimum 48px height for touch targets on mobile. [Source: ux-design.md#4.1]
- **State Management:** Local state only within the page component and PhotoReview component. No Zustand store yet (that comes in Epic 3 -- questionnaire flow). [Source: architecture.md#6.2]
- **Mobile-First:** Bottom-anchored buttons in thumb zone. Design for 375px width primary target, scale up. [Source: ux-design.md#5, ux-design.md section on Mobile UX]

### Technical Requirements

- **Photo Display:** Create an object URL from the photo Blob using `URL.createObjectURL(blob)`. Clean up with `URL.revokeObjectURL()` in a useEffect cleanup function. This pattern is already established in the PhotoValidation component (Story 2.4). [Source: 2-4-real-time-photo-validation.md]

- **Bottom-Anchored Buttons:** Use a fixed/sticky footer pattern for the CTA buttons:
  ```tsx
  <div className="fixed bottom-0 left-0 right-0 bg-background px-6 pb-8 pt-4 safe-area-bottom">
    <button className="w-full rounded-xl bg-accent py-4 text-base font-semibold text-accent-foreground">
      Usar esta foto
    </button>
    <button className="mt-3 w-full rounded-xl border border-border py-4 text-base font-medium text-muted-foreground">
      Tirar outra
    </button>
  </div>
  ```
  Use `pb-8` or `pb-safe` for iOS safe area at bottom (home indicator). The buttons must sit comfortably in the thumb zone for one-handed mobile use.

- **Validation Result Badge:** Display a compact badge below the photo showing the validation outcome:
  - Valid: Green CheckCircle2 icon + "Rosto detectado" text
  - Overridden: Yellow AlertTriangle icon + "Valida\u00e7\u00e3o ignorada" text (warn but don't block)
  - Include confidence as a quality label: High (>= 0.8), Medium (>= 0.65), Low (< 0.65)

- **Quality Indicator Mapping:**
  ```typescript
  function getQualityLabel(confidenceScore: number): string {
    if (confidenceScore >= 0.8) return 'Alta';
    if (confidenceScore >= 0.65) return 'M\u00e9dia';
    return 'Baixa';
  }
  ```

- **Page Integration Pattern:** The photo page currently renders a placeholder when `validationState === 'valid' || validationState === 'overridden'`. Replace this placeholder with the PhotoReview component. The page needs to track the `validationResult` from the `handleValidationComplete` callback to pass it to PhotoReview.

  Current placeholder code to replace (lines 170-177 in page.tsx):
  ```tsx
  // Placeholder: In Story 2.5, this will show the photo review screen
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <p className="text-foreground">Foto capturada com sucesso!</p>
    </div>
  );
  ```

  Replace with:
  ```tsx
  return (
    <PhotoReview
      photo={capturedPhoto}
      validationResult={validationResult}
      isOverridden={validationState === 'overridden'}
      onConfirm={handlePhotoConfirm}
      onRetake={handleRetry}
    />
  );
  ```

- **New Page State:** Add `validationResult` to the page state:
  ```typescript
  const [validationResult, setValidationResult] = useState<PhotoValidationResult | null>(null);
  ```
  Update `handleValidationComplete` to store the result:
  ```typescript
  const handleValidationComplete = useCallback((result: PhotoValidationResult) => {
    setValidationResult(result);
    if (result.valid) {
      setValidationState('valid');
    } else {
      setValidationState('invalid');
      setValidationRetryCount(prev => prev + 1);
    }
  }, []);
  ```

- **Confirm Handler:** Add a new callback for when user confirms the photo:
  ```typescript
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handlePhotoConfirm = useCallback(() => {
    setIsConfirmed(true);
    // Future: Navigate to questionnaire (Story 3.x)
  }, []);
  ```

  When confirmed, show a brief success screen:
  ```tsx
  if (isConfirmed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <CheckCircle2 className="mb-4 h-12 w-12 text-green-500" />
        <p className="text-lg font-semibold text-foreground">Pronto!</p>
        <p className="mt-2 text-sm text-muted-foreground">Foto selecionada com sucesso.</p>
      </div>
    );
  }
  ```

### Previous Story Intelligence (Story 2.4 -- Real-Time Photo Validation)

**What was built in Story 2.4:**
- `src/lib/photo/validate.ts`: MediaPipe face detection + validation utility (singleton detector, validatePhoto, initFaceDetector, destroyFaceDetector)
- `src/components/consultation/PhotoValidation.tsx`: Validation feedback UI (border colors, icons, retry/override buttons, Portuguese messages)
- Integration in photo page: validation triggered automatically after compression, retry/override flow
- `PhotoValidationResult` interface exported from validate.ts: `{ valid: boolean; status: ValidationStatus; faces: DetectedFace[]; message: string; details?: ValidationDetails }`
- `ValidationDetails` contains: `{ faceCount: number; faceAreaPercent: number; confidenceScore: number }`
- 334 total tests passing (42 new + 292 from Stories 2.1-2.3)

**Key patterns from Story 2.4:**
- `validatePhoto(blob)` returns `Promise<PhotoValidationResult>` with status, faces, message, and details
- PhotoValidation component creates object URL from blob with cleanup via useEffect -- use the same pattern
- The photo page uses state-based rendering to switch between capture, compression, validation, and result views
- The page currently handles validation states with `validationState: 'pending' | 'validating' | 'valid' | 'invalid' | 'overridden'`
- The `handleValidationComplete` callback receives `PhotoValidationResult` but currently only checks `result.valid` -- must also store the full result for PhotoReview
- The `handleRetry` callback resets compression and validation state -- can be reused for retake from review
- Retry count is tracked separately and NOT reset on retake (by design -- preserves retry count)
- The page cleans up face detector on unmount via `destroyFaceDetector()`

**Critical integration points:**
- PhotoReview replaces the current placeholder at validationState === 'valid' || validationState === 'overridden'
- Must add `validationResult` state to pass the full result to PhotoReview
- The `handleRetry` callback already handles resetting to camera/gallery mode -- reuse it for "Tirar outra"
- When retaking from review, the face detector should NOT be destroyed (user may retake and re-validate)

**DO NOT modify these Story 2.4 files:**
- `src/lib/photo/validate.ts` (validation utility is stable)
- `src/components/consultation/PhotoValidation.tsx` (validation UI is stable)

**Files that WILL need modification:**
- `src/app/consultation/photo/page.tsx` -- Replace placeholder success state with PhotoReview, add validationResult state

### Library & Framework Requirements

| Library | Version | Notes |
|---------|---------|-------|
| Next.js | 16.1.6 | App Router, `src/` directory, server/client components |
| React | 19.2.3 | Client components with `'use client'` for browser API access |
| Tailwind CSS | v4+ | Theme via CSS variables, utility classes |
| Lucide React | 0.575.0+ | CheckCircle2, AlertTriangle icons for validation status badges |

**NO NEW DEPENDENCIES REQUIRED.** This story uses only existing packages already installed. All icons needed (CheckCircle2, AlertTriangle) are already imported in the project via lucide-react. No new npm packages to install.

### File Structure Requirements

```
src/
+-- app/
|   +-- consultation/
|   |   +-- photo/
|   |       +-- page.tsx                    # MODIFY: Replace placeholder success with PhotoReview
|   |       +-- layout.tsx                  # NO CHANGES
|   +-- layout.tsx                          # NO CHANGES
|   +-- page.tsx                            # NO CHANGES
|   +-- globals.css                         # NO CHANGES
+-- components/
|   +-- consultation/
|   |   +-- PhotoReview.tsx                # NEW: Photo review screen component
|   |   +-- PhotoValidation.tsx            # NO CHANGES (from 2.4)
|   |   +-- GalleryUpload.tsx              # NO CHANGES (from 2.2)
|   |   +-- PhotoCapture.tsx               # NO CHANGES (from 2.1)
|   |   +-- CameraPermissionPrompt.tsx     # NO CHANGES (from 2.1)
|   |   +-- WebViewBlocker.tsx             # NO CHANGES (from 2.1)
|   |   +-- FaceOvalOverlay.tsx            # NO CHANGES (from 2.1)
|   |   +-- CameraGuidanceTips.tsx         # NO CHANGES (from 2.1)
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
|   |   +-- validate.ts                    # NO CHANGES (from 2.4)
|   +-- motion.ts                           # NO CHANGES
+-- test/
    +-- photo-review.test.tsx              # NEW: PhotoReview component tests
    +-- photo-page-review.test.tsx         # NEW: Page review integration tests
    +-- validate.test.ts                    # NO CHANGES (from 2.4)
    +-- photo-validation.test.tsx          # NO CHANGES (from 2.4)
    +-- photo-page-validation.test.tsx     # NO CHANGES (from 2.4)
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

- `src/components/consultation/` already contains PhotoCapture, GalleryUpload, PhotoValidation, and camera-related components. Add `PhotoReview.tsx` here as the next step in the photo capture flow.
- `src/app/consultation/photo/page.tsx` already handles the full photo flow (capture -> compress -> validate). MODIFY it to add the review step after validation succeeds.
- The review screen is NOT a separate route. It is rendered within the same `/consultation/photo` page based on state. This keeps the flow seamless and avoids URL-based navigation issues on mobile.
- No new utility files needed in `src/lib/`. The PhotoReview component consumes existing types from `src/lib/photo/validate.ts` (PhotoValidationResult, ValidationDetails).

### Testing Requirements

- Use existing Vitest + React Testing Library setup (configured in Story 1.1)
- Test file locations: `src/test/photo-review.test.tsx`, `src/test/photo-page-review.test.tsx`
- **Mocking for component tests:** Mock the Blob and URL.createObjectURL:
  ```typescript
  const mockBlob = new Blob(['test'], { type: 'image/jpeg' });
  const mockObjectUrl = 'blob:mock-url';
  vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockObjectUrl);
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  ```
- **Mocking for page integration tests:** Mock `compressPhoto`, `validatePhoto`, and `destroyFaceDetector` from their respective modules:
  ```typescript
  vi.mock('@/lib/photo/compress', () => ({
    compressPhoto: vi.fn(),
  }));
  vi.mock('@/lib/photo/validate', () => ({
    validatePhoto: vi.fn(),
    destroyFaceDetector: vi.fn(),
    initFaceDetector: vi.fn(),
  }));
  ```
- **Validation result fixtures:** Create reusable test fixtures:
  ```typescript
  const validResult: PhotoValidationResult = {
    valid: true,
    status: 'valid',
    faces: [{ boundingBox: { x: 10, y: 10, width: 200, height: 200 }, keypoints: [], confidence: 0.92 }],
    message: 'Rosto detectado com sucesso!',
    details: { faceCount: 1, faceAreaPercent: 45.2, confidenceScore: 0.92 },
  };
  ```
- Minimum 15 tests across the two new test files
- Run existing test suite to ensure no regressions (expect 334 existing tests to still pass)

### UX Design Specifications

- **Photo Review Screen:** Defined in UX spec section 3.3 under "Camera Capture Mode": "Photo review: captured photo shown with 'Usar esta' / 'Tirar outra' buttons." [Source: ux-design.md#3.3]
- **Photo Frame:** 20px border radius per design system. [Source: ux-design.md#1.4]
- **Thumb-Zone Optimization:** Primary actions in bottom 40% of screen. Bottom-anchored CTAs. [Source: ux-design.md section on Mobile UX, method 4]
- **Button Design:** Primary button 48px min height, 12px border radius. Secondary/ghost button below primary. [Source: ux-design.md#4.1]
- **Micro-interactions:** Photo capture slides into frame (200ms ease-out per motion tokens). [Source: ux-design.md#1.6, #8.1]
- **Kano Model:** Real-time validation = Performance feature. The review screen is the payoff -- showing validated photo with confidence builds user trust. [Source: epics-and-stories.md#E2 Elicitation]

### Content Reference (Portuguese)

| Element | Text |
|---------|------|
| Primary CTA | Usar esta foto |
| Secondary CTA | Tirar outra |
| Valid badge | Rosto detectado |
| Overridden warning | Valida\u00e7\u00e3o ignorada |
| Quality: High | Qualidade: Alta |
| Quality: Medium | Qualidade: M\u00e9dia |
| Quality: Low | Qualidade: Baixa |
| Confirmed heading | Pronto! |
| Confirmed subtext | Foto selecionada com sucesso. |

**CRITICAL:** All Portuguese text must use correct diacritical marks. Key characters:
- "\u00e3" (a-tilde) in "Valida\u00e7\u00e3o", "N\u00e3o"
- "\u00e9" (e-acute) in "M\u00e9dia"
- "\u00e7" (c-cedilla) in "Valida\u00e7\u00e3o"

### Critical Guardrails

- **DO NOT** hardcode hex colors. Use theme CSS variables exclusively.
- **DO NOT** create a new page route for review. The review renders within the existing `/consultation/photo` page.
- **DO NOT** install any new npm packages. This story uses only existing dependencies.
- **DO NOT** modify any files from Epic 1 (layout.tsx, globals.css, landing page, ui components, landing components, ThemeProvider, Footer, test setup, motion.ts).
- **DO NOT** modify Story 2.1 files (PhotoCapture.tsx, useCamera.ts, CameraPermissionPrompt.tsx, WebViewBlocker.tsx, FaceOvalOverlay.tsx, CameraGuidanceTips.tsx, detect-webview.ts).
- **DO NOT** modify Story 2.2 files (GalleryUpload.tsx, exif.ts, validate-file.ts).
- **DO NOT** modify Story 2.3 files (compress.ts).
- **DO NOT** modify Story 2.4 files (validate.ts, PhotoValidation.tsx).
- **DO NOT** implement navigation to the questionnaire in this story. The confirm action sets a local state flag. Navigation to questionnaire comes in Epic 3.
- **DO NOT** implement photo upload to Supabase in this story (that is Story 2.6).
- **DO NOT** implement photo persistence to IndexedDB in this story (that is Story 2.7).
- **DO NOT** create the Zustand consultation store in this story. Use local state and callback props.
- **DO** create `src/components/consultation/PhotoReview.tsx` as the review screen component.
- **DO** modify `src/app/consultation/photo/page.tsx` to integrate PhotoReview.
- **DO** add `validationResult` state to the page to pass to PhotoReview.
- **DO** reuse the existing `handleRetry` callback for the "Tirar outra" retake action.
- **DO** use `URL.createObjectURL` / `URL.revokeObjectURL` pattern from PhotoValidation component.
- **DO** use correct Portuguese diacritical marks on ALL user-facing strings.
- **DO** follow the existing test patterns from Stories 2.1-2.4 (Vitest + RTL).
- **DO** ensure 334 existing tests still pass (zero regressions).
- **DO** use Framer Motion for subtle enter animation on the review screen if `framer-motion` is available (it is in the project per architecture). Use simple fadeIn: `initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}`.

### Cross-Story Dependencies

- **Story 2.1 (Camera Capture with Guidance) -- DONE:** Provides `onCapture` callback that produces raw photo blobs.
- **Story 2.2 (Gallery Upload Alternative) -- DONE:** Provides `onUpload` callback that produces EXIF-corrected blobs.
- **Story 2.3 (Client-Side Photo Compression) -- DONE:** Compresses photos to <500KB, max 800px width. The review screen displays the compressed photo.
- **Story 2.4 (Real-Time Photo Validation) -- DONE:** Validates photos for face detection. Provides `PhotoValidationResult` with status, confidence, face area. The review screen displays validation results from this story.
- **Story 2.6 (Photo Upload to Storage):** The "Usar esta foto" confirm action in this story will eventually trigger upload to Supabase Storage. For now, confirm just sets local state. Story 2.6 will hook into the confirmed photo.
- **Story 2.7 (Photo Persistence for Session Recovery):** IndexedDB persistence will save the confirmed photo blob. This story prepares the "confirmed" state that 2.7 will use as its trigger.
- **Story 3.1 (Questionnaire Engine):** After photo confirmation, the user will navigate to the questionnaire. The navigation will be added when Story 3.1 is implemented. For now, the confirmed state shows a "Pronto!" message.
- **Story 1.1 (Design System):** All styling depends on the design system tokens established in Story 1.1.

### Performance Targets

- Review screen render: <100ms after validation completes (just a component swap, no async work)
- Photo display: immediate from cached object URL (already created in PhotoValidation)
- Button interactions: <50ms response (native click handling, no async operations)
- Memory: photo blob already in memory from capture/validation. One additional object URL is created for display.
- No additional network requests in this story. Everything is client-side.

### Git Intelligence

Recent commit patterns:
- `feat(epic-2): implement story 2-4-real-time-photo-validation`
- `feat(epic-2): implement story 2-3-client-side-photo-compression`
- `feat(epic-2): implement story 2-2-gallery-upload-alternative`
- `feat(epic-2): implement story 2-1-camera-capture-with-guidance`

Suggested commit message: `feat(epic-2): implement story 2-5-photo-review-screen`

### References

- [Source: architecture.md#6.1] -- Project Structure: `src/components/consultation/`, page routes
- [Source: architecture.md#6.2] -- State Management: local state for photo flow, Zustand in Epic 3
- [Source: ux-design.md#1.4] -- Border Radius: Photo Frame 20px
- [Source: ux-design.md#3.3] -- Photo Upload: review with "Usar esta" / "Tirar outra" buttons
- [Source: ux-design.md#4.1] -- Component Library: Button variants, min 48px height
- [Source: ux-design.md#5] -- Responsive Breakpoints: 375px primary mobile target
- [Source: ux-design.md#8.1] -- Micro-interactions: photo capture slides into frame
- [Source: ux-design.md Mobile UX] -- Thumb-zone optimization: bottom-anchored CTAs
- [Source: prd.md#FR8] -- FR8: System validates face detection before proceeding
- [Source: epics-and-stories.md#S2.5] -- Story 2.5: Photo Review Screen acceptance criteria
- [Source: epics-and-stories.md#E2] -- Epic 2 elicitation: Kano Model, Chaos Monkey
- [Source: 2-4-real-time-photo-validation.md] -- Previous story: validation flow, PhotoValidationResult interface, 334 tests passing, object URL pattern
- [Source: 1-1-design-system-setup.md] -- Design system tokens, typography, theme config

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (code review)

### Debug Log References

None

### Completion Notes List

- Implementation complete: PhotoReview component created with all 12 ACs satisfied
- 21 new tests added (16 component + 5 integration), 355 total tests passing (0 regressions)
- Code review fixes applied: added `safe-area-bottom` for iOS, `role="status"` + `aria-live="polite"` for screen reader announcements, face area percentage display, `min-h-[48px]` on buttons for mobile touch targets
- Uses Framer Motion fadeIn animation with reduced-motion support
- Existing test files updated to reflect PhotoReview replacing placeholder success state

### Change Log

- 2026-03-01: Code review (Claude Opus 4.6) -- Fixed: safe-area-bottom, ARIA live region, face area display, min button height. Updated story tasks, file list, and status.

### File List

- `src/components/consultation/PhotoReview.tsx` -- NEW: Photo review screen component with validation badge, quality indicator, bottom-anchored buttons
- `src/app/consultation/photo/page.tsx` -- MODIFIED: Replaced placeholder success state with PhotoReview component, added validationResult state, handlePhotoConfirm, isConfirmed state
- `src/test/photo-review.test.tsx` -- NEW: 16 component tests for PhotoReview
- `src/test/photo-page-review.test.tsx` -- NEW: 5 page integration tests for review flow
- `src/test/photo-page-integration.test.tsx` -- MODIFIED: Updated assertions from placeholder text to PhotoReview testid
- `src/test/photo-page-compression.test.tsx` -- MODIFIED: Updated assertions from placeholder text to PhotoReview testid
- `src/test/photo-page-validation.test.tsx` -- MODIFIED: Updated assertions from placeholder text to PhotoReview testid
