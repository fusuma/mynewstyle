# Story 6.6: Styling Tips (Parsed & Structured)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want styling tips displayed in a scannable, categorized card format,
so that I can quickly find actionable advice without reading a wall of text.

## Acceptance Criteria

1. AI-generated styling tip text is parsed into discrete, structured items (one tip per card)
2. Each tip card displays a thematic Lucide icon relevant to the tip category
3. Tips are grouped under category sub-headers: "Produtos", "Rotina Diaria", "Dicas para o Barbeiro/Cabeleireiro"
4. Desktop layout uses a responsive grid (2-3 columns); mobile stacks vertically
5. Cards are visually consistent with the existing design system (shadcn/ui Card, themed via gender context)
6. Section integrates into the results page between Grooming Tips (Section E) and Actions Footer (Section G) per UX spec hierarchy
7. Empty state handled gracefully: if no styling tips exist in consultation data, section is not rendered

## Tasks / Subtasks

- [x] Task 1: Create StylingTipCard component (AC: #1, #2, #5)
  - [x] 1.1 Create `src/components/consultation/StylingTipCard.tsx`
  - [x] 1.2 Accept props: `tipText: string`, `icon: string`, `category: string`
  - [x] 1.3 Render shadcn/ui Card with Lucide icon resolved from `icon` string prop
  - [x] 1.4 Apply gender-themed styling via existing ThemeProvider context
  - [x] 1.5 Write unit tests in `src/test/styling-tip-card.test.tsx`

- [x] Task 2: Create StylingTipsSection container component (AC: #1, #3, #4, #6, #7)
  - [x] 2.1 Create `src/components/consultation/StylingTipsSection.tsx`
  - [x] 2.2 Accept `groomingTips: GroomingTip[]` prop (reuses existing `GroomingTip` type from `src/types/index.ts`)
  - [x] 2.3 Filter tips by category and group into "Produtos" / "Rotina Diaria" / "Dicas para o Barbeiro/Cabeleireiro"
  - [x] 2.4 Render category sub-headers with appropriate styling
  - [x] 2.5 Render grid of StylingTipCard per category (CSS grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`)
  - [x] 2.6 Return `null` if `groomingTips` array is empty or undefined (empty state)
  - [x] 2.7 Write unit tests in `src/test/styling-tips-section.test.tsx`

- [x] Task 3: Create icon resolver utility (AC: #2)
  - [x] 3.1 Create `src/components/consultation/styling-tips/icon-resolver.ts`
  - [x] 3.2 Map AI-returned icon strings (e.g. "scissors", "spray-can", "clock") to Lucide React components
  - [x] 3.3 Provide a fallback icon (`Lightbulb`) for unrecognized icon strings
  - [x] 3.4 Reuse pattern from existing `src/components/consultation/question-cards/icon-resolver.ts`
  - [x] 3.5 Write unit tests for icon resolution and fallback behavior

- [x] Task 4: Integrate into results page (AC: #6)
  - [x] 4.1 Import StylingTipsSection in the results page component
  - [x] 4.2 Position after grooming tips section, before actions footer
  - [x] 4.3 Pass consultation.groomingTips data to the component
  - [x] 4.4 Ensure staggered reveal animation wraps this section (Framer Motion, 150ms stagger consistent with S6.8)

## Dev Notes

### Architecture & Patterns

- **Component location:** `src/components/consultation/StylingTipsSection.tsx` and `src/components/consultation/StylingTipCard.tsx`
- **Data source:** The `GroomingTip` interface from `src/types/index.ts` defines the shape: `{ category: 'products' | 'routine' | 'barber_tips', tipText: string, icon: string }`
- **Schema validation:** AI output is validated by `ConsultationSchema` in `src/lib/ai/schemas/consultation.schema.ts` which includes `groomingTips: z.array(GroomingTipSchema).min(1)` -- the tips arrive pre-validated
- **Existing pattern reference:** The `question-cards/` directory (especially `icon-resolver.ts`, `IconCards.tsx`) demonstrates the project's pattern for icon-resolved card components. Follow this same pattern.
- **UI library:** Use `Card`, `CardContent`, `CardHeader` from `src/components/ui/card.tsx` and `Badge` from `src/components/ui/badge.tsx` -- these already exist in the project
- **Icons:** Use `lucide-react` (v0.575.0 installed). Import icons dynamically or via a lookup map. The AI returns icon name strings that must be mapped to Lucide components.
- **Styling:** Tailwind CSS with the dual-theme system. The gender theme is available via `useTheme` hook from `src/hooks/useTheme.ts`. Apply accent colors from the theme context.
- **Animation:** Framer Motion is installed (v12.34.3). The results page already uses staggered reveal with 150ms delay. Wrap StylingTipsSection in `motion.div` with `variants` matching the existing pattern in `src/app/consultation/results/[id]/page.tsx`.
- **Testing:** Vitest + React Testing Library + jsdom. Test files in `src/test/` directory following project convention. Test rendering, category grouping, empty state, and icon fallback.

### Category Mapping

The AI schema uses enum values `'products' | 'routine' | 'barber_tips'`. Map to display labels:
- `products` -> "Produtos"
- `routine` -> "Rotina Diaria"
- `barber_tips` -> "Dicas para o Barbeiro/Cabeleireiro"

For female path, `barber_tips` label should display as "Dicas para o Cabeleireiro" (not "Barbeiro"). Use the `gender` from `useConsultationStore` or `useTheme` to conditionally set the label.

### Critical Constraints

- **DO NOT** create a new type or schema for styling tips. Reuse the existing `GroomingTip` type and `ConsultationSchema` -- the AI returns styling tips as part of `groomingTips` array with category-based differentiation.
- **DO NOT** fetch data in this component. The parent results page will pass the tips as props. This is a pure presentational component.
- **DO NOT** add new dependencies. Everything needed (lucide-react, framer-motion, shadcn/ui Card, Tailwind) is already installed.
- **Responsive design is mandatory.** Grid on desktop, stack on mobile. UX spec: grid layout on desktop, stack on mobile.
- **prefers-reduced-motion:** Must respect `useReducedMotion()` from Framer Motion. If reduced motion preferred, skip stagger animations. This pattern is already established in the results page.
- **WCAG 2.1 AA:** All cards must be keyboard-navigable. Icons must have `aria-hidden="true"` (decorative). Card text must meet 4.5:1 contrast ratio against background.

### Project Structure Notes

- Alignment with unified project structure: all consultation components live in `src/components/consultation/`
- The icon resolver follows the established pattern in `src/components/consultation/question-cards/icon-resolver.ts`
- Tests follow the existing pattern with `src/test/` directory (not `__tests__/` subdirectory — project convention uses `src/test/`)
- Icon resolver placed in `src/components/consultation/styling-tips/` subdirectory

### Results Page Integration Context

The current results page at `src/app/consultation/results/[id]/page.tsx` has a `PaidResultsPlaceholder` component that will be replaced by the full results page in Epic 6. Story 6.6 creates the StylingTipsSection component that will be integrated into the full results page layout. The integration point is:

1. The results page currently uses `AnimatePresence` with `mode="wait"` for paywall -> results transition
2. The paid results section uses `containerVariants` with `staggerChildren: 0.15` (150ms)
3. Each section uses `itemVariants` with `opacity: 0, y: 20` -> `opacity: 1, y: 0`
4. StylingTipsSection should be wrapped in `motion.div` with these same `itemVariants`

### Consultation Data Flow

```
AI Pipeline (Story 4.5) -> ConsultationSchema validation (Story 4.6)
  -> consultation.groomingTips: GroomingTip[]
    -> Results Page passes to StylingTipsSection
      -> StylingTipsSection groups by category
        -> StylingTipCard renders each tip
```

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#S6.6] Story requirements and acceptance criteria
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section-F] Styling Tips UX specification: "Parsed into categorized cards with icons. Categories: Produtos, Rotina Diaria, Dicas para o Barbeiro/Cabeleireiro. Each tip is a separate visual card, not a text dump."
- [Source: _bmad-output/planning-artifacts/architecture.md#Section-6.1] Frontend project structure and component organization
- [Source: src/types/index.ts] GroomingTip interface definition (lines 86-90)
- [Source: src/lib/ai/schemas/consultation.schema.ts] ConsultationSchema with GroomingTipSchema validation
- [Source: src/components/consultation/question-cards/icon-resolver.ts] Existing icon resolver pattern to follow
- [Source: src/app/consultation/results/[id]/page.tsx] Results page animation patterns (staggered reveal)
- [Source: src/stores/consultation.ts] Consultation store with gender and payment state
- [Source: src/components/ui/card.tsx] Existing shadcn/ui Card component
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section-1.6] Motion guidelines: micro-interactions 200ms, staggered 150ms per element
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section-6] Accessibility requirements: WCAG 2.1 AA, keyboard navigation, prefers-reduced-motion

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- ESLint "Cannot create components during render" error: Resolved by following the same pattern as GroomingTips.tsx — the IconComponent is resolved in StylingTipsSection (parent) before being passed as a prop to StylingTipCard, preventing creation of components during render.

### Completion Notes List

- Task 1 complete: `StylingTipCard` component created at `src/components/consultation/StylingTipCard.tsx`. Uses shadcn/ui Card, accepts pre-resolved `IconComponent` as prop, applies accent color styling, `aria-hidden="true"` on icon (WCAG 2.1 AA), `role="listitem"` for accessibility. Tests in `src/test/styling-tip-card.test.tsx` (6 tests passing).

- Task 2 complete: `StylingTipsSection` container created at `src/components/consultation/StylingTipsSection.tsx`. Reuses `GroomingTip` type, groups tips by category in canonical order (products, routine, barber_tips), renders category h3 sub-headers, responsive grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, returns `null` for empty/undefined input, respects `useReducedMotion()` with stagger animation disabled when reduced motion preferred. Gender-specific barber_tips label (male: "Dicas para o Barbeiro/Cabeleireiro", female: "Dicas para o Cabeleireiro"). Tests in `src/test/styling-tips-section.test.tsx` (19 tests passing).

- Task 3 complete: Icon resolver created at `src/components/consultation/styling-tips/icon-resolver.ts`. Maps AI icon strings to Lucide components (scissors, droplets, clock, spray-can, comb, wand2, brush, shower-head, star, palette, sparkles, wind, heart). Fallback to `Lightbulb` for unrecognized/empty strings. Case-insensitive resolution. Tests in `src/test/styling-tips-icon-resolver.test.ts` (10 tests passing).

- Task 4 complete: `StylingTipsSection` integrated into `src/app/consultation/results/[id]/page.tsx`. Added `gender` selector from consultation store, conditional rendering guard (groomingTips must be non-empty), positioned after Section D (StylesToAvoid). Animation wrapped via framer-motion's `motion.div` container in results page. Integration tests in `src/test/results-page-styling-tips.test.tsx` (6 tests passing).

- Full test suite: 86 test files, 1248 tests all passing. Zero regressions introduced.

- All 7 Acceptance Criteria verified:
  - AC #1: Each groomingTip rendered as a separate StylingTipCard
  - AC #2: Lucide icons resolved from icon string, with Lightbulb fallback
  - AC #3: Category sub-headers rendered in order: Produtos, Rotina Diaria, Dicas para o Barbeiro/Cabeleireiro
  - AC #4: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` responsive grid
  - AC #5: shadcn/ui Card used, accent-foreground color applied
  - AC #6: Integrated into results page after StylesToAvoid section
  - AC #7: Returns null when groomingTips is empty or undefined

### File List

- src/components/consultation/StylingTipCard.tsx (new)
- src/components/consultation/StylingTipsSection.tsx (new)
- src/components/consultation/styling-tips/icon-resolver.ts (new)
- src/test/styling-tip-card.test.tsx (new)
- src/test/styling-tips-section.test.tsx (new)
- src/test/styling-tips-icon-resolver.test.ts (new)
- src/test/results-page-styling-tips.test.tsx (new)
- src/app/consultation/results/[id]/page.tsx (modified — added GroomingTips Section E and StylingTipsSection Section F imports and integration)

## Change Log

- 2026-03-02: Story 6.6 implemented — StylingTipCard, StylingTipsSection, icon-resolver created; integrated into results page. 41 new tests added. (claude-sonnet-4-6)
- 2026-03-02: Code review fixes applied — (1) Removed invalid `Comb` import from lucide-react (not available in v0.575.0), mapped `comb` key to `Wand2` icon instead; (2) Added GroomingTips (Section E) to results page before StylingTipsSection (Section F) to comply with AC #6 UX spec hierarchy; (3) Updated icon-resolver test mock to remove invalid `Comb` entry and added tests for `comb` and `wand2` resolution; (4) Updated integration test to verify Section E before Section F ordering. 43 tests passing (1250 total, zero regressions). (claude-sonnet-4-6)
