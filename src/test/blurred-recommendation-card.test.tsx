import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
}));

describe('BlurredRecommendationCard', () => {
  it('renders with rank 1 showing Recomendacao #1', async () => {
    const { BlurredRecommendationCard } = await import(
      '@/components/consultation/BlurredRecommendationCard'
    );
    render(<BlurredRecommendationCard rank={1} />);
    expect(screen.getByText('Recomendacao #1')).toBeDefined();
  });

  it('renders with rank 2 showing Recomendacao #2', async () => {
    const { BlurredRecommendationCard } = await import(
      '@/components/consultation/BlurredRecommendationCard'
    );
    render(<BlurredRecommendationCard rank={2} />);
    expect(screen.getByText('Recomendacao #2')).toBeDefined();
  });

  it('renders with rank 3 showing Recomendacao #3', async () => {
    const { BlurredRecommendationCard } = await import(
      '@/components/consultation/BlurredRecommendationCard'
    );
    render(<BlurredRecommendationCard rank={3} />);
    expect(screen.getByText('Recomendacao #3')).toBeDefined();
  });

  it('renders a disabled "Ver como fico" button', async () => {
    const { BlurredRecommendationCard } = await import(
      '@/components/consultation/BlurredRecommendationCard'
    );
    render(<BlurredRecommendationCard rank={1} />);
    const button = screen.getByRole('button', { name: /ver como fico/i });
    expect(button).toBeDefined();
    // The button should be visually disabled or non-interactive
    expect(button.getAttribute('disabled')).not.toBeNull();
  });

  it('applies blur styling to card content', async () => {
    const { BlurredRecommendationCard } = await import(
      '@/components/consultation/BlurredRecommendationCard'
    );
    const { container } = render(<BlurredRecommendationCard rank={1} />);
    // Find elements with blur styling
    const blurredElements = container.querySelectorAll('[class*="blur"]');
    expect(blurredElements.length).toBeGreaterThan(0);
  });

  it('does not contain real consultation data', async () => {
    const { BlurredRecommendationCard } = await import(
      '@/components/consultation/BlurredRecommendationCard'
    );
    const { container } = render(<BlurredRecommendationCard rank={1} />);
    // Should NOT contain any detailed real recommendation content
    expect(container.textContent).not.toContain('mm de comprimento');
  });
});
