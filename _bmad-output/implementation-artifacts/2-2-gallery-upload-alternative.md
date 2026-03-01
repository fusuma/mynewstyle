# Story 2.2: Gallery Upload Alternative

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to upload a photo from my gallery if I can't use the camera,
so that I can still receive AI face shape analysis and hairstyle recommendations even when camera capture is not available or preferred.

## Acceptance Criteria

1. File picker accessible via button accepting JPG, PNG, and HEIC formats
2. Drag-and-drop zone on desktop for photo upload
3. Maximum file size validation: 10MB pre-compression with user-friendly error message
4. Consent checkbox: "Confirmo que esta foto e minha" (required before upload can proceed from gallery)
5. EXIF orientation correction applied to uploaded photos so they display correctly regardless of device orientation metadata
6. Gallery upload integrates with the existing photo capture page (`/consultation/photo`) as an alternative to camera capture
7. Component uses design system theme tokens (CSS variables from Story 1.1 -- no hardcoded hex colors)
8. Portuguese (pt-BR) for all user-facing text with correct diacritical marks (accents, cedilla, tilde)
9. Accessible: all interactive elements have proper aria-labels, focus states, and keyboard navigation support
10. Respects `prefers-reduced-motion` for any animations or transitions
11. Responsive: works correctly on mobile (375px) through desktop (1440px)
12. Graceful error handling: unsupported file type, file too large, file read failure show user-friendly messages
13. Gallery upload button/link accessible from the CameraPermissionPrompt ("Prefiro enviar uma foto da galeria")
14. Uploaded photo passed to parent via `onUpload(blob)` callback matching the same pattern as `onCapture(blob)` from PhotoCapture

## Tasks / Subtasks

- [x] Task 1: Create EXIF orientation utility (AC: 5)
  - [x] Create `src/lib/photo/exif.ts`
  - [x] Implement `correctExifOrientation(file: File): Promise<Blob>` that reads EXIF orientation tag and rotates/flips image using Canvas API
  - [x] Handle all 8 EXIF orientation values (1-8)
  - [x] Return original blob unchanged if no EXIF data or orientation is normal (value 1)
  - [x] Handle HEIC files by converting to JPEG after orientation correction
  - [x] Unit tests in `src/test/exif.test.ts`

