import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock framer-motion
// Capture last rendered animation props for reduced motion testing
let lastMotionProps: Record<string, unknown> = {};

function stripMotionProps(props: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { initial, animate, exit, transition, variants, whileHover, whileTap, ...rest } = props;
  return rest;
}

let mockReducedMotion = false;

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => {
      lastMotionProps = props;
      return <div data-testid="motion-div" {...stripMotionProps(props)}>{children}</div>;
    },
  },
  useReducedMotion: () => mockReducedMotion,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Share2: ({ className, 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-share2" className={className} aria-hidden={ariaHidden} />
  ),
  Bookmark: ({ className, 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-bookmark" className={className} aria-hidden={ariaHidden} />
  ),
  PlusCircle: ({ className, 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-plus-circle" className={className} aria-hidden={ariaHidden} />
  ),
  Home: ({ className, 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-home" className={className} aria-hidden={ariaHidden} />
  ),
  Scissors: ({ className, 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-scissors" className={className} aria-hidden={ariaHidden} />
  ),
  Loader2: ({ className, 'aria-hidden': ariaHidden, 'data-testid': testId }: React.SVGAttributes<SVGElement> & { 'data-testid'?: string }) => (
    <svg data-testid={testId ?? 'icon-loader'} className={className} aria-hidden={ariaHidden} />
  ),
  Image: ({ className, 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-image" className={className} aria-hidden={ariaHidden} />
  ),
  UserPlus: ({ className, 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-user-plus" className={className} aria-hidden={ariaHidden} />
  ),
}));

// Mock sonner toast
const mockToast = {
  success: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
};
vi.mock('sonner', () => ({
  toast: mockToast,
}));

// Mock html-to-image (used by BarberCard flow)
vi.mock('html-to-image', () => ({
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,mock'),
}));

// Mock image utility (used by useBarberCard and useShareCard)
vi.mock('@/lib/utils/image', () => ({
  toDataUrl: vi.fn().mockImplementation((url: string) => Promise.resolve(url)),
}));

// Mock useShareCard — "Partilhar resultado" now generates a share card image
const mockGenerateShareCard = vi.fn().mockResolvedValue(undefined);
const mockShareCardState = { isGenerating: false };
vi.mock('@/hooks/useShareCard', () => ({
  useShareCard: () => ({
    generateShareCard: mockGenerateShareCard,
    get isGenerating() { return mockShareCardState.isGenerating; },
    cardRef: { current: null },
    squareCardRef: { current: null },
  }),
}));

// Mock face-shape-labels (used by BarberCard)
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

// Mock consultation store with all fields used by ResultsActionsFooter
const mockReset = vi.fn();
vi.mock('@/stores/consultation', () => ({
  useConsultationStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      reset: mockReset,
      faceAnalysis: null,
      photoPreview: null,
      consultation: null,
      gender: null,
      previews: new Map(),
    }),
}));

// ---- Tests ----

describe('ResultsActionsFooter - button rendering', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    mockShareCardState.isGenerating = false;
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('renders "Partilhar resultado" button', async () => {
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);
    expect(screen.getByRole('button', { name: /partilhar resultado/i })).toBeInTheDocument();
  });

  it('renders "Guardar" button', async () => {
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);
    expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
  });

  it('renders "Nova consultoria (€2,99)" button', async () => {
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);
    expect(screen.getByRole('button', { name: /nova consultoria/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /nova consultoria/i })).toHaveTextContent('€2,99');
  });

  it('renders "Voltar ao início" button', async () => {
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);
    expect(screen.getByRole('button', { name: /voltar ao in/i })).toBeInTheDocument();
  });

  it('renders Share2 icon', async () => {
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);
    expect(screen.getByTestId('icon-share2')).toBeInTheDocument();
  });

  it('renders Bookmark icon', async () => {
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);
    expect(screen.getByTestId('icon-bookmark')).toBeInTheDocument();
  });

  it('renders PlusCircle icon', async () => {
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);
    expect(screen.getByTestId('icon-plus-circle')).toBeInTheDocument();
  });

  it('renders Home icon', async () => {
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);
    expect(screen.getByTestId('icon-home')).toBeInTheDocument();
  });
});

describe('ResultsActionsFooter - share handler (now generates share card image)', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.clearAllMocks();
    vi.resetModules();
    mockShareCardState.isGenerating = false;
    mockGenerateShareCard.mockResolvedValue(undefined);
  });

  it('clicking "Partilhar resultado" calls generateShareCard with "story" format', async () => {
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);
    const shareButton = screen.getByRole('button', { name: /partilhar resultado/i });
    fireEvent.click(shareButton);
    await vi.waitFor(() => {
      expect(mockGenerateShareCard).toHaveBeenCalledWith('story');
    });
  });

  it('"Partilhar resultado" button is not disabled when not generating', async () => {
    mockShareCardState.isGenerating = false;
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);
    const shareButton = screen.getByRole('button', { name: /partilhar resultado/i });
    expect(shareButton).not.toBeDisabled();
    expect(screen.queryByTestId('icon-loader-share')).not.toBeInTheDocument();
  });

  it('"Partilhar resultado" button shows Loader2 icon when isGenerating is true', async () => {
    mockShareCardState.isGenerating = true;
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);
    // Share button has data-testid="icon-loader-share" when loading
    expect(screen.getByTestId('icon-loader-share')).toBeInTheDocument();
  });

  it('"Partilhar resultado" button is disabled when isGenerating is true', async () => {
    mockShareCardState.isGenerating = true;
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);
    // When loading, aria-label changes to "A gerar cartão de partilha…"
    const shareButton = screen.getByRole('button', { name: /a gerar cartão de partilha/i });
    expect(shareButton).toBeDisabled();
  });
});

