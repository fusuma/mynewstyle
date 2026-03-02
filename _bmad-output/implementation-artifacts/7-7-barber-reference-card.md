# Story 7.7: Barber Reference Card

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **a clean, professional card I can show my barber**,
so that **I can clearly communicate the recommended hairstyle without trying to explain it verbally**.

## Acceptance Criteria

1. "Mostrar ao barbeiro" button is displayed on the results page (in the results actions footer area)
2. Generates a single image containing: user's photo (small), face shape badge, top recommended style name, AI preview (if generated), and 2-3 key style notes
3. Clean, professional layout — no branding clutter (minimal/no mynewstyle logo)
4. High contrast design optimized for barbershop lighting conditions
5. Downloadable as PNG file
6. Card fits phone screen dimensions (optimized for showing on mobile in portrait)
7. Card is accessible: all text is readable, sufficient contrast ratios (4.5:1 minimum)
8. Card generation works regardless of whether AI preview was generated (graceful layout without preview image)
9. Card respects the current gender theme (male/female design tokens)
10. Button is disabled with loading state while card is being generated

## Tasks / Subtasks

- [ ] Task 1: Install html-to-image library (AC: 2, 5)
  - [ ] 1.1 Install `html-to-image` package (`npm install html-to-image`)
  - [ ] 1.2 Verify compatibility with React 19 and Next.js 16

- [ ] Task 2: Create BarberCard component (AC: 2, 3, 4, 7, 8, 9)
  - [ ] 2.1 Create `src/components/consultation/BarberCard.tsx` as a hidden render target (not displayed on screen, only used for PNG generation)
  - [ ] 2.2 Layout: fixed-size container (390px wide x 600px tall) for consistent PNG output
  - [ ] 2.3 Include user's photo (120x120px, rounded, top section)
  - [ ] 2.4 Include face shape badge (e.g., "Rosto Oval") using design system Badge styling
  - [ ] 2.5 Include top recommended style name as the prominent heading
  - [ ] 2.6 Include AI preview image if available (200x260px, 3:4 ratio, positioned prominently)
  - [ ] 2.7 Include 2-3 key style notes extracted from: justification text (shortened), difficulty level, and top grooming tip
  - [ ] 2.8 Handle layout variant when AI preview is NOT available (expand text area, show additional style notes instead)
  - [ ] 2.9 Apply high-contrast styling: dark text on light background (regardless of male/female theme) for barbershop readability
  - [ ] 2.10 Use gender-themed accent color for badges and dividers (amber for male, dusty rose for female)
  - [ ] 2.11 Minimal footer: small "mynewstyle.com" text only (subtle, not branded clutter)

- [ ] Task 3: Create useBarberCard hook (AC: 5, 10)
  - [ ] 3.1 Create `src/hooks/useBarberCard.ts`
  - [ ] 3.2 Hook accepts: faceAnalysis, recommendation, photoPreview, previewUrl (optional), gender, groomingTips
  - [ ] 3.3 Renders BarberCard off-screen into a hidden div (using React portal or ref)
  - [ ] 3.4 Uses `html-to-image`'s `toPng()` to convert the hidden div to PNG data URL
  - [ ] 3.5 Triggers browser download of PNG file with filename: `mynewstyle-barber-card.png`
  - [ ] 3.6 Returns `{ generateCard, isGenerating }` state
  - [ ] 3.7 Handle errors gracefully: toast error message if generation fails

- [ ] Task 4: Add "Mostrar ao barbeiro" button to ResultsActionsFooter (AC: 1, 10)
  - [ ] 4.1 Import Scissors icon from lucide-react
  - [ ] 4.2 Add "Mostrar ao barbeiro" button between "Partilhar resultado" and "Guardar" buttons
  - [ ] 4.3 Button variant: "secondary" (same as Guardar)
  - [ ] 4.4 Wire button to useBarberCard hook's generateCard function
  - [ ] 4.5 Show loading state on button while card is generating (spinner replaces icon, button disabled)
  - [ ] 4.6 Pass required data from consultation store to the hook

- [ ] Task 5: Create BarberCardRenderer hidden container (AC: 2, 5)
  - [ ] 5.1 Create `src/components/consultation/BarberCardRenderer.tsx` wrapper
  - [ ] 5.2 Renders BarberCard into a hidden div (position absolute, off-screen, pointer-events-none)
  - [ ] 5.3 Exposes ref for html-to-image capture
  - [ ] 5.4 Mount this component inside ResultsPageAnimatedReveal (hidden, not visible)

