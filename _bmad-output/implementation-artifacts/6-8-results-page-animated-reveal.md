# Story 6.8: Results Page Animated Reveal

Status: ready-for-dev

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

- [ ] Task 1: Create `ResultsPageAnimatedReveal` wrapper component (AC: #1, #2, #3, #4)
  - [ ] 1.1: Create `src/components/consultation/ResultsPageAnimatedReveal.tsx`
  - [ ] 1.2: Implement Framer Motion `motion.div` container with `staggerChildren: 0.15` variant
  - [ ] 1.3: Define `itemVariants` for slide-up + fade-in (y: 20 -> 0, opacity: 0 -> 1, duration: 0.4)
  - [ ] 1.4: Use `useReducedMotion()` hook from Framer Motion to conditionally disable all animations
  - [ ] 1.5: Export `AnimatedSection` sub-component that wraps each child in `motion.div` with `itemVariants`

- [ ] Task 2: Create section placeholder components for Epic 6 stories 1-7 (AC: #1)
  - [ ] 2.1: Create `FaceShapeSection` placeholder component (Story 6-1 will implement fully)
  - [ ] 2.2: Create `HeroRecommendationCard` placeholder component (Story 6-2 will implement fully)
  - [ ] 2.3: Create `AlternativeRecommendations` placeholder component (Story 6-3 will implement fully)
  - [ ] 2.4: Create `StylesToAvoidSection` placeholder component (Story 6-4 will implement fully)
  - [ ] 2.5: Create `GroomingTipsSection` placeholder component (Story 6-5 will implement fully)
  - [ ] 2.6: Create `StylingTipsSection` placeholder component (Story 6-6 will implement fully)
  - [ ] 2.7: Create `ResultsActionsFooter` placeholder component (Story 6-7 will implement fully)

- [ ] Task 3: Integrate with existing results page (AC: #5, #6)
  - [ ] 3.1: Replace `PaidResultsPlaceholder` in `src/app/consultation/results/[id]/page.tsx` with `ResultsPageAnimatedReveal`
  - [ ] 3.2: Preserve existing `AnimatePresence mode="wait"` and paywall dissolve exit animation
  - [ ] 3.3: Ensure results entrance delay (0.3s) syncs with paywall exit (0.5s)
  - [ ] 3.4: Pass `shouldReduceMotion` from page to `ResultsPageAnimatedReveal`

- [ ] Task 4: Write tests (AC: #1, #2, #3, #4)
  - [ ] 4.1: Test staggered render order (sections appear in correct sequence)
  - [ ] 4.2: Test `prefers-reduced-motion` disables all animations (no motion props applied)
  - [ ] 4.3: Test all 7 section placeholders render within the animated wrapper
  - [ ] 4.4: Test integration with payment status (results only show when `paymentStatus === 'paid'`)

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

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
