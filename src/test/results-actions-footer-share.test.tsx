import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';

// Mock html-to-image
const mockToPng = vi.fn().mockResolvedValue('data:image/png;base64,mockedpng');
vi.mock('html-to-image', () => ({
  toPng: mockToPng,
}));

// Mock image utility (used by useBarberCard)
vi.mock('@/lib/utils/image', () => ({
  toDataUrl: vi.fn().mockImplementation((url: string) => Promise.resolve(url)),
}));

// Mock useShareCard to control generation state
const mockGenerateShareCard = vi.fn().mockResolvedValue(undefined);
const mockShareCardState = { isGenerating: false };
const mockShareCardRef = { current: null };

vi.mock('@/hooks/useShareCard', () => ({
  useShareCard: () => ({
    generateShareCard: mockGenerateShareCard,
    get isGenerating() { return mockShareCardState.isGenerating; },
    cardRef: mockShareCardRef,
  }),
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { initial, animate, exit, transition, variants, whileHover, whileTap, ...rest } = props;
      return <div {...(rest as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
    },
  },
  useReducedMotion: () => false,
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Share2: ({ 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-share2" aria-hidden={ariaHidden} />
  ),
  Bookmark: ({ 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-bookmark" aria-hidden={ariaHidden} />
  ),
  PlusCircle: ({ 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-plus-circle" aria-hidden={ariaHidden} />
  ),
  Home: ({ 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-home" aria-hidden={ariaHidden} />
  ),
  Scissors: ({ 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-scissors" aria-hidden={ariaHidden} />
  ),
  Loader2: ({ className, 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-loader" className={className as string} aria-hidden={ariaHidden} />
  ),
}));

// Mock sonner
const mockToast = { success: vi.fn(), info: vi.fn(), error: vi.fn() };
vi.mock('sonner', () => ({ toast: mockToast }));

// Mock face-shape-labels
vi.mock('@/lib/consultation/face-shape-labels', () => ({
  FACE_SHAPE_LABELS: {
    oval: 'Oval',
    round: 'Redondo',
    square: 'Quadrado',
    oblong: 'Oblongo',
    heart: 'Coração',
    diamond: 'Diamante',
    triangle: 'Triangular',
  },
}));

// Consultation store mock with complete data to enable share card generation
const mockStoreState = {
  reset: vi.fn(),
  faceAnalysis: {
    faceShape: 'oval' as const,
    confidence: 0.92,
    proportions: { foreheadRatio: 0.85, cheekboneRatio: 0.95, jawRatio: 0.75, faceLength: 1.3 },
    hairAssessment: { type: 'straight', texture: 'fine', density: 'medium', currentStyle: 'short' },
  },
  photoPreview: 'data:image/jpeg;base64,photo123',
  consultation: {
    recommendations: [
      {
        styleName: 'Textured Crop',
        justification: 'Creates vertical height for round faces.',
        matchScore: 93,
        difficultyLevel: 'low',
      },
    ],
    stylesToAvoid: [],
    groomingTips: [],
  },
  gender: 'male' as const,
  previews: new Map(),
};

vi.mock('@/stores/consultation', () => ({
  useConsultationStore: (selector: (state: typeof mockStoreState) => unknown) =>
    selector(mockStoreState),
}));

// ---- Integration Tests: Share Card Generation via "Partilhar resultado" ----

describe('ResultsActionsFooter - share button triggers share card generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockShareCardState.isGenerating = false;
    mockGenerateShareCard.mockResolvedValue(undefined);
  });

  it('renders "Partilhar resultado" button', async () => {
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);
    expect(screen.getByRole('button', { name: /partilhar resultado/i })).toBeInTheDocument();
  });

  it('"Partilhar resultado" button triggers share card generation (calls generateShareCard)', async () => {
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);

    const shareButton = screen.getByRole('button', { name: /partilhar resultado/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(mockGenerateShareCard).toHaveBeenCalledTimes(1);
      expect(mockGenerateShareCard).toHaveBeenCalledWith('story');
    });
  });

  it('"Partilhar resultado" button shows loading spinner while generating', async () => {
    // Set the mock to report isGenerating=true
    mockShareCardState.isGenerating = true;

    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);

    // When isGenerating is true, loader should be visible
    expect(screen.getByTestId('icon-loader')).toBeInTheDocument();
  });

  it('"Partilhar resultado" button is disabled while generating', async () => {
    // Set the mock to report isGenerating=true
    mockShareCardState.isGenerating = true;

    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);

    // The share button should have aria-label indicating loading
    const shareButton = screen.getByRole('button', { name: /a gerar cartão/i });
    expect(shareButton).toBeDisabled();
  });

  it('"Partilhar resultado" button is not disabled when not generating', async () => {
    mockShareCardState.isGenerating = false;

    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);

    const shareButton = screen.getByRole('button', { name: /partilhar resultado/i });
    expect(shareButton).not.toBeDisabled();
  });

  it('"Mostrar ao barbeiro" button still works independently', async () => {
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);
    expect(screen.getByRole('button', { name: /mostrar ao barbeiro/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mostrar ao barbeiro/i })).not.toBeDisabled();
  });
});
