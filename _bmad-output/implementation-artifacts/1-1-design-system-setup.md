# Story 1.1: Design System Setup

Status: done

## Story

As a developer,
I want to set up the dual theme system (dark male / warm light female) with Tailwind + shadcn/ui,
so that all components adapt to gender selection and subsequent stories have a consistent design foundation.

## Acceptance Criteria

1. Tailwind config with male theme colors (charcoal #1A1A2E, amber #F5A623, cream #FAF3E0)
2. Tailwind config with female theme colors (warm white #FFF8F0, dusty rose #A85C60, charcoal #2D2D3A)
3. ThemeProvider component switches theme based on gender context
4. Typography scale configured: Space Grotesk (display/heading), Inter (body/caption)
5. Base component library: Button (primary/secondary/ghost), Card, Badge, Toast
6. Spacing system: 4px base unit with scale (4, 8, 12, 16, 24, 32, 48, 64, 96px)
7. Motion tokens defined: 200ms micro, 350ms page, 1.5s loading loop

## Tasks / Subtasks

- [x] Task 1: Initialize Next.js project with App Router (AC: all)
  - [x] Create Next.js 14+ project with TypeScript, Tailwind CSS, App Router
  - [x] Install dependencies: `tailwindcss`, `@tailwindcss/typography`, `framer-motion`, `zustand`, `lucide-react`
  - [x] Configure `next/font` for Space Grotesk and Inter with `display: swap`
  - [x] Set up ESLint + Prettier with project conventions
- [x] Task 2: Configure dual theme system in Tailwind (AC: 1, 2, 6)
  - [x] Extend `tailwind.config.ts` with CSS custom properties for male theme
  - [x] Extend `tailwind.config.ts` with CSS custom properties for female theme
  - [x] Define spacing scale (4px base unit) in Tailwind config
  - [x] Define border radius tokens: cards 16px, buttons 12px, badges 8px
  - [x] Define shadow tokens: card, elevated, preview-image
- [x] Task 3: Build ThemeProvider component (AC: 3)
  - [x] Create `src/components/layout/ThemeProvider.tsx` using React Context
  - [x] ThemeProvider toggles `data-theme="male"` / `data-theme="female"` on root element
  - [x] CSS variables switch based on `data-theme` attribute
  - [x] Export `useTheme()` hook returning `{ gender, setGender, theme }`
  - [x] Default theme: neutral (before gender selection)
- [x] Task 4: Configure typography (AC: 4)
  - [x] Set up Space Grotesk via `next/font/google` (weights: 600, 700)
  - [x] Set up Inter via `next/font/google` (weights: 400, 600)
  - [x] Map typography roles to Tailwind classes: display (32/48px), heading (24/32px), subheading (18/22px), body (16px), caption (13/14px), badge (12px)
- [x] Task 5: Build base component library with shadcn/ui (AC: 5)
  - [x] Initialize shadcn/ui with `npx shadcn-ui@latest init`
  - [x] Add and customize Button component (primary, secondary, ghost variants) — 48px min height mobile, 12px radius
  - [x] Add and customize Card component — 16px radius, card shadow
  - [x] Add and customize Badge component — 8px radius, theme-aware colors
  - [x] Add and customize Toast component (sonner) — auto-dismiss 4s
  - [x] All components theme-aware (adapt to male/female via CSS variables)
- [x] Task 6: Define motion tokens (AC: 7)
  - [x] Create `src/lib/motion.ts` with Framer Motion transition presets
  - [x] Micro: `{ duration: 0.2, ease: 'easeOut' }`
  - [x] Page: `{ duration: 0.35, ease: 'easeInOut' }`
  - [x] Loading: `{ duration: 1.5, repeat: Infinity }`
  - [x] Results reveal: `{ staggerChildren: 0.15 }` (150ms per element)
  - [x] Respect `prefers-reduced-motion` — disable animations when set
- [x] Task 7: Create root layout with providers (AC: 3)
  - [x] Set up `src/app/layout.tsx` with ThemeProvider wrapping children
  - [x] Apply font variables to html element
  - [x] Add basic metadata for SEO

## Dev Notes

### Architecture Compliance

- **Framework:** Next.js 14+ with App Router — use `src/app/` directory structure [Source: architecture.md#6.1]
- **Styling:** Tailwind CSS + shadcn/ui — NO other CSS frameworks [Source: architecture.md#2.1]
- **State:** React Context for theme (not Zustand — Zustand is for consultation flow state only) [Source: architecture.md#2.1]
- **Animation:** Framer Motion — tree-shake, only import used animations [Source: architecture.md#2.1]
- **Hosting:** Vercel — ensure Next.js config is Vercel-compatible [Source: architecture.md#2.1]

### Technical Requirements

- **Tailwind dual theme approach:** Use CSS custom properties (`--color-background`, `--color-accent`, etc.) toggled via `data-theme` attribute on `<html>`. This is the recommended pattern for runtime theme switching with Tailwind v4+.
- **shadcn/ui theming:** shadcn/ui uses CSS variables natively — align custom property names with shadcn's expected variable names (`--background`, `--foreground`, `--primary`, `--accent`, etc.) so all shadcn components auto-theme.
- **Font loading:** Use `next/font/google` — NOT CDN links. This self-hosts fonts for performance and privacy. Apply font CSS variables to root element.
- **NO `@apply` in global CSS for theme colors.** Use CSS variables that switch based on `data-theme` attribute.

### Library & Framework Requirements

| Library | Version | Notes |
|---------|---------|-------|
| Next.js | 14+ (App Router) | Use `src/` directory, server/client components |
| Tailwind CSS | v4+ | CSS-first config, use `@theme` directive |
| shadcn/ui | latest | CLI init, customize components in `src/components/ui/` |
| Framer Motion | latest | Tree-shake imports: `import { motion } from 'framer-motion'` |
| Zustand | latest | NOT needed in this story — installed for future stories |
| Lucide React | latest | Icon library — install now for future use |
| Space Grotesk | via next/font | Weights: 600, 700 |
| Inter | via next/font | Weights: 400, 600 |

### File Structure Requirements

```
src/
├── app/
│   ├── layout.tsx              # Root layout with ThemeProvider + fonts
│   ├── page.tsx                # Landing page placeholder
│   └── globals.css             # Theme CSS variables + Tailwind base
├── components/
│   ├── ui/                     # shadcn/ui components (Button, Card, Badge, Toast)
│   └── layout/
│       └── ThemeProvider.tsx    # Gender-based theme switching
├── hooks/
│   └── useTheme.ts             # Theme context hook (re-export from ThemeProvider)
├── lib/
│   ├── motion.ts               # Framer Motion transition presets
│   └── utils.ts                # shadcn/ui cn() utility
└── types/
    └── index.ts                # Gender type, theme types
```

[Source: architecture.md#6.1 — Project Structure]

### Project Structure Notes

- This is a **greenfield project** — all directories created fresh
- Follow architecture.md Section 6.1 exactly for folder structure
- `src/components/ui/` is managed by shadcn/ui CLI — don't manually create files there, use `npx shadcn-ui@latest add <component>`
- `src/lib/utils.ts` is auto-created by shadcn/ui init — contains `cn()` helper (clsx + tailwind-merge)

### Testing Requirements

- No dedicated test framework required for this story (design system foundation)
- Verify visually: both themes render correctly with correct colors
- Verify: ThemeProvider switches themes without page reload
- Verify: `prefers-reduced-motion` disables animations
- Verify: fonts load correctly with `display: swap` (no FOIT)

### Theme Color Reference

**Male Theme (Dark Mode):**
| Token | Hex | Usage |
|-------|-----|-------|
| background | #1A1A2E | Page background |
| accent | #F5A623 | Buttons, links, highlights |
| foreground | #FAF3E0 | Body text, headings |
| muted | #2D2D3A | Secondary backgrounds, borders |

**Female Theme (Light Mode):**
| Token | Hex | Usage |
|-------|-----|-------|
| background | #FFF8F0 | Page background |
| accent | #A85C60 | Buttons, links, highlights (WCAG AA compliant) |
| foreground | #2D2D3A | Body text, headings |
| muted | #F5E6D3 | Secondary backgrounds, borders |

[Source: ux-design.md#1.1 — Visual Identity]

### Critical Guardrails

- **DO NOT** use `className="bg-[#1A1A2E]"` hardcoded colors. Use CSS variables: `bg-background`, `text-foreground`, `bg-accent`.
- **DO NOT** create a custom CSS file per theme. Use ONE `globals.css` with `[data-theme="male"]` and `[data-theme="female"]` selectors.
- **DO NOT** use `localStorage` for theme persistence in this story — gender selection persists via consultation flow state (later stories).
- **DO NOT** add page routes beyond `layout.tsx` and a minimal `page.tsx` placeholder — landing page content is Story 1.2.
- **DO NOT** install `@emotion`, `styled-components`, or any CSS-in-JS library.
- **DO** ensure all shadcn/ui components inherit theme via CSS variables automatically.
- **DO** set 48px minimum touch target on all interactive elements (buttons).

### References

- [Source: architecture.md#2.1] — Frontend tech stack
- [Source: architecture.md#6.1] — Project structure
- [Source: architecture.md#6.2] — State management (Zustand for consultation, Context for theme)
- [Source: ux-design.md#1.1] — Visual identity, dual theme colors
- [Source: ux-design.md#1.2] — Typography scale
- [Source: ux-design.md#1.3] — Spacing system (4px base)
- [Source: ux-design.md#1.4] — Border radius tokens
- [Source: ux-design.md#1.5] — Shadow tokens
- [Source: ux-design.md#1.6] — Motion tokens
- [Source: ux-design.md#6] — Accessibility (WCAG 2.1 AA, keyboard nav, contrast)
- [Source: epics-and-stories.md#E1] — Epic 1 context and elicitation insights

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- No blocking issues encountered during implementation.
- shadcn/ui init modified globals.css; required manual merge to preserve dual theme CSS variables.
- Sonner (Toast) component generated with `next-themes` dependency; replaced with custom implementation using our ThemeProvider.

### Completion Notes List

- Initialized Next.js 16.1.6 project with TypeScript, Tailwind CSS v4, App Router, and `src/` directory structure.
- Installed all required dependencies: @tailwindcss/typography, framer-motion, zustand, lucide-react, clsx, tailwind-merge.
- Added Vitest + React Testing Library for TDD (60 tests, all passing).
- Configured dual theme system using CSS custom properties toggled via `data-theme` attribute on `<html>` — fully compatible with Tailwind v4 `@theme inline` directive and shadcn/ui CSS variable conventions.
- Male theme: charcoal #1A1A2E bg, amber #F5A623 accent, cream #FAF3E0 fg, #2D2D3A muted.
- Female theme: warm white #FFF8F0 bg, dusty rose #A85C60 accent (darkened for WCAG AA), charcoal #2D2D3A fg, #F5E6D3 muted.
- ThemeProvider uses React Context (not Zustand) per architecture spec. Exports `useTheme()` hook with `{ gender, setGender, theme }`.
- Typography: Space Grotesk (600, 700) for display/heading, Inter (400, 600) for body/caption. Loaded via `next/font/google` with `display: swap`.
- Base components: Button (primary/secondary/ghost, 48px min-height, 12px radius), Card (16px radius, card shadow), Badge (8px radius), Toast (sonner, 4s auto-dismiss). All theme-aware via CSS variables.
- Motion tokens: micro 200ms easeOut, page 350ms easeInOut, loading 1.5s infinite, results reveal 150ms stagger. `prefers-reduced-motion` respected via CSS and `getReducedMotionTransition()` utility.
- Spacing system: 4px base unit with full scale (4, 8, 12, 16, 24, 32, 48, 64, 96px) defined in `@theme inline`.
- Root layout wraps children with ThemeProvider and Toaster. Font CSS variables applied to `<html>` element.
- Build compiles successfully. ESLint passes with zero errors.

### Senior Developer Review (AI)

**Reviewer:** Claude Opus 4.6 (code-review workflow)
**Date:** 2026-03-01
**Outcome:** Approved (after fixes applied)

**Issues Found:** 2 High, 4 Medium, 2 Low
**Issues Fixed:** 2 High, 3 Medium, 1 Low (6 total)

**Fixes Applied:**
1. [H1-FIXED] Female theme accent color darkened from #C4787A to #A85C60 for WCAG 2.1 AA compliance (contrast ratios: 4.81:1 on white, 4.57:1 on warm white background)
2. [H2-FIXED] Removed unused `next-themes` package from dependencies (not needed, custom ThemeProvider used instead)
3. [M1-FIXED] Button `sm` and `lg` size variants now use `rounded-button` instead of `rounded-md` for consistent design token usage
4. [M2-FIXED] Added test: `useTheme()` throws error when used outside ThemeProvider
5. [M3-FIXED] Added test: neutral theme provides correct default background color (#f5f5f5)
6. [L2-FIXED] Standardized destructive color format to hex (#ef4444) across all themes (was oklch in neutral)

**Accepted (Not Fixed):**
- [M4] `@tailwindcss/typography` installed but not used yet — acceptable per story spec (installed for future stories)
- [L1] Typography config only defines mobile sizes — responsive scaling to be applied via Tailwind responsive classes in page components

**Test Results:** 62 tests passing (up from 60), build succeeds, ESLint clean.

### Change Log

- 2026-03-01: Story 1.1 implementation complete — full design system setup with dual themes, typography, components, motion tokens, and root layout. 60 unit tests added.
- 2026-03-01: Code review fixes — WCAG AA contrast fix (#C4787A -> #A85C60), removed unused next-themes dep, consistent button radius tokens, 2 new tests added (62 total).

### File List

New files:
- src/app/globals.css (rewritten — dual theme CSS variables + Tailwind v4 @theme inline)
- src/app/layout.tsx (root layout with ThemeProvider, fonts, Toaster)
- src/app/page.tsx (minimal placeholder)
- src/components/layout/ThemeProvider.tsx (gender-based theme switching via React Context)
- src/components/ui/button.tsx (shadcn Button — customized with 48px min-height, 12px radius)
- src/components/ui/card.tsx (shadcn Card — customized with 16px radius, card shadow)
- src/components/ui/badge.tsx (shadcn Badge — customized with 8px radius)
- src/components/ui/sonner.tsx (shadcn Sonner/Toast — customized, 4s auto-dismiss)
- src/hooks/useTheme.ts (theme context hook)
- src/lib/motion.ts (Framer Motion transition presets)
- src/lib/theme-config.ts (theme color constants, spacing, radius, shadow tokens)
- src/lib/typography.ts (typography scale configuration)
- src/lib/utils.ts (shadcn cn() utility)
- src/types/index.ts (Gender, ThemeColors, ThemeContextValue types)
- src/test/setup.ts (Vitest + testing-library setup)
- src/test/theme-config.test.ts (16 tests — theme colors, spacing, radius, shadows)
- src/test/theme-provider.test.tsx (9 tests — ThemeProvider context, switching, data-theme, neutral default, error boundary)
- src/test/typography.test.ts (10 tests — typography roles, font mapping)
- src/test/components.test.tsx (14 tests — Button, Card, Badge rendering and customization)
- src/test/motion.test.ts (10 tests — motion transitions, reduced motion)
- src/test/layout.test.tsx (3 tests — layout integration with ThemeProvider)
- vitest.config.ts (Vitest configuration)
- .prettierrc (Prettier configuration)
- components.json (shadcn/ui configuration)
- package.json (project dependencies and scripts)
- package-lock.json (dependency lock file)
- tsconfig.json (TypeScript configuration)
- postcss.config.mjs (PostCSS configuration)
- next.config.ts (Next.js configuration)
- next-env.d.ts (Next.js TypeScript declarations)
- eslint.config.mjs (ESLint configuration)
- .gitignore (git ignore rules)
- public/file.svg, public/globe.svg, public/next.svg, public/vercel.svg, public/window.svg (Next.js default assets)
- src/app/favicon.ico (default favicon)
