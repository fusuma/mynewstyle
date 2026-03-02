# Story 6.3: Alternative Recommendation Cards (#2, #3)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see 2 alternative style recommendations below the hero card so I have options to compare,
so that I can make an informed decision about which hairstyle suits me best.

## Acceptance Criteria

1. Recommendation cards #2 and #3 are rendered below the hero recommendation card (Story 6.2) with smaller visual weight than the hero card.
2. Each alternative card displays: style name, visagism justification (2-3 sentences), match score as percentage (e.g., "87% compativel"), difficulty badge ("Manutencao: Baixa/Media/Alta"), and a "Ver como fico" button in secondary style.
3. Cards are numbered with ordinal labels: "2a Recomendacao", "3a Recomendacao" using accent/muted badge styling (NOT gold like the hero card).
4. On mobile (< 768px), alternative cards are collapsible -- titles and match scores are always visible, but justification and details expand on tap. Default state is collapsed.
5. On tablet/desktop (>= 768px), cards are fully expanded by default, displayed in a 2-column grid layout.
6. Each card has a "Ver como fico" button (secondary variant: border + text styling, NOT filled primary) that is a placeholder for Epic 7 preview generation.
7. The cards use staggered reveal animation (150ms delay between cards, slide-up + fade-in) consistent with the results page animation pattern from Story 6.8 spec, and respect `prefers-reduced-motion`.
8. The component receives recommendation data from the parent results page via props (typed from the `ConsultationOutput` schema -- `StyleRecommendation` type with `styleName`, `justification`, `matchScore`, `difficultyLevel`).
9. All new components have corresponding unit tests covering: rendering with mock data, collapsed/expanded states on mobile, accessibility attributes, animation respect for reduced motion, and button presence.

## Tasks / Subtasks

