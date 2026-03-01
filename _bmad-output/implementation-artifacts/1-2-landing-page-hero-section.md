# Story 1.2: Landing Page Hero Section

Status: done

## Story

As a visitor,
I want to see a compelling hero section on the landing page,
so that I understand the product value proposition and feel motivated to start a consultation.

## Acceptance Criteria

1. Headline displays: "Descubra o corte perfeito para o seu rosto"
2. Subheadline displays: "Consultoria de visagismo com IA — personalizada em 3 minutos"
3. Primary CTA button: "Comecar Agora" (large, centered, uses Button primary variant from design system)
4. Animated gradient background (subtle dark-to-accent color shift, not distracting)
5. Page is SSR rendered as a Next.js Server Component for SEO
6. Mobile-first layout: looks great on 375px, responsive up to 1440px (max content width 1200px)
7. Lighthouse performance score >= 90

## Tasks / Subtasks

- [x] Task 1: Replace placeholder page.tsx with landing page structure (AC: 5, 6)
  - [x] Convert `src/app/page.tsx` from placeholder to full landing page server component
  - [x] Create `src/components/landing/HeroSection.tsx` as a client component (needs Framer Motion)
  - [x] Set up landing page with full-viewport hero section as first section
  - [x] Add proper SEO metadata (title, description, OG tags) for visagism-related search queries
  - [x] Ensure page renders server-side (no `'use client'` on page.tsx itself)
- [x] Task 2: Build HeroSection component with content (AC: 1, 2, 3)
  - [x] Headline using `font-display text-[32px] md:text-[48px] font-bold` (Space Grotesk 700)
  - [x] Subheadline using `font-body text-lg` (Inter 400)
  - [x] CTA button using existing Button component (primary variant, `size="lg"`)
  - [x] CTA links to `/start` (gender gateway — future story, link prepared now)
  - [x] Content centered vertically and horizontally within viewport-height container
  - [x] Social proof placeholder text: "Ja ajudamos X pessoas a encontrar o seu estilo" (static for now)
- [x] Task 3: Implement animated gradient background (AC: 4)
  - [x] CSS gradient animation using theme CSS variables (`--background`, `--accent`, `--muted`)
  - [x] Subtle hue shift animation (8-10 second loop) — NOT flashy, premium/editorial feel
  - [x] Use CSS `@keyframes` for the gradient (not Framer Motion) to avoid JS overhead on SSR page
  - [x] Respect `prefers-reduced-motion`: disable animation, show static gradient
  - [x] Gradient works correctly in neutral theme (before gender selection)
- [x] Task 4: Responsive layout and mobile-first design (AC: 6)
  - [x] Mobile (375px): Single column, headline 32px, adequate padding (16-24px sides)
  - [x] Tablet (768px): Same single column, more breathing room
  - [x] Desktop (1024px+): Headline 48px, max content width 1200px centered
  - [x] Full viewport height for hero (`min-h-screen` or `min-h-dvh` for mobile browser chrome)
  - [x] CTA button in lower third of viewport (thumb-zone for mobile)
  - [x] Safe area handling for iOS notch/home indicator
- [x] Task 5: Performance optimization (AC: 7)
  - [x] No client-side JavaScript in the critical render path (server component page.tsx)
  - [x] HeroSection uses dynamic import with `next/dynamic` if Framer Motion is needed, or keep as CSS-only animation
  - [x] Verify no layout shift (CLS = 0) — fixed dimensions on text elements
  - [x] Verify fonts load with `display: swap` (no FOIT)
  - [x] Run Lighthouse audit and ensure performance score >= 90
- [x] Task 6: Write tests (AC: all)
  - [x] Test: HeroSection renders headline text
  - [x] Test: HeroSection renders subheadline text
  - [x] Test: CTA button renders with correct text and links to /start
  - [x] Test: Social proof text renders
  - [x] Test: Component renders without errors in neutral theme
  - [x] Test: Gradient background CSS class is applied

## Dev Notes

### Architecture Compliance

