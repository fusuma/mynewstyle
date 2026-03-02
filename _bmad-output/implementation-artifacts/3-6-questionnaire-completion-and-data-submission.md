# Story 3.6: Questionnaire Completion & Data Submission

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want questionnaire data packaged and submitted with the photo for AI processing,
so that the consultation pipeline receives all user inputs in a structured format and the user transitions to the processing screen.

## Acceptance Criteria

1. When the questionnaire is completed, all responses are collected into a structured JSON object (`QuestionnaireResponses`) mapping question IDs to their answer values (string, string[], or number)
2. The submission payload combines: questionnaire responses, photo URL (from Supabase Storage, uploaded in Story 2.6), and gender selection -- all sourced from the `ConsultationStore`
3. A `POST /api/consultation/start` API route exists that accepts the combined payload (`{ gender, photoUrl, questionnaire }`) and returns `{ consultationId }` with a `201` status code
4. The API route validates the incoming payload using a Zod schema: gender must be `'male'` or `'female'`, photoUrl must be a non-empty string, questionnaire must be a non-empty object with string keys
5. The API route generates a UUID `consultationId`, stores it (in-memory map for now -- database integration deferred to Epic 4), and returns it in the response
6. On successful API response, the `consultationId` is stored in `ConsultationStore` and the user is navigated to `/consultation/processing`
7. During submission, a loading state is displayed preventing duplicate submissions (submit button disabled, loading indicator shown)
8. On network failure or non-2xx response, a toast error is shown ("Algo correu mal. Tente novamente.") and the user can retry -- questionnaire data is NOT lost
9. The submission includes retry logic: up to 2 automatic retries with 1-second delay before showing the error toast to the user
10. All existing 669 tests pass with zero regressions after implementation

## Tasks / Subtasks

- [x] Task 1: Create the consultation start API route (AC: 3, 4, 5)
  - [x] Create `src/app/api/consultation/start/route.ts` with POST handler
  - [x] Define Zod schema `ConsultationStartSchema` for request validation: `{ gender: z.enum(['male', 'female']), photoUrl: z.string().min(1), questionnaire: z.record(z.string(), z.union([z.string(), z.array(z.string()), z.number()])) }`
  - [x] Generate UUID for `consultationId` using `crypto.randomUUID()`
  - [x] Store consultation in an in-memory `Map<string, ConsultationRecord>` (placeholder until Supabase integration in Epic 4)
  - [x] Return `{ consultationId }` with status 201
  - [x] Return `{ error }` with status 400 on validation failure
  - [x] Add `ConsultationStartPayload` and `ConsultationStartResponse` types to `src/types/index.ts`

- [x] Task 2: Create submission service with retry logic (AC: 1, 2, 8, 9)
  - [x] Create `src/lib/consultation/submit.ts` with `submitConsultation(payload: ConsultationStartPayload): Promise<ConsultationStartResponse>` function
  - [x] Implement retry logic: up to 2 retries with 1-second delay between attempts using a simple async retry wrapper
  - [x] On final failure, throw a typed error that the caller can catch and display
  - [x] Export `ConsultationSubmissionError` class extending `Error` with `retryable: boolean` property

- [x] Task 3: Update questionnaire page to handle submission (AC: 1, 2, 6, 7, 8)
  - [x] Modify `src/app/consultation/questionnaire/page.tsx` `handleComplete` callback:
    - Gather `gender`, `photoPreview` (as photoUrl proxy for now), and `questionnaire` responses from `ConsultationStore`
    - Call `submitConsultation` with the combined payload
    - On success: store `consultationId` in `ConsultationStore`, navigate to `/consultation/processing`
    - On failure: show error toast via `sonner`, keep user on questionnaire completion state
  - [x] Add `isSubmitting` state to prevent duplicate submissions
  - [x] Show a loading overlay/spinner during submission with text "A enviar as suas respostas..."
  - [x] Add `setConsultationId` action to `ConsultationStore` if not already present

- [x] Task 4: Update ConsultationStore with submission-related actions (AC: 6)
  - [x] Add `setConsultationId: (id: string) => void` action to `ConsultationStore` interface and implementation
  - [x] Ensure `consultationId` is included in the persisted state (already in `partialize`)

