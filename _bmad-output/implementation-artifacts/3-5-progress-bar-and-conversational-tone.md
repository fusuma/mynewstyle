# Story 3.5: Progress Bar & Conversational Tone

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see my progress through the questionnaire and feel encouraged to finish,
so that I stay engaged and complete the full questionnaire without abandoning.

## Acceptance Criteria

1. A themed progress bar is displayed at the top of the questionnaire screen showing percentage complete, with smooth animated fill transitions (300ms duration) as the user advances through questions
2. At 80%+ completion, a motivational "Quase la!" message appears below the progress bar, styled with the accent color and announced to screen readers via `aria-live="polite"`
3. An estimated time remaining indicator displays below the progress bar (e.g., "~30 segundos"), calculated based on remaining questions times an average per-question duration, and updates as the user progresses
4. The progress bar fill animation is smooth and continuous (no jumps), using CSS transitions on the width property with 300ms ease timing
5. All progress-related text uses theme CSS variables (text-accent, text-muted-foreground) -- no hardcoded hex colors
6. The progress bar respects `prefers-reduced-motion`: if enabled, transitions happen instantly (duration: 0)
7. The progress bar has proper ARIA attributes: `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-label`
8. Conversational encouragement messages rotate based on progress milestones: a welcoming message at the start, mid-point encouragement, and the "Quase la!" near completion
9. All existing 642 tests pass with zero regressions after implementation
10. The estimated time remaining disappears when the user is on the last question (no "~0 segundos" display)

## Tasks / Subtasks

- [x] Task 1: Enhance progress bar with smooth animation and estimated time (AC: 1, 3, 4, 5, 6, 7, 10)
  - [x] Refactor the existing progress bar section in `QuestionnaireFlow.tsx` to include an estimated time remaining display
  - [x] Calculate estimated time: `(remainingQuestions) * AVG_SECONDS_PER_QUESTION` where `AVG_SECONDS_PER_QUESTION = 10` (conservative estimate for tap-based questions under the 90s total target)
  - [x] Display estimated time as "~X segundos" in `text-muted-foreground` below the progress bar
  - [x] Hide time remaining on the last question (no "~0 segundos")
  - [x] Ensure progress bar fill uses `transition-all duration-300` (already present, verify)
  - [x] Ensure `prefers-reduced-motion` is respected: use `duration-0` when reduced motion is preferred
  - [x] Verify existing ARIA attributes are correct (`role="progressbar"`, `aria-valuenow`, etc.)

