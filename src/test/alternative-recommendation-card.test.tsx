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
    button: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <button {...stripMotionProps(props)}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => mockReducedMotion,
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
  styleName: 'Medium Fade',
  justification: 'O medium fade cria uma transicao suave que equilibra as proporcoes do rosto oval, destacando os tracos de forma harmoniosa e moderna.',
  matchScore: 0.87,
  difficultyLevel: 'low' as const,
};

describe('AlternativeRecommendationCard - renders required elements', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.resetModules();
  });

  it('renders style name correctly', async () => {
    const { AlternativeRecommendationCard } = await import('@/components/consultation/AlternativeRecommendationCard');
    render(<AlternativeRecommendationCard rank={2} {...mockRecommendation} />);
    expect(screen.getByText('Medium Fade')).toBeInTheDocument();
  });

  it('renders justification text', async () => {
    const { AlternativeRecommendationCard } = await import('@/components/consultation/AlternativeRecommendationCard');
    render(<AlternativeRecommendationCard rank={2} {...mockRecommendation} />);
    expect(screen.getByText(/O medium fade cria uma transicao suave/i)).toBeInTheDocument();
  });

  it('renders match score as percentage "87% compativel"', async () => {
    const { AlternativeRecommendationCard } = await import('@/components/consultation/AlternativeRecommendationCard');
    render(<AlternativeRecommendationCard rank={2} {...mockRecommendation} />);
    expect(screen.getByText(/87% compativel/i)).toBeInTheDocument();
  });

  it('renders difficulty badge with Portuguese label for low -> "Baixa"', async () => {
    const { AlternativeRecommendationCard } = await import('@/components/consultation/AlternativeRecommendationCard');
    render(<AlternativeRecommendationCard rank={2} {...mockRecommendation} />);
    expect(screen.getByText(/Manutencao: Baixa/i)).toBeInTheDocument();
  });

  it('renders difficulty badge for medium -> "Media"', async () => {
    const { AlternativeRecommendationCard } = await import('@/components/consultation/AlternativeRecommendationCard');
    render(<AlternativeRecommendationCard rank={2} {...mockRecommendation} difficultyLevel="medium" />);
    expect(screen.getByText(/Manutencao: Media/i)).toBeInTheDocument();
  });

  it('renders difficulty badge for high -> "Alta"', async () => {
    const { AlternativeRecommendationCard } = await import('@/components/consultation/AlternativeRecommendationCard');
    render(<AlternativeRecommendationCard rank={2} {...mockRecommendation} difficultyLevel="high" />);
    expect(screen.getByText(/Manutencao: Alta/i)).toBeInTheDocument();
  });

  it('renders ordinal label "2a Recomendacao" for rank 2', async () => {
    const { AlternativeRecommendationCard } = await import('@/components/consultation/AlternativeRecommendationCard');
    render(<AlternativeRecommendationCard rank={2} {...mockRecommendation} />);
    expect(screen.getByText(/2a Recomendacao/i)).toBeInTheDocument();
  });

  it('renders ordinal label "3a Recomendacao" for rank 3', async () => {
    const { AlternativeRecommendationCard } = await import('@/components/consultation/AlternativeRecommendationCard');
    render(<AlternativeRecommendationCard rank={3} {...mockRecommendation} />);
    expect(screen.getByText(/3a Recomendacao/i)).toBeInTheDocument();
  });

  it('renders "Ver como fico" button', async () => {
    const { AlternativeRecommendationCard } = await import('@/components/consultation/AlternativeRecommendationCard');
    render(<AlternativeRecommendationCard rank={2} {...mockRecommendation} />);
    expect(screen.getByRole('button', { name: /ver como fico/i })).toBeInTheDocument();
  });

  it('rounds match score correctly (0.876 -> 88%)', async () => {
    const { AlternativeRecommendationCard } = await import('@/components/consultation/AlternativeRecommendationCard');
    render(<AlternativeRecommendationCard rank={2} {...mockRecommendation} matchScore={0.876} />);
    expect(screen.getByText(/88% compativel/i)).toBeInTheDocument();
  });
});

