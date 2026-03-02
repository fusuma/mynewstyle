# Story 7.5: Preview Display & Before/After

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want to **compare my original photo with the AI-generated preview using a smooth crossfade reveal and an interactive before/after comparison**,
so that **I can clearly see how the recommended hairstyle looks on me and feel confident about the recommendation before visiting a barber or stylist**.

## Acceptance Criteria

1. When a preview image becomes ready (status transitions from 'generating' to 'ready'), a smooth crossfade animation replaces the loading overlay with the generated preview image
2. On desktop and tablet (>=375px width), an interactive before/after slider allows the user to drag left/right to compare the original photo with the AI preview
3. On small mobile screens (<375px width), toggle buttons "Original" / "Novo Estilo" replace the slider, with a crossfade animation between the two images
4. Expectation framing text is displayed below the preview: "Visualizacao artistica — resultado depende do seu cabelo e cabeleireiro"
5. A subtle watermark "mynewstyle.com" is displayed in the bottom corner of the preview image
6. The before/after slider has a visible, draggable thumb/handle that snaps to center on initial display
7. The slider is touch-friendly with a minimum drag target of 48px and works with both mouse and touch events
8. When the preview status is 'unavailable' (quality gate failed), show "Visualizacao indisponivel para este estilo — veja as recomendacoes escritas" instead of the preview
9. The crossfade transition from loading to preview completes in 500ms with ease-out timing
10. All preview display states respect `prefers-reduced-motion` — when enabled, use instant swap instead of crossfade, and static slider instead of animated transitions
11. Theme-aware: all components use design system tokens that adapt to male/female theme
12. Accessible: preview images have descriptive alt text, slider has aria-label and keyboard support (arrow keys to move slider position)

## Tasks / Subtasks

