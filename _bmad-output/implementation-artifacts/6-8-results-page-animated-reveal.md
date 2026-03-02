# Story 6.8: Results Page Animated Reveal

Status: done

## Story

As a user,
I want results revealed one by one with staggered animations so the experience feels premium,
so that the consultation results feel like a curated, Spotify Wrapped-style reveal rather than a static page load.

## Acceptance Criteria

1. Staggered reveal: face shape section appears first, then hero recommendation, then alternative recommendations, then styles to avoid, then grooming tips, then styling tips, then actions footer
2. 150ms delay between each section reveal (staggerChildren: 0.15)
3. Each section uses slide-up + fade-in animation (y: 20 -> 0, opacity: 0 -> 1, duration: 400ms)
4. Respects `prefers-reduced-motion`: when enabled, all animations are skipped entirely (no stagger, no slide, instant render)
5. Animated reveal integrates seamlessly with the existing paywall dissolve animation (blur -> clear, 500ms) already implemented in `/consultation/results/[id]/page.tsx`
6. The reveal triggers only after payment success, as the results entrance follows the paywall exit animation (0.3s delay already in place)

## Tasks / Subtasks

- [x] Task 1: Create `ResultsPageAnimatedReveal` wrapper component (AC: #1, #2, #3, #4)
  - [x] 1.1: Create `src/components/consultation/ResultsPageAnimatedReveal.tsx`
  - [x] 1.2: Implement Framer Motion `motion.div` container with `staggerChildren: 0.15` variant
  - [x] 1.3: Define `itemVariants` for slide-up + fade-in (y: 20 -> 0, opacity: 0 -> 1, duration: 0.4)
  - [x] 1.4: Use `useReducedMotion()` hook from Framer Motion to conditionally disable all animations
  - [x] 1.5: Export `AnimatedSection` sub-component that wraps each child in `motion.div` with `itemVariants`

- [x] Task 2: Create section placeholder components for Epic 6 stories 1-7 (AC: #1)
  - [x] 2.1: Create `FaceShapeSection` placeholder component (Story 6-1 will implement fully)
  - [x] 2.2: Create `HeroRecommendationCard` placeholder component (Story 6-2 will implement fully)
  - [x] 2.3: Create `AlternativeRecommendations` placeholder component (Story 6-3 will implement fully)
  - [x] 2.4: Create `StylesToAvoidSection` placeholder component (Story 6-4 will implement fully)
  - [x] 2.5: Create `GroomingTipsSection` placeholder component (Story 6-5 will implement fully)
  - [x] 2.6: Create `StylingTipsSection` placeholder component (Story 6-6 will implement fully)
  - [x] 2.7: Create `ResultsActionsFooter` placeholder component (Story 6-7 will implement fully)

- [x] Task 3: Integrate with existing results page (AC: #5, #6)
  - [x] 3.1: Replace `PaidResultsPlaceholder` in `src/app/consultation/results/[id]/page.tsx` with `ResultsPageAnimatedReveal`
  - [x] 3.2: Preserve existing `AnimatePresence mode="wait"` and paywall dissolve exit animation
  - [x] 3.3: Ensure results entrance delay (0.3s) syncs with paywall exit (0.5s)
  - [x] 3.4: Pass `shouldReduceMotion` from page to `ResultsPageAnimatedReveal`

- [x] Task 4: Write tests (AC: #1, #2, #3, #4)
  - [x] 4.1: Test staggered render order (sections appear in correct sequence)
  - [x] 4.2: Test `prefers-reduced-motion` disables all animations (no motion props applied)
  - [x] 4.3: Test all 7 section placeholders render within the animated wrapper
  - [x] 4.4: Test integration with payment status (results only show when `paymentStatus === 'paid'`)

## Dev Notes

### Architecture Patterns and Constraints

- **Animation library**: Framer Motion (already installed: `framer-motion@^12.34.3`). Use `motion`, `useReducedMotion`, and `Variants` type from `framer-motion`. Do NOT import from `motion/react` or any other path.
- **Animation pattern already established**: The existing `PaidResultsPlaceholder` in `page.tsx` already demonstrates the exact stagger + item variant pattern to follow. Reuse the same approach, just expand it to wrap real section components.
- **Existing `useReducedMotion` hook**: Framer Motion's built-in `useReducedMotion()` is already used in `page.tsx` and `FaceShapeReveal.tsx`. Use the same hook (NOT the custom `src/hooks/useReducedMotion.ts` unless it wraps Framer's version).
- **Component naming convention**: All consultation components live in `src/components/consultation/`. Use PascalCase filenames matching the component name.
- **Styling**: Tailwind CSS classes only. Follow existing patterns: `min-h-screen`, `px-4`, `max-w-sm`/`max-w-md` for container widths, `text-foreground`/`text-muted-foreground` for theme-aware colors.
- **'use client' directive**: All components using Framer Motion MUST have `'use client';` at the top.
- **Motion design tokens from UX spec**: Results reveal uses 150ms stagger per element. Page transitions use 350ms ease-in-out. Micro-interactions use 200ms ease-out.

### Critical Implementation Details

- **DO NOT build the full results page content** -- this story is ONLY the animated reveal wrapper and section orchestration. Stories 6-1 through 6-7 will implement the actual content components. Create minimal placeholder components that render section titles with skeleton-style content.
- **Placeholder components should accept props** that the real implementations will need (e.g., `faceAnalysis`, `recommendations`, `consultation` from the store) so stories 6-1 through 6-7 can replace the internals without changing the animation wrapper.
- **The `ResultsPageAnimatedReveal` component should read from the consultation store** to get `faceAnalysis` and `consultation` data. The `consultation` field is currently typed as `unknown` in the store -- use type assertions or create a local interface matching the `Consultation` type from `src/types/index.ts`.
- **Paywall-to-results transition**: The current page uses `AnimatePresence mode="wait"` with a paywall exit animation (blur + opacity, 500ms) and results entrance (opacity 0->1, 400ms, 0.3s delay). The staggered reveal should begin AFTER this entrance animation completes.

### Data Flow

```
ConsultationStore (Zustand)
  ├── faceAnalysis: FaceAnalysisOutput  (from AI pipeline, available after processing)
  ├── consultation: unknown             (full results after payment, typed as Consultation)
  ├── paymentStatus: 'paid'             (triggers results display)
  └── gender: 'male' | 'female'        (for theme context)

page.tsx (AnimatePresence)
  ├── paywall (exit: blur+fade 500ms)
  └── results (enter: fade 400ms, delay 0.3s)
       └── ResultsPageAnimatedReveal (stagger container)
            ├── FaceShapeSection        (150ms delay 0)
            ├── HeroRecommendationCard  (150ms delay 1)
            ├── AlternativeRecommendations (150ms delay 2)
            ├── StylesToAvoidSection    (150ms delay 3)
            ├── GroomingTipsSection     (150ms delay 4)
            ├── StylingTipsSection      (150ms delay 5)
            └── ResultsActionsFooter   (150ms delay 6)
```

### Project Structure Notes

Files to create:
- `src/components/consultation/ResultsPageAnimatedReveal.tsx` -- main animated wrapper
- `src/components/consultation/results/FaceShapeSection.tsx` -- placeholder
- `src/components/consultation/results/HeroRecommendationCard.tsx` -- placeholder
- `src/components/consultation/results/AlternativeRecommendations.tsx` -- placeholder
- `src/components/consultation/results/StylesToAvoidSection.tsx` -- placeholder
- `src/components/consultation/results/GroomingTipsSection.tsx` -- placeholder
- `src/components/consultation/results/StylingTipsSection.tsx` -- placeholder
- `src/components/consultation/results/ResultsActionsFooter.tsx` -- placeholder
- `src/test/results-page-animated-reveal.test.tsx` -- tests

Files to modify:
- `src/app/consultation/results/[id]/page.tsx` -- replace `PaidResultsPlaceholder` with `ResultsPageAnimatedReveal`

Alignment: Follows `src/components/consultation/` convention. Uses a `results/` subdirectory to group the 7 section components and keep the consultation folder manageable. This matches the architecture doc's structure at `src/components/consultation/ResultsPage.tsx` but splits into sub-components.

### Type References

```typescript
// From src/types/index.ts
interface Consultation {
  recommendations: StyleRecommendation[];
  stylesToAvoid: StyleToAvoid[];
  groomingTips: GroomingTip[];
}

interface StyleRecommendation {
  styleName: string;
  justification: string;
  matchScore: number;
  difficultyLevel: 'low' | 'medium' | 'high';
}

interface StyleToAvoid {
  styleName: string;
  reason: string;
}

interface GroomingTip {
  category: 'products' | 'routine' | 'barber_tips';
  tipText: string;
  icon: string;
}

// From src/lib/ai/schemas (FaceAnalysisOutput)
// Already imported in consultation store
```

### Testing Standards

- Test file location: `src/test/results-page-animated-reveal.test.tsx`
- Testing framework: Vitest + React Testing Library (follow existing test patterns in `src/test/`)
- Mock `framer-motion` to test animation variants are applied correctly
- Mock `useReducedMotion` to test both motion-enabled and motion-disabled paths
- Mock `useConsultationStore` with Zustand store mock pattern used in existing tests
- Test that all 7 section components render in the correct DOM order
- Test reduced motion: verify no animation-related props when `prefers-reduced-motion` is active

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#S6.8] Story definition and acceptance criteria
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 1.6 Motion] Motion design tokens: 150ms stagger, 350ms page, 200ms micro
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 3.6 Results Page] Results page content hierarchy and section order
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 6 Accessibility] WCAG 2.1 AA, prefers-reduced-motion requirement
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 8.1 Micro-interactions] Result card reveal: slides up from bottom with 150ms stagger
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 2.1 Frontend] Framer Motion for results reveal, loading animations, page transitions
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 6.1 Project Structure] Component locations and naming conventions
- [Source: src/app/consultation/results/[id]/page.tsx] Existing paywall dissolve + results entrance animation pattern
- [Source: src/components/consultation/FaceShapeReveal.tsx] Existing Framer Motion animation pattern (fade + slide-up)
- [Source: src/stores/consultation.ts] ConsultationStore interface and state shape

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation proceeded cleanly without blocking issues.

