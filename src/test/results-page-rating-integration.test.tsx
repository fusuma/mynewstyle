/**
 * Integration tests for ConsultationRatingPrompt in the Results Page
 * Story 10.5: Post-Consultation Rating — AC #5, #7
 *
 * Target: 5+ tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
      <div {...props}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock lucide-react (needed for StarRating's Star icon)
vi.mock('lucide-react', () => ({
  Star: ({ className, ...props }: { className?: string; [key: string]: unknown }) => (
    <svg data-testid="star-icon" className={className} {...props} />
  ),
}));

// Mock cn
vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// Mock StarRating
vi.mock('@/components/consultation/StarRating', () => ({
  StarRating: ({ value, label }: { value: number | null; label?: string }) => (
    <div data-testid="star-rating" data-value={value} aria-label={label} />
  ),
}));

// Mock ConsultationRatingPrompt so we can control when/if it renders
vi.mock('@/components/consultation/ConsultationRatingPrompt', () => ({
  ConsultationRatingPrompt: ({ consultationId }: { consultationId: string }) => (
    <div data-testid="consultation-rating-prompt" data-id={consultationId}>
      Rating Prompt
    </div>
  ),
}));

// Mock all other child components
vi.mock('@/components/results/FaceShapeAnalysisSection', () => ({
  FaceShapeAnalysisSection: () => <div>FaceShapeAnalysisSection</div>,
}));
vi.mock('@/components/consultation/HeroRecommendationCard', () => ({
  HeroRecommendationCard: () => <div>HeroRecommendationCard</div>,
}));
vi.mock('@/components/consultation/AlternativeRecommendationsSection', () => ({
  AlternativeRecommendationsSection: () => <div>AlternativeRecommendationsSection</div>,
}));
vi.mock('@/components/consultation/StylesToAvoid', () => ({
  StylesToAvoid: () => <div>StylesToAvoid</div>,
}));
vi.mock('@/components/consultation/GroomingTips', () => ({
  GroomingTips: () => <div>GroomingTips</div>,
}));
vi.mock('@/components/consultation/StylingTipsSection', () => ({
  StylingTipsSection: () => <div>StylingTipsSection</div>,
}));
vi.mock('@/components/consultation/ResultsActionsFooter', () => ({
  ResultsActionsFooter: () => <div data-testid="section-results-actions-footer">ResultsActionsFooter</div>,
}));

// Mock analytics
vi.mock('@/lib/utils/analytics', () => ({
  trackEvent: vi.fn(),
}));

// Consultation store state
const mockStoreState = {
  faceAnalysis: {
    faceShape: 'oval' as const,
    confidence: 0.92,
    proportions: { foreheadRatio: 0.33, cheekboneRatio: 0.35, jawRatio: 0.32, faceLength: 0.55 },
    hairAssessment: { type: 'wavy', texture: 'fine', density: 'medium', currentStyle: 'short' },
  },
  photoPreview: 'data:image/jpeg;base64,test',
  consultation: {
    recommendations: [
      { styleName: 'Buzz Cut', justification: 'Works', matchScore: 95, difficultyLevel: 'low' as const },
    ],
    stylesToAvoid: [{ styleName: 'Mullet', reason: 'Bad' }],
    groomingTips: [{ category: 'products' as const, tipText: 'Use paste', icon: '💆' }],
  },
  gender: 'male' as const,
  consultationId: '550e8400-e29b-41d4-a716-446655440000',
  paymentStatus: 'paid' as const,
  previews: new Map<string, { status: 'ready' | 'generating' | 'idle' | 'failed' | 'unavailable' }>(),
  ratingSubmitted: false,
};

vi.mock('@/stores/consultation', () => ({
  useConsultationStore: (selector: (state: typeof mockStoreState) => unknown) => {
    if (typeof selector === 'function') {
      return selector(mockStoreState);
    }
    return mockStoreState;
  },
}));

describe('ResultsPageAnimatedReveal — rating prompt integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockStoreState.paymentStatus = 'paid';
    mockStoreState.ratingSubmitted = false;
    mockStoreState.previews = new Map();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not show rating prompt immediately on render (15s delay)', async () => {
    const { ResultsPageAnimatedReveal } = await import(
      '@/components/consultation/ResultsPageAnimatedReveal'
    );
    render(<ResultsPageAnimatedReveal />);
    // Before 15s, rating prompt should NOT be visible
    expect(screen.queryByTestId('consultation-rating-prompt')).not.toBeInTheDocument();
  });

  it('shows rating prompt after 15 seconds for paid consultation', async () => {
    const { ResultsPageAnimatedReveal } = await import(
      '@/components/consultation/ResultsPageAnimatedReveal'
    );
    render(<ResultsPageAnimatedReveal />);

    act(() => {
      vi.advanceTimersByTime(15100);
    });

    expect(screen.getByTestId('consultation-rating-prompt')).toBeInTheDocument();
  });

  it('does not show rating prompt for unpaid consultation', async () => {
    mockStoreState.paymentStatus = 'none' as const;
    const { ResultsPageAnimatedReveal } = await import(
      '@/components/consultation/ResultsPageAnimatedReveal'
    );
    render(<ResultsPageAnimatedReveal />);

    act(() => {
      vi.advanceTimersByTime(15100);
    });

    expect(screen.queryByTestId('consultation-rating-prompt')).not.toBeInTheDocument();
  });

  it('does not show rating prompt if already submitted this session', async () => {
    mockStoreState.ratingSubmitted = true;
    const { ResultsPageAnimatedReveal } = await import(
      '@/components/consultation/ResultsPageAnimatedReveal'
    );
    render(<ResultsPageAnimatedReveal />);

    act(() => {
      vi.advanceTimersByTime(15100);
    });

    expect(screen.queryByTestId('consultation-rating-prompt')).not.toBeInTheDocument();
  });

  it('rating prompt appears between styling tips and results actions footer', async () => {
    const { ResultsPageAnimatedReveal } = await import(
      '@/components/consultation/ResultsPageAnimatedReveal'
    );
    render(<ResultsPageAnimatedReveal />);

    act(() => {
      vi.advanceTimersByTime(15100);
    });

    const prompt = screen.getByTestId('consultation-rating-prompt');
    // Use the wrapper section div for comparison
    const sectionPrompt = screen.getByTestId('section-rating-prompt');
    const footerSections = screen.getAllByTestId('section-results-actions-footer');
    const footerSection = footerSections[0];

    // Rating prompt section should come before footer section in DOM
    expect(sectionPrompt.compareDocumentPosition(footerSection)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(prompt).toBeInTheDocument();
  });
});
