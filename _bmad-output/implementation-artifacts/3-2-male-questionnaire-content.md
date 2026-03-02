# Story 3.2: Male Questionnaire Content

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a male user,
I want tailored questions about my style, hair, and grooming preferences,
so that the AI understands my lifestyle and can recommend the most suitable hairstyles.

## Acceptance Criteria

1. Q1: Style preference question rendered as `image-grid` (2x2) with options: Classico, Moderno, Ousado, Minimalista
2. Q2: Time spent on hair rendered as `slider` with range 0 min to 15+ min
3. Q3: Work environment rendered as `icon-cards` with options: Corporativo, Criativo, Casual, Remoto
4. Q4: Hair type rendered as `image-grid` (image cards) with options: Liso, Ondulado, Cacheado, Crespo, Pouco cabelo/Calvo
5. Q5: Beard preference rendered as `image-grid` (image cards) with options: Sem barba, Barba curta, Barba media, Barba longa
6. Q6: Hair concerns rendered as `multi-select-chips` with options: Entradas, Fios brancos, Cabelo fino, Nenhuma
7. Q6 is conditionally skipped when Q4 answer equals "calvo" (skip condition on `hair-type` question)
8. All question text and option labels are in Portuguese (pt-BR) with correct diacritical marks
9. All options are visual/tap-based with zero free text input
10. The complete 6-question male config replaces the existing 3-question placeholder in `src/lib/questionnaire/male-questions.ts`
11. Questionnaire engine (Story 3.1) renders all questions correctly using the new config
12. All existing tests pass (477 total) with no regressions

## Tasks / Subtasks

- [x] Task 1: Replace placeholder male question config with complete 6-question config (AC: 1-9, 10)
  - [x] Open `src/lib/questionnaire/male-questions.ts`
  - [x] Replace existing 3-question placeholder with complete 6-question `QuestionnaireConfig`
  - [x] Q1 (`style-preference`): type `image-grid`, 4 options: classico/Classico, moderno/Moderno, ousado/Ousado, minimalista/Minimalista
  - [x] Q2 (`hair-time`): type `slider`, sliderMin=0, sliderMax=15, sliderStep=1, sliderUnit="min"
  - [x] Q3 (`work-environment`): type `icon-cards`, 4 options: corporativo/Corporativo, criativo/Criativo, casual/Casual, remoto/Remoto
  - [x] Q4 (`hair-type`): type `image-grid`, 5 options: liso/Liso, ondulado/Ondulado, cacheado/Cacheado, crespo/Crespo, calvo/Pouco cabelo/Calvo
  - [x] Q5 (`beard`): type `image-grid`, 4 options: sem-barba/Sem barba, curta/Barba curta, media/Barba media, longa/Barba longa
  - [x] Q6 (`concerns`): type `multi-select-chips`, 4 options: entradas/Entradas, fios-brancos/Fios brancos, cabelo-fino/Cabelo fino, nenhuma/Nenhuma; skipCondition: `{ questionId: 'hair-type', value: 'calvo' }`
  - [x] Verify all Portuguese labels use correct diacritical marks (e, a, etc.)

- [x] Task 2: Update existing tests to match new 6-question config (AC: 11, 12)
  - [x] Update `src/test/use-questionnaire.test.ts` -- any tests referencing the old 3-question male placeholder must use the new 6-question config or a dedicated test config
  - [x] Update `src/test/questionnaire-flow.test.tsx` -- any tests importing `maleQuestionnaireConfig` should work with the new 6-question structure
  - [x] Update `src/test/question-input.test.tsx` -- ensure slider test matches new slider config (sliderMin/sliderMax/sliderStep/sliderUnit)
  - [x] Verify conditional skip rule test: when `hair-type` = `calvo`, Q6 (`concerns`) is skipped
  - [x] Verify all question types are exercised: `image-grid` (Q1, Q4, Q5), `slider` (Q2), `icon-cards` (Q3), `multi-select-chips` (Q6)

