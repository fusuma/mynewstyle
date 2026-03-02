import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { GroomingTip } from '@/types/index';

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
      <div data-testid="motion-div" {...stripMotionProps(props)}>{children}</div>
    ),
    section: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <section {...stripMotionProps(props)}>{children}</section>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => mockReducedMotion,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Scissors: ({ className, 'aria-hidden': ariaHidden, 'aria-label': ariaLabel }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-scissors" className={className} aria-hidden={ariaHidden} aria-label={ariaLabel} />
  ),
  Droplets: ({ className, 'aria-hidden': ariaHidden, 'aria-label': ariaLabel }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-droplets" className={className} aria-hidden={ariaHidden} aria-label={ariaLabel} />
  ),
  Clock: ({ className, 'aria-hidden': ariaHidden, 'aria-label': ariaLabel }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-clock" className={className} aria-hidden={ariaHidden} aria-label={ariaLabel} />
  ),
  SprayCan: ({ className, 'aria-hidden': ariaHidden, 'aria-label': ariaLabel }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-spray-can" className={className} aria-hidden={ariaHidden} aria-label={ariaLabel} />
  ),
  Wand2: ({ className, 'aria-hidden': ariaHidden, 'aria-label': ariaLabel }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-wand2" className={className} aria-hidden={ariaHidden} aria-label={ariaLabel} />
  ),
  Sparkles: ({ className, 'aria-hidden': ariaHidden, 'aria-label': ariaLabel }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-sparkles" className={className} aria-hidden={ariaHidden} aria-label={ariaLabel} />
  ),
  Brush: ({ className, 'aria-hidden': ariaHidden, 'aria-label': ariaLabel }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-brush" className={className} aria-hidden={ariaHidden} aria-label={ariaLabel} />
  ),
  ShowerHead: ({ className, 'aria-hidden': ariaHidden, 'aria-label': ariaLabel }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-shower-head" className={className} aria-hidden={ariaHidden} aria-label={ariaLabel} />
  ),
  Star: ({ className, 'aria-hidden': ariaHidden, 'aria-label': ariaLabel }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-star" className={className} aria-hidden={ariaHidden} aria-label={ariaLabel} />
  ),
  Palette: ({ className, 'aria-hidden': ariaHidden, 'aria-label': ariaLabel }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-palette" className={className} aria-hidden={ariaHidden} aria-label={ariaLabel} />
  ),
}));

// ---- Mock data ----

const maleTipsData: GroomingTip[] = [
  { category: 'products', tipText: 'Use pomada de fixação média', icon: 'sparkles' },
  { category: 'routine', tipText: 'Lave o cabelo a cada 2 dias', icon: 'droplets' },
  { category: 'barber_tips', tipText: 'Peça ao barbeiro para aparar as pontas', icon: 'scissors' },
  { category: 'products', tipText: 'Aplique leave-in antes de secar', icon: 'spray-can' },
];

const femaleTipsData: GroomingTip[] = [
  { category: 'products', tipText: 'Use condicionador hidratante', icon: 'droplets' },
  { category: 'routine', tipText: 'Evite lavar o cabelo todos os dias', icon: 'clock' },
  { category: 'barber_tips', tipText: 'Peça à cabeleireira franja levinha', icon: 'scissors' },
];

const mixedTipsData: GroomingTip[] = [
  { category: 'products', tipText: 'Tip A', icon: 'comb' },
  { category: 'routine', tipText: 'Tip B', icon: 'clock' },
  { category: 'barber_tips', tipText: 'Tip C', icon: 'scissors' },
];

// ---- Tests ----

describe('GroomingTips - card count rendering', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.resetModules();
  });

  it('renders correct number of tip cards for given data (4 tips)', async () => {
    const { GroomingTips } = await import('@/components/consultation/GroomingTips');
    render(<GroomingTips groomingTips={maleTipsData} gender="male" />);
    // Each tip renders as a listitem
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(4);
  });

  it('renders correct number of tip cards for 3-tip female data', async () => {
    const { GroomingTips } = await import('@/components/consultation/GroomingTips');
    render(<GroomingTips groomingTips={femaleTipsData} gender="female" />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
  });

  it('displays tip text for each card', async () => {
    const { GroomingTips } = await import('@/components/consultation/GroomingTips');
    render(<GroomingTips groomingTips={mixedTipsData} gender="male" />);
    expect(screen.getByText('Tip A')).toBeInTheDocument();
    expect(screen.getByText('Tip B')).toBeInTheDocument();
    expect(screen.getByText('Tip C')).toBeInTheDocument();
  });
});

describe('GroomingTips - category grouping', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.resetModules();
  });

  it('renders "Produtos" category header as h3', async () => {
    const { GroomingTips } = await import('@/components/consultation/GroomingTips');
    render(<GroomingTips groomingTips={mixedTipsData} gender="male" />);
    // Category header is an h3; use role query to be specific
    const heading = screen.getByRole('heading', { name: 'Produtos' });
    expect(heading).toBeInTheDocument();
  });

  it('renders "Rotina Diária" category header as h3', async () => {
    const { GroomingTips } = await import('@/components/consultation/GroomingTips');
    render(<GroomingTips groomingTips={mixedTipsData} gender="male" />);
    const heading = screen.getByRole('heading', { name: 'Rotina Diária' });
    expect(heading).toBeInTheDocument();
  });

  it('only renders category headers for categories that have tips', async () => {
    const { GroomingTips } = await import('@/components/consultation/GroomingTips');
    const onlyProductsTips: GroomingTip[] = [
      { category: 'products', tipText: 'Produto A', icon: 'droplets' },
    ];
    render(<GroomingTips groomingTips={onlyProductsTips} gender="male" />);
    expect(screen.getByRole('heading', { name: 'Produtos' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Rotina Diária' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Dicas para o Barbeiro' })).not.toBeInTheDocument();
  });
});

