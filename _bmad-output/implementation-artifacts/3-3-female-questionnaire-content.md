# Story 3.3: Female Questionnaire Content

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a female user,
I want tailored questions that respect my specific hair needs, style preferences, and lifestyle context,
so that the AI understands my unique requirements and can recommend the most suitable hairstyles.

## Acceptance Criteria

1. Q1: Style preference question rendered as `image-grid` (2x2) with options: Classico, Moderno, Ousado, Natural
2. Q2: Time spent on hair rendered as `slider` with range 0 min to 30+ min
3. Q3: Work environment rendered as `icon-cards` with options: Corporativo, Criativo, Casual, Remoto
4. Q4: Hair type rendered as `image-grid` (image cards) with options: Liso, Ondulado, Cacheado, Crespo
5. Q5: Current hair length rendered as `image-grid` (image cards) with options: Muito curto, Curto, Medio, Longo
6. Q6: Desired length rendered as `image-grid` (image cards) with options: Mais curto, Manter, Mais longo, Sem preferencia
7. Q7: Hair concerns rendered as `multi-select-chips` with options: Frizz, Pontas duplas, Volume, Fios brancos, Nenhuma
8. All question text and option labels are in Portuguese (pt-BR) with correct diacritical marks
9. All options are visual/tap-based with zero free text input
10. The complete 7-question female config replaces the existing 3-question placeholder in `src/lib/questionnaire/female-questions.ts`
11. Questionnaire engine (Story 3.1) renders all questions correctly using the new config
12. All existing tests pass (524 total from Stories 3.1 + 3.2) with no regressions

## Tasks / Subtasks

- [x] Task 1: Replace placeholder female question config with complete 7-question config (AC: 1-9, 10)
  - [x] Open `src/lib/questionnaire/female-questions.ts`
  - [x] Replace existing 3-question placeholder with complete 7-question `QuestionnaireConfig`
  - [x] Q1 (`style-preference`): type `image-grid`, 4 options: classico/Classico, moderno/Moderno, ousado/Ousado, natural/Natural
  - [x] Q2 (`hair-time`): type `slider`, sliderMin=0, sliderMax=30, sliderStep=1, sliderUnit="min"
  - [x] Q3 (`work-environment`): type `icon-cards`, 4 options: corporativo/Corporativo, criativo/Criativo, casual/Casual, remoto/Remoto, each with Lucide icon names
  - [x] Q4 (`hair-type`): type `image-grid`, 4 options: liso/Liso, ondulado/Ondulado, cacheado/Cacheado, crespo/Crespo
  - [x] Q5 (`current-length`): type `image-grid`, 4 options: muito-curto/Muito curto, curto/Curto, medio/Medio, longo/Longo
  - [x] Q6 (`desired-length`): type `image-grid`, 4 options: mais-curto/Mais curto, manter/Manter, mais-longo/Mais longo, sem-preferencia/Sem preferencia
  - [x] Q7 (`concerns`): type `multi-select-chips`, 5 options: frizz/Frizz, pontas-duplas/Pontas duplas, volume/Volume, fios-brancos/Fios brancos, nenhuma/Nenhuma
  - [x] Verify all Portuguese labels use correct diacritical marks (e, a, etc.)

- [x] Task 2: Update existing tests to match new 7-question config (AC: 11, 12)
  - [x] Check `src/test/use-questionnaire.test.ts` -- any tests referencing the old 3-question female placeholder must work with the new 7-question config or a dedicated test config
  - [x] Check `src/test/questionnaire-flow.test.tsx` -- any tests importing `femaleQuestionnaireConfig` should work with the new 7-question structure
  - [x] Verify progress calculation is correct for 7 questions
  - [x] Verify auto-advance works for `image-grid` (Q1, Q4, Q5, Q6) and NOT for `slider` (Q2) or `multi-select-chips` (Q7)
  - [x] Verify `icon-cards` (Q3) triggers auto-advance
  - [x] Verify all question types are exercised: `image-grid` (Q1, Q4, Q5, Q6), `slider` (Q2), `icon-cards` (Q3), `multi-select-chips` (Q7)

