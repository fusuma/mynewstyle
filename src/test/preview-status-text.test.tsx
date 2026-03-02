/**
 * Tests for PreviewStatusText component (Story 7.4, AC: 5, 10)
 * Task 8.3: Unit tests for PreviewStatusText (cycling, aria-live)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';

let mockReducedMotion = false;

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => {
      const { initial, animate, exit, transition, variants, ...rest } = props;
      void initial; void animate; void exit; void transition; void variants;
      return <div {...rest}>{children}</div>;
    },
    p: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => {
      const { initial, animate, exit, transition, variants, ...rest } = props;
      void initial; void animate; void exit; void transition; void variants;
      return <p {...rest}>{children}</p>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => mockReducedMotion,
}));

import { PreviewStatusText } from '@/components/consultation/PreviewStatusText';

describe('PreviewStatusText', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockReducedMotion = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the first status message initially', () => {
    render(<PreviewStatusText />);
    expect(screen.getByText('A aplicar o estilo...')).toBeInTheDocument();
  });

  it('has aria-live="polite" region for screen readers', () => {
    render(<PreviewStatusText />);
    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
  });

  it('cycles to second message after ~4 seconds', () => {
    render(<PreviewStatusText />);
    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.getByText('A ajustar ao seu rosto...')).toBeInTheDocument();
  });

  it('cycles to third message after ~8 seconds', () => {
    render(<PreviewStatusText />);
    act(() => { vi.advanceTimersByTime(8000); });
    expect(screen.getByText('Quase pronto...')).toBeInTheDocument();
  });

  it('wraps back to first message after all messages shown', () => {
    render(<PreviewStatusText />);
    act(() => { vi.advanceTimersByTime(12000); });
    expect(screen.getByText('A aplicar o estilo...')).toBeInTheDocument();
  });

  it('shows static text without cycling in reduced-motion mode', () => {
    mockReducedMotion = true;
    render(<PreviewStatusText />);

    // Text should be present
    expect(screen.getByText('A aplicar o estilo...')).toBeInTheDocument();

    // Advance time — should NOT change text
    act(() => { vi.advanceTimersByTime(8000); });

    // Still shows first message
    expect(screen.getByText('A aplicar o estilo...')).toBeInTheDocument();
  });

  it('still announces initial text in reduced-motion mode', () => {
    mockReducedMotion = true;
    render(<PreviewStatusText />);
    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
  });
});
