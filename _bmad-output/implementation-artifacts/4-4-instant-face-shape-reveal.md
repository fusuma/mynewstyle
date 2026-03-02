# Story 4.4: Instant Face Shape Reveal

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see my face shape result immediately after AI analysis completes,
so that I receive immediate, tangible value within 10 seconds of submitting my photo — before any payment is required.

## Acceptance Criteria

1. The `/consultation/processing` page calls `POST /api/consultation/analyze` using the stored `consultationId` and `photoPreview` (base64) from the Zustand store after the page loads
2. While the AI analysis is in progress, an animated processing screen is shown: user's photo centered, animated face mesh overlay (dots connecting on forehead/jawline/cheekbones), text "A analisar o formato do seu rosto...", and a pulsing glow around the photo
3. When the `faceAnalysis` result is returned, the face shape result is revealed with an animated transition: a large badge showing the face shape in Portuguese (e.g., "Rosto Oval"), a confidence score "X% de certeza" below the badge, and a 2–3 sentence explanation of the face shape
4. The face shape badge text is in Portuguese — the seven shapes map to: `oval → "Oval"`, `round → "Redondo"`, `square → "Quadrado"`, `oblong → "Oblongo"`, `heart → "Coração"`, `diamond → "Diamante"`, `triangle → "Triangular"`
5. The reveal animation uses a slide-up + fade-in effect (Framer Motion), with a duration of approximately 500ms
6. The face shape result and confidence score are stored in the Zustand store's `faceAnalysis` field
7. After the reveal is shown, a "Continuar" button appears (also animated, staggered 200ms after the badge) — tapping it navigates to `/consultation/results/:id` where `:id` is the `consultationId`
8. If the API call returns a non-2xx status (422, 500, network error), an error state is displayed: "Algo correu mal. Tentar de novo?" with a retry button that re-triggers the analysis call
9. The processing page correctly redirects to `/consultation/questionnaire` if no `consultationId` is present in the store (guard already exists in current implementation — preserve this behavior)
10. All existing 802 tests pass with zero regressions after implementation

## Tasks / Subtasks

- [x] Task 1: Replace stub processing page with full face analysis + reveal UI (AC: 1, 2, 3, 4, 5, 6, 7, 8, 9)
  - [x] Add `setFaceAnalysis` action to `ConsultationStore` in `src/stores/consultation.ts`
  - [x] Create `src/components/consultation/FaceShapeReveal.tsx` — the animated reveal component
  - [x] Create `src/components/consultation/ProcessingScreen.tsx` — the loading state component with face mesh animation
  - [x] Update `src/app/consultation/processing/page.tsx` to orchestrate the full flow: fetch → loading state → reveal → navigate
  - [x] Implement the Portuguese face shape label mapping utility (pure function, no side effects)
  - [x] Wire `photoPreview` from store as base64 for the API call body
  - [x] Add "Continuar" button with staggered animation (200ms after reveal badge)
  - [x] Handle error state with retry button

- [x] Task 2: Write tests (AC: 1–10)
  - [x] Create `src/test/processing-page.test.tsx`
  - [x] Test: page calls `POST /api/consultation/analyze` on mount with correct body
  - [x] Test: loading state shows animated processing screen while awaiting API
  - [x] Test: successful response → reveals FaceShapeReveal component with correct Portuguese label + confidence score
  - [x] Test: each of the 7 face shapes maps to the correct Portuguese label
  - [x] Test: `faceAnalysis` stored in Zustand store after successful response
  - [x] Test: "Continuar" button visible after reveal, navigates to `/consultation/results/:id`
  - [x] Test: API 422 → shows error state with retry button
  - [x] Test: API 500 → shows error state with retry button
  - [x] Test: network error → shows error state with retry button
  - [x] Test: retry button re-triggers the analysis call
  - [x] Test: no consultationId → redirects to `/consultation/questionnaire` (preserve existing guard)
  - [x] Run full test suite to verify 802 + new tests all pass (827 total)

## Dev Notes

### Architecture Compliance