- [x] Task 3: Add dedicated tests for female questionnaire content (AC: 1-9)
  - [x] Create test file `src/test/female-questions.test.ts` for female-specific content validation
  - [x] Test: femaleQuestionnaireConfig has exactly 7 questions
  - [x] Test: femaleQuestionnaireConfig.gender equals 'female'
  - [x] Test: femaleQuestionnaireConfig.id equals 'female-questionnaire'
  - [x] Test: Q1 is type `image-grid` with 4 options
  - [x] Test: Q2 is type `slider` with sliderMin=0, sliderMax=30, sliderStep=1, sliderUnit="min"
  - [x] Test: Q3 is type `icon-cards` with 4 options
  - [x] Test: Q4 is type `image-grid` with 4 options
  - [x] Test: Q5 is type `image-grid` with 4 options
  - [x] Test: Q6 is type `image-grid` with 4 options
  - [x] Test: Q7 is type `multi-select-chips` with 5 options
  - [x] Test: No skipCondition on any female question (unlike male Q6)
  - [x] Test: All option labels are non-empty strings in Portuguese
  - [x] Test: All question ids are unique

- [x] Task 4: Run full test suite and verify no regressions (AC: 12)
  - [x] Run `npx vitest run` to execute all tests
  - [x] Verify 524+ tests pass (524 existing, potentially more with new content tests)
  - [x] Verify no TypeScript compilation errors
  - [x] Verify the questionnaire engine renders all 7 questions in sequence

## Dev Notes

### Architecture Compliance

