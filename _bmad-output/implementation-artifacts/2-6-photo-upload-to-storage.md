# Story 2.6: Photo Upload to Storage

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want photos uploaded to Supabase Storage with user-scoped access,
so that the AI pipeline can access the user's photo via a secure URL for face analysis and consultation generation.

## Acceptance Criteria

1. Upload compressed photo blob to Supabase Storage `consultation-photos` bucket
2. Storage path follows pattern: `{guest_session_id}/{consultation_id}/original.jpg` (guest flow only for now -- authenticated user_id paths come in Epic 8)
3. Signed URL generation with 15-minute expiry for secure, time-limited access to uploaded photos
4. Progress indicator shown during upload (percentage-based or indeterminate spinner)
5. Retry on network failure with up to 2 automatic retries before showing error to user
6. Store the returned photo URL (signed URL or storage path) in local state for downstream consumption (consultation record storage comes in Epic 4)
7. Upload triggers after user confirms photo on the review screen ("Usar esta foto" flow)
8. Error state with Portuguese message and manual retry button on upload failure after exhausting retries
9. Upload works on iOS Safari 15+, Chrome Android 90+, Firefox, Edge
10. All user-facing text in Portuguese (pt-BR) with correct diacritical marks

## Tasks / Subtasks

- [x] Task 1: Install and configure Supabase client (AC: 1, 2, 3)
  - [x] Install `@supabase/supabase-js` package
  - [x] Create `src/lib/supabase/client.ts` -- browser Supabase client using `createBrowserClient` pattern
  - [x] Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local` (placeholder values for dev)
  - [x] Add env vars to `.env.example` for documentation
  - [x] Export typed Supabase client instance

- [x] Task 2: Create photo upload utility (AC: 1, 2, 3, 5, 9)
  - [x] Create `src/lib/photo/upload.ts`
  - [x] Implement `uploadPhoto(blob: Blob, sessionId: string, consultationId: string): Promise<PhotoUploadResult>` function
  - [x] Generate storage path: `{sessionId}/{consultationId}/original.jpg`
  - [x] Upload blob to `consultation-photos` bucket using Supabase Storage `upload()` method
  - [x] Generate signed URL with 15-minute (900 seconds) expiry using `createSignedUrl()`
  - [x] Implement retry logic: up to 2 retries with 1-second delay between attempts on network failure
  - [x] Return `PhotoUploadResult` with `{ success: boolean; signedUrl?: string; storagePath?: string; error?: string }`
  - [x] Handle specific Supabase Storage errors (bucket not found, unauthorized, file too large, network error)

- [x] Task 3: Create upload progress and status UI component (AC: 4, 8, 10)
  - [x] Create `src/components/consultation/PhotoUpload.tsx`
  - [x] Props: `{ isUploading: boolean; error?: string; onRetry: () => void; onCancel: () => void }` (stateless design -- upload logic in page)
  - [x] Show upload progress: indeterminate spinner with "A enviar a foto..." message (Supabase JS client does not expose granular upload progress for small files)
  - [x] On success: parent handles via state, shows "Pronto!" screen
  - [x] On failure after retries: show error message "Erro ao enviar a foto. Verifique a sua ligacao e tente novamente." with "Tentar novamente" retry button and "Voltar" cancel button
  - [x] Use theme CSS variables (bg-background, text-foreground, text-muted-foreground, text-accent, bg-accent, text-destructive)
  - [x] Use Lucide icons: Loader2 (spinning), CloudUpload (upload indicator), AlertCircle (error)
  - [x] All text in Portuguese with correct diacritical marks

- [x] Task 4: Integrate upload into photo page flow (AC: 6, 7)
  - [x] Modify `src/app/consultation/photo/page.tsx`
  - [x] Add new state: `uploadState: 'idle' | 'uploading' | 'done' | 'error'` and `uploadResult: PhotoUploadResult | null`
  - [x] Generate `guestSessionId` using `crypto.randomUUID()` (persist in localStorage for session recovery in Story 2.7)
  - [x] Generate `consultationId` using `crypto.randomUUID()` for the current consultation flow
  - [x] Modify `handlePhotoConfirm` to trigger upload instead of just setting `isConfirmed`
  - [x] After upload completes successfully, show the confirmed "Pronto!" screen (existing behavior)
  - [x] On upload error, show PhotoUpload component in error state with retry option
  - [x] On cancel from upload error, return to PhotoReview screen

- [x] Task 5: Write comprehensive tests (AC: all)
  - [x] Test file: `src/test/photo-upload-util.test.ts` -- Upload utility tests (11 tests)
    - Uploads blob to correct storage path pattern
    - Generates signed URL with 900-second expiry
    - Retries on network failure up to 2 times
    - Returns error after exhausting retries
    - Handles Supabase bucket-not-found error
    - Handles unauthorized error
    - Returns correct PhotoUploadResult shape on success
    - Returns correct PhotoUploadResult shape on failure
  - [x] Test file: `src/test/photo-upload.test.tsx` -- PhotoUpload component tests (13 tests)
    - Shows upload spinner with Portuguese message during upload
    - Shows error message with retry button on failure
    - Calls onRetry when retry button clicked
    - Calls onCancel when cancel button clicked
    - Uses theme CSS variables (no hardcoded hex)
    - Portuguese text with correct diacritical marks
    - ARIA labels on interactive elements
  - [x] Test file: `src/test/photo-page-upload.test.tsx` -- Page integration tests (9 tests)
    - After photo confirm, upload is triggered
    - During upload, loading state is shown
    - After successful upload, confirmed screen is shown
    - After failed upload, error state with retry is shown
    - Cancel from upload error returns to review screen
  - [x] Run existing test suite to confirm no regressions (358 existing + 33 new = 391 total passing)

## Dev Notes

### Architecture Compliance

- **Supabase Client Location:** `src/lib/supabase/client.ts` -- NEW file. This is the first Supabase client in the project. The architecture defines `src/lib/supabase/` as the location for Supabase utilities. [Source: architecture.md#6.1]
- **Upload Utility Location:** `src/lib/photo/upload.ts` -- NEW file in existing photo utilities directory. Consistent with `compress.ts`, `validate.ts`, `exif.ts` pattern. [Source: architecture.md#6.1]
- **Upload Component Location:** `src/components/consultation/PhotoUpload.tsx` -- NEW component in existing consultation directory. [Source: architecture.md#6.1]
- **Page Route:** `src/app/consultation/photo/page.tsx` -- MODIFY the existing photo page to add upload step after review confirmation. [Source: architecture.md#6.1]
- **Storage Bucket:** `consultation-photos` with user-scoped signed URLs (15-minute expiry). [Source: architecture.md#3.3]
- **Storage Path:** `{guest_session_id}/{consultation_id}/original.jpg` -- Uses guest session ID since auth is not implemented until Epic 8. When auth is added, the path will transition to `{user_id}/{consultation_id}/original.jpg`. [Source: architecture.md#3.1, epics-and-stories.md#S2.6]
- **Styling:** Tailwind CSS utility classes only. Theme CSS variables (`bg-background`, `text-foreground`, `text-accent`, etc.) -- NEVER hardcode hex colors. [Source: 1-1-design-system-setup.md]
- **State Management:** Local state within the page component. No Zustand store yet (that comes in Epic 3). [Source: architecture.md#6.2]

### Technical Requirements

- **Supabase Client Setup:** This is the FIRST Supabase integration in the project. Create a browser client for client-side Storage operations:
  ```typescript
  // src/lib/supabase/client.ts
  import { createClient } from '@supabase/supabase-js';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  export const supabase = createClient(supabaseUrl, supabaseAnonKey);
  ```
  The `createClient` function from `@supabase/supabase-js` creates a browser-compatible client. No SSR/server client is needed for this story -- Storage uploads happen client-side. The server client (`src/lib/supabase/server.ts`) will be created in Epic 4 when API routes need DB access.

- **Environment Variables:** Add to `.env.local`:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
  ```
  For local development, these can be placeholder values. The upload will fail gracefully with the retry mechanism. Create `.env.example` with the same keys (no values) for documentation.

