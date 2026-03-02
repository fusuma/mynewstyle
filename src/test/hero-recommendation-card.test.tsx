import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock framer-motion
function stripMotionProps(props: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { initial, animate, exit, transition, variants, whileHover, whileTap, whileInView, ...rest } = props;
  return rest;
}

let mockReducedMotion = false;

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <div {...stripMotionProps(props)}>{children}</div>
    ),
    section: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <section {...stripMotionProps(props)}>{children}</section>
    ),
    span: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <span {...stripMotionProps(props)}>{children}</span>
    ),
    p: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <p {...stripMotionProps(props)}>{children}</p>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => mockReducedMotion,
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock usePreviewGeneration hook
const mockTriggerPreview = vi.fn();
vi.mock('@/hooks/usePreviewGeneration', () => ({
  usePreviewGeneration: () => ({
    isAnyGenerating: false,
    triggerPreview: mockTriggerPreview,
    getPreviewStatus: () => ({ status: 'idle' }),
  }),
}));

// Mock consultation store for photoPreview
vi.mock('@/stores/consultation', () => ({
  useConsultationStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      photoPreview: null,
      previews: new Map(),
    }),
}));

const mockRecommendation = {
  styleName: 'Corte Degradê',
  justification: 'Este estilo complementa seu rosto oval, destacando as proporções naturais. O degradê suaviza as linhas do rosto, criando uma aparência equilibrada e moderna.',
  matchScore: 0.93,
  difficultyLevel: 'low' as const,
};

describe('HeroRecommendationCard - Task 6.1: renders all required elements', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.resetModules();
  });

  it('renders the #1 badge with "Recomendacao Principal" text', async () => {
    const { HeroRecommendationCard } = await import('@/components/consultation/HeroRecommendationCard');
    render(<HeroRecommendationCard recommendation={mockRecommendation} />);
    expect(screen.getByText(/Recomendacao Principal/i)).toBeInTheDocument();
  });

  it('renders the style name', async () => {
    const { HeroRecommendationCard } = await import('@/components/consultation/HeroRecommendationCard');
    render(<HeroRecommendationCard recommendation={mockRecommendation} />);
    expect(screen.getByText('Corte Degradê')).toBeInTheDocument();
  });

  it('renders the justification text', async () => {
    const { HeroRecommendationCard } = await import('@/components/consultation/HeroRecommendationCard');
    render(<HeroRecommendationCard recommendation={mockRecommendation} />);
    expect(screen.getByText(/Este estilo complementa seu rosto oval/i)).toBeInTheDocument();
  });

  it('renders the match score as percentage with "compativel" label', async () => {
    const { HeroRecommendationCard } = await import('@/components/consultation/HeroRecommendationCard');
    render(<HeroRecommendationCard recommendation={mockRecommendation} />);
    expect(screen.getByText(/93% compativel com o seu rosto/i)).toBeInTheDocument();
  });

  it('renders the difficulty badge for low -> "Baixa"', async () => {
    const { HeroRecommendationCard } = await import('@/components/consultation/HeroRecommendationCard');
    render(<HeroRecommendationCard recommendation={mockRecommendation} />);
    expect(screen.getByText(/Manutencao: Baixa/i)).toBeInTheDocument();
  });

  it('renders the "Ver como fico" button', async () => {
    const { HeroRecommendationCard } = await import('@/components/consultation/HeroRecommendationCard');
    render(<HeroRecommendationCard recommendation={mockRecommendation} />);
    expect(screen.getByRole('button', { name: /ver como fico/i })).toBeInTheDocument();
  });

  it('renders match score at 100% for matchScore = 1.0', async () => {
    const { HeroRecommendationCard } = await import('@/components/consultation/HeroRecommendationCard');
    render(<HeroRecommendationCard recommendation={{ ...mockRecommendation, matchScore: 1.0 }} />);
    expect(screen.getByText(/100% compativel com o seu rosto/i)).toBeInTheDocument();
  });

  it('rounds match score correctly (0.876 -> 88%)', async () => {
    const { HeroRecommendationCard } = await import('@/components/consultation/HeroRecommendationCard');
    render(<HeroRecommendationCard recommendation={{ ...mockRecommendation, matchScore: 0.876 }} />);
    expect(screen.getByText(/88% compativel com o seu rosto/i)).toBeInTheDocument();
  });
});

// Note: Story 7.4 removed the 'gender' prop from HeroRecommendationCard.
// Theme is now applied via CSS variables (data-theme on <html> element), not via component props.
// Tests below verify that the component renders correctly regardless of the theme context.
describe('HeroRecommendationCard - Task 6.2: theme variant rendering', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.resetModules();
  });

  it('renders without crashing (theme handled by CSS variables, not props)', async () => {
    const { HeroRecommendationCard } = await import('@/components/consultation/HeroRecommendationCard');
    const { container } = render(<HeroRecommendationCard recommendation={mockRecommendation} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders badge element for #1 recommendation', async () => {
    const { HeroRecommendationCard } = await import('@/components/consultation/HeroRecommendationCard');
    const { container } = render(<HeroRecommendationCard recommendation={mockRecommendation} />);
    // Badge element should exist — theme adapts via CSS tokens, not JS props
    expect(container.querySelector('[data-slot="badge"]')).toBeInTheDocument();
  });

  it('renders all content correctly', async () => {
    const { HeroRecommendationCard } = await import('@/components/consultation/HeroRecommendationCard');
    render(<HeroRecommendationCard recommendation={mockRecommendation} />);
    expect(screen.getByText(/Recomendacao Principal/i)).toBeInTheDocument();
    expect(screen.getByText('Corte Degradê')).toBeInTheDocument();
  });

  it('renders difficulty badge for medium -> "Media"', async () => {
    const { HeroRecommendationCard } = await import('@/components/consultation/HeroRecommendationCard');
    render(<HeroRecommendationCard recommendation={{ ...mockRecommendation, difficultyLevel: 'medium' }} />);
    expect(screen.getByText(/Manutencao: Media/i)).toBeInTheDocument();
  });

  it('renders difficulty badge for high -> "Alta"', async () => {
    const { HeroRecommendationCard } = await import('@/components/consultation/HeroRecommendationCard');
    render(<HeroRecommendationCard recommendation={{ ...mockRecommendation, difficultyLevel: 'high' }} />);
    expect(screen.getByText(/Manutencao: Alta/i)).toBeInTheDocument();
  });
});

