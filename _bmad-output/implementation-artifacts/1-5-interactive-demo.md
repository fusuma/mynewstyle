# Story 1.5: Interactive Demo

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a visitor,
I want to see a sample consultation result with an interactive before/after slider,
so that I understand what the platform delivers before uploading my own photo.

## Acceptance Criteria

1. Pre-built consultation result displayed using sample face images (AI-generated, not a real person)
2. Interactive before/after slider that works on both desktop (drag) and mobile (touch)
3. Caption: "Veja como funciona — sem precisar de foto" displayed below or above the demo
4. Demo does not require authentication or photo upload — fully static/self-contained
5. Mobile-optimized touch slider with minimum 48px drag handle, works on 375px screens
6. Section uses existing design system theme (CSS variables, typography, spacing tokens from Story 1.1)
7. Responsive layout: works on mobile (375px) through desktop (1440px)
8. Accessible: slider has `aria-label`, keyboard operable (arrow keys), images have `alt` text
9. Respects `prefers-reduced-motion` for any entrance animations
10. SSR-compatible — images load via Next.js `<Image>` or standard `<img>` with proper optimization
11. Section has `id="interactive-demo"` for anchor navigation
12. Portuguese (pt-BR) for all user-facing text
13. Before image and after image are bundled as static assets in `public/demo/` directory

## Tasks / Subtasks

- [x] Task 1: Create static demo assets (AC: 1, 13)
  - [x] Create `public/demo/` directory
  - [x] Add placeholder `before.jpg` image (sample face, AI-generated, ~800px wide, JPEG)
  - [x] Add placeholder `after.jpg` image (same face with different hairstyle applied, ~800px wide, JPEG)
  - [x] Images must be royalty-free or AI-generated (not real persons)
  - [x] Both images must have identical dimensions for slider to work correctly
  - [x] Target: each image < 200KB for fast loading
