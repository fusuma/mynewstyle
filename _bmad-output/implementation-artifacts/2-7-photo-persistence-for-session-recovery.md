# Story 2.7: Photo Persistence for Session Recovery

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want my photo preserved if I switch apps so I don't have to retake it,
so that my consultation flow is not interrupted by app switching, memory pressure, or accidental navigation on mobile.

## Acceptance Criteria

1. Photo blob stored in IndexedDB immediately after capture/upload confirmation (before or in parallel with Supabase upload)
2. On app return / page reload, rehydrate photo from IndexedDB and resume the consultation flow at the correct step
3. Clear persisted photo data on consultation complete (successful upload + navigation to questionnaire) or explicit user discard ("Tirar outra")
4. Handle iOS Safari memory pressure gracefully: if IndexedDB read fails, show graceful recovery UI prompting the user to retake their photo instead of crashing
5. Persist consultation flow state (current step, gender selection, guest session ID, consultation ID) alongside the photo so the full context is recoverable
6. IndexedDB storage uses a single well-known database name and object store for all consultation session data
7. Photo rehydration displays the PhotoReview screen with the recovered photo so the user can confirm or retake
8. All user-facing recovery text in Portuguese (pt-BR) with correct diacritical marks
9. Works on iOS Safari 15+, Chrome Android 90+, Firefox, Edge (latest 2 versions)
10. Session data expires and auto-clears after 24 hours to prevent stale data accumulation

## Tasks / Subtasks

- [x] Task 1: Create IndexedDB persistence utility (AC: 1, 6, 10)
  - [x] Create `src/lib/persistence/session-db.ts`
  - [x] Implement `openSessionDB()`: opens/creates IndexedDB database `mynewstyle-session` with object store `consultation-session`
  - [x] Implement `saveSessionData(data: SessionData): Promise<void>` -- stores photo blob + metadata with timestamp
  - [x] Implement `loadSessionData(): Promise<SessionData | null>` -- retrieves persisted session, returns null if not found or expired
  - [x] Implement `clearSessionData(): Promise<void>` -- removes all session data from IndexedDB
  - [x] Implement 24-hour expiry check: compare stored `savedAt` timestamp, return null if > 24 hours old
  - [x] Define `SessionData` interface: `{ photo: Blob; photoPreview: string; gender: 'male' | 'female'; guestSessionId: string; consultationId: string; uploadResult?: PhotoUploadResult; savedAt: number }`
  - [x] Handle IndexedDB errors gracefully (return null on read failure, silently fail on write failure)

- [x] Task 2: Create session recovery hook (AC: 2, 5, 7)
  - [x] Create `src/hooks/useSessionRecovery.ts`
  - [x] Implement `useSessionRecovery()` hook that checks IndexedDB on mount for existing session data
  - [x] Return `{ recoveredSession: SessionData | null; isChecking: boolean; clearRecovery: () => void }`
  - [x] On mount: call `loadSessionData()`, set `recoveredSession` if valid data found
  - [x] `clearRecovery`: calls `clearSessionData()` and resets state to null
  - [x] Handle async loading state so page can show spinner while checking IndexedDB

- [x] Task 3: Integrate persistence into photo page flow (AC: 1, 2, 3, 7)
  - [x] Modify `src/app/consultation/photo/page.tsx`
  - [x] On photo capture/upload confirmation: save to IndexedDB via `saveSessionData()` (fire-and-forget, non-blocking)
  - [x] On page mount: use `useSessionRecovery()` to check for existing session
  - [x] If recovered session found: display PhotoReview with recovered photo blob, show recovery banner "Encontramos a sua foto anterior"
  - [x] On "Usar esta foto" from recovery: proceed with upload flow (reuse existing handlePhotoConfirm)
  - [x] On "Tirar outra" from recovery: call `clearSessionData()` and reset to capture mode
  - [x] On successful upload + ready to navigate: call `clearSessionData()` to clean up
  - [x] Persist gender, guestSessionId, consultationId alongside photo

- [x] Task 4: Handle iOS Safari memory pressure gracefully (AC: 4, 9)
  - [x] Create `src/components/consultation/SessionRecoveryBanner.tsx`
  - [x] Props: `{ onUseRecovered: () => void; onRetake: () => void }`
  - [x] Show informational banner: "Encontramos a sua foto anterior. Deseja continuar?"
  - [x] Two buttons: "Continuar" (primary) and "Tirar outra foto" (secondary)
  - [x] If IndexedDB read throws (memory pressure, quota exceeded): catch error, log warning, return null from `loadSessionData()` -- user simply starts fresh with no error shown
  - [x] If photo blob is corrupted (cannot create object URL): catch error, clear IndexedDB, return null
  - [x] No crash, no error modal -- graceful degradation to "no recovery available"
  - [x] Use theme CSS variables (bg-background, text-foreground, text-accent, bg-accent)
  - [x] All text in Portuguese with correct diacritical marks