describe('GroomingTips - gender-specific category labels', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.resetModules();
  });

  it('male path shows "Dicas para o Barbeiro" as category heading', async () => {
    const { GroomingTips } = await import('@/components/consultation/GroomingTips');
    render(<GroomingTips groomingTips={mixedTipsData} gender="male" />);
    expect(screen.getByRole('heading', { name: 'Dicas para o Barbeiro' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Dicas para o Cabeleireiro' })).not.toBeInTheDocument();
  });

  it('female path shows "Dicas para o Cabeleireiro" as category heading', async () => {
    const { GroomingTips } = await import('@/components/consultation/GroomingTips');
    render(<GroomingTips groomingTips={mixedTipsData} gender="female" />);
    expect(screen.getByRole('heading', { name: 'Dicas para o Cabeleireiro' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Dicas para o Barbeiro' })).not.toBeInTheDocument();
  });
});

describe('GroomingTips - icon rendering', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.resetModules();
  });

  it('renders Lucide Scissors icon for "scissors" icon string', async () => {
    const { GroomingTips } = await import('@/components/consultation/GroomingTips');
    const tips: GroomingTip[] = [{ category: 'products', tipText: 'Test tip', icon: 'scissors' }];
    render(<GroomingTips groomingTips={tips} gender="male" />);
    expect(screen.getByTestId('icon-scissors')).toBeInTheDocument();
  });

  it('renders Lucide Droplets icon for "droplets" icon string', async () => {
    const { GroomingTips } = await import('@/components/consultation/GroomingTips');
    const tips: GroomingTip[] = [{ category: 'products', tipText: 'Test tip', icon: 'droplets' }];
    render(<GroomingTips groomingTips={tips} gender="male" />);
    expect(screen.getByTestId('icon-droplets')).toBeInTheDocument();
  });

  it('renders Lucide Wand2 icon for "comb" icon string', async () => {
    const { GroomingTips } = await import('@/components/consultation/GroomingTips');
    const tips: GroomingTip[] = [{ category: 'products', tipText: 'Test tip', icon: 'comb' }];
    render(<GroomingTips groomingTips={tips} gender="male" />);
    expect(screen.getByTestId('icon-wand2')).toBeInTheDocument();
  });

  it('falls back to Sparkles icon for unknown icon strings', async () => {
    const { GroomingTips } = await import('@/components/consultation/GroomingTips');
    const tips: GroomingTip[] = [{ category: 'products', tipText: 'Test tip', icon: 'unknown-icon-xyz' }];
    render(<GroomingTips groomingTips={tips} gender="male" />);
    expect(screen.getByTestId('icon-sparkles')).toBeInTheDocument();
  });

  it('falls back to Sparkles icon for empty icon string', async () => {
    const { GroomingTips } = await import('@/components/consultation/GroomingTips');
    const tips: GroomingTip[] = [{ category: 'products', tipText: 'Test tip', icon: '' }];
    render(<GroomingTips groomingTips={tips} gender="male" />);
    expect(screen.getByTestId('icon-sparkles')).toBeInTheDocument();
  });
});

describe('GroomingTips - reduced motion', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders correctly with reduced motion disabled', async () => {
    mockReducedMotion = false;
    const { GroomingTips } = await import('@/components/consultation/GroomingTips');
    render(<GroomingTips groomingTips={mixedTipsData} gender="male" />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('renders correctly with reduced motion enabled (no animation crash)', async () => {
    mockReducedMotion = true;
    const { GroomingTips } = await import('@/components/consultation/GroomingTips');
    render(<GroomingTips groomingTips={mixedTipsData} gender="male" />);
    // Component should still render all cards even with reduced motion
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('motion.div wrapper elements are present', async () => {
    mockReducedMotion = false;
    const { GroomingTips } = await import('@/components/consultation/GroomingTips');
    render(<GroomingTips groomingTips={mixedTipsData} gender="male" />);
    const motionDivs = screen.getAllByTestId('motion-div');
    expect(motionDivs.length).toBeGreaterThan(0);
  });
});

describe('GroomingTips - accessibility', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.resetModules();
  });

  it('container has role="list"', async () => {
    const { GroomingTips } = await import('@/components/consultation/GroomingTips');
    render(<GroomingTips groomingTips={mixedTipsData} gender="male" />);
    // There should be at least one list role (one per category group)
    const lists = screen.getAllByRole('list');
    expect(lists.length).toBeGreaterThan(0);
  });

  it('each card has role="listitem"', async () => {
    const { GroomingTips } = await import('@/components/consultation/GroomingTips');
    render(<GroomingTips groomingTips={mixedTipsData} gender="male" />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
  });

  it('icons are hidden from screen readers via aria-hidden', async () => {
    const { GroomingTips } = await import('@/components/consultation/GroomingTips');
    const tips: GroomingTip[] = [{ category: 'products', tipText: 'Tip with scissors', icon: 'scissors' }];
    render(<GroomingTips groomingTips={tips} gender="male" />);
    const icon = screen.getByTestId('icon-scissors');
    // Decorative icon should be hidden from screen readers — tip text provides the accessible label
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });

  it('section has accessible label for "Cuidados e Dicas"', async () => {
    const { GroomingTips } = await import('@/components/consultation/GroomingTips');
    render(<GroomingTips groomingTips={mixedTipsData} gender="male" />);
    // The section should be labelled
    const section = screen.getByRole('region', { name: /cuidados/i });
    expect(section).toBeInTheDocument();
  });
});
