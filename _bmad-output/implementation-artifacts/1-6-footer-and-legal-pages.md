# Story 1.6: Footer & Legal Pages

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a visitor,
I want access to a site footer with navigation links and dedicated privacy policy and terms of service pages,
so that I can understand how my data is handled and feel confident using the platform.

## Acceptance Criteria

1. Footer component rendered at the bottom of the landing page with links: Privacidade, Termos, Contato
2. /privacidade page with LGPD-compliant privacy policy covering biometric data processing, photo storage, data retention, and user rights
3. /termos page with terms of service including AI recommendation disclaimer ("entertainment/inspiration" framing for legal protection)
4. "Entertainment/inspiration" framing explicitly stated in terms: AI recommendations are artistic suggestions, not professional advice
5. Footer uses existing design system theme (CSS variables, typography, spacing tokens from Story 1.1)
6. Responsive layout: footer works on mobile (375px) through desktop (1440px)
7. Footer has `id="footer"` for anchor navigation and `data-testid="footer-section"`
8. Portuguese (pt-BR) for all user-facing text with correct diacritical marks
9. SSR-compatible -- legal pages are Server Components for SEO indexing
10. Footer respects `prefers-reduced-motion` for any entrance animations
11. Accessible: all links have proper focus states, legal page content uses semantic HTML headings
12. Legal pages have appropriate `<title>` and `<meta description>` for SEO
13. Legal pages render static content (no client-side JavaScript required)

## Tasks / Subtasks

- [x] Task 1: Create Footer component (AC: 1, 5, 6, 7, 8, 10, 11)
  - [x] Create `src/components/layout/Footer.tsx` as a Server Component (no `'use client'`)
  - [x] Include links: "Privacidade" (`/privacidade`), "Termos" (`/termos`), "Contato" (mailto or anchor)
  - [x] Add copyright line: "(c) 2026 MyNewStyle. Todos os direitos reservados."
  - [x] Add `id="footer"` and `data-testid="footer-section"` to footer element
  - [x] Use semantic `<footer>` HTML element with `role="contentinfo"`
  - [x] Use design system tokens: `bg-muted`, `text-muted-foreground`, `font-body`
  - [x] Links styled with `text-foreground hover:text-accent` with underline on focus/hover
  - [x] Responsive: horizontal link row on desktop, stacked or wrapped on mobile
  - [x] Spacing: `py-8 md:py-12` padding, `max-w-[1200px] mx-auto` centered content
  - [x] Add `scroll-mt-16` for future fixed header offset
- [x] Task 2: Create /privacidade page (AC: 2, 8, 9, 11, 12, 13)
  - [x] Create `src/app/privacidade/page.tsx` as a Server Component
  - [x] Export metadata with `title` and `description` for SEO
  - [x] LGPD-compliant privacy policy content in Portuguese covering:
    - Data controller identification (MyNewStyle)
    - What data is collected (photos, questionnaire responses, usage data)
    - Purpose of data processing (visagism consultation via AI)
    - Biometric data consent (facial analysis = biometric processing under LGPD)
    - Data retention policy (photos deleted after 90 days inactive)
    - User rights: access, correction, deletion, portability
    - How to exercise rights (email contact)
    - Third-party data sharing (AI providers for processing only)
    - Cookie policy
    - Policy update notification mechanism
  - [x] Use semantic HTML: `<article>`, `<h1>`, `<h2>`, `<h3>`, `<p>`, `<ul>`, `<li>`
  - [x] Style with design system tokens: `prose` typography or manual heading/body styles
  - [x] Max content width 800px centered for readability
  - [x] "Back to home" link at bottom
