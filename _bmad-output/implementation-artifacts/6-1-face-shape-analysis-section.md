# Story 6.1: Face Shape Analysis Section

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see my face shape analysis with a clear visual explanation on the results page,
so that I understand and trust the AI's assessment before viewing style recommendations.

## Acceptance Criteria

1. A face shape badge is displayed prominently using the existing `FACE_SHAPE_LABELS` mapping, styled as a large badge showing e.g. "Rosto Oval".
2. A confidence score is displayed below the badge in muted text, formatted as "{X}% de certeza" (using the existing `faceAnalysis.confidence` value multiplied by 100).
3. The user's photo is displayed with a face shape outline overlay (SVG or canvas-based overlay showing the detected face shape contour on top of the photo).
4. An explanation paragraph (2-3 sentences) about the face shape characteristics is shown, using the existing `FACE_SHAPE_DESCRIPTIONS` mapping from `src/lib/consultation/face-shape-labels.ts`.
5. A proportion analysis visual is rendered showing forehead/cheekbone/jaw ratios as a horizontal bar chart or diagram, using `faceAnalysis.proportions` data (`foreheadRatio`, `cheekboneRatio`, `jawRatio`).
6. All elements use staggered reveal animation with 150ms delay between elements (Framer Motion), respecting `prefers-reduced-motion`.
7. The section replaces the current `PaidResultsPlaceholder` component when `paymentStatus === 'paid'`, integrated into the existing `AnimatePresence` flow on the results page.
8. The section is fully responsive: works on 375px mobile and desktop viewports.
9. The section uses theme-aware design tokens (dark male / warm light female themes) -- no hardcoded colors.
10. Unit tests cover: FaceShapeAnalysisSection rendering with all face shapes, proportion bar rendering, staggered animation, photo overlay display, reduced motion support, and integration with the results page.

## Tasks / Subtasks

- [x] Task 1: Create `FaceShapeAnalysisSection` component (AC: 1, 2, 4, 6, 8, 9)
  - [x] Create `src/components/results/FaceShapeAnalysisSection.tsx`
  - [x] Accept `faceAnalysis: FaceAnalysisOutput` and `photoPreview: string | null` props
  - [x] Render face shape badge using `FACE_SHAPE_LABELS[faceAnalysis.faceShape]`
  - [x] Render confidence score: `${Math.round(faceAnalysis.confidence * 100)}% de certeza`
  - [x] Render face shape description from `FACE_SHAPE_DESCRIPTIONS[faceAnalysis.faceShape]`
  - [x] Use Framer Motion staggered container with 150ms `staggerChildren`
  - [x] Each child uses `itemVariants` with opacity+y animation (consistent with existing patterns)
  - [x] Use `useReducedMotion()` to skip animations when preferred
  - [x] Use theme-aware classes: `text-foreground`, `text-muted-foreground`, `bg-primary`, `bg-card`, `border-border`

- [x] Task 2: Create `ProportionAnalysis` component (AC: 5, 8, 9)
  - [x] Create `src/components/results/ProportionAnalysis.tsx`
  - [x] Accept `proportions: FaceAnalysisOutput['proportions']` prop
  - [x] Render 3 horizontal bars: Testa (forehead), Maçãs do rosto (cheekbones), Queixo (jaw)
  - [x] Each bar width is proportional to its ratio value (normalize to max of the three)
  - [x] Label each bar with the Portuguese name and percentage
  - [x] Use `bg-primary` for bar fill, `bg-muted` for track
  - [x] Animate bars with Framer Motion (grow from left, staggered 100ms)
  - [x] Responsive: bars stack vertically, full width on mobile

- [x] Task 3: Create `FaceShapeOverlay` component (AC: 3, 8)
  - [x] Create `src/components/results/FaceShapeOverlay.tsx`
  - [x] Accept `photoPreview: string` and `faceShape: FaceAnalysisOutput['faceShape']` props
  - [x] Display user photo in a rounded container with consistent aspect ratio (3:4)
  - [x] Overlay an SVG shape outline matching the detected face shape (7 shapes: oval, round, square, oblong, heart, diamond, triangle)
  - [x] SVG outlines are semi-transparent (stroke only, primary color, 50% opacity)
  - [x] SVG centered on the photo (approximate face position -- centered upper third)
  - [x] Use Next.js `<Image>` component if photo is a URL, or `<img>` for blob preview string
  - [x] Responsive: max-width 280px on mobile, 320px on desktop

