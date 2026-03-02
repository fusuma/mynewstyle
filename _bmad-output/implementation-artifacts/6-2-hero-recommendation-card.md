# Story 6.2: Hero Recommendation Card (#1)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see the top recommendation prominently displayed as a hero card,
so that my decision about which hairstyle to choose is easy and immediate.

## Acceptance Criteria

1. **#1 badge displayed** — Gold/accent colored badge reading "Recomendacao Principal" positioned at top of hero card
2. **Style name in large typography** — Style name rendered using Space Grotesk 600 at heading scale (24px mobile / 32px desktop)
3. **Justification text** — 2-3 sentence visagism reasoning explaining WHY this style suits the user's face shape
4. **Match score** — Displayed as "93% compativel com o seu rosto" format (using recommendation.matchScore * 100, rounded)
5. **Difficulty badge** — "Manutencao: Baixa/Media/Alta" badge mapped from recommendation.difficultyLevel (low/medium/high)
6. **"Ver como fico" button** — Primary button, large, prominent; functionality is a placeholder (preview generation is Epic 7 S7.1)
7. **Hero card visually dominant** — Largest card on the results page, elevated shadow, accent border treatment
8. **Theme-aware rendering** — Card respects male (dark/amber) and female (light/rose) theme variants
9. **Staggered reveal animation** — Card animates in with slide-up + fade-in via Framer Motion (150ms stagger delay from previous section)
10. **Reduced motion support** — Respects `prefers-reduced-motion`: skip all animations when enabled
11. **Responsive layout** — Full-width on mobile (375px primary target), appropriate sizing on tablet/desktop
12. **Accessibility** — All interactive elements keyboard-navigable, WCAG 2.1 AA color contrast, aria-labels on badges and button

## Tasks / Subtasks

- [x] Task 1: Create HeroRecommendationCard component (AC: 1-7, 8, 11)
  - [x] 1.1 Create `src/components/consultation/HeroRecommendationCard.tsx`
  - [x] 1.2 Implement #1 badge with gold/accent theme-aware coloring
  - [x] 1.3 Render style name with Space Grotesk heading typography
  - [x] 1.4 Render justification text block (2-3 sentences)
  - [x] 1.5 Render match score as percentage with "compativel" label
  - [x] 1.6 Render difficulty badge with low/medium/high mapping to Portuguese labels
  - [x] 1.7 Implement "Ver como fico" primary button (placeholder onClick — logs or shows toast)
  - [x] 1.8 Apply hero card styling: elevated shadow, accent border, largest card treatment

- [x] Task 2: Theme integration (AC: 8)
  - [x] 2.1 Use Tailwind theme classes for male/female variants (dark:* and themed accent colors)
  - [x] 2.2 Ensure badge colors, borders, and backgrounds adapt to gender theme
  - [x] 2.3 Verify both themes visually at 375px and 1024px

- [x] Task 3: Animation with Framer Motion (AC: 9, 10)
  - [x] 3.1 Implement slide-up + fade-in entrance animation (opacity 0->1, y 20->0, duration 400ms)
  - [x] 3.2 Accept `delay` prop for staggered reveal orchestration from parent
  - [x] 3.3 Use `useReducedMotion()` hook — when true, render without any animation

- [x] Task 4: Integrate into Results page (AC: 7, 9)
  - [x] 4.1 Replace `PaidResultsPlaceholder` in `src/app/consultation/results/[id]/page.tsx` with actual results layout
  - [x] 4.2 Wire HeroRecommendationCard to consultation data from store/API
  - [x] 4.3 Pass recommendation rank=1 data to HeroRecommendationCard

- [x] Task 5: Responsive and accessibility (AC: 11, 12)
  - [x] 5.1 Test at 375px, 768px, 1024px breakpoints
  - [x] 5.2 Add aria-labels to badge, match score, difficulty badge, and button
  - [x] 5.3 Ensure keyboard navigation (Tab to button, Enter to activate)
  - [x] 5.4 Verify WCAG 2.1 AA contrast ratios for both themes

- [x] Task 6: Unit tests
  - [x] 6.1 Test HeroRecommendationCard renders all required elements
  - [x] 6.2 Test theme variant rendering (male and female)
  - [x] 6.3 Test reduced motion behavior
  - [x] 6.4 Test with different recommendation data shapes

## Dev Notes

### Architecture and Technical Constraints

**Tech Stack (MUST follow):**
- Next.js 14+ App Router, React, TypeScript
- Tailwind CSS + shadcn/ui for styling
- Framer Motion for animation
- Zustand for state management (persisted to sessionStorage)

**Component Location:** `src/components/consultation/HeroRecommendationCard.tsx` — follows existing pattern in `src/components/consultation/` directory. See existing components: `Paywall.tsx`, `BlurredRecommendationCard.tsx`, `FaceShapeReveal.tsx` for conventions.