- **Processing page location:** `src/app/consultation/processing/page.tsx` — this is the EXISTING file to be REPLACED entirely (not a new file). It currently has a stub spinner. Story 4.4 transforms it into the full face shape reveal experience. [Source: architecture.md#6.1]
- **`ProcessingScreen` component:** Create at `src/components/consultation/ProcessingScreen.tsx`. Named `ProcessingScreen` to match the architecture spec. [Source: architecture.md#6.1]
- **Analyze API call:** Call `POST /api/consultation/analyze` with `{ consultationId, photoBase64 }`. This API was fully implemented in Story 4.3. The response is `{ faceAnalysis: FaceAnalysisOutput }`. [Source: 4-3-face-analysis.md]
- **Zustand store:** The `faceAnalysis` field already exists in `ConsultationStore` typed as `unknown | null`. In this story, add a `setFaceAnalysis` action and update the type to `FaceAnalysisOutput | null` (import from `@/lib/ai/schemas`). The store uses `sessionStorage` persistence — `faceAnalysis` is currently excluded from the partialize function (comment says "re-fetched from API"). Keep it excluded from persistence (no change to partialize). [Source: src/stores/consultation.ts]
- **Framer Motion:** Already installed at `^12.34.3`. Use `motion.div` with `initial`, `animate`, `transition` props. For the reveal: `initial={{ opacity: 0, y: 20 }}`, `animate={{ opacity: 1, y: 0 }}`, `transition={{ duration: 0.5, ease: 'easeOut' }}`. For the "Continuar" button: add `transition={{ delay: 0.2 }}` for the 200ms stagger. [Source: architecture.md#2.1, package.json]
- **Client component:** `processing/page.tsx` must keep `'use client'` directive — it uses `useEffect`, `useRouter`, and `useState`. [Source: existing processing/page.tsx]
- **Photo base64 source:** `photoPreview` in the Zustand store is a data URL string (e.g., `"data:image/jpeg;base64,/9j/..."`). To send as `photoBase64` for the API, strip the data URL prefix: `photoPreview.split(',')[1]`. The API route expects raw base64, not the data URL prefix. [Source: src/stores/consultation.ts, 4-3-face-analysis.md]
- **`reducedMotion`:** Respect `prefers-reduced-motion` CSS media query in Framer Motion animations. Use `useReducedMotion()` hook from Framer Motion and conditionally disable animations. [Source: ux-design.md#6 Accessibility]

### Technical Requirements

**Zustand store update (`src/stores/consultation.ts`):**
```typescript
// Add to ConsultationStore interface:
faceAnalysis: FaceAnalysisOutput | null;
setFaceAnalysis: (analysis: FaceAnalysisOutput) => void;

// Add to create() implementation:
setFaceAnalysis: (analysis) => set({ faceAnalysis: analysis }),
```

**Import needed in store:**
```typescript
import { FaceAnalysisOutput } from '@/lib/ai/schemas';
// or
import type { FaceAnalysisOutput } from '@/lib/ai/schemas/face-analysis.schema';
```

**Portuguese face shape label mapping (pure utility function):**
```typescript
// Can be defined inline in FaceShapeReveal.tsx or extracted to a small utility
const FACE_SHAPE_LABELS: Record<FaceAnalysisOutput['faceShape'], string> = {
  oval: 'Oval',
  round: 'Redondo',
  square: 'Quadrado',
  oblong: 'Oblongo',
  heart: 'Coração',
  diamond: 'Diamante',
  triangle: 'Triangular',
};
```

**Processing page orchestration pattern:**
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useConsultationStore } from '@/stores/consultation';
import { FaceAnalysisOutput } from '@/lib/ai/schemas';
import { ProcessingScreen } from '@/components/consultation/ProcessingScreen';
import { FaceShapeReveal } from '@/components/consultation/FaceShapeReveal';

type PageState = 'loading' | 'revealed' | 'error';

export default function ProcessingPage() {
  const router = useRouter();
  const consultationId = useConsultationStore((state) => state.consultationId);
  const photoPreview = useConsultationStore((state) => state.photoPreview);
  const setFaceAnalysis = useConsultationStore((state) => state.setFaceAnalysis);

  const [pageState, setPageState] = useState<PageState>('loading');
  const [faceAnalysis, setLocalFaceAnalysis] = useState<FaceAnalysisOutput | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Guard: redirect if no consultationId
  useEffect(() => {
    if (!consultationId) {
      router.replace('/consultation/questionnaire');
    }
  }, [consultationId, router]);

  const runAnalysis = async () => {
    if (!consultationId || !photoPreview) return;
    setPageState('loading');
    setErrorMessage(null);

    try {
      const photoBase64 = photoPreview.split(',')[1]; // strip data URL prefix
      const response = await fetch('/api/consultation/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultationId, photoBase64 }),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const data = await response.json();
      const analysis: FaceAnalysisOutput = data.faceAnalysis;

      setFaceAnalysis(analysis);         // Store in Zustand
      setLocalFaceAnalysis(analysis);    // Local state for render
      setPageState('revealed');
    } catch {
      setPageState('error');
      setErrorMessage('Algo correu mal. Tentar de novo?');
    }
  };

  useEffect(() => {
    if (consultationId && photoPreview) {
      runAnalysis();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!consultationId) return null;

  if (pageState === 'loading') {
    return <ProcessingScreen photoPreview={photoPreview} />;
  }

  if (pageState === 'error') {
    return (
      <ErrorState message={errorMessage} onRetry={runAnalysis} />
    );
  }

  if (pageState === 'revealed' && faceAnalysis) {
    return (
      <FaceShapeReveal
        faceAnalysis={faceAnalysis}
        onContinue={() => router.push(`/consultation/results/${consultationId}`)}
      />
    );
  }

  return null;
}
```

**`ProcessingScreen` component spec:**
```typescript
// src/components/consultation/ProcessingScreen.tsx
'use client';

interface ProcessingScreenProps {
  photoPreview: string | null;
}

export function ProcessingScreen({ photoPreview }: ProcessingScreenProps) {
  // Animated face mesh overlay (CSS-based pulsing dots)
  // Photo centered with pulsing glow (box-shadow animation via Tailwind animate-pulse)
  // Text: "A analisar o formato do seu rosto..."
  // Rotating educational tips (useInterval hook or CSS animation)
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      {/* User's photo with animated pulsing glow */}
      {photoPreview && (
        <div className="relative mb-8">
          <div className="animate-pulse rounded-full border-4 border-primary/50 p-1">
            <img
              src={photoPreview}
              alt="Your photo being analyzed"
              className="h-48 w-48 rounded-full object-cover"
            />
          </div>
          {/* Face mesh overlay dots (decorative, CSS animated) */}
          <FaceMeshOverlay />
        </div>
      )}
      <h1 className="text-lg font-semibold text-foreground">
        A analisar o formato do seu rosto...
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Normalmente demora menos de 10 segundos
      </p>
      <EducationalTip />
    </div>
  );
}
```

**`FaceShapeReveal` component spec:**
```typescript
// src/components/consultation/FaceShapeReveal.tsx
'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { FaceAnalysisOutput } from '@/lib/ai/schemas';

interface FaceShapeRevealProps {
  faceAnalysis: FaceAnalysisOutput;
  onContinue: () => void;
}

const FACE_SHAPE_LABELS: Record<FaceAnalysisOutput['faceShape'], string> = {
  oval: 'Oval',
  round: 'Redondo',
  square: 'Quadrado',
  oblong: 'Oblongo',
  heart: 'Coração',
  diamond: 'Diamante',
  triangle: 'Triangular',
};

const FACE_SHAPE_DESCRIPTIONS: Record<FaceAnalysisOutput['faceShape'], string> = {
  oval: 'O rosto oval é considerado o formato mais versátil. As maçãs do rosto são ligeiramente mais largas que a testa e o queixo é levemente arredondado. Praticamente qualquer estilo de cabelo fica bem neste formato.',
  round: 'O rosto redondo tem largura e comprimento semelhantes, com bochechas cheias e queixo arredondado. Cortes que adicionam altura no topo e reduzem volume nas laterais criam um visual mais alongado.',
  square: 'O rosto quadrado é caracterizado por uma testa larga, maçãs do rosto e queixo com larguras semelhantes, com ângulos marcados. Cortes com volume no topo e laterais mais curtas equilibram as proporções.',
  oblong: 'O rosto oblongo é mais comprido do que largo, com testa, maçãs do rosto e queixo de larguras semelhantes. Cortes com volume nas laterais e franja ajudam a equilibrar o comprimento do rosto.',
  heart: 'O rosto em coração tem testa mais larga que o queixo, com um queixo estreito e pontudo. Cortes com volume abaixo das orelhas e franja lateral equilibram as proporções superiores e inferiores.',
  diamond: 'O rosto diamante tem maçãs do rosto largas, com testa e queixo estreitos. Cortes com volume na testa e no queixo criam equilíbrio com as maçãs proeminentes.',
  triangle: 'O rosto triangular tem queixo mais largo que a testa. Cortes com volume no topo e laterais mais curtas na parte inferior equilibram a base mais larga.',
};

export function FaceShapeReveal({ faceAnalysis, onContinue }: FaceShapeRevealProps) {
  const shouldReduceMotion = useReducedMotion();
  const label = FACE_SHAPE_LABELS[faceAnalysis.faceShape];
  const description = FACE_SHAPE_DESCRIPTIONS[faceAnalysis.faceShape];
  const confidencePercent = Math.round(faceAnalysis.confidence * 100);

  const revealAnimation = shouldReduceMotion
    ? {}
    : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, ease: 'easeOut' as const } };

  const buttonAnimation = shouldReduceMotion
    ? {}
    : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, ease: 'easeOut' as const, delay: 0.2 } };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        {/* Face Shape Badge */}
        <motion.div {...revealAnimation}>
          <div className="mb-2 inline-flex items-center rounded-2xl bg-primary px-6 py-3">
            <span className="text-3xl font-bold text-primary-foreground">
              Rosto {label}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {confidencePercent}% de certeza
          </p>
          <p className="mt-4 text-base text-foreground leading-relaxed">
            {description}
          </p>
        </motion.div>

        {/* Continue Button (staggered 200ms delay) */}
        <motion.div className="mt-8" {...buttonAnimation}>
          <button
            onClick={onContinue}
            className="w-full rounded-xl bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Continuar
          </button>
        </motion.div>
      </div>
    </div>
  );
}
```

### Architecture Compliance

- **Never call AI providers directly from frontend** — the page calls the existing `/api/consultation/analyze` endpoint (Story 4.3), which handles all AI logic. No AI SDK imports in frontend code. [Source: architecture.md#7.3]
- **Zustand store for state** — `faceAnalysis` written to store via `setFaceAnalysis` action, not local state only, so subsequent pages can access it. [Source: architecture.md#6.2]
- **PhotoPreview as base64** — `photoPreview` is stored in sessionStorage via Zustand persist. The data URL prefix (`data:image/jpeg;base64,`) must be stripped before sending to the API. The API route accepts raw base64 only. [Source: 4-3-face-analysis.md#Route implementation pattern]
- **No payment check** — this story is entirely pre-paywall. The face shape result is the FREE content. No payment gate logic here. Payment is Story 5.x. [Source: architecture.md#4.1, epics-and-stories.md#S4.4]
- **Session recovery compatibility** — `photoPreview` is persisted in sessionStorage. If the user refreshes the processing page, the store rehydrates and `photoPreview` is available. The existing guard (`if (!consultationId) router.replace(...)`) is preserved. [Source: architecture.md#6.3]

### File Structure Requirements

```
src/
├── app/
│   └── consultation/
│       └── processing/
│           └── page.tsx              REPLACE: stub spinner → full orchestration (load → reveal → navigate)
├── components/
│   └── consultation/
│       ├── ProcessingScreen.tsx      NEW: loading state with face mesh animation
│       └── FaceShapeReveal.tsx       NEW: animated face shape badge + confidence + explanation + continue button
├── stores/
│   └── consultation.ts              MODIFY: add setFaceAnalysis action + update faceAnalysis type
└── test/
    └── processing-page.test.tsx     NEW: comprehensive tests for the processing page flow