- [x] Task 1: Create BeforeAfterSlider component (AC: 2, 6, 7, 10, 11, 12)
  - [x] 1.1 Create `src/components/consultation/BeforeAfterSlider.tsx` as a client component
  - [x] 1.2 Implement dual-image layout: original photo on left side, preview on right side, divided by a draggable vertical line
  - [x] 1.3 Use `clip-path` or `overflow: hidden` with variable width to reveal/hide portions of each image as the slider moves
  - [x] 1.4 Implement draggable handle/thumb (48px minimum touch target) centered vertically on the divider line
  - [x] 1.5 Handle pointer events (onPointerDown, onPointerMove, onPointerUp) for unified mouse + touch support
  - [x] 1.6 Initialize slider position at 50% (center) on mount
  - [x] 1.7 Add keyboard support: left/right arrow keys move slider by 5% increments, Home key = 0%, End key = 100%
  - [x] 1.8 Add `aria-label="Comparador antes e depois"`, `role="slider"`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-valuenow={position}`
  - [x] 1.9 Respect `prefers-reduced-motion`: disable smooth drag animation, use instant position updates
  - [x] 1.10 Use design system tokens (border-primary, bg-background, etc.) for handle styling

- [x] Task 2: Create PreviewToggleButtons component for small mobile (AC: 3, 10, 11)
  - [x] 2.1 Create `src/components/consultation/PreviewToggleButtons.tsx` as a client component
  - [x] 2.2 Render two toggle buttons: "Original" and "Novo Estilo"
  - [x] 2.3 Active button uses `bg-primary text-primary-foreground`, inactive uses `bg-muted text-muted-foreground`
  - [x] 2.4 On toggle, crossfade between original and preview images using Framer Motion AnimatePresence with mode="wait"
  - [x] 2.5 Reduced-motion: instant swap without crossfade animation
  - [x] 2.6 Min button height 48px for touch accessibility

- [x] Task 3: Create PreviewDisplay component (AC: 1, 4, 5, 8, 9, 10, 11, 12)
  - [x] 3.1 Create `src/components/consultation/PreviewDisplay.tsx` as a client component
  - [x] 3.2 Accept props: `originalPhoto: string`, `previewUrl: string | null`, `previewStatus: PreviewStatus['status']`, `styleName: string`
  - [x] 3.3 When `previewStatus === 'ready'` and `previewUrl` is set: render the before/after comparison view
  - [x] 3.4 Implement crossfade transition from loading state to preview display (500ms, ease-out) using Framer Motion
  - [x] 3.5 Render BeforeAfterSlider on screens >=375px (using Tailwind `hidden` / `block` responsive classes, NO window.innerWidth)
  - [x] 3.6 Render PreviewToggleButtons on screens <375px (using Tailwind responsive classes)
  - [x] 3.7 Display expectation text below: "Visualizacao artistica — resultado depende do seu cabelo e cabeleireiro"
  - [x] 3.8 Render watermark "mynewstyle.com" positioned absolute bottom-right with low opacity (opacity-30 to opacity-40)
  - [x] 3.9 When `previewStatus === 'unavailable'`: display message "Visualizacao indisponivel para este estilo — veja as recomendacoes escritas" with info icon
  - [x] 3.10 When `previewStatus === 'failed'`: delegate to PreviewError component (from story 7-4)
  - [x] 3.11 Add alt text to preview image: `"Visualizacao IA: {styleName} aplicado ao seu rosto"`
  - [x] 3.12 Reduced-motion: instant swap instead of crossfade

- [x] Task 4: Integrate PreviewDisplay into HeroRecommendationCard (AC: 1, 2, 3)
  - [x] 4.1 Import PreviewDisplay in `src/components/consultation/HeroRecommendationCard.tsx`
  - [x] 4.2 After the loading overlay completes (status becomes 'ready'), render PreviewDisplay inside the card
  - [x] 4.3 Pass the user's `photoPreview` from consultation store as `originalPhoto`
  - [x] 4.4 Pass `previewUrl` and `previewStatus` from the `usePreviewGeneration` hook (created in story 7-4)
  - [x] 4.5 Conditionally render: show PreviewDisplay when preview is in 'ready' or 'unavailable' state; show loading overlay when 'generating'

- [x] Task 5: Integrate PreviewDisplay into AlternativeRecommendationCard (AC: 1, 2, 3)
  - [x] 5.1 Import PreviewDisplay in `src/components/consultation/AlternativeRecommendationCard.tsx`
  - [x] 5.2 Render PreviewDisplay inside expanded content when preview status is 'ready' or 'unavailable'
  - [x] 5.3 Pass same props pattern as HeroRecommendationCard integration

- [x] Task 6: Write tests
  - [x] 6.1 Unit tests for BeforeAfterSlider: renders both images, initial position at 50%, pointer drag updates position, keyboard navigation (arrow keys, Home, End), aria attributes, reduced-motion behavior
  - [x] 6.2 Unit tests for PreviewToggleButtons: renders both buttons, toggle state switches active/inactive styling, crossfade animation fires, reduced-motion instant swap
  - [x] 6.3 Unit tests for PreviewDisplay: renders slider on >=375px mock, renders toggle on <375px mock, crossfade from loading to ready, shows unavailable message, shows expectation text, shows watermark, alt text present
  - [x] 6.4 Integration test: HeroRecommendationCard shows PreviewDisplay when preview is ready
  - [x] 6.5 Integration test: AlternativeRecommendationCard shows PreviewDisplay when preview is ready

## Dev Notes

### Architecture Patterns and Constraints

- **Framework:** Next.js 14+ App Router with client components (`'use client'`)
- **Animation library:** Framer Motion (already in project, used extensively across consultation components)
- **State management:** Zustand with sessionStorage persistence (`stores/consultation.ts`)
- **UI components:** shadcn/ui (Button, Card, Badge) from `@/components/ui/`
- **Styling:** Tailwind CSS with design system tokens (bg-primary, text-primary-foreground, etc.)
- **Theme system:** `data-theme="male"/"female"` on `<html>`, use semantic tokens NOT hardcoded colors
- **Responsive approach:** Use Tailwind responsive classes (`hidden`, `block`, `sm:hidden`, etc.) -- do NOT use `window.innerWidth` or resize listeners. This is the established pattern in the project (see `AlternativeRecommendationCard.tsx` line 142: `md:hidden`, line 167: `md:block`).
- **Preview is on-demand:** Only triggered when user taps "Ver como fico", NOT automatic

### Existing Code to Modify (DO NOT Recreate)

- **`src/components/consultation/HeroRecommendationCard.tsx`** -- The card currently has a "Ver como fico" button (line 124-132) and a placeholder handler (line 55-57). Story 7-4 adds the loading overlay. This story adds the PreviewDisplay component that appears after loading completes. Insert the PreviewDisplay inside the CardContent, between the button and the end of the card, conditionally rendered when preview status is 'ready' or 'unavailable'.

- **`src/components/consultation/AlternativeRecommendationCard.tsx`** -- Has expandable content section (lines 161-208) with a "Ver como fico" button (lines 199-206). Add PreviewDisplay below the button inside the expandable content, conditionally rendered.

- **`src/stores/consultation.ts`** -- The store has `previews: Map<string, unknown>` (line 22, initial state line 48). Story 7-4 types this properly. This story reads preview state via the `usePreviewGeneration` hook (from story 7-4), it does NOT modify the store directly.

- **`src/types/index.ts`** -- The `StyleRecommendation` type (lines 74-79) may need an `id` field for preview key mapping. Story 7-4 may add a `PreviewStatus` type. This story uses those types but should add `PreviewDisplayProps` interface if needed.

### New Files to Create

- `src/components/consultation/BeforeAfterSlider.tsx` -- Interactive before/after comparison slider with drag handle
- `src/components/consultation/PreviewToggleButtons.tsx` -- Toggle buttons for small mobile screens
- `src/components/consultation/PreviewDisplay.tsx` -- Orchestrator component that chooses slider vs toggle based on screen size, handles crossfade, shows expectation text and watermark

### Dependencies on Previous Stories

This story depends on components and hooks created in stories 7-1 through 7-4:

- **Story 7-1 (Kie.ai Integration):** Creates `POST /api/preview/generate` and `GET /api/preview/:recommendationId/status` API routes. This story's components poll these APIs via the hook from story 7-4.
- **Story 7-2 (Webhook Handler):** Creates `POST /api/webhook/kie` that processes Kie.ai callbacks and stores preview images in Supabase Storage. The `previewUrl` displayed by this story's components points to these stored images.
- **Story 7-3 (Face Similarity Check):** Implements the quality gate. When a preview fails the similarity check, `preview_status` is set to `'unavailable'`. This story handles that state by showing the unavailable message (AC: 8).
- **Story 7-4 (Preview Loading UX):** Creates:
  - `usePreviewGeneration` hook -- manages preview generation state, polling, sequential queue
  - `PreviewLoadingOverlay` component -- the loading animation this story's crossfade transitions FROM
  - `PreviewStatusText` component -- cycling status text during loading
  - `PreviewUnavailable` component -- may be reused or referenced for the unavailable state
  - `PreviewError` component -- reused for the 'failed' state in this story
  - Extends the consultation store with typed `PreviewStatus` and preview actions

**If story 7-4 components are not yet implemented:** Implement PreviewDisplay to accept `previewStatus` as a prop and handle all states independently. The loading-to-ready crossfade can be simulated with a local state transition.

### BeforeAfterSlider Implementation Guidance

**Layout approach:**
```
┌─────────────────────────────┐
│  Original  │  AI Preview    │
│  (left)    │  (right)       │
│            │                │
│         [drag handle]       │
│            │                │
└─────────────────────────────┘
```

Use two absolutely-positioned images stacked on top of each other. The top image (preview) has a `clip-path: inset(0 {100-position}% 0 0)` or is contained in a div with `width: {position}%` and `overflow: hidden`. The bottom image (original) fills the full container.

**Pointer event pattern:**
```typescript
const containerRef = useRef<HTMLDivElement>(null);
const [position, setPosition] = useState(50);
const [isDragging, setIsDragging] = useState(false);