**Data Source:** The recommendation data comes from the `Consultation` type in `src/types/index.ts`:
```typescript
interface StyleRecommendation {
  styleName: string;
  justification: string;
  matchScore: number;        // 0-1 float
  difficultyLevel: 'low' | 'medium' | 'high';
}
```
The consultation store (`src/stores/consultation.ts`) has a `consultation` field typed as `unknown | null`. This story should consume `consultation.recommendations[0]` (rank 1 = index 0). The consultation data will be fetched from the API (`GET /api/consultation/:id`) after payment succeeds.

**Existing Schema Validation:** `src/lib/ai/schemas/consultation.schema.ts` defines `ConsultationSchema` with `recommendations` array (min 2, max 3 items). Each recommendation has: `styleName`, `justification` (10-500 chars), `matchScore` (0-1), `difficultyLevel` (low/medium/high).

**Results Page Integration:** The results page at `src/app/consultation/results/[id]/page.tsx` currently renders a `PaidResultsPlaceholder` when `paymentStatus === 'paid'`. This story replaces that placeholder with the actual hero recommendation card. The page already has:
- AnimatePresence for paywall-to-results transition
- Paywall dissolve animation (500ms blur exit)
- Results entrance animation (opacity fade, 300ms delay)
- `useReducedMotion()` already imported and used
- `useConsultationStore` already imported

**Theme System:** The project uses a dual-theme system via `ThemeProvider` in `src/components/layout/ThemeProvider.tsx`. Male theme: charcoal `#1A1A2E` bg, amber `#F5A623` accent, cream `#FAF3E0` text. Female theme: warm white `#FFF8F0` bg, dusty rose `#C4787A` accent, charcoal `#2D2D3A` text. Use Tailwind's themed classes already established in the design system (Story 1-1).

**UI Components Available:** `src/components/ui/` contains shadcn/ui components: `card.tsx`, `badge.tsx`, `button.tsx`, `sonner.tsx`. Reuse these — do NOT create custom card/badge/button primitives.

**Animation Pattern:** Use Framer Motion `motion.div` with variants. The results page already uses staggered animation pattern (150ms per element). Accept a `delay` prop so the parent can orchestrate stagger timing. Pattern from existing code:
```typescript
const itemVariants: Variants = shouldReduceMotion
  ? { hidden: {}, visible: {} }
  : { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
```

### Difficulty Level Mapping (Portuguese)

| difficultyLevel | Portuguese Label |
|----------------|-----------------|
| low | Baixa |
| medium | Media |
| high | Alta |

### Visual Design Specs (from UX Design doc)

- Card border radius: 16px
- Elevated shadow: `0 8px 32px rgba(0,0,0,0.12)`
- Spacing: 4px base unit system (4, 8, 12, 16, 24, 32, 48px)
- Badge border radius: 8px
- Button min height: 48px on mobile
- Button border radius: 12px
- Typography: Space Grotesk 600 for headings, Inter 400 for body

### Key Anti-Patterns to Avoid

- **DO NOT** create a new Card component — use `src/components/ui/card.tsx` (shadcn/ui)
- **DO NOT** create a new Badge component — use `src/components/ui/badge.tsx` (shadcn/ui)
- **DO NOT** create a new Button component — use `src/components/ui/button.tsx` (shadcn/ui)
- **DO NOT** fetch consultation data inside HeroRecommendationCard — receive it as props
- **DO NOT** hardcode colors — use Tailwind theme classes (e.g., `text-accent`, `bg-background`)
- **DO NOT** use CSS animations — use Framer Motion exclusively (consistency with rest of app)
- **DO NOT** implement preview generation logic — "Ver como fico" button is a placeholder for Epic 7
- **DO NOT** modify the paywall-to-results transition logic — only replace PaidResultsPlaceholder content

### Project Structure Notes

- Component file: `src/components/consultation/HeroRecommendationCard.tsx`
- Integration point: `src/app/consultation/results/[id]/page.tsx`
- Existing consultation types: `src/types/index.ts` (StyleRecommendation, Consultation)
- Existing schemas: `src/lib/ai/schemas/consultation.schema.ts`
- Store: `src/stores/consultation.ts` (consultation field currently typed as unknown)
- Theme: `src/components/layout/ThemeProvider.tsx`
- UI primitives: `src/components/ui/{card,badge,button}.tsx`

### Dependencies on Other Stories

- **Story 6-1 (Face Shape Analysis Section):** Story 6-1 creates the first section of the results page. This hero card appears BELOW the face shape analysis section. If 6-1 is not yet implemented, this card can still be built as a standalone component and integrated into the results page independently. The stagger delay should account for the face shape section appearing first.
- **Story 4-5 (Consultation Generation):** Provides the consultation data (recommendations array) consumed by this component. Already implemented and done.
- **Story 5-3/5-4 (Paywall/Payment):** Payment flow already exists. This story replaces the post-payment placeholder.
- **Epic 7 (Preview Generation):** The "Ver como fico" button is a placeholder. It should be visually complete but functionally a no-op (or show a toast "Em breve").

### Git Intelligence