- **Upload Utility Pattern:**
  ```typescript
  // src/lib/photo/upload.ts
  import { supabase } from '@/lib/supabase/client';

  export interface PhotoUploadResult {
    success: boolean;
    signedUrl?: string;
    storagePath?: string;
    error?: string;
  }

  const BUCKET = 'consultation-photos';
  const SIGNED_URL_EXPIRY = 900; // 15 minutes in seconds
  const MAX_RETRIES = 2;
  const RETRY_DELAY_MS = 1000;

  export async function uploadPhoto(
    blob: Blob,
    sessionId: string,
    consultationId: string
  ): Promise<PhotoUploadResult> {
    const storagePath = `${sessionId}/${consultationId}/original.jpg`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, blob, {
            contentType: 'image/jpeg',
            upsert: true,  // Overwrite if retrying same path
          });

        if (uploadError) {
          // Non-retryable errors: bucket not found, unauthorized
          if (uploadError.message?.includes('Bucket not found') ||
              uploadError.message?.includes('not authorized')) {
            return { success: false, error: uploadError.message };
          }
          // Retryable: throw to trigger retry
          throw uploadError;
        }

        // Generate signed URL
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

        if (signedUrlError || !signedUrlData?.signedUrl) {
          throw signedUrlError || new Error('Failed to generate signed URL');
        }

        return {
          success: true,
          signedUrl: signedUrlData.signedUrl,
          storagePath,
        };
      } catch (err) {
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          continue;
        }
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Upload failed',
        };
      }
    }

    return { success: false, error: 'Upload failed after retries' };
  }
  ```