- [ ] Task 6: Write tests
  - [ ] 6.1 Unit test: BarberCard renders all required elements (photo, face shape, style name, notes)
  - [ ] 6.2 Unit test: BarberCard renders correctly without AI preview (graceful fallback layout)
  - [ ] 6.3 Unit test: BarberCard applies gender-themed accent colors
  - [ ] 6.4 Unit test: useBarberCard hook returns isGenerating state correctly
  - [ ] 6.5 Integration test: "Mostrar ao barbeiro" button appears in ResultsActionsFooter
  - [ ] 6.6 Integration test: Button triggers card generation and download

## Dev Notes

### Architecture Patterns and Constraints

- **Framework:** Next.js 16 App Router with client components (`'use client'`)
- **Animation library:** Framer Motion (used project-wide, but NOT needed for BarberCard itself -- card is a static render target)
- **State management:** Zustand with sessionStorage persistence (`stores/consultation.ts`)
- **UI components:** shadcn/ui (Button, Card, Badge) from `@/components/ui/`
- **Styling:** Tailwind CSS with design system tokens (bg-primary, text-primary-foreground, etc.)
- **Theme system:** `data-theme="male"/"female"` on `<html>`, use semantic tokens
- **Icons:** Lucide React (`lucide-react`) -- use `Scissors` icon for the barber button

### PNG Generation Approach -- html-to-image

The project does NOT currently have any DOM-to-image library installed. Use `html-to-image` (lightweight, modern, ~10KB gzipped) over alternatives:
- **NOT html2canvas** -- heavier, known issues with Tailwind, slower
- **NOT dom-to-image** -- unmaintained
- `html-to-image` uses SVG foreignObject technique, works well with Tailwind CSS classes

```typescript
import { toPng } from 'html-to-image';

// Capture a DOM node as PNG
const dataUrl = await toPng(cardRef.current, {
  width: 390,
  height: 600,
  pixelRatio: 2, // 2x for retina sharpness
  backgroundColor: '#FFFFFF', // Force white background for barbershop readability
});

// Trigger download
const link = document.createElement('a');
link.download = 'mynewstyle-barber-card.png';
link.href = dataUrl;
link.click();
```

**Important html-to-image caveats:**
- External images (from CDN/Supabase Storage URLs) need CORS headers or must be inlined as data URLs first
- The user's photo is already in the store as `photoPreview` (base64 data URL from photo capture) -- use this directly, NOT the Supabase URL
- AI preview images from Supabase Storage may have CORS issues -- fetch and convert to data URL before rendering in the card, or use signed URLs with proper CORS config
- Google Fonts (Space Grotesk, Inter) may not render in html-to-image -- embed fonts via `@font-face` with base64-encoded font data, OR use the `fontEmbedCSS` option of html-to-image

### Existing Code to Modify (DO NOT Recreate)

- **`src/components/consultation/ResultsActionsFooter.tsx`** -- Add "Mostrar ao barbeiro" button. Currently has: Share, Guardar, Nova consultoria, Voltar ao inicio. Insert new button after Share. The component receives `consultationId` as a prop -- it will also need access to store data for the barber card.
- **`src/components/consultation/ResultsPageAnimatedReveal.tsx`** -- Mount the hidden BarberCardRenderer here so it has access to the consultation store data. Add it BEFORE the spacer div at line 165.

### New Files to Create

- `src/components/consultation/BarberCard.tsx` -- The card layout component (render target for PNG)
- `src/components/consultation/BarberCardRenderer.tsx` -- Hidden off-screen wrapper that mounts BarberCard for capture
- `src/hooks/useBarberCard.ts` -- Hook managing card generation state and PNG download

### Card Layout Specification (from UX Design Section 9)

```
+--------------------------------------+
|                                      |
|    [User's Photo]    [AI Preview]    |
|     120x120 circle    200x260        |
|                       (if available) |
|                                      |
|   ┌─────────────────────────┐        |
|   │  Rosto Oval             │ Badge  |
|   └─────────────────────────┘        |
|                                      |
|   Textured Crop              Style   |
|   ─────────────────          Name    |
|                                      |
|   • Creates vertical height for      |
|     round faces                      |
|   • Manutencao: Baixa               |
|   • Peca ao barbeiro: textura       |
|     no topo com laterais curtas      |
|                                      |
|              mynewstyle.com          |
+--------------------------------------+
```

**Without AI preview:**
```
+--------------------------------------+
|                                      |
|         [User's Photo]              |
|          160x160 circle              |
|                                      |
|   ┌─────────────────────────┐        |
|   │  Rosto Oval             │ Badge  |
|   └─────────────────────────┘        |
|                                      |
|   Textured Crop              Style   |
|   ─────────────────          Name    |
|                                      |
|   93% compativel com o seu rosto     |
|                                      |
|   • Creates vertical height for      |
|     round faces                      |
|   • Manutencao: Baixa               |
|   • Peca ao barbeiro: textura       |
|     no topo com laterais curtas      |
|   • Evite: cortes rentes nas         |
|     laterais                         |
|                                      |
|              mynewstyle.com          |
+--------------------------------------+
```