- [x] Task 4: Integrate into results page (AC: 7)
  - [x] Modify `src/app/consultation/results/[id]/page.tsx`
  - [x] Replace `PaidResultsPlaceholder` with `FaceShapeAnalysisSection`
  - [x] Pass `faceAnalysis` from Zustand store and `photoPreview` from store
  - [x] Keep existing `AnimatePresence` flow: refunded -> paywall -> results (face shape section)
  - [x] Keep existing paywall exit animation and results entrance animation
  - [x] Remove or repurpose the `PaidResultsPlaceholder` component (no longer needed after this story)

- [x] Task 5: Write unit tests (AC: 10)
  - [x] Create `src/test/face-shape-analysis-section.test.tsx`
  - [x] Test renders face shape badge for each of the 7 face shapes
  - [x] Test renders confidence percentage correctly (e.g., 0.93 -> "93% de certeza")
  - [x] Test renders face shape description text
  - [x] Test renders proportion bars with correct labels (Testa, Maçãs do rosto, Queixo)
  - [x] Test renders user photo when `photoPreview` is provided
  - [x] Test does NOT render photo when `photoPreview` is null
  - [x] Test face shape overlay SVG is present with correct shape
  - [x] Test reduced motion: animations are disabled when `useReducedMotion` returns true
  - [x] Create `src/test/results-page-face-shape.test.tsx`
  - [x] Test results page renders `FaceShapeAnalysisSection` when `paymentStatus === 'paid'`
  - [x] Test results page still renders `Paywall` when `paymentStatus !== 'paid'`
  - [x] Test results page still renders `RefundBanner` when `paymentStatus === 'refunded'`

## Dev Notes

### Architecture Compliance

