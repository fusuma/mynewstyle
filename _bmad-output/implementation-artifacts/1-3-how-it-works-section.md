# Story 1.3: How It Works Section

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a visitor,
I want to understand the 3-step process (Photo, AI Analysis, Your Style),
so that I feel confident about what to expect and am motivated to start a consultation.

## Acceptance Criteria

1. Three steps displayed with icons and descriptions:
   - Step 1: Camera icon + "Tire uma selfie" + short description
   - Step 2: Brain icon + "A IA analisa o seu rosto" + short description
   - Step 3: Sparkles icon + "Receba o seu estilo ideal" + short description
2. Responsive layout: horizontal row on desktop (1024px+), vertical stack on mobile (<768px)
3. Smooth scroll anchor from hero section — clicking a link/button in hero scrolls to this section
4. Section uses existing design system theme (CSS variables, typography, spacing tokens)
5. Accessible: all icons have aria-hidden and descriptions are readable by screen readers
6. Respects `prefers-reduced-motion` for any scroll or entrance animations
7. SSR-compatible — component can be rendered server-side or as a lightweight client component

## Tasks / Subtasks

- [x] Task 1: Create HowItWorksSection component (AC: 1, 4, 5)
  - [x] Create `src/components/landing/HowItWorksSection.tsx`
  - [x] Section heading: "Como funciona" using `font-display text-[24px] md:text-[32px] font-semibold`
  - [x] Three step cards with: Lucide icon, step number, title text, short description text
  - [x] Use existing Card component from `src/components/ui/card.tsx` or styled div with theme tokens
  - [x] Icons from Lucide React: `Camera` (step 1), `Brain` (step 2), `Sparkles` (step 3)
  - [x] All icons `aria-hidden="true"` with descriptive text accessible to screen readers
  - [x] Apply theme CSS variables: `text-foreground`, `text-muted-foreground`, `bg-card`, `text-accent`
- [x] Task 2: Implement responsive layout (AC: 2)
  - [x] Mobile (< 768px): vertical stack, each step as a full-width card
  - [x] Desktop (1024px+): horizontal row, 3 cards side-by-side with equal width
  - [x] Tablet (768px-1023px): 3 columns but narrower, or 2+1 grid if needed
  - [x] Max content width 1200px centered (matching hero section pattern)
  - [x] Use Tailwind responsive classes: `flex-col md:flex-row` or `grid grid-cols-1 md:grid-cols-3`
  - [x] Step cards: consistent height with `gap-6 md:gap-8` spacing between cards
- [x] Task 3: Add smooth scroll anchor (AC: 3)
  - [x] Add `id="how-it-works"` to the section element
  - [x] Modify hero section or add a secondary CTA/link that scrolls to `#how-it-works`
  - [x] Use CSS `scroll-behavior: smooth` or minimal JS for smooth scroll
  - [x] Ensure scroll offset accounts for any fixed headers (none currently, but future-proof with `scroll-margin-top`)
- [x] Task 4: Add entrance animation (AC: 6)
  - [x] Optional: subtle fade-in / slide-up animation on scroll using Framer Motion or CSS `@keyframes`
  - [x] Use motion tokens from `src/lib/motion.ts`: `{ duration: 0.35, ease: 'easeInOut' }` for page-level transitions
  - [x] Stagger: 150ms per step card (`staggerChildren: 0.15`)
  - [x] Respect `prefers-reduced-motion`: disable all animations when set (use `getReducedMotionTransition()` from `src/lib/motion.ts`)
  - [x] If using Framer Motion, component must be `'use client'`; if CSS-only, can remain server component
- [x] Task 5: Integrate into landing page (AC: 7)
  - [x] Import `HowItWorksSection` in `src/app/page.tsx`
  - [x] Add below `<HeroSection />` in the main element
  - [x] `page.tsx` remains a Server Component (no `'use client'`)
  - [x] If HowItWorksSection uses Framer Motion, it must have `'use client'` directive
- [x] Task 6: Write tests (AC: all)
  - [x] Test file: `src/test/how-it-works-section.test.tsx`
  - [x] Test: Section renders heading "Como funciona"
  - [x] Test: All 3 steps render with correct title text
  - [x] Test: All 3 steps render description text
  - [x] Test: Section has `id="how-it-works"` for anchor navigation
  - [x] Test: Component renders without errors in neutral theme
  - [x] Test: Icons are present (by test-id or aria attributes)
  - [x] Test: Section has correct aria attributes for accessibility