### Completion Notes List

- Since Stories 6-1 through 6-7 were already fully implemented (all `done` in sprint-status.yaml), Task 2 (create placeholder components) was completed by directly integrating the real implementations into `ResultsPageAnimatedReveal`. No separate placeholder files were needed.
- `ResultsPageAnimatedReveal` reads directly from the consultation store (`useConsultationStore`) to access `faceAnalysis`, `photoPreview`, `consultation`, `gender`, and `consultationId`, keeping the component self-contained and decoupled from the page.
- The component accepts an optional `shouldReduceMotion` prop so the parent page can pass down its own `useReducedMotion()` value. If not provided, the component falls back to its own `useReducedMotion()` hook.
- `page.tsx` was simplified: all 7 section components are removed from page imports and rendering is now delegated entirely to `ResultsPageAnimatedReveal`. The `AnimatePresence`, paywall exit (blur+fade 500ms), and results entrance (opacity 0->1, delay 0.3s) animations are preserved exactly as before.
- All 1301 tests pass with no regressions. 24 new tests added in `src/test/results-page-animated-reveal.test.tsx`.
- Linting passes with no errors on all modified files.

### File List

- src/components/consultation/ResultsPageAnimatedReveal.tsx (created)
- src/test/results-page-animated-reveal.test.tsx (created)
- src/app/consultation/results/[id]/page.tsx (modified)