- [x] Task 3: Add dedicated tests for male questionnaire content (AC: 1-9)
  - [x] Create or extend test file for male-specific content validation
  - [x] Test: maleQuestionnaireConfig has exactly 6 questions
  - [x] Test: maleQuestionnaireConfig.gender equals 'male'
  - [x] Test: maleQuestionnaireConfig.id equals 'male-questionnaire'
  - [x] Test: Q1 is type `image-grid` with 4 options
  - [x] Test: Q2 is type `slider` with sliderMin=0, sliderMax=15, sliderStep=1, sliderUnit="min"
  - [x] Test: Q3 is type `icon-cards` with 4 options
  - [x] Test: Q4 is type `image-grid` with 5 options (includes calvo)
  - [x] Test: Q5 is type `image-grid` with 4 options
  - [x] Test: Q6 is type `multi-select-chips` with 4 options and has skipCondition for hair-type=calvo
  - [x] Test: All option labels are non-empty strings in Portuguese
  - [x] Test: All question ids are unique

- [x] Task 4: Run full test suite and verify no regressions (AC: 12)
  - [x] Run `npm test` or `npx vitest run` to execute all tests
  - [x] Verify 477+ tests pass (477 existing, potentially more with new content tests)
  - [x] Verify no TypeScript compilation errors
  - [x] Verify the questionnaire engine renders all 6 questions in sequence when testing manually or through existing integration tests

## Dev Notes

### Architecture Compliance

