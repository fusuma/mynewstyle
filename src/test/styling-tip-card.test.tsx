import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock framer-motion (not used in StylingTipCard directly but included for safety)
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <div data-testid="motion-div" {...props}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Scissors: ({ className, 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-scissors" className={className} aria-hidden={ariaHidden} />
  ),
  Lightbulb: ({ className, 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-lightbulb" className={className} aria-hidden={ariaHidden} />
  ),
}));

// Helper icon components for testing
const ScissorsIcon = ({ className, 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
  <svg data-testid="icon-scissors" className={className} aria-hidden={ariaHidden} />
);

const LightbulbIcon = ({ className, 'aria-hidden': ariaHidden }: React.SVGAttributes<SVGElement>) => (
  <svg data-testid="icon-lightbulb" className={className} aria-hidden={ariaHidden} />
);

describe('StylingTipCard - rendering', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders tip text', async () => {
    const { StylingTipCard } = await import('@/components/consultation/StylingTipCard');
    render(
      <StylingTipCard
        tipText="Use pomada de fixação"
        icon="scissors"
        category="products"
        IconComponent={ScissorsIcon}
      />
    );
    expect(screen.getByText('Use pomada de fixação')).toBeInTheDocument();
  });

  it('renders with category prop without crashing', async () => {
    const { StylingTipCard } = await import('@/components/consultation/StylingTipCard');
    render(
      <StylingTipCard
        tipText="Tip text here"
        icon="clock"
        category="Rotina Diaria"
        IconComponent={LightbulbIcon}
      />
    );
    expect(screen.getByText('Tip text here')).toBeInTheDocument();
  });

  it('renders the provided IconComponent', async () => {
    const { StylingTipCard } = await import('@/components/consultation/StylingTipCard');
    render(
      <StylingTipCard
        tipText="Test tip"
        icon="scissors"
        category="products"
        IconComponent={ScissorsIcon}
      />
    );
    expect(screen.getByTestId('icon-scissors')).toBeInTheDocument();
  });

  it('renders Lightbulb fallback when LightbulbIcon is passed', async () => {
    const { StylingTipCard } = await import('@/components/consultation/StylingTipCard');
    render(
      <StylingTipCard
        tipText="Test tip"
        icon=""
        category="products"
        IconComponent={LightbulbIcon}
      />
    );
    expect(screen.getByTestId('icon-lightbulb')).toBeInTheDocument();
  });
});

describe('StylingTipCard - accessibility', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('icon has aria-hidden="true" (decorative)', async () => {
    const { StylingTipCard } = await import('@/components/consultation/StylingTipCard');
    render(
      <StylingTipCard
        tipText="Test tip"
        icon="scissors"
        category="products"
        IconComponent={ScissorsIcon}
      />
    );
    const icon = screen.getByTestId('icon-scissors');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });

  it('has role="listitem" for use in list context', async () => {
    const { StylingTipCard } = await import('@/components/consultation/StylingTipCard');
    render(
      <StylingTipCard
        tipText="Test tip"
        icon="clock"
        category="routine"
        IconComponent={LightbulbIcon}
      />
    );
    const listitem = screen.getByRole('listitem');
    expect(listitem).toBeInTheDocument();
  });
});
