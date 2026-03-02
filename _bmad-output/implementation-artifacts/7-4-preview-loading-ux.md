# Story 7.4: Preview Loading UX

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **an engaging loading animation while my AI preview generates**,
so that **I feel confident something is happening and stay engaged during the 15-60 second wait**.

## Acceptance Criteria

1. User's photo appears in the recommendation card when "Ver como fico" is tapped
2. Animated gradient sweep over hair area (top-down "curtain of light" effect)
3. Floating sparkle particles over the hair zone of the photo
4. Pulsing blur effect on the photo during generation
5. Text cycling through: "A aplicar o estilo...", "A ajustar ao seu rosto...", "Quase pronto..."
6. Other "Ver como fico" buttons are disabled during generation (sequential queue — only one preview generates at a time)
7. Loading state respects `prefers-reduced-motion` — when enabled, use static loading indicator instead of animations
8. Loading state handles error/timeout gracefully (if preview fails after 90s, show "Visualizacao indisponivel" message)
9. Theme-aware: animations use design system tokens that adapt to male/female theme
10. Accessible: all loading states announced via `aria-live` region for screen readers

## Tasks / Subtasks

- [ ] Task 1: Create PreviewLoadingOverlay component (AC: 1, 2, 3, 4, 7, 9)
  - [ ] 1.1 Build component that accepts user's photo and shows it with overlay animations
  - [ ] 1.2 Implement CSS gradient sweep animation (top-down "curtain of light") using Framer Motion
  - [ ] 1.3 Implement floating sparkle particles using Framer Motion (random positions in hair zone)
  - [ ] 1.4 Implement pulsing blur effect on the photo using Tailwind + Framer Motion
  - [ ] 1.5 Implement reduced-motion fallback (static shimmer or simple spinner)
  - [ ] 1.6 Use design system tokens (bg-primary, text-primary-foreground) for theme adaptation

- [ ] Task 2: Create PreviewStatusText component (AC: 5, 10)
  - [ ] 2.1 Build cycling text component with 3 messages, rotating every ~4 seconds
  - [ ] 2.2 Use crossfade animation between messages (Framer Motion AnimatePresence)
  - [ ] 2.3 Add `aria-live="polite"` region so screen readers announce text changes
  - [ ] 2.4 Reduced-motion: static text with no crossfade, just immediate swap

- [ ] Task 3: Create usePreviewGeneration hook (AC: 6, 8)
  - [ ] 3.1 Build hook that manages preview generation state per recommendation
  - [ ] 3.2 Implement sequential queue: only one preview generates at a time
  - [ ] 3.3 Track generation state: 'idle' | 'generating' | 'ready' | 'failed' | 'unavailable'
  - [ ] 3.4 Implement polling logic: poll GET /api/preview/:recommendationId/status every 5 seconds
  - [ ] 3.5 Implement 90-second timeout: if no response, mark as 'failed'
  - [ ] 3.6 Expose `isAnyGenerating` flag to disable other "Ver como fico" buttons
  - [ ] 3.7 Store preview states in consultation store (extend `previews` Map)

- [ ] Task 4: Integrate into HeroRecommendationCard (AC: 1, 6)
  - [ ] 4.1 Replace placeholder `handleVerComoFico` with actual preview generation trigger
  - [ ] 4.2 Show PreviewLoadingOverlay when generation is in progress
  - [ ] 4.3 Disable button when another preview is generating (`isAnyGenerating`)
  - [ ] 4.4 Show disabled state visually (opacity, cursor-not-allowed)

- [ ] Task 5: Integrate into AlternativeRecommendationCard (AC: 1, 6)
  - [ ] 5.1 Wire up existing `onPreviewRequest` callback to actual preview generation
  - [ ] 5.2 Show PreviewLoadingOverlay when generation is in progress
  - [ ] 5.3 Disable button when another preview is generating (`isAnyGenerating`)

- [ ] Task 6: Update consultation store for preview states (AC: 6, 8)
  - [ ] 6.1 Define PreviewStatus type: { status, previewUrl?, error?, startedAt? }
  - [ ] 6.2 Replace `previews: Map<string, unknown>` with properly typed `Map<string, PreviewStatus>`
  - [ ] 6.3 Add actions: `startPreview(recommendationId)`, `updatePreviewStatus(recommendationId, status)`, `setPreviewUrl(recommendationId, url)`
  - [ ] 6.4 Add selector: `isAnyPreviewGenerating` computed from previews Map