```

**Files that must NOT be modified:**
- `src/app/api/consultation/analyze/route.ts` — API route from Story 4.3, used as-is
- `src/lib/ai/**` — all AI layer files (providers, schemas, prompts) from Stories 4.1/4.2
- `src/types/index.ts` — DO NOT modify (type definitions are frozen)
- `src/app/consultation/processing/layout.tsx` — layout file, leave untouched

### Testing Requirements

**Test file:** `src/test/processing-page.test.tsx`

Use `vi.mock('next/navigation', ...)` to mock router, `vi.mock('@/stores/consultation', ...)` to mock store, and `global.fetch` mock for API calls.

**Required tests and expected behaviors:**

| Test | Expected Result |
|------|----------------|
| On mount with valid consultationId + photoPreview: calls POST /api/consultation/analyze | `fetch` called once with correct URL + body |
| While fetch is pending: shows ProcessingScreen (loading state) | "A analisar o formato do seu rosto..." visible |
| Successful response: shows FaceShapeReveal with "Rosto Oval" | Badge with correct Portuguese label visible |
| Successful response: confidence displayed as "92% de certeza" (0.92 * 100) | Confidence text visible |
| `faceAnalysis` stored in Zustand: `setFaceAnalysis` called with correct data | `setFaceAnalysis` mock called once with faceAnalysis object |
| "Continuar" button navigates to `/consultation/results/:id` | `router.push` called with correct path |
| API 422: error state "Algo correu mal. Tentar de novo?" | Error message visible |
| API 500: error state shown | Error message visible |
| Network error (fetch rejects): error state shown | Error message visible |
| Retry button: re-calls fetch | `fetch` called twice total |
| No consultationId: `router.replace('/consultation/questionnaire')` called | Router replace called with correct path |
| All 7 face shapes map to correct Portuguese labels | Verify each enum value → label |

**Mock setup pattern (consistent with existing test files):**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ProcessingPage from '@/app/consultation/processing/page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock Zustand store
vi.mock('@/stores/consultation', () => ({
  useConsultationStore: vi.fn(),
}));

// Mock framer-motion (avoid animation complexity in tests)
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  },
  useReducedMotion: vi.fn(() => false),
}));

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockSetFaceAnalysis = vi.fn();

// Valid face analysis fixture
const validFaceAnalysis = {
  faceShape: 'oval' as const,
  confidence: 0.92,
  proportions: { foreheadRatio: 0.78, cheekboneRatio: 1.0, jawRatio: 0.72, faceLength: 1.35 },
  hairAssessment: { type: 'straight', texture: 'medium', density: 'medium', currentStyle: 'short' },
};
```

**Mock Zustand store pattern:**
```typescript
const mockStoreState = {
  consultationId: 'test-uuid-1234',
  photoPreview: 'data:image/jpeg;base64,/9j/testbase64data',
  setFaceAnalysis: mockSetFaceAnalysis,
};

// In beforeEach or per-test:
(useConsultationStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
  (selector: (state: typeof mockStoreState) => unknown) => selector(mockStoreState)
);
```

**Global fetch mock:**
```typescript
beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ faceAnalysis: validFaceAnalysis }),
  });
  (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({ push: mockPush, replace: mockReplace });
});
```

### Library & Framework Requirements

| Library | Version | Usage in This Story |
|---------|---------|---------------------|
| framer-motion | ^12.34.3 | ALREADY INSTALLED — `motion.div` for slide-up + fade-in reveal, `useReducedMotion` for accessibility |
| zustand | ^5.0.11 | ALREADY INSTALLED — add `setFaceAnalysis` action to store |
| next | 16.1.6 | `useRouter`, `next/navigation` — already in use |
| react | (via next) | `useEffect`, `useState`, `useCallback` hooks |
| @testing-library/react | (already in test setup) | Component rendering in tests |
| vitest | ^4.0.18 | Test runner — `vi.mock`, `vi.fn()` patterns |

**NO NEW DEPENDENCIES** — all required packages are already installed.

### Cross-Story Dependencies

- **Story 4.1 (AI Provider Abstraction) — DONE:** `AIRouter` fully implemented. Not called directly in this story (via API route only).
- **Story 4.2 (Prompt Management) — DONE:** `FaceAnalysisSchema` and `FaceAnalysisOutput` type available at `@/lib/ai/schemas`. Import `FaceAnalysisOutput` for TypeScript typing of `faceAnalysis` in store and components.
- **Story 4.3 (Face Analysis) — DONE:** `POST /api/consultation/analyze` fully implemented at `src/app/api/consultation/analyze/route.ts`. Returns `{ faceAnalysis: FaceAnalysisOutput }` on 200. Returns `{ error, details }` on 422. This story consumes that endpoint.
- **Story 4.5 (Consultation Generation) — NEXT:** Will trigger from the results page after payment. The `faceAnalysis` stored in Zustand and in Supabase (by 4.3) will be used as input. This story's navigation to `/consultation/results/:id` sets up the destination for 4.5.
- **Story 5.x (Payment) — FUTURE:** The results page (`/consultation/results/:id`) navigated to by the "Continuar" button will show the paywall. This story only navigates to that route; payment logic is separate.

### Performance Targets

- Processing page → face reveal: total user-perceived time ≤ 10 seconds (latency budget: Gemini Flash ~3-8s + API overhead ~200ms + animation 500ms)
- Loading state animation: continuous, does not block the analysis fetch
- Reveal animation: 500ms duration — fast enough to feel responsive, slow enough to feel polished
- Framer Motion tree-shaking: only import `motion.div` and `useReducedMotion` — no full bundle import
- The processing page itself should render in < 50ms (client-side only, no SSR needed)

### Previous Story Intelligence (Story 4.3 — Face Analysis)

**Key patterns to carry forward:**

- `vi.mock()` must be at module top level (Vitest hoists these) — not inside `describe`
- `as unknown as ReturnType<typeof vi.fn>` cast pattern for mocked functions
- `vi.clearAllMocks()` in `beforeEach` for test isolation
- Zod v4: use `error.issues` (not `error.errors`) — if needed
- Existing test baseline: **802 tests** (51 test files, all passing as of Story 4.3 completion + review)
- `FaceAnalysisOutput` type is `z.infer<typeof FaceAnalysisSchema>` — export from `@/lib/ai/schemas/face-analysis.schema` or the barrel `@/lib/ai/schemas`

**Story 4.3 completion state (verified):**
- `POST /api/consultation/analyze` → returns `{ faceAnalysis: { faceShape, confidence, proportions, hairAssessment } }` on 200
- `photoBase64` field: raw base64 string (strip `data:image/jpeg;base64,` prefix from `photoPreview` data URL)
- Response structure must NOT change (it is the contract this story depends on)

**Story 3.6 completion state:**
- `POST /api/consultation/start` is called after questionnaire, stores `consultationId` in Zustand store
- `photoPreview` (data URL string) is also in the store from Story 2.x
- Processing page redirect guard (no consultationId → questionnaire) was already in the stub — preserve exactly

### Git Intelligence

Recent commits follow this pattern:
- `feat(epic-4): implement story 4-3-face-analysis`
- `feat(epic-4): implement story 4-2-prompt-management-system`

Suggested commit message: `feat(epic-4): implement story 4-4-instant-face-shape-reveal`

### UX Requirements (from ux-design.md)

**Processing Screen — Phase 1 (0-10s, while AI runs):** [Source: ux-design.md#3.5]
- User's photo centered on screen, circular crop
- Animated face mesh overlay (dots connecting on forehead, jawline, cheekbones) — CSS animation is acceptable for MVP, SVG paths preferred
- Text: "A analisar o formato do seu rosto..."
- Subtle pulsing glow around the photo (Tailwind `animate-pulse` on a wrapper div with ring/border)
- Rotating educational tips during wait: "Sabia que existem 7 formatos de rosto?", "O visagismo combina ciência com arte para harmonizar o seu visual", "Cada formato de rosto tem cortes que criam equilíbrio visual"

**Face Shape Reveal — the "instant value signal":** [Source: ux-design.md#3.5 — Instant Value Signal]
- "Show face shape result immediately: 'O seu rosto é Oval ✓' — Continue processing recommendations in background — User gets value in 10 seconds → hooked before they can bail"
- The face shape badge is the PRIMARY content — make it visually dominant
- Confidence score below the badge: "93% de certeza" (subtle, secondary)
- Brief explanation (2-3 sentences) below confidence

**Design system compliance:** [Source: ux-design.md#1]
- Face Shape Badge uses `bg-primary` text — adapts to male (dark amber) or female (dusty rose) theme automatically via Tailwind CSS variables
- Badge radius: 8px (Tailwind `rounded-lg`) — per design system badge spec
- Display font: Space Grotesk 700 for the face shape label
- Body font: Inter 400 for description text
- Reveal animation: `results reveal: staggered 150ms per element` — apply 200ms stagger for the "Continuar" button

**Accessibility:** [Source: ux-design.md#6]
- Respect `prefers-reduced-motion` — use `useReducedMotion()` from Framer Motion
- Alt text on user's photo in processing screen: `"A sua foto a ser analisada"`
- The face shape badge should be readable by screen readers (no text-in-image)
- Color contrast: primary color on primary-foreground must meet 4.5:1 ratio

### Critical Guardrails

- **DO NOT** call `getAIRouter()` or any AI provider directly from frontend components — all AI calls go through `POST /api/consultation/analyze`. The processing page is a CLIENT component that calls a Next.js API route.
- **DO NOT** modify `src/app/api/consultation/analyze/route.ts` — Story 4.3 implementation is complete and tested. Changing it could break 11 tests in `api-consultation-analyze.test.ts`.
- **DO NOT** add payment logic or paywall — this story ends at the "Continuar" button navigating to results. The results page (Story 5.x) handles the paywall.
- **DO NOT** implement consultation generation (Step 2) — that is Story 4.5. This story only displays the face shape (Step 1 result, which is FREE).
- **DO NOT** store `photoPreview` data URL in the request body without stripping the prefix — the API route only accepts raw base64. Use `photoPreview.split(',')[1]` to strip `data:image/jpeg;base64,`.
- **DO NOT** hard-code color values — use Tailwind CSS classes that reference design system tokens (`bg-primary`, `text-primary-foreground`, `text-muted-foreground`) so the dual theme (male/female) applies automatically.
- **DO** keep the existing redirect guard (`if (!consultationId) router.replace('/consultation/questionnaire')`) — this is tested and important for navigation integrity.
- **DO** handle the edge case where `photoPreview` is null even when `consultationId` is set (possible in error recovery scenarios) — show an appropriate error state or fallback.
- **DO** run the full test suite (`npm test`) before considering the story done. All 802 existing tests + new tests must pass.
- **DO** keep components under 150 lines each — extract sub-components (`FaceMeshOverlay`, `EducationalTip`, `ErrorState`) if needed.
- **DO** mock `framer-motion` in tests to avoid animation complexity — use a simple passthrough mock for `motion.div`.

### Environment Variables Required

No new environment variables needed. All required variables are already configured:

| Variable | Used By | Notes |
|----------|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `src/lib/supabase/server.ts` (via analyze route) | Already configured |
| `SUPABASE_SERVICE_ROLE_KEY` | `src/lib/supabase/server.ts` (via analyze route) | Added in Story 4.3 |
| `GOOGLE_AI_API_KEY` | `src/lib/ai/config.ts` (via analyze route) | Already configured |
| `OPENAI_API_KEY` | `src/lib/ai/config.ts` (via analyze route, fallback) | Already configured |

### References

- [Source: epics-and-stories.md#S4.4] — Instant Face Shape Reveal AC: result displayed as soon as Step 1 completes, large badge, confidence score, brief explanation, FREE result, animated reveal (slide up + fade in), face shape overlay on photo
- [Source: ux-design.md#3.5] — Processing screen phases + instant value signal spec: face mesh animation, "A analisar o formato do seu rosto...", rotating educational tips, instant face shape reveal at 10s
- [Source: ux-design.md#1] — Design system: dual theme (male dark / female light), Space Grotesk for display, Inter for body, badge radius 8px, motion specs (reveal staggered 150ms)
- [Source: ux-design.md#6] — Accessibility: WCAG 2.1 AA, `prefers-reduced-motion` required, alt text on images
- [Source: architecture.md#4.1] — AI pipeline: Step 1 returns face_shape, confidence, proportions, hair_type; shown immediately (instant face shape reveal); Steps 1+2 behind paywall but face shape only for FREE
- [Source: architecture.md#6.1] — `ProcessingScreen.tsx` and `FaceShapeReveal.tsx` component locations in `src/components/consultation/`; processing page at `src/app/consultation/processing/page.tsx`
- [Source: architecture.md#6.2] — Zustand store: `faceAnalysis: FaceAnalysis | null` field, `setFaceAnalysis` action pattern
- [Source: architecture.md#6.3] — Session persistence: Zustand persisted to sessionStorage; `faceAnalysis` excluded from partialize (re-fetched from API)
- [Source: 4-3-face-analysis.md] — Analyze route contract: `POST /api/consultation/analyze` body `{ consultationId, photoBase64 }`, response `{ faceAnalysis }`, errors 400/404/422/500. `photoBase64` is raw base64 (NOT data URL). 802 tests baseline.
- [Source: src/stores/consultation.ts] — `photoPreview` is data URL format (`data:image/jpeg;base64,...`), strip prefix before sending. `faceAnalysis` typed as `unknown | null` — update to `FaceAnalysisOutput | null`.
- [Source: src/lib/ai/schemas/face-analysis.schema.ts] — `FaceAnalysisOutput` type: `{ faceShape: 'oval'|'round'|'square'|'oblong'|'heart'|'diamond'|'triangle', confidence: number, proportions: {...}, hairAssessment: {...} }`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Implemented TDD approach: wrote 25 failing tests first, then implemented components to make them pass
- Added `setFaceAnalysis` action to `ConsultationStore` and updated `faceAnalysis` type from `unknown | null` to `FaceAnalysisOutput | null`
- Created `ProcessingScreen` component with animated face mesh SVG overlay, pulsing photo glow, and rotating educational tips
- Created `FaceShapeReveal` component with Framer Motion slide-up + fade-in animation (500ms), 200ms stagger for "Continuar" button, `useReducedMotion` accessibility support, all 7 Portuguese face shape labels and descriptions
- Replaced stub processing page with full orchestration: fetch → loading → reveal → navigate with `useCallback` for retry support
- Error state handles 422, 500, and network failures with "Algo correu mal. Tentar de novo?" message and retry button
- Preserved existing redirect guard (`!consultationId → /consultation/questionnaire`)
- Base64 extraction correctly strips data URL prefix (`photoPreview.split(',')[1]`)
- Full test suite: 827 tests passing (802 baseline + 25 new), zero regressions
- All 10 Acceptance Criteria verified
- Code Review (2026-03-02): Fixed 4 issues found during adversarial review: (1) photoPreview=null with valid consultationId now correctly shows error state instead of infinite loading; (2) Added AbortController to cancel in-flight fetch on component unmount preventing setState-on-unmounted-component; (3) Replaced hardcoded inline fontFamily style with project-standard `font-display` Tailwind utility class; (4) Added 2 new tests for the photoPreview=null edge case (total: 829 tests, 27 in this story)

### File List

- src/stores/consultation.ts (modified)
- src/components/consultation/ProcessingScreen.tsx (new)
- src/components/consultation/FaceShapeReveal.tsx (new)
- src/app/consultation/processing/page.tsx (modified)
- src/test/processing-page.test.tsx (new)

## Change Log

- 2026-03-02: Implemented story 4-4-instant-face-shape-reveal — replaced stub processing page with full face analysis fetch + animated reveal UI. Added `setFaceAnalysis` to Zustand store, created `ProcessingScreen` and `FaceShapeReveal` components with Framer Motion animations, added comprehensive test suite (25 new tests, 827 total passing).
- 2026-03-02: Code review fixes — fixed photoPreview=null infinite loading (now shows error state), added AbortController for fetch cleanup on unmount, replaced hardcoded fontFamily inline style with `font-display` Tailwind utility, added 2 edge case tests (829 total, 27 in this story).