- [x] Task 2: Create BeforeAfterSlider component (AC: 2, 5, 8)
  - [x] Create `src/components/landing/BeforeAfterSlider.tsx` as a `'use client'` component
  - [x] Implement horizontal drag slider using mouse events (desktop) and touch events (mobile)
  - [x] Slider divider line with visible drag handle (48px min touch target)
  - [x] Before image on left, after image on right — revealed by dragging the divider
  - [x] Use CSS `clip-path` or `overflow: hidden` with width percentage for reveal effect
  - [x] Slider starts at 50% position by default
  - [x] Handle keyboard navigation: left/right arrow keys move slider in 5% increments
  - [x] Add `role="slider"`, `aria-label="Comparação antes e depois"`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-valuenow` reflecting current position
  - [x] Both images have descriptive `alt` text in Portuguese
  - [x] Prevent default touch scroll when dragging slider (use `touch-action: none` on slider area)
  - [x] Handle window resize to recalculate slider bounds
  - [x] Add `data-testid="before-after-slider"` for testing
- [x] Task 3: Create InteractiveDemoSection component (AC: 1, 3, 6, 7, 9, 11, 12)
  - [x] Create `src/components/landing/InteractiveDemoSection.tsx` as a `'use client'` component
  - [x] Section heading: "Veja o resultado" or similar (font-display, centered)
  - [x] Caption text: "Veja como funciona — sem precisar de foto" (font-body, muted-foreground)
  - [x] Import and render `BeforeAfterSlider` with demo images
  - [x] Use Framer Motion `whileInView` for entrance animation (fade-in + slide-up)
  - [x] Respect `prefers-reduced-motion` via `useReducedMotion` hook
  - [x] Add `id="interactive-demo"` and `data-testid="interactive-demo-section"` to section element
  - [x] Add `aria-labelledby="interactive-demo-heading"` for accessibility
  - [x] Styling: `bg-muted/50` background (alternates with trust section's `bg-background`)
  - [x] Spacing: `py-16 md:py-24` (matches how-it-works weight)
  - [x] Max content width 1200px centered (`max-w-[1200px] mx-auto`)
  - [x] Add `scroll-mt-16` for future fixed header offset
  - [x] Demo image container: max width ~600px centered, rounded corners (16px / `rounded-card`), card shadow
- [x] Task 4: Integrate into landing page (AC: 10)
  - [x] Import `InteractiveDemoSection` in `src/app/page.tsx`
  - [x] Add below `<TrustPrivacySection />` in the main element
  - [x] `page.tsx` MUST remain a Server Component (no `'use client'`)
- [x] Task 5: Write tests (AC: all)
  - [x] Test file: `src/test/interactive-demo-section.test.tsx`
  - [x] Test: Section renders with `id="interactive-demo"` and `data-testid="interactive-demo-section"`
  - [x] Test: Caption text "Veja como funciona" is rendered
  - [x] Test: Before/after slider is present (via `data-testid="before-after-slider"`)
  - [x] Test: Slider has proper `role="slider"` and `aria-label`
  - [x] Test: Before image has `alt` text
  - [x] Test: After image has `alt` text
  - [x] Test: Section heading is rendered
  - [x] Test: Component renders without errors in neutral theme
  - [x] Minimum 8 tests covering all acceptance criteria
  - [x] Run existing test suite to confirm no regressions (expect 97 existing tests to still pass)

## Dev Notes

### Architecture Compliance

- **Page Component:** `src/app/page.tsx` MUST remain a Server Component (no `'use client'` directive). This is critical for SSR and SEO. [Source: architecture.md#2.1, architecture.md#8.1]
- **Client Components:** Both `InteractiveDemoSection` and `BeforeAfterSlider` need `'use client'` because they use event handlers (mouse/touch), `useState`, and Framer Motion. Import them as client components into the Server Component page.
- **Styling:** Use Tailwind CSS utility classes only. Use theme CSS variables (`bg-background`, `text-foreground`, `text-accent`, `bg-card`, `bg-muted`, `rounded-card`, `shadow-card`) -- NEVER hardcode hex colors. [Source: 1-1-design-system-setup.md]
- **Components:** Reuse existing design system patterns. Do NOT create new base UI components in `src/components/ui/`.
- **Icons:** If a drag handle icon is needed, use Lucide React (`GripVertical` or `MoveHorizontal`). Already installed. [Source: architecture.md#2.1, ux-design.md#4.2]
- **Fonts:** Typography already configured in layout.tsx. Use `font-display` for headings, `font-body` for body text. [Source: 1-1-design-system-setup.md]
- **Images:** Use Next.js `<Image>` from `next/image` for demo images to get automatic optimization, lazy loading, and responsive srcset. Static images in `public/` can be imported or referenced by path. [Source: architecture.md#8.2]

### Technical Requirements

- **Slider Implementation:** The before/after slider is a common UI pattern. Do NOT install a third-party slider library. Implement it with native mouse/touch events + CSS clip-path or width-based reveal. Key events to handle:
  - `onMouseDown` / `onTouchStart` on drag handle → begin tracking
  - `onMouseMove` / `onTouchMove` on document → update slider position (percentage)
  - `onMouseUp` / `onTouchEnd` on document → stop tracking
  - `onKeyDown` on slider element → arrow key support
  - Calculate position as percentage of container width: `(clientX - containerLeft) / containerWidth * 100`
  - Clamp value between 0 and 100
- **Touch Behavior:** On mobile, the slider must not conflict with page scroll. Apply `touch-action: pan-y` to the slider container so vertical scroll works, but horizontal drag is captured. Use `e.preventDefault()` only during active drag to prevent horizontal scroll interference.
- **Image Overlay Technique:** Two approaches, both work:
  1. **CSS clip-path** (recommended): Both images stacked absolutely. After image uses `clip-path: inset(0 {100-percentage}% 0 0)` to reveal from left.
  2. **Width-based**: After image container has `width: {percentage}%` with `overflow: hidden`, after image inside has fixed width matching container's full width.
- **Static Assets:** Place demo images in `public/demo/before.jpg` and `public/demo/after.jpg`. For the initial implementation, use placeholder images (solid color blocks with text overlay, or simple gradient images). The product team will provide final AI-generated sample images before launch. Do NOT block implementation on final assets -- use placeholders.
- **Image Dimensions:** Both before and after images MUST have identical dimensions (e.g., 800x1000). The slider relies on images being the same size. Mismatched dimensions will break the overlay alignment.
- **Section Background Alternation:** The landing page sections alternate backgrounds for visual rhythm:
  - Hero: gradient (custom)
  - How It Works: `bg-muted/50`
  - Trust & Privacy: `bg-background`
  - Interactive Demo: `bg-muted/50` (back to muted, alternating)
  - Footer (1.6): `bg-background` or distinct footer style

### Previous Story Intelligence (Story 1.4 -- Trust & Privacy Section)

**What was built:**
- `src/components/landing/TrustPrivacySection.tsx` -- Client component (`'use client'`) with Shield/Users icons, privacy messaging, policy link, social proof
- Uses Framer Motion `whileInView` with `useReducedMotion` for entrance animations
- Section uses `id="trust"`, `data-testid="trust-privacy-section"`, `aria-labelledby="trust-heading"` -- follow same pattern
- Content wrapped in `max-w-[1200px] mx-auto` container
- Background: `bg-background` (contrasts with how-it-works `bg-muted/50`)
- Spacing: `py-12 md:py-16` (lighter section, less padding)
- `scroll-mt-16` for future fixed header offset
- `SOCIAL_PROOF_COUNT` extracted as constant for future dynamic replacement
- 97 total tests passing (62 from 1.1 + 12 from 1.2 + 11 from 1.3 + 12 from 1.4)

**Key learnings from Story 1.4:**
- `page.tsx` is a Server Component -- import client components into it, do NOT add `'use client'` to page.tsx
- Framer Motion `whileInView` requires IntersectionObserver mock in test setup (already in `src/test/setup.ts`)
- Portuguese diacritical marks must be correct (seguranca, funcao, etc.)
- Semantic HTML matters -- use proper `<section>`, `aria-labelledby`, etc.
- Reduced-motion must bypass initial opacity/transform states (set to final state directly when `reduceMotion` is true)
- TrustPrivacySection uses `bg-background`; so InteractiveDemoSection should use `bg-muted/50` for contrast

**Previous story files modified:**
- `src/app/page.tsx` -- will be modified again (add InteractiveDemoSection import)
- `src/components/landing/` -- add new components here

**DO NOT modify:**
- `src/app/layout.tsx` (already correctly set up with ThemeProvider, fonts, Toaster)
- `src/app/globals.css` (scroll-behavior: smooth already added)
- Any files in `src/components/ui/` (design system components are stable)
- `src/components/landing/HeroSection.tsx` (stable, reviewed)
- `src/components/landing/hero-gradient.css` (stable)
- `src/components/landing/HowItWorksSection.tsx` (stable, reviewed)
- `src/components/landing/TrustPrivacySection.tsx` (stable, reviewed)
- `src/test/setup.ts` (IntersectionObserver mock already added)

### Previous Story Intelligence (Story 1.1 -- Design System Setup)

**Reusable assets from Story 1.1:**
- Motion presets: `src/lib/motion.ts` -- use `pageTransition`, `getReducedMotionTransition`
- Typography classes: `font-display` (Space Grotesk headings), `font-body` (Inter body text)
- Theme CSS variables: `text-foreground`, `text-muted-foreground`, `bg-background`, `bg-card`, `bg-muted`, `text-accent`, `bg-accent`, `rounded-card`, `shadow-card`
- Component patterns: Button, Card, Badge, Toast (all theme-aware via CSS variables)

### Library & Framework Requirements

| Library | Version | Notes |
|---------|---------|-------|
| Next.js | 16.1.6 | App Router, `src/` directory, server/client components |
| React | 19.2.3 | Server Components by default, `useState`/`useRef`/`useCallback` for slider |
| Tailwind CSS | v4+ | Theme via CSS variables, utility classes |
| Framer Motion | 12.34.3+ | `whileInView` entrance animation, `useReducedMotion` hook |
| Lucide React | 0.575.0+ | Optional: `GripVertical` or `MoveHorizontal` for drag handle icon |
| next/image | (bundled) | Use `<Image>` for demo images with automatic optimization |

**DO NOT install new dependencies for this story.** Everything needed is already in package.json.

### File Structure Requirements

```
src/
├── app/
│   ├── layout.tsx                        # NO CHANGES
│   ├── page.tsx                          # MODIFY: Add InteractiveDemoSection import + render below TrustPrivacySection
│   └── globals.css                       # NO CHANGES
├── components/
│   ├── landing/
│   │   ├── HeroSection.tsx               # NO CHANGES
│   │   ├── hero-gradient.css             # NO CHANGES
│   │   ├── HowItWorksSection.tsx         # NO CHANGES
│   │   ├── TrustPrivacySection.tsx       # NO CHANGES
│   │   ├── BeforeAfterSlider.tsx         # NEW: Reusable before/after comparison slider
│   │   └── InteractiveDemoSection.tsx    # NEW: Landing page interactive demo section
│   └── ui/
│       └── (no changes)
├── lib/
│   └── motion.ts                         # REUSE: Motion presets (no changes)
└── test/
    └── interactive-demo-section.test.tsx  # NEW: Tests for InteractiveDemoSection + BeforeAfterSlider
