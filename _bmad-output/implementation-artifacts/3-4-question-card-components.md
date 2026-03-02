# Story 3.4: Question Card Components

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want visually engaging question cards so the questionnaire feels fun and interactive, not like a form,
so that I enjoy the experience and am more likely to complete the full questionnaire.

## Acceptance Criteria

1. ImageGrid component renders a 2x2 grid of selectable image cards with label text, selected state shows scale 1.05x + accent border + checkmark overlay
2. IconCard component renders icon + label cards using Lucide React icons (resolved dynamically from the `icon` string field), selectable with accent border + checkmark
3. Slider component renders a horizontal slider with labeled min/max endpoints, current value display, and unit label, styled with the gender theme accent color
4. MultiSelectChips component renders tap-to-toggle chips supporting multi-selection, with accent border + checkmark for selected chips
5. All components apply gender-themed styling via CSS variables (bg-background, text-foreground, border-accent, bg-accent/10) -- never hardcoded hex colors
6. All interactive elements have minimum 48px touch targets for mobile accessibility
7. Selected state animation: scale up 1.05x with 200ms ease-out transition, accent border appears, checkmark icon overlays
8. The existing placeholder `QuestionInput` component is replaced (or refactored) with the polished implementations that resolve Lucide icons dynamically
9. `QuestionnaireFlow` continues to work correctly with the new components -- all existing 583 tests pass with zero regressions
10. IconCards component resolves Lucide icon names from the `icon` field on `QuestionOption` (e.g., `'Briefcase'` -> renders `<Briefcase />` from lucide-react)
11. Components are accessible: proper ARIA roles (radiogroup/radio for single-select, group/checkbox for multi-select), keyboard navigation support, aria-checked states
12. Components respect `prefers-reduced-motion` by disabling scale/transition animations when the user's OS preference is set

## Tasks / Subtasks

- [x] Task 1: Create polished ImageGrid component (AC: 1, 5, 6, 7, 11, 12)
  - [x] Extract `ImageGrid` from `QuestionInput.tsx` into `src/components/consultation/question-cards/ImageGrid.tsx`
  - [x] Add placeholder image area (colored div with first letter of label) above the label text for visual engagement
  - [x] Implement selected state: `scale-105` + `border-accent` + `bg-accent/10` + `<Check />` overlay
  - [x] Ensure 48px min touch target (`min-h-[48px]`)
  - [x] Use only Tailwind CSS variables for theming (no hardcoded colors)
  - [x] Add `prefers-reduced-motion` check: skip scale transition when enabled
  - [x] Add proper ARIA: `role="radiogroup"` on container, `role="radio"` + `aria-checked` on each option
  - [x] Support keyboard navigation (arrow keys within radiogroup)

- [x] Task 2: Create polished IconCards component with dynamic Lucide icon resolution (AC: 2, 5, 6, 7, 10, 11, 12)
  - [x] Extract `IconCards` from `QuestionInput.tsx` into `src/components/consultation/question-cards/IconCards.tsx`
  - [x] Create a Lucide icon resolver utility: maps `icon` string name (e.g., `'Briefcase'`) to the actual Lucide React component
  - [x] Render resolved Lucide icon above the label text (24px size, themed color)
  - [x] Implement selected state: `scale-105` + `border-accent` + `bg-accent/10` + `<Check />` overlay
  - [x] Ensure 48px min touch target
  - [x] Add `prefers-reduced-motion` check
  - [x] Add proper ARIA roles

- [x] Task 3: Create polished Slider component (AC: 3, 5, 6, 11, 12)
  - [x] Extract `SliderInput` from `QuestionInput.tsx` into `src/components/consultation/question-cards/SliderInput.tsx`
  - [x] Style the range input with accent color track and thumb
  - [x] Display current value prominently above the slider
  - [x] Show min and max labels at endpoints with unit
  - [x] Ensure 48px min touch target for the thumb
  - [x] Add proper ARIA: `role="slider"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext`

- [x] Task 4: Create polished MultiSelectChips component (AC: 4, 5, 6, 7, 11, 12)
  - [x] Extract `MultiSelectChips` from `QuestionInput.tsx` into `src/components/consultation/question-cards/MultiSelectChips.tsx`
  - [x] Implement pill/chip style with rounded-full shape
  - [x] Selected state: `scale-105` + `border-accent` + `bg-accent/10` + `<Check />` icon
  - [x] Ensure 48px min touch target per chip
  - [x] Add `prefers-reduced-motion` check
  - [x] Add proper ARIA: `role="group"` on container, `role="checkbox"` + `aria-checked` on each chip

