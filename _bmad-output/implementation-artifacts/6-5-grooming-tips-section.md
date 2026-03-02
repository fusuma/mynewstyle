# Story 6.5: Grooming Tips Section (Gender-Specific)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want grooming recommendations specific to my gender and face shape,
so that I get actionable care and styling advice tailored to my unique profile.

## Acceptance Criteria

1. **Male path**: Display beard style recommendations matching the user's face shape (from AI consultation output `groomingTips` data)
2. **Female path**: Display layering, fringe, and parting recommendations (from AI consultation output `groomingTips` data)
3. **Icon-based layout**: Each tip rendered with a Lucide icon matching its category
4. **3-4 tips in individual card format**: Each grooming tip displayed as a separate visual card (not a text dump)
5. **Categorized display**: Tips grouped by category — "Produtos", "Rotina Diaria", "Dicas para o Barbeiro/Cabeleireiro"
6. **Gender-themed styling**: Cards respect the active male (dark) / female (light) theme from `ThemeProvider`
7. **Responsive layout**: Grid on desktop (2-column min), single-column stack on mobile
8. **Staggered reveal animation**: 150ms stagger per card, using Framer Motion, respecting `prefers-reduced-motion`
9. **Accessible**: All cards keyboard-navigable, proper aria-labels, color contrast meets WCAG 2.1 AA (4.5:1 normal text, 3:1 large text)

## Tasks / Subtasks

