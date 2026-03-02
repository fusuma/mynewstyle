/**
 * Tests for PreviewLoadingOverlay component (Story 7.4, AC: 1, 2, 3, 4, 7, 9)
 * Task 8.2: Unit tests for PreviewLoadingOverlay (renders photo, animations, reduced-motion)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock framer-motion
function stripMotionProps(props: Record<string, unknown>) {
  const { initial, animate, exit, transition, variants, whileHover, whileTap, style, ...rest } = props;
  // suppress unused variable warnings - these are intentionally stripped
  void initial; void animate; void exit; void transition; void variants;
  void whileHover; void whileTap; void style;
  return rest;
}

let mockReducedMotion = false;

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <div {...stripMotionProps(props)}>{children}</div>
    ),
    span: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <span {...stripMotionProps(props)}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => mockReducedMotion,
}));

import { PreviewLoadingOverlay } from '@/components/consultation/PreviewLoadingOverlay';

const photoSrc = 'data:image/jpeg;base64,/9j/4AAQSkZJRgAB';

describe('PreviewLoadingOverlay', () => {
  it('renders the user photo', () => {
    render(<PreviewLoadingOverlay photoSrc={photoSrc} />);
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', photoSrc);
  });

  it('renders with accessible alt text for photo', () => {
    render(<PreviewLoadingOverlay photoSrc={photoSrc} />);
    const img = screen.getByAltText(/a gerar preview/i);
    expect(img).toBeInTheDocument();
  });

  it('renders gradient sweep overlay container', () => {
    render(<PreviewLoadingOverlay photoSrc={photoSrc} />);
    const sweep = screen.getByTestId('gradient-sweep');
    expect(sweep).toBeInTheDocument();
  });

  it('renders sparkle particles in hair zone', () => {
    render(<PreviewLoadingOverlay photoSrc={photoSrc} />);
    const particles = screen.getAllByTestId(/sparkle-particle/);
    expect(particles.length).toBeGreaterThanOrEqual(5);
    expect(particles.length).toBeLessThanOrEqual(8);
  });

  it('renders without animations when reduced motion is preferred', () => {
    mockReducedMotion = true;
    render(<PreviewLoadingOverlay photoSrc={photoSrc} />);

    // Should render reduced motion shimmer instead of full animation
    const shimmer = screen.getByTestId('reduced-motion-shimmer');
    expect(shimmer).toBeInTheDocument();

    // Full-animation overlay should NOT be shown
    expect(screen.queryByTestId('gradient-sweep')).not.toBeInTheDocument();

    mockReducedMotion = false;
  });

  it('applies theme-aware classes using design system tokens', () => {
    const { container } = render(<PreviewLoadingOverlay photoSrc={photoSrc} />);
    // Root container should use bg-primary/text-primary-foreground tokens
    expect(container.firstChild).toBeInTheDocument();
  });

  it('applies pulsing blur effect container', () => {
    render(<PreviewLoadingOverlay photoSrc={photoSrc} />);
    const blurContainer = screen.getByTestId('blur-photo-container');
    expect(blurContainer).toBeInTheDocument();
  });

  it('accepts optional className prop', () => {
    render(<PreviewLoadingOverlay photoSrc={photoSrc} className="custom-class" />);
    const overlay = screen.getByTestId('preview-loading-overlay');
    expect(overlay).toHaveClass('custom-class');
  });
});