- [x] Task 5: Create processing page placeholder (AC: 6)
  - [x] Create `src/app/consultation/processing/page.tsx` as a minimal placeholder that reads `consultationId` from store
  - [x] Create `src/app/consultation/processing/layout.tsx` with appropriate metadata
  - [x] If `consultationId` is null, redirect to `/consultation/questionnaire`
  - [x] Display a simple "Processing..." message with the `consultationId` (full processing screen is Epic 4)

- [x] Task 6: Write tests (AC: 1-10)
  - [x] Create `src/test/consultation-submit.test.ts` for the submission service:
    - Test successful submission returns consultationId
    - Test retry on first failure, success on second attempt
    - Test retry on first two failures, success on third attempt
    - Test throws ConsultationSubmissionError after 3 total failures (1 initial + 2 retries)
    - Test payload structure matches expected format
  - [x] Create `src/test/api-consultation-start.test.ts` for the API route:
    - Test valid payload returns 201 with consultationId (UUID format)
    - Test missing gender returns 400
    - Test missing photoUrl returns 400
    - Test empty questionnaire returns 400
    - Test invalid gender value returns 400
  - [x] Create `src/test/questionnaire-completion.test.tsx` for the page integration:
    - Test handleComplete gathers all data from store and submits
    - Test loading state shown during submission
    - Test successful submission navigates to /consultation/processing
    - Test failed submission shows error toast
    - Test duplicate submission prevented while isSubmitting is true
  - [x] Run full test suite to verify zero regressions

- [x] Task 7: Run full test suite and verify zero regressions (AC: 10)
  - [x] Run `npx vitest run` to execute all tests
  - [x] Verify all 669 existing tests pass + new tests pass
  - [x] Verify no TypeScript compilation errors

## Dev Notes

### Architecture Compliance

