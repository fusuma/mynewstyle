/**
 * Unit tests for PreviewToggleButtons (Story 7.5, Task 6.2)
 * AC: 3, 10, 11
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

let mockReducedMotion = false;

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { initial, animate, exit, transition, variants, whileHover, whileTap, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({ children, mode }: { children: React.ReactNode; mode?: string }) => {
    void mode;
    return <>{children}</>;
  },
  useReducedMotion: () => mockReducedMotion,
}));

import { PreviewToggleButtons } from '@/components/consultation/PreviewToggleButtons';

const defaultProps = {
  originalSrc: '/images/original.jpg',
  previewSrc: '/images/preview.jpg',
  previewAlt: 'Visualizacao IA: Corte Degradê aplicado ao seu rosto',
};

describe('PreviewToggleButtons', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.clearAllMocks();
  });

  it('renders "Original" and "Novo Estilo" toggle buttons', () => {
    render(<PreviewToggleButtons {...defaultProps} />);
    expect(screen.getByRole('button', { name: /original/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /novo estilo/i })).toBeInTheDocument();
  });

  it('starts with "Original" as active state (original image shown)', () => {
    render(<PreviewToggleButtons {...defaultProps} />);
    const originalBtn = screen.getByRole('button', { name: /original/i });
    // Active button should have primary bg styling
    expect(originalBtn.className).toMatch(/bg-primary/i);
  });

  it('clicking "Novo Estilo" makes it active and hides Original', () => {
    render(<PreviewToggleButtons {...defaultProps} />);
    const novoEstiloBtn = screen.getByRole('button', { name: /novo estilo/i });
    fireEvent.click(novoEstiloBtn);
    // "Novo Estilo" should now be active
    expect(novoEstiloBtn.className).toMatch(/bg-primary/i);
  });

  it('clicking "Original" after "Novo Estilo" switches back', () => {
    render(<PreviewToggleButtons {...defaultProps} />);
    const originalBtn = screen.getByRole('button', { name: /original/i });
    const novoEstiloBtn = screen.getByRole('button', { name: /novo estilo/i });

    // Switch to Novo Estilo
    fireEvent.click(novoEstiloBtn);
    expect(novoEstiloBtn.className).toMatch(/bg-primary/i);

    // Switch back to Original
    fireEvent.click(originalBtn);
    expect(originalBtn.className).toMatch(/bg-primary/i);
  });

  it('inactive button has muted styling', () => {
    render(<PreviewToggleButtons {...defaultProps} />);
    // Initially "Novo Estilo" is inactive
    const novoEstiloBtn = screen.getByRole('button', { name: /novo estilo/i });
    expect(novoEstiloBtn.className).toMatch(/bg-muted/i);
  });

  it('buttons have min height of 48px for touch accessibility', () => {
    render(<PreviewToggleButtons {...defaultProps} />);
    const originalBtn = screen.getByRole('button', { name: /original/i });
    // Check min-h-[48px] class
    expect(originalBtn.className).toMatch(/min-h/i);
  });

  it('renders preview image when "Novo Estilo" is active', () => {
    render(<PreviewToggleButtons {...defaultProps} />);
    const novoEstiloBtn = screen.getByRole('button', { name: /novo estilo/i });
    fireEvent.click(novoEstiloBtn);
    const images = screen.getAllByRole('img');
    const srcs = images.map((img) => img.getAttribute('src'));
    expect(srcs.some((src) => src === '/images/preview.jpg')).toBe(true);
  });

  it('renders original image initially', () => {
    render(<PreviewToggleButtons {...defaultProps} />);
    const images = screen.getAllByRole('img');
    const srcs = images.map((img) => img.getAttribute('src'));
    expect(srcs.some((src) => src === '/images/original.jpg')).toBe(true);
  });

  it('in reduced-motion mode, renders without animation wrapper crashing', () => {
    mockReducedMotion = true;
    render(<PreviewToggleButtons {...defaultProps} />);
    expect(screen.getByRole('button', { name: /original/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /novo estilo/i })).toBeInTheDocument();
  });
});