- [x] Task 5: Write comprehensive tests (AC: all)
  - [x] Test file: `src/test/session-db.test.ts` -- IndexedDB utility tests (12 tests)
    - Saves session data to IndexedDB successfully
    - Loads previously saved session data
    - Returns null when no session data exists
    - Returns null and clears data when session is older than 24 hours
    - Clears session data successfully
    - Handles IndexedDB open failure gracefully (returns null)
    - Handles write failure gracefully (no throw)
    - Handles corrupted data gracefully (returns null)
    - Stores photo blob with correct type
    - Stores all metadata fields (gender, guestSessionId, consultationId, savedAt)
    - Overwrites previous session data on save
    - Auto-clears expired data on load
  - [x] Test file: `src/test/use-session-recovery.test.ts` -- Hook tests (8 tests)
    - Returns null initially while checking
    - Returns recovered session when data exists in IndexedDB
    - Returns null when no data exists
    - Returns null when data is expired
    - clearRecovery clears IndexedDB and resets state
    - isChecking is true during load, false after
    - Handles IndexedDB errors gracefully
    - Does not block page render during check
  - [x] Test file: `src/test/session-recovery-banner.test.tsx` -- Banner component tests (6 tests)
    - Renders recovery message in Portuguese
    - Calls onUseRecovered when "Continuar" clicked
    - Calls onRetake when "Tirar outra foto" clicked
    - Uses theme CSS variables (no hardcoded hex)
    - ARIA labels on interactive elements
    - Minimum 48px touch targets on buttons
  - [x] Test file: `src/test/photo-page-recovery.test.tsx` -- Page integration tests (10 tests)
    - On mount with no saved session, shows normal capture flow
    - On mount with saved session, shows PhotoReview with recovered photo
    - On mount with expired session, shows normal capture flow
    - Recovery "Continuar" triggers upload flow
    - Recovery "Tirar outra foto" clears session and shows capture
    - Photo confirm saves to IndexedDB before/during upload
    - Successful upload clears IndexedDB
    - IndexedDB failure on mount does not crash page
    - IndexedDB failure on save does not block upload
    - All recovery text in Portuguese
  - [x] Run existing test suite to confirm no regressions (391 existing + 36 new = 427 total passing)

## Dev Notes

### Architecture Compliance