- **Guest Session ID:** Generate using `crypto.randomUUID()` on the client. Persist to `localStorage` under key `mynewstyle_guest_session_id` so it can be reused across page refreshes and for session recovery (Story 2.7). Check localStorage first before generating a new one:
  ```typescript
  function getOrCreateGuestSessionId(): string {
    const STORAGE_KEY = 'mynewstyle_guest_session_id';
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  }
  ```

- **Consultation ID:** Generate a fresh `crypto.randomUUID()` for each new consultation flow. This ID will be reused when creating the consultation record in Epic 4. For now, store in local component state.

- **Upload Flow Integration:** Modify the photo page confirm handler to trigger upload:
  ```typescript
  const handlePhotoConfirm = useCallback(async () => {
    setUploadState('uploading');
    const sessionId = getOrCreateGuestSessionId();
    const consId = consultationId || crypto.randomUUID();
    if (!consultationId) setConsultationId(consId);

    const result = await uploadPhoto(capturedPhoto!, sessionId, consId);
    setUploadResult(result);

    if (result.success) {
      setUploadState('done');
      setIsConfirmed(true);
    } else {
      setUploadState('error');
    }
  }, [capturedPhoto, consultationId]);
  ```

- **Upload Component:**
  ```tsx
  // src/components/consultation/PhotoUpload.tsx
  'use client';
  import { Loader2, CloudUpload, AlertCircle } from 'lucide-react';

  interface PhotoUploadProps {
    isUploading: boolean;
    error?: string;
    onRetry: () => void;
    onCancel: () => void;
  }

  export function PhotoUpload({ isUploading, error, onRetry, onCancel }: PhotoUploadProps) {
    if (isUploading) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
          <CloudUpload className="mb-2 h-8 w-8 text-accent" />
          <Loader2 className="mb-4 h-6 w-6 animate-spin text-accent" />
          <p className="text-foreground font-medium">A enviar a foto...</p>
          <p className="mt-2 text-sm text-muted-foreground">Aguarde um momento</p>
        </div>
      );
    }

    // Error state
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <AlertCircle className="mb-4 h-10 w-10 text-red-500" />
        <p className="text-foreground font-medium">Erro ao enviar a foto</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Verifique a sua ligacao e tente novamente.
        </p>
        <div className="mt-6 flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={onRetry}
            className="w-full rounded-xl bg-accent py-4 text-base font-semibold text-accent-foreground min-h-[48px]"
            aria-label="Tentar enviar novamente"
          >
            Tentar novamente
          </button>
          <button
            onClick={onCancel}
            className="w-full rounded-xl border border-border py-4 text-base font-medium text-muted-foreground min-h-[48px]"
            aria-label="Voltar para a revisao da foto"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }
  ```

### Previous Story Intelligence (Story 2.5 -- Photo Review Screen)

**What was built in Story 2.5:**
- `src/components/consultation/PhotoReview.tsx`: Photo review component with validation badge, quality indicator, bottom-anchored buttons ("Usar esta foto" / "Tirar outra")
- Modified `src/app/consultation/photo/page.tsx`: Added PhotoReview integration, `validationResult` state, `handlePhotoConfirm`, `isConfirmed` state
- 355 total tests passing (21 new + 334 from Stories 2.1-2.4)
- The `handlePhotoConfirm` callback currently just sets `isConfirmed = true` -- this is the exact hook point for Story 2.6 to insert upload logic

