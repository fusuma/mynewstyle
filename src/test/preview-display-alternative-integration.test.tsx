/**
 * Integration tests for AlternativeRecommendationCard showing PreviewDisplay when preview is ready
 * (Story 7.5, Task 6.5)
 * AC: 1, 2, 3
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock framer-motion
function stripMotionProps(props: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { initial, animate, exit, transition, variants, whileHover, whileTap, ...rest } = props;
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

// Mock PreviewDisplay
vi.mock('@/components/consultation/PreviewDisplay', () => ({
  PreviewDisplay: ({
    originalPhoto,
    previewUrl,
    previewStatus,
    styleName,
  }: {
    originalPhoto: string;
    previewUrl: string | null;
    previewStatus: string;
    styleName: string;
  }) => (
    <div
      data-testid="preview-display"
      data-original={originalPhoto}
      data-preview={previewUrl}
      data-status={previewStatus}
      data-style={styleName}
    >
      PreviewDisplay
    </div>
  ),
}));

// Mock PreviewUnavailable
vi.mock('@/components/consultation/PreviewUnavailable', () => ({
  PreviewUnavailable: () => <div data-testid="preview-unavailable">Preview Unavailable</div>,
}));

// Mock PreviewError
vi.mock('@/components/consultation/PreviewError', () => ({
  PreviewError: ({ onRetry }: { onRetry: () => void }) => (
    <div data-testid="preview-error" onClick={onRetry}>
      Preview Error
    </div>
  ),
}));

let mockIsAnyGenerating = false;
let mockPreviewStatus: { status: string; previewUrl?: string } = { status: 'idle' };
const mockTriggerPreview = vi.fn();
const mockGetPreviewStatus = vi.fn(() => mockPreviewStatus);

vi.mock('@/hooks/usePreviewGeneration', () => ({
  usePreviewGeneration: () => ({
    isAnyGenerating: mockIsAnyGenerating,
    triggerPreview: mockTriggerPreview,
    getPreviewStatus: mockGetPreviewStatus,
  }),
}));

vi.mock('@/stores/consultation', () => ({
  useConsultationStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      photoPreview: 'data:image/jpeg;base64,test123',
    }),
}));

import { AlternativeRecommendationCard } from '@/components/consultation/AlternativeRecommendationCard';

const defaultProps = {
  rank: 2 as const,
  styleName: 'Topete Texturizado',
  justification: 'Excelente para cabelos ondulados.',
  matchScore: 0.85,
  difficultyLevel: 'medium' as const,
};

describe('AlternativeRecommendationCard - PreviewDisplay integration (Story 7.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAnyGenerating = false;
    mockPreviewStatus = { status: 'idle' };
    mockGetPreviewStatus.mockReturnValue({ status: 'idle' });
  });

  it('renders PreviewDisplay when preview status is "ready"', () => {
    mockPreviewStatus = { status: 'ready', previewUrl: '/images/preview.jpg' };
    mockGetPreviewStatus.mockReturnValue(mockPreviewStatus);

    render(<AlternativeRecommendationCard {...defaultProps} />);
    expect(screen.getByTestId('preview-display')).toBeInTheDocument();
  });

  it('passes originalPhoto (photoPreview) to PreviewDisplay', () => {
    mockPreviewStatus = { status: 'ready', previewUrl: '/images/preview.jpg' };
    mockGetPreviewStatus.mockReturnValue(mockPreviewStatus);

    render(<AlternativeRecommendationCard {...defaultProps} />);
    const display = screen.getByTestId('preview-display');
    expect(display.getAttribute('data-original')).toBe('data:image/jpeg;base64,test123');
  });

  it('passes previewUrl to PreviewDisplay', () => {
    mockPreviewStatus = { status: 'ready', previewUrl: '/images/preview.jpg' };
    mockGetPreviewStatus.mockReturnValue(mockPreviewStatus);

    render(<AlternativeRecommendationCard {...defaultProps} />);
    const display = screen.getByTestId('preview-display');
    expect(display.getAttribute('data-preview')).toBe('/images/preview.jpg');
  });

  it('passes styleName to PreviewDisplay', () => {
    mockPreviewStatus = { status: 'ready', previewUrl: '/images/preview.jpg' };
    mockGetPreviewStatus.mockReturnValue(mockPreviewStatus);

    render(<AlternativeRecommendationCard {...defaultProps} />);
    const display = screen.getByTestId('preview-display');
    expect(display.getAttribute('data-style')).toBe('Topete Texturizado');
  });

  it('does NOT render PreviewDisplay when status is "idle"', () => {
    render(<AlternativeRecommendationCard {...defaultProps} />);
    expect(screen.queryByTestId('preview-display')).not.toBeInTheDocument();
  });

  it('renders PreviewDisplay when status is "unavailable"', () => {
    mockPreviewStatus = { status: 'unavailable' };
    mockGetPreviewStatus.mockReturnValue(mockPreviewStatus);

    render(<AlternativeRecommendationCard {...defaultProps} />);
    expect(screen.getByTestId('preview-display')).toBeInTheDocument();
    const display = screen.getByTestId('preview-display');
    expect(display.getAttribute('data-status')).toBe('unavailable');
  });

  it('does NOT show "Ver como fico" button when status is "ready"', () => {
    mockPreviewStatus = { status: 'ready', previewUrl: '/images/preview.jpg' };
    mockGetPreviewStatus.mockReturnValue(mockPreviewStatus);

    render(<AlternativeRecommendationCard {...defaultProps} />);
    expect(screen.queryByRole('button', { name: /ver como fico/i })).not.toBeInTheDocument();
  });
});