const handlePointerDown = (e: React.PointerEvent) => {
  setIsDragging(true);
  (e.target as HTMLElement).setPointerCapture(e.pointerId);
};

const handlePointerMove = (e: React.PointerEvent) => {
  if (!isDragging || !containerRef.current) return;
  const rect = containerRef.current.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
  setPosition(percent);
};

const handlePointerUp = () => setIsDragging(false);
```

**Handle styling:**
The drag handle should be a vertical line (2px wide, full height) with a circular grabber in the center (32-48px diameter). Use `border-primary` for the line color, `bg-background` for the circle background. Add a subtle shadow for depth. On the grabber, display left/right chevron arrows to indicate draggability.

### Crossfade Implementation

Use Framer Motion's `AnimatePresence` with `mode="wait"`:

```typescript
<AnimatePresence mode="wait">
  {previewStatus === 'generating' && (
    <motion.div
      key="loading"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
    >
      <PreviewLoadingOverlay ... />
    </motion.div>
  )}
  {previewStatus === 'ready' && previewUrl && (
    <motion.div
      key="preview"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } }}
    >
      <PreviewDisplay ... />
    </motion.div>
  )}
</AnimatePresence>
```

For reduced-motion: skip the animation, use `initial={{ opacity: 1 }}` directly.

### Responsive Breakpoint Strategy

The UX design specifies:
- **<375px (Mobile S):** Toggle buttons "Original" / "Novo Estilo" with crossfade
- **>=375px:** Before/after slider with drag handle

Implementation with Tailwind (NO JavaScript viewport detection):
```tsx
{/* Slider -- hidden on smallest screens, shown on 375px+ */}
<div className="hidden min-[375px]:block">
  <BeforeAfterSlider ... />
