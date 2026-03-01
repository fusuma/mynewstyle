# Story 1.4: Trust & Privacy Section

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a visitor,
I want to see privacy assurances and social proof on the landing page,
so that I feel safe uploading my photo and confident in the platform's credibility.

## Acceptance Criteria

1. Privacy messaging displayed: "A sua foto é processada com seguranca e nunca é partilhada" with a lock/shield icon
2. Link to full privacy policy page (`/privacidade`) -- renders as a styled text link
3. Social proof placeholder: "Já ajudámos X pessoas a encontrar o seu estilo" with a static placeholder number (e.g., "500+") that can be made dynamic later
4. Section uses existing design system theme (CSS variables, typography, spacing tokens from Story 1.1)
5. Responsive layout: works on mobile (375px) through desktop (1440px)
6. Accessible: all icons have `aria-hidden="true"`, text is readable by screen readers, link has proper semantics
7. Respects `prefers-reduced-motion` for any entrance animations
8. SSR-compatible -- component can be rendered server-side or as a lightweight client component
9. Section has `id="trust"` for potential anchor navigation
10. Portuguese (pt-BR) for all user-facing text

## Tasks / Subtasks

- [x] Task 1: Create TrustPrivacySection component (AC: 1, 4, 6, 9, 10)
  - [x] Create `src/components/landing/TrustPrivacySection.tsx`
  - [x] Privacy messaging with lock/shield icon from Lucide React (`Shield` or `Lock`)
  - [x] Main text: "A sua foto é processada com segurança e nunca é partilhada"
  - [x] Supporting text: brief privacy reassurance (e.g., "Utilizamos encriptação de ponta e eliminamos fotos após 90 dias")
  - [x] Icon uses `aria-hidden="true"` with descriptive text for screen readers
  - [x] Add `id="trust"` to the section element
  - [x] Add `data-testid="trust-privacy-section"` for testing
  - [x] Apply theme CSS variables: `text-foreground`, `text-muted-foreground`, `bg-background`, `text-accent`
- [x] Task 2: Add privacy policy link (AC: 2)
  - [x] Use Next.js `<Link>` from `next/link` pointing to `/privacidade`
  - [x] Styled as a text link with accent color and underline-on-hover
  - [x] Text: "Leia a nossa política de privacidade"
  - [x] Accessible: proper anchor semantics, focus state visible
- [x] Task 3: Add social proof element (AC: 3)
  - [x] Display: "Já ajudámos 500+ pessoas a encontrar o seu estilo"
  - [x] Use an icon from Lucide React (`Users` or `Heart`) alongside the counter
  - [x] Static placeholder number "500+" -- structure the component so the number is easy to replace with a dynamic value later (prop or constant)
  - [x] Style: accent color for the number, muted text for the surrounding copy
- [x] Task 4: Implement responsive layout (AC: 5)
  - [x] Mobile (< 768px): vertical stack, centered text, full-width
  - [x] Desktop (1024px+): elements can be arranged in a row or centered column -- keep it visually balanced
  - [x] Max content width 1200px centered (matching hero and how-it-works pattern)
  - [x] Use Tailwind responsive classes
  - [x] Spacing: `py-12 md:py-16` (48px/64px) -- slightly less than how-it-works since this is a lighter section
- [x] Task 5: Add entrance animation (AC: 7)
  - [x] Subtle fade-in animation using Framer Motion or CSS
  - [x] Use motion tokens from `src/lib/motion.ts` (pageTransition, getReducedMotionTransition)
  - [x] Respect `prefers-reduced-motion`: disable all animations when set
  - [x] If using Framer Motion, component must have `'use client'` directive
- [x] Task 6: Integrate into landing page (AC: 8)
  - [x] Import `TrustPrivacySection` in `src/app/page.tsx`
  - [x] Add below `<HowItWorksSection />` in the main element
  - [x] `page.tsx` remains a Server Component (no `'use client'`)
- [x] Task 7: Write tests (AC: all)
  - [x] Test file: `src/test/trust-privacy-section.test.tsx`
  - [x] Test: Section renders privacy messaging text
  - [x] Test: Lock/Shield icon is present (via `aria-hidden` attribute or test-id)
  - [x] Test: Link to `/privacidade` is rendered with correct href
  - [x] Test: Social proof text with "500+" is rendered
  - [x] Test: Section has `id="trust"` for anchor navigation
  - [x] Test: Section has `data-testid="trust-privacy-section"`
  - [x] Test: Component renders without errors in neutral theme
  - [x] Minimum 7 tests to cover all acceptance criteria (12 tests written)
  - [x] Run existing test suite to ensure no regressions (85 existing + 12 new = 97 total passing)

