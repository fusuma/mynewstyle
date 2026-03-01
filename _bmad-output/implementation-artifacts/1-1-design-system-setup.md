# Story 1.1: Design System Setup

Status: ready-for-dev

## Story

As a developer,
I want to set up the dual theme system (dark male / warm light female) with Tailwind + shadcn/ui,
so that all components adapt to gender selection and subsequent stories have a consistent design foundation.

## Acceptance Criteria

1. Tailwind config with male theme colors (charcoal #1A1A2E, amber #F5A623, cream #FAF3E0)
2. Tailwind config with female theme colors (warm white #FFF8F0, dusty rose #C4787A, charcoal #2D2D3A)
3. ThemeProvider component switches theme based on gender context
4. Typography scale configured: Space Grotesk (display/heading), Inter (body/caption)
5. Base component library: Button (primary/secondary/ghost), Card, Badge, Toast
6. Spacing system: 4px base unit with scale (4, 8, 12, 16, 24, 32, 48, 64, 96px)
7. Motion tokens defined: 200ms micro, 350ms page, 1.5s loading loop

## Tasks / Subtasks

- [ ] Task 1: Initialize Next.js project with App Router (AC: all)
  - [ ] Create Next.js 14+ project with TypeScript, Tailwind CSS, App Router
  - [ ] Install dependencies: `tailwindcss`, `@tailwindcss/typography`, `framer-motion`, `zustand`, `lucide-react`
  - [ ] Configure `next/font` for Space Grotesk and Inter with `display: swap`
  - [ ] Set up ESLint + Prettier with project conventions
- [ ] Task 2: Configure dual theme system in Tailwind (AC: 1, 2, 6)
  - [ ] Extend `tailwind.config.ts` with CSS custom properties for male theme
  - [ ] Extend `tailwind.config.ts` with CSS custom properties for female theme
  - [ ] Define spacing scale (4px base unit) in Tailwind config
  - [ ] Define border radius tokens: cards 16px, buttons 12px, badges 8px
  - [ ] Define shadow tokens: card, elevated, preview-image
- [ ] Task 3: Build ThemeProvider component (AC: 3)
  - [ ] Create `src/components/layout/ThemeProvider.tsx` using React Context
  - [ ] ThemeProvider toggles `data-theme="male"` / `data-theme="female"` on root element
  - [ ] CSS variables switch based on `data-theme` attribute
  - [ ] Export `useTheme()` hook returning `{ gender, setGender, theme }`
  - [ ] Default theme: neutral (before gender selection)
- [ ] Task 4: Configure typography (AC: 4)
  - [ ] Set up Space Grotesk via `next/font/google` (weights: 600, 700)
  - [ ] Set up Inter via `next/font/google` (weights: 400, 600)
  - [ ] Map typography roles to Tailwind classes: display (32/48px), heading (24/32px), subheading (18/22px), body (16px), caption (13/14px), badge (12px)
- [ ] Task 5: Build base component library with shadcn/ui (AC: 5)
  - [ ] Initialize shadcn/ui with `npx shadcn-ui@latest init`
  - [ ] Add and customize Button component (primary, secondary, ghost variants) — 48px min height mobile, 12px radius
  - [ ] Add and customize Card component — 16px radius, card shadow
  - [ ] Add and customize Badge component — 8px radius, theme-aware colors
  - [ ] Add and customize Toast component (sonner) — auto-dismiss 4s
  - [ ] All components theme-aware (adapt to male/female via CSS variables)
- [ ] Task 6: Define motion tokens (AC: 7)
  - [ ] Create `src/lib/motion.ts` with Framer Motion transition presets
  - [ ] Micro: `{ duration: 0.2, ease: 'easeOut' }`
  - [ ] Page: `{ duration: 0.35, ease: 'easeInOut' }`
  - [ ] Loading: `{ duration: 1.5, repeat: Infinity }`
  - [ ] Results reveal: `{ staggerChildren: 0.15 }` (150ms per element)
  - [ ] Respect `prefers-reduced-motion` — disable animations when set
- [ ] Task 7: Create root layout with providers (AC: 3)
  - [ ] Set up `src/app/layout.tsx` with ThemeProvider wrapping children
  - [ ] Apply font variables to html element
  - [ ] Add basic metadata for SEO

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
| accent | #C4787A | Buttons, links, highlights |
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

(To be filled by dev agent)

### Debug Log References

### Completion Notes List

### Change Log

### File List
