# Story 6.7: Results Actions Footer

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to share, save, or start a new consultation from the results page,
so that I can act on my consultation results with clear, accessible actions.

## Acceptance Criteria

1. A "Partilhar resultado" (Share result) button is displayed that triggers share card generation. On click it invokes the Web Share API (if available) or copies a shareable link to the clipboard with a toast confirmation. Share card generation itself is Epic 9 -- this story wires the button and uses a placeholder share handler.
2. A "Guardar" (Save) button is displayed. On click, if the user is a guest (no auth -- Epic 8 is not yet implemented), it shows a modal/toast: "Crie uma conta para guardar este resultado" with a CTA to the future registration page (`/register`). Since auth is not yet built, the save action is a placeholder that surfaces this prompt.
3. A "Nova consultoria" (New consultation) button resets the consultation flow via `useConsultationStore.reset()` and navigates to `/start`. The button label includes a hint about the returning-user price: "Nova consultoria (€2,99)".
4. A "Voltar ao inicio" (Back to home) link/button navigates to the landing page (`/`).
5. The footer is sticky on mobile (fixed to the bottom of the viewport) and scrolls normally on desktop/tablet (positioned at the end of results content).
6. All buttons follow the design system: primary variant for "Partilhar resultado", secondary for "Guardar" and "Nova consultoria", ghost for "Voltar ao inicio". Minimum 48px touch targets on mobile.
7. Framer Motion entrance animation: slide-up + fade-in (consistent with results page staggered reveal, 150ms delay from previous section). Respects `prefers-reduced-motion`.
8. All buttons and interactive elements are accessible: proper `aria-label` attributes, keyboard navigable, focus-visible rings.
9. All new components and logic have corresponding unit tests covering: rendering of all 4 action buttons, click handlers (share, save-prompt, reset+navigate, navigate-home), sticky behavior class application, accessibility attributes, and reduced motion behavior.

## Tasks / Subtasks

- [ ] Task 1: Create `ResultsActionsFooter` component (AC: 1, 2, 3, 4, 5, 6, 7, 8)
  - [ ] Create `src/components/consultation/ResultsActionsFooter.tsx`
  - [ ] Accept `consultationId: string` prop for future share functionality
  - [ ] Render 4 action buttons: "Partilhar resultado", "Guardar", "Nova consultoria (€2,99)", "Voltar ao inicio"
  - [ ] Use `Button` component from `@/components/ui/button` with correct variants (default, secondary, secondary, ghost)
  - [ ] Use Lucide icons: `Share2` for share, `Bookmark` for save, `PlusCircle` for new consultation, `Home` for back
  - [ ] Layout: vertical stack on mobile, horizontal row on desktop (responsive with Tailwind)
  - [ ] Sticky positioning: `fixed bottom-0 left-0 right-0` on mobile (`md:static md:relative`) with safe-area padding (`pb-[env(safe-area-inset-bottom)]`)
  - [ ] Background: `bg-background/95 backdrop-blur-sm border-t` on mobile sticky mode, transparent on desktop
  - [ ] Max width container aligned with results page content

- [ ] Task 2: Implement share action handler (AC: 1)
  - [ ] Create `handleShare` function inside `ResultsActionsFooter`
  - [ ] Check `navigator.share` availability (Web Share API)
  - [ ] If available: call `navigator.share({ title: 'Meu resultado mynewstyle', url: window.location.href })` wrapped in try/catch (user may cancel)
  - [ ] If unavailable: copy `window.location.href` to clipboard via `navigator.clipboard.writeText()`
  - [ ] Show success toast via `sonner`: "Link copiado!" (when clipboard used) or silently succeed (Web Share handles its own UI)
  - [ ] Note: Full share card generation is Epic 9 (S9.1-S9.3). This story only wires the share trigger.

- [ ] Task 3: Implement save action handler (AC: 2)
  - [ ] Create `handleSave` function inside `ResultsActionsFooter`
  - [ ] Since auth is not implemented (Epic 8), always show the guest prompt
  - [ ] Show toast via `sonner`: "Crie uma conta para guardar este resultado" with action link to `/register`
  - [ ] When Epic 8 is implemented, this handler will check auth state and either save to favorites or prompt registration