- **Persistence Utility Location:** `src/lib/persistence/session-db.ts` -- NEW directory and file. The architecture defines `src/lib/` as the location for utility modules. Creating `persistence/` subdirectory for IndexedDB utilities follows the `src/lib/photo/`, `src/lib/supabase/` pattern. [Source: architecture.md#6.1]
- **Hook Location:** `src/hooks/useSessionRecovery.ts` -- NEW hook in existing hooks directory. Follows `useCamera.ts`, `useTheme.ts` pattern. [Source: architecture.md#6.1]
- **Banner Component Location:** `src/components/consultation/SessionRecoveryBanner.tsx` -- NEW component in existing consultation directory. [Source: architecture.md#6.1]
- **Page Route:** `src/app/consultation/photo/page.tsx` -- MODIFY the existing photo page to add session recovery on mount and persistence on confirm. [Source: architecture.md#6.1]
- **Session Persistence Strategy:** Architecture section 6.3 explicitly specifies: "Photo blob stored in IndexedDB (too large for sessionStorage)" and "On app switch/return -> rehydrate from persisted state -> resume flow." This story implements exactly that specification. [Source: architecture.md#6.3]
- **State Management:** Local state within the page component + IndexedDB. No Zustand store yet (that comes in Epic 3 -- S3.1 adds session persistence to Zustand). [Source: architecture.md#6.2]
- **Styling:** Tailwind CSS utility classes only. Theme CSS variables (`bg-background`, `text-foreground`, `text-accent`, etc.) -- NEVER hardcode hex colors. [Source: 1-1-design-system-setup.md]

### Technical Requirements

- **IndexedDB Database Design:**
  ```typescript
  // src/lib/persistence/session-db.ts
  const DB_NAME = 'mynewstyle-session';
  const DB_VERSION = 1;
  const STORE_NAME = 'consultation-session';
  const SESSION_KEY = 'current';
  const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

  export interface SessionData {
    photo: Blob;
    photoPreview: string; // base64 data URL for immediate display
    gender: 'male' | 'female';
    guestSessionId: string;
    consultationId: string;
    uploadResult?: {
      success: boolean;
      signedUrl?: string;
      storagePath?: string;
    };
    savedAt: number; // Date.now() timestamp
  }
  ```

- **Opening IndexedDB:**
  ```typescript
  function openSessionDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
  }
  ```

- **Save Pattern (fire-and-forget from page):**
  ```typescript
  export async function saveSessionData(data: SessionData): Promise<void> {
    try {
      const db = await openSessionDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(data, SESSION_KEY);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch {
      // Silently fail -- persistence is best-effort
      console.warn('Failed to save session data to IndexedDB');
    }
  }
  ```

- **Load Pattern (with expiry check):**
  ```typescript
  export async function loadSessionData(): Promise<SessionData | null> {
    try {
      const db = await openSessionDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(SESSION_KEY);
      const data = await new Promise<SessionData | null>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
      });
      db.close();

      if (!data) return null;

      // Expiry check
      if (Date.now() - data.savedAt > SESSION_EXPIRY_MS) {
        await clearSessionData();
        return null;
      }

      // Validate photo blob is readable
      if (!(data.photo instanceof Blob) || data.photo.size === 0) {
        await clearSessionData();
        return null;
      }

      return data;
    } catch {
      // IndexedDB unavailable or corrupted -- graceful degradation
      console.warn('Failed to load session data from IndexedDB');
      return null;
    }
  }
  ```

- **Clear Pattern:**
  ```typescript
  export async function clearSessionData(): Promise<void> {
    try {
      const db = await openSessionDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(SESSION_KEY);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch {
      console.warn('Failed to clear session data from IndexedDB');
    }
  }
  ```

- **Session Recovery Hook:**
  ```typescript
  // src/hooks/useSessionRecovery.ts
  'use client';
  import { useState, useEffect, useCallback } from 'react';
  import { loadSessionData, clearSessionData, type SessionData } from '@/lib/persistence/session-db';

  export function useSessionRecovery() {
    const [recoveredSession, setRecoveredSession] = useState<SessionData | null>(null);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
      let cancelled = false;
      loadSessionData().then((data) => {
        if (!cancelled) {
          setRecoveredSession(data);
          setIsChecking(false);
        }
      }).catch(() => {
        if (!cancelled) {
          setIsChecking(false);
        }
      });
      return () => { cancelled = true; };
    }, []);

    const clearRecovery = useCallback(async () => {
      await clearSessionData();
      setRecoveredSession(null);
    }, []);

    return { recoveredSession, isChecking, clearRecovery };
  }
  ```

- **Photo Page Integration (key changes to page.tsx):**
  ```typescript
  // Add to src/app/consultation/photo/page.tsx
  import { useSessionRecovery } from '@/hooks/useSessionRecovery';
  import { saveSessionData, clearSessionData } from '@/lib/persistence/session-db';
  import { SessionRecoveryBanner } from '@/components/consultation/SessionRecoveryBanner';

  // Inside component:
  const { recoveredSession, isChecking, clearRecovery } = useSessionRecovery();

  // On mount: if recoveredSession exists, set photo state from recovered data
  useEffect(() => {
    if (recoveredSession) {
      setCapturedPhoto(recoveredSession.photo);
      setPhotoPreview(recoveredSession.photoPreview);
      // Restore other state: gender, guestSessionId, consultationId
    }
  }, [recoveredSession]);

  // On photo confirm (modify existing handlePhotoConfirm):
  // Add save to IndexedDB (fire-and-forget, non-blocking):
  saveSessionData({
    photo: capturedPhoto!,
    photoPreview: photoPreview!,
    gender: selectedGender,
    guestSessionId: getOrCreateGuestSessionId(),
    consultationId: consId,
    savedAt: Date.now(),
  });

  // On successful upload completion:
  await clearSessionData();

  // On retake from recovery:
  const handleRecoveryRetake = async () => {
    await clearRecovery();
    // Reset to capture mode
  };
  ```

- **photoPreview Generation:** When the photo is captured or uploaded, generate a base64 data URL using `URL.createObjectURL(blob)` or `FileReader.readAsDataURL()`. Store this alongside the blob in IndexedDB so that on recovery, the preview can be displayed immediately without re-reading the blob. Use `URL.createObjectURL()` for display (already done in current photo page), and store a data URL for persistence since object URLs don't survive page reloads.

- **iOS Safari Memory Pressure Handling:** iOS Safari may evict IndexedDB data under memory pressure. The `loadSessionData()` function handles this by catching all errors and returning null. Key scenarios:
  - `indexedDB.open()` fails: returns null (user starts fresh)
  - Transaction fails during read: returns null (user starts fresh)
  - Blob data is corrupted (size 0 or not instanceof Blob): clears DB, returns null
  - `QuotaExceededError` on write: caught silently, upload still proceeds
  - **No user-facing error is ever shown for IndexedDB failures** -- this is purely a convenience feature

- **Guest Session ID Coordination with Story 2.6:** Story 2.6 already persists `mynewstyle_guest_session_id` in localStorage. This story reuses that same ID. The `getOrCreateGuestSessionId()` function from Story 2.6 already handles this correctly. The SessionData includes `guestSessionId` so it can be recovered alongside the photo.

- **When to Save vs When to Clear:**
  - **SAVE:** After photo capture/upload confirmation (when user taps "Usar esta foto"), save photo + context to IndexedDB. This is fire-and-forget -- if it fails, the upload still proceeds.
  - **CLEAR:** After successful Supabase upload AND ready to navigate to next step. Also clear on explicit "Tirar outra" retake.
  - **DO NOT save** during the upload process itself -- the save happens at confirmation time, before upload starts.

### Previous Story Intelligence (Story 2.6 -- Photo Upload to Storage)

**What was built in Story 2.6:**
- `src/lib/supabase/client.ts`: Supabase browser client (first Supabase integration)
- `src/lib/photo/upload.ts`: Photo upload utility with retry logic (2 retries, 1s delay)
- `src/components/consultation/PhotoUpload.tsx`: Upload progress/error UI (stateless, props-driven)
- Modified `src/app/consultation/photo/page.tsx`: Added upload flow, `uploadState`, `guestSessionId` in localStorage, `consultationId` in useRef
- 391 total tests passing (358 existing from 2.1-2.5 + 33 new)
- Guest session ID already persisted to localStorage under key `mynewstyle_guest_session_id`
- `consultationId` generated fresh per consultation flow using `crypto.randomUUID()`

**Key patterns from Story 2.6:**
- Upload state machine: `'idle' | 'uploading' | 'done' | 'error'`
- `handlePhotoConfirm` triggers upload, then sets `isConfirmed = true` on success
- `PhotoUpload` component receives `isUploading`, `error`, `onRetry`, `onCancel` props
- `getOrCreateGuestSessionId()` checks localStorage first before generating new UUID
- `consultationId` stored in `useRef` to avoid re-renders
- Indeterminate spinner with "A enviar a foto..." Portuguese text
- Error state: "Erro ao enviar a foto" with retry/cancel buttons

**Critical integration points:**
- `handlePhotoConfirm` in `page.tsx` is where IndexedDB save should be added (before upload starts)
- The page already manages `capturedPhoto` (Blob), `photoPreview` (string), `selectedGender` state
- Recovery on mount should check IndexedDB BEFORE showing capture UI -- if session exists, jump to PhotoReview
- The `isConfirmed` state should NOT be set from recovery -- user must re-confirm with "Usar esta foto"
- Upload result should also be saved to IndexedDB so that if user navigates away after upload but before questionnaire, the upload doesn't need to repeat

**DO NOT modify these Story 2.6 files:**
- `src/lib/supabase/client.ts` (Supabase client is stable)
- `src/lib/photo/upload.ts` (upload utility is stable)
- `src/components/consultation/PhotoUpload.tsx` (upload UI component is stable)

**Files that WILL need modification:**
- `src/app/consultation/photo/page.tsx` -- Add session recovery on mount, IndexedDB save on confirm, clear on navigate

### Library & Framework Requirements

| Library | Version | Notes |
|---------|---------|-------|
| Next.js | 16.1.6 | App Router, `src/` directory, server/client components |
| React | 19.2.3 | Client components with `'use client'` for browser API access |
| Tailwind CSS | v4+ | Theme via CSS variables, utility classes |
| Lucide React | 0.575.0+ | RefreshCw (recovery icon), CheckCircle2 (confirm), Camera (retake) |

**NO NEW DEPENDENCIES.** IndexedDB is a native browser API. No `idb` or `dexie` library needed -- use the raw IndexedDB API directly for minimal bundle impact and zero dependency risk. The project already has all required libraries from previous stories.

### File Structure Requirements

```
src/
+-- app/
|   +-- consultation/
|   |   +-- photo/
|   |       +-- page.tsx                    # MODIFY: Add session recovery + IndexedDB persistence
|   |       +-- layout.tsx                  # NO CHANGES
|   +-- layout.tsx                          # NO CHANGES
|   +-- page.tsx                            # NO CHANGES
|   +-- globals.css                         # NO CHANGES
+-- components/
|   +-- consultation/
|   |   +-- SessionRecoveryBanner.tsx      # NEW: Recovery confirmation UI
|   |   +-- PhotoUpload.tsx                # NO CHANGES (from 2.6)
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
|   +-- useSessionRecovery.ts              # NEW: Session recovery hook
|   +-- useTheme.ts                         # NO CHANGES
|   +-- useCamera.ts                        # NO CHANGES
+-- lib/
|   +-- persistence/
|   |   +-- session-db.ts                  # NEW: IndexedDB persistence utility
|   +-- supabase/
|   |   +-- client.ts                      # NO CHANGES (from 2.6)
|   +-- photo/
|   |   +-- upload.ts                      # NO CHANGES (from 2.6)
|   |   +-- detect-webview.ts              # NO CHANGES (from 2.1)
|   |   +-- exif.ts                        # NO CHANGES (from 2.2)
|   |   +-- validate-file.ts              # NO CHANGES (from 2.2)
|   |   +-- compress.ts                    # NO CHANGES (from 2.3)
|   |   +-- validate.ts                    # NO CHANGES (from 2.4)
|   +-- motion.ts                           # NO CHANGES
+-- test/
    +-- session-db.test.ts                 # NEW: IndexedDB utility tests
    +-- use-session-recovery.test.ts       # NEW: Recovery hook tests
    +-- session-recovery-banner.test.tsx   # NEW: Banner component tests
    +-- photo-page-recovery.test.tsx       # NEW: Page recovery integration tests
    +-- photo-upload-util.test.ts          # NO CHANGES (from 2.6)
    +-- photo-upload.test.tsx              # NO CHANGES (from 2.6)
    +-- photo-page-upload.test.tsx         # NO CHANGES (from 2.6)
    +-- photo-review.test.tsx              # NO CHANGES (from 2.5)
    +-- photo-page-review.test.tsx         # NO CHANGES (from 2.5)
    +-- (all other existing test files - no changes)
```

[Source: architecture.md#6.1 -- Project Structure]

### Project Structure Notes

- `src/lib/persistence/` is a NEW directory. IndexedDB utilities are separated from `src/lib/photo/` because persistence is a cross-cutting concern that will be reused by Epic 3 (questionnaire session persistence uses the same IndexedDB pattern).
- `src/hooks/useSessionRecovery.ts` follows the existing custom hooks pattern (useCamera.ts, useTheme.ts).
- `src/components/consultation/SessionRecoveryBanner.tsx` is a simple stateless UI component receiving callbacks via props. Consistent with PhotoUpload.tsx pattern from Story 2.6.
- The recovery flow renders within the same `/consultation/photo` page based on state -- NO separate route.
- No Zustand store involvement. All state management is local to the page component. Epic 3 Story 3.1 will create the Zustand consultation store with session persistence, which will supersede the local state pattern established here.

### Testing Requirements

- Use existing Vitest + React Testing Library setup (configured in Story 1.1)
- Test file locations: `src/test/session-db.test.ts`, `src/test/use-session-recovery.test.ts`, `src/test/session-recovery-banner.test.tsx`, `src/test/photo-page-recovery.test.tsx`

- **Mocking IndexedDB for utility tests:** Use `fake-indexeddb` or manual mock:
  ```typescript
  // Option 1: Use fake-indexeddb (if already a dev dependency)
  import 'fake-indexeddb/auto';

  // Option 2: Manual mock (preferred -- no new dependency)
  const mockIndexedDB = {
    open: vi.fn(),
    deleteDatabase: vi.fn(),
  };
  Object.defineProperty(window, 'indexedDB', { value: mockIndexedDB });
  ```
  Check if `fake-indexeddb` is already a dev dependency. If not, create a manual mock that simulates IDBDatabase, IDBTransaction, and IDBObjectStore behavior. The mock should support `put()`, `get()`, `delete()` operations.

- **Mocking for hook tests:**
  ```typescript
  vi.mock('@/lib/persistence/session-db', () => ({
    loadSessionData: vi.fn(),
    clearSessionData: vi.fn(),
    saveSessionData: vi.fn(),
  }));
  ```

- **Mocking for page integration tests:** Mock persistence + all existing mocks from Story 2.6:
  ```typescript
  vi.mock('@/lib/persistence/session-db', () => ({
    loadSessionData: vi.fn(),
    clearSessionData: vi.fn(),
    saveSessionData: vi.fn(),
  }));
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

- Minimum 36 tests across the four new test files
- Run existing test suite to ensure no regressions (expect 391 existing tests to still pass)

### UX Design Specifications

- **Session Recovery:** UX spec section on Mobile UX explicitly states: "User switches apps during processing -> session must persist, resume on return." This story implements the photo persistence portion of that requirement. [Source: ux-design.md#Mobile UX, Chaos Monkey method]
- **Recovery UI:** Show a banner/card informing the user their photo was found. Not a modal -- non-blocking. User can dismiss and start fresh. Pattern inspired by "Algo correu mal. Tentar de novo?" error recovery pattern. [Source: ux-design.md#8.2]
- **Button Sizing:** Minimum 48px height for touch targets on mobile. [Source: ux-design.md#4.1]
- **Mobile UX:** Bottom-anchored CTAs in thumb zone. Design for 375px width primary target. [Source: ux-design.md#5]
- **Reduced Motion:** Respect `prefers-reduced-motion` -- any recovery banner entrance animation should be disabled. [Source: ux-design.md#6]

### Content Reference (Portuguese)

| Element | Text |
|---------|------|
| Recovery banner heading | Encontramos a sua foto anterior |
| Recovery banner subtext | Deseja continuar com esta foto? |
| Continue button | Continuar |
| Retake button | Tirar outra foto |
| Checking session message | A verificar sessao anterior... |

**CRITICAL:** All Portuguese text must use correct diacritical marks:
- "sessao" should be "sessao" (session) -- note: proper form is "sessao" with tilde on 'a'
- "foto" -- no diacritics needed
- "anterior" -- no diacritics needed
- Maintain consistency with previous stories' Portuguese conventions

### Critical Guardrails

- **DO NOT** install any new npm dependencies. Use the raw IndexedDB browser API directly.
- **DO NOT** use `localStorage` or `sessionStorage` for the photo blob. Blobs are too large (up to 500KB). IndexedDB is the correct storage for binary data. [Source: architecture.md#6.3]
- **DO NOT** hardcode hex colors. Use theme CSS variables exclusively.
- **DO NOT** create a new page route for recovery. Recovery renders within the existing `/consultation/photo` page.
- **DO NOT** modify any files from Epic 1 (layout.tsx, globals.css, landing page, ui components, landing components, ThemeProvider, Footer, test setup, motion.ts).
- **DO NOT** modify Story 2.1-2.5 files (PhotoCapture, GalleryUpload, compress, validate, PhotoReview, etc.).
- **DO NOT** modify Story 2.6 files (Supabase client, upload utility, PhotoUpload component).
- **DO NOT** create or modify the Zustand consultation store. That is Epic 3 (Story 3.1).
- **DO NOT** persist sensitive data in IndexedDB. Photo blobs and UUIDs are acceptable. No auth tokens, passwords, or payment data.
- **DO NOT** show error UI for IndexedDB failures. This is a convenience feature -- graceful degradation to "no recovery" is the correct behavior.
- **DO NOT** block the upload flow on IndexedDB save. Save is fire-and-forget.
- **DO NOT** re-run compression or validation on recovered photos. The photo was already compressed and validated before being saved.
- **DO** create `src/lib/persistence/session-db.ts` as the IndexedDB utility.
- **DO** create `src/hooks/useSessionRecovery.ts` as the recovery hook.
- **DO** create `src/components/consultation/SessionRecoveryBanner.tsx` as the recovery UI.
- **DO** modify `src/app/consultation/photo/page.tsx` to add persistence and recovery.
- **DO** use correct Portuguese diacritical marks on ALL user-facing strings.
- **DO** follow the existing test patterns from Stories 2.1-2.6 (Vitest + RTL).
- **DO** ensure 391 existing tests still pass (zero regressions).
- **DO** handle all IndexedDB errors silently -- never crash, never show error to user.

### Cross-Story Dependencies

- **Story 2.1 (Camera Capture with Guidance) -- DONE:** Provides raw photo blobs from camera capture. PhotoCapture component not modified.
- **Story 2.2 (Gallery Upload Alternative) -- DONE:** Provides EXIF-corrected blobs from gallery upload. GalleryUpload component not modified.
- **Story 2.3 (Client-Side Photo Compression) -- DONE:** Compresses photos to <500KB. Recovered photos are already compressed -- do NOT re-compress.
- **Story 2.4 (Real-Time Photo Validation) -- DONE:** Validates photos for face detection. Recovered photos are already validated -- do NOT re-validate.
- **Story 2.5 (Photo Review Screen) -- DONE:** Provides PhotoReview component. Recovery shows the recovered photo IN the PhotoReview component.
- **Story 2.6 (Photo Upload to Storage) -- DONE:** Provides upload utility, guest session ID in localStorage, consultation ID. This story saves the same IDs to IndexedDB for recovery and reuses `getOrCreateGuestSessionId()`.
- **Story 3.1 (Questionnaire Engine):** Will create Zustand store with `persist` middleware for session persistence. The Zustand store will likely supersede the local IndexedDB approach for questionnaire data, but photo blob storage will remain in IndexedDB (Zustand persist uses localStorage which cannot handle blobs).
- **Story 3.6 (Questionnaire Completion & Data Submission):** Will combine photo URL + questionnaire data for API submission. The recovered session's `uploadResult` ensures the photo URL is available.
- **Story 8.4 (Guest Session Management):** Will formalize guest session handling. The guest session ID pattern established in Story 2.6 and reused here is forward-compatible.
- **Story 1.1 (Design System):** All styling depends on the design system tokens established in Story 1.1.

### Performance Targets

- IndexedDB save: <50ms for a 500KB photo blob (IndexedDB is async and handles blobs natively)
- IndexedDB load: <100ms for session data retrieval
- Page mount recovery check: <200ms total (should not noticeably delay page render)
- No visible UI jank during save (fire-and-forget pattern)
- No additional network requests (IndexedDB is local)
- Memory: recovered photo blob replaces capture -- no duplication in memory
- Bundle size impact: ~2KB for session-db.ts + hook (no external dependencies)

### Git Intelligence

Recent commit patterns:
- `feat(epic-2): implement story 2-6-photo-upload-to-storage`
- `feat(epic-2): implement story 2-5-photo-review-screen`
- `feat(epic-2): implement story 2-4-real-time-photo-validation`
- `feat(epic-2): implement story 2-3-client-side-photo-compression`
- `feat(epic-2): implement story 2-2-gallery-upload-alternative`
- `feat(epic-2): implement story 2-1-camera-capture-with-guidance`

Suggested commit message: `feat(epic-2): implement story 2-7-photo-persistence-for-session-recovery`

### IndexedDB Browser Compatibility Notes

| Browser | IndexedDB Support | Notes |
|---------|------------------|-------|
| iOS Safari 15+ | Full support | May evict under memory pressure -- handled by graceful degradation |
| Chrome Android 90+ | Full support | No known issues with blob storage |
| Firefox (latest 2) | Full support | Persistent storage by default |
| Edge (latest 2) | Full support | Chromium-based, same as Chrome |

**iOS Safari Specific Concerns:**
- Safari may evict IndexedDB data when device is low on storage -- this is by design and handled by returning null from loadSessionData()
- Safari in Private Browsing: IndexedDB is available but data is cleared on tab close -- acceptable behavior for session recovery
- Safari WebView (opened from Instagram/Facebook): IndexedDB may have restricted access -- detect WebView (already handled in Story 2.1) and skip recovery attempt

### Future Considerations (NOT in scope for this story)

- **Epic 3 Zustand Integration:** When Story 3.1 creates the Zustand consultation store with `persist` middleware, the questionnaire state will be persisted via Zustand. The photo blob will remain in IndexedDB since Zustand persist uses localStorage (cannot store blobs). The two persistence mechanisms will coexist.
- **Epic 8 Auth Migration:** When authenticated users are supported, the session recovery should check if the user is authenticated and potentially restore from server-side state instead of IndexedDB. For now, guest-only recovery is sufficient.
- **Multi-tab Safety:** If user has multiple tabs open, IndexedDB writes from one tab could overwrite another. This is acceptable for MVP -- single active consultation assumption.

### References

- [Source: architecture.md#6.3] -- Session Persistence: Photo blob stored in IndexedDB, rehydrate on app return
- [Source: architecture.md#6.1] -- Project Structure: src/lib/, src/hooks/, src/components/consultation/
- [Source: architecture.md#6.2] -- State Management: local state for photo flow, Zustand in Epic 3
- [Source: architecture.md#8.2] -- Image Optimization: client-side compression, photos <500KB
- [Source: ux-design.md#Mobile UX] -- Chaos Monkey: session must persist on app switch/return
- [Source: ux-design.md#8.2] -- Error States: retry pattern for failures, graceful degradation
- [Source: ux-design.md#4.1] -- Component Library: Button variants, min 48px height
- [Source: ux-design.md#5] -- Responsive Breakpoints: 375px primary mobile target
- [Source: ux-design.md#6] -- Accessibility: prefers-reduced-motion support
- [Source: prd.md] -- FR43: Gracefully handle photo upload failures with guidance for retry
- [Source: epics-and-stories.md#S2.7] -- Story 2.7: Photo Persistence for Session Recovery acceptance criteria
- [Source: epics-and-stories.md#E2] -- Epic 2 elicitation: Chaos Monkey (camera fails, network issues), JTBD (give AI enough data)
- [Source: 2-6-photo-upload-to-storage.md] -- Previous story: upload utility, guest session ID in localStorage, 391 tests passing

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- No blocking issues encountered during implementation.
- Existing test files needed session-db mock and waitFor for session recovery check -- updated 6 test files to add persistence mock and async waits, zero regressions.

### Completion Notes List

- **Task 1:** Created `src/lib/persistence/session-db.ts` with IndexedDB persistence utility. Database: `mynewstyle-session`, store: `consultation-session`, key: `current`. Implements save/load/clear with 24-hour expiry and graceful error handling. All IndexedDB errors caught silently -- no user-facing errors. 12 unit tests passing.
- **Task 2:** Created `src/hooks/useSessionRecovery.ts` hook. Checks IndexedDB on mount, returns `{ recoveredSession, isChecking, clearRecovery }`. Uses effect cleanup to prevent state updates on unmounted component. 8 unit tests passing.
- **Task 3:** Modified `src/app/consultation/photo/page.tsx` to integrate persistence. On mount: checks IndexedDB via useSessionRecovery. If recovered session found: shows SessionRecoveryBanner. On "Continuar": sets recovered photo into state and shows PhotoReview. On "Tirar outra foto": clears IndexedDB and resets to capture. On photo confirm: saves to IndexedDB (fire-and-forget) then uploads. On successful upload: clears IndexedDB. 10 integration tests passing.
- **Task 4:** Created `src/components/consultation/SessionRecoveryBanner.tsx`. Non-modal banner with "Encontramos a sua foto anterior" heading. Two buttons: "Continuar" (primary, bg-accent) and "Tirar outra foto" (secondary, border). All Portuguese text with correct diacritical marks. ARIA role="status", aria-live="polite". Min 48px touch targets. Theme CSS variables only. Respects prefers-reduced-motion. 6 component tests passing.
- **Task 5:** 36 new tests across 4 test files. Updated 6 existing test files to add session-db mock. Full regression suite: 427 tests passing (391 existing + 36 new), 32 test files, zero regressions.

### Senior Developer Review (AI)

**Reviewer:** Fusuma (via Claude Opus 4.6)
**Date:** 2026-03-01
**Outcome:** APPROVED with fixes applied

**AC Validation:**
- AC1 (Photo stored in IndexedDB on confirm): IMPLEMENTED -- saveSessionData called in performUpload, fire-and-forget
- AC2 (Rehydrate on reload): IMPLEMENTED -- useSessionRecovery checks IndexedDB on mount
- AC3 (Clear on complete/discard): IMPLEMENTED -- clearSessionData on successful upload and on "Tirar outra foto"
- AC4 (iOS Safari graceful handling): IMPLEMENTED -- all IndexedDB errors caught, return null, no user-facing errors
- AC5 (Persist flow state): IMPLEMENTED -- gender, guestSessionId, consultationId, photoPreview stored alongside photo
- AC6 (Single DB/store): IMPLEMENTED -- mynewstyle-session / consultation-session / current
- AC7 (PhotoReview with recovered photo): IMPLEMENTED -- recovery shows banner, "Continuar" transitions to PhotoReview
- AC8 (Portuguese text): IMPLEMENTED -- all user-facing text in pt-BR with correct diacritical marks
- AC9 (Browser compatibility): IMPLEMENTED -- uses standard IndexedDB API, no vendor-specific features
- AC10 (24-hour expiry): IMPLEMENTED -- savedAt timestamp checked, auto-clears expired data

**Issues Found & Fixed:**
1. [MEDIUM][FIXED] photoPreview saved as Object URL (non-persistent) instead of base64 data URL in performUpload. Fixed by adding FileReader.readAsDataURL conversion before IndexedDB save.
2. [MEDIUM][FIXED] loadSessionData missing metadata field validation. Added type-checking for guestSessionId, consultationId, gender, photoPreview -- returns null and clears data if fields are invalid/missing.
3. [MEDIUM][FIXED] Quote style inconsistency (single quotes in new files vs project double-quote Prettier config). Fixed by running Prettier on all new/modified files.

**Test Verification:** 427 tests passing, 32 test files, zero regressions after fixes.

### Change Log

- 2026-03-01: Implemented Story 2.7 -- Photo Persistence for Session Recovery. Added IndexedDB persistence utility, session recovery hook, recovery banner component, and integrated persistence into photo page flow. 36 new tests, 427 total passing.
- 2026-03-01: Code review fixes -- photoPreview now persists as base64 data URL, added metadata field validation in loadSessionData, fixed Prettier formatting.

### File List

**New files:**
- `src/lib/persistence/session-db.ts` -- IndexedDB persistence utility (save/load/clear session data)
- `src/hooks/useSessionRecovery.ts` -- Session recovery hook (checks IndexedDB on mount)
- `src/components/consultation/SessionRecoveryBanner.tsx` -- Recovery confirmation UI banner
- `src/test/session-db.test.ts` -- IndexedDB utility tests (12 tests)
- `src/test/use-session-recovery.test.ts` -- Recovery hook tests (8 tests)
- `src/test/session-recovery-banner.test.tsx` -- Banner component tests (6 tests)
- `src/test/photo-page-recovery.test.tsx` -- Page recovery integration tests (10 tests)

**Modified files:**
- `src/app/consultation/photo/page.tsx` -- Added session recovery on mount, IndexedDB save on confirm, clear on navigate
- `src/test/photo-page-upload.test.tsx` -- Added session-db mock, waitFor on session check
- `src/test/photo-page-integration.test.tsx` -- Added session-db mock, waitFor on session check
- `src/test/photo-page-compression.test.tsx` -- Added session-db mock, waitFor on session check
- `src/test/photo-page-validation.test.tsx` -- Added session-db mock, waitFor on session check
- `src/test/photo-page-review.test.tsx` -- Added session-db mock, waitFor on session check
- `src/test/camera-capture.test.tsx` -- Added session-db mock, waitFor on session check
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- Updated story status
- `_bmad-output/implementation-artifacts/2-7-photo-persistence-for-session-recovery.md` -- Updated tasks, status, Dev Agent Record