**Key patterns from Story 2.5:**
- PhotoReview component calls `onConfirm` when user taps "Usar esta foto" -- this triggers `handlePhotoConfirm` on the page
- The confirmed state shows a "Pronto!" screen with CheckCircle2 icon
- The page uses state-based rendering to switch between capture, compression, validation, review, and confirmed views
- All components use theme CSS variables and Portuguese text
- Bottom-anchored button pattern with `min-h-[48px]` for mobile touch targets
- Framer Motion fadeIn animation with reduced-motion support

**Critical integration points:**
- `handlePhotoConfirm` in `page.tsx` is where upload should be triggered (currently sets `isConfirmed = true`)
- Must change `handlePhotoConfirm` to: trigger upload -> on success set `isConfirmed = true` -> on failure show upload error
- The "Pronto!" confirmed screen should only appear AFTER successful upload
- The PhotoReview component and its `onConfirm` prop do NOT need modification -- only the callback implementation in the page changes
- Add new upload states between review confirmation and the "Pronto!" screen

**DO NOT modify these Story 2.5 files:**
- `src/components/consultation/PhotoReview.tsx` (review component is stable)

**Files that WILL need modification:**
- `src/app/consultation/photo/page.tsx` -- Add upload flow after confirm, new state variables

### Library & Framework Requirements

| Library | Version | Notes |
|---------|---------|-------|
| Next.js | 16.1.6 | App Router, `src/` directory, server/client components |
| React | 19.2.3 | Client components with `'use client'` for browser API access |
| Tailwind CSS | v4+ | Theme via CSS variables, utility classes |
| Lucide React | 0.575.0+ | Loader2 (spinner), CloudUpload (upload indicator), AlertCircle (error), CheckCircle2 (success) |
| **@supabase/supabase-js** | **latest (^2.49)** | **NEW DEPENDENCY -- Supabase browser client for Storage operations** |

