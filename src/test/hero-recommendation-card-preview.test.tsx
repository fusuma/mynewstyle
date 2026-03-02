/**
 * Integration tests for HeroRecommendationCard with preview generation (Story 7.4, AC: 1, 6)
 * Task 8.4: Integration test: HeroRecommendationCard triggers preview and shows loading
 * Task 8.5: Integration test: sequential queue prevents parallel generation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock framer-motion
function stripMotionProps(props: Record<string, unknown>) {
  const { initial, animate, exit, transition, variants, whileHover, whileTap, ...rest } = props;
  void initial; void animate; void exit; void transition; void variants;
  void whileHover; void whileTap;
  return rest;
}

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <div {...stripMotionProps(props)}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

// Mock PreviewLoadingOverlay
vi.mock('@/components/consultation/PreviewLoadingOverlay', () => ({
  PreviewLoadingOverlay: ({ photoSrc }: { photoSrc: string }) => (
    <div data-testid="preview-loading-overlay" data-photo-src={photoSrc}>
      Loading Preview...
    </div>
  ),
}));

// Mock PreviewStatusText
vi.mock('@/components/consultation/PreviewStatusText', () => ({
  PreviewStatusText: () => <div data-testid="preview-status-text">A aplicar o estilo...</div>,
}));

// Track mock state for store
let mockIsAnyGenerating = false;
let mockPreviewStatus = { status: 'idle' };
const mockTriggerPreview = vi.fn();
const mockGetPreviewStatus = vi.fn(() => mockPreviewStatus);

vi.mock('@/hooks/usePreviewGeneration', () => ({
  usePreviewGeneration: () => ({
    isAnyGenerating: mockIsAnyGenerating,
    triggerPreview: mockTriggerPreview,
    getPreviewStatus: mockGetPreviewStatus,
  }),
}));

// Mock consultation store for photoPreview
vi.mock('@/stores/consultation', () => ({
  useConsultationStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      photoPreview: 'data:image/jpeg;base64,test123',
    }),
}));

import { HeroRecommendationCard } from '@/components/consultation/HeroRecommendationCard';

const mockRecommendation = {
  styleName: 'Corte Degradê',
  justification: 'Este estilo complementa seu rosto oval.',
  matchScore: 0.93,
  difficultyLevel: 'low' as const,
};

describe('HeroRecommendationCard - Preview Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAnyGenerating = false;
    mockPreviewStatus = { status: 'idle' };
    mockGetPreviewStatus.mockReturnValue({ status: 'idle' });
  });

  it('renders "Ver como fico" button', () => {
    render(<HeroRecommendationCard recommendation={mockRecommendation} />);
    expect(screen.getByRole('button', { name: /ver como fico/i })).toBeInTheDocument();
  });

  it('calls triggerPreview when "Ver como fico" button is clicked', () => {
    render(<HeroRecommendationCard recommendation={mockRecommendation} />);
    const button = screen.getByRole('button', { name: /ver como fico/i });
    fireEvent.click(button);
    expect(mockTriggerPreview).toHaveBeenCalledWith(
      expect.any(String),
      'Corte Degradê'
    );
  });

  it('shows PreviewLoadingOverlay when generation is in progress', () => {
    mockPreviewStatus = { status: 'generating' };
    mockGetPreviewStatus.mockReturnValue({ status: 'generating' });

    render(<HeroRecommendationCard recommendation={mockRecommendation} />);
    expect(screen.getByTestId('preview-loading-overlay')).toBeInTheDocument();
  });

  it('does NOT show PreviewLoadingOverlay when status is idle', () => {
    mockPreviewStatus = { status: 'idle' };
    mockGetPreviewStatus.mockReturnValue({ status: 'idle' });

    render(<HeroRecommendationCard recommendation={mockRecommendation} />);
    expect(screen.queryByTestId('preview-loading-overlay')).not.toBeInTheDocument();
  });

  it('disables "Ver como fico" button when another preview is generating', () => {
    mockIsAnyGenerating = true;

    render(<HeroRecommendationCard recommendation={mockRecommendation} />);
    // When isAnyGenerating, aria-label changes to "Aguarde a geracao atual terminar"
    const button = screen.getByRole('button', { name: /aguarde a geracao atual terminar/i });
    expect(button).toBeDisabled();
  });

  it('applies visual disabled state (opacity/cursor) when isAnyGenerating', () => {
    mockIsAnyGenerating = true;

    render(<HeroRecommendationCard recommendation={mockRecommendation} />);
    const button = screen.getByRole('button', { name: /aguarde a geracao atual terminar/i });
    // Should have opacity or cursor-not-allowed class
    expect(button.className).toMatch(/opacity|cursor-not-allowed|disabled/i);
  });

  it('shows PreviewStatusText while generating', () => {
    mockPreviewStatus = { status: 'generating' };
    mockGetPreviewStatus.mockReturnValue({ status: 'generating' });

    render(<HeroRecommendationCard recommendation={mockRecommendation} />);
    expect(screen.getByTestId('preview-status-text')).toBeInTheDocument();
  });
});

describe('Sequential queue - prevents parallel generation (Task 8.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAnyGenerating = false;
    mockPreviewStatus = { status: 'idle' };
    mockGetPreviewStatus.mockReturnValue({ status: 'idle' });
  });

  it('does not call triggerPreview when another preview is generating', () => {
    mockIsAnyGenerating = true;

    render(<HeroRecommendationCard recommendation={mockRecommendation} />);
    const button = screen.getByRole('button', { name: /aguarde a geracao atual terminar/i });

    // Button should be disabled so click won't propagate
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(mockTriggerPreview).not.toHaveBeenCalled();
  });
});