- [x] Task 5: Update QuestionInput to use new components (AC: 8, 9)
  - [x] Replace inline sub-components in `src/components/consultation/QuestionInput.tsx` with imports from `question-cards/`
  - [x] Create barrel export `src/components/consultation/question-cards/index.ts`
  - [x] Ensure the `QuestionInput` switch-case still works identically
  - [x] Verify `QuestionnaireFlow.tsx` requires zero changes (it only imports `QuestionInput`)

- [x] Task 6: Write tests for new question card components (AC: 1-12)
  - [x] Create `src/test/question-cards.test.tsx` with comprehensive tests
  - [x] Test ImageGrid: renders 2x2 grid, handles selection, shows checkmark, has ARIA roles
  - [x] Test IconCards: renders Lucide icons from string names, handles selection, unknown icon fallback
  - [x] Test SliderInput: renders with min/max/step/unit, handles value changes, has ARIA attributes
  - [x] Test MultiSelectChips: renders chips, handles toggle selection/deselection, shows checkmarks, has ARIA roles
  - [x] Test all components use theme CSS variables (no hardcoded colors in rendered output)
  - [x] Test 48px min touch targets exist
  - [x] Test reduced motion preference handling

- [x] Task 7: Run full test suite and verify no regressions (AC: 9)
  - [x] Run `npx vitest run` to execute all tests
  - [x] Verify all 583 existing tests pass + new component tests pass
  - [x] Verify no TypeScript compilation errors
  - [x] Verify the questionnaire renders correctly end-to-end with both male and female configs

## Dev Notes

### Architecture Compliance

