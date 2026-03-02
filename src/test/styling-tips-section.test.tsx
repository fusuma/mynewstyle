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
  },
  useReducedMotion: () => mockReducedMotion,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Scissors: ({ className, 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-scissors" className={className} aria-hidden={ariaHidden} />
  ),
  Droplets: ({ className, 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-droplets" className={className} aria-hidden={ariaHidden} />
  ),
  Clock: ({ className, 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-clock" className={className} aria-hidden={ariaHidden} />
  ),
  SprayCan: ({ className, 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-spray-can" className={className} aria-hidden={ariaHidden} />
  ),
  Wand2: ({ className, 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-wand2" className={className} aria-hidden={ariaHidden} />
  ),
  Sparkles: ({ className, 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-sparkles" className={className} aria-hidden={ariaHidden} />
  ),
  Brush: ({ className, 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-brush" className={className} aria-hidden={ariaHidden} />
  ),
  ShowerHead: ({ className, 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-shower-head" className={className} aria-hidden={ariaHidden} />
  ),
  Star: ({ className, 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-star" className={className} aria-hidden={ariaHidden} />
  ),
  Palette: ({ className, 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-palette" className={className} aria-hidden={ariaHidden} />
  ),
  Lightbulb: ({ className, 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-lightbulb" className={className} aria-hidden={ariaHidden} />
  ),
  Comb: ({ className, 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-comb" className={className} aria-hidden={ariaHidden} />
  ),
  Wind: ({ className, 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-wind" className={className} aria-hidden={ariaHidden} />
  ),
  Heart: ({ className, 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-heart" className={className} aria-hidden={ariaHidden} />
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
  { category: 'products', tipText: 'Tip A', icon: 'sparkles' },
  { category: 'routine', tipText: 'Tip B', icon: 'clock' },
  { category: 'barber_tips', tipText: 'Tip C', icon: 'scissors' },
];

// ---- Tests ----

describe('StylingTipsSection - card count rendering', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.resetModules();
  });

  it('renders correct number of tip cards for 4-tip male data', async () => {
    const { StylingTipsSection } = await import('@/components/consultation/StylingTipsSection');
    render(<StylingTipsSection groomingTips={maleTipsData} gender="male" />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(4);
  });

  it('renders correct number of tip cards for 3-tip female data', async () => {
    const { StylingTipsSection } = await import('@/components/consultation/StylingTipsSection');
    render(<StylingTipsSection groomingTips={femaleTipsData} gender="female" />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
  });

  it('displays tip text for each card', async () => {
    const { StylingTipsSection } = await import('@/components/consultation/StylingTipsSection');
    render(<StylingTipsSection groomingTips={mixedTipsData} gender="male" />);
    expect(screen.getByText('Tip A')).toBeInTheDocument();
    expect(screen.getByText('Tip B')).toBeInTheDocument();
    expect(screen.getByText('Tip C')).toBeInTheDocument();
  });
});

describe('StylingTipsSection - empty state', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.resetModules();
  });

  it('returns null when groomingTips is empty array', async () => {
    const { StylingTipsSection } = await import('@/components/consultation/StylingTipsSection');
    const { container } = render(<StylingTipsSection groomingTips={[]} gender="male" />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when groomingTips is undefined', async () => {
    const { StylingTipsSection } = await import('@/components/consultation/StylingTipsSection');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { container } = render(<StylingTipsSection groomingTips={undefined as any} gender="male" />);
    expect(container.firstChild).toBeNull();
  });
});

describe('StylingTipsSection - category grouping', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.resetModules();
  });

  it('renders "Produtos" category header as h3', async () => {
    const { StylingTipsSection } = await import('@/components/consultation/StylingTipsSection');
    render(<StylingTipsSection groomingTips={mixedTipsData} gender="male" />);
    const heading = screen.getByRole('heading', { name: 'Produtos' });
    expect(heading).toBeInTheDocument();
  });

  it('renders "Rotina Diaria" category header as h3', async () => {
    const { StylingTipsSection } = await import('@/components/consultation/StylingTipsSection');
    render(<StylingTipsSection groomingTips={mixedTipsData} gender="male" />);
    const heading = screen.getByRole('heading', { name: 'Rotina Diaria' });
    expect(heading).toBeInTheDocument();
  });

  it('only renders category headers for categories that have tips', async () => {
    const { StylingTipsSection } = await import('@/components/consultation/StylingTipsSection');
    const onlyProductsTips: GroomingTip[] = [
      { category: 'products', tipText: 'Produto A', icon: 'droplets' },
    ];
    render(<StylingTipsSection groomingTips={onlyProductsTips} gender="male" />);
    expect(screen.getByRole('heading', { name: 'Produtos' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Rotina Diaria' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Dicas para o Barbeiro/Cabeleireiro' })).not.toBeInTheDocument();
  });
});

describe('StylingTipsSection - gender-specific category labels', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.resetModules();
  });

  it('male path shows "Dicas para o Barbeiro/Cabeleireiro" as category heading', async () => {
    const { StylingTipsSection } = await import('@/components/consultation/StylingTipsSection');
    render(<StylingTipsSection groomingTips={mixedTipsData} gender="male" />);
    expect(screen.getByRole('heading', { name: 'Dicas para o Barbeiro/Cabeleireiro' })).toBeInTheDocument();
  });

  it('female path shows "Dicas para o Cabeleireiro" as category heading', async () => {
    const { StylingTipsSection } = await import('@/components/consultation/StylingTipsSection');
    render(<StylingTipsSection groomingTips={mixedTipsData} gender="female" />);
    expect(screen.getByRole('heading', { name: 'Dicas para o Cabeleireiro' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Dicas para o Barbeiro/Cabeleireiro' })).not.toBeInTheDocument();
  });
});

describe('StylingTipsSection - icon rendering', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.resetModules();
  });

  it('renders Scissors icon for "scissors" icon string', async () => {
    const { StylingTipsSection } = await import('@/components/consultation/StylingTipsSection');
    const tips: GroomingTip[] = [{ category: 'products', tipText: 'Test tip', icon: 'scissors' }];
    render(<StylingTipsSection groomingTips={tips} gender="male" />);
    expect(screen.getByTestId('icon-scissors')).toBeInTheDocument();
  });

  it('falls back to Lightbulb for unrecognized icon string', async () => {
    const { StylingTipsSection } = await import('@/components/consultation/StylingTipsSection');
    const tips: GroomingTip[] = [{ category: 'products', tipText: 'Test tip', icon: 'unknown-icon-xyz' }];
    render(<StylingTipsSection groomingTips={tips} gender="male" />);
    expect(screen.getByTestId('icon-lightbulb')).toBeInTheDocument();
  });
});

describe('StylingTipsSection - reduced motion', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders correctly with reduced motion disabled', async () => {
    mockReducedMotion = false;
    const { StylingTipsSection } = await import('@/components/consultation/StylingTipsSection');
    render(<StylingTipsSection groomingTips={mixedTipsData} gender="male" />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('renders correctly with reduced motion enabled (no animation crash)', async () => {
    mockReducedMotion = true;
    const { StylingTipsSection } = await import('@/components/consultation/StylingTipsSection');
    render(<StylingTipsSection groomingTips={mixedTipsData} gender="male" />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('motion.div wrapper elements are present', async () => {
    mockReducedMotion = false;
    const { StylingTipsSection } = await import('@/components/consultation/StylingTipsSection');
    render(<StylingTipsSection groomingTips={mixedTipsData} gender="male" />);
    const motionDivs = screen.getAllByTestId('motion-div');
    expect(motionDivs.length).toBeGreaterThan(0);
  });
});

describe('StylingTipsSection - accessibility', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.resetModules();
  });

  it('container has role="list"', async () => {
    const { StylingTipsSection } = await import('@/components/consultation/StylingTipsSection');
    render(<StylingTipsSection groomingTips={mixedTipsData} gender="male" />);
    const lists = screen.getAllByRole('list');
    expect(lists.length).toBeGreaterThan(0);
  });

  it('each card has role="listitem"', async () => {
    const { StylingTipsSection } = await import('@/components/consultation/StylingTipsSection');
    render(<StylingTipsSection groomingTips={mixedTipsData} gender="male" />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
  });

  it('icons are hidden from screen readers via aria-hidden', async () => {
    const { StylingTipsSection } = await import('@/components/consultation/StylingTipsSection');
    const tips: GroomingTip[] = [{ category: 'products', tipText: 'Tip with scissors', icon: 'scissors' }];
    render(<StylingTipsSection groomingTips={tips} gender="male" />);
    const icon = screen.getByTestId('icon-scissors');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });

  it('section has accessible label', async () => {
    const { StylingTipsSection } = await import('@/components/consultation/StylingTipsSection');
    render(<StylingTipsSection groomingTips={mixedTipsData} gender="male" />);
    const section = screen.getByRole('region', { name: /dicas de estilo/i });
    expect(section).toBeInTheDocument();
  });
});