## Dev Notes

### Architecture Compliance

- **Page Component:** `src/app/page.tsx` MUST remain a Server Component (no `'use client'` directive). This is critical for SSR and SEO. [Source: architecture.md#2.1, architecture.md#8.1]
- **Client Components:** If HowItWorksSection uses Framer Motion for animations, it must be a separate client component with `'use client'` directive. If using CSS-only animations, it can be a server component.
- **Styling:** Use Tailwind CSS utility classes only. Use theme CSS variables (`bg-background`, `text-foreground`, `text-accent`) -- NEVER hardcode hex colors. [Source: 1-1-design-system-setup.md -- Critical Guardrails]
- **Components:** Reuse existing design system components (Card, Badge) where appropriate. Do NOT create new base UI components.
- **Icons:** Use Lucide React (`lucide-react`) which is already installed. Import only the specific icons needed: `Camera`, `Brain`, `Sparkles`. [Source: architecture.md#2.1, ux-design.md#4.2]
- **Fonts:** Typography is already configured in layout.tsx via `next/font/google`. Use `font-display` class for Space Grotesk headings, `font-body` class for Inter text. [Source: 1-1-design-system-setup.md]

### Technical Requirements

- **SSR for SEO:** The landing page is the primary SEO entry point. All landing sections should be SSR-friendly. If Framer Motion is used for entrance animations, the component is client-side but the content still renders on first paint. [Source: architecture.md#8.1]
- **Smooth Scroll:** Use CSS `scroll-behavior: smooth` on the html element (can be added to globals.css) or a simple `scrollIntoView({ behavior: 'smooth' })` handler. CSS approach is preferred for zero JS cost. Respect `prefers-reduced-motion` by using `scroll-behavior: auto` when reduced motion is preferred.
- **Section ID:** Use `id="how-it-works"` for anchor linking. This follows the pattern from Story 1.2 which added `id="hero"` to the hero section.
- **Content Width:** Max content width 1200px centered, matching the hero section pattern (`max-w-[1200px] mx-auto`).
- **Spacing from Hero:** Add appropriate vertical padding between hero and this section. Use spacing tokens: `py-16 md:py-24` (64px/96px) from design system scale.

### Previous Story Intelligence (Story 1.2 -- Landing Page Hero Section)

**What was built:**
- `src/app/page.tsx` -- Server Component composing landing page sections (currently only HeroSection)
- `src/components/landing/HeroSection.tsx` -- Client component (`'use client'`) with hero content
- `src/components/landing/hero-gradient.css` -- CSS gradient animation for hero background
- Pattern: page.tsx imports section components, sections are in `src/components/landing/`
- HeroSection uses `id="hero"`, `aria-labelledby="hero-headline"`, `data-testid="hero-section"` -- follow same pattern
- Content is wrapped in `max-w-[1200px]` container, centered
- Uses flex spacers for vertical positioning within viewport-height hero
- 74 total tests passing (62 from story 1.1 + 12 from story 1.2)

**Key learnings from Story 1.2:**
- `page.tsx` is a Server Component -- import client components into it, do NOT add `'use client'` to page.tsx
- CSS-only animations preferred for background effects (zero JS overhead)
- Used `min-h-dvh` for mobile viewport height (not `min-h-screen`)
- `pb-[env(safe-area-inset-bottom)]` for iOS safe area (was a review fix)
- Flex spacer pattern (3:1:1 ratio) positions CTA in thumb-zone bottom 40%
- Added `aria-labelledby` for accessibility -- follow same pattern

**Previous story files modified:**
- `src/app/page.tsx` -- will be modified again (add HowItWorksSection import)
- `src/components/landing/` -- add new component here

**DO NOT modify:**
- `src/app/layout.tsx` (already correctly set up with ThemeProvider, fonts, Toaster)
- `src/app/globals.css` (theme variables and Tailwind config are complete -- UNLESS adding `scroll-behavior: smooth`)
- Any files in `src/components/ui/` (design system components are stable)
- `src/components/landing/HeroSection.tsx` (stable, reviewed -- UNLESS adding anchor link to how-it-works)
- `src/components/landing/hero-gradient.css` (stable)

### Previous Story Intelligence (Story 1.1 -- Design System Setup)

**What was built:**
- Next.js 16.1.6, TypeScript, Tailwind CSS v4, App Router, `src/` directory
- Dual theme system (male/female/neutral) via CSS custom properties + `data-theme` attribute
- ThemeProvider (React Context) at `src/components/layout/ThemeProvider.tsx`
- Base components: Button, Card, Badge, Toast (all theme-aware via CSS variables)
- Typography: Space Grotesk (display/heading), Inter (body/caption) via `next/font/google`
- Motion tokens in `src/lib/motion.ts` (micro: 200ms, page: 350ms, loading: 1.5s, stagger: 150ms)
- `prefers-reduced-motion` supported via CSS and `getReducedMotionTransition()` utility
- 62 tests passing, ESLint clean, build succeeds

**Reusable assets from Story 1.1:**
- Card component: `src/components/ui/card.tsx` (16px radius, card shadow, theme-aware)
- Motion presets: `src/lib/motion.ts` -- use `pageTransition`, `resultsRevealContainer`, `resultsRevealItem`
- Typography classes: `font-display` (Space Grotesk), `font-body` (Inter)
- Theme CSS variables: `text-foreground`, `text-muted-foreground`, `bg-background`, `bg-card`, `text-accent`, `bg-accent`

### Library & Framework Requirements

| Library | Version | Notes |
|---------|---------|-------|
| Next.js | 16.1.6 | App Router, `src/` directory, server/client components |
| Tailwind CSS | v4+ | Use Tailwind utility classes, theme via CSS variables |
| Framer Motion | 12.34.3+ | Optional for entrance animations (if used, component must be `'use client'`) |
| Lucide React | 0.575.0+ | Icons: `Camera`, `Brain`, `Sparkles` |
| React | 19.2.3 | Server Components by default in App Router |

**DO NOT install new dependencies for this story.** Everything needed is already installed.

### File Structure Requirements

```
src/
├── app/
│   ├── layout.tsx              # NO CHANGES
│   ├── page.tsx                # MODIFY: Add HowItWorksSection import + render
│   └── globals.css             # MINOR CHANGE: Add scroll-behavior: smooth (if CSS approach chosen)
├── components/
│   ├── landing/
│   │   ├── HeroSection.tsx     # MINOR CHANGE: Add anchor link or secondary CTA for smooth scroll (optional)
│   │   ├── hero-gradient.css   # NO CHANGES
│   │   └── HowItWorksSection.tsx  # NEW: How It Works 3-step section
│   └── ui/
│       └── card.tsx            # REUSE: Existing Card component if used (no changes)
├── lib/
│   └── motion.ts               # REUSE: Motion presets for animations (no changes)
└── test/
    └── how-it-works-section.test.tsx  # NEW: Tests for HowItWorksSection
```

[Source: architecture.md#6.1 -- Project Structure, components/landing/ directory]

### Project Structure Notes

- `src/components/landing/` already exists with HeroSection.tsx and hero-gradient.css
- Each landing section is its own component for clean separation and future story isolation
- `page.tsx` composes the sections together -- add HowItWorksSection after HeroSection
- The landing page will eventually contain: Hero (1.2), How It Works (1.3), Trust & Privacy (1.4), Interactive Demo (1.5), Footer (1.6)
- Follow the established pattern: section component in `landing/`, test in `test/`

### Testing Requirements

- Use existing Vitest + React Testing Library setup (already configured in Story 1.1)
- Test file location: `src/test/how-it-works-section.test.tsx` (follows existing test file pattern in `src/test/`)
- Test that the component renders the section heading
- Test all 3 steps render with correct title text
- Test section has `id="how-it-works"` for anchor navigation
- Test that the component works in neutral theme (default before gender selection)
- Minimum 7 tests to cover all acceptance criteria
- Run existing test suite to ensure no regressions (expect 74 existing tests to still pass)

### Content Reference (Portuguese)

| Step | Icon | Title | Description |
|------|------|-------|-------------|
| 1 | Camera (Lucide) | Tire uma selfie | Tire uma foto com a camera ou escolha da galeria. Rapido e facil. |
| 2 | Brain (Lucide) | A IA analisa o seu rosto | Nossa inteligencia artificial identifica o formato do seu rosto e caracteristicas unicas. |
| 3 | Sparkles (Lucide) | Receba o seu estilo ideal | Receba recomendacoes personalizadas de cortes e estilos que harmonizam com o seu rosto. |

[Source: ux-design.md#3.1 -- Landing Page "How It Works" section, epics-and-stories.md#S1.3]

### UX Design Specifications

- **Layout:** 3 steps displayed below the hero section, each with icon + title + description [Source: ux-design.md#3.1]
- **Visual Style:** Premium modern, clean cards with subtle elevation. NOT flashy or "bold urban barbershop." [Source: ux-design.md#1.1]
- **Icons:** Use Lucide icons, consistent stroke width, themed with accent color [Source: ux-design.md#4.2]
- **Step Numbers:** Optional visual step number (1, 2, 3) as accent-colored badge or circle
- **Background:** Section should have a subtle contrast from the hero (e.g., `bg-card` or `bg-muted` to differentiate)
- **Spacing:** 64px padding top/bottom on mobile (`py-16`), 96px on desktop (`py-24`) [Source: ux-design.md#1.3]
- **Card Design:** 16px border radius, card shadow, theme-aware. Use design system tokens. [Source: ux-design.md#1.4, ux-design.md#1.5]
- **Typography:** Section heading: Space Grotesk 600 24/32px. Step titles: Inter 600 18px. Descriptions: Inter 400 16px. [Source: ux-design.md#1.2]

### Critical Guardrails

- **DO NOT** add `'use client'` to `src/app/page.tsx`. The page itself must remain a Server Component.
- **DO NOT** hardcode hex colors. Use theme variables: `bg-background`, `text-foreground`, `bg-accent`, `text-accent`, `bg-card`, `bg-muted`.
- **DO NOT** install new npm packages. Everything needed (Lucide, Framer Motion, Tailwind) is already in package.json.
- **DO NOT** modify `src/app/layout.tsx` or any `src/components/ui/` files.
- **DO NOT** implement the Trust & Privacy section (story 1.4), Interactive Demo (story 1.5), or Footer (story 1.6).
- **DO NOT** use emoji characters directly in the rendered JSX (camera, brain, sparkles). Use Lucide React icon components instead.
- **DO NOT** over-engineer -- this is a simple 3-step display section. Keep it lean and clean.
- **DO** use the existing Card component from `src/components/ui/card.tsx` if appropriate, or simple styled divs with theme tokens.
- **DO** use Lucide React icons (already installed) -- import only what you need.
- **DO** add `id="how-it-works"` for anchor navigation.
- **DO** use `data-testid="how-it-works-section"` for testing.
- **DO** ensure the section renders correctly in the neutral theme (before gender selection).
- **DO** use Portuguese (pt-BR) for all user-facing text.
- **DO** run existing test suite (74 tests) plus new tests to confirm no regressions.

### Git Intelligence

Recent commit patterns:
- `feat(epic-1): implement story 1-2-landing-page-hero-section` -- follow same commit message format
- `feat(epic-1): implement story 1-1-design-system-setup`
- Stories are implemented as single commits with descriptive messages
- All stories have been reviewed via code-review workflow before marking done

### Performance Targets

- Lighthouse Performance: >= 90 (maintained from hero section)
- No additional client-side JavaScript if CSS-only approach used for animations
- If Framer Motion used for entrance animations, keep bundle impact minimal (tree-shaken imports)
- No images in this section -- icons + text only, so minimal render cost
- Content should be visible in first paint (SSR or pre-rendered)

### References

- [Source: architecture.md#2.1] -- Frontend tech stack (Next.js, Tailwind, shadcn/ui, Lucide)
- [Source: architecture.md#6.1] -- Project structure (`src/components/landing/`)
- [Source: architecture.md#8.1] -- Loading strategy (SSR landing for SEO)
- [Source: ux-design.md#1.1] -- Visual identity (premium modern, dual theme)
- [Source: ux-design.md#1.2] -- Typography scale (Space Grotesk display, Inter body)
- [Source: ux-design.md#1.3] -- Spacing system (4px base, scale)
- [Source: ux-design.md#1.4] -- Border radius tokens (cards 16px)
- [Source: ux-design.md#1.5] -- Shadow tokens (card shadow)
- [Source: ux-design.md#1.6] -- Motion tokens (350ms page, 150ms stagger)
- [Source: ux-design.md#3.1] -- Landing page "How It Works" section specification
- [Source: ux-design.md#4.2] -- Icons (Lucide icon set)
- [Source: ux-design.md#5] -- Responsive breakpoints (375px primary, 1024px desktop, 1440px max)
- [Source: ux-design.md#6] -- Accessibility (WCAG 2.1 AA, keyboard nav, contrast)
- [Source: ux-design.md#8.1] -- Micro-interactions (150ms stagger per element)
- [Source: prd.md#FR33] -- Landing page displays "How it works" section showing 3-step process
- [Source: prd.md#NFR1] -- Landing page loads < 2s on 4G (Lighthouse >= 90)
- [Source: prd.md#NFR15] -- WCAG 2.1 AA compliance
- [Source: epics-and-stories.md#E1] -- Epic 1 context and elicitation insights
- [Source: epics-and-stories.md#S1.3] -- Story 1.3 acceptance criteria
- [Source: 1-1-design-system-setup.md] -- Design system setup, theme config, components, motion tokens
- [Source: 1-2-landing-page-hero-section.md] -- Hero section patterns, page.tsx composition, CSS animation approach

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- IntersectionObserver not defined in jsdom: Added mock to `src/test/setup.ts` for Framer Motion `whileInView` compatibility

### Completion Notes List

- Created HowItWorksSection component with 3-step process display (Camera, Brain, Sparkles icons)
- Used styled divs with theme tokens (bg-card, rounded-card, shadow-card) instead of Card component for simpler, centered card layout
- Implemented responsive grid: `grid-cols-1 md:grid-cols-3` with `gap-6 md:gap-8`
- Added Framer Motion entrance animations using existing motion tokens (pageTransition, resultsRevealContainer, getReducedMotionTransition)
- Component uses `'use client'` directive for Framer Motion; page.tsx remains Server Component
- Added `scroll-behavior: smooth` to globals.css html element (CSS approach for zero JS cost)
- Added "Como funciona?" anchor link in HeroSection pointing to `#how-it-works`
- Added `scroll-mt-16` to section for future-proof fixed header offset
- All content in Portuguese (pt-BR) as specified
- Step numbers displayed as accent-colored circles
- Added IntersectionObserver mock to test setup for Framer Motion whileInView support
- 10 new tests, 84 total tests passing (74 existing + 10 new), zero regressions
- Build succeeds with static prerendering, ESLint clean
- **Code Review (2026-03-01):** Fixed 8 issues (2 HIGH, 4 MEDIUM, 2 LOW) — reduced-motion stagger/y-offset, heading motion initial state, dead inline style in HeroSection, Portuguese diacritical marks, semantic ol/li for step sequence, added 1 test for semantic list. 85 total tests passing post-review.

### File List

- `src/components/landing/HowItWorksSection.tsx` (NEW) - How It Works 3-step section component
- `src/test/how-it-works-section.test.tsx` (NEW) - 10 tests for HowItWorksSection
- `src/app/page.tsx` (MODIFIED) - Added HowItWorksSection import and render below HeroSection
- `src/app/globals.css` (MODIFIED) - Added `scroll-behavior: smooth` on html element
- `src/components/landing/HeroSection.tsx` (MODIFIED) - Added "Como funciona?" anchor link
- `src/test/setup.ts` (MODIFIED) - Added IntersectionObserver mock for Framer Motion test support

## Change Log

- 2026-03-01: Implemented Story 1.3 How It Works Section - 3-step process display with Camera/Brain/Sparkles icons, Framer Motion staggered entrance animations, smooth scroll anchor from hero, responsive grid layout, full accessibility support, 10 new tests (84 total passing)
- 2026-03-01: Code Review — Fixed 8 issues: reduced-motion animation bypass (stagger + y-offset + heading initial state), dead inline style in HeroSection, Portuguese diacritical marks (câmera, rápido, fácil, inteligência, características, únicas, recomendações), semantic ol/li for accessibility, added semantic list test. 85 total tests, build clean, ESLint clean.