- [ ] Task 1: Create `AlternativeRecommendationCard` component (AC: 2, 3, 4, 6, 7)
  - [ ] Create `src/components/consultation/AlternativeRecommendationCard.tsx`
  - [ ] Accept props: `rank` (2 or 3), `styleName`, `justification`, `matchScore`, `difficultyLevel`
  - [ ] Render ordinal badge: "2a Recomendacao" / "3a Recomendacao" with muted accent styling
  - [ ] Render style name in medium typography (smaller than hero card's large typography)
  - [ ] Render match score as percentage: `Math.round(matchScore * 100)` + "% compativel"
  - [ ] Render difficulty badge with label mapping: `low` -> "Baixa", `medium` -> "Media", `high` -> "Alta"
  - [ ] Render justification text (2-3 sentences)
  - [ ] Render "Ver como fico" button in secondary style (border + text, not filled)
  - [ ] Button is currently a placeholder (onClick logs or does nothing) -- Epic 7 will connect it
  - [ ] Use Framer Motion for entrance animation with configurable delay (passed via prop or index)
  - [ ] Respect `prefers-reduced-motion` via `useReducedMotion()`
  - [ ] Accessible: proper heading hierarchy, aria-labels on interactive elements

- [ ] Task 2: Implement collapsible behavior for mobile (AC: 4)
  - [ ] Add collapsible state management: `isExpanded` boolean, default `false`
  - [ ] Always-visible section: rank badge, style name, match score
  - [ ] Expandable section: justification, difficulty badge, "Ver como fico" button
  - [ ] Tap on the card header toggles expansion
  - [ ] Add chevron icon (Lucide `ChevronDown`) that rotates on expand/collapse
  - [ ] Use Framer Motion `AnimatePresence` for smooth expand/collapse animation
  - [ ] Collapse behavior only on mobile (< 768px) -- use CSS media queries or `useMediaQuery` hook
  - [ ] On desktop (>= 768px), content is always visible (no collapse toggle)

- [ ] Task 3: Create `AlternativeRecommendationsSection` container component (AC: 1, 5, 7)
  - [ ] Create `src/components/consultation/AlternativeRecommendationsSection.tsx`
  - [ ] Accept props: `recommendations` array (items at index 1 and 2 from the consultation recommendations array -- the hero card uses index 0)
  - [ ] Render section with proper spacing below hero card
  - [ ] Grid layout: single column on mobile, 2-column on tablet/desktop (`grid grid-cols-1 md:grid-cols-2 gap-4`)
  - [ ] Staggered animation: each card gets a delay based on its index (150ms stagger)
  - [ ] Handle edge case: if only 1 alternative recommendation exists (array has 2 items total), render only 1 card

- [ ] Task 4: Create difficulty level labels mapping utility (AC: 2)
  - [ ] Create difficulty label mapping in the component file (not a separate utility -- keep it local)
  - [ ] Mapping: `{ low: 'Baixa', medium: 'Media', high: 'Alta' }`
  - [ ] Badge color coding: low = green/success muted, medium = amber/warning muted, high = red/destructive muted
  - [ ] Use theme-aware design tokens (not hardcoded colors)

- [ ] Task 5: Write unit tests (AC: 9)
  - [ ] Create `src/test/alternative-recommendation-card.test.tsx`
  - [ ] Test renders style name, justification, match score percentage, difficulty badge
  - [ ] Test ordinal label renders correctly for rank 2 and rank 3
  - [ ] Test "Ver como fico" button renders with secondary styling
  - [ ] Test collapsed state on mobile: justification and details are hidden
  - [ ] Test expanded state: all content visible after click
  - [ ] Test desktop rendering: always expanded, no collapse toggle
  - [ ] Test `prefers-reduced-motion` disables animations
  - [ ] Test accessibility: proper roles, aria-expanded attribute on collapsible
  - [ ] Create `src/test/alternative-recommendations-section.test.tsx`
  - [ ] Test renders 2 cards when 2 alternative recommendations provided
  - [ ] Test renders 1 card when only 1 alternative recommendation provided
  - [ ] Test renders nothing when no alternative recommendations provided
  - [ ] Test grid layout classes are present

## Dev Notes

### Architecture Compliance

- **Component location follows established pattern:** All consultation components live in `src/components/consultation/`. The existing `BlurredRecommendationCard.tsx` is the paywall version of recommendation cards. This story creates the real, unlocked alternative recommendation card. [Source: architecture.md#6.1 Project Structure, `src/components/consultation/`]
- **Recommendation data schema already exists:** The `ConsultationSchema` in `src/lib/ai/schemas/consultation.schema.ts` defines `StyleRecommendationSchema` with fields: `styleName` (string), `justification` (string, 10-500 chars), `matchScore` (number, 0-1), `difficultyLevel` (enum: low/medium/high). Use this schema's inferred type for props. [Source: src/lib/ai/schemas/consultation.schema.ts]
- **`src/types/index.ts` is FROZEN:** Do NOT add any types to this file. Define types locally or import from the AI schemas. [Source: 5-1-stripe-setup-and-configuration.md#Architecture Compliance]
- **Framer Motion for animations:** The project uses Framer Motion for all animations. The results page uses staggered reveal (150ms per element) with slide-up + fade-in pattern. Match this pattern. [Source: ux-design.md#1.6 Motion, architecture.md#2.1 Frontend]
- **Dual theme support:** Components MUST use theme-aware design tokens from Tailwind (e.g., `bg-card`, `text-foreground`, `border-border`, `text-muted-foreground`) -- NOT hardcoded colors. The male theme (dark) and female theme (light) switch automatically via ThemeProvider. [Source: ux-design.md#1.1 Visual Identity, architecture.md#6.1]
- **shadcn/ui component base:** The project uses shadcn/ui components. For cards, use the project's card styling pattern (`rounded-xl border border-border bg-card`) established in `BlurredRecommendationCard.tsx` and `Paywall.tsx`. [Source: src/components/consultation/BlurredRecommendationCard.tsx]
- **Mobile-first responsive design:** Primary target is 375px mobile. Use Tailwind responsive prefixes (`md:` for 768px+). Touch targets minimum 48px height. [Source: ux-design.md#5 Responsive Breakpoints]

### Recommendation Data Flow

The alternative recommendation cards receive data from the `ConsultationOutput` type. The consultation result contains a `recommendations` array with 2-3 items:
- `recommendations[0]` = Hero card (Story 6.2)
- `recommendations[1]` = Alternative #2 (this story)
- `recommendations[2]` = Alternative #3 (this story, may not exist if only 2 recommendations)

```typescript
// From src/lib/ai/schemas/consultation.schema.ts
interface StyleRecommendation {
  styleName: string;          // e.g., "Textured Crop"
  justification: string;      // 10-500 chars, visagism reasoning
  matchScore: number;         // 0-1 (display as percentage)
  difficultyLevel: 'low' | 'medium' | 'high';
}
```

The parent results page (to be updated in Story 6.8 or during results page assembly) will pass the sliced array `recommendations.slice(1)` to this component.

### Collapsible Card Pattern

```typescript
// Mobile collapsible pattern
// On mobile (< 768px): collapsed by default, tap to expand
// On desktop (>= 768px): always expanded, no toggle

// Use a combination of:
// 1. React state for isExpanded
// 2. Tailwind `md:hidden` to hide the chevron toggle on desktop
// 3. Tailwind `md:block` to force content visible on desktop
// 4. Framer Motion AnimatePresence for smooth expand/collapse animation

// DO NOT use window.innerWidth or resize listeners
// Tailwind CSS classes handle responsive behavior declaratively
```

### Visual Design Specifications

**Card Structure (Alternative, NOT hero):**
```
┌──────────────────────────────────────┐
│  [2a Recomendacao]  badge (muted)    │
│                                       │
│  Style Name         ▶ match score    │ ← always visible
│  "Medium Fade"        87% compativel │
│                                       │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │ ← collapsible on mobile
│  Justification: "O medium fade cria  │
│  uma transicao suave que equilibra   │
│  as proporcoes do rosto oval..."     │
│                                       │
│  [Manutencao: Baixa] difficulty      │
│                                       │
│  [   Ver como fico   ] secondary btn │
└──────────────────────────────────────┘
```

**Visual weight comparison with hero card (Story 6.2):**
- Hero card: larger padding (p-6), larger typography, gold/accent badge, primary "Ver como fico" button
- Alternative cards: standard padding (p-4), medium typography, muted badge, secondary "Ver como fico" button
- Alternative cards: `border border-border bg-card` (standard), NOT elevated shadow

**Badge colors (theme-aware):**
- Rank badge: `bg-muted text-muted-foreground` (NOT gold like hero's `bg-primary text-primary-foreground`)
- Difficulty: low = `bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400`, medium = `bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400`, high = `bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400`

### Project Structure Notes

```
src/
├── components/
│   └── consultation/
│       ├── BlurredRecommendationCard.tsx    EXISTS -- paywall blurred version (no changes)
│       ├── AlternativeRecommendationCard.tsx NEW: single alternative rec card with collapse
│       └── AlternativeRecommendationsSection.tsx NEW: container for #2 and #3 cards
└── test/
    ├── alternative-recommendation-card.test.tsx    NEW
    └── alternative-recommendations-section.test.tsx NEW
```

**Files that must NOT be modified:**
- `src/types/index.ts` -- types are frozen
- `src/lib/ai/schemas/consultation.schema.ts` -- schema is complete, just import the type
- `src/components/consultation/BlurredRecommendationCard.tsx` -- paywall version, unchanged
- `src/components/consultation/Paywall.tsx` -- paywall component, unchanged
- `src/app/consultation/results/[id]/page.tsx` -- will be modified in a later assembly story (6.8), NOT in this story
- `src/stores/consultation.ts` -- no store changes needed for this story

### References

- [Source: epics-and-stories.md#S6.3] -- ACs: Cards #2/#3 below hero, smaller visual weight, same structure, collapsible on mobile, numbered ordinals
- [Source: ux-design.md#3.6 Results Page, Section C] -- "Recommendation #2 and #3 as smaller cards below hero. Same structure: name, justification, match score, 'Ver como fico' button (secondary style). Collapsible on mobile."
- [Source: ux-design.md#1.6 Motion] -- "Results reveal: staggered 150ms per element"
- [Source: ux-design.md#8.1 Micro-interactions] -- "Result card reveal: Slides up from bottom with 150ms stagger per card"
- [Source: ux-design.md#4.1 Core Components] -- Card variants: Default, Elevated, Hero, Recommendation. Badge: Face Shape, Match Score, Difficulty, Status.
- [Source: architecture.md#6.1 Project Structure] -- `src/components/consultation/RecommendationCard.tsx` (planned component location)
- [Source: architecture.md#2.1 Frontend] -- Framer Motion for animations, Tailwind CSS + shadcn/ui
- [Source: src/lib/ai/schemas/consultation.schema.ts] -- StyleRecommendationSchema: styleName, justification, matchScore, difficultyLevel
- [Source: src/components/consultation/BlurredRecommendationCard.tsx] -- Card styling pattern: `rounded-xl border border-border bg-card p-4`
- [Source: src/components/consultation/Paywall.tsx] -- Animation patterns: fadeIn variants with Framer Motion
- [Source: prd.md#FR24-FR25] -- "Structured layout with clear visual hierarchy", "Each recommendation card is numbered by relevance"
- [Source: prd.md#FR16-FR17] -- "2-3 personalized hairstyle recommendations", "Each recommendation includes visagism-backed justification"

### Library & Framework Requirements

| Library | Version | Usage in This Story |
|---------|---------|---------------------|
| `framer-motion` | already installed | Entrance animation (slide-up + fade-in), collapsible expand/collapse |
| `lucide-react` | already installed | `ChevronDown` icon for collapsible toggle |
| `next` | already installed | Not directly used (component is client-side) |
| `react` | already installed | Component, state management (useState) |
| `tailwindcss` | already installed | Responsive design, theming, layout |
| `vitest` | already installed | Test runner |
| `@testing-library/react` | already installed | Component rendering tests |

**0 NEW DEPENDENCIES** -- everything needed is already installed from previous stories.

### Cross-Story Dependencies

- **Story 6.1 (Face Shape Analysis Section) -- BACKLOG:** Renders the face shape analysis above recommendations. This story's cards sit below it. No code dependency -- just visual ordering.
- **Story 6.2 (Hero Recommendation Card) -- BACKLOG:** Renders the #1 hero recommendation above these alternative cards. The parent container will order them. No import dependency between components.
- **Story 6.8 (Results Page Animated Reveal) -- BACKLOG:** Will assemble all result sections into the results page with staggered animations. This story creates standalone components that 6.8 will import and position. The animation props on these components should be compatible with a parent-driven stagger pattern.
- **Epic 7 (AI Preview Generation) -- FUTURE:** The "Ver como fico" button is a placeholder in this story. Epic 7 will connect it to the Kie.ai preview generation pipeline. The button should have an `onPreviewRequest` callback prop ready for future connection.
- **Story 5.3 (Paywall UI) -- DONE:** The `BlurredRecommendationCard` in the paywall shows blurred placeholders for these same cards. After payment, the real `AlternativeRecommendationCard` replaces the blurred version.
- **Story 4.5 (Consultation Generation) -- DONE:** Generates the consultation data including the `recommendations` array that feeds into these cards.

### Previous Story Intelligence

**From Story 5.6 (Receipt & Refund Flow) -- DONE (most recent):**
- Test files go in `src/test/` directory (NOT co-located with source)
- Component testing: `@testing-library/react` with `vi.mock` for stores and router
- Framer Motion in tests: mock `framer-motion` to render children directly
- Total test count after 5.6: 1061 tests (all passing)
- Next.js 14+ App Router: `params` is a `Promise` that must be awaited in route handlers
- The results page (`src/app/consultation/results/[id]/page.tsx`) currently has a `PaidResultsPlaceholder` that will be replaced by Epic 6 components

**From Story 5.3 (Paywall UI) -- DONE:**
- Card styling pattern: `rounded-xl border border-border bg-card p-4`
- `BlurredRecommendationCard` established the recommendation card visual footprint
- Paywall uses Framer Motion `fadeIn` variants with `useReducedMotion()`

### Git Intelligence

Recent commits:
```
a9b14c9 chore(epic-5): mark epic-5 as done -- all 6 stories complete
cf66ce0 review(epic-5): code review story 5-6-receipt-and-refund-flow
cccf452 review(epic-5): code review story 5-5-stripe-webhook-handler
9c504b8 feat(epic-5): implement story 5-5-stripe-webhook-handler
```

Patterns:
- Commit format: `feat(epic-N): implement story N-X-story-slug`
- Test files in `src/test/`
- Framer Motion mocking in tests: render children directly to avoid animation issues in test environment
- Theme-aware styling: always use Tailwind design tokens, never hardcoded colors

Suggested commit message: `feat(epic-6): implement story 6-3-alternative-recommendation-cards`

### Testing Requirements

**AlternativeRecommendationCard tests (`src/test/alternative-recommendation-card.test.tsx`):**
- Test renders style name text correctly
- Test renders justification text
- Test renders match score as percentage (e.g., 0.87 -> "87% compativel")
- Test renders difficulty badge with Portuguese label (low -> "Baixa")
- Test renders ordinal rank badge for rank 2 ("2a Recomendacao")
- Test renders ordinal rank badge for rank 3 ("3a Recomendacao")
- Test "Ver como fico" button is present with secondary styling
- Test collapsed state: justification is NOT visible initially (mobile viewport mock)
- Test clicking card header expands content
- Test `aria-expanded` attribute toggles correctly
- Test `prefers-reduced-motion` disables entrance animation
- Test chevron icon rotates on expand/collapse

**AlternativeRecommendationsSection tests (`src/test/alternative-recommendations-section.test.tsx`):**
- Test renders 2 cards when 2 recommendations provided
- Test renders 1 card when only 1 recommendation provided
- Test renders nothing (empty) when empty array provided
- Test grid CSS classes are applied for responsive layout

### Critical Guardrails

- **DO NOT** modify `src/types/index.ts` -- types are frozen
- **DO NOT** modify `src/lib/ai/schemas/consultation.schema.ts` -- just import the type
- **DO NOT** modify the results page (`src/app/consultation/results/[id]/page.tsx`) -- that integration happens in Story 6.8
- **DO NOT** create a hero-style card -- this story creates ALTERNATIVE cards with LESS visual weight than the hero
- **DO NOT** use hardcoded colors -- use Tailwind theme tokens for dual-theme compatibility
- **DO NOT** implement real preview generation -- the "Ver como fico" button is a placeholder for Epic 7
- **DO** use the `StyleRecommendation` type from `src/lib/ai/schemas/consultation.schema.ts` (infer from Zod schema)
- **DO** follow the established card pattern from `BlurredRecommendationCard.tsx`: `rounded-xl border border-border bg-card`
- **DO** implement collapsible behavior ONLY on mobile (< 768px), always expanded on desktop
- **DO** include `onPreviewRequest?: (styleName: string) => void` callback prop for future Epic 7 connection
- **DO** ensure all text content is in Portuguese (PT) matching the rest of the app
- **DO** add `role="region"` and `aria-label` to the cards section for accessibility
- **DO** run `npm test` before considering done -- all existing tests + new tests must pass

### Environment Variables

No new environment variables required. This story is purely frontend components with no API calls.

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