- [x] Task 2: Add conversational encouragement messages (AC: 2, 5, 8)
  - [x] Create a helper function `getEncouragementMessage(progress: number): string | null` that returns milestone-based messages:
    - 0-20%: "Vamos la!" (Let's go!)
    - 21-50%: null (no message, clean UI)
    - 51-79%: "Muito bem, continue!" (Great, keep going!)
    - 80-99%: "Quase la!" (Almost there!)
    - 100%: null (questionnaire is completing)
  - [x] Render the encouragement message below the progress bar, styled with `text-accent text-xs`
  - [x] Add `aria-live="polite"` on the message container so screen readers announce changes
  - [x] Ensure the "Quase la!" at 80%+ is maintained (already exists, integrate with the new message system)

- [x] Task 3: Write tests for progress enhancements (AC: 1-10)
  - [x] Add tests to `src/test/questionnaire-flow.test.tsx` (or a new `src/test/progress-bar.test.tsx`):
    - Test progress bar renders with correct `aria-valuenow` matching progress percentage
    - Test estimated time displays for non-last questions
    - Test estimated time hidden on last question
    - Test "Vamos la!" message shows at start (progress <= 20%)
    - Test "Muito bem, continue!" message shows at mid-point (51-79%)
    - Test "Quase la!" message shows at 80%+
    - Test no message shows between 21-50%
    - Test encouragement message container has `aria-live="polite"`
    - Test theme classes used (no hardcoded colors)
    - Test reduced motion: progress bar transition class changes when reduced motion is preferred

- [x] Task 4: Run full test suite and verify zero regressions (AC: 9)
  - [x] Run `npx vitest run` to execute all tests
  - [x] Verify all 642 existing tests pass + new tests pass
  - [x] Verify no TypeScript compilation errors

## Dev Notes

### Architecture Compliance

- **Component Location:** All changes are within `src/components/consultation/QuestionnaireFlow.tsx`. No new files needed unless extracting a small helper. If a helper is extracted, place it in `src/components/consultation/` or `src/lib/questionnaire/`.
- **No New Dependencies:** All required packages are already installed. Framer Motion (already imported in QuestionnaireFlow), Tailwind CSS, and Lucide React are the only tools needed.
- **Styling:** Tailwind CSS utility classes via theme CSS variables (`text-accent`, `text-muted-foreground`, `bg-accent`, `bg-border`). NEVER hardcode hex colors. The dual theme system from Story 1.1 handles gender-specific colors automatically. [Source: 1-1-design-system-setup.md]
- **State Management:** Progress is already calculated by the `useQuestionnaire` hook (returns `progress` as a number 0-100). The estimated time and encouragement message are derived values computed within the component -- no store changes needed. [Source: architecture.md#6.2]

### Technical Requirements

- **Progress Calculation (already implemented):**
  The `useQuestionnaire` hook already computes `progress` as: `Math.round(((currentActiveIndex + 1) / activeQuestions.length) * 10000) / 100`. This accounts for conditional skip logic (e.g., male questionnaire may have 5 or 6 active questions depending on "Calvo" selection). The progress bar already uses this value.

- **Estimated Time Remaining Calculation:**
  ```typescript
  // Constants
  const AVG_SECONDS_PER_QUESTION = 10; // Conservative: tap-based answers take 5-15s

  // Derived from useQuestionnaire
  // activeQuestions.length is not directly exposed, but we can derive remaining questions
  // from progress: if progress = (currentActiveIndex + 1) / total * 100
  // remaining = total - (currentActiveIndex + 1)
  // Since we have progress and know it's calculated from active questions,
  // we need to also expose remainingQuestions from the hook OR compute it:
  // remainingQuestions = Math.round((100 - progress) / (100 / activeQuestions.length))

  // SIMPLEST APPROACH: Expose totalActiveQuestions and currentActiveIndex from useQuestionnaire
  // OR calculate remaining from progress percentage directly
  ```

  **IMPORTANT DECISION:** The `useQuestionnaire` hook currently returns `progress` (percentage) but not the raw counts. To calculate time remaining accurately, the hook should also return `totalActiveQuestions` and `currentActiveIndex` (both already computed internally). This is a minimal addition to the hook's return interface that does not change behavior.

  Alternatively, derive from progress: `remainingQuestions = Math.ceil((100 - progress) / progressPerQuestion)` -- but this is fragile. Better to expose the raw counts.

- **Encouragement Message Logic:**
  ```typescript
  function getEncouragementMessage(progress: number): string | null {
    if (progress <= 20) return 'Vamos la!';
    if (progress <= 50) return null;
    if (progress < 80) return 'Muito bem, continue!';
    if (progress < 100) return 'Quase la!';
    return null;
  }
  ```

- **Reduced Motion Handling:**
  The `QuestionnaireFlow` component already has a `prefersReducedMotion` state variable (lines 45-53). Use this same variable to conditionally apply `duration-0` instead of `duration-300` on the progress bar fill transition.

- **Existing Progress Bar Code (lines 93-114 of QuestionnaireFlow.tsx):**
  The progress bar already exists with:
  - `data-testid="progress-bar"`
  - `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`
  - `h-2 w-full overflow-hidden rounded-full bg-border` container
  - `h-full rounded-full bg-accent transition-all duration-300` fill bar
  - "Quase la!" message when `progress >= 80`

  This story enhances the existing implementation by:
  1. Adding estimated time remaining below the progress bar
  2. Replacing the single "Quase la!" message with a milestone-based encouragement system
  3. Ensuring reduced motion is properly handled on the progress bar transition
  4. Adding comprehensive tests

### Previous Story Intelligence (Story 3.4 -- Question Card Components)

**What was built in Story 3.4:**
- Extracted 4 inline sub-components from `QuestionInput.tsx` into `src/components/consultation/question-cards/`
- Created `icon-resolver.ts` for Lucide icon string-to-component mapping
- Added `useReducedMotion` hook at `src/hooks/useReducedMotion.ts`
- Total test count: 642 tests (583 from prior stories + 59 from Story 3.4)

**Key learnings from Story 3.4:**
- Pre-existing TypeScript errors in `CameraPermissionPrompt.tsx` and `SessionRecoveryBanner.tsx` (Framer Motion type issues from Epic 2) -- not related to this story, ignore them
- The `QuestionnaireFlow.tsx` component uses inline reduced motion check (useState + useEffect on matchMedia) rather than the `useReducedMotion` hook created in Story 3.4. Consider refactoring to use the shared hook for consistency.
- `matchMedia` mock was added to `src/test/setup.ts` in Story 3.4 -- tests that check `prefers-reduced-motion` will work correctly.
- Test files: New tests were placed in `src/test/question-cards.test.tsx`. Follow the same pattern for progress bar tests.

**Current QuestionnaireFlow.tsx state:**
- 185 lines total
- Already has progress bar (lines 93-114), "Quase la!" message (lines 109-113)
- Already has `prefersReducedMotion` state (lines 45-53)
- Already imports `AnimatePresence`, `motion` from Framer Motion
- Progress bar fill already has `transition-all duration-300`

### Project Structure Notes

```
src/
+-- components/
|   +-- consultation/
|   |   +-- QuestionnaireFlow.tsx          # MODIFIED: enhanced progress section
|   |   +-- QuestionInput.tsx              # NO CHANGES
|   |   +-- question-cards/               # NO CHANGES
+-- hooks/
|   +-- useQuestionnaire.ts               # MODIFIED: expose totalActiveQuestions, currentActiveIndex
|   +-- useReducedMotion.ts               # NO CHANGES (consider using in QuestionnaireFlow)
+-- test/
    +-- progress-bar.test.tsx             # NEW: tests for progress bar and encouragement messages
    +-- questionnaire-flow.test.tsx       # VERIFY: no regressions
```

### References

- [Source: ux-design.md#3.4] -- Questionnaire design: "Progress bar at top. Back/Next navigation."
- [Source: ux-design.md#4.1] -- Component library: "Progress Bar | Determinate, Indeterminate | Accent color"
- [Source: ux-design.md#1.6] -- Motion: "Micro-interactions: 200ms ease-out", "Loading animations: continuous"
- [Source: ux-design.md#6] -- Accessibility: WCAG 2.1 AA, keyboard navigation, prefers-reduced-motion
- [Source: ux-design.md#7 (Questionnaire elicitation)] -- Pre-mortem: "Users abandoned at Q4 -- felt like a form, not a conversation." -> one-per-screen, conversational tone, progress bar shows "Quase la!" at 80%
- [Source: epics-and-stories.md#S3.5] -- Story acceptance criteria: progress bar %, "Quase la!" at 80%+, estimated time "~30 segundos", smooth animation
- [Source: architecture.md#6.1] -- Project structure: `src/components/consultation/` for consultation components
- [Source: architecture.md#6.2] -- State management: Zustand ConsultationStore, useQuestionnaire hook
- [Source: prd.md#FR9] -- Lifestyle questionnaire: 5-8 questions, gender-tailored, under 2 minutes
- [Source: prd.md#FR11] -- Questionnaire completion under 2 minutes
- [Source: prd.md#NFR2] -- Transitions under 300ms
- [Source: prd.md#NFR15-NFR18] -- Accessibility: WCAG 2.1 AA, keyboard navigation, color contrast
- [Source: 3-4-question-card-components.md] -- Previous story: 642 total tests, useReducedMotion hook, matchMedia mock in test setup
- [Source: 3-1-questionnaire-engine.md] -- Engine, useQuestionnaire hook, QuestionnaireFlow, progress calculation

### Library & Framework Requirements

| Library | Version | Usage in This Story |
|---------|---------|-------------------|
| react | 19.2.3 | Component rendering, hooks (useState, useEffect, useCallback, useMemo) |
| framer-motion | 12.34.3 | Already used in QuestionnaireFlow for question transitions |
| tailwindcss | 4.1.1 | Styling with theme CSS variables |
| @testing-library/react | 16.3.2 | Component rendering in tests |
| vitest | 4.0.18 | Test runner |

**NO NEW DEPENDENCIES.** All required packages are already installed.

### File Structure Requirements

```
src/
+-- components/
|   +-- consultation/
|   |   +-- QuestionnaireFlow.tsx              # MODIFIED: enhanced progress bar, time estimate, encouragement messages
|   |   +-- QuestionInput.tsx                  # NO CHANGES
|   |   +-- question-cards/                    # NO CHANGES
+-- hooks/
|   +-- useQuestionnaire.ts                    # MODIFIED: expose totalActiveQuestions and currentActiveIndex in return
|   +-- useReducedMotion.ts                    # NO CHANGES
+-- test/
    +-- progress-bar.test.tsx                  # NEW: tests for progress bar enhancements
    +-- questionnaire-flow.test.tsx            # VERIFY: no regressions
    +-- (all other existing test files)        # NO CHANGES expected
```

### Testing Requirements

- Verify all 642 existing tests pass after changes
- New tests in `src/test/progress-bar.test.tsx`:
  - **Progress bar ARIA tests:**
    - Renders with `role="progressbar"` (already tested, but verify still works)
    - Has correct `aria-valuenow` matching current progress percentage
    - Has `aria-valuemin="0"` and `aria-valuemax="100"`
    - Has `aria-label` describing the progress bar purpose
  - **Estimated time remaining tests:**
    - Shows estimated time for the first question (e.g., "~50 segundos" for 6-question male flow)
    - Updates estimated time as user progresses through questions
    - Hides estimated time on the last question
    - Displays in `text-muted-foreground` styling class
  - **Encouragement message tests:**
    - Shows "Vamos la!" when progress is <= 20%
    - Shows no message when progress is between 21-50%
    - Shows "Muito bem, continue!" when progress is 51-79%
    - Shows "Quase la!" when progress is 80-99%
    - Message container has `aria-live="polite"` for screen reader announcements
  - **Theme compliance tests:**
    - No hardcoded hex colors in rendered progress section
    - Uses Tailwind theme classes (text-accent, text-muted-foreground, bg-accent, bg-border)
  - **Reduced motion tests:**
    - Progress bar transition class is `duration-300` by default
    - Progress bar transition changes to `duration-0` when reduced motion is preferred
  - **Integration tests:**
    - Render full QuestionnaireFlow with male config, advance through all questions
    - Verify progress bar updates correctly at each step
    - Verify encouragement messages appear at correct milestones
    - Verify estimated time decreases with each question answered

### Critical Guardrails

- **DO NOT** modify the questionnaire engine logic in `useQuestionnaire.ts` beyond exposing `totalActiveQuestions` and `currentActiveIndex` (which are already computed internally). The skip logic, auto-advance, and answer management must remain unchanged.
- **DO NOT** modify the Zustand consultation store (`src/stores/consultation.ts`).
- **DO NOT** modify the questionnaire types (`src/types/questionnaire.ts`).
- **DO NOT** modify any questionnaire content files (`male-questions.ts`, `female-questions.ts`).
- **DO NOT** modify the question card components from Story 3.4.
- **DO NOT** modify any files from Epic 1 or Epic 2.
- **DO NOT** modify any existing test files.
- **DO NOT** install any new npm dependencies.
- **DO NOT** hardcode any color values (hex, rgb). Always use Tailwind theme classes.
- **DO NOT** change the progress bar's existing ARIA attributes (they are already correct).
- **DO** enhance the existing progress bar section in `QuestionnaireFlow.tsx` (do not create a separate component).
- **DO** expose `totalActiveQuestions` and `currentActiveIndex` from `useQuestionnaire` hook for time estimation.
- **DO** use the existing `prefersReducedMotion` state (or refactor to use `useReducedMotion` hook from Story 3.4).
- **DO** keep encouragement messages in Portuguese (pt-BR) matching the existing "Quase la!" pattern.
- **DO** maintain `aria-live="polite"` on dynamic text elements.
- **DO** run the full test suite to verify zero regressions.

### Cross-Story Dependencies

- **Story 1.1 (Design System) -- DONE:** Theme CSS variables, Tailwind config with dual themes. Components use `bg-background`, `text-foreground`, `border-accent`, `bg-accent/10`. Theme switching is automatic based on gender context.
- **Story 3.1 (Questionnaire Engine) -- DONE:** Created `useQuestionnaire` hook, `QuestionInput` placeholder, `QuestionnaireFlow` container, progress bar, "Quase la!" message. This story enhances the progress section.
- **Story 3.2 (Male Questionnaire Content) -- DONE:** 6-question male config. Used for testing -- male flow has 5 or 6 active questions depending on "Calvo" skip condition.
- **Story 3.3 (Female Questionnaire Content) -- DONE:** 7-question female config. Used for testing -- female flow always has 7 active questions.
- **Story 3.4 (Question Card Components) -- DONE:** Polished card components, `useReducedMotion` hook, `matchMedia` mock in test setup. 642 total tests.
- **Story 3.6 (Questionnaire Completion) -- FUTURE:** Will package responses for API submission. Independent of this story.

### Performance Targets

- Progress bar transition: 300ms ease (per UX spec motion tokens) -- already implemented
- Encouragement message render: instantaneous (pure derived state from progress number)
- Time estimation calculation: O(1) derived from `totalActiveQuestions - (currentActiveIndex + 1)`
- Zero layout shift from encouragement message changes (use min-height or fixed-height container)
- No additional re-renders beyond what already occurs on question navigation

### Git Intelligence

Recent commit pattern:
- `feat(epic-3): implement story 3-4-question-card-components`
- `feat(epic-3): implement story 3-3-female-questionnaire-content`
- `feat(epic-3): implement story 3-2-male-questionnaire-content`
- `feat(epic-3): implement story 3-1-questionnaire-engine`

Suggested commit message: `feat(epic-3): implement story 3-5-progress-bar-and-conversational-tone`

### Existing Code to Enhance

The current progress bar section in `QuestionnaireFlow.tsx` (lines 93-114):

```tsx
{/* Progress bar */}
<div className="w-full px-4 pt-4">
  <div
    data-testid="progress-bar"
    role="progressbar"
    aria-valuenow={Math.round(progress)}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-label="Progresso do questionario"
    className="h-2 w-full overflow-hidden rounded-full bg-border"
  >
    <div
      className="h-full rounded-full bg-accent transition-all duration-300"
      style={{ width: `${progress}%` }}
    />
  </div>
  {showAlmostDone && (
    <p className="mt-1 text-center text-xs text-accent" aria-live="polite">
      Quase la!
    </p>
  )}
</div>
```

**Enhancement plan:**
1. Replace the single `showAlmostDone` check with `getEncouragementMessage(progress)`
2. Add estimated time remaining display below the progress bar
3. Add conditional `duration-0` class when `prefersReducedMotion` is true
4. Wrap dynamic text in `aria-live="polite"` container

## Change Log

- 2026-03-02: Implemented progress bar enhancements, estimated time remaining, and milestone-based encouragement messages. Exposed `totalActiveQuestions` and `currentActiveIndex` from `useQuestionnaire` hook. Added 27 new tests in `src/test/progress-bar.test.tsx`. All 669 tests pass (642 existing + 27 new). Zero regressions.
- 2026-03-02: Code review completed. Fixed 2 MEDIUM issues: (1) Refactored QuestionnaireFlow.tsx to use shared `useReducedMotion` hook instead of inline duplicate logic, (2) Wrapped reduced motion test matchMedia override in try/finally for cleanup safety. All 669 tests pass post-fix. Status → done.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- No blocking issues encountered during implementation.
- Pre-existing TypeScript errors in `CameraPermissionPrompt.tsx` and `SessionRecoveryBanner.tsx` (Framer Motion type issues from Epic 2) confirmed as documented -- not related to this story.

### Completion Notes List

- Exposed `totalActiveQuestions` and `currentActiveIndex` from `useQuestionnaire` hook return interface -- minimal change to hook, no behavior modification.
- Created exported `getEncouragementMessage(progress)` helper function with milestone-based message logic.
- Enhanced progress bar section in `QuestionnaireFlow.tsx`: added estimated time remaining display (`~N segundos`), replaced single "Quase la!" message with milestone-based encouragement system, added conditional `duration-0` class for reduced motion.
- Used `min-h-[2rem]` container for encouragement/time section to prevent layout shift.
- Estimated time hidden on last question to avoid "~0 segundos" display.
- Encouragement message container always rendered with `aria-live="polite"` for screen reader announcements.
- All 27 new tests pass: 4 ARIA, 4 estimated time, 5 encouragement messages, 3 theme compliance, 2 reduced motion, 3 integration, 6 unit tests for `getEncouragementMessage`.
- Full suite: 669 tests pass, 0 failures, 0 regressions.
- TypeScript: 0 new errors (2 pre-existing from Epic 2 unrelated to this story).
- TDD approach followed: wrote failing tests first (RED), then implemented code to pass (GREEN), then verified and cleaned up (REFACTOR).

### File List

- `src/hooks/useQuestionnaire.ts` (MODIFIED) -- Added `totalActiveQuestions` and `currentActiveIndex` to `UseQuestionnaireReturn` interface and return object
- `src/components/consultation/QuestionnaireFlow.tsx` (MODIFIED) -- Added `getEncouragementMessage` helper, `AVG_SECONDS_PER_QUESTION` constant, estimated time remaining display, milestone-based encouragement messages, conditional `duration-0`/`duration-300` for reduced motion
- `src/test/progress-bar.test.tsx` (NEW) -- 27 tests covering ARIA attributes, estimated time, encouragement messages, theme compliance, reduced motion, integration flow, and `getEncouragementMessage` unit tests
