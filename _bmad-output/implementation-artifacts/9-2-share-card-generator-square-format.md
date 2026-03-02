# Story 9.2: Share Card Generator (Square Format)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **a square branded card for Instagram feed posts**,
so that **I can share my consultation results as visually appealing 1:1 images on social media feeds**.

## Acceptance Criteria

1. 1:1 aspect ratio (1080x1080px) share card is generated
2. Card contains the same core content as the story-format card (S9.1) but with a layout adapted for square dimensions: user photo, AI preview (if available), face shape badge, top recommended style name, match score, and branding
3. Card is downloadable from the results page as a high-res PNG
4. "Partilhar resultado" button on the results page triggers share card generation (or a secondary option specifically for square format)
5. Card includes branding: "Descubra o seu estilo em mynewstyle.com"
6. Card is generated client-side using html-to-image (same approach as BarberCard from story 7-7) -- NOT a page screenshot
7. Card survives social media compression (high-res PNG at 2x pixel ratio)
8. Card respects the current gender theme (male/female accent colors)
9. Card generation shows a loading state (button disabled, spinner) while processing
10. Card works regardless of whether AI preview was generated (graceful layout without preview image)

## Tasks / Subtasks

- [x] Task 1: Create ShareCardSquare component (AC: 1, 2, 5, 8, 10)
  - [x] 1.1 Create `src/components/share/ShareCardSquare.tsx` as a hidden render target (NOT displayed on screen, only used for PNG generation)
  - [x] 1.2 Layout: fixed-size container (1080x1080px internally, rendered at 540x540px with 2x pixelRatio) for consistent PNG output
  - [x] 1.3 Include user's photo (circular, bordered with gender accent color)
  - [x] 1.4 Include AI preview image if available (prominent placement, rounded corners)
  - [x] 1.5 Include face shape badge (e.g., "Rosto Oval") with gender-themed accent background
  - [x] 1.6 Include top recommended style name as prominent heading
  - [x] 1.7 Include match score (e.g., "93% compativel com o seu rosto")
  - [x] 1.8 Include branding footer: "Descubra o seu estilo em mynewstyle.com"
  - [x] 1.9 Handle layout variant when AI preview is NOT available (center photo, expand text area, show additional context)
  - [x] 1.10 Use gender-themed design: dark background + amber accent for male, warm white background + dusty rose accent for female
  - [x] 1.11 All text must meet WCAG 4.5:1 contrast ratio (lesson from story 7-7 review)

- [x] Task 2: Create ShareCardSquareRenderer hidden container (AC: 6)
  - [x] 2.1 Create `src/components/share/ShareCardSquareRenderer.tsx` wrapper
  - [x] 2.2 Renders ShareCardSquare into a hidden div (position absolute, off-screen, pointer-events-none, aria-hidden)
  - [x] 2.3 Exposes ref for html-to-image capture
  - [x] 2.4 Does NOT render if minimum data is missing (faceAnalysis, recommendation, photoPreview, gender)

- [x] Task 3: Create useShareCard hook (AC: 3, 7, 9)
  - [x] 3.1 Create `src/hooks/useShareCard.ts` — extended existing hook to support both 'story' and 'square' formats
  - [x] 3.2 Hook accepts same params as useBarberCard: faceAnalysis, recommendation, photoPreview, previewUrl, gender, groomingTips
  - [x] 3.3 Uses html-to-image toPng() with 2x pixelRatio to capture hidden div as PNG (540x540 → 1080x1080)
  - [x] 3.4 Triggers browser download with filename: `mynewstyle-share-card.png`
  - [x] 3.5 Returns `{ generateShareCard, isGenerating, cardRef, squareCardRef }`
  - [x] 3.6 Handles CORS for external preview images (pre-fetch and convert to data URL, same pattern as useBarberCard)
  - [x] 3.7 Handle errors gracefully: toast error message if generation fails

- [x] Task 4: Integrate into ResultsActionsFooter (AC: 3, 4, 9)
  - [x] 4.1 Update `src/components/consultation/ResultsActionsFooter.tsx`
  - [x] 4.2 Added "Cartão Instagram" button (Option B — separate secondary button with Image icon)
  - [x] 4.3 Option A considered; chose Option B (simpler, cleaner UX without dropdown complexity)
  - [x] 4.4 Added "Cartão Instagram" button (secondary variant, Image icon) next to share button
  - [x] 4.5 Mount ShareCardSquareRenderer off-screen in the footer component (same pattern as BarberCardRenderer)
  - [x] 4.6 Wire button to useShareCard hook's generateShareCard('square') function
  - [x] 4.7 Show loading state while card generates (spinner replaces icon, button disabled, aria-busy)
  - [x] 4.8 Pass required data from consultation store to the hook (uses same store data as story format)