- [ ] Task 4: Implement new consultation handler (AC: 3)
  - [ ] Create `handleNewConsultation` function
  - [ ] Call `useConsultationStore.getState().reset()` to clear all consultation state
  - [ ] Navigate to `/start` via `useRouter().push('/start')`
  - [ ] Pattern follows `RefundBanner` component's reset+navigate approach

- [ ] Task 5: Implement back-to-home handler (AC: 4)
  - [ ] Create `handleBackToHome` function
  - [ ] Navigate to `/` via `useRouter().push('/')`

- [ ] Task 6: Add Framer Motion animation (AC: 7)
  - [ ] Wrap footer in `motion.div` with slide-up + fade-in animation
  - [ ] Use `useReducedMotion()` hook from Framer Motion
  - [ ] Animation: `initial: { opacity: 0, y: 24 }`, `animate: { opacity: 1, y: 0 }`, `transition: { duration: 0.4, ease: 'easeOut' }`
  - [ ] When `shouldReduceMotion`: skip animation (empty variants)
  - [ ] The parent `ResultsPage` stagger container will control the 150ms delay

- [ ] Task 7: Integrate into results page (AC: 5)
  - [ ] Import `ResultsActionsFooter` in `src/app/consultation/results/[id]/page.tsx`
  - [ ] Add as the last section in the paid results view (replacing `PaidResultsPlaceholder` content or appending below it)
  - [ ] Pass `consultationId` prop
  - [ ] Ensure it's part of the staggered animation container with `variants={itemVariants}`

- [ ] Task 8: Write unit tests (AC: 9)
  - [ ] Create `src/test/results-actions-footer.test.tsx`
  - [ ] Test all 4 buttons render with correct text and icons
  - [ ] Test share handler: Web Share API path (mock `navigator.share`) and clipboard fallback (mock `navigator.clipboard.writeText`)
  - [ ] Test save handler: toast is shown with registration prompt
  - [ ] Test new consultation: `reset()` called on store and navigation to `/start`
  - [ ] Test back to home: navigation to `/`
  - [ ] Test sticky class is applied for mobile viewport context
  - [ ] Test accessibility: `aria-label` on buttons, role attributes
  - [ ] Test reduced motion: animation variants are empty when `useReducedMotion` returns true
  - [ ] Run full test suite -- all existing + new tests must pass

## Dev Notes

### Architecture Compliance

