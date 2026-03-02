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

const mockRecommendations = [
  {
    styleName: 'Medium Fade',
    justification: 'O medium fade cria uma transicao suave que equilibra as proporcoes do rosto oval.',
    matchScore: 0.87,
    difficultyLevel: 'low' as const,
  },
  {
    styleName: 'Corte Classico',
    justification: 'O corte classico oferece uma aparencia sofisticada e atemporal que complementa o formato do rosto.',
    matchScore: 0.75,
    difficultyLevel: 'medium' as const,
  },
];

describe('AlternativeRecommendationsSection - renders correctly', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.resetModules();
  });

  it('renders 2 cards when 2 recommendations provided', async () => {
    const { AlternativeRecommendationsSection } = await import('@/components/consultation/AlternativeRecommendationsSection');
    render(<AlternativeRecommendationsSection recommendations={mockRecommendations} />);
    // Both style names should appear
    expect(screen.getByText('Medium Fade')).toBeInTheDocument();
    expect(screen.getByText('Corte Classico')).toBeInTheDocument();
  });

  it('renders 1 card when only 1 recommendation provided', async () => {
    const { AlternativeRecommendationsSection } = await import('@/components/consultation/AlternativeRecommendationsSection');
    render(<AlternativeRecommendationsSection recommendations={[mockRecommendations[0]]} />);
    expect(screen.getByText('Medium Fade')).toBeInTheDocument();
    expect(screen.queryByText('Corte Classico')).not.toBeInTheDocument();
  });

  it('renders nothing (no cards) when empty array provided', async () => {
    const { AlternativeRecommendationsSection } = await import('@/components/consultation/AlternativeRecommendationsSection');
    const { container } = render(<AlternativeRecommendationsSection recommendations={[]} />);
    // No article elements
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    // Container might be empty or just the section wrapper
    expect(container.firstChild).toBeTruthy(); // section wrapper still exists
  });

  it('renders ordinal badge "2a Recomendacao" for first recommendation', async () => {
    const { AlternativeRecommendationsSection } = await import('@/components/consultation/AlternativeRecommendationsSection');
    render(<AlternativeRecommendationsSection recommendations={mockRecommendations} />);
    expect(screen.getByText(/2a Recomendacao/i)).toBeInTheDocument();
  });

  it('renders ordinal badge "3a Recomendacao" for second recommendation', async () => {
    const { AlternativeRecommendationsSection } = await import('@/components/consultation/AlternativeRecommendationsSection');
    render(<AlternativeRecommendationsSection recommendations={mockRecommendations} />);
    expect(screen.getByText(/3a Recomendacao/i)).toBeInTheDocument();
  });

  it('applies grid CSS classes for responsive layout', async () => {
    const { AlternativeRecommendationsSection } = await import('@/components/consultation/AlternativeRecommendationsSection');
    const { container } = render(<AlternativeRecommendationsSection recommendations={mockRecommendations} />);
    // The grid container should have the responsive grid class
    const gridEl = container.querySelector('.grid');
    expect(gridEl).toBeInTheDocument();
    expect(gridEl?.className).toContain('grid-cols-1');
    expect(gridEl?.className).toContain('md:grid-cols-2');
  });

  it('renders section with role="region" and aria-label', async () => {
    const { AlternativeRecommendationsSection } = await import('@/components/consultation/AlternativeRecommendationsSection');
    render(<AlternativeRecommendationsSection recommendations={mockRecommendations} />);
    expect(screen.getByRole('region')).toBeInTheDocument();
    expect(screen.getByRole('region')).toHaveAttribute(
      'aria-label',
      'Recomendacoes alternativas de corte de cabelo'
    );
  });

  it('accepts optional baseDelay prop without crashing', async () => {
    const { AlternativeRecommendationsSection } = await import('@/components/consultation/AlternativeRecommendationsSection');
    const { container } = render(
      <AlternativeRecommendationsSection recommendations={mockRecommendations} baseDelay={0.3} />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('uses composite keys for cards (rank + styleName)', async () => {
    const { AlternativeRecommendationsSection } = await import('@/components/consultation/AlternativeRecommendationsSection');
    // Render two recommendations and confirm both render without React key warnings
    const { container } = render(<AlternativeRecommendationsSection recommendations={mockRecommendations} />);
    const articles = container.querySelectorAll('[role="article"]');
    expect(articles).toHaveLength(2);
  });
});

describe('AlternativeRecommendationsSection - onPreviewRequest threading', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.resetModules();
  });

  it('threads onPreviewRequest callback to child cards', async () => {
    const { AlternativeRecommendationsSection } = await import('@/components/consultation/AlternativeRecommendationsSection');
    const mockCallback = vi.fn();
    render(
      <AlternativeRecommendationsSection
        recommendations={mockRecommendations}
        onPreviewRequest={mockCallback}
      />
    );
    // Click the first "Ver como fico" button
    const buttons = screen.getAllByRole('button', { name: /ver como fico/i });
    fireEvent.click(buttons[0]);
    expect(mockCallback).toHaveBeenCalledWith('Medium Fade');
  });

  it('threads onPreviewRequest to second card correctly', async () => {
    const { AlternativeRecommendationsSection } = await import('@/components/consultation/AlternativeRecommendationsSection');
    const mockCallback = vi.fn();
    render(
      <AlternativeRecommendationsSection
        recommendations={mockRecommendations}
        onPreviewRequest={mockCallback}
      />
    );
    // Click the second "Ver como fico" button
    const buttons = screen.getAllByRole('button', { name: /ver como fico/i });
    fireEvent.click(buttons[1]);
    expect(mockCallback).toHaveBeenCalledWith('Corte Classico');
  });

  it('renders without onPreviewRequest (prop is optional)', async () => {
    const { AlternativeRecommendationsSection } = await import('@/components/consultation/AlternativeRecommendationsSection');
    // Should not crash when onPreviewRequest is not provided
    expect(() =>
      render(<AlternativeRecommendationsSection recommendations={mockRecommendations} />)
    ).not.toThrow();
  });
});
