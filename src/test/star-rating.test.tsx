/**
 * Tests for StarRating component
 * Story 10.5: Post-Consultation Rating — AC #1, #9, #10
 *
 * Target: 7+ tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock lucide-react Star icon
vi.mock('lucide-react', () => ({
  Star: ({ className, ...props }: { className?: string; [key: string]: unknown }) => (
    <svg data-testid="star-icon" className={className} {...props} />
  ),
}));

// Mock framer-motion
let mockReducedMotion = false;
vi.mock('framer-motion', () => ({
  useReducedMotion: () => mockReducedMotion,
  motion: {
    div: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

describe('StarRating — renders correctly', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.clearAllMocks();
  });

  it('renders 5 star icons', async () => {
    const { StarRating } = await import('@/components/consultation/StarRating');
    const onChange = vi.fn();
    render(<StarRating value={null} onChange={onChange} />);
    const stars = screen.getAllByTestId('star-icon');
    expect(stars).toHaveLength(5);
  });

  it('renders with role="radiogroup"', async () => {
    const { StarRating } = await import('@/components/consultation/StarRating');
    render(<StarRating value={null} onChange={vi.fn()} label="Rate this" />);
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('renders each star with role="radio"', async () => {
    const { StarRating } = await import('@/components/consultation/StarRating');
    render(<StarRating value={null} onChange={vi.fn()} />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(5);
  });

  it('renders correct aria-labels for each star (estrela/estrelas)', async () => {
    const { StarRating } = await import('@/components/consultation/StarRating');
    render(<StarRating value={null} onChange={vi.fn()} />);
    expect(screen.getByLabelText('1 estrela')).toBeInTheDocument();
    expect(screen.getByLabelText('2 estrelas')).toBeInTheDocument();
    expect(screen.getByLabelText('3 estrelas')).toBeInTheDocument();
    expect(screen.getByLabelText('4 estrelas')).toBeInTheDocument();
    expect(screen.getByLabelText('5 estrelas')).toBeInTheDocument();
  });
});

describe('StarRating — interaction', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.clearAllMocks();
  });

  it('calls onChange when a star is clicked', async () => {
    const { StarRating } = await import('@/components/consultation/StarRating');
    const onChange = vi.fn();
    render(<StarRating value={null} onChange={onChange} />);
    const thirdStar = screen.getByLabelText('3 estrelas');
    fireEvent.click(thirdStar);
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('sets aria-checked=true on selected star', async () => {
    const { StarRating } = await import('@/components/consultation/StarRating');
    render(<StarRating value={4} onChange={vi.fn()} />);
    const fourthStar = screen.getByLabelText('4 estrelas');
    expect(fourthStar.getAttribute('aria-checked')).toBe('true');
  });

  it('sets aria-checked=false on non-selected stars when value is set', async () => {
    const { StarRating } = await import('@/components/consultation/StarRating');
    render(<StarRating value={3} onChange={vi.fn()} />);
    const fifthStar = screen.getByLabelText('5 estrelas');
    expect(fifthStar.getAttribute('aria-checked')).toBe('false');
  });

  it('does not call onChange when disabled', async () => {
    const { StarRating } = await import('@/components/consultation/StarRating');
    const onChange = vi.fn();
    render(<StarRating value={null} onChange={onChange} disabled />);
    const star = screen.getByLabelText('1 estrela');
    fireEvent.click(star);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('StarRating — keyboard navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles ArrowRight key to increase rating', async () => {
    const { StarRating } = await import('@/components/consultation/StarRating');
    const onChange = vi.fn();
    render(<StarRating value={2} onChange={onChange} />);
    const radioGroup = screen.getByRole('radiogroup');
    fireEvent.keyDown(radioGroup, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('handles ArrowLeft key to decrease rating', async () => {
    const { StarRating } = await import('@/components/consultation/StarRating');
    const onChange = vi.fn();
    render(<StarRating value={4} onChange={onChange} />);
    const radioGroup = screen.getByRole('radiogroup');
    fireEvent.keyDown(radioGroup, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('does not go below 1 with ArrowLeft', async () => {
    const { StarRating } = await import('@/components/consultation/StarRating');
    const onChange = vi.fn();
    render(<StarRating value={1} onChange={onChange} />);
    const radioGroup = screen.getByRole('radiogroup');
    fireEvent.keyDown(radioGroup, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('does not go above 5 with ArrowRight', async () => {
    const { StarRating } = await import('@/components/consultation/StarRating');
    const onChange = vi.fn();
    render(<StarRating value={5} onChange={onChange} />);
    const radioGroup = screen.getByRole('radiogroup');
    fireEvent.keyDown(radioGroup, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith(5);
  });
});

describe('StarRating — reduced motion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashes when prefers-reduced-motion is enabled', async () => {
    mockReducedMotion = true;
    const { StarRating } = await import('@/components/consultation/StarRating');
    const { container } = render(<StarRating value={null} onChange={vi.fn()} />);
    expect(container).toBeDefined();
  });

  it('still renders 5 stars when reduced motion is enabled', async () => {
    mockReducedMotion = true;
    const { StarRating } = await import('@/components/consultation/StarRating');
    render(<StarRating value={null} onChange={vi.fn()} />);
    const stars = screen.getAllByTestId('star-icon');
    expect(stars).toHaveLength(5);
  });
});