- **Results page content hierarchy:** The face shape analysis is Section A (Hero) of the results page per UX spec. It has the highest visual weight and appears first. All subsequent Epic 6 stories (6.2 - 6.8) build below this section. [Source: ux-design.md#3.6 Section A]
- **Component location:** Results page components go in `src/components/results/` -- a NEW directory. This is distinct from `src/components/consultation/` which houses the pre-results flow (camera, questionnaire, paywall). The architecture specifies `ResultsPage.tsx` and `RecommendationCard.tsx` as separate components. [Source: architecture.md#6.1 Project Structure]
- **State management:** Face analysis data (`faceAnalysis`) is already in the Zustand consultation store. Photo preview (`photoPreview`) is also in the store (persisted to sessionStorage). NO new API calls needed -- all data is already available on the client. [Source: src/stores/consultation.ts]
- **Animation standard:** Framer Motion with 150ms stagger between elements, fade-in + slide-up. Always respect `prefers-reduced-motion` via `useReducedMotion()`. This is the established pattern across the project (see FaceShapeReveal.tsx, Paywall.tsx, RefundBanner.tsx). [Source: architecture.md#2.1 Frontend, ux-design.md#6.3 Reveal]
- **Theme compliance:** Use ONLY Tailwind theme tokens (`text-foreground`, `bg-primary`, `bg-card`, etc.). Never hardcode hex colors. The dual theme system (dark male / warm light female) is already functional from Epic 1. [Source: 1-1-design-system-setup.md]
- **`src/types/index.ts` is FROZEN:** Do NOT add any types to this file. Define types locally in their respective component files. [Source: 5-1-stripe-setup-and-configuration.md]
- **Portuguese language:** All user-facing text must be in Portuguese (pt-BR/pt-PT). Labels and descriptions are already available in `src/lib/consultation/face-shape-labels.ts`. [Source: prd.md, ux-design.md]

### Existing Code to Reuse (DO NOT Reinvent)

- **`FACE_SHAPE_LABELS`** from `src/lib/consultation/face-shape-labels.ts` -- maps face shape enum to Portuguese labels. Already used in FaceShapeReveal.tsx and Paywall.tsx.
- **`FACE_SHAPE_DESCRIPTIONS`** from `src/lib/consultation/face-shape-labels.ts` -- maps face shape enum to Portuguese descriptions. Already used in FaceShapeReveal.tsx and Paywall.tsx.
- **`FaceAnalysisOutput` type** from `src/lib/ai/schemas` -- the Zod-inferred type for face analysis data. Used everywhere.
- **`useConsultationStore`** from `src/stores/consultation` -- Zustand store already has `faceAnalysis` and `photoPreview` fields.
- **`useReducedMotion()`** from `framer-motion` -- already used in FaceShapeReveal, Paywall, RefundBanner.
- **Badge styling pattern** from `FaceShapeReveal.tsx` line 42-46: `inline-flex items-center rounded-lg bg-primary px-6 py-3` with `font-display text-3xl font-bold text-primary-foreground`.
- **Stagger animation pattern** from results page `PaidResultsPlaceholder`: `containerVariants` with `staggerChildren: 0.15` and `itemVariants` with opacity+y.

### What This Story REPLACES

The current `PaidResultsPlaceholder` component in `src/app/consultation/results/[id]/page.tsx` (lines 55-96) shows a temporary "Consultoria completa desbloqueada!" message. This story replaces it with the actual face shape analysis section. The placeholder was explicitly marked as "Epic 6" placeholder text.

### Face Shape Overlay Implementation Guide

The face shape overlay displays a simplified SVG contour over the user's photo. Implementation approach:

```typescript
// src/components/results/FaceShapeOverlay.tsx
// SVG paths for each face shape (simplified outlines)
const FACE_SHAPE_PATHS: Record<FaceAnalysisOutput['faceShape'], string> = {
  oval: 'M50,10 C70,10 85,30 85,55 C85,75 70,95 50,95 C30,95 15,75 15,55 C15,30 30,10 50,10 Z',
  round: 'M50,10 C75,10 90,30 90,50 C90,70 75,90 50,90 C25,90 10,70 10,50 C10,30 25,10 50,10 Z',
  square: 'M20,15 L80,15 C85,15 88,18 88,23 L88,80 C88,85 85,88 80,88 L20,88 C15,88 12,85 12,80 L12,23 C12,18 15,15 20,15 Z',
  oblong: 'M50,5 C68,5 80,20 80,50 C80,75 68,95 50,95 C32,95 20,75 20,50 C20,20 32,5 50,5 Z',
  heart: 'M50,90 C35,75 10,55 10,35 C10,20 25,10 40,10 C45,10 48,12 50,15 C52,12 55,10 60,10 C75,10 90,20 90,35 C90,55 65,75 50,90 Z',
  diamond: 'M50,8 C60,25 88,45 88,50 C88,55 60,75 50,92 C40,75 12,55 12,50 C12,45 40,25 50,8 Z',
  triangle: 'M50,10 C60,10 70,15 75,20 L90,85 C90,88 87,90 85,90 L15,90 C13,90 10,88 10,85 L25,20 C30,15 40,10 50,10 Z',
};
```

The SVG viewBox is `0 0 100 100` and scaled to fill the photo container. The overlay uses `stroke` (no fill) with the primary theme color at reduced opacity.

### Proportion Analysis Implementation Guide

```typescript
// src/components/results/ProportionAnalysis.tsx
// The proportions object from FaceAnalysisOutput:
// { foreheadRatio: number, cheekboneRatio: number, jawRatio: number, faceLength: number }
//
// Bar labels (Portuguese):
const PROPORTION_LABELS = {
  foreheadRatio: 'Testa',
  cheekboneRatio: 'Maçãs do rosto',
  jawRatio: 'Queixo',
};
//
// Normalize: find the max of the three ratios, then each bar width = (ratio / maxRatio) * 100%
// faceLength is informational, not displayed as a bar
```

### Project Structure Notes

```
src/
├── app/
│   └── consultation/
│       └── results/
│           └── [id]/
│               └── page.tsx                 MODIFIED: replace PaidResultsPlaceholder with FaceShapeAnalysisSection
├── components/
│   ├── consultation/                        EXISTS -- no changes to any file here
│   └── results/                             NEW directory for results page components
│       ├── FaceShapeAnalysisSection.tsx      NEW: main face shape analysis section
│       ├── ProportionAnalysis.tsx            NEW: proportion bar chart component
│       └── FaceShapeOverlay.tsx              NEW: photo with face shape SVG overlay
├── lib/
│   └── consultation/
│       └── face-shape-labels.ts             EXISTS -- reuse labels and descriptions (no changes)
├── stores/
│   └── consultation.ts                      EXISTS -- no changes (faceAnalysis + photoPreview already available)
└── test/
    ├── face-shape-analysis-section.test.tsx  NEW
    └── results-page-face-shape.test.tsx      NEW
```

**Files that must NOT be modified:**
- `src/types/index.ts` -- types are frozen
- `src/stores/consultation.ts` -- no store changes needed (data already available)
- `src/lib/consultation/face-shape-labels.ts` -- reuse as-is, no changes
- `src/lib/ai/schemas/face-analysis.schema.ts` -- schema is complete, no changes
- `src/components/consultation/FaceShapeReveal.tsx` -- this is the processing page reveal, not the results page
- `src/components/consultation/Paywall.tsx` -- paywall is unchanged
- `src/components/consultation/RefundBanner.tsx` -- refund flow is unchanged

### Library & Framework Requirements

| Library | Version | Usage in This Story |
|---------|---------|---------------------|
| `framer-motion` | already installed | Staggered reveal animation, `useReducedMotion` |
| `next` | already installed | `<Image>` component for photo display (if URL), App Router page |
| `lucide-react` | already installed | Optional icons for proportion analysis labels |
| `tailwindcss` | already installed | All styling via theme-aware utility classes |
| `vitest` | already installed | Test runner |
| `@testing-library/react` | already installed | Component render tests |

**0 NEW DEPENDENCIES** -- everything needed is already installed from previous epics.

### Cross-Story Dependencies

- **Story 4.3 (Face Analysis) -- DONE:** Provides `FaceAnalysisOutput` type with `faceShape`, `confidence`, `proportions`, `hairAssessment`. Data is generated by the AI pipeline and stored in Zustand. [Source: src/lib/ai/schemas/face-analysis.schema.ts]
- **Story 4.4 (Instant Face Shape Reveal) -- DONE:** Created `FaceShapeReveal.tsx` component for the processing page. This story creates a DIFFERENT component for the results page -- do NOT reuse `FaceShapeReveal` directly (it has a "Continuar" button and different layout). Reuse the label/description mappings only. [Source: src/components/consultation/FaceShapeReveal.tsx]
- **Story 5.3 (Paywall UI) -- DONE:** The paywall already shows face shape badge and description in the free section. After payment, this story's section replaces the paywall with the full analysis. The badge styling should be CONSISTENT with the paywall badge. [Source: src/components/consultation/Paywall.tsx lines 92-104]
- **Story 5.6 (Receipt & Refund Flow) -- DONE:** Refund banner integration in the results page must be preserved. The `AnimatePresence` 3-state flow (refunded/paywall/results) remains. [Source: src/app/consultation/results/[id]/page.tsx]
- **Story 6.2 (Hero Recommendation Card) -- NEXT:** Will render below the face shape section. This story should leave the container open for additional sections to be added below without restructuring. [Source: epics-and-stories.md#S6.2]
- **Story 6.8 (Results Page Animated Reveal) -- FUTURE:** Will add page-level staggered reveal across ALL sections (face shape -> hero recommendation -> alternatives -> tips). This story's section-level animation should be compatible with being wrapped in a parent stagger container later. [Source: epics-and-stories.md#S6.8]

### Previous Story Intelligence

**From Story 5.6 (Receipt & Refund Flow) -- last completed story:**
- Results page has 3-state AnimatePresence: refunded (RefundBanner) | not-paid (PaywallWrapper) | paid (PaidResultsPlaceholder -- TO BE REPLACED).
- `useConsultationStatus` hook polls for refund after payment. Must be preserved.
- Test count after 5.6: **1061 tests** (all passing).
- Commit pattern: `feat(epic-6): implement story 6-1-face-shape-analysis-section`.
- Framer Motion in tests: mock `framer-motion` to render children directly.
- Component testing: `@testing-library/react` with `vi.mock` for stores and router.

**From Story 4.4 (Instant Face Shape Reveal) -- face shape display precedent:**
- Badge style: `inline-flex items-center rounded-lg bg-primary px-6 py-3` with `font-display text-3xl font-bold text-primary-foreground`.
- Confidence display: `{confidencePercent}% de certeza` in `text-sm text-muted-foreground`.
- Description: `text-base text-foreground leading-relaxed`.
- Animation: `initial: { opacity: 0, y: 20 }`, `animate: { opacity: 1, y: 0 }`, `duration: 0.5, ease: 'easeOut'`.

### Git Intelligence

Recent commits (Epic 5, completed):
```
a9b14c9 chore(epic-5): mark epic-5 as done -- all 6 stories complete
cf66ce0 review(epic-5): code review story 5-6-receipt-and-refund-flow
cccf452 review(epic-5): code review story 5-5-stripe-webhook-handler
9c504b8 feat(epic-5): implement story 5-5-stripe-webhook-handler
48b4752 review(epic-5): code review story 5-4-payment-processing-and-unlock
```

Patterns established:
- Commit message format: `feat(epic-6): implement story 6-1-face-shape-analysis-section`
- Test files in `src/test/` directory (NOT co-located with source files)
- Framer Motion mocking: mock module to render children directly in tests
- Component testing: `@testing-library/react` with `vi.mock` for stores and router
- Zustand store mocking: `vi.mock('@/stores/consultation', ...)` with custom state per test

### Testing Requirements

**FaceShapeAnalysisSection tests (`src/test/face-shape-analysis-section.test.tsx`):**
- Test renders badge for each of 7 face shapes (oval, round, square, oblong, heart, diamond, triangle)
- Test badge text matches FACE_SHAPE_LABELS (e.g., "Rosto Oval" for oval)
- Test confidence display: 0.93 -> "93% de certeza", 0.87 -> "87% de certeza"
- Test description text matches FACE_SHAPE_DESCRIPTIONS
- Test proportion bars render 3 bars with labels: "Testa", "Maras do rosto", "Queixo"
- Test photo renders when photoPreview is provided
- Test photo does NOT render when photoPreview is null
- Test face shape overlay SVG is present when photo is shown
- Test reduced motion: no animation props when useReducedMotion returns true
- Test accessibility: semantic heading structure, alt text on photo

**Results page integration tests (`src/test/results-page-face-shape.test.tsx`):**
- Test results page renders FaceShapeAnalysisSection (not PaidResultsPlaceholder) when paymentStatus === 'paid'
- Test results page still renders Paywall when paymentStatus is not 'paid'
- Test results page still renders RefundBanner when paymentStatus === 'refunded'
- Test faceAnalysis and photoPreview are passed correctly from Zustand store

### Critical Guardrails

- **DO NOT** create a new Zustand store or add fields to the existing store. All required data (`faceAnalysis`, `photoPreview`) is already available.
- **DO NOT** make API calls to fetch face analysis data. It is already in the client-side Zustand store from the analysis step (Epic 4).
- **DO NOT** reuse `FaceShapeReveal.tsx` directly. It is for the processing page, not the results page. Reuse the label/description utilities instead.
- **DO NOT** hardcode colors. Use Tailwind theme tokens exclusively.
- **DO NOT** add types to `src/types/index.ts`.
- **DO NOT** modify `src/lib/consultation/face-shape-labels.ts` unless adding a NEW utility (labels and descriptions are sufficient).
- **DO** create a new `src/components/results/` directory -- this is the start of Epic 6's component tree.
- **DO** keep the results page `AnimatePresence` 3-state flow intact (refunded/paywall/paid-results).
- **DO** design the section container to allow additional sections (6.2-6.8) to be appended below without restructuring.
- **DO** use the same badge styling as `FaceShapeReveal.tsx` and `Paywall.tsx` for visual consistency.
- **DO** ensure all animations respect `prefers-reduced-motion`.
- **DO** test with all 7 face shape variants.
- **DO** run `npm test` before considering done -- all 1061 existing + new tests must pass.

### References

- [Source: epics-and-stories.md#S6.1] -- Face shape badge, confidence score, photo overlay, proportion analysis, staggered animation
- [Source: ux-design.md#3.6 Section A] -- Content hierarchy: badge, confidence, photo+overlay, explanation, proportion analysis
- [Source: architecture.md#6.1 Project Structure] -- Component locations: `components/consultation/ResultsPage.tsx`, `components/consultation/RecommendationCard.tsx`
- [Source: architecture.md#2.1 Frontend] -- Framer Motion for animations, Tailwind CSS + shadcn/ui for styling
- [Source: architecture.md#4.1 Pipeline Flow] -- Face analysis returns face_shape, proportions, confidence
- [Source: src/lib/ai/schemas/face-analysis.schema.ts] -- FaceAnalysisOutput type: faceShape, confidence, proportions (foreheadRatio, cheekboneRatio, jawRatio, faceLength), hairAssessment
- [Source: src/lib/consultation/face-shape-labels.ts] -- FACE_SHAPE_LABELS and FACE_SHAPE_DESCRIPTIONS mappings (Portuguese)
- [Source: src/stores/consultation.ts] -- Zustand store with faceAnalysis: FaceAnalysisOutput | null, photoPreview: string | null
- [Source: src/components/consultation/FaceShapeReveal.tsx] -- Badge styling pattern and animation precedent
- [Source: src/components/consultation/Paywall.tsx] -- Badge and confidence display pattern in free section
- [Source: src/app/consultation/results/[id]/page.tsx] -- Current results page with PaidResultsPlaceholder to replace
- [Source: prd.md#FR15] -- "The system presents face shape identification with a clear, educational explanation to the user"
- [Source: prd.md#FR24] -- "The system displays consultation results in a structured layout with clear visual hierarchy"

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No blocking issues. Key fix during implementation: face shape badge tests required `getAllByText` pattern because face shape labels (e.g., "rosto oval") also appear in the description text. Used `getBadgeSpan()` helper to locate the specific `<span>` badge element. Pre-existing TypeScript errors in `payment-transition.test.tsx` (circular type reference) existed before this story and were not introduced.

### Completion Notes List

- Created `src/components/results/` directory (new Epic 6 component tree)
- Implemented `FaceShapeAnalysisSection` as the main orchestration component with Framer Motion staggered reveal (150ms staggerChildren), `useReducedMotion()` support, and theme-aware Tailwind classes
- Implemented `ProportionAnalysis` with normalized horizontal bar chart for foreheadRatio, cheekboneRatio, jawRatio using `bg-primary` fill and `bg-muted` track; animated with Framer Motion grow-from-left
- Implemented `FaceShapeOverlay` with SVG face shape contours (7 shapes) overlaid at 50% opacity on user photo in 3:4 aspect ratio container
- Replaced `PaidResultsPlaceholder` in `src/app/consultation/results/[id]/page.tsx` with `FaceShapeAnalysisSection`, passing `faceAnalysis` and `photoPreview` from Zustand store
- Preserved existing `AnimatePresence` 3-state flow (refunded/paywall/paid-results)
- Added 31 new tests (23 component tests + 8 integration tests); updated 2 existing test files to mock `FaceShapeAnalysisSection` and remove references to the removed placeholder
- Total test count: 1092 (all passing, no regressions)
- All animations respect `prefers-reduced-motion` via `useReducedMotion()`
- Zero new dependencies; all libraries already installed from previous epics

### File List

- `src/components/results/FaceShapeAnalysisSection.tsx` (NEW)
- `src/components/results/ProportionAnalysis.tsx` (NEW)
- `src/components/results/FaceShapeOverlay.tsx` (NEW)
- `src/app/consultation/results/[id]/page.tsx` (MODIFIED)
- `src/test/face-shape-analysis-section.test.tsx` (NEW)
- `src/test/results-page-face-shape.test.tsx` (NEW)
- `src/test/payment-transition.test.tsx` (MODIFIED - mock + updated assertions)
- `src/test/results-page-refund.test.tsx` (MODIFIED - mock + updated assertion)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (MODIFIED)

## Change Log

- 2026-03-02: Implemented story 6-1-face-shape-analysis-section. Created `src/components/results/` directory with three new components: `FaceShapeAnalysisSection` (main section), `ProportionAnalysis` (horizontal bar chart), and `FaceShapeOverlay` (photo + SVG contour overlay). Replaced `PaidResultsPlaceholder` in the results page with the real face shape analysis section. Added 31 new tests and updated 2 existing test files. All 1092 tests pass.