- [ ] Task 7: Error/unavailable states (AC: 8)
  - [ ] 7.1 Create PreviewUnavailable component: "Visualizacao indisponivel para este estilo"
  - [ ] 7.2 Create PreviewError component: "Algo correu mal. Tentar de novo?" with retry button
  - [ ] 7.3 Wire retry button to re-trigger preview generation

- [ ] Task 8: Write tests
  - [ ] 8.1 Unit tests for usePreviewGeneration hook (state transitions, timeout, queue)
  - [ ] 8.2 Unit tests for PreviewLoadingOverlay (renders photo, animations, reduced-motion)
  - [ ] 8.3 Unit tests for PreviewStatusText (cycling, aria-live)
  - [ ] 8.4 Integration test: HeroRecommendationCard triggers preview and shows loading
  - [ ] 8.5 Integration test: sequential queue prevents parallel generation

## Dev Notes

### Architecture Patterns and Constraints

- **Framework:** Next.js 14+ App Router with client components (`'use client'`)
- **Animation library:** Framer Motion (already in project, used by ProcessingScreen, ResultsPageAnimatedReveal, HeroRecommendationCard, AlternativeRecommendationCard)
- **State management:** Zustand with sessionStorage persistence (`stores/consultation.ts`)
- **UI components:** shadcn/ui (Button, Card, Badge) from `@/components/ui/`
- **Styling:** Tailwind CSS with design system tokens (bg-primary, text-primary-foreground, etc.)
- **Theme system:** `data-theme="male"/"female"` on `<html>`, use semantic tokens NOT hardcoded colors
- **API pattern:** Client polls `GET /api/preview/:recommendationId/status` every 5 seconds (architecture section 5.1)
- **Preview is on-demand:** Only triggered when user taps "Ver como fico", NOT automatic

### Existing Code to Modify (DO NOT Recreate)

- **`src/components/consultation/HeroRecommendationCard.tsx`** — Replace the placeholder `handleVerComoFico` (line 55-57, currently shows a toast) with actual preview generation. The "Ver como fico" button is already rendered (line 124-132).
- **`src/components/consultation/AlternativeRecommendationCard.tsx`** — Already has `onPreviewRequest` callback prop (line 39). Wire it to the preview hook. The "Ver como fico" button already exists (lines 199-206).
- **`src/stores/consultation.ts`** — The `previews: Map<string, unknown>` field (line 22) and initial state (line 48) already exist but need proper typing. Add preview-specific actions.
- **`src/types/index.ts`** — Add `PreviewStatus` type. The `StyleRecommendation` type exists (line 74-79) but lacks `id` field; add it or use `styleName` as key.

### New Files to Create

- `src/components/consultation/PreviewLoadingOverlay.tsx` — The animated loading overlay with gradient sweep, sparkles, blur
- `src/components/consultation/PreviewStatusText.tsx` — Cycling text component
- `src/components/consultation/PreviewUnavailable.tsx` — "Unavailable" state display
- `src/components/consultation/PreviewError.tsx` — Error state with retry
- `src/hooks/usePreviewGeneration.ts` — Preview generation state management hook

### Animation Implementation Guidance

**Gradient sweep ("curtain of light"):**
Use a Framer Motion `motion.div` with a semi-transparent gradient (from transparent to primary/20 to transparent) that animates `y` from -100% to 100% on a loop. Apply it as an absolute overlay on the photo, clipped to the upper ~60% of the image (hair zone).

**Sparkle particles:**
Use 5-8 small `motion.div` circles with `animate={{ y: [0, -10, 0], opacity: [0.3, 1, 0.3] }}` at random positions in the hair zone. Each particle has a different `transition.delay` for staggered effect. Use `repeat: Infinity`.

**Pulsing blur:**
Apply `filter: blur(2px)` to the photo and animate between `blur(0px)` and `blur(3px)` using Framer Motion's `animate` prop with `repeat: Infinity, repeatType: 'reverse'`.

**Text cycling:**
Use `AnimatePresence` with `mode="wait"` to crossfade between text strings. Key each text by its index. Rotate every 4 seconds using `useEffect` + `setInterval`.

### Polling Pattern (from Architecture)