- [x] Task 5: Write tests (AC: all)
  - [x] 5.1 Unit test: ShareCardSquare renders all required elements (photo, face shape, style name, match score, branding)
  - [x] 5.2 Unit test: ShareCardSquare renders correctly without AI preview (graceful fallback layout)
  - [x] 5.3 Unit test: ShareCardSquare applies gender-themed design (male dark + amber, female light + dusty rose)
  - [x] 5.4 Unit test: ShareCardSquare has correct container dimensions (540x540px internal, 1080x1080px at 2x)
  - [x] 5.5 Unit test: All text meets WCAG 4.5:1 contrast on card background (dark badge text on accent backgrounds)
  - [x] 5.6 Unit test: useShareCard hook returns isGenerating state correctly for 'square' format
  - [x] 5.7 Integration test: Share card option appears in ResultsActionsFooter
  - [x] 5.8 Integration test: Triggering share card generates and downloads PNG

## Dev Notes

### Architecture Patterns and Constraints

- **Framework:** Next.js 16 App Router with client components (`'use client'`)
- **State management:** Zustand with sessionStorage persistence (`stores/consultation.ts`)
- **UI components:** shadcn/ui (Button, Card, Badge, DropdownMenu) from `@/components/ui/`
- **Styling:** Tailwind CSS with design system tokens
- **Theme system:** `data-theme="male"/"female"` on `<html>`, semantic tokens
- **Icons:** Lucide React (`lucide-react`) -- use `Image` or `Download` icon for share card button
- **Animation:** Framer Motion (NOT needed for the card itself -- static render target)
- **PNG generation:** `html-to-image` already installed (v1.11.13, added in story 7-7)

### CRITICAL: Reuse Patterns from Story 7-7 (Barber Reference Card)

This story is architecturally identical to story 7-7 (Barber Reference Card). The SAME approach must be followed:

1. **html-to-image with toPng()** -- already installed, known to work with Tailwind inline styles
2. **Hidden off-screen renderer pattern** -- BarberCardRenderer is the template to follow
3. **CORS handling for AI preview images** -- `toDataUrl()` helper in useBarberCard already solves this. EXTRACT this utility to a shared location (`src/lib/utils/image-to-data-url.ts`) OR copy the pattern.
4. **Inline styles only** -- html-to-image uses SVG foreignObject, Tailwind classes MAY NOT apply. All sizing/color MUST use inline `style` props, NOT className.
5. **System fonts in card** -- Use `system-ui, -apple-system, sans-serif` (not Google Fonts) to avoid font embedding issues in html-to-image.
6. **Native `<img>` tags** -- NOT Next.js `<Image>` (breaks html-to-image SVG capture).

**DO NOT reinvent the wheel.** The `toDataUrl`, download trigger, and hidden renderer patterns are all proven in story 7-7. Reuse or extract them.

### Card Layout Specification

The square format card (1080x1080px output) is designed for Instagram feed posts and general social media sharing.

**With AI Preview layout (1:1):**
```
+------------------------------------------+
|                                          |
|  [User Photo]        [AI Preview]        |
|  140px circle        280x360px           |
|  accent border       rounded corners      |
|                                          |
|  ┌──────────────────────────────┐        |
|  │  Rosto Oval                  │ Badge  |
|  └──────────────────────────────┘        |
|                                          |
|  Textured Crop                  Style    |
|  ──────────────                 Name     |
|  93% compativel com o seu rosto          |
|                                          |
|  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─        |
|  Descubra o seu estilo em                |
|  mynewstyle.com                          |
+------------------------------------------+
```

**Without AI Preview layout (1:1):**
```
+------------------------------------------+
|                                          |
|           [User Photo]                   |
|           200px circle                   |
|           accent border                  |
|                                          |
|  ┌──────────────────────────────┐        |
|  │  Rosto Oval                  │ Badge  |
|  └──────────────────────────────┘        |
|                                          |
|  Textured Crop                  Style    |
|  ──────────────                 Name     |
|  93% compativel com o seu rosto          |
|                                          |
|  • Creates vertical height for           |
|    round faces.                          |
|  • Manutencao: Baixa                     |
|                                          |
|  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─        |
|  Descubra o seu estilo em                |
|  mynewstyle.com                          |
+------------------------------------------+
```