- **File to Modify:** `src/lib/questionnaire/female-questions.ts` -- This is the ONLY production code file that changes. It was created as a placeholder in Story 3.1 with 3 questions; this story replaces it with the complete 7-question config. [Source: 3-1-questionnaire-engine.md, Task 7]
- **No New Files:** This story modifies one existing file. No new directories, components, hooks, or pages needed.
- **No New Dependencies:** All required types (`QuestionnaireConfig`, `QuestionConfig`, `QuestionOption`, `QuestionType`) already exist in `src/types/questionnaire.ts`. [Source: 3-1-questionnaire-engine.md, Task 2]
- **Engine Compatibility:** The questionnaire engine (`src/hooks/useQuestionnaire.ts`) and the `QuestionnaireFlow` container (`src/components/consultation/QuestionnaireFlow.tsx`) are fully generic -- they accept any `QuestionnaireConfig` and render it. No engine changes needed. [Source: 3-1-questionnaire-engine.md, Tasks 3-4]
- **Export Path:** `female-questions.ts` exports `femaleQuestionnaireConfig` which is re-exported from `src/lib/questionnaire/index.ts`. The page at `src/app/consultation/questionnaire/page.tsx` calls `getQuestionnaireConfig('female')` which returns `femaleQuestionnaireConfig`. No import path changes needed. [Source: src/lib/questionnaire/index.ts]
- **Styling:** Tailwind CSS utility classes via theme CSS variables (`bg-background`, `text-foreground`, `text-accent`). NEVER hardcode hex colors. [Source: 1-1-design-system-setup.md]
- **State Management:** Answers sync to Zustand consultation store via `setQuestionnaireResponse()` in the `useQuestionnaire` hook. No store changes needed. [Source: architecture.md#6.2]

### Technical Requirements

- **Complete Female Questionnaire Config:**
  ```typescript
  // src/lib/questionnaire/female-questions.ts
  import type { QuestionnaireConfig } from '@/types/questionnaire';

  export const femaleQuestionnaireConfig: QuestionnaireConfig = {
    id: 'female-questionnaire',
    gender: 'female',
    questions: [
      {
        id: 'style-preference',
        question: 'Qual e o seu estilo?',
        type: 'image-grid',
        options: [
          { value: 'classico', label: 'Classico' },
          { value: 'moderno', label: 'Moderno' },
          { value: 'ousado', label: 'Ousado' },
          { value: 'natural', label: 'Natural' },
        ],
        required: true,
      },
      {
        id: 'hair-time',
        question: 'Quanto tempo voce dedica ao cabelo?',
        type: 'slider',
        options: [],
        sliderMin: 0,
        sliderMax: 30,
        sliderStep: 1,
        sliderUnit: 'min',
        required: true,
      },
      {
        id: 'work-environment',
        question: 'Qual e o seu ambiente profissional?',
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
        question: 'O seu cabelo e...',
        type: 'image-grid',
        options: [
          { value: 'liso', label: 'Liso' },
          { value: 'ondulado', label: 'Ondulado' },
          { value: 'cacheado', label: 'Cacheado' },
          { value: 'crespo', label: 'Crespo' },
        ],
        required: true,
      },
      {
        id: 'current-length',
        question: 'Qual o comprimento atual do seu cabelo?',
        type: 'image-grid',
        options: [
          { value: 'muito-curto', label: 'Muito curto' },
          { value: 'curto', label: 'Curto' },
          { value: 'medio', label: 'Medio' },
          { value: 'longo', label: 'Longo' },
        ],
        required: true,
      },
      {
        id: 'desired-length',
        question: 'Qual comprimento voce deseja?',
        type: 'image-grid',
        options: [
          { value: 'mais-curto', label: 'Mais curto' },
          { value: 'manter', label: 'Manter' },
          { value: 'mais-longo', label: 'Mais longo' },
          { value: 'sem-preferencia', label: 'Sem preferencia' },
        ],
        required: true,
      },
      {
        id: 'concerns',
        question: 'Alguma preocupacao com o cabelo?',
        type: 'multi-select-chips',
        options: [
          { value: 'frizz', label: 'Frizz' },
          { value: 'pontas-duplas', label: 'Pontas duplas' },
          { value: 'volume', label: 'Volume' },
          { value: 'fios-brancos', label: 'Fios brancos' },
          { value: 'nenhuma', label: 'Nenhuma' },
        ],
        required: true,
      },
    ],
  };
  ```

  **CRITICAL -- Diacritical marks:** The code example above uses ASCII-safe text for markdown compatibility. The ACTUAL implementation MUST use proper Portuguese diacritical marks:
  - "Qual e" -> "Qual **e** com acento: `\u00e9`" = "Qual \u00e9"
  - "voce" -> "voc\u00ea"
  - "Classico" -> "Cl\u00e1ssico"
  - "Medio" -> "M\u00e9dio"
  - "preferencia" -> "prefer\u00eancia"
  - "preocupacao" -> "preocupa\u00e7\u00e3o"

  Here are the exact strings with correct diacritical marks:
  - Q1 question: `'Qual \u00e9 o seu estilo?'`
  - Q1 options: `'Cl\u00e1ssico'`, `'Moderno'`, `'Ousado'`, `'Natural'`
  - Q2 question: `'Quanto tempo voc\u00ea dedica ao cabelo?'`
  - Q3 question: `'Qual \u00e9 o seu ambiente profissional?'`
  - Q4 question: `'O seu cabelo \u00e9...'`
  - Q5 question: `'Qual o comprimento atual do seu cabelo?'`
  - Q5 options: `'Muito curto'`, `'Curto'`, `'M\u00e9dio'`, `'Longo'`
  - Q6 question: `'Qual comprimento voc\u00ea deseja?'`
  - Q6 options: `'Mais curto'`, `'Manter'`, `'Mais longo'`, `'Sem prefer\u00eancia'`
  - Q7 question: `'Alguma preocupa\u00e7\u00e3o com o cabelo?'`

- **Question ID Mapping to AI Pipeline:** These question IDs are consumed by the AI consultation prompt (Epic 4, Story 4.5). The questionnaire responses stored in Zustand as `QuestionnaireResponses` use these exact IDs as keys:
  - `style-preference` -> maps to AI prompt's style framework preference
  - `hair-time` -> maps to maintenance level assessment
  - `work-environment` -> maps to formality/context constraints
  - `hair-type` -> maps to texture/type constraints for recommendations
  - `current-length` -> maps to current state baseline for recommendations
  - `desired-length` -> maps to length change direction constraint
  - `concerns` -> maps to specific concern-aware recommendations

- **Slider Configuration:** The `slider` type for Q2 requires `sliderMin`, `sliderMax`, `sliderStep`, and `sliderUnit` fields. The existing `QuestionConfig` interface in `src/types/questionnaire.ts` already supports these optional fields. Female slider range is 0-30 min (vs male 0-15 min) per UX spec. [Source: ux-design.md#3.4]

- **No Skip Conditions:** Unlike the male questionnaire (where Q6 concerns is skipped when hair-type=calvo), the female questionnaire has NO conditional skip logic. All 7 questions are always shown. The male "calvo" option does not exist in the female hair-type question. [Source: epics-and-stories.md#S3.3]

- **5 Options on Q7:** The female concerns question has 5 options (Frizz, Pontas duplas, Volume, Fios brancos, Nenhuma) compared to male concerns with 4 options (Entradas, Fios brancos, Cabelo fino, Nenhuma). The `multi-select-chips` component handles any number of options. [Source: ux-design.md#3.4]

- **Icon Field Usage:** For Q3 (work environment), icons are specified as Lucide React icon names (Briefcase, Palette, Coffee, Monitor) -- identical to male Q3. The placeholder `QuestionInput` component does not render icons -- S3.4 will implement the polished `IconCards` component that uses these values.

### Key Differences from Male Questionnaire (Story 3.2)

| Aspect | Male (3.2) | Female (3.3) |
|--------|-----------|-------------|
| Question count | 6 | 7 |
| Q1 style options | Classico, Moderno, Ousado, **Minimalista** | Classico, Moderno, Ousado, **Natural** |
| Q2 slider max | **15** min | **30** min |
| Q4 hair-type options | 5 (includes **Pouco cabelo/Calvo**) | 4 (no calvo option) |
| Q5 | **Beard** preference | **Current length** |
| Q6 | **Concerns** (with skip condition) | **Desired length** |
| Q7 | N/A | **Concerns** (no skip condition) |
| Skip conditions | Yes (Q6 skipped if Q4=calvo) | **None** |
| Concern options | 4 (Entradas, Fios brancos, Cabelo fino, Nenhuma) | 5 (Frizz, Pontas duplas, Volume, Fios brancos, Nenhuma) |

### Previous Story Intelligence (Story 3.2 -- Male Questionnaire Content)

**What was built in Story 3.2:**
- `src/lib/questionnaire/male-questions.ts`: Complete 6-question male config replacing 3-question placeholder
- `src/test/male-questions.test.ts`: 47 content validation tests for male questionnaire config
- Total test count after 3.2: 524 tests (477 from Stories 1.x/2.x/3.1 + 47 from Story 3.2)

**Key learnings from Story 3.2:**
- Portuguese diacritical marks are critical -- must use correct accented characters throughout
- No existing tests (use-questionnaire.test.ts, questionnaire-flow.test.tsx) required updates -- they use dedicated test configs, not the production configs directly
- The male-questions.test.ts pattern is the model for creating female-questions.test.ts -- follow the same structure
- Slider type is excluded from auto-advance (along with multi-select-chips)
- Pre-existing TypeScript errors in `CameraPermissionPrompt.tsx` and `SessionRecoveryBanner.tsx` (Framer Motion type issues from Epic 2) -- not related to this story, ignore them
- Story 3.2 used fuller question text sentences than the UX spec shorthand (e.g., "Qual estilo de barba voce prefere?" vs UX spec "Barba?") for improved user clarity -- follow this same pattern for female questions

**Existing placeholder config being replaced:**
```typescript
// Current 3-question placeholder (to be replaced):
questions: [
  { id: 'style-preference', type: 'image-grid', 4 options: Romantico/Moderno/Natural/Sofisticado },
  { id: 'hair-type', type: 'icon-cards', 4 options: Liso/Ondulado/Cacheado/Crespo },
  { id: 'current-length', type: 'icon-cards', 4 options: Curto/Medio/Longo/Muito longo },
]
```

**What changes in the replacement:**
- `style-preference`: options change from Romantico/Moderno/Natural/Sofisticado to Classico/Moderno/Ousado/Natural (per UX spec)
- `hair-type`: type changes from `icon-cards` to `image-grid` (per UX spec)
- `current-length`: type changes from `icon-cards` to `image-grid`, options change from Curto/Medio/Longo/Muito longo to Muito curto/Curto/Medio/Longo (per UX spec)
- 4 NEW questions added: `hair-time` (slider), `work-environment` (icon-cards), `desired-length` (image-grid), `concerns` (multi-select-chips)
- Question text updated to match fuller sentence pattern established in Story 3.2

### Project Structure Notes

- `src/lib/questionnaire/female-questions.ts` -- MODIFIED (only production file changed)
- `src/test/female-questions.test.ts` -- NEW (content validation tests following male-questions.test.ts pattern)
- All other files -- NO CHANGES

### References

- [Source: ux-design.md#3.4] -- Female Questionnaire Flow: exact question table with types and options
- [Source: epics-and-stories.md#S3.3] -- Story acceptance criteria: Q1-Q7 with types, options
- [Source: architecture.md#6.1] -- Project structure: `src/lib/questionnaire/` for question configs
- [Source: architecture.md#6.2] -- State management: Zustand ConsultationStore, QuestionnaireResponses type
- [Source: prd.md#FR9] -- Lifestyle questionnaire: 5-8 questions, gender-tailored
- [Source: prd.md#FR10] -- Questionnaire adapts based on gender selection
- [Source: prd.md#FR11] -- Completable in under 2 minutes
- [Source: prd.md#NFR2] -- Transitions under 300ms
- [Source: ux-design.md#Questionnaire Elicitation] -- Pre-mortem: "Users abandoned at Q4 -- felt like a form." Constraint: 60-90s mobile attention span
- [Source: 3-2-male-questionnaire-content.md] -- Previous story: male config pattern, 47 content tests, 524 total tests
- [Source: 3-1-questionnaire-engine.md] -- Engine, types, placeholder configs, engine tests

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
|   |   +-- male-questions.ts              # NO CHANGES
|   |   +-- female-questions.ts            # MODIFIED: 3-question placeholder -> 7-question complete config
|   |   +-- index.ts                       # NO CHANGES
+-- test/
    +-- female-questions.test.ts           # NEW: content validation tests (follow male-questions.test.ts pattern)
    +-- use-questionnaire.test.ts          # VERIFY: likely NO CHANGES (uses dedicated test config)
    +-- questionnaire-flow.test.tsx        # VERIFY: likely NO CHANGES (uses dedicated test config)
    +-- male-questions.test.ts             # NO CHANGES
    +-- (all other existing test files)    # NO CHANGES
```

### Testing Requirements

- Verify all 524 existing tests pass after replacing the placeholder config
- Tests in `use-questionnaire.test.ts` that import `femaleQuestionnaireConfig` -- Story 3.2 confirmed these tests use dedicated test configs, NOT the production configs. They should pass without changes, but verify.
- Add content validation tests in `src/test/female-questions.test.ts` (follow `src/test/male-questions.test.ts` pattern):
  - Config has exactly 7 questions
  - Config gender is 'female'
  - Config id is 'female-questionnaire'
  - Each question has correct id, type, and option count
  - No skip conditions on any question
  - All labels are non-empty Portuguese strings with correct diacritical marks
  - All question ids are unique
  - Slider question has correct sliderMin=0, sliderMax=30, sliderStep=1, sliderUnit="min"
  - Q7 concerns has exactly 5 options (vs male 4)

### Critical Guardrails

- **DO NOT** modify the questionnaire engine (`src/hooks/useQuestionnaire.ts`). It is generic and complete.
- **DO NOT** modify `QuestionnaireFlow.tsx` or `QuestionInput.tsx`. They render any valid config.
- **DO NOT** modify the Zustand consultation store (`src/stores/consultation.ts`).
- **DO NOT** modify the questionnaire types (`src/types/questionnaire.ts`). All needed types exist.
- **DO NOT** modify `src/lib/questionnaire/index.ts`. It already exports and routes correctly.
- **DO NOT** modify `src/lib/questionnaire/male-questions.ts`. That was Story 3.2.
- **DO NOT** modify the questionnaire page (`src/app/consultation/questionnaire/page.tsx`).
- **DO NOT** install any new npm dependencies.
- **DO NOT** modify any files from Epic 1 or Epic 2.
- **DO NOT** modify `src/test/male-questions.test.ts`.
- **DO** replace the 3-question placeholder in `female-questions.ts` with the complete 7-question config.
- **DO** ensure all Portuguese text uses correct diacritical marks (e, a, o, ao, etc.).
- **DO** ensure all question IDs are unique and descriptive.
- **DO** include `sliderMin`, `sliderMax`, `sliderStep`, `sliderUnit` for the slider question (0-30 min range).
- **DO** include `icon` field on icon-cards options (Lucide React icon names: Briefcase, Palette, Coffee, Monitor).
- **DO** follow the same test file pattern as `src/test/male-questions.test.ts` for the new test file.
- **DO** run the full test suite to verify zero regressions.

### Cross-Story Dependencies

- **Story 1.1 (Design System) -- DONE:** Theme CSS variables used by questionnaire components. Female theme (warm light) applies automatically.
- **Story 3.1 (Questionnaire Engine) -- DONE:** Created the engine, types, placeholder configs, and tests. This story replaces the female placeholder. Engine is generic -- no modification needed.
- **Story 3.2 (Male Questionnaire Content) -- DONE:** Established the pattern for content replacement and test structure. Follow identical approach.
- **Story 3.4 (Question Card Components) -- FUTURE:** Will replace `QuestionInput` placeholder with polished components (ImageGrid, IconCards, Slider, MultiSelectChips). Will use `icon` field from options. Independent of this story.
- **Story 3.5 (Progress Bar & Conversational Tone) -- FUTURE:** Will enhance progress bar. Independent.
- **Story 3.6 (Questionnaire Completion) -- FUTURE:** Will package responses for API submission. Will consume the structured responses from this questionnaire.
- **Story 4.5 (Consultation Generation) -- FUTURE:** AI prompts will use the exact question IDs from this config as keys in the QuestionnaireResponses object. Female-specific prompt (`consultation-female.ts`) will reference: `style-preference`, `hair-time`, `work-environment`, `hair-type`, `current-length`, `desired-length`, `concerns`.

### Performance Targets

- No performance impact. This story only changes static configuration data.
- The 7-question config is ~1.2KB of JSON (vs ~0.5KB for the 3-question placeholder).
- Target questionnaire completion time: < 90 seconds (per UX spec).
- 7 questions at ~10-13 seconds per question = 70-91 seconds total -- within the 90s target.

### Git Intelligence

Recent commit pattern:
- `feat(epic-3): implement story 3-2-male-questionnaire-content`
- `feat(epic-3): implement story 3-1-questionnaire-engine`

Suggested commit message: `feat(epic-3): implement story 3-3-female-questionnaire-content`

### Content Reference (Portuguese)

| Q# | Question Text | Type | Options |
|----|--------------|------|---------|
| Q1 | Qual e o seu estilo? | image-grid | Classico, Moderno, Ousado, Natural |
| Q2 | Quanto tempo voce dedica ao cabelo? | slider | 0 min - 30+ min |
| Q3 | Qual e o seu ambiente profissional? | icon-cards | Corporativo, Criativo, Casual, Remoto |
| Q4 | O seu cabelo e... | image-grid | Liso, Ondulado, Cacheado, Crespo |
| Q5 | Qual o comprimento atual do seu cabelo? | image-grid | Muito curto, Curto, Medio, Longo |
| Q6 | Qual comprimento voce deseja? | image-grid | Mais curto, Manter, Mais longo, Sem preferencia |
| Q7 | Alguma preocupacao com o cabelo? | multi-select-chips | Frizz, Pontas duplas, Volume, Fios brancos, Nenhuma |

**CRITICAL:** All Portuguese text must use correct diacritical marks in the actual implementation. Key accented words:
- "e" (is) -> use the accented form with acute accent
- "voce" -> use the accented form with circumflex on final e
- "Classico" -> use the accented form with acute accent on a
- "Medio" -> use the accented form with acute accent on e
- "preferencia" -> use the accented form with circumflex on e
- "preocupacao" -> use the accented form with cedilla on c and tilde on a

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- RED phase: Created `src/test/female-questions.test.ts` with 59 tests; all 46 content-specific tests failed as expected against the 3-question placeholder.
- GREEN phase: Replaced placeholder config in `src/lib/questionnaire/female-questions.ts` with complete 7-question config including correct Portuguese diacritical marks. All 59 tests passed.
- Full regression suite: 583 tests passed (524 existing + 59 new). Zero regressions.
- Task 2 verification: Confirmed `use-questionnaire.test.ts` and `questionnaire-flow.test.tsx` use dedicated test configs, not production configs. No modifications needed -- consistent with Story 3.2 learnings.

### Completion Notes List

- Replaced 3-question placeholder female config with complete 7-question config per UX spec
- Q1 (style-preference): image-grid, 4 options (Classico/Moderno/Ousado/Natural)
- Q2 (hair-time): slider, 0-30 min range (vs male 0-15)
- Q3 (work-environment): icon-cards, 4 options with Lucide icons (Briefcase/Palette/Coffee/Monitor)
- Q4 (hair-type): image-grid, 4 options (no calvo, unlike male)
- Q5 (current-length): image-grid, 4 options (Muito curto/Curto/Medio/Longo)
- Q6 (desired-length): image-grid, 4 options
- Q7 (concerns): multi-select-chips, 5 options (vs male 4)
- No skipConditions on any female question (unlike male Q6)
- All Portuguese text uses correct diacritical marks (e, a, ea, cao, etc.)
- 59 new content validation tests added following male-questions.test.ts pattern
- Total test count: 583 (524 existing + 59 new)

### Senior Developer Review (AI)

**Reviewer:** Fusuma on 2026-03-02
**Outcome:** Approved (with 1 fix applied)

**Issues Found:** 0 High, 1 Medium (fixed), 3 Low (informational)

**M1 (FIXED): Inconsistent character encoding** -- female-questions.ts and female-questions.test.ts used JavaScript Unicode escape sequences (\u00e9, \u00ea, etc.) instead of actual UTF-8 characters, inconsistent with the male-questions.ts pattern. Fixed by replacing all escape sequences with actual UTF-8 characters. All 583 tests pass after fix.

**L1 (Informational):** No explicit test for full question ID ordering sequence (consistent with male test pattern).
**L2 (Informational):** Test count (59) exceeds male test count (47), appropriate given 7 vs 6 questions.
**L3 (Informational):** No guardrail files were modified. Engine, store, types, index, and male config are all untouched.

**AC Verification:**
- AC1-7: All 7 questions implemented with correct types, options, and labels. PASS.
- AC8: All Portuguese diacritical marks correct (now as actual UTF-8). PASS.
- AC9: All question types are visual/tap-based. PASS.
- AC10: 3-question placeholder fully replaced with 7-question config. PASS.
- AC11: Engine renders all questions correctly (generic engine, no changes needed). PASS.
- AC12: 583 tests pass (524 existing + 59 new), zero regressions. PASS.

### Change Log

- 2026-03-02: Replaced 3-question placeholder female config with complete 7-question config. Added 59 content validation tests. All 583 tests pass.
- 2026-03-02: [Code Review] Fixed Unicode escape sequences to use actual UTF-8 characters for consistency with male-questions.ts. All 583 tests pass.

### File List

- `src/lib/questionnaire/female-questions.ts` -- MODIFIED: 3-question placeholder replaced with complete 7-question config
- `src/test/female-questions.test.ts` -- NEW: 59 content validation tests for female questionnaire config