- **API Route Location:** `src/app/api/consultation/start/route.ts` -- follows Next.js App Router convention for API routes. This is the first API route in the project. [Source: architecture.md#5.1, architecture.md#6.1]
- **Submission Service Location:** `src/lib/consultation/submit.ts` -- client-side service for calling the API. Follows the `lib/` pattern for utility functions. [Source: architecture.md#6.1]
- **State Management:** `ConsultationStore` (Zustand, persisted to sessionStorage) holds all consultation flow state. The `questionnaire` field already stores responses via `setQuestionnaireComplete`. This story adds `setConsultationId` action. [Source: architecture.md#6.2]
- **No New Dependencies:** `zod` is NOT currently installed. Use the lightweight built-in validation approach OR install `zod` as it will be needed extensively in Epic 4 (AI pipeline schemas). **Decision: Install `zod` now** -- it is the documented validation library in the architecture (architecture.md#4.4, #5.1) and will be reused across all API routes. This is the single new dependency for this story.
- **Toast Notifications:** `sonner` is already installed (package.json). Use `toast.error()` for submission failures.

### Technical Requirements

- **API Route Pattern (Next.js App Router):**
  ```typescript
  // src/app/api/consultation/start/route.ts
  import { NextRequest, NextResponse } from 'next/server';

  export async function POST(request: NextRequest) {
    const body = await request.json();
    // Validate with Zod schema
    // Generate consultationId
    // Store in-memory (placeholder)
    // Return { consultationId }
  }
  ```

- **Payload Structure:**
  ```typescript
  interface ConsultationStartPayload {
    gender: 'male' | 'female';
    photoUrl: string;
    questionnaire: Record<string, string | string[] | number>;
  }

  interface ConsultationStartResponse {
    consultationId: string;
  }
  ```

- **In-Memory Storage (Placeholder):**
  The API route stores consultations in a module-level `Map`. This is intentionally ephemeral -- it works for development and testing. Supabase database integration replaces this in Epic 4 (Story 4.1+). The map stores:
  ```typescript
  interface ConsultationRecord {
    id: string;
    gender: 'male' | 'female';
    photoUrl: string;
    questionnaireResponses: Record<string, string | string[] | number>;
    status: 'pending';
    createdAt: string;
  }
  ```

- **Retry Logic Pattern:**
  ```typescript
  async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 2,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    throw lastError;
  }
  ```

- **Photo URL Source:**
  In the current codebase, `photoPreview` (a base64 data URL) is stored in `ConsultationStore` (from Story 2.5). The actual Supabase Storage URL from Story 2.6 is available but the store currently holds `photoPreview` as the primary reference. For this story, use `photoPreview` as the `photoUrl` value in the submission payload. When Epic 4 connects to Supabase, this will be replaced with the actual storage URL. The API route should accept any string URL format.

- **Navigation After Submission:**
  The questionnaire page (`src/app/consultation/questionnaire/page.tsx`) currently navigates to `/consultation/processing` in the `handleComplete` callback. This story modifies that callback to:
  1. Call the API first
  2. Store the returned `consultationId`
  3. THEN navigate to `/consultation/processing`

  The processing page is a new placeholder route created in this story.

### Previous Story Intelligence (Story 3.5 -- Progress Bar & Conversational Tone)

**What was built in Story 3.5:**
- Enhanced progress bar with estimated time remaining and milestone-based encouragement messages
- Exposed `totalActiveQuestions` and `currentActiveIndex` from `useQuestionnaire` hook
- Created `getEncouragementMessage` helper function
- Total test count: 669 tests (642 from prior + 27 new)

**Key learnings from Story 3.5:**
- Pre-existing TypeScript errors in `CameraPermissionPrompt.tsx` and `SessionRecoveryBanner.tsx` (Framer Motion type issues from Epic 2) -- not related to this story, ignore them
- The `QuestionnaireFlow` component calls `onComplete(responses)` when all questions are answered. The `onComplete` handler in `page.tsx` is where submission logic belongs.
- The `useQuestionnaire` hook's `isComplete` state triggers the `onComplete` callback via useEffect. The hook does NOT reset -- once complete, it stays complete. This means submission can safely be triggered once.
- `sonner` is installed but may not yet have a `<Toaster>` provider in the root layout. Check and add if missing.

**Current QuestionnairePage.tsx handleComplete (lines 28-34):**
```tsx
const handleComplete = useCallback(
  (responses: QuestionnaireResponses) => {
    setQuestionnaireComplete(responses);
    router.push('/consultation/processing');
  },
  [setQuestionnaireComplete, router]
);
```
This currently navigates immediately. This story adds the API call between `setQuestionnaireComplete` and `router.push`.

### Project Structure Notes

```
src/
+-- app/
|   +-- api/
|   |   +-- consultation/
|   |       +-- start/
|   |           +-- route.ts                      # NEW: POST handler for consultation start
|   +-- consultation/
|       +-- questionnaire/
|       |   +-- page.tsx                           # MODIFIED: add submission logic
|       +-- processing/
|           +-- page.tsx                           # NEW: placeholder processing page
|           +-- layout.tsx                         # NEW: processing page metadata
+-- components/
|   +-- consultation/
|       +-- QuestionnaireFlow.tsx                  # NO CHANGES
+-- lib/
|   +-- consultation/
|       +-- submit.ts                              # NEW: submission service with retry
+-- stores/
|   +-- consultation.ts                            # MODIFIED: add setConsultationId action
+-- types/
|   +-- index.ts                                   # MODIFIED: add consultation payload types
+-- test/
    +-- consultation-submit.test.ts                # NEW: submission service tests
    +-- api-consultation-start.test.ts             # NEW: API route tests
    +-- questionnaire-completion.test.tsx           # NEW: page integration tests
```

### References

- [Source: epics-and-stories.md#S3.6] -- Story acceptance criteria: structured JSON, POST to /api/consultation/start, loading state, error handling
- [Source: architecture.md#5.1] -- API route: `POST /api/consultation/start` with `{ gender, photo (base64), questionnaire }` -> `{ consultationId, faceAnalysis }`
- [Source: architecture.md#6.1] -- Project structure: `src/app/api/` for API routes, `src/lib/` for utilities
- [Source: architecture.md#6.2] -- State management: Zustand `ConsultationStore` with `submitQuestionnaire` action, `startAnalysis` action
- [Source: architecture.md#6.3] -- Session persistence: Zustand persisted to sessionStorage, `consultationId` persisted to localStorage
- [Source: architecture.md#3.1] -- Data model: `consultations` table with `questionnaire_responses (jsonb)`, `gender`, `photo_url`, `status`
- [Source: architecture.md#4.4] -- Output validation: Zod schemas on all API inputs
- [Source: architecture.md#7.3] -- API security: Zod schemas on all API inputs, rate limiting
- [Source: prd.md#FR9] -- Lifestyle questionnaire: 5-8 questions, gender-tailored
- [Source: prd.md#FR11] -- Questionnaire completion under 2 minutes
- [Source: prd.md#FR40] -- User-friendly error messages when AI processing fails
- [Source: prd.md#FR41] -- Automatically retries failed operations (up to 2 attempts)
- [Source: prd.md#FR43] -- Gracefully handles upload failures with clear guidance for retry
- [Source: ux-design.md#3.4] -- Questionnaire: one question per screen, progress bar at top
- [Source: ux-design.md#3.5] -- Processing screen: face mapping animation, educational tips
- [Source: ux-design.md#8.2] -- Error states: "Algo correu mal. Tentar de novo?" pattern
- [Source: 3-5-progress-bar-and-conversational-tone.md] -- Previous story: 669 total tests, sonner already installed

### Library & Framework Requirements

| Library | Version | Usage in This Story |
|---------|---------|-------------------|
| react | 19.2.3 | Component rendering, hooks (useState, useCallback, useEffect) |
| next | 16.1.6 | App Router API routes (`NextRequest`, `NextResponse`), `useRouter` |
| zustand | 5.0.11 | ConsultationStore state management |
| sonner | 2.0.7 | Toast notifications for error messages |
| zod | latest | **NEW DEPENDENCY** -- API payload validation (install: `npm install zod`) |
| vitest | 4.0.18 | Test runner |
| @testing-library/react | 16.3.2 | Component rendering in tests |

**ONE NEW DEPENDENCY:** `zod` -- required for API input validation per architecture spec. Will be reused extensively in Epic 4 for AI output schemas.

### File Structure Requirements

```
src/
+-- app/
|   +-- api/
|   |   +-- consultation/
|   |       +-- start/
|   |           +-- route.ts                      # NEW: POST /api/consultation/start
|   +-- consultation/
|       +-- processing/
|           +-- page.tsx                           # NEW: placeholder processing page
|           +-- layout.tsx                         # NEW: metadata for processing page
|       +-- questionnaire/
|           +-- page.tsx                           # MODIFIED: add submission + loading + error handling
+-- lib/
|   +-- consultation/
|       +-- submit.ts                              # NEW: submitConsultation() with retry logic
+-- stores/
|   +-- consultation.ts                            # MODIFIED: add setConsultationId action
+-- types/
|   +-- index.ts                                   # MODIFIED: add ConsultationStartPayload, ConsultationStartResponse
+-- test/
    +-- consultation-submit.test.ts                # NEW: submission service tests
    +-- api-consultation-start.test.ts             # NEW: API route tests
    +-- questionnaire-completion.test.tsx           # NEW: page integration tests
    +-- (all other existing test files)            # NO CHANGES expected
```

### Testing Requirements

- Verify all 669 existing tests pass after changes
- New tests organized in 3 files:

**`src/test/consultation-submit.test.ts` (submission service):**
  - Test successful submission: returns `{ consultationId }` with valid UUID
  - Test retry on first failure: succeeds on second attempt
  - Test retry on first two failures: succeeds on third attempt
  - Test throws `ConsultationSubmissionError` after 3 total failures
  - Test payload includes gender, photoUrl, and questionnaire fields
  - Test delay between retries (at least 1 second between attempts)

**`src/test/api-consultation-start.test.ts` (API route):**
  - Test valid payload returns 201 with `{ consultationId }` (UUID format)
  - Test missing `gender` field returns 400 with error message
  - Test missing `photoUrl` field returns 400 with error message
  - Test empty `questionnaire` object returns 400 with error message
  - Test invalid `gender` value (e.g., "other") returns 400
  - Test `consultationId` is a valid UUID format (regex test)
  - Test response Content-Type is application/json

**`src/test/questionnaire-completion.test.tsx` (page integration):**
  - Test `handleComplete` calls `submitConsultation` with correct payload from store
  - Test loading indicator shown during submission (isSubmitting state)
  - Test successful submission stores consultationId in ConsultationStore
  - Test successful submission navigates to `/consultation/processing`
  - Test failed submission shows error toast via sonner
  - Test failed submission does NOT navigate away from questionnaire
  - Test duplicate submission prevented while isSubmitting is true
  - Test questionnaire data preserved in store after failed submission

### Critical Guardrails

- **DO NOT** modify the questionnaire engine logic in `useQuestionnaire.ts`. The hook is complete and tested.
- **DO NOT** modify `QuestionnaireFlow.tsx`. The component correctly calls `onComplete` with responses.
- **DO NOT** modify any questionnaire content files (`male-questions.ts`, `female-questions.ts`).
- **DO NOT** modify any question card components from Story 3.4.
- **DO NOT** modify the progress bar or encouragement features from Story 3.5.
- **DO NOT** modify any files from Epic 1 or Epic 2.
- **DO NOT** modify any existing test files.
- **DO NOT** add Supabase database calls in this story -- use in-memory storage as placeholder.
- **DO NOT** implement the full processing screen -- create a minimal placeholder only.
- **DO NOT** hardcode any color values. Use Tailwind theme classes for any UI elements.
- **DO** install `zod` as the sole new dependency.
- **DO** use `sonner` toast for error messages (already installed).
- **DO** check if `<Toaster />` from sonner exists in root layout; add it if missing.
- **DO** use `crypto.randomUUID()` for consultation ID generation (available in Node.js 19+ and modern browsers).
- **DO** keep all user-facing text in Portuguese (pt-BR) matching existing patterns.
- **DO** persist `consultationId` to the store so it survives page refresh.
- **DO** run the full test suite to verify zero regressions.

### Cross-Story Dependencies

- **Story 1.1 (Design System) -- DONE:** Theme CSS variables, Tailwind config. Any new UI elements (loading overlay, error states) must use theme classes.
- **Story 2.5 (Photo Review) -- DONE:** `photoPreview` stored in ConsultationStore as base64 data URL.
- **Story 2.6 (Photo Upload to Storage) -- DONE:** Photo uploaded to Supabase Storage. The actual storage URL may be available; use `photoPreview` as proxy for now.
- **Story 2.7 (Photo Persistence) -- DONE:** Photo blob in IndexedDB, photoPreview in sessionStorage.
- **Story 3.1 (Questionnaire Engine) -- DONE:** `useQuestionnaire` hook, `QuestionnaireFlow` component, `onComplete` callback.
- **Story 3.2/3.3 (Questionnaire Content) -- DONE:** Male (6 questions) and female (7 questions) configs.
- **Story 3.5 (Progress Bar) -- DONE:** 669 total tests. Current `handleComplete` navigates directly to `/consultation/processing`.
- **Epic 4 (AI Pipeline) -- FUTURE:** Will replace in-memory storage with Supabase, add actual AI processing. The API route structure created here will be extended.

### Performance Targets

- API route response time: < 200ms (in-memory storage, no external calls)
- Submission + navigation: < 2 seconds total (including network round-trip)
- Retry delays: 1 second between attempts (total max wait: ~3 seconds for 2 retries)
- Zero layout shift during loading state transition
- No additional re-renders in QuestionnaireFlow (submission handled in page.tsx)

### Git Intelligence

Recent commit pattern:
- `feat(epic-3): implement story 3-5-progress-bar-and-conversational-tone`
- `feat(epic-3): implement story 3-4-question-card-components`
- `feat(epic-3): implement story 3-3-female-questionnaire-content`

Suggested commit message: `feat(epic-3): implement story 3-6-questionnaire-completion-and-data-submission`

### Sonner Toaster Setup

Check if `<Toaster />` exists in `src/app/layout.tsx`. The `sonner` package is installed but may not have the provider set up. If missing, add to root layout:

```tsx
import { Toaster } from 'sonner';

// Inside the layout JSX, after {children}:
<Toaster position="top-center" richColors />
```

This is required for `toast.error()` calls to display. Use `position="top-center"` for mobile-first UX (visible above content, not hidden by bottom navigation).

### Zod Installation Note

```bash
npm install zod
```

Zod is the documented validation library for this project (architecture.md#4.4). It will be used:
- This story: API input validation for `/api/consultation/start`
- Epic 4: AI output schema validation (face analysis, consultation generation)
- Epic 5: Payment webhook validation
- Epic 8: Auth request validation

Installing it now establishes the pattern for all future API routes.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Zod v4.3.6 was already installed in package.json (no `npm install` needed)
- Toaster from sonner already present in root layout via `@/components/ui/sonner`
- Pre-existing TypeScript errors in CameraPermissionPrompt.tsx and SessionRecoveryBanner.tsx (Framer Motion types) confirmed not related to this story
- `consultationId` was already included in `partialize` config of ConsultationStore -- no change needed for persistence

### Completion Notes List

- Created POST /api/consultation/start API route with Zod v4 validation, UUID generation via crypto.randomUUID(), and in-memory Map storage
- Created submission service (src/lib/consultation/submit.ts) with withRetry helper supporting up to 2 retries with configurable delay, and ConsultationSubmissionError typed error class
- Updated questionnaire page handleComplete to be async: saves responses, calls API, stores consultationId, then navigates on success; shows toast error on failure
- Added isSubmitting state with full-screen loading overlay ("A enviar as suas respostas...") preventing duplicate submissions
- Added setConsultationId action to ConsultationStore interface and implementation
- Created processing page placeholder with consultationId guard (redirects to questionnaire if missing)
- Created processing page layout with Portuguese metadata
- Added ConsultationStartPayload, ConsultationStartResponse, and ConsultationRecord types to src/types/index.ts
- All 29 new tests pass across 3 test files (11 API route + 9 submission service + 9 page integration)
- Full test suite: 698 tests pass (669 existing + 29 new), zero regressions
- Only pre-existing TypeScript errors remain (Framer Motion types in Epic 2 files)

### Change Log

- 2026-03-02: Implemented Story 3.6 - Questionnaire Completion & Data Submission. Added API route, submission service with retry, loading/error UX, processing page placeholder. 29 new tests, 698 total passing.
- 2026-03-02: Code review fixes applied. Fixed API route error handling (400 vs 500 distinction), removed unused import, added useRef guard for isSubmitting to prevent unnecessary re-renders, added console.error logging for failed submissions, improved withRetry error context preservation.

### Senior Developer Review (AI)

**Reviewer:** Code Review Workflow (Adversarial) | 2026-03-02
**Outcome:** Approved with fixes applied

**Issues Found & Fixed (6):**

1. **[HIGH][FIXED] API route catch block masked server errors as 400** (`route.ts:50-55`): The outer try/catch returned 400 for ALL errors, including potential internal server errors. Fixed to distinguish SyntaxError (400) from unexpected errors (500) with console.error logging.

2. **[MEDIUM][FIXED] Unused `ConsultationSubmissionError` import** (`page.tsx:10`): Dead import removed.

3. **[MEDIUM][FIXED] `isSubmitting` in useCallback dependency array** (`page.tsx:58`): Including `isSubmitting` state in the dependency array caused the `handleComplete` callback to be re-created on every submission state change, potentially causing unnecessary child re-renders. Replaced with `useRef` for the guard while keeping `useState` for UI rendering.

4. **[MEDIUM][FIXED] Error in catch block not logged** (`page.tsx:53-55`): Submission errors were caught and shown to the user but never logged to console, making production debugging impossible. Added `console.error` before the toast.

5. **[MEDIUM][FIXED] `withRetry` lost retry chain context** (`submit.ts:29`): When all retries failed, only the last raw error was re-thrown. Improved to wrap with attempt count message and set `error.cause` for full chain traceability.

6. **[MEDIUM][NOTED] `package.json` and `package-lock.json` not in File List**: Added to File List below.

**Remaining Low-Severity Notes (not fixed, acceptable):**

- `isSubmitting` not reset on success path (OK: navigation unmounts component)
- Processing page has no aria-live announcement on redirect (minimal placeholder)
- Metadata language inconsistency between root layout (English) and processing layout (Portuguese) matches project pattern for user-facing pages

**All 698 tests pass after fixes.**

### File List

New files:
- src/app/api/consultation/start/route.ts
- src/lib/consultation/submit.ts
- src/app/consultation/processing/page.tsx
- src/app/consultation/processing/layout.tsx
- src/test/api-consultation-start.test.ts
- src/test/consultation-submit.test.ts
- src/test/questionnaire-completion.test.tsx

Modified files:
- src/types/index.ts
- src/stores/consultation.ts
- src/app/consultation/questionnaire/page.tsx
- package.json
- package-lock.json
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/3-6-questionnaire-completion-and-data-submission.md