## Dev Notes

### Architecture Compliance

- **Page Component:** `src/app/page.tsx` MUST remain a Server Component (no `'use client'` directive). This is critical for SSR and SEO. [Source: architecture.md#2.1, architecture.md#8.1]
- **Client Components:** If TrustPrivacySection uses Framer Motion for animations, it must be a separate client component with `'use client'` directive. If using CSS-only animations, it can remain a server component.
- **Styling:** Use Tailwind CSS utility classes only. Use theme CSS variables (`bg-background`, `text-foreground`, `text-accent`, `bg-card`, `bg-muted`) -- NEVER hardcode hex colors. [Source: 1-1-design-system-setup.md -- Critical Guardrails]
- **Components:** Reuse existing design system components (Card, Badge) where appropriate. Do NOT create new base UI components.
- **Icons:** Use Lucide React (`lucide-react`) which is already installed. Recommended icons: `Shield` or `Lock` (privacy), `Users` or `Heart` (social proof). Import only the specific icons needed. [Source: architecture.md#2.1, ux-design.md#4.2]
- **Fonts:** Typography is already configured in layout.tsx via `next/font/google`. Use `font-display` class for Space Grotesk headings, `font-body` class for Inter text. [Source: 1-1-design-system-setup.md]
- **Links:** Use Next.js `<Link>` from `next/link` for internal navigation (to `/privacidade`). Do NOT use raw `<a>` tags for internal routes.

### Technical Requirements

- **SSR for SEO:** The landing page is the primary SEO entry point. Trust messaging and social proof contribute to conversion -- they should be SSR-rendered for both SEO and fast first paint. [Source: architecture.md#8.1]
- **Privacy Policy Link:** The `/privacidade` page does NOT exist yet (Story 1.6 -- Footer & Legal Pages will create it). The link should point to `/privacidade` anyway. Next.js will handle the 404 until that page is implemented. This is intentional -- we establish the link now, the target page comes later.
- **Social Proof Number:** Use a constant or prop for the number (e.g., `const SOCIAL_PROOF_COUNT = "500+"`) so it can easily be replaced with a dynamic value from the database later. Do NOT hardcode the number inline in JSX.
- **Section ID:** Use `id="trust"` for anchor linking. This follows the pattern from Story 1.2 (`id="hero"`) and Story 1.3 (`id="how-it-works"`).
- **Content Width:** Max content width 1200px centered, matching the hero and how-it-works section patterns (`max-w-[1200px] mx-auto`).
- **Section Contrast:** This section should have a subtle visual differentiation from How It Works. Options: use `bg-background` if how-it-works uses `bg-card`/`bg-muted`, or vice versa. Check what HowItWorksSection uses and contrast it.

### Previous Story Intelligence (Story 1.3 -- How It Works Section)

**What was built:**
- `src/components/landing/HowItWorksSection.tsx` -- Client component (`'use client'`) with 3-step process display
- Uses Framer Motion `whileInView` for entrance animations with staggered reveals
- Responsive grid: `grid-cols-1 md:grid-cols-3` with `gap-6 md:gap-8`
- Section uses `id="how-it-works"`, `data-testid="how-it-works-section"` -- follow same pattern
- Content wrapped in `max-w-[1200px] mx-auto` container
- Uses styled divs with `bg-card rounded-card shadow-card` theme tokens (NOT the Card component directly)
- Step numbers as accent-colored circles
- `scroll-mt-16` added for future fixed header offset
- IntersectionObserver mock added to test setup for Framer Motion `whileInView`
- 85 total tests passing (62 from 1.1 + 12 from 1.2 + 11 from 1.3)

**Key learnings from Story 1.3:**
- `page.tsx` is a Server Component -- import client components into it, do NOT add `'use client'` to page.tsx
- Framer Motion `whileInView` requires IntersectionObserver mock in test setup (already added in Story 1.3)
- Portuguese diacritical marks matter -- use proper accents (seguranca -> seguranca, privacidade, etc.)
- Used `aria-labelledby` for accessibility -- follow same pattern
- Semantic HTML matters (Story 1.3 code review switched from `div` to `ol`/`li` for step sequence)
- Reduced-motion must bypass stagger, y-offset, AND initial opacity/transform states

**Previous story files modified:**
- `src/app/page.tsx` -- will be modified again (add TrustPrivacySection import)
- `src/components/landing/` -- add new component here

**DO NOT modify:**
- `src/app/layout.tsx` (already correctly set up with ThemeProvider, fonts, Toaster)
- `src/app/globals.css` (scroll-behavior: smooth already added in Story 1.3)
- Any files in `src/components/ui/` (design system components are stable)
- `src/components/landing/HeroSection.tsx` (stable, reviewed)
- `src/components/landing/hero-gradient.css` (stable)
- `src/components/landing/HowItWorksSection.tsx` (stable, reviewed)
- `src/test/setup.ts` (IntersectionObserver mock already added)

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
- Motion presets: `src/lib/motion.ts` -- use `pageTransition`, `resultsRevealContainer`, `resultsRevealItem`, `getReducedMotionTransition`
- Typography classes: `font-display` (Space Grotesk), `font-body` (Inter)
- Theme CSS variables: `text-foreground`, `text-muted-foreground`, `bg-background`, `bg-card`, `bg-muted`, `text-accent`, `bg-accent`

### Library & Framework Requirements

| Library | Version | Notes |
|---------|---------|-------|
| Next.js | 16.1.6 | App Router, `src/` directory, server/client components |
| Tailwind CSS | v4+ | Use Tailwind utility classes, theme via CSS variables |
| Framer Motion | 12.34.3+ | Optional for entrance animations (if used, component must be `'use client'`) |
| Lucide React | 0.575.0+ | Icons: `Shield`/`Lock` (privacy), `Users`/`Heart` (social proof) |
| React | 19.2.3 | Server Components by default in App Router |
| next/link | (bundled) | Use `<Link>` for internal navigation to `/privacidade` |

**DO NOT install new dependencies for this story.** Everything needed is already installed.

### File Structure Requirements

```
src/
├── app/
│   ├── layout.tsx              # NO CHANGES
│   ├── page.tsx                # MODIFY: Add TrustPrivacySection import + render below HowItWorksSection
│   └── globals.css             # NO CHANGES
├── components/
│   ├── landing/
│   │   ├── HeroSection.tsx     # NO CHANGES
│   │   ├── hero-gradient.css   # NO CHANGES
│   │   ├── HowItWorksSection.tsx # NO CHANGES
│   │   └── TrustPrivacySection.tsx  # NEW: Trust & Privacy section
│   └── ui/
│       └── card.tsx            # REUSE if needed (no changes)
├── lib/
│   └── motion.ts               # REUSE: Motion presets for animations (no changes)
└── test/
    └── trust-privacy-section.test.tsx  # NEW: Tests for TrustPrivacySection
```

[Source: architecture.md#6.1 -- Project Structure, components/landing/ directory]

### Project Structure Notes

- `src/components/landing/` already exists with HeroSection.tsx, hero-gradient.css, HowItWorksSection.tsx
- Each landing section is its own component for clean separation and future story isolation
- `page.tsx` composes the sections together -- add TrustPrivacySection after HowItWorksSection
- The landing page will eventually contain: Hero (1.2), How It Works (1.3), Trust & Privacy (1.4), Interactive Demo (1.5), Footer (1.6)
- Follow the established pattern: section component in `landing/`, test in `test/`

### Testing Requirements

- Use existing Vitest + React Testing Library setup (already configured in Story 1.1)
- Test file location: `src/test/trust-privacy-section.test.tsx` (follows existing test file pattern in `src/test/`)
- IntersectionObserver mock is already in `src/test/setup.ts` (added in Story 1.3) -- no additional test setup needed
- Test that the component renders the privacy messaging text
- Test that the privacy link points to `/privacidade`
- Test that social proof text with counter is rendered
- Test section has `id="trust"` and `data-testid="trust-privacy-section"`
- Test that the component works in neutral theme (default before gender selection)
- Minimum 7 tests to cover all acceptance criteria
- Run existing test suite to ensure no regressions (expect 85 existing tests to still pass)

### Content Reference (Portuguese)

| Element | Icon | Text |
|---------|------|------|
| Privacy headline | Shield (Lucide) | A sua foto é processada com seguranca e nunca é partilhada |
| Privacy supporting text | -- | Utilizamos encriptacao de ponta e eliminamos fotos após 90 dias |
| Privacy policy link | -- | Leia a nossa política de privacidade |
| Social proof | Users (Lucide) | Já ajudámos 500+ pessoas a encontrar o seu estilo |

[Source: ux-design.md#3.1 -- Landing Page "Trust Section", epics-and-stories.md#S1.4]

### UX Design Specifications

- **Purpose:** Build trust before the user is asked to upload a photo. This section addresses the #1 conversion blocker: "Will my photo be safe?" [Source: ux-design.md#3.1, prd.md Risk Mitigation -- "Users don't trust AI recommendations"]
- **Layout:** Centered content, visually lighter than How It Works. Could be a single centered block or a subtle card. NOT a heavy section -- it's a reassurance, not a feature showcase.
- **Visual Style:** Premium modern, clean. Lock/shield icon should feel trustworthy, not corporate. Use accent color for emphasis on key phrases. [Source: ux-design.md#1.1]
- **Icons:** Use Lucide icons, consistent stroke width, themed with accent color [Source: ux-design.md#4.2]
- **Background:** Section should have subtle contrast from How It Works. If How It Works uses `bg-muted` or `bg-card`, use `bg-background` for this section, or vice versa.
- **Spacing:** Slightly less padding than How It Works since this is a lighter section: `py-12 md:py-16` (48px/64px) [Source: ux-design.md#1.3]
- **Typography:** Privacy headline: Inter 600 18-20px. Supporting text: Inter 400 16px. Social proof: Inter 400 16px with accent-colored number. [Source: ux-design.md#1.2]
- **Social Proof:** The "X pessoas" counter is a trust-building pattern from the UX spec's pre-mortem: "Landing page had no social proof -- nobody trusted an unknown AI tool." [Source: epics-and-stories.md#E1 Elicitation]
- **LGPD Alignment:** The privacy messaging aligns with LGPD compliance requirements. Photos are processed only for visagism analysis, deleted after 90 days inactive, user has right to deletion. [Source: architecture.md#7.2 -- Data Protection (LGPD)]

### Critical Guardrails

- **DO NOT** add `'use client'` to `src/app/page.tsx`. The page itself must remain a Server Component.
- **DO NOT** hardcode hex colors. Use theme variables: `bg-background`, `text-foreground`, `bg-accent`, `text-accent`, `bg-card`, `bg-muted`.
- **DO NOT** install new npm packages. Everything needed (Lucide, Framer Motion, Tailwind) is already in package.json.
- **DO NOT** modify `src/app/layout.tsx`, `src/app/globals.css`, or any `src/components/ui/` files.
- **DO NOT** modify `src/components/landing/HeroSection.tsx`, `hero-gradient.css`, or `HowItWorksSection.tsx`.
- **DO NOT** implement the Interactive Demo (story 1.5) or Footer & Legal Pages (story 1.6).
- **DO NOT** create the `/privacidade` page -- just link to it. Story 1.6 will create it.
- **DO NOT** use emoji characters directly in the rendered JSX. Use Lucide React icon components instead.
- **DO NOT** over-engineer -- this is a lightweight trust/reassurance section. Keep it clean and simple.
- **DO** use Next.js `<Link>` from `next/link` for the `/privacidade` link.
- **DO** extract the social proof count into a constant/prop for future dynamic replacement.
- **DO** add `id="trust"` and `data-testid="trust-privacy-section"` to the section.
- **DO** ensure the section renders correctly in the neutral theme (before gender selection).
- **DO** use Portuguese (pt-BR) for all user-facing text.
- **DO** run existing test suite (85 tests) plus new tests to confirm no regressions.

### Git Intelligence

Recent commit patterns:
- `feat(epic-1): implement story 1-3-how-it-works-section` -- follow same commit message format
- `feat(epic-1): implement story 1-2-landing-page-hero-section`
- `feat(epic-1): implement story 1-1-design-system-setup`
- Stories are implemented as single commits with descriptive messages
- All stories have been reviewed via code-review workflow before marking done

Suggested commit message: `feat(epic-1): implement story 1-4-trust-and-privacy-section`

### Performance Targets

- Lighthouse Performance: >= 90 (maintained from previous stories)
- No additional client-side JavaScript if CSS-only approach used for animations
- If Framer Motion used for entrance animations, keep bundle impact minimal (tree-shaken imports)
- No images in this section -- icons + text + link only, so minimal render cost
- Content should be visible in first paint (SSR or pre-rendered)

### References

- [Source: architecture.md#2.1] -- Frontend tech stack (Next.js, Tailwind, shadcn/ui, Lucide)
- [Source: architecture.md#6.1] -- Project structure (`src/components/landing/`)
- [Source: architecture.md#7.2] -- Data Protection (LGPD) -- privacy messaging must align with actual data handling
- [Source: architecture.md#8.1] -- Loading strategy (SSR landing for SEO)
- [Source: ux-design.md#1.1] -- Visual identity (premium modern, dual theme)
- [Source: ux-design.md#1.2] -- Typography scale (Space Grotesk display, Inter body)
- [Source: ux-design.md#1.3] -- Spacing system (4px base, scale)
- [Source: ux-design.md#1.4] -- Border radius tokens (cards 16px)
- [Source: ux-design.md#1.5] -- Shadow tokens (card shadow)
- [Source: ux-design.md#1.6] -- Motion tokens (350ms page, 150ms stagger)
- [Source: ux-design.md#3.1] -- Landing page Trust section specification
- [Source: ux-design.md#4.2] -- Icons (Lucide icon set)
- [Source: ux-design.md#5] -- Responsive breakpoints (375px primary, 1024px desktop, 1440px max)
- [Source: ux-design.md#6] -- Accessibility (WCAG 2.1 AA, keyboard nav, contrast)
- [Source: prd.md#FR32] -- Landing page communicates value proposition
- [Source: prd.md#FR34] -- Landing page includes clear CTA
- [Source: prd.md#NFR1] -- Landing page loads < 2s on 4G (Lighthouse >= 90)
- [Source: prd.md#NFR6] -- All data transmitted over HTTPS/TLS 1.2+
- [Source: prd.md#NFR7] -- User photos stored with user-scoped access control
- [Source: prd.md#NFR15] -- WCAG 2.1 AA compliance
- [Source: epics-and-stories.md#E1] -- Epic 1 context and elicitation insights (social proof from pre-mortem)
- [Source: epics-and-stories.md#S1.4] -- Story 1.4 acceptance criteria
- [Source: 1-1-design-system-setup.md] -- Design system setup, theme config, components, motion tokens
- [Source: 1-2-landing-page-hero-section.md] -- Hero section patterns, page.tsx composition
- [Source: 1-3-how-it-works-section.md] -- How It Works patterns, Framer Motion whileInView, test setup

## Dev Agent Record

### Agent Model Used

Code review: Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

None

### Completion Notes List

- All 10 Acceptance Criteria implemented and verified
- 12 tests written (exceeds minimum 7 requirement): privacy text, supporting text, shield icon, privacy link, social proof, section id, data-testid, neutral theme render, all icons aria-hidden, semantic section element, link accessible name, prefers-reduced-motion
- 97 total tests passing (85 existing + 12 new), zero regressions
- Build succeeds with no TypeScript or ESLint errors
- HowItWorksSection uses `bg-muted/50`; TrustPrivacySection correctly uses `bg-background` for visual contrast
- `SOCIAL_PROOF_COUNT` extracted as constant for future dynamic replacement
- Component uses Framer Motion `whileInView` with `useReducedMotion` for AC 7 compliance
- `page.tsx` remains a Server Component (no `'use client'`)
- Portuguese diacritical marks correctly applied (seguranca, encriptacao)

### Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-01 | Code review: added prefers-reduced-motion test, updated task checkboxes, populated Dev Agent Record, set status to done | Claude Opus 4.6 (code-review) |

### File List

| File | Action | Description |
|------|--------|-------------|
| `src/components/landing/TrustPrivacySection.tsx` | NEW | Trust & Privacy section client component with Shield/Users icons, privacy messaging, policy link, social proof |
| `src/test/trust-privacy-section.test.tsx` | NEW | 12 tests covering all ACs including reduced-motion |
| `src/app/page.tsx` | MODIFIED | Added TrustPrivacySection import and render below HowItWorksSection |