- [ ] Task 1: Create `GroomingTips` component (AC: #1, #2, #3, #4, #5, #6, #7, #8, #9)
  - [ ] 1.1 Create `src/components/consultation/GroomingTips.tsx`
  - [ ] 1.2 Accept `groomingTips: GroomingTip[]` and `gender: 'male' | 'female'` as props
  - [ ] 1.3 Group tips by `category` field (`products`, `routine`, `barber_tips`)
  - [ ] 1.4 Render category sub-headers with Portuguese labels:
    - `products` -> "Produtos"
    - `routine` -> "Rotina Diaria"
    - `barber_tips` -> "Dicas para o Barbeiro" (male) / "Dicas para o Cabeleireiro" (female)
  - [ ] 1.5 Map each tip's `icon` string to a Lucide React icon component (fallback to `Sparkles` if icon not found)
  - [ ] 1.6 Render each tip as an individual Card (reuse `src/components/ui/card.tsx`)
  - [ ] 1.7 Apply gender-themed styling via Tailwind theme classes (bg-card, text-card-foreground, border-accent)
  - [ ] 1.8 Implement 2-column grid on `md:` breakpoint+, single column below
  - [ ] 1.9 Add Framer Motion `staggerChildren: 0.15` container + `slideUp + fadeIn` per card
  - [ ] 1.10 Respect `useReducedMotion()` — skip animations when enabled
  - [ ] 1.11 Add `role="list"` on container, `role="listitem"` on each card, aria-labels on icons

- [ ] Task 2: Create `GroomingTipCard` sub-component (AC: #3, #4, #6, #9)
  - [ ] 2.1 Create individual tip card with icon, category badge, and tip text
  - [ ] 2.2 Icon rendered at 24px with theme accent color
  - [ ] 2.3 Tip text rendered as body text (Inter 400, 16px)
  - [ ] 2.4 Category badge using `src/components/ui/badge.tsx` with muted variant
  - [ ] 2.5 Card uses 16px border-radius, standard card shadow (`0 2px 12px rgba(0,0,0,0.08)`)

- [ ] Task 3: Write unit tests (AC: all)
  - [ ] 3.1 Create `src/test/grooming-tips.test.tsx`
  - [ ] 3.2 Test: renders correct number of tip cards for given data
  - [ ] 3.3 Test: groups tips by category and renders category headers
  - [ ] 3.4 Test: male path shows "Dicas para o Barbeiro", female shows "Dicas para o Cabeleireiro"
  - [ ] 3.5 Test: renders Lucide icons for known icon strings
  - [ ] 3.6 Test: falls back to Sparkles icon for unknown icon strings
  - [ ] 3.7 Test: reduced motion disables animations
  - [ ] 3.8 Test: accessibility — list roles, aria-labels present

- [ ] Task 4: Integration preparation (AC: #8)
  - [ ] 4.1 Export `GroomingTips` from `src/components/consultation/GroomingTips.tsx`
  - [ ] 4.2 The results page (`src/app/consultation/results/[id]/page.tsx`) currently renders `PaidResultsPlaceholder` — do NOT modify the results page in this story. The component will be integrated in the animated reveal story (6-8).

## Dev Notes

### Data Source & Types

The `GroomingTip` interface is already defined in `src/types/index.ts`:

```typescript
export interface GroomingTip {
  category: 'products' | 'routine' | 'barber_tips';
  tipText: string;
  icon: string;  // Lucide icon name as string, e.g., "scissors", "droplets", "clock"
}
```

The Zod schema is in `src/lib/ai/schemas/consultation.schema.ts`:

```typescript
const GroomingTipSchema = z.object({
  category: z.enum(['products', 'routine', 'barber_tips']),
  tipText: z.string().min(5),
  icon: z.string(),
});
```

The AI consultation output (`ConsultationOutput`) includes `groomingTips: GroomingTip[]` — this data arrives from the AI pipeline (Epic 4, Story 4.5) and is stored in the `grooming_tips` DB table.

### Architecture Patterns & Constraints

- **Framework**: Next.js 14+ (App Router), React client components with `'use client'` directive
- **Styling**: Tailwind CSS + shadcn/ui. ALL styling via Tailwind utility classes. NO inline styles. NO CSS modules.
- **State**: Data will be passed as props from the results page (not fetched inside this component)
- **Animation**: Framer Motion. Use `motion.div` with `variants` pattern. Always check `useReducedMotion()`.
- **Icons**: Lucide React (`lucide-react` package). Import individual icons. Use dynamic lookup map, NOT dynamic import.
- **Component pattern**: Functional components with TypeScript interfaces for props. No class components.

### Existing Components to Reuse (DO NOT recreate)

| Component | Path | Usage |
|-----------|------|-------|
| `Card` | `src/components/ui/card.tsx` | Card wrapper for each tip |
| `Badge` | `src/components/ui/badge.tsx` | Category badge |
| `Button` | `src/components/ui/button.tsx` | Not needed in this story |

### Icon Mapping Strategy

The AI returns an `icon` field as a string (e.g., `"scissors"`, `"droplets"`, `"clock"`, `"spray-can"`, `"comb"`). Create a static mapping object from string to Lucide component:

```typescript
import { Scissors, Droplets, Clock, SprayCan, Comb, Sparkles, Brush, ShowerHead, Star, Palette } from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  scissors: Scissors,
  droplets: Droplets,
  clock: Clock,
  'spray-can': SprayCan,
  comb: Comb,
  brush: Brush,
  'shower-head': ShowerHead,
  star: Star,
  palette: Palette,
  // Add more as AI outputs expand
};

function getIcon(iconName: string) {
  return ICON_MAP[iconName.toLowerCase()] ?? Sparkles;
}
```

### Category Labels (Portuguese)

```typescript
const CATEGORY_LABELS: Record<GroomingTip['category'], { male: string; female: string }> = {
  products: { male: 'Produtos', female: 'Produtos' },
  routine: { male: 'Rotina Diaria', female: 'Rotina Diaria' },
  barber_tips: { male: 'Dicas para o Barbeiro', female: 'Dicas para o Cabeleireiro' },
};
```

### Animation Pattern (Consistent with Results Page)

The results page uses staggered reveal (150ms per element). Follow the EXACT same pattern established in `src/app/consultation/results/[id]/page.tsx`:

```typescript
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: shouldReduceMotion ? 0 : 0.15 },
  },
};

const itemVariants: Variants = shouldReduceMotion
  ? { hidden: {}, visible: {} }
  : {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    };
```

### Tailwind Theme Classes

The project uses a dual theme system. Use semantic Tailwind classes that automatically adapt:

- `bg-card` / `text-card-foreground` for card backgrounds
- `border-border` for card borders
- `text-accent-foreground` for accent text
- `bg-muted` / `text-muted-foreground` for secondary elements

DO NOT hardcode color hex values. The theme handles male (#1A1A2E dark) vs female (#FFF8F0 light) automatically via CSS variables set by `ThemeProvider`.

### Design Specifications (from UX Design Doc)

- **Section E** in results page hierarchy (after Styles to Avoid, before Styling Tips)
- Cards: 16px border-radius
- Card shadow: `0 2px 12px rgba(0,0,0,0.08)` — use `shadow-sm` or the card's built-in shadow
- Icons: 24px size
- Body text: Inter 400, 16px (`text-base font-normal`)
- Badge text: Inter 600, 12px (`text-xs font-semibold`)
- Spacing: 4px base unit system — use multiples (8, 12, 16, 24, 32)
- Mobile: single column, full-width cards
- Desktop (md+): 2-column grid, `gap-4`

### Testing Standards

- **Framework**: Vitest + React Testing Library (or Jest if that's what's established)
- **Pattern**: Follow test files in `src/test/` directory (e.g., `src/test/refund-banner.test.tsx`)
- **Coverage**: Test rendering, conditional logic, accessibility attributes
- **Mock**: Mock `useReducedMotion` from Framer Motion for animation tests

### Project Structure Notes

- Component goes in `src/components/consultation/GroomingTips.tsx` (architecture specifies this exact path)
- Tests go in `src/test/grooming-tips.test.tsx` (following existing test location pattern)
- NO new dependencies required — `lucide-react`, `framer-motion`, `shadcn/ui` components already installed
- NO database changes needed — this is a pure frontend display component
- NO API changes needed — data is provided as props from parent

### What This Story Does NOT Include

- Does NOT integrate into the results page layout (that's Story 6-8: Results Page Animated Reveal)
- Does NOT fetch data from API (data passed as props)
- Does NOT handle empty state (parent component handles whether to render this section)
- Does NOT include the "Styling Tips" section (that's Story 6-6: Styling Tips Parsed & Structured)

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#S6.5] — Story definition and acceptance criteria
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 3.6 Results Page, Section E] — Grooming section UX spec
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 6.1] — Project structure (`src/components/consultation/GroomingTips.tsx`)
- [Source: src/types/index.ts#GroomingTip] — Existing type definition
- [Source: src/lib/ai/schemas/consultation.schema.ts#GroomingTipSchema] — Zod validation schema
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 3.1] — Database model (`grooming_tips` table with category, tip_text, icon fields)
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 1.1] — Design system (dual theme, typography, spacing)
- [Source: src/app/consultation/results/[id]/page.tsx] — Current results page structure and animation patterns
- [Source: src/components/ui/card.tsx] — Existing Card component to reuse
- [Source: src/components/ui/badge.tsx] — Existing Badge component to reuse

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