describe('AlternativeRecommendationCard - collapsible behavior (mobile)', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.resetModules();
  });

  it('collapse toggle button is present in DOM (hidden on desktop via CSS)', async () => {
    const { AlternativeRecommendationCard } = await import('@/components/consultation/AlternativeRecommendationCard');
    render(<AlternativeRecommendationCard rank={2} {...mockRecommendation} />);
    // The toggle button is in the DOM but visually hidden on desktop via md:hidden Tailwind class
    const toggleBtn = screen.getByRole('button', { name: /expandir/i });
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).toHaveClass('md:hidden');
  });

  it('expandable wrapper is hidden by default (collapsed state)', async () => {
    const { AlternativeRecommendationCard } = await import('@/components/consultation/AlternativeRecommendationCard');
    render(<AlternativeRecommendationCard rank={2} {...mockRecommendation} />);
    const wrapper = screen.getByTestId('expandable-wrapper');
    // Default state: collapsed — has 'hidden' class (not 'block')
    expect(wrapper).toHaveClass('hidden');
    expect(wrapper).not.toHaveClass('block');
    // Desktop override class is always present
    expect(wrapper).toHaveClass('md:block');
  });

  it('clicking toggle button expands content', async () => {
    const { AlternativeRecommendationCard } = await import('@/components/consultation/AlternativeRecommendationCard');
    render(<AlternativeRecommendationCard rank={2} {...mockRecommendation} />);
    const toggleBtn = screen.getByRole('button', { name: /expandir/i });
    fireEvent.click(toggleBtn);
    const wrapper = screen.getByTestId('expandable-wrapper');
    expect(wrapper).toHaveClass('block');
    expect(wrapper).not.toHaveClass('hidden');
  });

  it('clicking toggle button again collapses content', async () => {
    const { AlternativeRecommendationCard } = await import('@/components/consultation/AlternativeRecommendationCard');
    render(<AlternativeRecommendationCard rank={2} {...mockRecommendation} />);
    const toggleBtn = screen.getByRole('button', { name: /expandir/i });
    // Expand
    fireEvent.click(toggleBtn);
    // Collapse
    fireEvent.click(toggleBtn);
    const wrapper = screen.getByTestId('expandable-wrapper');
    expect(wrapper).toHaveClass('hidden');
  });

  it('aria-expanded is false when collapsed', async () => {
    const { AlternativeRecommendationCard } = await import('@/components/consultation/AlternativeRecommendationCard');
    render(<AlternativeRecommendationCard rank={2} {...mockRecommendation} />);
    const toggle = screen.getByRole('button', { name: /expandir/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('aria-expanded is true after clicking toggle', async () => {
    const { AlternativeRecommendationCard } = await import('@/components/consultation/AlternativeRecommendationCard');
    render(<AlternativeRecommendationCard rank={2} {...mockRecommendation} />);
    const toggle = screen.getByRole('button', { name: /expandir/i });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('toggle label changes from "Ver detalhes" to "Menos detalhes" on expand', async () => {
    const { AlternativeRecommendationCard } = await import('@/components/consultation/AlternativeRecommendationCard');
    render(<AlternativeRecommendationCard rank={2} {...mockRecommendation} />);
    expect(screen.getByText('Ver detalhes')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /expandir/i }));
    expect(screen.getByText('Menos detalhes')).toBeInTheDocument();
  });

  it('always-visible section contains style name and match score', async () => {
    const { AlternativeRecommendationCard } = await import('@/components/consultation/AlternativeRecommendationCard');
    render(<AlternativeRecommendationCard rank={2} {...mockRecommendation} />);
    // Style name and match score are always outside the collapsible wrapper
    expect(screen.getByText('Medium Fade')).toBeInTheDocument();
    expect(screen.getByText(/87% compativel/i)).toBeInTheDocument();
  });
});

describe('AlternativeRecommendationCard - desktop rendering', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.resetModules();
  });

  it('expandable wrapper always has md:block class (always visible on desktop via CSS)', async () => {
    const { AlternativeRecommendationCard } = await import('@/components/consultation/AlternativeRecommendationCard');
    render(<AlternativeRecommendationCard rank={2} {...mockRecommendation} />);
    const wrapper = screen.getByTestId('expandable-wrapper');
    // md:block ensures desktop always shows content regardless of JS state
    expect(wrapper).toHaveClass('md:block');
  });

  it('shows all content elements in DOM', async () => {
    const { AlternativeRecommendationCard } = await import('@/components/consultation/AlternativeRecommendationCard');
    render(<AlternativeRecommendationCard rank={2} {...mockRecommendation} />);
    expect(screen.getByText('Medium Fade')).toBeInTheDocument();
    expect(screen.getByText(/O medium fade cria uma transicao suave/i)).toBeInTheDocument();
    expect(screen.getByText(/87% compativel/i)).toBeInTheDocument();
    expect(screen.getByText(/Manutencao: Baixa/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ver como fico/i })).toBeInTheDocument();
  });
});