- **Page Component:** `src/app/page.tsx` MUST remain a Server Component (no `'use client'` directive). This is critical for SSR and SEO. [Source: architecture.md#2.1, architecture.md#8.1]
- **Client Components:** Any component needing Framer Motion or interactivity must be a separate client component imported into the server page. Mark with `'use client'` directive.
- **Styling:** Use Tailwind CSS utility classes only. Use theme CSS variables (`bg-background`, `text-foreground`, `text-accent`) -- NEVER hardcode hex colors. [Source: 1-1-design-system-setup.md -- Critical Guardrails]
- **Components:** Reuse Button component from `src/components/ui/button.tsx` for the CTA. Do NOT create a new button.
- **Routing:** CTA should use Next.js `<Link>` component pointing to `/start` (gender gateway route, created in a future story).
- **Fonts:** Typography is already configured in layout.tsx via `next/font/google`. Use `font-display` class for Space Grotesk headings, `font-body` class for Inter text. [Source: globals.css @theme inline]

### Technical Requirements

- **SSR for SEO:** The landing page is the primary SEO entry point. It MUST be server-rendered. Architecture specifies SSR landing for SEO, SPA for consultation flow. [Source: architecture.md#8.1]
- **Metadata:** Enhance the existing metadata in `layout.tsx` or add page-level metadata export in `page.tsx` for landing-page-specific OG tags. Include Portuguese language meta tags for Brazilian market targeting.
- **Viewport Height:** Use `min-h-dvh` (dynamic viewport height) instead of `min-h-screen` to handle mobile browser address bar correctly on iOS Safari and Chrome Android.
- **Gradient Animation:** Use pure CSS `@keyframes` for the background gradient. CSS animations are GPU-accelerated, work with SSR, and add zero JS bundle cost. Framer Motion is overkill for a background gradient.
- **No Layout Shift:** Set explicit sizes on text containers or use `text-balance` on headlines to prevent CLS during font swap.

### Previous Story Intelligence (Story 1.1)

**What was built:**
- Next.js 16.1.6 project with TypeScript, Tailwind CSS v4, App Router, `src/` directory
- Dual theme system (male/female/neutral) via CSS custom properties + `data-theme` attribute
- ThemeProvider (React Context) at `src/components/layout/ThemeProvider.tsx`
- Base components: Button, Card, Badge, Toast (all theme-aware via CSS variables)
- Typography: Space Grotesk (display/heading), Inter (body/caption) via `next/font/google`
- Motion tokens in `src/lib/motion.ts` (Framer Motion presets)
- `prefers-reduced-motion` support in CSS and via `getReducedMotionTransition()` utility
- 62 tests passing, ESLint clean, build succeeds

**Key learnings from Story 1.1:**
- shadcn/ui uses CSS variables natively -- all custom components auto-theme when using `bg-background`, `text-foreground`, etc.
- Female theme accent was darkened from #C4787A to #A85C60 for WCAG AA compliance (4.81:1 contrast)
- `sonner` (Toast) had a `next-themes` dependency that was replaced with custom ThemeProvider integration
- Tailwind v4 uses `@theme inline` directive in globals.css for custom tokens -- NOT the old `tailwind.config.ts` extend pattern
- Font CSS variables: `--font-space-grotesk` (display) and `--font-inter` (body) are applied to `<html>` in layout.tsx

**Existing file to modify:**
- `src/app/page.tsx` -- currently a minimal placeholder, must be replaced with landing page

**DO NOT modify:**
- `src/app/layout.tsx` (already correctly set up with ThemeProvider, fonts, Toaster)
- `src/app/globals.css` (theme variables and Tailwind config are complete)
- Any files in `src/components/ui/` (design system components are stable)

### Library & Framework Requirements

| Library | Version | Notes |
|---------|---------|-------|
| Next.js | 16.1.6 | App Router, `src/` directory, server/client components |
| Tailwind CSS | v4+ | Use Tailwind utility classes, theme via CSS variables |
| Framer Motion | 12.34.3+ | Only if needed for entry animations on hero content (optional -- CSS animations preferred for background) |
| Lucide React | 0.575.0+ | Icons if needed (e.g., arrow icon on CTA button) |
| React | 19.2.3 | Server Components by default in App Router |

**DO NOT install new dependencies for this story.** Everything needed is already installed.

### File Structure Requirements

```
src/
├── app/
│   ├── layout.tsx              # NO CHANGES (already configured)
│   ├── page.tsx                # MODIFY: Replace placeholder with landing page
│   └── globals.css             # NO CHANGES (theme CSS variables complete)
├── components/
│   ├── landing/
│   │   └── HeroSection.tsx     # NEW: Hero section client component
│   └── ui/
│       └── button.tsx          # REUSE: Existing Button for CTA (no changes)
└── lib/
    └── motion.ts               # REUSE: Motion presets if Framer Motion used (no changes)
```

[Source: architecture.md#6.1 -- Project Structure, components/landing/ directory]

### Project Structure Notes

- `src/components/landing/` is a NEW directory -- architecture.md#6.1 specifies this directory for landing page section components
- The landing page will eventually contain multiple sections (Hero, How It Works, Trust, Interactive Demo, Footer) across stories 1.2 through 1.6. HeroSection is the first.
- Each landing section should be its own component for clean separation and future story isolation
- `page.tsx` composes the sections together and handles page-level metadata

### Testing Requirements

- Use existing Vitest + React Testing Library setup (already configured in Story 1.1)
- Test file location: `src/test/hero-section.test.tsx` (follows existing test file pattern in `src/test/`)
- Test that the component renders all required text content
- Test CTA button presence and href attribute
- Test that the component works in neutral theme (default before gender selection)
- No visual regression testing needed for MVP -- verify Lighthouse score manually

### Critical Guardrails

- **DO NOT** add `'use client'` to `src/app/page.tsx`. The page itself must be a Server Component.
- **DO NOT** hardcode hex colors. Use theme variables: `bg-background`, `text-foreground`, `bg-accent`, `text-accent`.
- **DO NOT** use `className="h-screen"` for hero height. Use `min-h-dvh` for mobile compatibility.
- **DO NOT** install new npm packages. Everything needed is already in package.json.
- **DO NOT** modify globals.css, layout.tsx, or any ui/ components.
- **DO NOT** add real analytics or tracking code -- that is Epic 10.
- **DO NOT** implement the "How It Works", "Trust", "Demo", or "Footer" sections -- those are stories 1.3-1.6.
- **DO** use the existing Button component from `src/components/ui/button.tsx` for the CTA.
- **DO** use `next/link` for the CTA href to `/start`.
- **DO** ensure the page loads fast: no unnecessary client JS, no large images, CSS-only animations where possible.
- **DO** handle the neutral theme state (before gender selection) -- the hero must look good in the default neutral theme.
- **DO** use Portuguese (pt-BR) for all user-facing text (headline, subheadline, CTA, social proof).

### Content Reference (Portuguese)

| Element | Text |
|---------|------|
| Headline | Descubra o corte perfeito para o seu rosto |
| Subheadline | Consultoria de visagismo com IA -- personalizada em 3 minutos |
| CTA | Comecar Agora |
| Social Proof | Ja ajudamos X pessoas a encontrar o seu estilo |

[Source: ux-design.md#3.1 -- Landing Page Hero Section, epics-and-stories.md#S1.2]

### UX Design Specifications

- **Layout:** Full-viewport hero section as first content the visitor sees
- **Background:** Subtle animated gradient (dark to accent color shift). Premium modern feel, NOT flashy or "bold urban barbershop." Think Skin+Me editorial aesthetic. [Source: ux-design.md#1.1]
- **CTA Placement:** Large, centered, prominent button. Primary action in bottom 40% of screen for thumb-zone optimization on mobile. [Source: ux-design.md Section: Mobile UX]
- **Typography Hierarchy:** Headline is the dominant element (Space Grotesk 700, 32/48px). Subheadline is supporting (Inter 400, 18px). CTA is the action anchor.
- **Spacing:** Use design system spacing tokens: 24px (--spacing-6) for section padding on mobile, 48px (--spacing-12) on desktop
- **Max Width:** Content area max-width 1200px centered on Desktop L (1440px) [Source: ux-design.md#5]

### Performance Targets

- Lighthouse Performance: >= 90
- FCP (First Contentful Paint): < 1.5s
- LCP (Largest Contentful Paint): < 2.5s (headline text)
- CLS (Cumulative Layout Shift): 0
- No images in hero section (text + gradient only) -- ensures fast paint
- Fonts pre-loaded via `next/font` (already configured)

### References

- [Source: architecture.md#2.1] -- Frontend tech stack (Next.js 14+, Tailwind, shadcn/ui)
- [Source: architecture.md#6.1] -- Project structure (`src/components/landing/`)
- [Source: architecture.md#8.1] -- Loading strategy (SSR landing for SEO)
- [Source: architecture.md#8.4] -- Caching (Vercel Edge Cache, 1 hour for landing)
- [Source: ux-design.md#1.1] -- Visual identity (premium modern, dual theme)
- [Source: ux-design.md#1.2] -- Typography (Space Grotesk display, Inter body)
- [Source: ux-design.md#3.1] -- Landing page hero section specification
- [Source: ux-design.md#5] -- Responsive breakpoints (375px primary, 1440px max)
- [Source: ux-design.md#6] -- Accessibility (WCAG 2.1 AA, keyboard nav, contrast)
- [Source: ux-design.md#8.1] -- Micro-interactions
- [Source: prd.md#FR32] -- Landing page communicates value proposition with visuals
- [Source: prd.md#FR34] -- Landing page includes clear CTA to start consultation
- [Source: prd.md#FR35] -- Landing page SEO optimized with meta tags
- [Source: prd.md#NFR1] -- Landing page loads < 2s on 4G (Lighthouse >= 90)
- [Source: prd.md#NFR15] -- WCAG 2.1 AA compliance
- [Source: epics-and-stories.md#E1] -- Epic 1 context and elicitation insights
- [Source: epics-and-stories.md#S1.2] -- Story 1.2 requirements
- [Source: 1-1-design-system-setup.md] -- Previous story: design system, theme config, components

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — clean implementation with no debug issues.

### Completion Notes List

- TDD approach: wrote 10 tests first (red), then implemented (green), all pass
- HeroSection is a client component (`'use client'`) — page.tsx remains a Server Component
- CSS-only gradient animation via `@keyframes` — zero JS overhead for background
- `prefers-reduced-motion` respected: animation disabled, static gradient shown
- Used `min-h-dvh` for proper mobile viewport height handling
- Button component reused from design system (primary variant, size="lg")
- CTA links to `/start` via Next.js `<Link>` component
- Page-level SEO metadata with Portuguese OG tags for Brazilian market
- 74 total tests passing (62 existing + 12 new), ESLint clean, build succeeds
- Page prerendered as static content (SSR/SSG compatible)

### File List

- `src/app/page.tsx` — MODIFIED: replaced placeholder with landing page server component + SEO metadata
- `src/components/landing/HeroSection.tsx` — NEW: hero section client component with headline, subheadline, CTA, social proof
- `src/components/landing/hero-gradient.css` — NEW: CSS gradient animation with reduced-motion support
- `src/test/hero-section.test.tsx` — NEW: 12 tests covering all acceptance criteria + accessibility + anchor nav

### Change Log

- **2026-03-01 (Code Review):** Fixed 4 issues found during adversarial code review:
  1. [HIGH] Replaced invalid `pb-safe-area-inset-bottom` with `pb-[env(safe-area-inset-bottom)]` for proper iOS safe area handling
  2. [HIGH] Marked all task checkboxes as complete (were all `[ ]` despite full implementation)
  3. [MEDIUM] Restructured HeroSection layout with flex spacers (3:1:1 ratio) to place CTA in bottom 40% thumb-zone per UX spec
  4. [MEDIUM] Added `aria-labelledby="hero-headline"` and `id="hero"` for accessibility and anchor navigation
  5. Added 2 new tests: aria-labelledby verification + id attribute verification (10 → 12 tests)

### Senior Developer Review (AI)

- **Reviewer:** Fusuma (via BMAD code-review workflow)
- **Date:** 2026-03-01
- **Outcome:** APPROVED (after fixes)
- **Issues Found:** 2 HIGH, 2 MEDIUM, 3 LOW
- **Issues Fixed:** 4 (all HIGH and MEDIUM)
- **Remaining (LOW, informational):**
  - `html lang="en"` should be `lang="pt-BR"` for SEO (outside story scope — layout.tsx not to be modified per story guardrails)
  - `'use client'` on HeroSection may be unnecessary since no client APIs are used (acceptable for future-proofing)
  - Consider adding section `id` attributes as more landing sections are added (stories 1.3-1.6)
- **Verification:** 74/74 tests passing, build succeeds, ESLint clean, page prerendered as static content