- **Component location:** `src/components/consultation/ResultsActionsFooter.tsx` follows the established pattern where all consultation-flow components live in `src/components/consultation/`. [Source: architecture.md#6.1 Project Structure]
- **Button component reuse:** Use the existing `Button` from `@/components/ui/button` which already has primary, secondary, ghost variants with correct sizing (48px min-height). DO NOT create custom button styles. [Source: src/components/ui/button.tsx]
- **Zustand store reset:** The `reset()` action on `useConsultationStore` already clears all state and reinitializes `previews` as a new Map. This is the same pattern used by `RefundBanner`. [Source: src/stores/consultation.ts lines 72]
- **Toast notifications:** Use `sonner` (already installed as `src/components/ui/sonner.tsx`) for toast messages. Import `toast` from `sonner` directly. [Source: src/components/ui/sonner.tsx]
- **`src/types/index.ts` is FROZEN:** Do NOT add any types to this file. Define types locally in the component file. [Source: 5-1-stripe-setup-and-configuration.md#Architecture Compliance]
- **Icons from Lucide:** The project uses `lucide-react` for all icons (already installed). Use `Share2`, `Bookmark`, `PlusCircle`, `Home` icons. [Source: ux-design.md#4.2 Icons]
- **Framer Motion for animations:** Already installed and used extensively across the project. Use `motion`, `useReducedMotion` from `framer-motion`. [Source: architecture.md#2.1 Frontend -- Framer Motion]
- **Theme-aware styling:** Use Tailwind design tokens (`bg-background`, `text-foreground`, `text-muted-foreground`, `border`) -- NEVER hardcode colors. Both male (dark) and female (light) themes must work. [Source: ux-design.md#1.1 Visual Identity]

### Sticky Footer Implementation

```typescript
// Mobile: fixed bottom with blur background
// Desktop (md+): static positioning within content flow
<motion.div
  className={cn(
    // Mobile: sticky footer
    'fixed bottom-0 left-0 right-0 z-40',
    'border-t bg-background/95 backdrop-blur-sm',
    'pb-[env(safe-area-inset-bottom)]',
    // Desktop: static within content
    'md:static md:z-auto md:border-t-0 md:bg-transparent md:backdrop-blur-none md:pb-0'
  )}
  {...animationProps}
>
  <div className="mx-auto max-w-2xl px-4 py-4 md:py-8">
    {/* Action buttons */}
  </div>
</motion.div>
```

**Key points:**
- `fixed bottom-0` on mobile creates the sticky footer effect.
- `pb-[env(safe-area-inset-bottom)]` handles iPhone notch/home indicator safe area.
- `bg-background/95 backdrop-blur-sm` creates a frosted glass effect matching the premium design.
- `md:static` on desktop makes it flow naturally with content.
- `z-40` ensures it sits above page content but below modals (z-50).

### Share Handler Implementation

```typescript
const handleShare = async () => {
  const shareData = {
    title: 'Meu resultado mynewstyle',
    text: 'Confira a minha consultoria de visagismo!',
    url: window.location.href,
  };

  try {
    if (navigator.share && navigator.canShare?.(shareData)) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copiado!');
    }
  } catch (error) {
    // User cancelled share dialog -- not an error
    if ((error as DOMException)?.name !== 'AbortError') {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copiado!');
    }
  }
};
```

**Key points:**
- Web Share API is mobile-first (good for this PWA-targeted app).
- `navigator.canShare()` check prevents errors with unsupported share data.
- `AbortError` is thrown when user cancels the share dialog -- NOT an error.
- Clipboard fallback for desktop browsers that don't support Web Share API.
- Full share card generation (social images) is Epic 9 -- this is just URL sharing.

### Save Handler Implementation

```typescript
const handleSave = () => {
  // Auth is not yet implemented (Epic 8)
  // When auth exists: check auth state, save to favorites if authenticated
  toast.info('Crie uma conta para guardar este resultado', {
    action: {
      label: 'Criar conta',
      onClick: () => router.push('/register'),
    },
    duration: 6000,
  });
};
```

**Key points:**
- Sonner toast with `action` prop creates a clickable CTA within the toast.
- 6s duration gives user time to read and click the action.
- When Epic 8 (Auth) is implemented, check `supabase.auth.getSession()` and either save via `POST /api/favorites` or show this prompt.

### Results Page Integration

The current results page renders `PaidResultsPlaceholder` when `paymentStatus === 'paid'`. This story adds `ResultsActionsFooter` below that placeholder content. The placeholder will be replaced by full results content in stories 6-1 through 6-6, but the footer should remain as the last section.

```typescript
// In the paid results branch of AnimatePresence:
<motion.div key="results" {...resultsEntranceVariants}>
  <PaidResultsPlaceholder shouldReduceMotion={shouldReduceMotion} />
  <ResultsActionsFooter consultationId={consultationId} />
</motion.div>
```

**Important:** When stories 6-1 through 6-6 replace `PaidResultsPlaceholder` with actual results sections, `ResultsActionsFooter` must remain as the last element. Since those stories are all backlog (will be implemented after this one), the footer needs to work with the placeholder now and with real content later.

### Spacer for Mobile Sticky Footer

When the footer is `fixed` on mobile, page content behind it gets cut off. Add a spacer div that matches the footer height:

```typescript
{/* Spacer for mobile sticky footer -- prevents content from being hidden behind it */}
<div className="h-[200px] md:h-0" aria-hidden="true" />
```

This ensures the last section of results content is not hidden behind the sticky footer on mobile.

### Project Structure Notes

```
src/
├── app/
│   └── consultation/
│       └── results/
│           └── [id]/
│               └── page.tsx              MODIFIED: add ResultsActionsFooter to paid results view
├── components/
│   └── consultation/
│       └── ResultsActionsFooter.tsx      NEW: actions footer component
└── test/
    └── results-actions-footer.test.tsx   NEW: unit tests
```

**Files that must NOT be modified:**
- `src/types/index.ts` -- types are frozen
- `src/stores/consultation.ts` -- no changes needed, `reset()` already exists
- `src/components/ui/button.tsx` -- button component is complete
- `src/components/consultation/RefundBanner.tsx` -- refund flow unchanged
- `src/components/consultation/Paywall.tsx` -- paywall unchanged

### Library & Framework Requirements

| Library | Version | Usage in This Story |
|---------|---------|---------------------|
| `next` | already installed | `useRouter`, `useParams` for navigation |
| `framer-motion` | already installed | `motion`, `useReducedMotion` for animations |
| `lucide-react` | already installed | `Share2`, `Bookmark`, `PlusCircle`, `Home` icons |
| `sonner` | already installed | `toast` for share/save notifications |
| `zustand` | already installed | `useConsultationStore` for reset action |
| `vitest` | already installed | Test runner |
| `@testing-library/react` | already installed | Component rendering tests |

**0 NEW DEPENDENCIES** -- everything needed is already installed from previous stories.

### Cross-Story Dependencies

- **Story 5.4 (Payment Processing & Unlock) -- DONE:** Established the `handlePaymentSuccess` pattern that sets `paymentStatus: 'paid'` in the store. The results page render logic (`paid` vs `not-paid` vs `refunded`) is already working. [Source: src/app/consultation/results/[id]/page.tsx]
- **Story 5.6 (Receipt & Refund Flow) -- DONE:** The results page AnimatePresence with 3 states (refunded, not-paid, paid) is already implemented. This story adds content to the `paid` branch. [Source: src/app/consultation/results/[id]/page.tsx lines 155-174]
- **Stories 6-1 through 6-6 (Results Page Sections) -- BACKLOG:** These will replace `PaidResultsPlaceholder` with actual face shape analysis, recommendation cards, styles to avoid, grooming tips, and styling tips. The `ResultsActionsFooter` from this story should remain as the LAST element after all those sections are implemented.
- **Epic 8 (Auth & User Profile) -- FUTURE:** When auth is implemented, the "Guardar" button handler should check auth state and save to favorites for authenticated users. Currently it always shows the guest prompt.
- **Epic 9 (Sharing & Virality) -- FUTURE:** When share functionality is implemented (S9.1-S9.3), the "Partilhar resultado" button should trigger share card generation instead of just URL sharing. Currently it uses Web Share API / clipboard fallback.

### Git Intelligence

Recent commits (Epic 5):
```
a9b14c9 chore(epic-5): mark epic-5 as done -- all 6 stories complete
cf66ce0 review(epic-5): code review story 5-6-receipt-and-refund-flow
cccf452 review(epic-5): code review story 5-5-stripe-webhook-handler
9c504b8 feat(epic-5): implement story 5-5-stripe-webhook-handler
5e5fa27 feat(epic-3): implement story 3-6-questionnaire-completion-and-data-submission
```

Patterns established:
- Commit message format: `feat(epic-N): implement story N-X-story-slug`
- Test files in `src/test/` directory (NOT co-located with source files)
- Component testing: `@testing-library/react` with `vi.mock` for stores and router
- Framer Motion in tests: mock `framer-motion` to render children directly
- Sonner in tests: mock `sonner` and verify `toast` calls
- Store mocking: `vi.mock('@/stores/consultation', ...)` with mock functions
- Router mocking: `vi.mock('next/navigation', ...)` with `mockPush` spy

Suggested commit message: `feat(epic-6): implement story 6-7-results-actions-footer`

### Testing Requirements

**ResultsActionsFooter tests (`src/test/results-actions-footer.test.tsx`):**

- Test renders all 4 action buttons with correct labels: "Partilhar resultado", "Guardar", "Nova consultoria (€2,99)", "Voltar ao inicio"
- Test renders correct Lucide icons for each button
- Test share handler calls `navigator.share` when available and supported
- Test share handler falls back to `navigator.clipboard.writeText` when Web Share API is unavailable
- Test share handler catches `AbortError` (user cancel) gracefully without showing error
- Test share handler falls back to clipboard on non-AbortError share failures
- Test save handler shows sonner toast with guest prompt message "Crie uma conta para guardar este resultado"
- Test save handler toast has "Criar conta" action that navigates to `/register`
- Test new consultation handler calls `reset()` on the consultation store
- Test new consultation handler navigates to `/start`
- Test back-to-home handler navigates to `/`
- Test reduced motion: animation variants are empty when `useReducedMotion` returns true
- Test accessibility: each button has appropriate `aria-label`
- Test mobile sticky footer classes are applied (`fixed bottom-0`)

### Critical Guardrails

- **DO NOT** create a custom share service or share card generator. Full share functionality is Epic 9. This story only wires the share trigger with Web Share API / clipboard fallback.
- **DO NOT** implement authentication checking in the save handler. Auth is Epic 8. This story always shows the guest prompt.
- **DO NOT** add types to `src/types/index.ts` -- types are frozen. Define `ResultsActionsFooterProps` locally in the component file.
- **DO NOT** create a new Zustand store or modify `src/stores/consultation.ts`. The existing `reset()` action is sufficient.
- **DO NOT** hardcode colors. Use Tailwind design tokens (`bg-background`, `text-foreground`, `border`) for theme compatibility.
- **DO NOT** forget the mobile safe area padding (`pb-[env(safe-area-inset-bottom)]`). iPhones with gesture navigation need this.
- **DO NOT** forget the spacer div on mobile to prevent content from being hidden behind the sticky footer.
- **DO** use the existing `Button` component from `@/components/ui/button` with proper variant props.
- **DO** use `useReducedMotion()` from `framer-motion` for motion accessibility.
- **DO** handle the Web Share API `AbortError` gracefully (user cancelled -- not an error).
- **DO** ensure the footer works correctly in the AnimatePresence context of the results page.
- **DO** run `npm test` before considering done -- all existing + new tests must pass.

### Environment Variables

No new environment variables required. All needed variables are already configured from previous stories.

### References

- [Source: epics-and-stories.md#S6.7] -- ACs: Share, save, new consultation, back-to-home buttons; sticky footer on mobile
- [Source: ux-design.md#Section G -- Actions Footer] -- "Partilhar resultado", "Nova consultoria", "Guardar", "Voltar ao inicio" button requirements
- [Source: ux-design.md#1.6 Motion] -- Results reveal: staggered 150ms per element, 200ms ease-out micro-interactions
- [Source: ux-design.md#4.1 Core Components] -- Button variants (Primary, Secondary, Ghost), 48px min height mobile
- [Source: ux-design.md#4.2 Icons] -- Lucide icon set: Share, Download, Star (favorito)
- [Source: ux-design.md#5 Responsive Breakpoints] -- Mobile 375px primary target, Tablet 768px for 2-column
- [Source: architecture.md#6.1 Project Structure] -- `src/components/consultation/` for consultation components
- [Source: architecture.md#6.2 State Management] -- Zustand store `reset()` action for clearing consultation state
- [Source: architecture.md#2.1 Frontend] -- Framer Motion for animations, Tailwind CSS + shadcn/ui for styling
- [Source: prd.md#Business & Monetization Model] -- Returning user price: EUR 2.99
- [Source: prd.md#FR29] -- Users can favorite or save specific recommended styles
- [Source: src/components/ui/button.tsx] -- Button component with default/secondary/ghost/destructive variants
- [Source: src/components/consultation/RefundBanner.tsx] -- Pattern for reset+navigate: `reset()` then `router.push('/start')`
- [Source: src/stores/consultation.ts] -- `reset()` action clears all state to initial values
- [Source: src/app/consultation/results/[id]/page.tsx] -- Current results page with AnimatePresence and 3-state rendering

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