## Senior Developer Review (AI)

**Reviewer:** Fusuma (AI Code Review) on 2026-03-02
**Story:** 6-8-results-page-animated-reveal
**Git vs Story Discrepancies:** 0 found (story File List matches git changes exactly)
**Issues Found:** 2 Medium, 1 Low — all fixed

### Issues Found and Fixed

#### MEDIUM-1: Redundant manual `delay`/`baseDelay` props on child components
**File:** `src/components/consultation/ResultsPageAnimatedReveal.tsx` lines 114, 126
**Problem:** `HeroRecommendationCard` was receiving `delay={shouldReduceMotion ? 0 : 0.15}` and `AlternativeRecommendationsSection` was receiving `baseDelay={shouldReduceMotion ? 0 : 0.3}`. Both components have their own internal Framer Motion animations. Since `ResultsPageAnimatedReveal` already wraps each section in a stagger `motion.div` that propagates the parent's animation timing, passing explicit delay offsets to the children creates redundant double-delay: the stagger already controls when each section starts, and then the child adds another delay on top. This produces incorrect animation timing and can cause sections to appear later than intended.
**Fix:** Removed the `delay` and `baseDelay` props. The parent stagger container (`staggerChildren: 0.15`) controls section timing exclusively.
**Status:** Fixed

