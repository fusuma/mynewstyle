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
  UserPlus: ({ 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-user-plus" aria-hidden={ariaHidden} />
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

// ---- Integration Tests ----

describe('ResultsActionsFooter - "Mostrar ao barbeiro" button appears', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Mostrar ao barbeiro" button in ResultsActionsFooter', async () => {
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);
    expect(
      screen.getByRole('button', { name: /mostrar ao barbeiro/i })
    ).toBeInTheDocument();
  });

  it('"Mostrar ao barbeiro" button has Scissors icon', async () => {
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);
    expect(screen.getByTestId('icon-scissors')).toBeInTheDocument();
  });

  it('"Mostrar ao barbeiro" button is positioned after "Partilhar resultado"', async () => {
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);
    const buttons = screen.getAllByRole('button');
    const shareIndex = buttons.findIndex((btn) => btn.textContent?.match(/partilhar resultado/i));
    const barberIndex = buttons.findIndex((btn) => btn.textContent?.match(/mostrar ao barbeiro/i));
    expect(shareIndex).toBeGreaterThanOrEqual(0);
    expect(barberIndex).toBeGreaterThan(shareIndex);
  });

  it('"Mostrar ao barbeiro" button is initially enabled (not loading)', async () => {
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);
    const barberButton = screen.getByRole('button', { name: /mostrar ao barbeiro/i });
    expect(barberButton).not.toBeDisabled();
    expect(screen.queryByTestId('icon-loader')).not.toBeInTheDocument();
  });
});

describe('ResultsActionsFooter - barber card generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state when "Mostrar ao barbeiro" button is clicked', async () => {
    const { toPng } = await import('html-to-image');

    let resolvePromise: (value: string) => void;
    vi.mocked(toPng).mockReturnValueOnce(
      new Promise<string>((resolve) => {
        resolvePromise = resolve;
      })
    );

    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);

    const barberButton = screen.getByRole('button', { name: /mostrar ao barbeiro/i });
    fireEvent.click(barberButton);

    // Button should be disabled during loading
    expect(barberButton).toBeDisabled();

    // Resolve to clean up
    await act(async () => {
      resolvePromise!('data:image/png;base64,done');
    });
  });

  it('button re-enables after generation completes', async () => {
    const { toPng } = await import('html-to-image');
    vi.mocked(toPng).mockResolvedValue('data:image/png;base64,done');

    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);

    const barberButton = screen.getByRole('button', { name: /mostrar ao barbeiro/i });
    fireEvent.click(barberButton);

    await waitFor(() => {
      expect(barberButton).not.toBeDisabled();
    });
  });
});