### Gender-Themed Card Design

Unlike the BarberCard (which is always white for barbershop readability), the share card should be themed per gender for social media visual impact:

- **Male card:** Dark background (`#1A1A2E`), amber accent (`#F5A623`), cream/white text (`#FAF3E0`)
- **Female card:** Warm white background (`#FFF8F0`), dusty rose accent (`#C4787A`), charcoal text (`#2D2D3A`)
- **Branding text:** Lighter/muted color that still passes WCAG 4.5:1 contrast

**WCAG 4.5:1 Contrast Requirements (learned from story 7-7 code review):**
- Male: `#FAF3E0` on `#1A1A2E` = 14.7:1 (passes). Badge: `#1A1A2E` on `#F5A623` = 8.42:1 (passes).
- Female: `#2D2D3A` on `#FFF8F0` = 12.3:1 (passes). Badge: `#1A1A2E` on `#C4787A` = 5.13:1 (passes).
- Never use white text on amber or dusty rose badges (fails, 2.03:1 and 3.33:1 respectively -- fix from 7-7 review).

### Existing Code to Modify (DO NOT Recreate)

- **`src/components/consultation/ResultsActionsFooter.tsx`** -- Add share card option. Currently has: Share (link), Mostrar ao barbeiro, Guardar, Nova consultoria, Voltar ao inicio. The "Partilhar resultado" button currently only copies a link or invokes Web Share API. Enhance this to also offer share card download.

### New Files to Create

- `src/components/share/ShareCardSquare.tsx` -- Square card layout component (render target for PNG)
- `src/components/share/ShareCardSquareRenderer.tsx` -- Hidden off-screen wrapper for capture
- `src/hooks/useShareCard.ts` -- Hook managing share card generation state and PNG download

### Existing Code to Reuse (DO NOT Duplicate)

- **`src/hooks/useBarberCard.ts`** -- Contains `toDataUrl()` helper for CORS image conversion. Either extract to shared utility or copy the pattern.
- **`src/components/consultation/BarberCard.tsx`** -- Reference for inline-style-only approach, font handling, `html-to-image` caveats.
- **`src/components/consultation/BarberCardRenderer.tsx`** -- Template for hidden off-screen renderer pattern.
- **`src/lib/consultation/face-shape-labels.ts`** -- Import `FACE_SHAPE_LABELS` for face shape display text. DO NOT redefine.
- **`src/types/index.ts`** -- Use existing types: `StyleRecommendation`, `GroomingTip`, `Consultation`, `PreviewStatus`.
- **`src/lib/ai/schemas`** -- Import `FaceAnalysisOutput` type for face analysis data.

### html-to-image Configuration for Square Card

```typescript
import { toPng } from 'html-to-image';

// Capture at 540x540 internal with 2x pixel ratio = 1080x1080 output
const dataUrl = await toPng(cardRef.current, {
  width: 540,
  height: 540,
  pixelRatio: 2, // 2x for 1080x1080 output + retina sharpness
  backgroundColor: gender === 'male' ? '#1A1A2E' : '#FFF8F0',
});

// Trigger download
const link = document.createElement('a');
link.download = 'mynewstyle-share-card.png';
link.href = dataUrl;
link.click();
```

### CORS Handling for Preview Images (Reuse from 7-7)

```typescript
// Same pattern as useBarberCard.ts -- extract to shared utility or copy
async function toDataUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) return url;
    const blob = await response.blob();
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}
```

### Data Sources from Consultation Store

```typescript
// All data comes from the Zustand consultation store (same as BarberCard)
const faceAnalysis = useConsultationStore((state) => state.faceAnalysis);
const photoPreview = useConsultationStore((state) => state.photoPreview); // base64 data URL
const consultationRaw = useConsultationStore((state) => state.consultation);
const consultation = consultationRaw as Consultation;
const gender = useConsultationStore((state) => state.gender);
const previews = useConsultationStore((state) => state.previews);
```

### Key Content Extraction for Share Card

The share card content is simpler than the barber card (social-focused, not barber-focused):