#### MEDIUM-2: TypeScript TS7022 error — `mockStoreState` self-referential implicit `any`
**File:** `src/test/results-page-animated-reveal.test.tsx` line 49
**Problem:** `mockStoreState.faceAnalysis` was typed as `typeof mockStoreState['faceAnalysis'] | null`, which is a self-referential type that causes TypeScript error TS7022: "implicitly has type 'any' because it does not have a type annotation and is referenced directly or indirectly in its own initializer". This prevents `npx tsc --noEmit` from passing cleanly on this file.
**Fix:** Added explicit imports for `FaceAnalysisOutput` and `Consultation` types, then provided a proper type annotation for the `mockStoreState` object. All `as const` casts removed from field assignments as they are no longer needed with the explicit type.
**Status:** Fixed

#### LOW-1: Missing AC #2 test coverage for staggerChildren: 0.15 configuration
**File:** `src/test/results-page-animated-reveal.test.tsx`
**Problem:** The test suite had no test that directly validated the stagger configuration value (`staggerChildren: 0.15` as required by AC #2) or the item variant animation values (y: 20->0, opacity: 0->1 as required by AC #3). The mock captured these values but no assertion verified them.
**Fix:** Added a new test suite `ResultsPageAnimatedReveal - stagger animation config (AC #2, #3)` with 4 tests that assert: (1) `staggerChildren: 0.15` on container variants, (2) `initial="hidden"` and `animate="visible"` on container, (3) no stagger animation props when `prefers-reduced-motion` enabled, (4) `hidden: {opacity: 0, y: 20}` and `visible: {opacity: 1, y: 0}` on item variants.
**Status:** Fixed — 4 new tests added (total: 28 tests)

### Review Outcome: APPROVED

All Acceptance Criteria are fully implemented:
- AC #1: 7-section stagger order implemented and tested
- AC #2: `staggerChildren: 0.15` confirmed in component and now tested
- AC #3: `y: 20->0, opacity: 0->1, duration: 0.4` confirmed in component and now tested
- AC #4: `useReducedMotion()` hook integration confirmed, all animations skipped when active
- AC #5: `AnimatePresence mode="wait"` and paywall dissolve animation (blur+opacity 500ms) preserved in `page.tsx`
- AC #6: Results entrance delay (0.3s) confirmed in `page.tsx`, synced with paywall exit (0.5s)

All tasks marked [x] are verified complete. Implementation is clean, well-documented, and follows project conventions.

## Change Log

- 2026-03-02: Story 6.8 implemented. Created `ResultsPageAnimatedReveal` component with Framer Motion stagger animation (staggerChildren: 0.15, itemVariants: y 20->0, opacity 0->1, duration 0.4s). Respects `prefers-reduced-motion`. Integrated into results page replacing direct section rendering. 24 tests added. All 1301 tests pass.
- 2026-03-02: Code review complete (AI reviewer). Fixed 2 medium issues (redundant delay props on child components, TS7022 error in test file), 1 low issue (missing AC#2/#3 test assertions). Added 4 new stagger config tests. Total tests: 28 (all passing). Story status: done.