describe('AlternativeRecommendationCard - reduced motion', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders all content when reduced motion is true', async () => {
    mockReducedMotion = true;
    const { AlternativeRecommendationCard } = await import('@/components/consultation/AlternativeRecommendationCard');
    render(<AlternativeRecommendationCard rank={2} {...mockRecommendation} />);
    expect(screen.getByText('Medium Fade')).toBeInTheDocument();
    expect(screen.getByText(/87% compativel/i)).toBeInTheDocument();
  });

  it('renders all content when reduced motion is false', async () => {
    mockReducedMotion = false;
    const { AlternativeRecommendationCard } = await import('@/components/consultation/AlternativeRecommendationCard');
    render(<AlternativeRecommendationCard rank={2} {...mockRecommendation} />);
    expect(screen.getByText('Medium Fade')).toBeInTheDocument();
  });
});

describe('AlternativeRecommendationCard - accessibility', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.resetModules();
  });

  it('card has role="article"', async () => {
    const { AlternativeRecommendationCard } = await import('@/components/consultation/AlternativeRecommendationCard');
    render(<AlternativeRecommendationCard rank={2} {...mockRecommendation} />);
    expect(screen.getByRole('article')).toBeInTheDocument();
  });

  it('"Ver como fico" button has accessible aria-label', async () => {
    const { AlternativeRecommendationCard } = await import('@/components/consultation/AlternativeRecommendationCard');
    render(<AlternativeRecommendationCard rank={2} {...mockRecommendation} />);
    const btn = screen.getByRole('button', { name: /ver como fico/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('aria-label');
  });

  it('calls onPreviewRequest with styleName when "Ver como fico" is clicked', async () => {
    const { AlternativeRecommendationCard } = await import('@/components/consultation/AlternativeRecommendationCard');
    const mockCallback = vi.fn();
    render(<AlternativeRecommendationCard rank={2} {...mockRecommendation} onPreviewRequest={mockCallback} />);
    const btn = screen.getByRole('button', { name: /ver como fico/i });
    fireEvent.click(btn);
    expect(mockCallback).toHaveBeenCalledWith('Medium Fade');
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  it('does not throw when "Ver como fico" is clicked without onPreviewRequest', async () => {
    const { AlternativeRecommendationCard } = await import('@/components/consultation/AlternativeRecommendationCard');
    render(<AlternativeRecommendationCard rank={2} {...mockRecommendation} />);
    const btn = screen.getByRole('button', { name: /ver como fico/i });
    // Should not throw
    expect(() => fireEvent.click(btn)).not.toThrow();
  });

  it('accepts optional delay prop without crashing', async () => {
    const { AlternativeRecommendationCard } = await import('@/components/consultation/AlternativeRecommendationCard');
    const { container } = render(<AlternativeRecommendationCard rank={2} {...mockRecommendation} delay={0.15} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('card aria-label includes ordinal and style name', async () => {
    const { AlternativeRecommendationCard } = await import('@/components/consultation/AlternativeRecommendationCard');
    render(<AlternativeRecommendationCard rank={2} {...mockRecommendation} />);
    const article = screen.getByRole('article');
    expect(article).toHaveAttribute('aria-label', '2a Recomendacao: Medium Fade');
  });
});