</div>

{/* Toggle buttons -- shown on smallest screens, hidden on 375px+ */}
<div className="block min-[375px]:hidden">
  <PreviewToggleButtons ... />
</div>
```

Note: Tailwind's default `sm:` breakpoint is 640px. Since the design spec uses 375px, use the arbitrary breakpoint `min-[375px]:` syntax.

### Watermark Implementation

Position the watermark as an absolutely-positioned element within the preview container:

```tsx
<div className="relative">
  {/* Preview image */}
  <img src={previewUrl} alt="..." className="w-full" />
  {/* Watermark */}
  <span className="absolute bottom-2 right-2 text-xs font-medium text-foreground/30 select-none pointer-events-none">
    mynewstyle.com
  </span>
</div>
```

The watermark should:
- Use `text-foreground/30` for theme-adaptive low opacity (works on both dark/light themes)
- Be `select-none` and `pointer-events-none` so it doesn't interfere with slider interaction
- Use `text-xs` (12px) to be subtle but legible

### Image Loading and Display

Preview images are served from Supabase Storage. The URL comes from `previewUrl` in the preview status object. Use Next.js `<Image>` component for optimization:

```tsx
import Image from 'next/image';

<Image
  src={previewUrl}
  alt={`Visualizacao IA: ${styleName} aplicado ao seu rosto`}
  fill
  className="object-cover"
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

However, since Supabase Storage URLs are dynamic (signed URLs), you may need to configure `next.config.js` with the Supabase Storage hostname in `images.remotePatterns`. If already configured (from photo upload stories), no change needed.

**Fallback:** If `<Image>` causes issues with signed URLs, use a standard `<img>` tag with explicit width/height styling. The architecture prioritizes working UX over Next.js image optimization for dynamic AI-generated content.

### Existing Animation Patterns to Follow

The project uses these patterns consistently:

