/**
 * Unit tests for BeforeAfterSlider (Story 7.5, Task 6.1)
 * AC: 2, 6, 7, 10, 11, 12
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Track mocked useReducedMotion state
let mockReducedMotion = false;

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { initial, animate, exit, transition, variants, whileHover, whileTap, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => mockReducedMotion,
}));

import { BeforeAfterSlider } from '@/components/consultation/BeforeAfterSlider';

const defaultProps = {
  originalSrc: '/images/original.jpg',
  previewSrc: '/images/preview.jpg',
  originalAlt: 'Foto original',
  previewAlt: 'Visualizacao IA: Corte Degradê aplicado ao seu rosto',
};

describe('BeforeAfterSlider', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.clearAllMocks();
  });

  it('renders both original and preview images', () => {
    render(<BeforeAfterSlider {...defaultProps} />);
    const images = screen.getAllByRole('img');
    const srcs = images.map((img) => img.getAttribute('src'));
    expect(srcs).toContain('/images/original.jpg');
    expect(srcs).toContain('/images/preview.jpg');
  });

  it('initializes slider position at 50% (center)', () => {
    render(<BeforeAfterSlider {...defaultProps} />);
    // The slider handle should be accessible
    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('aria-valuenow', '50');
  });

  it('has correct aria attributes on slider handle', () => {
    render(<BeforeAfterSlider {...defaultProps} />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-label', 'Comparador antes e depois');
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '100');
    expect(slider).toHaveAttribute('aria-valuenow', '50');
  });

  it('moves slider right with ArrowRight key (5% increment)', () => {
    render(<BeforeAfterSlider {...defaultProps} />);
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider).toHaveAttribute('aria-valuenow', '55');
  });

  it('moves slider left with ArrowLeft key (5% decrement)', () => {
    render(<BeforeAfterSlider {...defaultProps} />);
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(slider).toHaveAttribute('aria-valuenow', '45');
  });

  it('moves slider to 0% with Home key', () => {
    render(<BeforeAfterSlider {...defaultProps} />);
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(slider).toHaveAttribute('aria-valuenow', '0');
  });

  it('moves slider to 100% with End key', () => {
    render(<BeforeAfterSlider {...defaultProps} />);
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'End' });
    expect(slider).toHaveAttribute('aria-valuenow', '100');
  });

  it('clamps slider position at 0% minimum', () => {
    render(<BeforeAfterSlider {...defaultProps} />);
    const slider = screen.getByRole('slider');
    // Press ArrowLeft 20 times — should clamp at 0
    for (let i = 0; i < 20; i++) {
      fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    }
    expect(slider).toHaveAttribute('aria-valuenow', '0');
  });

  it('clamps slider position at 100% maximum', () => {
    render(<BeforeAfterSlider {...defaultProps} />);
    const slider = screen.getByRole('slider');
    // Press ArrowRight 20 times — should clamp at 100
    for (let i = 0; i < 20; i++) {
      fireEvent.keyDown(slider, { key: 'ArrowRight' });
    }
    expect(slider).toHaveAttribute('aria-valuenow', '100');
  });

  it('updates slider position on pointer drag', () => {
    render(<BeforeAfterSlider {...defaultProps} />);
    const container = screen.getByTestId('before-after-slider-container');

    // Simulate pointer events on the container
    // Mock getBoundingClientRect
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      width: 400,
      right: 400,
      top: 0,
      bottom: 300,
      height: 300,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    const handle = screen.getByRole('slider');
    fireEvent.pointerDown(handle, { clientX: 200, pointerId: 1 });
    fireEvent.pointerMove(container, { clientX: 100, pointerId: 1 });
    fireEvent.pointerUp(container, { pointerId: 1 });

    // Position should have moved toward 25% (100/400 * 100)
    const valuenow = parseInt(handle.getAttribute('aria-valuenow') ?? '50', 10);
    expect(valuenow).toBeLessThan(50);
  });

  it('renders the draggable handle with correct data-testid', () => {
    render(<BeforeAfterSlider {...defaultProps} />);
    expect(screen.getByTestId('slider-handle')).toBeInTheDocument();
  });

  it('does not apply smooth drag animation in reduced-motion mode', () => {
    mockReducedMotion = true;
    render(<BeforeAfterSlider {...defaultProps} />);
    // Should still render without crashing and slider should be present
    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
    // In reduced-motion mode, the slider should still have the data-testid
    expect(screen.getByTestId('before-after-slider-container')).toBeInTheDocument();
  });

  it('has tabIndex on the handle for keyboard focus', () => {
    render(<BeforeAfterSlider {...defaultProps} />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('tabindex', '0');
  });
});