- [x] Task 3: Create /termos page (AC: 3, 4, 8, 9, 11, 12, 13)
  - [x] Create `src/app/termos/page.tsx` as a Server Component
  - [x] Export metadata with `title` and `description` for SEO
  - [x] Terms of service content in Portuguese covering:
    - Service description (AI-powered visagism consultation)
    - AI disclaimer: recommendations are "sugestoes artisticas e de entretenimento" (artistic/entertainment suggestions), NOT professional advice
    - Limitation of liability (AI results are inspirational, not guaranteed)
    - User responsibilities (own photo, accurate information)
    - Payment terms (pay-per-consultation model)
    - Refund policy (auto-refund if AI processing fails)
    - Intellectual property (AI-generated images belong to user for personal use)
    - Account termination conditions
    - Governing law (Brazilian law, LGPD compliance)
    - Contact information
  - [x] Same styling approach as /privacidade (consistent legal page layout)
  - [x] "Back to home" link at bottom
- [x] Task 4: Integrate Footer into landing page (AC: 1)
  - [x] Import `Footer` in `src/app/page.tsx`
  - [x] Add `<Footer />` below `<InteractiveDemoSection />` but outside `<main>` (semantic HTML: footer is not part of main content)
  - [x] `page.tsx` MUST remain a Server Component (no `'use client'`)
- [x] Task 5: Write tests (AC: all)
  - [x] Test file: `src/test/footer-and-legal.test.tsx`
  - [x] Footer tests:
    - [x] Footer renders with `id="footer"` and `data-testid="footer-section"`
    - [x] Footer contains link to "/privacidade"
    - [x] Footer contains link to "/termos"
    - [x] Footer contains "Contato" link or text
    - [x] Footer contains copyright text
    - [x] Footer uses semantic `<footer>` element
    - [x] All links have accessible names
  - [x] Privacy page tests:
    - [x] Page renders with heading "Politica de Privacidade"
    - [x] Page contains LGPD-related content (e.g., "dados biometricos", "direito a exclusao")
    - [x] Page contains data retention information
    - [x] Page uses semantic heading hierarchy (h1 > h2 > h3)
  - [x] Terms page tests:
    - [x] Page renders with heading "Termos de Servico" or "Termos de Uso"
    - [x] Page contains AI disclaimer text ("entretenimento", "sugestoes artisticas")
    - [x] Page contains refund policy information
    - [x] Page uses semantic heading hierarchy
  - [x] Run existing test suite to confirm no regressions (expect 117 existing tests to still pass)

## Dev Notes

### Architecture Compliance