- [x] Task 2: Create file validation utility (AC: 1, 3, 12)
  - [x] Create `src/lib/photo/validate-file.ts`
  - [x] Implement `validatePhotoFile(file: File): { valid: boolean; error?: string }` that checks:
    - File type: `image/jpeg`, `image/png`, `image/heic`, `image/heif` (also accept by extension for browsers that don't report HEIC MIME type)
    - File size: maximum 10MB (10 * 1024 * 1024 bytes)
  - [x] Return Portuguese error messages with correct diacritics:
    - Wrong type: "Formato nao suportado. Use JPG, PNG ou HEIC."
    - Too large: "Ficheiro demasiado grande. O tamanho maximo e 10MB."
  - [x] Unit tests in `src/test/validate-file.test.ts`

- [x] Task 3: Create GalleryUpload component (AC: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14)
  - [x] Create `src/components/consultation/GalleryUpload.tsx` as a client component (`'use client'`)
  - [x] Component props: `onUpload: (blob: Blob) => void`, `onSwitchToCamera?: () => void`
  - [x] Hidden `<input type="file" accept="image/jpeg,image/png,image/heic,image/heif,.jpg,.jpeg,.png,.heic,.heif" />` triggered by a styled button
  - [x] Drag-and-drop zone visible on desktop (show on all screen sizes but optimized for desktop with larger drop area):
    - Dashed border zone with Upload icon (Lucide)
    - Text: "Arraste a sua foto aqui ou clique para selecionar"
    - Visual feedback on drag-over: border color changes to accent, background changes
  - [x] On file select/drop:
    1. Validate file using `validatePhotoFile()`
    2. If invalid: show error message below drop zone
    3. If valid: correct EXIF orientation using `correctExifOrientation()`
    4. Check consent checkbox is checked; if not, show prompt
    5. Call `onUpload(correctedBlob)`
  - [x] Consent checkbox: "Confirmo que esta foto e minha e consinto no seu processamento"
    - Must be checked before upload proceeds
    - If user selects file without checking, show inline message: "Por favor, confirme que a foto e sua antes de continuar"
    - Checkbox uses design system styling
  - [x] Upload button: "Escolher foto da galeria" with Upload icon (Lucide)
  - [x] "Prefiro usar a camera" link to switch back to camera mode (`onSwitchToCamera` callback)
  - [x] File size display after selection (e.g., "foto-perfil.jpg (2.3 MB)")
  - [x] Error states styled with destructive color tokens
  - [x] Loading state while EXIF correction is processing
  - [x] Use design system tokens: `bg-background`, `text-foreground`, `text-muted-foreground`, `text-accent`, `border-border`, `bg-muted`
  - [x] Responsive: centered layout, max-width constraint, drag-drop zone resizes appropriately

- [x] Task 4: Integrate gallery upload with PhotoCapture page (AC: 6, 13)
  - [x] Modify `src/app/consultation/photo/page.tsx` to support both camera and gallery modes
  - [x] Add mode state: `'camera' | 'gallery'` (default: 'camera')
  - [x] The existing "Prefiro enviar uma foto da galeria" link in CameraPermissionPrompt switches to gallery mode
  - [x] Update PhotoCapture to accept `onSwitchToGallery` callback prop and pass it through to CameraPermissionPrompt as `onUploadFromGallery`
  - [x] When in gallery mode, render GalleryUpload component instead of PhotoCapture
  - [x] GalleryUpload's "Prefiro usar a camera" link switches back to camera mode
  - [x] Both modes call the same `handlePhotoReady(blob)` parent handler
  - [x] The page route continues to work at `/consultation/photo`

- [x] Task 5: Write comprehensive tests (AC: all)
  - [x] Test file: `src/test/exif.test.ts`
    - Corrects orientation for rotated JPEG
    - Returns unchanged blob for normal orientation
    - Handles files without EXIF data
    - Handles non-JPEG files gracefully
  - [x] Test file: `src/test/validate-file.test.ts`
    - Accepts valid JPEG file
    - Accepts valid PNG file
    - Accepts valid HEIC file (by extension)
    - Rejects unsupported file types (e.g., GIF, BMP, PDF)
    - Rejects files over 10MB
    - Accepts files exactly at 10MB
    - Returns correct Portuguese error messages
  - [x] Test file: `src/test/gallery-upload.test.tsx`
    - Renders upload button with correct text
    - Renders drag-and-drop zone
    - Renders consent checkbox
    - Shows file picker when button clicked
    - Shows error for unsupported file type
    - Shows error for file too large
    - Prevents upload when consent checkbox unchecked
    - Shows consent reminder when file selected without checkbox
    - Calls onUpload with corrected blob when valid file selected and consent given
    - Shows loading state during EXIF processing
    - Drag-over visual feedback (border/background change)
    - Shows "Prefiro usar a camera" link
    - Calls onSwitchToCamera when link clicked
    - Accessible: all elements have aria-labels
    - Keyboard navigation: tab through elements, Enter/Space activate
  - [x] Test file: `src/test/photo-page-integration.test.tsx`
    - Page renders in camera mode by default
    - Switches to gallery mode when "Prefiro enviar uma foto da galeria" clicked
    - Switches back to camera mode from gallery
    - Both modes call same photo handler
  - [x] Run existing test suite to confirm no regressions (265 tests passing: 197 existing + 68 new)

## Dev Notes

### Architecture Compliance

- **Component Location:** `src/components/consultation/GalleryUpload.tsx` -- in the existing `consultation/` directory created in Story 2.1. [Source: architecture.md#6.1]
- **Utility Location:** `src/lib/photo/exif.ts` and `src/lib/photo/validate-file.ts` -- in the existing `photo/` directory created in Story 2.1. Architecture defines `exif.ts` here explicitly. [Source: architecture.md#6.1]
- **Page Route:** `src/app/consultation/photo/page.tsx` -- MODIFY the existing page to support both camera and gallery modes. Do NOT create a separate route. [Source: architecture.md#6.1]
- **Styling:** Use Tailwind CSS utility classes only. Use theme CSS variables (`bg-background`, `text-foreground`, `text-accent`, `bg-muted`, `text-muted-foreground`, `border-border`) -- NEVER hardcode hex colors. [Source: 1-1-design-system-setup.md]
- **Icons:** Use Lucide React for all icons. Already installed at v0.575.0+. Use: `Upload`, `ImagePlus`, `CheckSquare`, `AlertCircle`, `Camera`. [Source: architecture.md#2.1]
- **State Management:** Local state only -- no Zustand store yet. Pass photo via callback props matching the same `onCapture(blob)` / `onUpload(blob)` pattern from Story 2.1. [Source: architecture.md#6.2]

### Technical Requirements

- **EXIF Orientation Correction:** HEIC files from iPhones commonly have non-standard EXIF orientation. Use Canvas API to read and correct orientation. The approach: create an Image element from the file, draw it to a canvas with the correct rotation/flip transformation, then export as JPEG blob. Use `createImageBitmap()` where available (Chrome, Firefox) for better performance; fall back to `Image()` element for Safari. [Source: architecture.md#8.2, ux-design.md#3.3]
- **HEIC Support:** Browsers vary in HEIC support. Chrome and Firefox may not render HEIC natively. Use the file picker `accept` attribute with both MIME types and extensions. After EXIF correction, output as JPEG regardless of input format. This ensures consistent format for downstream processing (Story 2.3 compression, Story 2.4 validation). [Source: architecture.md#8.2]
- **File Type Detection:** Some browsers report HEIC files as `application/octet-stream` or empty string for MIME type. Check file extension as a fallback: `.heic`, `.heif`. Accept: `image/jpeg`, `image/png`, `image/heic`, `image/heif`, and files with extensions `.jpg`, `.jpeg`, `.png`, `.heic`, `.heif`.
- **Drag-and-Drop:** Use native HTML5 drag-and-drop API (`onDragOver`, `onDragEnter`, `onDragLeave`, `onDrop`). Prevent default browser behavior (opening the file). Access dropped files via `event.dataTransfer.files`. Validate immediately on drop.
- **File Size Display:** Format file size in human-readable format: KB for files under 1MB, MB with one decimal for files over 1MB. Example: "foto.jpg (2.3 MB)", "selfie.png (843 KB)".
- **Consent Checkbox Pattern:** The consent checkbox is a LGPD requirement for gallery uploads (not required for camera capture because the user is clearly providing their own face). This is explicitly specified in the UX design. [Source: ux-design.md#3.3, epics-and-stories.md#E2]
- **Canvas API for EXIF:** To read EXIF orientation without a library, read the first bytes of the JPEG file looking for the EXIF marker (0xFFE1) and the orientation tag (0x0112). Alternatively, use `createImageBitmap()` with `{ imageOrientation: 'from-image' }` option which handles EXIF orientation automatically in modern browsers. Check browser support and fall back to manual correction.

### Previous Story Intelligence (Story 2.1 -- Camera Capture with Guidance)

**What was built in Story 2.1:**
- Full camera capture component with state machine: webview-blocked -> pre-permission -> camera-active -> error
- Components: PhotoCapture.tsx, CameraPermissionPrompt.tsx, WebViewBlocker.tsx, FaceOvalOverlay.tsx, CameraGuidanceTips.tsx
- Hooks: useCamera.ts (getUserMedia, capture, switch, cleanup)
- Utilities: detect-webview.ts
- Page route: `/consultation/photo` with page.tsx and layout.tsx
- 197 total tests passing (140 from Epic 1 + 57 new)

**Key patterns from Story 2.1:**
- PhotoCapture component uses state machine pattern with `CaptureState` type union
- Camera permission prompt has a placeholder "Prefiro enviar uma foto da galeria" link -- THIS IS THE INTEGRATION POINT for Story 2.2
- The page route (`page.tsx`) renders PhotoCapture with an `onCapture(blob)` callback
- All components use `'use client'` directive for browser API access
- Error messages are in Portuguese with correct diacritical marks
- Design system tokens used throughout (bg-background, text-foreground, etc.)
- Tests mock browser APIs (navigator.mediaDevices, etc.)

**Critical integration point:** The CameraPermissionPrompt.tsx has a secondary link "Prefiro enviar uma foto da galeria" that needs to be wired up to switch the page to gallery upload mode. Currently this link exists as a placeholder or disabled element. Story 2.2 must activate it.

**DO NOT modify these Story 2.1 files (unless explicitly needed for integration):**
- `src/hooks/useCamera.ts` (camera hook is stable)
- `src/components/consultation/FaceOvalOverlay.tsx` (not related)
- `src/components/consultation/CameraGuidanceTips.tsx` (not related)
- `src/components/consultation/WebViewBlocker.tsx` (not related)
- `src/lib/photo/detect-webview.ts` (not related)

**Files that WILL need modification for integration:**
- `src/components/consultation/CameraPermissionPrompt.tsx` -- Add `onSwitchToGallery` callback prop to activate the gallery link
- `src/app/consultation/photo/page.tsx` -- Add mode switching between camera and gallery components

### Library & Framework Requirements

| Library | Version | Notes |
|---------|---------|-------|
| Next.js | 16.1.6 | App Router, `src/` directory, server/client components |
| React | 19.2.3 | Client components with `'use client'` for browser API access |
| Tailwind CSS | v4+ | Theme via CSS variables, utility classes |
| Lucide React | 0.575.0+ | Icons: Upload, ImagePlus, Camera, AlertCircle, Check, X |
| Framer Motion | 12.34.3+ | Optional: drag-over animation, loading state transitions |

**DO NOT install new dependencies for this story.** Everything needed is already in package.json. EXIF correction uses native Canvas API and file reading via FileReader/createImageBitmap. No need for `exif-js`, `piexifjs`, `heic-convert`, or any other image processing library.

### File Structure Requirements

```
src/
├── app/
│   ├── consultation/
│   │   └── photo/
│   │       ├── page.tsx                    # MODIFY: Add camera/gallery mode switching
│   │       └── layout.tsx                  # NO CHANGES
│   ├── layout.tsx                          # NO CHANGES
│   ├── page.tsx                            # NO CHANGES
│   └── globals.css                         # NO CHANGES
├── components/
│   ├── consultation/
│   │   ├── GalleryUpload.tsx              # NEW: Gallery upload component (client)
│   │   ├── PhotoCapture.tsx               # NO CHANGES (camera component from 2.1)
│   │   ├── CameraPermissionPrompt.tsx     # MODIFY: Add onSwitchToGallery callback prop
│   │   ├── WebViewBlocker.tsx             # NO CHANGES
│   │   ├── FaceOvalOverlay.tsx            # NO CHANGES
│   │   └── CameraGuidanceTips.tsx         # NO CHANGES
│   ├── landing/
│   │   └── (no changes)
│   ├── layout/
│   │   └── (no changes)
│   └── ui/
│       └── (no changes)
├── hooks/
│   ├── useTheme.ts                         # NO CHANGES
│   └── useCamera.ts                        # NO CHANGES
├── lib/
│   ├── photo/
│   │   ├── detect-webview.ts              # NO CHANGES (from 2.1)
│   │   ├── exif.ts                        # NEW: EXIF orientation correction
│   │   └── validate-file.ts              # NEW: File type/size validation
│   └── motion.ts                           # NO CHANGES
└── test/
    ├── exif.test.ts                        # NEW: EXIF correction tests
    ├── validate-file.test.ts              # NEW: File validation tests
    ├── gallery-upload.test.tsx            # NEW: GalleryUpload component tests
    ├── photo-page-integration.test.tsx    # NEW: Page mode switching tests
    ├── detect-webview.test.ts             # NO CHANGES (from 2.1)
    ├── use-camera.test.ts                 # NO CHANGES (from 2.1)
    ├── camera-capture.test.tsx            # NO CHANGES (from 2.1)
    └── (existing test files - no changes)
```

[Source: architecture.md#6.1 -- Project Structure]

### Project Structure Notes

- `src/components/consultation/` already exists (created in Story 2.1). Add GalleryUpload.tsx here.
- `src/lib/photo/` already exists (created in Story 2.1 with detect-webview.ts). Add exif.ts and validate-file.ts here. The architecture spec defines `exif.ts` in this directory. [Source: architecture.md#6.1]
- `src/app/consultation/photo/page.tsx` already exists (created in Story 2.1). MODIFY it to support dual mode. Do NOT create a new route.
- The gallery upload is accessed from the same `/consultation/photo` URL -- it is a mode within the same page, not a separate page.

### Testing Requirements

- Use existing Vitest + React Testing Library setup (configured in Story 1.1)
- Test file locations: `src/test/exif.test.ts`, `src/test/validate-file.test.ts`, `src/test/gallery-upload.test.tsx`, `src/test/photo-page-integration.test.tsx`
- For EXIF tests: create test fixtures as small JPEG blobs with specific EXIF orientation bytes, or mock the Canvas/ImageBitmap APIs
- For file validation tests: create mock File objects with various types and sizes
- For drag-and-drop tests: use `fireEvent.dragOver`, `fireEvent.drop` with mock DataTransfer
- For file input tests: use `fireEvent.change` on the hidden input element
- Minimum 40 tests across all new test files
- Run existing test suite to ensure no regressions (expect 197 existing tests to still pass)
- Test consent checkbox interaction (unchecked blocks upload, checked allows it)

### Browser Compatibility Notes

- **HEIC Files:** iOS devices save photos as HEIC by default. Safari supports HEIC display natively; Chrome/Firefox do NOT. The file picker's `accept` attribute with `.heic` extension allows selection, but the browser cannot render the preview. Convert HEIC to JPEG during EXIF correction step. [Source: MDN Web Docs]
- **createImageBitmap:** Supported in Chrome 50+, Firefox 42+, Safari 15+, Edge 79+. Use as primary method for EXIF orientation correction with `{ imageOrientation: 'from-image' }` option. The `imageOrientation: 'from-image'` option tells the browser to respect the EXIF orientation. [Source: MDN Web Docs]
- **Drag-and-Drop API:** Fully supported in all modern browsers. On mobile, drag-and-drop is less common but still functional. The file picker button is the primary upload method on mobile.
- **FileReader API:** Universally supported. Use for reading file contents when createImageBitmap is not available.

### UX Design Specifications

- **Gallery Upload Mode** [Source: ux-design.md#3.3]:
  - Drag-and-drop zone on desktop / file picker on mobile
  - Accepted formats: JPG, PNG, HEIC
  - Consent checkbox: "Confirmo que esta foto e minha" (required for gallery upload specifically)
  - Photo validation feedback same as camera mode (Story 2.4 will add face detection on top)
- **Photo Upload Screen Approach:** "Camera-first on mobile, upload-first on desktop" -- but the implementation starts in camera mode on all devices (from Story 2.1). Gallery is the alternative accessed via the "Prefiro enviar uma foto da galeria" link. [Source: ux-design.md#3.3]
- **File Size Limit:** Max file size 10MB pre-compression. Architecture requires client-side compression (Story 2.3) to get photos under 500KB for API payloads. [Source: architecture.md#7.3, ux-design.md#3.3]
- **Error States:** Red border/pulse, specific reason, retry option. [Source: ux-design.md#8.2]
- **Micro-interactions:** Question answer selected option scales up (can apply to file selection feedback). Use Framer Motion for subtle animations. [Source: ux-design.md#8.1]

### Content Reference (Portuguese)

| Element | Text |
|---------|------|
| Upload button | Escolher foto da galeria |
| Drag-drop zone | Arraste a sua foto aqui ou clique para selecionar |
| Drag-drop active | Solte a foto aqui |
| Consent checkbox | Confirmo que esta foto e minha e consinto no seu processamento |
| Consent reminder | Por favor, confirme que a foto e sua antes de continuar |
| Error: wrong format | Formato nao suportado. Use JPG, PNG ou HEIC. |
| Error: too large | Ficheiro demasiado grande. O tamanho maximo e 10MB. |
| Error: read failure | Erro ao processar a foto. Tente novamente. |
| Switch to camera | Prefiro usar a camera |
| Switch to gallery | Prefiro enviar uma foto da galeria |
| File size display | {filename} ({size}) |
| Loading EXIF | A processar a foto... |

**CRITICAL:** All Portuguese text must use correct diacritical marks (accents: a, e, o; cedilla: c; tilde: a, o). This was a code review finding in Story 1.6 and reinforced in Story 2.1. Review every string for missing diacritics before considering the story complete.

### Critical Guardrails

- **DO NOT** install any image processing npm packages (no exif-js, piexifjs, heic-convert, sharp, jimp, etc.). Use native Canvas API and FileReader/createImageBitmap only.
- **DO NOT** hardcode hex colors. Use theme CSS variables.
- **DO NOT** modify any files from Epic 1 (layout.tsx, globals.css, landing page, ui components, landing components, ThemeProvider, Footer, test setup, motion.ts).
- **DO NOT** create the Zustand consultation store in this story. Use local state and callback props.
- **DO NOT** implement photo compression in this story (that is Story 2.3).
- **DO NOT** implement face detection/validation in this story (that is Story 2.4).
- **DO NOT** implement the photo review screen in this story (that is Story 2.5).
- **DO NOT** implement photo upload to Supabase in this story (that is Story 2.6).
- **DO NOT** implement photo persistence to IndexedDB in this story (that is Story 2.7).
- **DO NOT** create a separate page route for gallery upload. It is a mode within the existing `/consultation/photo` page.
- **DO** create `src/lib/photo/exif.ts` for EXIF orientation correction.
- **DO** create `src/lib/photo/validate-file.ts` for file type/size validation.
- **DO** create `src/components/consultation/GalleryUpload.tsx` as the main gallery upload component.
- **DO** modify `src/components/consultation/CameraPermissionPrompt.tsx` to add `onSwitchToGallery` callback prop.
- **DO** modify `src/app/consultation/photo/page.tsx` to add camera/gallery mode switching.
- **DO** use `'use client'` directive for GalleryUpload component.
- **DO** implement consent checkbox as a required step before gallery upload proceeds.
- **DO** implement EXIF orientation correction using Canvas API / createImageBitmap.
- **DO** convert HEIC files to JPEG during processing.
- **DO** use correct Portuguese diacritical marks on ALL user-facing strings.
- **DO** test with mocked File, FileReader, Canvas, and createImageBitmap APIs.
- **DO** follow the existing test patterns from Epic 1 and Story 2.1 (Vitest + RTL).
- **DO** ensure 197 existing tests still pass (zero regressions).

### Cross-Story Dependencies

- **Story 2.1 (Camera Capture with Guidance) -- DONE:** Gallery upload integrates into the existing photo page alongside camera capture. The CameraPermissionPrompt secondary link is the entry point.
- **Story 2.3 (Client-Side Photo Compression):** The uploaded and EXIF-corrected photo blob from this story will be compressed in Story 2.3. The `onUpload(blob)` callback provides the raw (orientation-corrected but uncompressed) photo. Compression is NOT this story's responsibility.
- **Story 2.4 (Real-Time Photo Validation):** Face detection validation will be applied to gallery-uploaded photos just as to camera-captured photos. Story 2.4 may need to handle the output from both camera and gallery paths.
- **Story 2.5 (Photo Review Screen):** After gallery upload, the photo review screen shows the uploaded photo with "Usar esta foto" / "Escolher outra" buttons. This story's GalleryUpload should call `onUpload(blob)` and the parent page handles navigation to the review step.
- **Story 2.7 (Photo Persistence):** IndexedDB persistence for the photo blob is Story 2.7. This story just provides the photo in memory.
- **Story 1.1 (Design System):** All styling depends on the design system tokens established in Story 1.1.

### Performance Targets

- File validation should complete in under 50ms (synchronous size/type check)
- EXIF orientation correction should complete in under 2 seconds for a 10MB photo
- Drag-and-drop visual feedback should be instant (< 50ms)
- No unnecessary re-renders during drag events (use event handlers, not state for drag tracking where possible)
- File picker opening should be near-instant (< 100ms from button click)

### Git Intelligence

Recent commit patterns:
- `feat(epic-2): implement story 2-1-camera-capture-with-guidance`
- `feat(epic-1): implement story 1-6-footer-and-legal-pages`

Suggested commit message: `feat(epic-2): implement story 2-2-gallery-upload-alternative`

### References

- [Source: architecture.md#2.1] -- Tech Stack: Canvas API (resize/compress), Image Processing
- [Source: architecture.md#6.1] -- Project Structure: `src/components/consultation/`, `src/lib/photo/exif.ts`, `src/lib/photo/validate.ts`
- [Source: architecture.md#6.2] -- State Management: Local state, callback props pattern
- [Source: architecture.md#7.3] -- API Security: Photo validation max 10MB, image/* MIME only
- [Source: architecture.md#8.2] -- Image Optimization: Client-side resize (Story 2.3), EXIF correction
- [Source: ux-design.md#3.3] -- Photo Upload screen spec: gallery upload, drag-drop, consent checkbox, accepted formats
- [Source: ux-design.md#6] -- Accessibility: WCAG 2.1 AA, keyboard nav, prefers-reduced-motion
- [Source: ux-design.md#8.1] -- Micro-interactions: file selection feedback
- [Source: ux-design.md#8.2] -- Error States: specific reason, retry option
- [Source: prd.md#FR6] -- FR6: Users can upload a photo from their device gallery as an alternative to camera capture
- [Source: prd.md#FR7] -- FR7: System compresses and resizes uploaded photos before submission (Story 2.3)
- [Source: prd.md#FR8] -- FR8: System validates face in photo (Story 2.4)
- [Source: epics-and-stories.md#S2.2] -- Story 2.2 acceptance criteria
- [Source: epics-and-stories.md#E2] -- Epic 2 elicitation: Chaos Monkey camera fail -> gallery fallback
- [Source: 2-1-camera-capture-with-guidance.md] -- Previous story: camera capture patterns, test count (197), CameraPermissionPrompt integration point
- [Source: 1-1-design-system-setup.md] -- Design system tokens, typography, theme config

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (code review)

### Debug Log References

None

### Completion Notes List

- All 14 acceptance criteria implemented and verified
- 68 new tests across 4 test files, 265 total tests passing (zero regressions)
- EXIF orientation correction handles all 8 values, returns original blob for orientation=1 (non-HEIC)
- File validation with MIME type + extension fallback for HEIC browser compatibility
- GalleryUpload integrates with PhotoCapture page via mode switching
- CameraPermissionPrompt's "Prefiro enviar uma foto da galeria" link now wired to gallery mode
- Portuguese (pt-BR) text with correct diacritical marks verified on all user-facing strings
- Design system tokens used throughout (no hardcoded hex colors)
- Accessibility: aria-labels, role=button on drop zone, keyboard navigation, role=alert on errors
- prefers-reduced-motion respected via global CSS rule and framer-motion useReducedMotion hook
- Code review fixes applied: removed unused Camera import, added early return for orientation=1 non-HEIC

### File List

- `src/lib/photo/exif.ts` — NEW: EXIF orientation correction utility (reads orientation tag, canvas transform, HEIC-to-JPEG conversion)
- `src/lib/photo/validate-file.ts` — NEW: File type/size validation with Portuguese error messages
- `src/components/consultation/GalleryUpload.tsx` — NEW: Gallery upload component (file picker, drag-drop, consent checkbox, EXIF processing)
- `src/components/consultation/PhotoCapture.tsx` — MODIFIED: Added `onSwitchToGallery` optional prop, passed to CameraPermissionPrompt as `onUploadFromGallery`
- `src/app/consultation/photo/page.tsx` — MODIFIED: Added camera/gallery mode switching with shared `handlePhotoReady` handler
- `src/test/exif.test.ts` — NEW: 14 tests for EXIF orientation correction
- `src/test/validate-file.test.ts` — NEW: 20 tests for file validation
- `src/test/gallery-upload.test.tsx` — NEW: 27 tests for GalleryUpload component
- `src/test/photo-page-integration.test.tsx` — NEW: 7 tests for page mode switching integration

### Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-01 | Code review: Fixed unused Camera import in GalleryUpload.tsx | Claude Opus 4.6 |
| 2026-03-01 | Code review: Added early return for orientation=1 non-HEIC in exif.ts | Claude Opus 4.6 |
| 2026-03-01 | Code review: Updated task completion status, File List, Dev Agent Record | Claude Opus 4.6 |
| 2026-03-01 | Code review: Updated story status to done | Claude Opus 4.6 |
