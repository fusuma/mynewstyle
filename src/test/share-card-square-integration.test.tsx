import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';

// Mock html-to-image
vi.mock('html-to-image', () => ({
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,mockedpng'),
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
      return <div {...rest}>{children}</div>;
    },
  },
  useReducedMotion: () => false,
}));

// Mock lucide-react icons
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
  Image: ({ 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-image" aria-hidden={ariaHidden} />
  ),
  Download: ({ 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-download" aria-hidden={ariaHidden} />
  ),
  ChevronDown: ({ 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-chevron-down" aria-hidden={ariaHidden} />
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

// Consultation store mock
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
    groomingTips: [
      {
        category: 'barber_tips',
        tipText: 'Peça ao barbeiro textura no topo',
        icon: 'scissors',
      },
    ],
  },
  gender: 'male' as const,
  previews: new Map(),
};

vi.mock('@/stores/consultation', () => ({
  useConsultationStore: (selector: (state: typeof mockStoreState) => unknown) =>
    selector(mockStoreState),
}));

// ---- Integration Tests: Share Card Square in ResultsActionsFooter ----

describe('ResultsActionsFooter - square share card option', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a share card option for Instagram (Cartão Instagram) in the footer', async () => {
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);

    // Should have a button referencing Instagram card
    expect(
      screen.getByRole('button', { name: /cart[aã]o instagram.*1:1/i })
    ).toBeInTheDocument();
  });

  it('share card square renderer is mounted off-screen in footer', async () => {
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);

    // The ShareCardSquareRenderer should be in the DOM (off-screen)
    expect(screen.getByTestId('share-card-square-renderer')).toBeInTheDocument();
  });

  it('square share card option triggers card generation on click', async () => {
    const { toPng } = await import('html-to-image');
    vi.mocked(toPng).mockResolvedValue('data:image/png;base64,done');

    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);

    // Find button that triggers square card generation (aria-label: "Cartão Instagram (1:1)")
    const squareButton = screen.getByRole('button', { name: /cart[aã]o instagram.*1:1/i });
    fireEvent.click(squareButton);

    // Should have called toPng at some point (for the square card)
    await waitFor(() => {
      expect(toPng).toHaveBeenCalled();
    });
  });

  it('toPng is called with correct square dimensions and pixelRatio:2 for social media compression (AC1, AC7)', async () => {
    const { toPng } = await import('html-to-image');
    vi.mocked(toPng).mockResolvedValue('data:image/png;base64,done');

    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);

    const squareButton = screen.getByRole('button', { name: /cart[aã]o instagram.*1:1/i });
    fireEvent.click(squareButton);

    await waitFor(() => {
      expect(toPng).toHaveBeenCalledWith(
        expect.any(HTMLDivElement),
        expect.objectContaining({
          width: 540,
          height: 540,
          pixelRatio: 2, // 2x → 1080x1080 output for social media compression resilience (AC7)
        })
      );
    });
  });

  it('square card button shows loading state during generation', async () => {
    const { toPng } = await import('html-to-image');

    let resolvePromise: (value: string) => void;
    vi.mocked(toPng).mockReturnValueOnce(
      new Promise<string>((resolve) => {
        resolvePromise = resolve;
      })
    );

    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);

    // aria-label when not loading: "Cartão Instagram (1:1)"
    const squareButton = screen.getByRole('button', { name: /cart[aã]o instagram.*1:1/i });
    fireEvent.click(squareButton);

    // Button should be disabled during loading
    await waitFor(() => {
      expect(squareButton).toBeDisabled();
    });

    await act(async () => {
      resolvePromise!('data:image/png;base64,done');
    });
  });
});