Recent commits are from Epic 5 (payment integration). The codebase has established patterns for:
- Component file naming: PascalCase `.tsx` files in `src/components/consultation/`
- 'use client' directive at top of interactive components
- Framer Motion for all animations with `useReducedMotion()` support
- shadcn/ui components for base UI elements
- TypeScript strict typing throughout

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#E6 — Story S6.2 acceptance criteria]
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 6.1 — Frontend project structure, component locations]
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 6.2 — Zustand store interface, consultation state]
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 3.6 — Results page layout, Section B Top Recommendation]
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 1 — Design system: typography, spacing, colors, motion, shadows]
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 4 — Component library: Card variants, Badge, Button]
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 8.1 — Micro-interactions: result card reveal]
- [Source: src/types/index.ts — StyleRecommendation, Consultation interfaces]
- [Source: src/lib/ai/schemas/consultation.schema.ts — ConsultationSchema validation]
- [Source: src/stores/consultation.ts — ConsultationStore interface]
- [Source: src/app/consultation/results/[id]/page.tsx — Current results page with PaidResultsPlaceholder]
- [Source: src/components/ui/ — Existing shadcn/ui components to reuse]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Long justification text test: fixed to use regex matcher instead of exact string (trailing space issue)
- Badge aria-label test: refined to use specific "melhor corte" substring to avoid matching card's aria-label

### Completion Notes List

- Implemented `HeroRecommendationCard` component at `src/components/consultation/HeroRecommendationCard.tsx`
  - Uses shadcn/ui Card, Badge, Button primitives (no custom primitives created)
  - Framer Motion `motion.div` with variants for slide-up + fade-in (AC: 9)
  - `useReducedMotion()` hook: when true, variants are empty objects (no animation, AC: 10)
  - `delay` prop accepted for parent stagger orchestration (AC: 9)
  - Theme handled entirely via CSS custom properties (`data-theme` on `<html>`) — uses semantic tokens `bg-primary`, `text-primary-foreground`, `border-primary/60`, `shadow-elevated` (AC: 8)
  - No `gender` prop: theming is CSS-variable-driven, not prop-driven
  - Match score: `Math.round(matchScore * 100)` formatted as "X% compativel com o seu rosto" (AC: 4)
  - Difficulty mapped: low→Baixa, medium→Media, high→Alta (AC: 5)
  - "Ver como fico" button shows `toast.info('Em breve...')` as placeholder (AC: 6)
  - Full-width layout with responsive heading: `text-2xl md:text-3xl` (24px/32px, AC: 2, 11)
  - aria-labels on badge, match score div, difficulty badge, and button (AC: 12)
  - Card has `role="article"` and `aria-label` for accessibility
- Integrated into results page `src/app/consultation/results/[id]/page.tsx`
  - Added `consultation` state selector from Zustand store
  - `consultation` cast from `unknown` to `Consultation | null` (schema-validated by AI pipeline)
  - HeroRecommendationCard rendered below FaceShapeAnalysisSection when `consultation.recommendations` exists
  - Passes `consultation.recommendations[0]` (rank-1) and `delay={0.15}`
  - Fixed pre-existing `react-hooks/rules-of-hooks` violation: moved `useConsultationStatus` hook before the early return guard
- 32 new tests across 2 test files; all 1124 tests pass (77 test files)

### Code Review Fixes (2026-03-02)

- **FIXED — Design token compliance**: Replaced arbitrary values `rounded-[16px]`, `rounded-[8px]`, `rounded-[12px]` with design system tokens (Card already applies `rounded-card`; Badge already applies `rounded-badge` via cva)
- **FIXED — Design token compliance**: Replaced arbitrary `shadow-[0_8px_32px_rgba(0,0,0,0.12)]` with `shadow-elevated` design token
- **FIXED — Wrong theming approach**: Removed hardcoded `bg-amber-500`, `bg-rose-500`, `bg-amber-100`, `dark:bg-amber-900/30` classes. The project uses `data-theme="male"/"female"` on `<html>` with CSS variables, not Tailwind's `dark:` class. Component now uses semantic tokens: `bg-primary text-primary-foreground` (Badge variant="default") and `border-primary/60` which auto-adapt to both themes
- **FIXED — Rules of Hooks violation**: Moved `useConsultationStatus` hook call before conditional early return in `ResultsPage`
- **FIXED — Removed unused `gender` prop**: `HeroRecommendationCard` no longer accepts a `gender` prop since theming is handled at the CSS-variable level; removed corresponding unused store selector from results page
- **FIXED — Updated integration tests**: Updated `results-page-hero-card.test.tsx` mock and test assertions to reflect removal of `gender` prop

### File List

- src/components/consultation/HeroRecommendationCard.tsx (new)
- src/app/consultation/results/[id]/page.tsx (modified)
- src/test/hero-recommendation-card.test.tsx (new)
- src/test/results-page-hero-card.test.tsx (new)
- _bmad-output/implementation-artifacts/6-2-hero-recommendation-card.md (this file)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified)

## Change Log

- 2026-03-02: Story 6.2 implemented — HeroRecommendationCard component created and integrated into results page. 32 new tests, all 1124 tests passing.
- 2026-03-02: Code review fixes — design token compliance, theming approach correction, Rules of Hooks fix, gender prop removal. All 1124 tests pass.
