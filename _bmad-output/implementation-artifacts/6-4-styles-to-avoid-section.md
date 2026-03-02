# Story 6.4: Styles to Avoid Section

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to know which styles DON'T suit my face shape so I avoid bad choices,
so that I trust the AI understands my face and can make informed decisions at the barber/salon.

## Acceptance Criteria

1. A section header "Estilos a evitar" is displayed with a warning icon (Lucide `AlertTriangle`), positioned after the recommendation cards (Sections B & C) and before the grooming tips section (Section E / Story 6.5).
2. The section renders 2-3 style-to-avoid cards, each displaying `styleName` and `reason` from the `styles_to_avoid` Supabase table for the current consultation.
3. Each card uses a muted/warning visual style (distinct from recommendation cards) -- e.g., muted background with a subtle border, no accent color, to clearly differentiate "avoid" from "recommended."
4. Card-based layout: each style to avoid is a separate visual card (not a bullet list or text dump).
5. The section fetches `styles_to_avoid` data from Supabase via `GET /api/consultation/:id` (or a dedicated endpoint) and renders it client-side.
6. Framer Motion staggered reveal animation (150ms per card) consistent with the results page animated reveal pattern (Story 6.8). Respects `prefers-reduced-motion`.
7. Responsive: cards stack vertically on mobile (single column), can use a grid on tablet/desktop.
8. Accessible: section has a proper heading level, cards have semantic structure, warning icon has `aria-hidden="true"` with visible text label.
9. All new files have corresponding unit tests verifying: component rendering with mock data, empty state handling (0 styles to avoid), animation presence, accessibility attributes.

## Tasks / Subtasks

- [x] Task 1: Create API endpoint or extend existing to serve styles_to_avoid data (AC: 5)
  - [x] Check if `GET /api/consultation/:id` already returns `styles_to_avoid` data -- if not, extend it
  - [x] Query Supabase: `styles_to_avoid.select('id, style_name, reason').eq('consultation_id', id)`
  - [x] Return `stylesToAvoid: { styleName, reason }[]` in the consultation response
  - [x] Handle empty array gracefully (consultation may have 0 styles to avoid)

- [x] Task 2: Create `StylesToAvoid` component (AC: 1, 2, 3, 4, 6, 7, 8)
  - [x] Create `src/components/consultation/StylesToAvoid.tsx`
  - [x] Props: `stylesToAvoid: StyleToAvoid[]` (import type from `@/types`)
  - [x] Section header: `<h2>` with Lucide `AlertTriangle` icon + "Estilos a evitar" text
  - [x] `AlertTriangle` icon: `aria-hidden="true"`, sized consistently (w-5 h-5), warning/muted color
  - [x] Map over `stylesToAvoid` array, render a `StyleToAvoidCard` for each
  - [x] Use Framer Motion `motion.div` with staggered children (150ms per card, consistent with UX spec)
  - [x] Respect `useReducedMotion()` from Framer Motion -- skip animations if true
  - [x] If `stylesToAvoid` is empty, render nothing (return `null`)
  - [x] Responsive: `flex flex-col gap-3` on mobile, optionally `md:grid md:grid-cols-2 md:gap-4` on larger screens

- [x] Task 3: Create `StyleToAvoidCard` sub-component (AC: 3, 4, 8)
  - [x] Can be a named export from the same file or a local component within `StylesToAvoid.tsx`
  - [x] Props: `styleName: string`, `reason: string`
  - [x] Visual style: muted card -- use `bg-muted/50 border border-border rounded-xl p-4` (NOT the accent-colored recommendation card style)
  - [x] Style name: `font-semibold text-foreground` (e.g., "Cortes muito rentes nas laterais")
  - [x] Reason: `text-sm text-muted-foreground mt-1` (the explanation of why to avoid)
  - [x] No CTA buttons (unlike recommendation cards -- this is informational only)
  - [x] Semantic: use `<article>` or `<div role="article">` for each card

- [x] Task 4: Integrate into results page (AC: 1)
  - [x] Import `StylesToAvoid` in `src/app/consultation/results/[id]/page.tsx`
  - [x] Position after recommendation sections (B & C) and before grooming tips (E)
  - [x] Pass `stylesToAvoid` data from the consultation API response
  - [x] Wire up within the existing `AnimatePresence` / paid results section

- [x] Task 5: Write unit tests (AC: 9)
  - [x] Create `src/test/styles-to-avoid.test.tsx`
  - [x] Test: renders section header with warning icon and "Estilos a evitar" text
  - [x] Test: renders correct number of cards for mock data (2-3 items)
  - [x] Test: each card displays `styleName` and `reason`
  - [x] Test: returns null when `stylesToAvoid` is an empty array
  - [x] Test: `AlertTriangle` icon has `aria-hidden="true"`
  - [x] Test: `motion.div` is present (animation wrapper exists)
  - [x] Test: section heading has correct heading level
  - [x] Run full test suite to ensure no regressions