public/
└── demo/
    ├── before.jpg                        # NEW: Sample face (before) -- placeholder OK
    └── after.jpg                         # NEW: Sample face (after) -- placeholder OK
```

[Source: architecture.md#6.1 -- Project Structure, components/landing/ directory]

### Project Structure Notes

- `src/components/landing/` already exists with HeroSection.tsx, HowItWorksSection.tsx, TrustPrivacySection.tsx
- `BeforeAfterSlider` is a separate component because it will be reused in the Results Page (Story 6.x) for actual consultation preview comparison. Build it as a generic, reusable component that accepts `beforeSrc`, `afterSrc`, `beforeAlt`, `afterAlt` props.
- `InteractiveDemoSection` wraps the slider with landing-page-specific context (heading, caption, styling)
- The landing page composition order in `page.tsx`: Hero (1.2) -> How It Works (1.3) -> Trust & Privacy (1.4) -> Interactive Demo (1.5) -> Footer (1.6)
- Follow the established pattern: section component in `landing/`, test in `test/`

### Testing Requirements

- Use existing Vitest + React Testing Library setup (already configured in Story 1.1)
- Test file location: `src/test/interactive-demo-section.test.tsx`
- IntersectionObserver mock already in `src/test/setup.ts` (added in Story 1.3) -- no additional test setup needed
- For slider interaction tests: use `fireEvent.mouseDown`, `fireEvent.mouseMove`, `fireEvent.mouseUp` from Testing Library or simulate touch events
- Test that the component renders caption text, heading, slider, and images
- Test accessibility attributes: `role="slider"`, `aria-label`, `alt` on images
- Test section has `id="interactive-demo"` and `data-testid="interactive-demo-section"`
- Test that component renders in neutral theme without errors
- Minimum 8 tests covering all acceptance criteria
- Run existing test suite to ensure no regressions (expect 97 existing tests to still pass)

### Content Reference (Portuguese)

| Element | Text |
|---------|------|
| Section heading | Veja o resultado |
| Caption | Veja como funciona — sem precisar de foto |
| Before image alt | Rosto com estilo original |
| After image alt | Rosto com novo corte de cabelo recomendado |
| Slider aria-label | Comparacao antes e depois |

[Source: ux-design.md#3.1 -- Landing Page "Interactive Demo Section", epics-and-stories.md#S1.5]

### UX Design Specifications

- **Purpose:** Let visitors experience the product value without commitment. This section answers "What will I actually get?" by showing a real (sample) consultation result. [Source: ux-design.md#3.1, epics-and-stories.md#E1 SCAMPER]
- **Layout:** Centered demo area. The slider is the visual focal point. Heading above, caption below (or vice versa).
- **Before/After Slider Spec:** Interactive slider (drag left/right). Before image on left, after image revealed on right. Visible drag handle divider line. [Source: ux-design.md#3.7 -- "Before/after comparison: interactive slider (drag left/right)"]
- **Mobile:** On small screens (< 768px), the slider should fill container width minus padding. Drag handle must be 48px minimum touch target. Alternative for very small screens: if slider is impractical, offer toggle buttons "Original" / "Novo Estilo" with crossfade. [Source: ux-design.md Section "Mobile UX" Red Team]
- **Visual Style:** Demo image container should have `rounded-card` (16px) border radius and `shadow-card` to make it feel like a product card. [Source: ux-design.md#1.4, 1.5]
- **Motion:** Entrance animation: fade-in + slide-up when section scrolls into view. Stagger heading, then slider. [Source: ux-design.md#1.6]
- **Drag Handle:** Thin vertical line (2px, accent color) with a circular handle at center. Handle should have a subtle shadow and be clearly visible against both dark and light images.
- **Labels:** Optional "Antes" / "Depois" labels on respective sides of the slider for clarity.

### Critical Guardrails

- **DO NOT** add `'use client'` to `src/app/page.tsx`. The page must remain a Server Component.
- **DO NOT** hardcode hex colors. Use theme variables: `bg-background`, `text-foreground`, `bg-accent`, `text-accent`, `bg-card`, `bg-muted`, `bg-muted/50`.
- **DO NOT** install new npm packages. No third-party slider library. Build with native events.
- **DO NOT** modify `src/app/layout.tsx`, `src/app/globals.css`, or any `src/components/ui/` files.
- **DO NOT** modify any existing `src/components/landing/` files (HeroSection, HowItWorksSection, TrustPrivacySection).
- **DO NOT** modify `src/test/setup.ts`.
- **DO NOT** use real person photos for demo images. Use AI-generated or solid placeholder images.
- **DO NOT** implement the full Results Page or real AI functionality. This is a static demo with sample images only.
- **DO** build `BeforeAfterSlider` as a reusable component (accepts image sources and alt text as props) for reuse in Story 6.x (Results Page).
- **DO** use Next.js `<Image>` from `next/image` for demo images.
- **DO** add `id="interactive-demo"` and `data-testid="interactive-demo-section"` to the section.
- **DO** ensure keyboard accessibility on the slider (arrow keys).
- **DO** handle touch events properly without breaking page scroll.
- **DO** use Portuguese (pt-BR) for all user-facing text.
- **DO** run existing test suite (97 tests) plus new tests to confirm no regressions.
- **DO** use placeholder images (gradient or solid color blocks with text) if real AI-generated samples are not available. The component should work correctly regardless of image content.

### Git Intelligence

Recent commit patterns:
- `feat(epic-1): implement story 1-4-trust-and-privacy-section` -- follow same commit message format
- `feat(epic-1): implement story 1-3-how-it-works-section`
- `feat(epic-1): implement story 1-2-landing-page-hero-section`
- `feat(epic-1): implement story 1-1-design-system-setup`
- Stories are implemented as single commits with descriptive messages
- All stories have been reviewed via code-review workflow before marking done

Suggested commit message: `feat(epic-1): implement story 1-5-interactive-demo`

### Performance Targets

- Lighthouse Performance: >= 90 (maintained from previous stories)
- Demo images should be optimized (< 200KB each, JPEG format, served via Next.js Image)
- Slider should be smooth at 60fps -- use CSS transforms/clip-path, not layout-triggering properties
- Use `will-change: clip-path` or `will-change: transform` on animated element for GPU acceleration
- No layout shifts during slider interaction (images have explicit width/height)
- Minimal client-side JavaScript: event handlers + state for slider position only

### References

- [Source: architecture.md#2.1] -- Frontend tech stack (Next.js, Tailwind, Framer Motion, Lucide)
- [Source: architecture.md#6.1] -- Project structure (`src/components/landing/`)
- [Source: architecture.md#8.1] -- Loading strategy (SSR landing for SEO, client-side SPA for consultation)
- [Source: architecture.md#8.2] -- Image optimization (Next.js Image, responsive srcset)
- [Source: ux-design.md#1.1] -- Visual identity (premium modern, dual theme)
- [Source: ux-design.md#1.2] -- Typography scale
- [Source: ux-design.md#1.3] -- Spacing system (4px base)
- [Source: ux-design.md#1.4] -- Border radius tokens (16px for cards)
- [Source: ux-design.md#1.5] -- Shadow tokens (card shadow)
- [Source: ux-design.md#1.6] -- Motion tokens (350ms page transition, 150ms stagger)
- [Source: ux-design.md#3.1] -- Landing page Interactive Demo section spec
- [Source: ux-design.md#3.7] -- AI Preview Before/After slider spec (reusable pattern)
- [Source: ux-design.md#5] -- Responsive breakpoints (375px primary, 1024px desktop, 1440px max)
- [Source: ux-design.md#6] -- Accessibility (WCAG 2.1 AA, keyboard nav, aria-labels)
- [Source: ux-design.md#8.1] -- Micro-interactions (before/after slider: smooth drag, center snap)
- [Source: prd.md#FR32] -- Landing page communicates value proposition
- [Source: prd.md#NFR1] -- Landing page loads < 2s on 4G (Lighthouse >= 90)
- [Source: prd.md#NFR15] -- WCAG 2.1 AA compliance
- [Source: epics-and-stories.md#E1] -- Epic 1 context, SCAMPER elicitation ("Replace landing page with interactive demo")
- [Source: epics-and-stories.md#S1.5] -- Story 1.5 acceptance criteria
- [Source: 1-1-design-system-setup.md] -- Design system, theme config, motion tokens
- [Source: 1-4-trust-and-privacy-section.md] -- Previous story patterns, test count, page.tsx composition

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

None -- clean implementation with no debugging issues.

### Completion Notes List

- All 13 acceptance criteria met
- 20 tests total (117 total, up from 97)
- TDD approach: tests written first, then implementation
- Placeholder images generated (800x1000 JPEG, ~11KB each, well under 200KB target)
- BeforeAfterSlider built as reusable component with props for future Story 6.x reuse
- CSS clip-path technique used for image reveal (GPU-accelerated)
- Keyboard navigation: arrow keys move slider in 5% increments
- Full ARIA support: role="slider", aria-label, aria-valuemin/max/now
- Touch-friendly: 48px drag handle, touch-action: pan-y for scroll compatibility
- Framer Motion entrance animation with prefers-reduced-motion support
- page.tsx remains a Server Component (no 'use client')
- All Portuguese (pt-BR) text with correct diacriticals
- Design system tokens used throughout (no hardcoded colors)

### File List

- `public/demo/before.jpg` -- NEW: Placeholder before image (800x1000 JPEG)
- `public/demo/after.jpg` -- NEW: Placeholder after image (800x1000 JPEG)
- `src/components/landing/BeforeAfterSlider.tsx` -- NEW: Reusable before/after comparison slider component
- `src/components/landing/InteractiveDemoSection.tsx` -- NEW: Landing page interactive demo section
- `src/app/page.tsx` -- MODIFIED: Added InteractiveDemoSection import and render
- `src/test/interactive-demo-section.test.tsx` -- NEW: 20 tests for InteractiveDemoSection + BeforeAfterSlider
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- MODIFIED: 1-5-interactive-demo status to done
- `_bmad-output/implementation-artifacts/1-5-interactive-demo.md` -- MODIFIED: Status to done, dev agent record

### Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-01 | Initial implementation: all ACs met, 18 tests | Dev Agent (Claude Opus 4.6) |
| 2026-03-01 | Code review: fixed 5 issues, added 2 tests (20 total, 117 suite) | Code Review (Claude Opus 4.6) |

### Senior Developer Review (AI)

**Reviewer:** Fusuma
**Date:** 2026-03-01
**Outcome:** Approved (after fixes applied)

**Issues Found & Fixed (5):**

1. **[HIGH] Story tasks all marked [ ] but work was done** -- All task checkboxes updated to [x] to accurately reflect completed work.
2. **[MEDIUM] Inconsistent design token usage** -- `BeforeAfterSlider.tsx` used raw CSS var references (`rounded-[var(--radius-card,16px)]`, `shadow-[var(--shadow-card,...)]`) instead of established Tailwind utilities `rounded-card` and `shadow-card`. Fixed to match codebase pattern.
3. **[MEDIUM] Container missing cursor affordance** -- Slider container had no cursor styling to indicate draggability. Added `cursor-col-resize` to container div.
4. **[MEDIUM] No document-level UX during drag** -- During active drag, text outside slider could be selected and cursor reverted to default. Added `document.body.style.userSelect = "none"` and `document.body.style.cursor = "col-resize"` during drag, cleaned up on release.
5. **[MEDIUM] No mouse drag interaction tests** -- Only keyboard navigation was tested. Added mouse drag test (`mouseDown` -> `mouseMove` -> `mouseUp` with position verification) and cursor affordance class test.

**Low Issues (noted, not blocking):**
- Window resize task unchecked but handled implicitly via percentage-based positioning
- No test for `scroll-mt-16` class (cosmetic coverage gap)

**Test Results:** 117 tests passing (97 existing + 20 new), 0 regressions.