- **Component Location:** New components go in `src/components/consultation/question-cards/` directory. The architecture (architecture.md#6.1) specifies `src/components/consultation/` for consultation-related components. A `question-cards/` subdirectory keeps the polished card components organized.
- **Single Entry Point:** `QuestionInput.tsx` remains the single entry point used by `QuestionnaireFlow.tsx`. The refactoring is internal -- extract sub-components into separate files, import them back into `QuestionInput`.
- **No New Dependencies:** All required packages are already installed: `lucide-react` (v0.575.0) for icons, `framer-motion` (v12.34.3) if animations are needed (though Tailwind transitions suffice for scale effects), `@testing-library/react` + `vitest` for tests.
- **Styling:** Tailwind CSS utility classes via theme CSS variables (`bg-background`, `text-foreground`, `border-accent`, `bg-accent/10`). NEVER hardcode hex colors like `#F5A623` or `#C4787A`. The dual theme system from Story 1.1 handles gender-specific colors automatically. [Source: 1-1-design-system-setup.md]
- **State Management:** These are stateless presentation components. State is managed by the `useQuestionnaire` hook which passes current value and onChange handler through `QuestionInput`. No store changes needed. [Source: architecture.md#6.2]

### Technical Requirements

- **Lucide Icon Resolver:**
  The `icon` field on `QuestionOption` stores a string like `'Briefcase'`, `'Palette'`, `'Coffee'`, `'Monitor'`. The IconCards component needs to resolve these strings to actual Lucide React components. Approach:

  ```typescript
  // src/components/consultation/question-cards/icon-resolver.ts
  import { Briefcase, Palette, Coffee, Monitor, HelpCircle } from 'lucide-react';
  import type { LucideIcon } from 'lucide-react';

  const iconMap: Record<string, LucideIcon> = {
    Briefcase,
    Palette,
    Coffee,
    Monitor,
  };

  export function resolveIcon(name: string | undefined): LucideIcon | null {
    if (!name) return null;
    return iconMap[name] ?? HelpCircle; // Fallback to HelpCircle for unknown icons
  }
  ```

  **CRITICAL:** Do NOT use dynamic imports or `require()` to resolve icons. This creates bundle issues with tree-shaking. Use an explicit map of the icons actually used in the questionnaire configs. If new icons are needed for future questions, add them to the map.

  **Icons currently used across both questionnaire configs:**
  - `Briefcase` (Corporativo)
  - `Palette` (Criativo)
  - `Coffee` (Casual)
  - `Monitor` (Remoto)

- **Component Props Interface:**
  Each component should accept the same props pattern that `QuestionInput` currently provides:

  ```typescript
  interface ImageGridProps {
    question: QuestionConfig;
    value: string | null;
    onChange: (value: string) => void;
  }

  interface IconCardsProps {
    question: QuestionConfig;
    value: string | null;
    onChange: (value: string) => void;
  }

  interface SliderInputProps {
    question: QuestionConfig;
    value: number | null;
    onChange: (value: number) => void;
  }

  interface MultiSelectChipsProps {
    question: QuestionConfig;
    value: string[];
    onChange: (value: string[]) => void;
  }
  ```

- **Selected State Design:**
  Per UX spec (ux-design.md#8.1), selected answer should:
  - Scale up briefly (1.05x) -- `scale-105` in Tailwind
  - Show checkmark -- `<Check className="h-4 w-4 text-accent" />`
  - Accent border -- `border-accent` (not `border-2 border-[#F5A623]`)
  - Background tint -- `bg-accent/10`
  - Transition: 200ms ease-out -- `transition-all duration-200`

- **Reduced Motion Handling:**
  ```typescript
  // Hook or inline check
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // If true, skip scale-105 and use instant transitions
  ```
  The existing `QuestionnaireFlow.tsx` already checks reduced motion for Framer Motion animations. The card components should follow the same pattern for their CSS transitions.

- **Image Placeholder Strategy:**
  The `imageUrl` field on `QuestionOption` is currently unused (all configs have `undefined` for it). For this story, the ImageGrid should render:
  - If `imageUrl` is provided: show the image
  - If not: show a styled placeholder (colored div with the first letter of the label, using accent color)
  This provides a visual upgrade from the current text-only buttons while keeping the door open for actual images in the future.

- **Keyboard Navigation for RadioGroup:**
  For WCAG compliance, radiogroup components (ImageGrid, IconCards) should support:
  - Arrow keys to move between options
  - Space/Enter to select
  - Tab to move in/out of the group
  This follows the WAI-ARIA radio group pattern.

### Previous Story Intelligence (Story 3.3 -- Female Questionnaire Content)

**What was built in Story 3.3:**
- `src/lib/questionnaire/female-questions.ts`: Complete 7-question female config with all question types
- `src/test/female-questions.test.ts`: 59 content validation tests
- Total test count: 583 tests (524 from Stories 1.x/2.x/3.1/3.2 + 59 from Story 3.3)

**Key learnings from Story 3.3:**
- Pre-existing TypeScript errors in `CameraPermissionPrompt.tsx` and `SessionRecoveryBanner.tsx` (Framer Motion type issues from Epic 2) -- not related to this story, ignore them
- The `QuestionInput.tsx` component was created in Story 3.1 as a placeholder with all 4 question types implemented as inline sub-components. This story extracts and polishes them.
- The `icon` field on `QuestionOption` is set to Lucide icon names (strings like `'Briefcase'`) but the current `IconCards` implementation just renders the string text (`{option.icon}`). This story makes it resolve to actual Lucide React components.
- No existing tests reference `QuestionInput` directly -- they test through `QuestionnaireFlow` or test the configs. New component-level tests will be additive.

**Current placeholder behavior being enhanced:**
- `ImageGrid`: Currently renders text-only buttons in a 2x2 grid. Enhancement: add image/placeholder area above label.
- `IconCards`: Currently renders `{option.icon}` as text (shows "Briefcase" literally). Enhancement: resolve to actual `<Briefcase />` Lucide component.
- `SliderInput`: Currently a basic `<input type="range">`. Enhancement: styled track/thumb with accent color.
- `MultiSelectChips`: Currently basic pill buttons. Enhancement: refined styling with better visual feedback.

### Project Structure Notes

```
src/
+-- components/
|   +-- consultation/
|   |   +-- QuestionInput.tsx              # MODIFIED: imports from question-cards/ instead of inline
|   |   +-- QuestionnaireFlow.tsx          # NO CHANGES
|   |   +-- question-cards/
|   |   |   +-- index.ts                  # NEW: barrel export
|   |   |   +-- ImageGrid.tsx             # NEW: polished image grid component
|   |   |   +-- IconCards.tsx             # NEW: polished icon cards with Lucide resolution
|   |   |   +-- SliderInput.tsx           # NEW: polished slider component
|   |   |   +-- MultiSelectChips.tsx      # NEW: polished multi-select chips component
|   |   |   +-- icon-resolver.ts          # NEW: Lucide icon name -> component resolver
+-- test/
    +-- question-cards.test.tsx            # NEW: component tests for all 4 card types
    +-- questionnaire-flow.test.tsx        # VERIFY: no changes needed
    +-- use-questionnaire.test.ts          # VERIFY: no changes needed
    +-- male-questions.test.ts             # NO CHANGES
    +-- female-questions.test.ts           # NO CHANGES
```

### References

- [Source: ux-design.md#4.1] -- Component library: Question Card variants (Image Grid, Slider, Icon Cards, Multi-Select)
- [Source: ux-design.md#3.4] -- Questionnaire design: visual/tap-based, 48px touch targets, conditional logic
- [Source: ux-design.md#8.1] -- Micro-interactions: "Selected option scales up briefly (1.05x), checkmark appears, auto-advances after 300ms"
- [Source: ux-design.md#1.6] -- Motion: 200ms ease-out for micro-interactions
- [Source: ux-design.md#6] -- Accessibility: WCAG 2.1 AA, keyboard navigation, prefers-reduced-motion
- [Source: epics-and-stories.md#S3.4] -- Story acceptance criteria: ImageGrid, IconCard, Slider, MultiSelect, selected states, gender theming, 48px targets
- [Source: architecture.md#6.1] -- Project structure: `src/components/consultation/` for consultation components
- [Source: architecture.md#6.2] -- State management: Zustand ConsultationStore, useQuestionnaire hook
- [Source: prd.md#FR9] -- Lifestyle questionnaire: 5-8 questions, gender-tailored
- [Source: prd.md#NFR2] -- Transitions under 300ms
- [Source: prd.md#NFR15-NFR18] -- Accessibility: WCAG 2.1 AA, keyboard navigation, color contrast
- [Source: 3-3-female-questionnaire-content.md] -- Previous story: 583 total tests, placeholder QuestionInput behavior
- [Source: 3-1-questionnaire-engine.md] -- Engine, types, QuestionInput placeholder, QuestionnaireFlow

### Library & Framework Requirements

| Library | Version | Usage in This Story |
|---------|---------|-------------------|
| lucide-react | 0.575.0 | Dynamic icon resolution for IconCards (Briefcase, Palette, Coffee, Monitor, Check, HelpCircle) |
| react | 19.2.3 | Component rendering, hooks (useState, useEffect, useCallback, useMemo) |
| @testing-library/react | 16.3.2 | Component rendering in tests, user event simulation |
| vitest | 4.0.18 | Test runner |

**NO NEW DEPENDENCIES.** All required packages are already installed. Lucide-react is already used in the existing `QuestionInput.tsx` (imports `Check` icon).

### File Structure Requirements

```
src/
+-- components/
|   +-- consultation/
|   |   +-- QuestionInput.tsx                  # MODIFIED: refactored to import from question-cards/
|   |   +-- QuestionnaireFlow.tsx              # NO CHANGES
|   |   +-- question-cards/
|   |   |   +-- index.ts                      # NEW: barrel export for ImageGrid, IconCards, SliderInput, MultiSelectChips
|   |   |   +-- ImageGrid.tsx                 # NEW: polished 2x2 image grid component
|   |   |   +-- IconCards.tsx                 # NEW: polished icon cards with Lucide icon resolution
|   |   |   +-- SliderInput.tsx               # NEW: polished horizontal slider component
|   |   |   +-- MultiSelectChips.tsx          # NEW: polished multi-select chip component
|   |   |   +-- icon-resolver.ts              # NEW: maps icon string names to Lucide React components
+-- test/
    +-- question-cards.test.tsx                # NEW: comprehensive tests for all 4 card components
    +-- (all other existing test files)        # NO CHANGES expected
```

### Testing Requirements

- Verify all 583 existing tests pass after the refactoring
- New tests in `src/test/question-cards.test.tsx`:
  - **ImageGrid tests:**
    - Renders all options in a 2-column grid
    - Handles selection (calls onChange with option value)
    - Shows checkmark icon on selected option
    - Applies `scale-105` class on selected option
    - Has `role="radiogroup"` on container and `role="radio"` on options
    - Has `aria-checked` attribute matching selection state
    - Has min 48px touch target (min-h-[48px])
  - **IconCards tests:**
    - Renders Lucide icons from option.icon string names
    - Falls back gracefully for unknown icon names
    - Handles selection (calls onChange with option value)
    - Shows checkmark icon on selected option
    - Has proper ARIA roles
    - Has min 48px touch target
  - **SliderInput tests:**
    - Renders with correct min, max, step, and unit from question config
    - Displays current value with unit
    - Handles value changes via range input
    - Has `role="slider"` with correct aria-value attributes
    - Has min 48px touch target
  - **MultiSelectChips tests:**
    - Renders all options as chips
    - Handles toggle selection (add to array)
    - Handles toggle deselection (remove from array)
    - Shows checkmark on selected chips
    - Has `role="group"` on container and `role="checkbox"` on chips
    - Has `aria-checked` matching selection state
    - Has min 48px touch target
  - **Theme compliance tests:**
    - No hardcoded hex colors in rendered output
    - Uses Tailwind theme classes (bg-accent, border-accent, text-foreground, etc.)
  - **Integration tests:**
    - QuestionInput delegates to correct component based on question.type
    - Full questionnaire flow works with new components (render QuestionnaireFlow with male/female config)

### Critical Guardrails

- **DO NOT** modify the questionnaire engine (`src/hooks/useQuestionnaire.ts`). It is generic and complete.
- **DO NOT** modify the Zustand consultation store (`src/stores/consultation.ts`).
- **DO NOT** modify the questionnaire types (`src/types/questionnaire.ts`). All needed types exist.
- **DO NOT** modify `src/lib/questionnaire/index.ts`. It already exports and routes correctly.
- **DO NOT** modify `src/lib/questionnaire/male-questions.ts` or `src/lib/questionnaire/female-questions.ts`.
- **DO NOT** modify the questionnaire page (`src/app/consultation/questionnaire/page.tsx`).
- **DO NOT** install any new npm dependencies.
- **DO NOT** modify any files from Epic 1 or Epic 2.
- **DO NOT** modify any existing test files.
- **DO NOT** use dynamic `import()` or `require()` for Lucide icons -- use an explicit static map.
- **DO NOT** hardcode any color values (hex, rgb). Always use Tailwind theme classes.
- **DO** extract the 4 inline sub-components from `QuestionInput.tsx` into separate files in `question-cards/`.
- **DO** create a Lucide icon resolver that maps string names to React components.
- **DO** maintain the exact same props interface that `QuestionInput` currently passes to sub-components.
- **DO** ensure all components have proper ARIA attributes for accessibility.
- **DO** ensure all touch targets are minimum 48px.
- **DO** respect `prefers-reduced-motion` for animation/transition effects.
- **DO** run the full test suite to verify zero regressions.

### Cross-Story Dependencies

- **Story 1.1 (Design System) -- DONE:** Theme CSS variables, Tailwind config with dual themes. Components use `bg-background`, `text-foreground`, `border-accent`, `bg-accent/10`. Theme switching is automatic based on gender context.
- **Story 3.1 (Questionnaire Engine) -- DONE:** Created `useQuestionnaire` hook, `QuestionInput` placeholder component, `QuestionnaireFlow` container, `QuestionConfig`/`QuestionnaireConfig` types. This story polishes the visual components without changing the engine.
- **Story 3.2 (Male Questionnaire Content) -- DONE:** 6-question male config with all question types (image-grid, slider, icon-cards, multi-select-chips). Includes `icon` field on icon-cards options.
- **Story 3.3 (Female Questionnaire Content) -- DONE:** 7-question female config. Same question types. 583 total tests.
- **Story 3.5 (Progress Bar & Conversational Tone) -- FUTURE:** Will enhance the progress bar in `QuestionnaireFlow`. Independent of this story's card components.
- **Story 3.6 (Questionnaire Completion) -- FUTURE:** Will package responses for API submission. Independent.

### Performance Targets

- Selected state transition: 200ms ease-out (per UX spec motion tokens)
- No layout shift when selecting an option (scale-105 uses CSS transform, not width/height changes)
- Lucide icon resolution is O(1) lookup in a static map -- zero performance impact
- Total bundle impact: minimal -- extracting inline components into files doesn't change bundle size. Icon resolver adds ~4 Lucide icon imports (already tree-shakeable).

### Git Intelligence

Recent commit pattern:
- `feat(epic-3): implement story 3-3-female-questionnaire-content`
- `feat(epic-3): implement story 3-2-male-questionnaire-content`
- `feat(epic-3): implement story 3-1-questionnaire-engine`

Suggested commit message: `feat(epic-3): implement story 3-4-question-card-components`

### Existing Code to Refactor

The current `QuestionInput.tsx` (244 lines) contains 4 inline sub-components that this story extracts and polishes:

**Current `ImageGrid` (lines 51-96):** Basic 2-column grid of text buttons with selection state. Enhancement: add image/placeholder area, refine styling.

**Current `IconCards` (lines 98-146):** Horizontal scrollable row of text buttons that render `option.icon` as text string. Enhancement: resolve icon strings to actual Lucide React components, refine layout.

**Current `SliderInput` (lines 148-189):** Basic `<input type="range">` with min/max labels. Enhancement: styled accent-colored track/thumb, better typography.

**Current `MultiSelectChips` (lines 191-244):** Basic pill buttons with toggle logic. Enhancement: refined chip styling, better visual feedback.

All 4 components already have correct ARIA roles, data attributes, and basic styling. This story refines the visuals and adds the missing Lucide icon resolution.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- matchMedia mock missing in jsdom: Existing tests that rendered components through `QuestionInput` failed because the new extracted components call `window.matchMedia('(prefers-reduced-motion: reduce)')`. Fixed by adding a global `matchMedia` mock to `src/test/setup.ts`.
- Test for placeholder first letter: Initial test used `getByText('M')` which found multiple matches (Moderno + Minimalista both start with M). Fixed by using `getAllByText('M')` with length assertion.

### Completion Notes List

- Extracted 4 inline sub-components from `QuestionInput.tsx` (244 lines) into separate polished component files in `src/components/consultation/question-cards/`.
- Created `icon-resolver.ts` with a static map of Lucide icons (Briefcase, Palette, Coffee, Monitor) and HelpCircle fallback. Uses O(1) lookup, no dynamic imports.
- ImageGrid now renders a placeholder area with first letter of label (or actual image if `imageUrl` is provided) above the label text for visual engagement.
- IconCards now resolves Lucide icon string names to actual `<Briefcase />`, `<Palette />`, etc. React components instead of rendering raw text.
- All 4 components implement `prefers-reduced-motion` check -- `scale-105` animation is skipped when user prefers reduced motion.
- All components have proper ARIA roles: `radiogroup/radio` for single-select (ImageGrid, IconCards), `group/checkbox` for multi-select (MultiSelectChips), `slider` with full aria-value attributes.
- Keyboard navigation added: Arrow keys move between radio options, Enter/Space select, Tab moves in/out of group.
- All touch targets meet 48px minimum (`min-h-[48px]`).
- No hardcoded colors -- all styling uses Tailwind CSS theme variables (border-accent, bg-accent/10, text-foreground, etc.).
- `QuestionInput.tsx` refactored from 244 lines to 49 lines (imports only, switch-case delegates to sub-components).
- `QuestionnaireFlow.tsx` required zero changes -- it only imports `QuestionInput` which still exports the same interface.
- 59 new tests added in `src/test/question-cards.test.tsx` covering rendering, selection, ARIA, touch targets, reduced motion, theme compliance, icon resolution, and integration.
- Full test suite: 642 tests pass (583 existing + 59 new), zero regressions.
- Pre-existing TypeScript errors in CameraPermissionPrompt.tsx and SessionRecoveryBanner.tsx (Framer Motion type issues from Epic 2) remain unchanged.

### Change Log

- 2026-03-02: Implemented story 3-4-question-card-components. Extracted and polished 4 question card components (ImageGrid, IconCards, SliderInput, MultiSelectChips) with Lucide icon resolution, accessibility, reduced motion support, and 59 new tests. Total: 642 tests passing.
- 2026-03-02: Code review fixes applied: (1) Added `ease-out` transition timing to ImageGrid, IconCards, MultiSelectChips per UX spec 1.6; (2) Replaced inline `window.matchMedia` reduced-motion check with reactive `useReducedMotion` hook using useState+useEffect+event listener pattern; (3) Updated QuestionInput to import from barrel export. All 642 tests pass.

### File List

- src/hooks/useReducedMotion.ts (NEW -- review fix: reactive reduced-motion hook)
- src/components/consultation/question-cards/icon-resolver.ts (NEW)
- src/components/consultation/question-cards/ImageGrid.tsx (NEW, MODIFIED in review)
- src/components/consultation/question-cards/IconCards.tsx (NEW, MODIFIED in review)
- src/components/consultation/question-cards/SliderInput.tsx (NEW)
- src/components/consultation/question-cards/MultiSelectChips.tsx (NEW, MODIFIED in review)
- src/components/consultation/question-cards/index.ts (NEW)
- src/components/consultation/QuestionInput.tsx (MODIFIED, MODIFIED in review)
- src/test/question-cards.test.tsx (NEW, MODIFIED in review)
- src/test/setup.ts (MODIFIED -- added matchMedia mock for jsdom)