describe('ResultsActionsFooter - save handler', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    mockShareCardState.isGenerating = false;
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('shows sonner toast with guest prompt when save is clicked', async () => {
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);
    const saveButton = screen.getByRole('button', { name: /guardar/i });
    fireEvent.click(saveButton);
    expect(mockToast.info).toHaveBeenCalledTimes(1);
    expect(mockToast.info).toHaveBeenCalledWith(
      'Crie uma conta para guardar este resultado',
      expect.objectContaining({
        action: expect.objectContaining({ label: 'Criar conta' }),
      })
    );
  });

  it('toast action navigates to /register when "Criar conta" is clicked', async () => {
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);
    const saveButton = screen.getByRole('button', { name: /guardar/i });
    fireEvent.click(saveButton);

    // Extract onClick from the action passed to toast.info
    const callArgs = mockToast.info.mock.calls[0];
    const options = callArgs[1] as { action: { onClick: () => void } };
    options.action.onClick();
    expect(mockPush).toHaveBeenCalledWith('/register');
  });
});

describe('ResultsActionsFooter - new consultation handler', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    mockShareCardState.isGenerating = false;
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('calls reset() on the consultation store', async () => {
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);
    const newConsultationButton = screen.getByRole('button', { name: /nova consultoria/i });
    fireEvent.click(newConsultationButton);
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it('navigates to /start after reset', async () => {
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);
    const newConsultationButton = screen.getByRole('button', { name: /nova consultoria/i });
    fireEvent.click(newConsultationButton);
    expect(mockPush).toHaveBeenCalledWith('/start');
  });
});

describe('ResultsActionsFooter - back to home handler', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    mockShareCardState.isGenerating = false;
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('navigates to / when back to home is clicked', async () => {
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);
    const homeButton = screen.getByRole('button', { name: /voltar ao in/i });
    fireEvent.click(homeButton);
    expect(mockPush).toHaveBeenCalledWith('/');
  });
});

describe('ResultsActionsFooter - sticky footer classes', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    mockShareCardState.isGenerating = false;
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('applies fixed bottom-0 classes for mobile sticky footer', async () => {
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);
    const motionDiv = screen.getByTestId('motion-div');
    expect(motionDiv.className).toMatch(/fixed/);
    expect(motionDiv.className).toMatch(/bottom-0/);
  });
});

describe('ResultsActionsFooter - accessibility', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    mockShareCardState.isGenerating = false;
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('"Partilhar resultado" button has aria-label', async () => {
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);
    const shareButton = screen.getByRole('button', { name: /partilhar resultado/i });
    expect(shareButton).toHaveAttribute('aria-label');
  });

  it('"Guardar" button has aria-label', async () => {
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);
    const saveButton = screen.getByRole('button', { name: /guardar/i });
    expect(saveButton).toHaveAttribute('aria-label');
  });

  it('"Nova consultoria" button has aria-label', async () => {
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);
    const newConsultationButton = screen.getByRole('button', { name: /nova consultoria/i });
    expect(newConsultationButton).toHaveAttribute('aria-label');
  });

  it('"Voltar ao início" button has aria-label', async () => {
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);
    const homeButton = screen.getByRole('button', { name: /voltar ao in/i });
    expect(homeButton).toHaveAttribute('aria-label');
  });
});

describe('ResultsActionsFooter - reduced motion', () => {
  beforeEach(() => {
    mockShareCardState.isGenerating = false;
    vi.clearAllMocks();
    vi.resetModules();
    lastMotionProps = {};
  });

  it('renders correctly with reduced motion disabled', async () => {
    mockReducedMotion = false;
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);
    expect(screen.getByRole('button', { name: /partilhar resultado/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /nova consultoria/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /voltar ao in/i })).toBeInTheDocument();
  });

  it('passes animation props to motion.div when reduced motion is disabled', async () => {
    mockReducedMotion = false;
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);
    // When reduced motion is OFF, animation props (initial, animate, transition) should be present
    expect(lastMotionProps).toHaveProperty('initial');
    expect(lastMotionProps).toHaveProperty('animate');
    expect(lastMotionProps).toHaveProperty('transition');
  });

  it('renders correctly with reduced motion enabled', async () => {
    mockReducedMotion = true;
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);
    expect(screen.getByRole('button', { name: /partilhar resultado/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /nova consultoria/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /voltar ao in/i })).toBeInTheDocument();
  });

  it('passes empty animation props to motion.div when reduced motion is enabled (AC9)', async () => {
    mockReducedMotion = true;
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');
    render(<ResultsActionsFooter consultationId="test-id-123" />);
    // When reduced motion is ON, animationProps should be {} — no initial/animate/transition keys
    expect(lastMotionProps).not.toHaveProperty('initial');
    expect(lastMotionProps).not.toHaveProperty('animate');
    expect(lastMotionProps).not.toHaveProperty('transition');
  });
});