### Key Style Notes Extraction Logic

Extract 2-3 notes from available consultation data:
1. **From justification:** Take the first sentence of the top recommendation's justification (the core "why")
2. **From difficulty:** Format as "Manutencao: Baixa/Media/Alta"
3. **From grooming tips:** Find the first tip with category `barber_tips` -- this is the most relevant barber instruction. If none exists, use the first `routine` tip.
4. **Fallback without preview:** When no AI preview exists, also add match score and first style to avoid as additional context.

### Data Sources from Consultation Store

```typescript
// All data comes from the Zustand consultation store
const faceAnalysis = useConsultationStore((state) => state.faceAnalysis);
const photoPreview = useConsultationStore((state) => state.photoPreview); // base64 data URL
const consultationRaw = useConsultationStore((state) => state.consultation);
const consultation = consultationRaw as Consultation; // cast from unknown
const gender = useConsultationStore((state) => state.gender);
// AI preview URL comes from previews Map (if generated in stories 7-1 through 7-5)
const previews = useConsultationStore((state) => state.previews);
```

### Face Shape Labels

The project already has face shape label mappings in `src/lib/consultation/face-shape-labels.ts` (used by `FaceShapeReveal.tsx`). Import `FACE_SHAPE_LABELS` from there -- DO NOT redefine these labels.

### Design Tokens for High-Contrast Card

The barber card must be readable in bright barbershop lighting. Use:
- **Background:** Always white (`#FFFFFF`) regardless of theme
- **Text:** Always dark (`#1A1A2E` or `#2D2D3A`)
- **Accent badge colors:** Use theme's accent (amber `#F5A623` for male, dusty rose `#C4787A` for female)
- **Font sizes (in card):** Style name: 24px bold, Face shape badge: 14px, Notes: 14px, Footer: 11px
- **No shadows or complex borders** -- keep it clean and print-friendly

### Font Handling for html-to-image

html-to-image may not load Google Fonts correctly. Two approaches:
1. **Preferred:** Use the `fontEmbedCSS` option that html-to-image provides -- it auto-embeds fonts
2. **Fallback:** If fonts don't render, use system fonts (`system-ui, -apple-system, sans-serif`) for the card only. The card should still look professional with system fonts.

### CORS Handling for Preview Images

If the AI preview image is stored as a Supabase Storage URL:
1. The `previews` Map may contain a URL to Supabase Storage
2. Before rendering in the card, fetch the image and convert to base64 data URL:
```typescript
async function imageUrlToDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}
```
3. Pass the data URL (not the original URL) to the BarberCard component

### Project Structure Notes

- All consultation components live in `src/components/consultation/`
- Hooks go in `src/hooks/`
- Store in `src/stores/consultation.ts`
- Types in `src/types/index.ts`
- Face shape labels in `src/lib/consultation/face-shape-labels.ts`
- This follows the established project structure exactly

### Testing Standards

- Test files co-located or in `__tests__/` directories
- Use Vitest (project test runner) + React Testing Library
- Mock `html-to-image` in tests (mock `toPng` to return a dummy data URL)
- Test both card variants: with and without AI preview
- Test button loading state transitions
- Mock the consultation store with test data

### Dependencies on Other Stories

- **Stories 7-1 through 7-5 (preview generation):** The barber card CAN show an AI preview if one has been generated. However, the card MUST work without a preview. The `previews` Map in the store may be empty if previews haven't been generated yet.
- **Story 6-7 (ResultsActionsFooter):** The button will be added to this existing component. Already implemented and working.
- **Story 6-2 (HeroRecommendationCard):** The card extracts data from the same `StyleRecommendation` type used by the hero card.

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#S7.7] -- Story requirements and AC
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 9] -- Barber Reference Card specification
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 3.6, Section G] -- "Mostrar ao barbeiro" button in actions footer
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 7, JTBD#4] -- Barber card is highest-utility feature
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 5.1] -- POST /api/share/generate with format 'barber_card' (NOT used in this story -- card is generated client-side)
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 6.1] -- BarberCard.tsx listed in project structure
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 3.3] -- preview-images bucket for AI preview storage
- [Source: src/components/consultation/ResultsActionsFooter.tsx] -- Existing footer to modify
- [Source: src/components/consultation/ResultsPageAnimatedReveal.tsx] -- Mount hidden renderer here
- [Source: src/stores/consultation.ts] -- Zustand store with consultation data
- [Source: src/types/index.ts] -- StyleRecommendation, FaceAnalysis, Consultation, GroomingTip types
- [Source: src/lib/consultation/face-shape-labels.ts] -- FACE_SHAPE_LABELS mapping
- [Source: _bmad-output/implementation-artifacts/7-4-preview-loading-ux.md] -- Previous story patterns for preview state management

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