```typescript
// Expected API contract from architecture section 5.1
// POST /api/preview/generate
//   Body: { consultationId, recommendationId }
//   Returns: { status: 'generating', estimatedSeconds: 45 }

// GET /api/preview/:recommendationId/status
//   Returns: { status: 'generating' | 'ready' | 'failed' | 'unavailable', previewUrl?: string }
```

The API routes do NOT exist yet (they will be created in stories 7-1, 7-2, 7-3). For this story, the hook should:
1. Call `POST /api/preview/generate` to start generation
2. Poll `GET /api/preview/:recommendationId/status` every 5 seconds
3. Handle the API not existing yet — use a mock/stub or check if the API returns 404 and handle gracefully

**Recommendation:** Implement the hook with the real API contract but add a `NEXT_PUBLIC_PREVIEW_MOCK` env flag for development. When mock mode is on, simulate a 10-second delay then return 'ready' with a placeholder image.

### Sequential Queue Logic

Only one preview can generate at a time. When user taps "Ver como fico" on recommendation #2 while #1 is generating:
- Button should be disabled with visual feedback (opacity-50, cursor-not-allowed)
- Optionally show tooltip: "Aguarde a geracao atual terminar"
- DO NOT queue multiple generations — just block the button

### Existing Animation Patterns to Follow

The project already uses these patterns consistently:

1. **Reduced motion:** Check `useReducedMotion()` from `framer-motion` and conditionally skip animations (see `HeroRecommendationCard.tsx` lines 39-48, `AlternativeRecommendationCard.tsx` lines 72-81)
2. **Variants pattern:** Define `Variants` objects, use `initial`/`animate` props (see all existing components)
3. **Stagger pattern:** `staggerChildren` in parent variants (see `ResultsPageAnimatedReveal.tsx` line 58)
4. **AnimatePresence:** Used for expand/collapse in `AlternativeRecommendationCard.tsx` (line 170)

### Design System Tokens (from UX Design)

- Loading animations: continuous, 1.5s loop
- Micro-interactions: 200ms ease-out
- Card shadows: `0 2px 12px rgba(0,0,0,0.08)` (standard), `0 8px 32px rgba(0,0,0,0.12)` (elevated)
- Border radius: 16px for cards, 12px for buttons
- Touch targets: min 48px height for mobile

### ProcessingScreen as Reference

The existing `ProcessingScreen.tsx` (`src/components/consultation/ProcessingScreen.tsx`) uses:
- Pulsing border with `animate-pulse` Tailwind class
- SVG face mesh overlay with staggered `animationDelay`
- Cycling educational tips with `setInterval` + state
- This is a good reference for animation and text cycling patterns

### Project Structure Notes

- All consultation components live in `src/components/consultation/`
- Hooks go in `src/hooks/`
- Store in `src/stores/consultation.ts`
- Types in `src/types/index.ts`
- This follows the established project structure exactly

### Testing Standards

- Test files co-located or in `__tests__/` directories
- Use Vitest (project test runner) + React Testing Library
- Mock Framer Motion for snapshot/unit tests
- Test reduced-motion behavior by mocking `useReducedMotion`
- Test polling with fake timers (`vi.useFakeTimers()`)

### References

- [Source: _bmad-output/planning-artifacts/epics-and-stories.md#S7.4] — Story requirements and AC
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 5.1] — API routes for preview generation and polling
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 14] — Kie.ai integration details, async callback flow
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 4.1] — AI pipeline flow, Step 3 is on-demand preview
- [Source: _bmad-output/planning-artifacts/architecture.md#Section 6.2] — Zustand store with previews Map
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 3.7] — "Ver como fico" loading state specifications
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 8.1] — Micro-interaction: "Ver como fico" button morphs into loading state
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 8.2] — Error state: Preview unavailable gentle message
- [Source: _bmad-output/planning-artifacts/ux-design.md#Section 1.6] — Motion: continuous loading at 1.5s loop
- [Source: src/components/consultation/HeroRecommendationCard.tsx] — Existing placeholder to replace
- [Source: src/components/consultation/AlternativeRecommendationCard.tsx] — Existing onPreviewRequest callback
- [Source: src/stores/consultation.ts] — Zustand store with previews Map to extend
- [Source: src/components/consultation/ProcessingScreen.tsx] — Animation and cycling text patterns

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
