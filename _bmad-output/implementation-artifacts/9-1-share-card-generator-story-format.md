# Story 9.1: Share Card Generator (Story Format)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user who completed a consultation,
I want a branded vertical share card (9:16) with my before/after result,
so that I can share it on Instagram Stories and WhatsApp Status and organically promote mynewstyle.

## Acceptance Criteria

1. A "Partilhar resultado" button on the results actions footer generates a branded share card image (not a page screenshot).
2. The share card is 9:16 aspect ratio, exactly 1080x1920px, rendered as a high-resolution PNG.
3. The share card layout contains: user's original photo (top half) and AI preview image (bottom half) in a before/after split layout. If no AI preview exists, the card shows the user's photo centered with face shape analysis and top recommendation text.
4. The share card includes a face shape badge (e.g., "Rosto Oval") styled with the gender-themed accent color.
5. The share card includes the top recommendation style name prominently displayed.
6. The share card includes branding text at the bottom: "Descubra o seu estilo em mynewstyle.com" with subtle mynewstyle.com watermark.
7. The share card uses a gender-themed background: dark (#1A1A2E) for male, warm light (#FFF8F0) for female.
8. The generated PNG is high resolution (pixelRatio: 2) to survive social media compression on Instagram and WhatsApp.
9. After generation, the card is offered for download (browser download) AND triggers the Web Share API (navigator.share with image file) on supported mobile devices, with fallback to download-only on desktop/unsupported browsers.
10. The share card is generated client-side using the existing `html-to-image` library (same pattern as BarberCard in Story 7-7) — no server-side rendering needed for MVP.
11. A loading state is shown while the card is being generated (button shows spinner, disabled state).
12. Analytics event `share_generated` with `format: 'story'` is emitted when the card is successfully generated (placeholder — analytics system from Epic 10 not yet built, log to console).

## Tasks / Subtasks

- [x] Task 1: Create ShareCardStory Component (AC: #2, #3, #4, #5, #6, #7)
  - [x] 1.1 Create `src/components/share/ShareCardStory.tsx` — a static render target (1080x1920px scaled to 540x960 in DOM, captured at pixelRatio 2) used as the source for PNG generation, similar to `BarberCard.tsx`
  - [x] 1.2 Layout — WITH AI preview (before/after split):
    - Top section: "ANTES" label + user's original photo (full width, 960px height area)
    - Bottom section: "DEPOIS" label + AI preview image (full width, 960px height area)
    - Face shape badge overlaid at the split point (centered, pill shape)
    - Style name text below the bottom image
    - Branding footer: "Descubra o seu estilo em mynewstyle.com"
  - [x] 1.3 Layout — WITHOUT AI preview (analysis-only):
    - User's photo centered (large circle, 400px diameter)
    - Face shape badge below photo
    - Top recommendation style name + match score
    - First sentence of justification
    - Branding footer: "Descubra o seu estilo em mynewstyle.com"
  - [x] 1.4 Gender-themed backgrounds: male (#1A1A2E background, #F5A623 accent, #FAF3E0 text), female (#FFF8F0 background, #C4787A accent, #2D2D3A text)
  - [x] 1.5 All styling via inline styles (NOT Tailwind classes) — required for html-to-image SVG foreignObject capture (same pattern as BarberCard)
  - [x] 1.6 Use `data-testid` attributes for all key elements: `share-card-story-container`, `share-card-story-user-photo`, `share-card-story-preview`, `share-card-story-face-badge`, `share-card-story-style-name`, `share-card-story-branding`

- [x] Task 2: Create ShareCardStoryRenderer Component (AC: #2)
  - [x] 2.1 Create `src/components/share/ShareCardStoryRenderer.tsx` — hidden off-screen wrapper (same pattern as `BarberCardRenderer.tsx`): position absolute, top -9999px, left -9999px, pointer-events none
  - [x] 2.2 Mount `ShareCardStory` inside with explicit container dimensions: width 540px, height 960px (half of 1080x1920, will be captured at pixelRatio 2)
  - [x] 2.3 Accept props: `cardRef`, `faceAnalysis`, `recommendation`, `photoPreview`, `previewUrl`, `gender`
  - [x] 2.4 Return null if minimum required data is missing (faceAnalysis, recommendation, photoPreview, gender)

- [x] Task 3: Create useShareCard Hook (AC: #8, #9, #10, #11, #12)
  - [x] 3.1 Create `src/hooks/useShareCard.ts` — manages share card generation state, following `useBarberCard.ts` pattern
  - [x] 3.2 Implement `generateShareCard(format: 'story')` function:
    - Set `isGenerating = true`
    - Pre-convert external image URLs to data URLs (CORS handling, same as useBarberCard)
    - Call `toPng(cardRef.current, { width: 540, height: 960, pixelRatio: 2, backgroundColor })` — produces 1080x1920 PNG
    - Convert data URL to Blob for Web Share API
  - [x] 3.3 Implement share flow:
    - If `navigator.share` AND `navigator.canShare({ files: [...] })` → use Web Share API with image file
    - Else → trigger browser download as `mynewstyle-share-story.png`
    - On share cancel (AbortError) → fall back to download
  - [x] 3.4 Emit console.log analytics placeholder: `console.log('[analytics] share_generated', { format: 'story' })`
  - [x] 3.5 Return `{ generateShareCard, isGenerating, cardRef }`
  - [x] 3.6 Error handling: toast error "Nao foi possivel gerar o cartao. Tente novamente." on failure

- [x] Task 4: Create ShareCardStoryRenderer Mount + Wire Up ResultsActionsFooter (AC: #1, #9, #11)
  - [x] 4.1 Mount `ShareCardStoryRenderer` inside `ResultsActionsFooter.tsx` (same pattern as BarberCardRenderer — hidden off-screen)
  - [x] 4.2 Replace the existing `handleShare` function in `ResultsActionsFooter.tsx`:
    - Old: shares URL only via navigator.share / clipboard
    - New: calls `generateShareCard('story')` which generates the designed image and shares/downloads it
    - Keep URL-only sharing as a SECONDARY action (e.g., long-press or menu option) — not the primary share button
  - [x] 4.3 Wire `useShareCard` hook with consultation store data (faceAnalysis, photoPreview, consultation, gender, previews)
  - [x] 4.4 Update the "Partilhar resultado" button to show loading state (Loader2 spinner) while `isGenerating` is true
  - [x] 4.5 Disable "Partilhar resultado" button while generating (same pattern as barber card button)

- [x] Task 5: Write Tests (all ACs)
  - [x] 5.1 Create `src/test/share-card-story.test.tsx` — component tests:
    - Renders with preview (before/after layout): user photo, preview, face badge, style name, branding
    - Renders without preview (analysis-only layout): user photo, face badge, style name, branding, no preview section
    - Male theme: dark background, amber accent
    - Female theme: light background, dusty rose accent
    - Returns null when required data is missing
  - [x] 5.2 Create `src/test/share-card-story-renderer.test.tsx` — component tests:
    - Renders off-screen (position absolute, top -9999px)
    - Sets aria-hidden="true"
    - Returns null when data is incomplete
  - [x] 5.3 Create `src/test/use-share-card.test.ts` — hook tests:
    - Returns isGenerating=false initially
    - Sets isGenerating=true during generation
    - Calls toPng with correct dimensions (540x960, pixelRatio 2)
    - Attempts navigator.share with file on supported browsers
    - Falls back to download on unsupported browsers
    - Shows toast error on failure
    - Emits analytics console.log on success
  - [x] 5.4 Create `src/test/results-actions-footer-share.test.tsx` — integration tests:
    - Share button triggers share card generation (not URL-only share)
    - Share button shows loading spinner while generating
    - Share button is disabled while generating

## Dev Notes

### Architecture Patterns and Constraints

- **Follow the BarberCard pattern exactly.** Story 7-7 established the pattern for client-side image generation: a static React component rendered off-screen (BarberCardRenderer) → captured by `html-to-image` `toPng()` → downloaded as PNG. This story MUST follow the same pattern. DO NOT invent a new approach.
- **Inline styles only.** The `html-to-image` library uses SVG foreignObject which does NOT reliably apply Tailwind CSS classes. All styling in `ShareCardStory.tsx` MUST use inline `style={}` attributes, not className. This is a learned lesson from BarberCard implementation.
- **CORS handling required.** AI preview images are stored in Supabase Storage (external URLs). Before capture, these must be pre-converted to base64 data URLs using the same `toDataUrl()` helper used in `useBarberCard.ts`. Extract this helper to a shared utility if not already shared.
- **Architecture specifies `POST /api/share/generate`** with format parameter — but for MVP, client-side generation is sufficient and avoids server costs. The server-side API route is NOT needed in this story. If a future story (e.g., 9-2 square format or 9-4 standalone preview) needs server-side generation, it can be added then.
- **Architecture specifies `share-cards` Supabase Storage bucket** (public, read-only, 30-day lifecycle) — this is for server-side generated cards with shareable URLs. Since this story uses client-side generation with direct download/share, the storage bucket is NOT needed yet. It will be needed when/if we implement shareable URLs (e.g., `mynewstyle.com/share/abc123`).
- **Web Share API with files** requires HTTPS and a user gesture (button click). The `navigator.canShare({ files: [...] })` check is required before attempting file share — some browsers support `navigator.share` but not file sharing.

### Tech Stack Versions (Relevant)

- **Next.js 16.1.6** (App Router)
- **html-to-image v1.11.13** — `toPng()` for PNG generation (already installed, used by BarberCard)
- **React 19.2.3**
- **Framer Motion v12.34.3** — for button animations
- **lucide-react v0.575.0** — Share2, Loader2 icons (already used in ResultsActionsFooter)
- **sonner v2.0.7** — toast notifications (already used)
- **Vitest v4.0.18** + **React Testing Library v16.3.2** — testing

### Existing Code to Reuse (DO NOT Reinvent)

- `src/hooks/useBarberCard.ts` — Pattern reference for PNG generation hook. Reuse `toDataUrl()` CORS helper (extract to `src/lib/utils/image.ts` if not already shared).
- `src/components/consultation/BarberCardRenderer.tsx` — Pattern reference for off-screen render wrapper.
- `src/components/consultation/BarberCard.tsx` — Pattern reference for inline-styled static render target. Reuse `ACCENT_COLORS` and `FACE_SHAPE_LABELS` (import from existing locations).
- `src/components/consultation/ResultsActionsFooter.tsx` — The component to MODIFY (wire up share card generation to replace URL-only sharing).
- `src/lib/consultation/face-shape-labels.ts` — Face shape label translations (already exists).
- `src/types/index.ts` — All type definitions (FaceAnalysisOutput, StyleRecommendation, PreviewStatus, etc.) already exist. DO NOT create duplicate types.
- `src/stores/consultation.ts` — Zustand store with all consultation data. Already provides: `faceAnalysis`, `photoPreview`, `consultation`, `gender`, `previews`.

### File Structure

- New files:
  - `src/components/share/ShareCardStory.tsx` — static render target (1080x1920 at 2x)
  - `src/components/share/ShareCardStoryRenderer.tsx` — hidden off-screen wrapper
  - `src/hooks/useShareCard.ts` — share card generation hook
  - `src/lib/utils/image.ts` — shared `toDataUrl()` CORS helper (extracted from useBarberCard)
  - `src/test/share-card-story.test.tsx`
  - `src/test/share-card-story-renderer.test.tsx`
  - `src/test/use-share-card.test.ts`
  - `src/test/results-actions-footer-share.test.tsx`
- Modified files:
  - `src/components/consultation/ResultsActionsFooter.tsx` — replace URL-only share with share card generation
  - `src/hooks/useBarberCard.ts` — extract `toDataUrl()` to shared utility, import from there (keep backward compatible)

### Anti-Pattern Prevention

- DO NOT use Tailwind classes in ShareCardStory — html-to-image captures via SVG foreignObject which strips Tailwind. Use ONLY inline `style={}` attributes.
- DO NOT create a server-side rendering API for this story — client-side generation with html-to-image is the established pattern and avoids unnecessary server costs.
- DO NOT create a new Supabase Storage bucket — the `share-cards` bucket is for future server-side generation with shareable URLs, not needed for client-side download.
- DO NOT use `canvas` directly — `html-to-image` abstracts this. The `canvas` package in package.json is for server-side face-api, not for client share cards.
- DO NOT duplicate the `toDataUrl` helper — extract it from `useBarberCard.ts` to a shared utility (`src/lib/utils/image.ts`) and import in both hooks.
- DO NOT duplicate `ACCENT_COLORS` or `FACE_SHAPE_LABELS` — import from existing locations (`BarberCard.tsx` may need its constants exported, or use the canonical `face-shape-labels.ts`).
- DO NOT skip the `navigator.canShare({ files })` check — some browsers support `navigator.share` for text/URL but NOT for file sharing. Always check before attempting file share.
- DO NOT forget to convert the `toPng` data URL to a File/Blob before passing to `navigator.share` — the Web Share API requires a File object for image sharing, not a data URL string.
- DO NOT change the existing barber card functionality — the "Mostrar ao barbeiro" button must continue working exactly as before.
- DO NOT hard-code Portuguese strings in multiple places — keep text in the component but consolidate at the top as constants for future i18n.

### Previous Story Intelligence

- **Story 7-7 (Barber Reference Card)** is the primary pattern reference. It established:
  - Off-screen HTML-to-PNG rendering via `html-to-image` `toPng()`
  - BarberCard (390x600) captured at pixelRatio 2 for sharpness
  - Inline styles required (Tailwind fails in SVG foreignObject)
  - CORS pre-conversion for Supabase Storage URLs via `toDataUrl()`
  - Browser download via dynamically created `<a>` element
  - Toast notifications for success/error
  - `data-testid` attributes for testing captured image elements
- **Story 7-7 learned:** The `className` approach on img elements inside the card fails during html-to-image capture. ALL sizing must be inline `style={}`.
- **Story 6-7 (Results Actions Footer)** created the footer with the "Partilhar resultado" button. Currently it only shares a URL via `navigator.share` or clipboard. This story UPGRADES it to generate a designed image.
- **Story 8-6 (User Profile & History)** was the last completed story. It established the authenticated client helper and profile API patterns, but sharing works for both guests and authenticated users (no auth required to share).

### Git Intelligence

- Commit convention: `feat(epic-9): implement story 9-1-share-card-generator-story-format`
- Recent commits are all Epic 8 (auth & profile). Epic 9 is the first sharing story.
- File patterns: components in `src/components/`, hooks in `src/hooks/`, tests in `src/test/`, utilities in `src/lib/utils/`

### Share Card Visual Specification

**With AI Preview (Before/After Split):**
```
┌─────────────────────────┐ 1080px
│                         │
│    ┌─────────────────┐  │
│    │  User's Photo   │  │
│    │  (ANTES)        │  │
│    │  Full width     │  │
│    │  crop to fill   │  │
│    └─────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │ Rosto Oval        │  │  ← Face shape badge (centered)
│  └───────────────────┘  │
│                         │
│    ┌─────────────────┐  │
│    │  AI Preview     │  │
│    │  (DEPOIS)       │  │
│    │  Full width     │  │
│    │  crop to fill   │  │
│    └─────────────────┘  │
│                         │
│    Textured Crop        │  ← Style name
│                         │
│  Descubra o seu estilo  │  ← Branding
│  em mynewstyle.com      │
│                         │
└─────────────────────────┘ 1920px
```

**Without AI Preview (Analysis Only):**
```
┌─────────────────────────┐ 1080px
│                         │
│                         │
│       ┌───────┐         │
│       │ User  │         │
│       │ Photo │         │  ← Circular, large
│       │       │         │
│       └───────┘         │
│                         │
│    ┌───────────────┐    │
│    │ Rosto Oval    │    │  ← Face shape badge
│    └───────────────┘    │
│                         │
│    Textured Crop        │  ← Style name (large)
│    93% compativel       │  ← Match score
│                         │
│  "A textured crop adds  │  ← First sentence of
│   vertical height..."   │     justification
│                         │
│  Descubra o seu estilo  │  ← Branding
│  em mynewstyle.com      │
│                         │
└─────────────────────────┘ 1920px
```

### Web Share API Reference

```typescript
// Check if file sharing is supported
const file = new File([blob], 'mynewstyle-share-story.png', { type: 'image/png' });
const canShareFile = navigator.canShare?.({ files: [file] });

if (navigator.share && canShareFile) {
  await navigator.share({
    title: 'Meu resultado mynewstyle',
    text: 'Descubra o seu estilo em mynewstyle.com',
    files: [file],
  });
} else {
  // Fallback: download PNG
  const link = document.createElement('a');
  link.download = 'mynewstyle-share-story.png';
  link.href = pngDataUrl;
  link.click();
}
```

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#E9 S9.1] — Story definition: 9:16 aspect ratio, before/after split, branding, face shape badge, high-res PNG, server-side generation
- [Source: _bmad-output/planning-artifacts/architecture.md#5.1 Consultation Flow] — `POST /api/share/generate` with format parameter (deferred to future story)
- [Source: _bmad-output/planning-artifacts/architecture.md#3.3 Storage Buckets] — `share-cards` bucket: public, read-only, 30-day lifecycle (deferred to future story)
- [Source: _bmad-output/planning-artifacts/architecture.md#8.2 Image Optimization] — "Share cards: Pre-rendered PNG at exact social platform dimensions"
- [Source: _bmad-output/planning-artifacts/architecture.md#9.2 Analytics Events] — `share_generated` event with `format: string`
- [Source: _bmad-output/planning-artifacts/ux-design.md#3.7 AI Preview] — Share preview: standalone shareable image (9:16 for stories), watermark "mynewstyle.com", user can download
- [Source: _bmad-output/planning-artifacts/ux-design.md#7 Sharing & Virality] — Three share formats: social story card, barber reference card, "I discovered mynewstyle" link. Share generates a DESIGNED image, not a page screenshot.
- [Source: _bmad-output/planning-artifacts/ux-design.md#8.1 Micro-interactions] — "Share: Card flips to show generated share image preview"
- [Source: _bmad-output/planning-artifacts/prd.md#Growth Features] — "Social sharing with branded result cards"
- [Source: _bmad-output/planning-artifacts/prd.md#Success Criteria] — "Organic sharing rate >= 10%"
- [Source: src/components/consultation/BarberCard.tsx] — Inline-styled static render target pattern (390x600px)
- [Source: src/components/consultation/BarberCardRenderer.tsx] — Hidden off-screen wrapper pattern
- [Source: src/hooks/useBarberCard.ts] — PNG generation hook pattern with CORS handling and browser download
- [Source: src/components/consultation/ResultsActionsFooter.tsx] — Current share handler (URL-only) to be replaced with image generation
- [Source: src/lib/consultation/face-shape-labels.ts] — FACE_SHAPE_LABELS constant to reuse
- [Source: src/stores/consultation.ts] — Zustand store with faceAnalysis, photoPreview, consultation, gender, previews

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No significant debug issues. Key implementation notes:
- jsdom converts hex colors to rgb() in style attributes — tests updated to match both formats
- `document.createElement` spy caused recursion when calling `document.createElement.call(document, tagName)` — fixed by saving `originalCreateElement` at module level before any spy
- `vi.resetModules()` in beforeEach clears module state; `mockShareCardState` object needed explicit reset in each beforeEach

### Completion Notes List

- Implemented ShareCardStory component (540x960 DOM, 1080x1920 at pixelRatio 2) with two layouts: before/after split and analysis-only
- Implemented ShareCardStoryRenderer as hidden off-screen wrapper (same pattern as BarberCardRenderer)
- Implemented useShareCard hook with Web Share API support + download fallback + AbortError handling + analytics placeholder
- Extracted `toDataUrl()` CORS helper from `useBarberCard.ts` to `src/lib/utils/image.ts` (shared utility, backward compatible)
- Wired ShareCardStoryRenderer into ResultsActionsFooter; "Partilhar resultado" button now generates branded share card image
- Updated existing results-actions-footer.test.tsx to reflect the new share behavior (image generation replaces URL-only share)
- All 1834 tests pass (44 new + 0 regressions)

### File List

- src/components/share/ShareCardStory.tsx (new)
- src/components/share/ShareCardStoryRenderer.tsx (new)
- src/hooks/useShareCard.ts (new)
- src/lib/utils/image.ts (new — extracted from useBarberCard)
- src/test/share-card-story.test.tsx (new)
- src/test/share-card-story-renderer.test.tsx (new)
- src/test/use-share-card.test.ts (new)
- src/test/results-actions-footer-share.test.tsx (new)
- src/components/consultation/ResultsActionsFooter.tsx (modified — wire up useShareCard and ShareCardStoryRenderer)
- src/hooks/useBarberCard.ts (modified — import toDataUrl from shared utility)
- src/test/results-actions-footer.test.tsx (modified — updated share handler tests to reflect new image generation behavior)

### Change Log

- 2026-03-02: Implemented story 9-1 — Share Card Generator (Story Format). Added ShareCardStory component (9:16 branded share card with before/after or analysis-only layout), ShareCardStoryRenderer (hidden off-screen wrapper), useShareCard hook (PNG generation + Web Share API + download fallback + analytics placeholder). Wired into ResultsActionsFooter replacing URL-only sharing. Extracted shared toDataUrl utility.
- 2026-03-02: Code review fixes — Fixed Portuguese toast error message diacritics in useShareCard.ts (was "Nao foi possivel", now "Não foi possível"). Fixed branding footer overlap in BeforeAfterLayout (increased style-name bottom padding from 40px to 56px to clear ~51px branding footer). Removed stale eslint-disable-next-line comment from useShareCard.ts deps array. Added explicit eslint-disable comments with explanatory notes for intentional `<img>` usage in ShareCardStory.tsx (html-to-image SVG foreignObject pattern).