1. **User photo** -- from `photoPreview` (already base64 data URL)
2. **AI preview** -- from `previews` Map (convert external URL to data URL before capture)
3. **Face shape badge** -- from `faceAnalysis.faceShape` + `FACE_SHAPE_LABELS` mapping
4. **Style name** -- from `consultation.recommendations[0].styleName`
5. **Match score** -- from `consultation.recommendations[0].matchScore` formatted as "X% compativel com o seu rosto"
6. **Branding** -- static text: "Descubra o seu estilo em mynewstyle.com"

### Share Card vs Barber Card Differences

| Aspect | Barber Card (7-7) | Share Card Square (9-2) |
|--------|-------------------|-------------------------|
| Dimensions | 390x600px (3:4) | 540x540px (1:1, 1080px at 2x) |
| Background | Always white | Gender-themed (dark/light) |
| Purpose | Show barber | Social media sharing |
| Content | Style notes, grooming tips | Match score, branding CTA |
| Branding | Subtle "mynewstyle.com" | Prominent CTA: "Descubra o seu estilo em mynewstyle.com" |
| Design | Clean, professional | Eye-catching, branded |

### Project Structure Notes

- Share-specific components go in `src/components/share/` (architecture.md specifies this folder)
- This is a NEW directory -- create it
- Hooks go in `src/hooks/`
- Follow naming pattern: `ShareCardSquare.tsx`, `ShareCardSquareRenderer.tsx`, `useShareCard.ts`
- Architecture lists `ShareButton.tsx` and `ShareCardGenerator.tsx` in `src/components/share/` -- this story implements the square card generator variant

### Testing Standards

- Test files co-located or in `src/test/` directory (project convention from existing tests)
- Use Vitest (project test runner) + React Testing Library
- Mock `html-to-image` in tests (mock `toPng` to return a dummy data URL)
- Test both card variants: with and without AI preview
- Test gender-themed styling for both male and female
- Test button/menu loading state transitions
- Test WCAG contrast compliance (check inline style color values against background)
- Mock the consultation store with test data (reference existing test mocks in `src/test/barber-card.test.tsx`)

### Dependencies on Other Stories

- **Story 7-7 (Barber Reference Card):** DONE. Provides the proven html-to-image pattern, toDataUrl helper, hidden renderer approach. All patterns should be reused.
- **Story 6-7 (ResultsActionsFooter):** DONE. The footer component where the share card button will be added.
- **Story 6-8 (ResultsPageAnimatedReveal):** DONE. Parent component that mounts the footer.
- **Stories 7-1 through 7-5 (preview generation):** DONE. The AI preview image may or may not exist in the store. Card MUST work without it.
- **Story 9-1 (Share Card Story Format):** BACKLOG. The story-format (9:16) card. Story 9-2 can be implemented independently. If 9-1 is implemented first, consider extracting shared utilities. If 9-2 is implemented first, structure code for 9-1 reuse.

### Potential Shared Code Extraction (for 9-1 + 9-2)