- **File to Modify:** `src/lib/questionnaire/male-questions.ts` -- This is the ONLY production code file that changes. It was created as a placeholder in Story 3.1 with 3 questions; this story replaces it with the complete 6-question config. [Source: 3-1-questionnaire-engine.md, Task 7]
- **No New Files:** This story modifies one existing file. No new directories, components, hooks, or pages needed.
- **No New Dependencies:** All required types (`QuestionnaireConfig`, `QuestionConfig`, `QuestionOption`, `QuestionType`, `SkipCondition`) already exist in `src/types/questionnaire.ts`. [Source: 3-1-questionnaire-engine.md, Task 2]
- **Engine Compatibility:** The questionnaire engine (`src/hooks/useQuestionnaire.ts`) and the `QuestionnaireFlow` container (`src/components/consultation/QuestionnaireFlow.tsx`) are fully generic -- they accept any `QuestionnaireConfig` and render it. No engine changes needed. [Source: 3-1-questionnaire-engine.md, Tasks 3-4]
- **Export Path:** `male-questions.ts` exports `maleQuestionnaireConfig` which is re-exported from `src/lib/questionnaire/index.ts`. The page at `src/app/consultation/questionnaire/page.tsx` calls `getQuestionnaireConfig('male')` which returns `maleQuestionnaireConfig`. No import path changes needed. [Source: src/lib/questionnaire/index.ts]
- **Styling:** Tailwind CSS utility classes via theme CSS variables (`bg-background`, `text-foreground`, `text-accent`). NEVER hardcode hex colors. [Source: 1-1-design-system-setup.md]
- **State Management:** Answers sync to Zustand consultation store via `setQuestionnaireResponse()` in the `useQuestionnaire` hook. No store changes needed. [Source: architecture.md#6.2]

### Technical Requirements

- **Complete Male Questionnaire Config:**
  ```typescript
  // src/lib/questionnaire/male-questions.ts
  import type { QuestionnaireConfig } from '@/types/questionnaire';

  export const maleQuestionnaireConfig: QuestionnaireConfig = {
    id: 'male-questionnaire',
    gender: 'male',
    questions: [
      {
        id: 'style-preference',
        question: 'Qual é o seu estilo?',
        type: 'image-grid',
        options: [
          { value: 'classico', label: 'Clássico' },
          { value: 'moderno', label: 'Moderno' },
          { value: 'ousado', label: 'Ousado' },
          { value: 'minimalista', label: 'Minimalista' },
        ],
        required: true,
      },
      {
        id: 'hair-time',
        question: 'Quanto tempo você dedica ao cabelo?',
        type: 'slider',
        options: [],
        sliderMin: 0,
        sliderMax: 15,
        sliderStep: 1,
        sliderUnit: 'min',
        required: true,
      },
      {
        id: 'work-environment',
        question: 'Qual é o seu ambiente profissional?',
        type: 'icon-cards',
        options: [
          { value: 'corporativo', label: 'Corporativo', icon: 'Briefcase' },
          { value: 'criativo', label: 'Criativo', icon: 'Palette' },
          { value: 'casual', label: 'Casual', icon: 'Coffee' },
          { value: 'remoto', label: 'Remoto', icon: 'Monitor' },
        ],
        required: true,
      },
      {
        id: 'hair-type',
        question: 'O seu cabelo é...',
        type: 'image-grid',
        options: [
          { value: 'liso', label: 'Liso' },
          { value: 'ondulado', label: 'Ondulado' },
          { value: 'cacheado', label: 'Cacheado' },
          { value: 'crespo', label: 'Crespo' },
          { value: 'calvo', label: 'Pouco cabelo/Calvo' },
        ],
        required: true,
      },
      {
        id: 'beard',
        question: 'Qual estilo de barba você prefere?',
        type: 'image-grid',
        options: [
          { value: 'sem-barba', label: 'Sem barba' },
          { value: 'curta', label: 'Barba curta' },
          { value: 'media', label: 'Barba média' },
          { value: 'longa', label: 'Barba longa' },
        ],
        required: true,
      },
      {
        id: 'concerns',
        question: 'Alguma preocupação com o cabelo?',
        type: 'multi-select-chips',
        options: [
          { value: 'entradas', label: 'Entradas' },
          { value: 'fios-brancos', label: 'Fios brancos' },
          { value: 'cabelo-fino', label: 'Cabelo fino' },
          { value: 'nenhuma', label: 'Nenhuma' },
        ],
        required: true,
        skipCondition: {
          questionId: 'hair-type',
          value: 'calvo',
        },
      },
    ],
  };
  ```

- **Question ID Mapping to AI Pipeline:** These question IDs are consumed by the AI consultation prompt (Epic 4, Story 4.5). The questionnaire responses stored in Zustand as `QuestionnaireResponses` use these exact IDs as keys:
  - `style-preference` -> maps to AI prompt's style framework preference
  - `hair-time` -> maps to maintenance level assessment
  - `work-environment` -> maps to formality/context constraints
  - `hair-type` -> maps to texture/type constraints for recommendations
  - `beard` -> maps to facial hair compatibility assessment
  - `concerns` -> maps to specific concern-aware recommendations

- **Slider Configuration:** The `slider` type for Q2 requires `sliderMin`, `sliderMax`, `sliderStep`, and `sliderUnit` fields. The existing `QuestionConfig` interface in `src/types/questionnaire.ts` already supports these optional fields. The placeholder `QuestionInput` component renders sliders using HTML `<input type="range">` with these values. [Source: src/types/questionnaire.ts, src/components/consultation/QuestionInput.tsx]

- **Skip Condition Logic:** The `skipCondition` on Q6 (`concerns`) targets `hair-type` question with value `calvo`. When a user selects "Pouco cabelo/Calvo" for Q4, the engine's `shouldSkip()` function evaluates `String(answers.get('hair-type')) === String('calvo')` and returns true, skipping Q6. This logic is already implemented in `useQuestionnaire.ts`. [Source: src/hooks/useQuestionnaire.ts, lines 7-19]

- **Image Grid with 5 Options (Q4):** The standard `image-grid` type renders as a 2x2 grid in the placeholder `QuestionInput` component. With 5 options for Q4 (hair type), the grid wraps to show a 3-row layout (2+2+1). This is handled by CSS flex-wrap. No engine changes needed -- S3.4 will create the polished grid component with proper responsive layouts. [Source: src/components/consultation/QuestionInput.tsx]

- **Icon Field Usage:** The `icon` field on `QuestionOption` is optional (defined as `icon?: string` in the type). For Q3 (work environment), icons are specified as Lucide React icon names (Briefcase, Palette, Coffee, Monitor). The placeholder `QuestionInput` component does not render icons -- S3.4 will implement the polished `IconCards` component that uses these values. The icon values are stored in the config now so they are available when S3.4 is implemented.

### Previous Story Intelligence (Story 3.1 -- Questionnaire Engine)

**What was built in Story 3.1:**
- `src/stores/consultation.ts`: Zustand consultation store with sessionStorage persist
- `src/types/questionnaire.ts`: All questionnaire type definitions (QuestionType, QuestionConfig, QuestionnaireConfig, etc.)
- `src/hooks/useQuestionnaire.ts`: Questionnaire engine with conditional logic, auto-advance, progress tracking
- `src/components/consultation/QuestionnaireFlow.tsx`: Container component with Framer Motion transitions
- `src/components/consultation/QuestionInput.tsx`: Placeholder input component for all 4 question types
- `src/app/consultation/questionnaire/page.tsx`: Page route with gender guard
- `src/lib/questionnaire/male-questions.ts`: **3-question placeholder** (THIS is what we replace)
- `src/lib/questionnaire/female-questions.ts`: 3-question placeholder (unchanged in this story)
- `src/lib/questionnaire/index.ts`: Config export/routing (unchanged)
- 477 total tests passing (427 from Epic 1-2 + 50 from Story 3.1)

**Key learnings from Story 3.1:**
- Portuguese diacritical marks were initially missed and caught in code review -- pay extra attention to accented characters (e, a, o, etc.)
- Slider type was excluded from auto-advance (along with multi-select-chips) to prevent race conditions during continuous drag
- `QuestionInput` placeholder uses simple button-based UI -- S3.4 will replace it with polished components
- Engine handles arbitrary number of questions -- just pass a valid `QuestionnaireConfig`
- Test mocking patterns for Zustand store, next/navigation, and Framer Motion are established

**Existing placeholder config being replaced:**
```typescript
// Current 3-question placeholder (to be replaced):
questions: [
  { id: 'style-preference', type: 'image-grid', 4 options },
  { id: 'hair-type', type: 'icon-cards', 4 options },
  { id: 'beard', type: 'image-grid', 4 options, skipCondition on hair-type=calvo },
]
```

**What changes in the replacement:**
- `style-preference`: options change from Classico/Moderno/Despojado/Elegante to Classico/Moderno/Ousado/Minimalista (per UX spec)
- `hair-type`: type changes from `icon-cards` to `image-grid`, adds 5th option "Pouco cabelo/Calvo" (per UX spec, was only 4 options)
- `beard`: skip condition moves from `beard` to `concerns` (Q6), beard no longer conditionally skipped
- 3 NEW questions added: `hair-time` (slider), `work-environment` (icon-cards), `concerns` (multi-select-chips)
- Question text updated to match UX spec Portuguese wording

### Project Structure Notes

- `src/lib/questionnaire/male-questions.ts` -- MODIFIED (only production file changed)
- `src/test/` -- Test files may be modified or extended for content validation
- All other files -- NO CHANGES

### References

- [Source: ux-design.md#3.4] -- Male Questionnaire Flow: exact question table with types and options
- [Source: epics-and-stories.md#S3.2] -- Story acceptance criteria: Q1-Q6 with types, options, conditional logic
- [Source: architecture.md#6.1] -- Project structure: `src/lib/questionnaire/` for question configs
- [Source: architecture.md#6.2] -- State management: Zustand ConsultationStore, QuestionnaireResponses type
- [Source: prd.md#FR9] -- Lifestyle questionnaire: 5-8 questions, gender-tailored
- [Source: prd.md#FR10] -- Questionnaire adapts based on gender selection
- [Source: prd.md#FR11] -- Completable in under 2 minutes
- [Source: prd.md#NFR2] -- Transitions under 300ms
- [Source: ux-design.md#Questionnaire Elicitation] -- Pre-mortem: "Users abandoned at Q4 -- felt like a form." Constraint: 60-90s mobile attention span
- [Source: 3-1-questionnaire-engine.md] -- Previous story: engine, types, placeholder configs, 477 tests

### Library & Framework Requirements

| Library | Version | Usage in This Story |
|---------|---------|-------------------|
| TypeScript | 5.x | Type-safe questionnaire config matching `QuestionnaireConfig` interface |

**NO NEW DEPENDENCIES.** This story only modifies data content in one existing file. All types and engine code already exist from Story 3.1.

### File Structure Requirements

```
src/
+-- lib/
|   +-- questionnaire/
|   |   +-- male-questions.ts              # MODIFIED: 3-question placeholder -> 6-question complete config
|   |   +-- female-questions.ts            # NO CHANGES
|   |   +-- index.ts                       # NO CHANGES
+-- test/
    +-- use-questionnaire.test.ts          # MAY NEED UPDATES for 6-question config
    +-- questionnaire-flow.test.tsx        # MAY NEED UPDATES for 6-question config
    +-- question-input.test.tsx            # MAY NEED UPDATES for slider config
    +-- consultation-store.test.ts         # NO CHANGES
    +-- (all other existing test files)    # NO CHANGES
```

### Testing Requirements

- Verify all 477 existing tests pass after replacing the placeholder config
- Tests in `use-questionnaire.test.ts` that import `maleQuestionnaireConfig` will now use the 6-question config. Ensure:
  - Skip condition test still works (now on `concerns` question, triggered by `hair-type=calvo`)
  - Progress calculation is correct for 6 questions (and 5 when Q6 is skipped)
  - Auto-advance works for `image-grid` (Q1, Q4, Q5) and not for `slider` (Q2) or `multi-select-chips` (Q6)
  - `icon-cards` (Q3) triggers auto-advance
- Add content validation tests confirming:
  - Config has exactly 6 questions
  - Each question has correct id, type, and option count
  - Skip condition targets correct question and value
  - All labels are non-empty Portuguese strings

### Critical Guardrails

- **DO NOT** modify the questionnaire engine (`src/hooks/useQuestionnaire.ts`). It is generic and complete.
- **DO NOT** modify `QuestionnaireFlow.tsx` or `QuestionInput.tsx`. They render any valid config.
- **DO NOT** modify the Zustand consultation store (`src/stores/consultation.ts`).
- **DO NOT** modify the questionnaire types (`src/types/questionnaire.ts`). All needed types exist.
- **DO NOT** modify `src/lib/questionnaire/index.ts`. It already exports and routes correctly.
- **DO NOT** modify `src/lib/questionnaire/female-questions.ts`. That is Story 3.3.
- **DO NOT** modify the questionnaire page (`src/app/consultation/questionnaire/page.tsx`).
- **DO NOT** install any new npm dependencies.
- **DO NOT** modify any files from Epic 1 or Epic 2.
- **DO** replace the 3-question placeholder in `male-questions.ts` with the complete 6-question config.
- **DO** ensure all Portuguese text uses correct diacritical marks.
- **DO** ensure all question IDs are unique and descriptive.
- **DO** include `sliderMin`, `sliderMax`, `sliderStep`, `sliderUnit` for the slider question.
- **DO** include `icon` field on icon-cards options (Lucide React icon names for future S3.4 usage).
- **DO** include `skipCondition` on Q6 (`concerns`) targeting `hair-type` with value `calvo`.
- **DO** update any tests that may break due to the config change (especially tests that count questions or reference specific option values).
- **DO** run the full test suite to verify zero regressions.

### Cross-Story Dependencies

- **Story 1.1 (Design System) -- DONE:** Theme CSS variables used by questionnaire components. No changes needed.
- **Story 3.1 (Questionnaire Engine) -- DONE:** Created the engine, types, placeholder configs, and tests. This story replaces the male placeholder. Engine is generic -- no modification needed.
- **Story 3.3 (Female Questionnaire Content) -- FUTURE:** Will replace the female placeholder. Independent of this story.
- **Story 3.4 (Question Card Components) -- FUTURE:** Will replace `QuestionInput` placeholder with polished components (ImageGrid, IconCards, Slider, MultiSelectChips). Will use `icon` field from options. Independent of this story.
- **Story 3.5 (Progress Bar & Conversational Tone) -- FUTURE:** Will enhance progress bar. Independent.
- **Story 3.6 (Questionnaire Completion) -- FUTURE:** Will package responses for API submission. Will consume the structured responses from this questionnaire.
- **Story 4.5 (Consultation Generation) -- FUTURE:** AI prompts will use the exact question IDs from this config as keys in the QuestionnaireResponses object.

### Performance Targets

- No performance impact. This story only changes static configuration data.
- The 6-question config is ~1KB of JSON (vs ~0.5KB for the 3-question placeholder).
- Target questionnaire completion time: < 90 seconds (per UX spec).
- 6 questions at ~10-15 seconds per question = 60-90 seconds total.

### Git Intelligence

Recent commit pattern:
- `feat(epic-3): implement story 3-1-questionnaire-engine`

Suggested commit message: `feat(epic-3): implement story 3-2-male-questionnaire-content`

### Content Reference (Portuguese)

| Q# | Question Text | Type | Options |
|----|--------------|------|---------|
| Q1 | Qual é o seu estilo? | image-grid | Clássico, Moderno, Ousado, Minimalista |
| Q2 | Quanto tempo você dedica ao cabelo? | slider | 0 min - 15+ min |
| Q3 | Qual é o seu ambiente profissional? | icon-cards | Corporativo, Criativo, Casual, Remoto |
| Q4 | O seu cabelo é... | image-grid | Liso, Ondulado, Cacheado, Crespo, Pouco cabelo/Calvo |
| Q5 | Qual estilo de barba você prefere? | image-grid | Sem barba, Barba curta, Barba média, Barba longa |
| Q6 | Alguma preocupação com o cabelo? | multi-select-chips | Entradas, Fios brancos, Cabelo fino, Nenhuma |

**CRITICAL:** All Portuguese text must use correct diacritical marks. Key accented words:
- "é" (is) -- note: "e" = and, "é" = is
- "você" (you)
- "Clássico" (classic)
- "média" (medium)
- "preocupação" (concern)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

No debug issues encountered. Implementation was straightforward data replacement.

### Completion Notes List

- Replaced 3-question placeholder in `male-questions.ts` with complete 6-question config matching UX spec
- All Portuguese text uses correct diacritical marks (e.g., Clássico, você, média, preocupação)
- Q1 (style-preference): image-grid, 4 options -- Clássico/Moderno/Ousado/Minimalista
- Q2 (hair-time): slider, 0-15 min range with step=1
- Q3 (work-environment): icon-cards, 4 options with Lucide icon names (Briefcase/Palette/Coffee/Monitor)
- Q4 (hair-type): image-grid, 5 options including Pouco cabelo/Calvo
- Q5 (beard): image-grid, 4 options -- no skipCondition (moved to Q6)
- Q6 (concerns): multi-select-chips, 4 options with skipCondition on hair-type=calvo
- No existing tests required updates (all use dedicated test configs, not maleQuestionnaireConfig directly)
- Created 47 new content validation tests in `src/test/male-questions.test.ts`
- Full test suite: 524 tests pass (477 existing + 47 new), zero regressions
- Pre-existing TypeScript errors in CameraPermissionPrompt.tsx and SessionRecoveryBanner.tsx (Framer Motion type issues from Epic 2) -- not related to this story

### Change Log

- 2026-03-02: Replaced 3-question placeholder male questionnaire config with complete 6-question config per UX spec. Added 47 content validation tests.
- 2026-03-02: Code review -- Fixed story file documentation: corrected all Portuguese diacritical marks in code examples, content reference table, and completion notes to match actual implementation. Noted intentional deviation in question text from UX spec (implementation uses fuller sentences e.g. "Qual estilo de barba você prefere?" vs UX spec "Barba?") for improved user clarity.

### File List

- src/lib/questionnaire/male-questions.ts (MODIFIED -- 3-question placeholder replaced with 6-question complete config)
- src/test/male-questions.test.ts (NEW -- 47 content validation tests for male questionnaire config)