- **Page Components:** `src/app/page.tsx`, `src/app/privacidade/page.tsx`, and `src/app/termos/page.tsx` MUST be Server Components (no `'use client'` directive). This is critical for SSR and SEO. [Source: architecture.md#2.1, architecture.md#8.1]
- **Footer Component:** `src/components/layout/Footer.tsx` should be a Server Component. It contains only static links and text -- no interactivity, no state, no event handlers needed. If Framer Motion entrance animation is desired, it can be a client component, but prefer server for simplicity and performance. [Source: architecture.md#6.1]
- **Styling:** Use Tailwind CSS utility classes only. Use theme CSS variables (`bg-background`, `text-foreground`, `text-accent`, `bg-muted`, `text-muted-foreground`, `rounded-card`) -- NEVER hardcode hex colors. [Source: 1-1-design-system-setup.md]
- **Components:** Footer goes in `src/components/layout/` (not `landing/`). Architecture specifies `Footer.tsx` in `components/layout/`. [Source: architecture.md#6.1]
- **Icons:** If icons are needed in footer, use Lucide React. Already installed. [Source: architecture.md#2.1]
- **Fonts:** Typography already configured in layout.tsx. Use `font-display` for headings, `font-body` for body text. [Source: 1-1-design-system-setup.md]
- **Legal Pages:** Architecture defines routes at `/privacidade` and `/termos`. These are standard Next.js App Router page routes. [Source: architecture.md#6.1, ux-design.md#2.1]

### Technical Requirements

- **Footer Layout:** Simple footer with navigation links. No complex interactivity. Use CSS Grid or Flexbox for link layout. On desktop: single row of links + copyright. On mobile: centered, wrapped links.
- **Legal Page Layout:** Long-form text content pages. Use `@tailwindcss/typography` plugin (already installed in package.json) for prose styling if available, OR manually style with heading/body classes. The key requirement is readability: max-width 800px, comfortable line height, clear heading hierarchy.
- **Legal Content Language:** All content MUST be in Portuguese (pt-BR) with correct diacritical marks (acentos). Examples: "politica de privacidade", "dados pessoais", "consentimento", "exclusao".
- **LGPD Compliance:** The privacy policy must specifically address biometric data processing because facial analysis constitutes biometric processing under Brazil's LGPD (Lei Geral de Protecao de Dados). Key requirements:
  - Explicit mention of biometric data collection and processing purpose
  - Legal basis for processing (consent)
  - Data retention periods (photos: 90 days inactive)
  - User rights (access, correction, deletion, portability)
  - Third-party disclosure (AI providers: Google Gemini, OpenAI as fallback)
  - Contact mechanism for exercising rights
  [Source: architecture.md#7.2, prd.md#Security, epics-and-stories.md#E11]
- **AI Disclaimer:** Terms must include explicit "entertainment/inspiration" framing. AI recommendations are NOT professional advice. This is critical for legal protection. The specific text should frame recommendations as "sugestoes artisticas para inspiracao" (artistic suggestions for inspiration). [Source: epics-and-stories.md#S1.6]
- **Section Background Alternation:** The landing page sections alternate backgrounds:
  - Hero: gradient (custom)
  - How It Works: `bg-muted/50`
  - Trust & Privacy: `bg-background`
  - Interactive Demo: `bg-muted/50`
  - Footer: `bg-muted` or `bg-card` (distinct footer style, slightly darker/different from sections)
  [Source: 1-5-interactive-demo.md]
- **Semantic HTML:** Footer uses `<footer>` with `role="contentinfo"`. Legal pages use `<article>` with proper heading hierarchy (`<h1>` for page title, `<h2>` for sections, `<h3>` for subsections). This supports screen readers and SEO. [Source: ux-design.md#6]

### Previous Story Intelligence (Story 1.5 -- Interactive Demo)

**What was built:**
- `src/components/landing/BeforeAfterSlider.tsx` -- reusable slider component
- `src/components/landing/InteractiveDemoSection.tsx` -- client component with Framer Motion
- 117 total tests passing (62 from 1.1 + 12 from 1.2 + 11 from 1.3 + 12 from 1.4 + 20 from 1.5)

**Key learnings from Story 1.5:**
- `page.tsx` is a Server Component -- import client components into it, do NOT add `'use client'` to page.tsx
- The `<main>` element wraps all landing page sections. Footer should be OUTSIDE `<main>` (semantic HTML: `<footer>` is a sibling of `<main>`, not a child)
- Current page composition: Hero -> How It Works -> Trust & Privacy -> Interactive Demo -> [Footer goes here]
- Portuguese diacritical marks must be correct
- Section background alternation pattern: muted/50, background, muted/50, background...
- 117 tests currently passing -- all must continue to pass

**Previous story files modified:**
- `src/app/page.tsx` -- will be modified again (add Footer import + render)

**DO NOT modify:**
- `src/app/layout.tsx` (already correctly set up with ThemeProvider, fonts, Toaster)
- `src/app/globals.css` (design system tokens are stable)
- Any files in `src/components/ui/` (design system components are stable)
- `src/components/landing/HeroSection.tsx` (stable, reviewed)
- `src/components/landing/hero-gradient.css` (stable)
- `src/components/landing/HowItWorksSection.tsx` (stable, reviewed)
- `src/components/landing/TrustPrivacySection.tsx` (stable, reviewed)
- `src/components/landing/BeforeAfterSlider.tsx` (stable, reviewed)
- `src/components/landing/InteractiveDemoSection.tsx` (stable, reviewed)
- `src/components/layout/ThemeProvider.tsx` (stable)
- `src/test/setup.ts` (test setup is stable)
- `src/lib/motion.ts` (motion presets are stable)

### Previous Story Intelligence (Story 1.1 -- Design System Setup)

**Reusable assets from Story 1.1:**
- Typography classes: `font-display` (Space Grotesk headings), `font-body` (Inter body text)
- Theme CSS variables: `text-foreground`, `text-muted-foreground`, `bg-background`, `bg-card`, `bg-muted`, `text-accent`, `bg-accent`, `rounded-card`, `shadow-card`
- Component patterns: Button, Card, Badge, Toast (all theme-aware via CSS variables)
- `@tailwindcss/typography` is installed -- `prose` class may be available for legal page content

### Library & Framework Requirements

| Library | Version | Notes |
|---------|---------|-------|
| Next.js | 16.1.6 | App Router, `src/` directory, server/client components |
| React | 19.2.3 | Server Components by default for all pages |
| Tailwind CSS | v4+ | Theme via CSS variables, utility classes |
| @tailwindcss/typography | 0.5.19 | `prose` class for legal page long-form content |
| Lucide React | 0.575.0+ | Optional: footer icons if needed |
| Framer Motion | 12.34.3+ | Optional: footer entrance animation (prefer server component without it) |

**DO NOT install new dependencies for this story.** Everything needed is already in package.json.

### File Structure Requirements

```
src/
├── app/
│   ├── layout.tsx                        # NO CHANGES
│   ├── page.tsx                          # MODIFY: Add Footer import + render outside <main>
│   ├── globals.css                       # NO CHANGES
│   ├── privacidade/
│   │   └── page.tsx                      # NEW: Privacy policy page (Server Component)
│   └── termos/
│       └── page.tsx                      # NEW: Terms of service page (Server Component)
├── components/
│   ├── landing/
│   │   └── (no changes)
│   ├── layout/
│   │   ├── ThemeProvider.tsx             # NO CHANGES
│   │   └── Footer.tsx                   # NEW: Site footer component
│   └── ui/
│       └── (no changes)
├── lib/
│   └── motion.ts                         # NO CHANGES (optional import if footer uses animation)
└── test/
    └── footer-and-legal.test.tsx         # NEW: Tests for Footer, /privacidade, /termos
```

[Source: architecture.md#6.1 -- Project Structure, components/layout/ directory]

### Project Structure Notes

- `src/components/layout/` already exists with `ThemeProvider.tsx`. Footer goes here per architecture spec.
- Legal pages at `src/app/privacidade/page.tsx` and `src/app/termos/page.tsx` follow Next.js App Router conventions.
- The architecture specifies these exact routes: `/privacidade` and `/termos`. [Source: architecture.md#6.1]
- Trust & Privacy section (Story 1.4) already links to `/privacidade`. The Footer adds a second navigation path to this page.
- The landing page composition order in `page.tsx`: Hero (1.2) -> How It Works (1.3) -> Trust & Privacy (1.4) -> Interactive Demo (1.5) -> Footer (1.6, outside `<main>`)
- Follow the established pattern: layout components in `layout/`, tests in `test/`

### Testing Requirements

- Use existing Vitest + React Testing Library setup (already configured in Story 1.1)
- Test file location: `src/test/footer-and-legal.test.tsx`
- IntersectionObserver mock already in `src/test/setup.ts` -- no additional test setup needed
- Footer tests: render testing, link presence, semantic HTML, accessibility attributes
- Legal page tests: render testing, content presence, heading hierarchy
- Minimum 15 tests covering all acceptance criteria across Footer + both legal pages
- Run existing test suite to ensure no regressions (expect 117 existing tests to still pass)

### Content Reference (Portuguese)

**Footer:**
| Element | Text |
|---------|------|
| Privacy link | Privacidade |
| Terms link | Termos de Uso |
| Contact link | Contato |
| Copyright | (c) 2026 MyNewStyle. Todos os direitos reservados. |

**Privacy Policy Page (/privacidade):**
| Element | Text |
|---------|------|
| Page title | Politica de Privacidade |
| Meta description | Politica de privacidade do MyNewStyle. Saiba como coletamos, usamos e protegemos os seus dados pessoais. |
| Biometric section | Dados biometricos |
| User rights section | Seus direitos |
| Retention section | Retencao de dados |

**Terms of Service Page (/termos):**
| Element | Text |
|---------|------|
| Page title | Termos de Uso |
| Meta description | Termos de uso do MyNewStyle. Entenda as condicoes de uso da nossa plataforma de consultoria de visagismo com IA. |
| AI disclaimer | As recomendacoes fornecidas pelo MyNewStyle sao sugestoes artisticas para inspiracao e entretenimento. Nao constituem aconselhamento profissional de visagismo, estetica ou saude. |
| Refund section | Politica de reembolso |

[Source: ux-design.md#3.1 -- Landing Page Footer, epics-and-stories.md#S1.6, architecture.md#7.2]

### UX Design Specifications

- **Footer Purpose:** Provide navigation to legal pages and contact. The UX spec calls for "Links to privacy policy, terms, social media." Social media links can be placeholder/omitted for MVP. [Source: ux-design.md#3.1]
- **Footer Visual:** Should be visually distinct from content sections. Use `bg-muted` background to create separation. Minimalist design -- not cluttered. Text in `text-muted-foreground` for links, `text-foreground` on hover.
- **Legal Pages Purpose:** Build trust and comply with LGPD. Users arriving from Trust & Privacy section (Story 1.4) click "Politica de privacidade" link and land on `/privacidade`. The page must validate the privacy promises made on the landing page.
- **Legal Pages Visual:** Clean, readable, professional. Not styled as marketing pages -- these are reference documents. Use appropriate typography hierarchy for scannability.

### Critical Guardrails

- **DO NOT** add `'use client'` to `src/app/page.tsx`, `src/app/privacidade/page.tsx`, or `src/app/termos/page.tsx`. These pages must remain Server Components.
- **DO NOT** hardcode hex colors. Use theme variables: `bg-background`, `text-foreground`, `bg-muted`, `text-muted-foreground`, `text-accent`.
- **DO NOT** install new npm packages.
- **DO NOT** modify `src/app/layout.tsx`, `src/app/globals.css`, or any `src/components/ui/` files.
- **DO NOT** modify any existing `src/components/landing/` files.
- **DO NOT** modify `src/components/layout/ThemeProvider.tsx`.
- **DO NOT** modify `src/test/setup.ts`.
- **DO NOT** use real legal text copied from another site. Write original content appropriate for the platform.
- **DO NOT** make Footer a client component unless absolutely necessary for animation. Prefer Server Component for performance.
- **DO** place Footer in `src/components/layout/Footer.tsx` (not `landing/`).
- **DO** render Footer OUTSIDE `<main>` in page.tsx (semantic HTML: footer is not main content).
- **DO** use `@tailwindcss/typography` prose class if available for legal page styling.
- **DO** add proper metadata exports to both legal pages for SEO.
- **DO** include the AI disclaimer in terms with "entertainment/inspiration" framing.
- **DO** address LGPD biometric data requirements in the privacy policy.
- **DO** use Portuguese (pt-BR) for all user-facing text with correct diacritical marks.
- **DO** run existing test suite (117 tests) plus new tests to confirm no regressions.
- **DO** use semantic HTML (`<footer>`, `<article>`, `<nav>`, proper heading hierarchy).
- **DO** ensure all links have visible focus states for keyboard navigation.

### Git Intelligence

Recent commit patterns:
- `feat(epic-1): implement story 1-5-interactive-demo` -- follow same commit message format
- `feat(epic-1): implement story 1-4-trust-and-privacy-section`
- `feat(epic-1): implement story 1-3-how-it-works-section`
- `feat(epic-1): implement story 1-2-landing-page-hero-section`
- `feat(epic-1): implement story 1-1-design-system-setup`
- Stories are implemented as single commits with descriptive messages
- All stories have been reviewed via code-review workflow before marking done

Suggested commit message: `feat(epic-1): implement story 1-6-footer-and-legal-pages`

### Performance Targets

- Lighthouse Performance: >= 90 (maintained from previous stories)
- Legal pages are static Server Components -- near-zero client JS, fast TTFB
- Footer is a Server Component -- no client-side hydration overhead
- Legal page content is pure HTML text -- no images or heavy assets to load
- Legal pages should be cacheable at the edge (Vercel Edge Cache, 1 hour TTL)

### Cross-Story Dependencies

- **Story 1.4 (Trust & Privacy):** The TrustPrivacySection already contains a link to `/privacidade`. This story creates the actual page that link points to. Verify the link in TrustPrivacySection uses `href="/privacidade"` to ensure it works with the new page.
- **Story 11.1 (LGPD Privacy Policy):** Epic 11 has a dedicated story for a comprehensive LGPD-compliant privacy policy. The privacy policy created in THIS story is a foundational version. Story 11.1 will enhance it with full legal review, DPO information, and detailed processing records. Do NOT over-engineer the privacy policy here -- create a solid foundation that Story 11.1 will build upon.
- **Story 11.2 (Consent Flow):** The consent flow will reference the privacy policy page. Ensure the page URL is stable at `/privacidade`.

### References

- [Source: architecture.md#6.1] -- Project structure (`src/components/layout/Footer.tsx`, `/privacidade`, `/termos` routes)
- [Source: architecture.md#7.2] -- LGPD data protection requirements (biometric consent, data retention, user rights)
- [Source: architecture.md#8.1] -- Loading strategy (SSR landing for SEO, legal pages as Server Components)
- [Source: ux-design.md#2.1] -- Site map (Privacy Policy at /privacidade, Terms at /termos)
- [Source: ux-design.md#3.1] -- Landing page Footer spec ("Links to privacy policy, terms, social media")
- [Source: ux-design.md#6] -- Accessibility (WCAG 2.1 AA, keyboard nav, semantic HTML)
- [Source: prd.md#FR32-35] -- Landing page functional requirements
- [Source: prd.md#NFR1] -- Landing page loads < 2s on 4G (Lighthouse >= 90)
- [Source: prd.md#NFR15-18] -- Accessibility requirements (WCAG 2.1 AA)
- [Source: epics-and-stories.md#S1.6] -- Story 1.6 acceptance criteria
- [Source: epics-and-stories.md#E11] -- Epic 11 LGPD compliance (future enhancement of legal pages)
- [Source: 1-1-design-system-setup.md] -- Design system, theme config, typography tokens
- [Source: 1-5-interactive-demo.md] -- Previous story patterns, test count, page.tsx composition

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- Initial test run (RED phase) confirmed tests fail when components do not exist
- 3 test assertions needed adjustment from `getByText` to `getAllByText` due to multiple matches in legal page content (biometricos, exclusao, reembolso appear in both headings and body text)
- Final test run: 140/140 tests pass (117 existing + 23 new), zero regressions

### Completion Notes List

- Footer component created as a Server Component (no `'use client'`) in `src/components/layout/Footer.tsx` with semantic `<footer>` element, `role="contentinfo"`, `id="footer"`, `data-testid="footer-section"`, and `scroll-mt-16`
- Footer uses design system tokens (`bg-muted`, `text-muted-foreground`, `font-body`), flexbox layout with `flex-wrap` for responsive behavior, and proper focus-visible states on all links
- Footer has no entrance animations, so `prefers-reduced-motion` is respected by default (AC 10 satisfied)
- Privacy policy page (`/privacidade`) created as Server Component with 10 LGPD-compliant sections covering: data controller, data collected, processing purpose, biometric data, retention (90 days), user rights (access/correction/deletion/portability), rights exercise mechanism, third-party sharing (AI providers), cookies, and policy updates
- Terms of service page (`/termos`) created as Server Component with 10 sections covering: service description, AI disclaimer with "sugestoes artisticas para inspiracao e entretenimento" framing, limitation of liability, user responsibilities, payment terms, refund policy (auto-refund on AI failure), intellectual property, account termination, governing law (Brazilian/LGPD), and contact
- Both legal pages export proper `metadata` with `title` and `description` for SEO (AC 12)
- Both legal pages use semantic `<article>` with `<h1>` > `<h2>` heading hierarchy and include "Voltar para a pagina inicial" link at bottom
- `page.tsx` updated to render `<Footer />` outside `<main>` using React Fragment (`<>...</>`), maintaining Server Component status
- All content in Portuguese (pt-BR) as required
- 23 new tests written covering all acceptance criteria: 9 Footer tests, 7 Privacy page tests, 7 Terms page tests
- TDD approach followed: tests written first (RED), components implemented (GREEN), assertions refined (REFACTOR)

### Senior Developer Review (AI)

**Reviewer:** Fusuma (via BMAD code-review workflow)
**Date:** 2026-03-01
**Outcome:** APPROVED (after fixes)

**Issues Found & Fixed:**
1. **[HIGH] AC 8 -- Missing diacritical marks in ALL Portuguese text (3 files):** All user-facing text across privacidade/page.tsx, termos/page.tsx, and Footer.tsx was ASCII-only with no Portuguese diacritical marks (accents, cedillas, tildes). Fixed by rewriting all three files with correct pt-BR diacritics (e.g., Politica -> Politica, Protecao -> Protecao, informacoes -> informacoes, biometricos -> biometricos, exclusao -> exclusao, pagina -> pagina, etc.). Files now properly UTF-8 encoded.
2. **[MEDIUM] Footer link className duplicated 3 times:** Identical 180+ character className string copy-pasted across all three footer links. Extracted to `footerLinkClass` constant for DRY compliance.
3. **[MEDIUM] Footer aria-label missing diacritical:** "Links do rodape" corrected to "Links do rodape" with proper accent on the e.

**Verification:**
- All 140 tests pass (117 existing + 23 new, zero regressions)
- All three fixed files verified as Unicode UTF-8 encoding
- Diacritical marks spot-checked across all sections of both legal pages

**Notes:**
- HTML lang="en" on layout.tsx noted but out of scope for this story (layout.tsx is DO NOT MODIFY)
- Footer hover style uses `hover:text-foreground` (per UX spec) not `hover:text-accent` (per task subtask) -- UX spec takes precedence, kept as-is
- Tests already used regex wildcards (`.`) for diacritical positions, so no test changes needed

### Change Log

- 2026-03-01: Implemented Story 1.6 -- Footer & Legal Pages. Created Footer component, /privacidade (LGPD privacy policy), /termos (ToS with AI disclaimer), integrated Footer into landing page, added 23 tests. Total test count: 140 (117 existing + 23 new).
- 2026-03-01: Code review fixes -- Added proper Portuguese diacritical marks (pt-BR) to all user-facing text across 3 files, extracted duplicated footer link className to constant, fixed aria-label accent. All 140 tests pass.

### File List

- `src/components/layout/Footer.tsx` (NEW) -- Footer Server Component with navigation links and copyright
- `src/app/privacidade/page.tsx` (NEW) -- LGPD-compliant privacy policy page (Server Component)
- `src/app/termos/page.tsx` (NEW) -- Terms of service page with AI disclaimer (Server Component)
- `src/app/page.tsx` (MODIFIED) -- Added Footer import and render outside `<main>`
- `src/test/footer-and-legal.test.tsx` (NEW) -- 23 tests for Footer, Privacy, and Terms pages