If both share card stories need similar infrastructure, consider extracting:
- `src/lib/utils/image-to-data-url.ts` -- shared toDataUrl helper (currently inline in useBarberCard)
- `src/lib/utils/download-image.ts` -- shared PNG download trigger
- `src/components/share/ShareCardBase.tsx` -- shared branding footer, face shape badge rendering
- This is OPTIONAL optimization. It is acceptable to keep 9-2 self-contained and refactor when 9-1 is implemented.

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#S9.2] -- Story requirements and AC
- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#E9] -- Epic 9 elicitation context (JTBD, SCAMPER, Competitive Teardown)
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 3.7] -- Share Preview specification (9:16 for stories, 1:1 for feed)
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 7, Sharing & Virality] -- Share card design philosophy, social platform constraints
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 8.1] -- Share interaction: "Card flips to show generated share image preview"
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 5.1] -- POST /api/share/generate with format 'square' (NOT used -- card is client-side generated)
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 6.1] -- ShareButton.tsx, ShareCardGenerator.tsx listed in components/share/
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 8.2] -- Share cards: "Pre-rendered PNG at exact social platform dimensions"
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 3.3] -- share-cards bucket: "Public (read-only, generated on share), Delete after 30 days"
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 9.2] -- Analytics event: { type: 'share_generated'; format: string }
- [Source: _bmad-output/planning-artifacts/prd.md#FR20-FR23] -- Visual preview display requirements
- [Source: _bmad-output/implementation-artifacts/7-7-barber-reference-card.md] -- Proven html-to-image pattern, CORS handling, WCAG fixes, inline styles approach
- [Source: src/components/consultation/BarberCard.tsx] -- Reference implementation for card layout with html-to-image
- [Source: src/components/consultation/BarberCardRenderer.tsx] -- Reference for hidden off-screen renderer
- [Source: src/hooks/useBarberCard.ts] -- Reference for toDataUrl, toPng, download trigger pattern
- [Source: src/components/consultation/ResultsActionsFooter.tsx] -- Existing footer to modify (add share card option)
- [Source: src/stores/consultation.ts] -- Zustand store with consultation data
- [Source: src/types/index.ts] -- StyleRecommendation, FaceAnalysis, Consultation, PreviewStatus, GroomingTip types
- [Source: src/lib/consultation/face-shape-labels.ts] -- FACE_SHAPE_LABELS mapping

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Fixed existing test mocks (barber-card-integration.test.tsx, results-actions-footer.test.tsx, results-actions-footer-share.test.tsx) to include the new `Image` lucide icon and `squareCardRef` from the extended `useShareCard` hook.
- Used distinct aria-labels for share button loading state ("A gerar cartão de partilha…") and square button loading state ("A gerar cartão Instagram…") to prevent test `getByRole` ambiguity when both buttons use `isGeneratingShareCard`.
- Extended existing `useShareCard` hook rather than creating a new `useShareCardSquare` hook — both formats share the same state (one generates at a time), keeping UX coherent.

### Completion Notes List

- Implemented `ShareCardSquare` component (540x540px, captured at 2x → 1080x1080px PNG) following the BarberCard inline-styles-only pattern for html-to-image compatibility.
- Implemented `ShareCardSquareRenderer` hidden off-screen wrapper following the BarberCardRenderer pattern.
- Extended `useShareCard` hook to support both `'story'` and `'square'` formats via a `format` parameter. Added `squareCardRef` for the square card renderer. Story format uses Web Share API with download fallback; square format uses direct download.
- Added "Cartão Instagram (1:1)" button (secondary variant, Image icon) to `ResultsActionsFooter.tsx`, mounting `ShareCardSquareRenderer` off-screen alongside existing renderers.
- All WCAG 4.5:1 contrast requirements met: dark badge text (#1A1A2E) on amber (#F5A623) = 8.42:1; dark badge text (#1A1A2E) on dusty rose (#C4787A) = 5.13:1.
- 39 new tests added across 4 test files; 0 regressions in 1873 total tests.

### File List

- src/components/share/ShareCardSquare.tsx (new)
- src/components/share/ShareCardSquareRenderer.tsx (new)
- src/hooks/useShareCard.ts (modified — added 'square' format support, squareCardRef)
- src/components/consultation/ResultsActionsFooter.tsx (modified — added Cartão Instagram button + ShareCardSquareRenderer)
- src/test/share-card-square.test.tsx (new)
- src/test/share-card-square-renderer.test.tsx (new)
- src/test/use-share-card-square.test.ts (new)
- src/test/share-card-square-integration.test.tsx (new)
- src/test/results-actions-footer.test.tsx (modified — updated mocks for Image icon, squareCardRef, loading aria-labels)
- src/test/results-actions-footer-share.test.tsx (modified — updated mocks for Image icon, squareCardRef, Loader2 data-testid passthrough)
- src/test/barber-card-integration.test.tsx (modified — added Image icon to lucide-react mock)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified — status: review)

## Change Log

- 2026-03-02: Implemented story 9-2 (Share Card Generator — Square Format). Created ShareCardSquare component, ShareCardSquareRenderer, extended useShareCard hook with 'square' format support and squareCardRef, integrated "Cartão Instagram (1:1)" button into ResultsActionsFooter. All 10 ACs satisfied. 39 new tests, 0 regressions.
- 2026-03-02: Code review completed. Fixed 5 issues: (1) removed console.log analytics placeholder (replaced with TODO comment for Epic 10); (2) added test asserting pixelRatio:2 in toPng call for AC7; (3) added test verifying squareCardRef returned by hook (Task 3.5); (4) added 5 new tests for WCAG subtext/branding contrast (Task 5.5); (5) updated use-share-card.test.ts analytics assertion to match new behavior. Total tests: 1880, 0 regressions. Status: done.