1. **Reduced motion:** Check `useReducedMotion()` from `framer-motion` and conditionally skip animations (see `HeroRecommendationCard.tsx` lines 39-48, `AlternativeRecommendationCard.tsx` lines 72-81)
2. **Variants pattern:** Define `Variants` objects, use `initial`/`animate` props
3. **AnimatePresence:** Used for expand/collapse in `AlternativeRecommendationCard.tsx` (line 170), use `mode="wait"` for crossfade transitions
4. **Theme tokens:** Always use semantic tokens (`bg-primary`, `text-primary-foreground`, `bg-muted`, etc.) -- never hardcode hex colors

### Design System Tokens (from UX Design)

- Micro-interactions: 200ms ease-out
- Page transitions: 350ms ease-in-out
- Crossfade transition: 500ms (specified in AC #9)
- Card shadows: `0 2px 12px rgba(0,0,0,0.08)` (standard), `0 8px 32px rgba(0,0,0,0.12)` (elevated)
- Preview image shadow: `0 12px 48px rgba(0,0,0,0.2)`
- Border radius: 16px for cards, 12px for buttons, 20px for rounded photo frames
- Touch targets: min 48px height for mobile
- Before/after slider thumb: snaps to center on release (UX spec section 8.1)

### Project Structure Notes

- All consultation components live in `src/components/consultation/`
- Hooks go in `src/hooks/`
- Store in `src/stores/consultation.ts`
- Types in `src/types/index.ts`
- This follows the established project structure exactly
- NO files should be created outside these directories

### Testing Standards

- Test files co-located or in `__tests__/` directories
- Use Vitest (project test runner) + React Testing Library
- Mock Framer Motion for snapshot/unit tests
- Test reduced-motion behavior by mocking `useReducedMotion`
- Test pointer events with `fireEvent.pointerDown`, `fireEvent.pointerMove`, `fireEvent.pointerUp`
- Test keyboard navigation with `fireEvent.keyDown` (ArrowLeft, ArrowRight, Home, End)
- Test responsive rendering by mocking container width or using media query mocks
- Use `data-testid` attributes for reliable test selectors

### Previous Story Learnings (from Story 7-4)

- The `usePreviewGeneration` hook manages preview state and polling. Reuse it -- do NOT create separate state management for preview display.
- `PreviewUnavailable` and `PreviewError` components already exist (created in story 7-4). Reuse or import them -- do NOT recreate.
- The sequential queue logic (only one preview generating at a time) is handled by the hook. The display component just reads state.
- The `PreviewLoadingOverlay` component from story 7-4 is what this story's crossfade transitions FROM. Ensure the AnimatePresence exit animation on the overlay is coordinated with the entrance of PreviewDisplay.

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#S7.5] -- Story requirements and AC
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 3.7] -- "Ver como fico" result display: crossfade, before/after slider, toggle buttons, expectation framing, quality gate
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 8.1] -- Micro-interaction: before/after slider thumb snaps to center on release
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 8.2] -- Error state: "Visualizacao indisponivel para este estilo"
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 1.6] -- Motion timings: micro-interactions 200ms, page transitions 350ms
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 1.5] -- Shadows: preview image shadow 0 12px 48px rgba(0,0,0,0.2)
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 6.1] -- Frontend project structure: components/consultation/BeforeAfterSlider.tsx listed
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 5.1] -- API route GET /api/preview/:recommendationId/status returns {status, previewUrl?}
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 14] -- Kie.ai async callback flow: client polls, detects status='ready', displays with crossfade
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 8.2] -- Image optimization: Next.js Image with responsive srcset, preview display
- [Source: _bmad-output/planning-artifacts/prd.md#FR23] -- Users can compare original photo with AI preview using side-by-side or slider view
- [Source: _bmad-output/planning-artifacts/prd.md#FR20] -- Users can generate an AI visual preview showing themselves with a recommended hairstyle
- [Source: src/components/consultation/HeroRecommendationCard.tsx] -- Existing card to integrate PreviewDisplay into
- [Source: src/components/consultation/AlternativeRecommendationCard.tsx] -- Existing card to integrate PreviewDisplay into
- [Source: src/components/consultation/ResultsPageAnimatedReveal.tsx] -- Results page orchestrator, animation pattern reference
- [Source: src/stores/consultation.ts] -- Zustand store with previews Map and photoPreview
- [Source: src/types/index.ts] -- StyleRecommendation type, Consultation type
- [Source: _bmad-output/implementation-artifacts/7-4-preview-loading-ux.md] -- Previous story: PreviewLoadingOverlay, usePreviewGeneration hook, PreviewUnavailable, PreviewError components

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Fixed `setPointerCapture` not available in jsdom — added guard `if (target.setPointerCapture)` in BeforeAfterSlider
- Fixed ESLint `react-hooks/refs` violation — refactored preview image from using `containerRef.current.offsetWidth` during render to using `clip-path: inset()` approach instead
- Fixed duplicate watermark elements causing `getByText` ambiguity in tests — removed second watermark

### Completion Notes List

- Created `BeforeAfterSlider` component with clip-path reveal technique (cleaner than overflow/width approach), pointer events (mouse+touch), keyboard navigation (ArrowLeft/Right 5% increments, Home/End), full ARIA slider semantics, 48px touch target handle with dual-chevron icon
- Created `PreviewToggleButtons` component with "Original"/"Novo Estilo" buttons, Framer Motion AnimatePresence crossfade (mode="wait"), reduced-motion instant swap, min-h-[48px] touch accessibility, design system token styling
- Created `PreviewDisplay` orchestrator: uses Tailwind `hidden min-[375px]:block` / `block min-[375px]:hidden` for responsive slider vs toggle (no JavaScript viewport detection), Framer Motion 500ms ease-out crossfade, expectation framing text, watermark, unavailable state with Info icon, failed state delegates to PreviewError
- Integrated PreviewDisplay into HeroRecommendationCard (replaced direct img + PreviewUnavailable with PreviewDisplay for ready/unavailable states)
- Integrated PreviewDisplay into AlternativeRecommendationCard (same pattern)
- Removed now-unused imports of `PreviewUnavailable` and `PreviewError` from both card components (PreviewDisplay handles these states internally)
- All 1490 tests pass (104 test files), 50 new tests added across 5 test files, zero regressions, linter clean

### File List

- src/components/consultation/BeforeAfterSlider.tsx (new)
- src/components/consultation/PreviewToggleButtons.tsx (new)
- src/components/consultation/PreviewDisplay.tsx (new)
- src/components/consultation/HeroRecommendationCard.tsx (modified)
- src/components/consultation/AlternativeRecommendationCard.tsx (modified)
- src/test/before-after-slider.test.tsx (new)
- src/test/preview-toggle-buttons.test.tsx (new)
- src/test/preview-display.test.tsx (new)
- src/test/preview-display-hero-integration.test.tsx (new)
- src/test/preview-display-alternative-integration.test.tsx (new)

### Change Log

- 2026-03-02: Implemented story 7.5 — BeforeAfterSlider, PreviewToggleButtons, PreviewDisplay components created; integrated into HeroRecommendationCard and AlternativeRecommendationCard; 50 tests added; all ACs satisfied
- 2026-03-02: Code review fixes applied — (1) Fixed TypeScript error: `ease: 'easeOut'` not typed as `const` in PreviewDisplay and PreviewToggleButtons; (2) Fixed AC#5 violation: watermark now shown on toggle view (added to PreviewToggleButtons for novo-estilo tab); (3) Fixed inverted reduced-motion logic in BeforeAfterSlider (`shouldReduceMotion ? 'transition-none' : ''`); (4) Fixed BeforeAfterSlider original image height: removed `h-full` so container is sized by intrinsic image dimensions; (5) Added `aria-valuetext` to slider handle for better screen reader support; (6) Improved cursor to `col-resize` on slider container for standard UX; all 1490 tests pass, zero regressions