**NEW DEPENDENCY:** `@supabase/supabase-js` must be installed. This is the first Supabase integration in the project. Install with `npm install @supabase/supabase-js`. The architecture specifies Supabase for auth, database, and storage. [Source: architecture.md#2.2]

### File Structure Requirements

```
src/
+-- app/
|   +-- consultation/
|   |   +-- photo/
|   |       +-- page.tsx                    # MODIFY: Add upload flow after confirm
|   |       +-- layout.tsx                  # NO CHANGES
|   +-- layout.tsx                          # NO CHANGES
|   +-- page.tsx                            # NO CHANGES
|   +-- globals.css                         # NO CHANGES
+-- components/
|   +-- consultation/
|   |   +-- PhotoUpload.tsx                # NEW: Upload progress/error UI component
|   |   +-- PhotoReview.tsx                # NO CHANGES (from 2.5)
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
|   +-- supabase/
|   |   +-- client.ts                      # NEW: Supabase browser client
|   +-- photo/
|   |   +-- upload.ts                      # NEW: Photo upload utility with retry logic
|   |   +-- detect-webview.ts              # NO CHANGES (from 2.1)
|   |   +-- exif.ts                        # NO CHANGES (from 2.2)
|   |   +-- validate-file.ts              # NO CHANGES (from 2.2)
|   |   +-- compress.ts                    # NO CHANGES (from 2.3)
|   |   +-- validate.ts                    # NO CHANGES (from 2.4)
|   +-- motion.ts                           # NO CHANGES
+-- test/
    +-- photo-upload-util.test.ts          # NEW: Upload utility unit tests
    +-- photo-upload.test.tsx              # NEW: PhotoUpload component tests
    +-- photo-page-upload.test.tsx         # NEW: Page upload integration tests
    +-- photo-review.test.tsx              # NO CHANGES (from 2.5)
    +-- photo-page-review.test.tsx         # NO CHANGES (from 2.5)
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

- `src/lib/supabase/` is a NEW directory being created for the first time. Architecture defines it as the location for Supabase client utilities. Only `client.ts` is created now -- `server.ts` and `types.ts` come in later epics.
- `src/lib/photo/upload.ts` follows the established pattern of photo utilities alongside `compress.ts`, `validate.ts`, `exif.ts`.
- `src/components/consultation/PhotoUpload.tsx` is a simple stateless UI component receiving upload state via props. The actual upload logic lives in the utility file and is orchestrated by the page.
- The upload step is NOT a separate route. It renders within the same `/consultation/photo` page based on state, consistent with the existing flow pattern.
- No Zustand store involvement. All state management is local to the page component.

### Testing Requirements

- Use existing Vitest + React Testing Library setup (configured in Story 1.1)
- Test file locations: `src/test/photo-upload-util.test.ts`, `src/test/photo-upload.test.tsx`, `src/test/photo-page-upload.test.tsx`

- **Mocking Supabase for upload utility tests:**
  ```typescript
  // Mock the Supabase client
  vi.mock('@/lib/supabase/client', () => ({
    supabase: {
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn(),
          createSignedUrl: vi.fn(),
        }),
      },
    },
  }));
  ```

- **Mocking for component tests:** Mock the upload utility:
  ```typescript
  vi.mock('@/lib/photo/upload', () => ({
    uploadPhoto: vi.fn(),
  }));
  ```

- **Mocking for page integration tests:** Mock Supabase, upload, compression, validation:
  ```typescript
  vi.mock('@/lib/photo/upload', () => ({
    uploadPhoto: vi.fn(),
  }));
  vi.mock('@/lib/photo/compress', () => ({
    compressPhoto: vi.fn(),
  }));
  vi.mock('@/lib/photo/validate', () => ({
    validatePhoto: vi.fn(),
    destroyFaceDetector: vi.fn(),
    initFaceDetector: vi.fn(),
  }));
  ```

- **localStorage mocking for guest session ID:**
  ```typescript
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  Object.defineProperty(window, 'localStorage', { value: localStorageMock });
  ```

- Minimum 20 tests across the three new test files
- Run existing test suite to ensure no regressions (expect 355 existing tests to still pass)

### UX Design Specifications

- **Photo Upload Progress:** UX spec section 3.3 specifies "Upload progress indicator" as a technical requirement for the photo upload flow. [Source: ux-design.md#3.3]
- **Error Handling:** "Algo correu mal. Tentar de novo?" pattern for failures. [Source: ux-design.md#8.2]
- **Button Sizing:** Minimum 48px height for touch targets on mobile. [Source: ux-design.md#4.1]
- **Mobile UX:** Bottom-anchored CTAs in thumb zone. Design for 375px width primary target. [Source: ux-design.md#5, ux-design.md Mobile UX]
- **Signed URLs:** 15-minute expiry for photo access. [Source: architecture.md#3.3, architecture.md#7.3]

### Content Reference (Portuguese)

| Element | Text |
|---------|------|
| Upload spinner message | A enviar a foto... |
| Upload spinner subtext | Aguarde um momento |
| Upload error heading | Erro ao enviar a foto |
| Upload error subtext | Verifique a sua ligacao e tente novamente. |
| Retry button | Tentar novamente |
| Cancel/back button | Voltar |
| Confirmed heading | Pronto! |
| Confirmed subtext | Foto selecionada com sucesso. |

**CRITICAL:** All Portuguese text must use correct diacritical marks. Key characters:
- "a" (a-tilde) in "ligacao" should be "ligacao" -- NOTE: the word is "ligacao" (connection)
- "c" (c-cedilla) in "ligacao"
- Maintain consistency with previous stories' Portuguese conventions

### Critical Guardrails

- **DO NOT** hardcode hex colors. Use theme CSS variables exclusively.
- **DO NOT** create a new page route for upload. The upload renders within the existing `/consultation/photo` page.
- **DO NOT** modify any files from Epic 1 (layout.tsx, globals.css, landing page, ui components, landing components, ThemeProvider, Footer, test setup, motion.ts).
- **DO NOT** modify Story 2.1 files (PhotoCapture.tsx, useCamera.ts, CameraPermissionPrompt.tsx, WebViewBlocker.tsx, FaceOvalOverlay.tsx, CameraGuidanceTips.tsx, detect-webview.ts).
- **DO NOT** modify Story 2.2 files (GalleryUpload.tsx, exif.ts, validate-file.ts).
- **DO NOT** modify Story 2.3 files (compress.ts).
- **DO NOT** modify Story 2.4 files (validate.ts, PhotoValidation.tsx).
- **DO NOT** modify Story 2.5 files (PhotoReview.tsx).
- **DO NOT** create a Supabase server client in this story -- that comes in Epic 4.
- **DO NOT** create database tables or migrations in this story -- that comes in Epic 4.
- **DO NOT** implement authenticated user paths -- auth comes in Epic 8. Use guest_session_id only.
- **DO NOT** implement the Zustand consultation store in this story. Use local state and callback props.
- **DO NOT** implement photo persistence to IndexedDB in this story (that is Story 2.7).
- **DO NOT** implement the `/api/consultation/start` endpoint in this story (that is Epic 4).
- **DO** install `@supabase/supabase-js` as a new dependency.
- **DO** create `src/lib/supabase/client.ts` as the browser Supabase client.
- **DO** create `src/lib/photo/upload.ts` as the upload utility with retry logic.
- **DO** create `src/components/consultation/PhotoUpload.tsx` as the upload UI component.
- **DO** modify `src/app/consultation/photo/page.tsx` to add upload flow after confirm.
- **DO** generate guest_session_id using `crypto.randomUUID()` and persist to localStorage.
- **DO** generate consultation_id using `crypto.randomUUID()` for the upload path.
- **DO** use correct Portuguese diacritical marks on ALL user-facing strings.
- **DO** follow the existing test patterns from Stories 2.1-2.5 (Vitest + RTL).
- **DO** ensure 355 existing tests still pass (zero regressions).
- **DO** add `.env.example` with Supabase placeholder env var names.

### Cross-Story Dependencies

- **Story 2.1 (Camera Capture with Guidance) -- DONE:** Provides raw photo blobs from camera capture.
- **Story 2.2 (Gallery Upload Alternative) -- DONE:** Provides EXIF-corrected blobs from gallery upload.
- **Story 2.3 (Client-Side Photo Compression) -- DONE:** Compresses photos to <500KB, max 800px width. The upload sends the compressed blob.
- **Story 2.4 (Real-Time Photo Validation) -- DONE:** Validates photos for face detection. Upload only triggers for validated/overridden photos.
- **Story 2.5 (Photo Review Screen) -- DONE:** Provides the "Usar esta foto" confirm action. This story hooks into that confirm to trigger upload.
- **Story 2.7 (Photo Persistence for Session Recovery):** Will use the same guest_session_id and consultation_id. The localStorage-persisted guest_session_id created here will be reused by Story 2.7 for IndexedDB persistence.
- **Story 4.1 (AI Provider Abstraction Layer):** Will create the consultation record in Supabase DB using the photo URL generated here.
- **Story 4.3 (Face Analysis):** Will consume the signed photo URL to send to Gemini Vision API.
- **Story 8.1 (Supabase Auth Setup):** Will upgrade storage paths from guest_session_id to authenticated user_id.
- **Story 1.1 (Design System):** All styling depends on the design system tokens established in Story 1.1.

### Performance Targets

- Upload time: <3 seconds on 4G for a <500KB compressed photo (typical Supabase Storage upload latency)
- Signed URL generation: <500ms after upload completes
- Retry delay: 1 second between attempts (not exponential -- only 2 retries)
- No visible UI jank during upload (async operation, non-blocking)
- Memory: photo blob already in memory from capture/compression. No additional blob copies created.
- One additional network request (upload) + one Supabase SDK call (signed URL).

### Git Intelligence

Recent commit patterns:
- `feat(epic-2): implement story 2-5-photo-review-screen`
- `feat(epic-2): implement story 2-4-real-time-photo-validation`
- `feat(epic-2): implement story 2-3-client-side-photo-compression`
- `feat(epic-2): implement story 2-2-gallery-upload-alternative`
- `feat(epic-2): implement story 2-1-camera-capture-with-guidance`

Suggested commit message: `feat(epic-2): implement story 2-6-photo-upload-to-storage`

### Supabase Storage Setup (Pre-requisite)

Before running this story, the Supabase project must have:
1. A `consultation-photos` bucket created (can be done via Supabase Dashboard or CLI)
2. Storage policies configured to allow uploads from anon role (for guest flow):
   ```sql
   -- Allow anonymous users to upload to consultation-photos
   CREATE POLICY "Allow anonymous uploads" ON storage.objects
     FOR INSERT WITH CHECK (bucket_id = 'consultation-photos');

   -- Allow reading own uploads via signed URLs (handled by Supabase Storage automatically)
   ```
3. Environment variables set in `.env.local`

If the Supabase project is not configured yet, the upload will fail gracefully with the error/retry UI. The dev agent should create `.env.local` with placeholder values and document the bucket setup requirement.

### References

- [Source: architecture.md#2.2] -- Backend: Supabase Storage for photo uploads, user-scoped buckets
- [Source: architecture.md#3.3] -- Storage Buckets: consultation-photos, signed URLs 15-min expiry, 90-day lifecycle
- [Source: architecture.md#6.1] -- Project Structure: src/lib/supabase/, src/lib/photo/, src/components/consultation/
- [Source: architecture.md#6.2] -- State Management: local state for photo flow, Zustand in Epic 3
- [Source: architecture.md#6.3] -- Session Persistence: guest consultation ID in localStorage
- [Source: architecture.md#7.2] -- LGPD: photos used only for visagism analysis
- [Source: architecture.md#7.3] -- API Security: signed URLs 15-min expiry, photo validation required
- [Source: architecture.md#8.2] -- Image Optimization: client-side resize, Supabase Storage with CDN
- [Source: ux-design.md#3.3] -- Photo Upload: upload progress indicator, technical requirements
- [Source: ux-design.md#4.1] -- Component Library: Button variants, min 48px height
- [Source: ux-design.md#5] -- Responsive Breakpoints: 375px primary mobile target
- [Source: ux-design.md#8.2] -- Error States: retry pattern for failures
- [Source: ux-design.md Mobile UX] -- Thumb-zone optimization: bottom-anchored CTAs
- [Source: prd.md] -- FR: Photo upload to secure storage for AI processing
- [Source: epics-and-stories.md#S2.6] -- Story 2.6: Photo Upload to Storage acceptance criteria
- [Source: epics-and-stories.md#E2] -- Epic 2 elicitation: Chaos Monkey (network failure), JTBD (give AI enough data)
- [Source: 2-5-photo-review-screen.md] -- Previous story: PhotoReview component, handlePhotoConfirm hook point, 355 tests passing

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (code review), Dev Agent (implementation)

### Debug Log References

None

### Completion Notes List

- All 10 Acceptance Criteria implemented and verified
- 33 new tests across 3 test files (11 + 13 + 9)
- 391 total tests passing (358 existing + 33 new, zero regressions)
- PhotoUpload component uses stateless props pattern (deviates from story spec for better architecture)
- consultationId stored in useRef to avoid unnecessary re-renders
- 5 existing test files updated with upload mock to prevent Supabase client initialization
- Code review: Fixed unused `error` prop (now prefixed with underscore), replaced hardcoded `text-red-500` with `text-destructive`

### Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-01 | Initial implementation of photo upload to Supabase Storage | Dev Agent |
| 2026-03-01 | Code review: Fixed ESLint warning, theme compliance, story documentation | Claude Opus 4.6 |

### File List

#### New Files
- `src/lib/supabase/client.ts` -- Supabase browser client (createClient with env vars)
- `src/lib/photo/upload.ts` -- Photo upload utility with retry logic, signed URL generation
- `src/components/consultation/PhotoUpload.tsx` -- Upload progress/error UI component
- `src/test/photo-upload-util.test.ts` -- Upload utility unit tests (11 tests)
- `src/test/photo-upload.test.tsx` -- PhotoUpload component tests (13 tests)
- `src/test/photo-page-upload.test.tsx` -- Page upload integration tests (9 tests)
- `.env.example` -- Supabase env var documentation (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)

#### Modified Files
- `src/app/consultation/photo/page.tsx` -- Added upload flow after confirm, upload state, guest session ID, consultation ID
- `package.json` -- Added @supabase/supabase-js dependency
- `package-lock.json` -- Updated lockfile for new dependency
- `src/test/camera-capture.test.tsx` -- Added upload mock to prevent Supabase client initialization
- `src/test/photo-page-compression.test.tsx` -- Added upload mock to prevent Supabase client initialization
- `src/test/photo-page-integration.test.tsx` -- Added upload mock to prevent Supabase client initialization
- `src/test/photo-page-review.test.tsx` -- Added upload mock + localStorage/crypto mocks for upload integration
- `src/test/photo-page-validation.test.tsx` -- Added upload mock to prevent Supabase client initialization