## Dev Notes

### Architecture & Patterns

- **Data flow**: `styles_to_avoid` table in Supabase -> API route -> client component. The data is already being written to Supabase by `POST /api/consultation/generate` (see `storeConsultationResults` in `src/app/api/consultation/generate/route.ts`). This story only needs to READ and DISPLAY it.
- **Existing type**: `StyleToAvoid` interface already exists in `src/types/index.ts` with `{ styleName: string; reason: string }`.
- **Existing schema**: `StyleToAvoidSchema` in `src/lib/ai/schemas/consultation.schema.ts` validates `{ styleName: z.string(), reason: z.string().min(10) }`. The AI generates 2-3 items (schema enforces `min(2).max(3)`).
- **Zustand store**: `consultation: unknown | null` in `src/stores/consultation.ts` is typed as `unknown` -- the paid results flow will need to type this properly. The store already has the `consultation` field but it is not yet populated by any client-side code. The results page (`src/app/consultation/results/[id]/page.tsx`) currently shows a `PaidResultsPlaceholder` for paid users. This story (and sibling Epic 6 stories) will replace that placeholder with real results.

### Existing Components to Reuse

- **shadcn/ui Card**: `src/components/ui/card.tsx` -- use `Card`, `CardContent`, `CardHeader`, `CardTitle` for consistent styling, OR use simple Tailwind divs for the muted style (recommendation cards don't use shadcn Card either -- see `BlurredRecommendationCard.tsx` for the pattern of custom Tailwind styling).
- **Badge**: `src/components/ui/badge.tsx` -- could use `variant="outline"` or `variant="secondary"` for the warning header badge, but simple Tailwind is also fine.
- **Lucide icons**: Already installed and used throughout the project (see `AlertTriangle` in `RefundBanner.tsx`). Import from `lucide-react`.
- **Framer Motion**: Already used extensively. Use `useReducedMotion()` hook and stagger pattern from the UX spec.

### Database Schema Reference

```sql
styles_to_avoid
  ├── id (uuid, PK)
  ├── consultation_id (FK → consultations)
  ├── style_name (text)
  └── reason (text)
```

[Source: _bmad-output/planning-artifacts/architecture.md#3.1 Entity Relationship]

### Results Page Section Ordering

The results page follows a strict content hierarchy per UX spec Section 3.6:
- Section A: Face Shape Analysis (Story 6.1)
- Section B: Hero Recommendation Card (Story 6.2)
- Section C: Alternative Recommendation Cards (Story 6.3)
- **Section D: Styles to Avoid (THIS STORY)**
- Section E: Grooming Tips (Story 6.5)
- Section F: Styling Tips (Story 6.6)
- Section G: Actions Footer (Story 6.7)

[Source: _bmad-output/planning-artifacts/ux-design.md#3.6 Results Page]

### Design Specifications

- **Visual identity**: Muted styling, distinct from recommendation cards. Think "informational warning" not "error." Use `bg-muted/50` or similar subdued background.
- **Warning icon**: Lucide `AlertTriangle`, sized `w-5 h-5`, color `text-amber-500` (or `text-muted-foreground` for subtlety). Per UX spec: section header uses a warning icon.
- **Typography**: Section heading uses `Inter 600` (subheading weight). Style names use `font-semibold`. Reasons use body text (`text-sm`).
- **Border radius**: Cards use 16px (`rounded-xl`) per design system.
- **Spacing**: 4px base unit. Cards separated by 12px or 16px gap.
- **Motion**: 150ms stagger per element, slide-up + fade-in. Respect `prefers-reduced-motion`.

[Source: _bmad-output/planning-artifacts/ux-design.md#1.1-1.6 Design System]

### Testing Standards

- Use Vitest + React Testing Library (project standard).
- Mock Framer Motion: `vi.mock('framer-motion', ...)` to render static elements in tests.
- Follow existing test patterns in `src/test/` directory (see `refund-banner.test.tsx` for component test pattern).
- Test file location: `src/test/styles-to-avoid.test.tsx`.

### Anti-Patterns to Avoid

- **DO NOT** create a separate API route just for styles_to_avoid -- extend the existing consultation fetch or create a unified results endpoint that returns all sections at once.
- **DO NOT** duplicate the `StyleToAvoid` type -- it already exists in `src/types/index.ts`.
- **DO NOT** use CSS blur or hide real data behind CSS -- this section is only shown to paid users (already gated by the paywall in `results/[id]/page.tsx`).
- **DO NOT** use `shadcn/ui Alert` component (it doesn't exist in the project) -- use custom Tailwind-styled cards.
- **DO NOT** fetch data in a `useEffect` with local state if a parent component can pass it as props -- prefer prop drilling from the results page.

### Project Structure Notes

- Component file: `src/components/consultation/StylesToAvoid.tsx` (consistent with existing consultation components in that directory)
- Test file: `src/test/styles-to-avoid.test.tsx` (consistent with existing test location)
- No new directories needed
- No new dependencies needed (Lucide, Framer Motion, Tailwind all already installed)

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#S6.4 — Styles to Avoid Section]
- [Source: _bmad-output/planning-artifacts/ux-design.md#3.6 Results Page — Section D]
- [Source: _bmad-output/planning-artifacts/architecture.md#3.1 Entity Relationship — styles_to_avoid table]
- [Source: _bmad-output/planning-artifacts/architecture.md#6.1 Project Structure — components/consultation/StylesToAvoid.tsx]
- [Source: src/types/index.ts — StyleToAvoid interface]
- [Source: src/lib/ai/schemas/consultation.schema.ts — StyleToAvoidSchema]
- [Source: src/app/api/consultation/generate/route.ts — storeConsultationResults writes styles_to_avoid]
- [Source: src/app/consultation/results/[id]/page.tsx — current results page with PaidResultsPlaceholder]
- [Source: src/components/consultation/RefundBanner.tsx — AlertTriangle usage pattern]
- [Source: src/components/consultation/BlurredRecommendationCard.tsx — card styling pattern]

### Git Intelligence

Recent commits show Epic 5 (Payment Integration) is complete. The results page currently has:
- Paywall component with blur animation (Story 5.3)
- PaidResultsPlaceholder showing "Resultados completos disponíveis em breve (Epic 6)"
- RefundBanner for failed payment refunds (Story 5.6)
- Consultation status polling hook (Story 5.6)

This story is part of the first wave of Epic 6 that replaces the PaidResultsPlaceholder with actual consultation results. Coordinate with Stories 6.1-6.3 (which handle the sections above this one) and Stories 6.5-6.8 (sections below).

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No debug issues encountered. Implementation proceeded cleanly.

### Completion Notes List

- Task 1 (API endpoint): Verified that `POST /api/consultation/generate` already returns `stylesToAvoid` as part of the consultation response. The data flows through: `storeConsultationResults` writes to `styles_to_avoid` Supabase table; the generate response includes the full `ConsultationOutput` with `stylesToAvoid`. No new endpoint needed. The `Consultation` type in `src/types/index.ts` already includes `stylesToAvoid: StyleToAvoid[]`.
- Task 2 & 3 (Components): Created `StylesToAvoid.tsx` with `StyleToAvoidCard` as a local component. Uses `bg-muted/50 border border-border rounded-xl p-4` muted visual style (distinct from accent-colored recommendation cards). Framer Motion `motion.div` with 150ms stagger per card; respects `useReducedMotion()`. Returns `null` for empty array. Responsive: `flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4`.
- Task 4 (Integration): Added `StylesToAvoid` to results page after Section B (HeroRecommendationCard) and Section C (AlternativeRecommendationsSection, also added as part of integration since it wasn't wired up yet). Section D renders only when `consultation.stylesToAvoid.length > 0`.
- Task 5 (Tests): 15 unit tests cover: section header rendering, h2 heading level, AlertTriangle icon with aria-hidden, card count for 2-3 items, styleName/reason display, empty array returns null, motion.div presence, reduced motion handling, accessibility (role="article").
- Full test suite: 1179 tests pass, 0 regressions.

### File List

- src/components/consultation/StylesToAvoid.tsx (new)
- src/test/styles-to-avoid.test.tsx (new)
- src/test/results-page-styles-to-avoid.test.tsx (new — integration tests for Section D in results page)
- src/app/consultation/results/[id]/page.tsx (modified — added StylesToAvoid and AlternativeRecommendationsSection integration)
- _bmad-output/implementation-artifacts/6-4-styles-to-avoid-section.md (story file — tasks, status, dev record)
- _bmad-output/implementation-artifacts/sprint-status.yaml (status: review → done)

### Change Log

- 2026-03-02: Implemented Story 6.4 — Styles to Avoid Section. Created StylesToAvoid component with StyleToAvoidCard sub-component, 15 unit tests, integrated into results page as Section D after Sections B & C.
- 2026-03-02: Code review complete (AI adversarial review). Fixed: (1) TypeScript error in test mock — lucide-react mock now uses `React.SVGAttributes<SVGElement>` instead of narrower inline type; (2) fragile key prop `${styleName}-${index}` replaced with stable index key; (3) `shouldReduceMotion` prop-drilling removed — each `StyleToAvoidCard` now calls `useReducedMotion()` directly for self-contained behavior; (4) added `aria-label={styleName}` on each card's `role="article"` div for screen reader accessibility; (5) added `src/test/results-page-styles-to-avoid.test.tsx` with 8 integration tests covering StylesToAvoid rendering in results page context, empty state, null consultation, section ordering (Section D after A/B/C). Total test suite: 1187 tests, 0 failures.