describe('HeroRecommendationCard - Task 6.3: reduced motion behavior', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders all content when reduced motion is false', async () => {
    mockReducedMotion = false;
    const { HeroRecommendationCard } = await import('@/components/consultation/HeroRecommendationCard');
    render(<HeroRecommendationCard recommendation={mockRecommendation} />);
    expect(screen.getByText(/Recomendacao Principal/i)).toBeInTheDocument();
    expect(screen.getByText('Corte Degradê')).toBeInTheDocument();
  });

  it('renders all content when reduced motion is true (no animation crash)', async () => {
    mockReducedMotion = true;
    const { HeroRecommendationCard } = await import('@/components/consultation/HeroRecommendationCard');
    render(<HeroRecommendationCard recommendation={mockRecommendation} />);
    expect(screen.getByText(/Recomendacao Principal/i)).toBeInTheDocument();
    expect(screen.getByText('Corte Degradê')).toBeInTheDocument();
    expect(screen.getByText(/93% compativel com o seu rosto/i)).toBeInTheDocument();
  });
});

describe('HeroRecommendationCard - Task 6.4: different recommendation data shapes', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.resetModules();
  });

  it('renders with minimal matchScore of 0', async () => {
    const { HeroRecommendationCard } = await import('@/components/consultation/HeroRecommendationCard');
    render(<HeroRecommendationCard recommendation={{ ...mockRecommendation, matchScore: 0 }} />);
    expect(screen.getByText(/0% compativel com o seu rosto/i)).toBeInTheDocument();
  });

  it('renders with long justification text', async () => {
    const { HeroRecommendationCard } = await import('@/components/consultation/HeroRecommendationCard');
    const longJustification = 'Este estilo é perfeito para você. '.repeat(10);
    render(<HeroRecommendationCard recommendation={{ ...mockRecommendation, justification: longJustification }} />);
    expect(screen.getByText(/Este estilo é perfeito para você/i)).toBeInTheDocument();
  });

  it('renders with special characters in style name', async () => {
    const { HeroRecommendationCard } = await import('@/components/consultation/HeroRecommendationCard');
    render(<HeroRecommendationCard recommendation={{ ...mockRecommendation, styleName: 'Corte à Navalha' }} />);
    expect(screen.getByText('Corte à Navalha')).toBeInTheDocument();
  });

  it('accepts optional delay prop without crashing', async () => {
    const { HeroRecommendationCard } = await import('@/components/consultation/HeroRecommendationCard');
    const { container } = render(
      <HeroRecommendationCard recommendation={mockRecommendation} delay={0.15} />
    );
    expect(container.firstChild).toBeTruthy();
  });
});

describe('HeroRecommendationCard - accessibility (AC: 12)', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.resetModules();
  });

  it('button has accessible label', async () => {
    const { HeroRecommendationCard } = await import('@/components/consultation/HeroRecommendationCard');
    render(<HeroRecommendationCard recommendation={mockRecommendation} />);
    const button = screen.getByRole('button', { name: /ver como fico/i });
    expect(button).toBeInTheDocument();
  });

  it('match score has aria-label', async () => {
    const { HeroRecommendationCard } = await import('@/components/consultation/HeroRecommendationCard');
    render(<HeroRecommendationCard recommendation={mockRecommendation} />);
    // aria-label on the match score element
    const matchEl = screen.getByLabelText(/compatibilidade/i);
    expect(matchEl).toBeInTheDocument();
  });

  it('difficulty badge has aria-label', async () => {
    const { HeroRecommendationCard } = await import('@/components/consultation/HeroRecommendationCard');
    render(<HeroRecommendationCard recommendation={mockRecommendation} />);
    const difficultyEl = screen.getByLabelText(/dificuldade de manutencao/i);
    expect(difficultyEl).toBeInTheDocument();
  });

  it('#1 badge has aria-label', async () => {
    const { HeroRecommendationCard } = await import('@/components/consultation/HeroRecommendationCard');
    render(<HeroRecommendationCard recommendation={mockRecommendation} />);
    // The #1 badge span has the specific aria-label about "melhor corte"
    const badge = screen.getByLabelText(/melhor corte para o seu rosto/i);
    expect(badge).toBeInTheDocument();
  });
});

describe('HeroRecommendationCard - Ver como fico button behavior', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    mockTriggerPreview.mockReset();
    vi.resetModules();
  });

  it('clicking "Ver como fico" triggers preview generation', async () => {
    const { HeroRecommendationCard } = await import('@/components/consultation/HeroRecommendationCard');
    render(<HeroRecommendationCard recommendation={mockRecommendation} />);
    const button = screen.getByRole('button', { name: /ver como fico/i });
    fireEvent.click(button);
    // Should trigger preview generation (Story 7.4 replaces toast placeholder)
    expect(mockTriggerPreview).toHaveBeenCalled();
  });
});
