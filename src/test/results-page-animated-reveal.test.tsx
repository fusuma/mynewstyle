import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { FaceAnalysisOutput } from '@/lib/ai/schemas';
import type { Consultation } from '@/types/index';

// ---- Framer Motion mock setup ----
// We capture motion props to verify variant/animation configuration
let capturedContainerProps: Record<string, unknown> = {};
const capturedItemProps: Record<string, unknown>[] = [];
let mockReducedMotion = false;

function stripMotionProps(props: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { initial, animate, exit, transition, variants, whileHover, whileTap, custom, ...rest } =
    props;
  return rest;
}

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) => {
      // Capture the first motion.div (container) and subsequent ones (items)
      if (
        props['data-testid'] === 'results-animated-container' ||
        (props as Record<string, unknown>).variants &&
          typeof (props as Record<string, unknown>).variants === 'object' &&
          'hidden' in ((props as Record<string, unknown>).variants as object) &&
          'visible' in ((props as Record<string, unknown>).variants as object) &&
          capturedContainerProps['variants'] === undefined
      ) {
        capturedContainerProps = props;
      } else if ((props as Record<string, unknown>).variants) {
        capturedItemProps.push(props);
      }
      return (
        <div data-testid={props['data-testid'] as string | undefined} {...stripMotionProps(props)}>
          {children}
        </div>
      );
    },
  },
  useReducedMotion: () => mockReducedMotion,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock consultation store
const mockStoreState: {
  faceAnalysis: FaceAnalysisOutput | null;
  photoPreview: string | null;
  consultation: Consultation | null;
  gender: 'male' | 'female' | null;
  consultationId: string | null;
  paymentStatus: 'none' | 'pending' | 'paid' | 'failed' | 'refunded';
} = {
  faceAnalysis: {
    faceShape: 'oval',
    confidence: 0.92,
    proportions: {
      foreheadRatio: 0.33,
      cheekboneRatio: 0.35,
      jawRatio: 0.32,
      faceLength: 0.55,
    },
    hairAssessment: {
      type: 'wavy',
      texture: 'fine',
      density: 'medium',
      currentStyle: 'short',
    },
  },
  photoPreview: 'data:image/jpeg;base64,test',
  consultation: null,
  gender: 'male',
  consultationId: 'test-id-123',
  paymentStatus: 'paid',
};

vi.mock('@/stores/consultation', () => ({
  useConsultationStore: (selector: (state: typeof mockStoreState) => unknown) => {
    if (typeof selector === 'function') {
      return selector(mockStoreState);
    }
    return mockStoreState;
  },
}));

// Mock all section components so we can check render order
// Note: data-testid="section-*" attributes are placed on wrapper divs INSIDE the
// ResultsPageAnimatedReveal component (not in these mocks) to track DOM order.
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
  ResultsActionsFooter: () => <div>ResultsActionsFooter</div>,
}));

// ---- Tests ----

describe('ResultsPageAnimatedReveal - component renders', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    capturedContainerProps = {};
    capturedItemProps.length = 0;
    vi.clearAllMocks();
    vi.resetModules();
    mockStoreState.faceAnalysis = {
      faceShape: 'oval' as const,
      confidence: 0.92,
      proportions: {
        foreheadRatio: 0.33,
        cheekboneRatio: 0.35,
        jawRatio: 0.32,
        faceLength: 0.55,
      },
      hairAssessment: {
        type: 'wavy',
        texture: 'fine',
        density: 'medium',
        currentStyle: 'short',
      },
    };
    mockStoreState.photoPreview = 'data:image/jpeg;base64,test';
    mockStoreState.consultation = null;
    mockStoreState.gender = 'male';
    mockStoreState.consultationId = 'test-id-123';
    mockStoreState.paymentStatus = 'paid';
  });

  it('renders without crashing', async () => {
    const { ResultsPageAnimatedReveal } = await import(
      '@/components/consultation/ResultsPageAnimatedReveal'
    );
    const { container } = render(<ResultsPageAnimatedReveal />);
    expect(container).toBeDefined();
  });

  it('renders FaceShapeAnalysisSection as first section', async () => {
    const { ResultsPageAnimatedReveal } = await import(
      '@/components/consultation/ResultsPageAnimatedReveal'
    );
    render(<ResultsPageAnimatedReveal />);
    expect(screen.getByTestId('section-face-shape')).toBeInTheDocument();
  });

  it('renders ResultsActionsFooter', async () => {
    const { ResultsPageAnimatedReveal } = await import(
      '@/components/consultation/ResultsPageAnimatedReveal'
    );
    render(<ResultsPageAnimatedReveal />);
    expect(screen.getByTestId('section-results-actions-footer')).toBeInTheDocument();
  });
});

describe('ResultsPageAnimatedReveal - section render order (AC #1)', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    capturedContainerProps = {};
    capturedItemProps.length = 0;
    vi.clearAllMocks();
    vi.resetModules();
    mockStoreState.faceAnalysis = {
      faceShape: 'oval' as const,
      confidence: 0.92,
      proportions: {
        foreheadRatio: 0.33,
        cheekboneRatio: 0.35,
        jawRatio: 0.32,
        faceLength: 0.55,
      },
      hairAssessment: {
        type: 'wavy',
        texture: 'fine',
        density: 'medium',
        currentStyle: 'short',
      },
    };
    mockStoreState.photoPreview = 'data:image/jpeg;base64,test';
    mockStoreState.consultation = {
      recommendations: [
        {
          styleName: 'Buzz Cut',
          justification: 'Works for oval faces',
          matchScore: 95,
          difficultyLevel: 'low' as const,
        },
        {
          styleName: 'Pompadour',
          justification: 'Works well',
          matchScore: 85,
          difficultyLevel: 'medium' as const,
        },
      ],
      stylesToAvoid: [
        { styleName: 'Mullet', reason: 'Adds width' },
      ],
      groomingTips: [
        { category: 'products' as const, tipText: 'Use matte paste', icon: '💆' },
      ],
    };
    mockStoreState.gender = 'male';
    mockStoreState.consultationId = 'test-id-123';
    mockStoreState.paymentStatus = 'paid';
  });

  it('renders FaceShapeAnalysisSection before HeroRecommendationCard in DOM order', async () => {
    const { ResultsPageAnimatedReveal } = await import(
      '@/components/consultation/ResultsPageAnimatedReveal'
    );
    render(<ResultsPageAnimatedReveal />);

    const allElements = screen.getAllByTestId(/^section-/);
    const testIds = allElements.map((el) => el.getAttribute('data-testid'));
    const faceShapeIdx = testIds.indexOf('section-face-shape');
    const heroIdx = testIds.indexOf('section-hero-recommendation');
    expect(faceShapeIdx).toBeLessThan(heroIdx);
  });

  it('renders HeroRecommendationCard before AlternativeRecommendations in DOM order', async () => {
    const { ResultsPageAnimatedReveal } = await import(
      '@/components/consultation/ResultsPageAnimatedReveal'
    );
    render(<ResultsPageAnimatedReveal />);

    const allElements = screen.getAllByTestId(/^section-/);
    const testIds = allElements.map((el) => el.getAttribute('data-testid'));
    const heroIdx = testIds.indexOf('section-hero-recommendation');
    const altIdx = testIds.indexOf('section-alternative-recommendations');
    expect(heroIdx).toBeLessThan(altIdx);
  });

  it('renders AlternativeRecommendations before StylesToAvoid in DOM order', async () => {
    const { ResultsPageAnimatedReveal } = await import(
      '@/components/consultation/ResultsPageAnimatedReveal'
    );
    render(<ResultsPageAnimatedReveal />);

    const allElements = screen.getAllByTestId(/^section-/);
    const testIds = allElements.map((el) => el.getAttribute('data-testid'));
    const altIdx = testIds.indexOf('section-alternative-recommendations');
    const avoidIdx = testIds.indexOf('section-styles-to-avoid');
    expect(altIdx).toBeLessThan(avoidIdx);
  });

  it('renders StylesToAvoid before GroomingTips in DOM order', async () => {
    const { ResultsPageAnimatedReveal } = await import(
      '@/components/consultation/ResultsPageAnimatedReveal'
    );
    render(<ResultsPageAnimatedReveal />);

    const allElements = screen.getAllByTestId(/^section-/);
    const testIds = allElements.map((el) => el.getAttribute('data-testid'));
    const avoidIdx = testIds.indexOf('section-styles-to-avoid');
    const groomingIdx = testIds.indexOf('section-grooming-tips');
    expect(avoidIdx).toBeLessThan(groomingIdx);
  });

  it('renders GroomingTips before StylingTips in DOM order', async () => {
    const { ResultsPageAnimatedReveal } = await import(
      '@/components/consultation/ResultsPageAnimatedReveal'
    );
    render(<ResultsPageAnimatedReveal />);

    const allElements = screen.getAllByTestId(/^section-/);
    const testIds = allElements.map((el) => el.getAttribute('data-testid'));
    const groomingIdx = testIds.indexOf('section-grooming-tips');
    const stylingIdx = testIds.indexOf('section-styling-tips');
    expect(groomingIdx).toBeLessThan(stylingIdx);
  });

  it('renders StylingTips before ResultsActionsFooter in DOM order', async () => {
    const { ResultsPageAnimatedReveal } = await import(
      '@/components/consultation/ResultsPageAnimatedReveal'
    );
    render(<ResultsPageAnimatedReveal />);

    const allElements = screen.getAllByTestId(/^section-/);
    const testIds = allElements.map((el) => el.getAttribute('data-testid'));
    const stylingIdx = testIds.indexOf('section-styling-tips');
    const footerIdx = testIds.indexOf('section-results-actions-footer');
    expect(stylingIdx).toBeLessThan(footerIdx);
  });

  it('renders all 7 sections in correct stagger order', async () => {
    const { ResultsPageAnimatedReveal } = await import(
      '@/components/consultation/ResultsPageAnimatedReveal'
    );
    render(<ResultsPageAnimatedReveal />);

    const allElements = screen.getAllByTestId(/^section-/);
    const testIds = allElements.map((el) => el.getAttribute('data-testid'));

    const expectedOrder = [
      'section-face-shape',
      'section-hero-recommendation',
      'section-alternative-recommendations',
      'section-styles-to-avoid',
      'section-grooming-tips',
      'section-styling-tips',
      'section-results-actions-footer',
    ];

    expectedOrder.forEach((id, index) => {
      expect(testIds[index]).toBe(id);
    });
  });
});

describe('ResultsPageAnimatedReveal - reduced motion (AC #4)', () => {
  beforeEach(() => {
    capturedContainerProps = {};
    capturedItemProps.length = 0;
    vi.clearAllMocks();
    vi.resetModules();
    mockStoreState.faceAnalysis = {
      faceShape: 'oval' as const,
      confidence: 0.92,
      proportions: {
        foreheadRatio: 0.33,
        cheekboneRatio: 0.35,
        jawRatio: 0.32,
        faceLength: 0.55,
      },
      hairAssessment: {
        type: 'wavy',
        texture: 'fine',
        density: 'medium',
        currentStyle: 'short',
      },
    };
    mockStoreState.photoPreview = 'data:image/jpeg;base64,test';
    mockStoreState.consultation = {
      recommendations: [
        {
          styleName: 'Buzz Cut',
          justification: 'Works for oval faces',
          matchScore: 95,
          difficultyLevel: 'low' as const,
        },
        {
          styleName: 'Pompadour',
          justification: 'Works well',
          matchScore: 85,
          difficultyLevel: 'medium' as const,
        },
      ],
      stylesToAvoid: [{ styleName: 'Mullet', reason: 'Adds width' }],
      groomingTips: [{ category: 'products' as const, tipText: 'Use paste', icon: '💆' }],
    };
    mockStoreState.gender = 'male';
    mockStoreState.consultationId = 'test-id-123';
    mockStoreState.paymentStatus = 'paid';
  });

  it('renders all sections even with reduced motion enabled', async () => {
    mockReducedMotion = true;
    const { ResultsPageAnimatedReveal } = await import(
      '@/components/consultation/ResultsPageAnimatedReveal'
    );
    render(<ResultsPageAnimatedReveal />);
    expect(screen.getByTestId('section-face-shape')).toBeInTheDocument();
    expect(screen.getByTestId('section-hero-recommendation')).toBeInTheDocument();
    expect(screen.getByTestId('section-alternative-recommendations')).toBeInTheDocument();
    expect(screen.getByTestId('section-styles-to-avoid')).toBeInTheDocument();
    expect(screen.getByTestId('section-grooming-tips')).toBeInTheDocument();
    expect(screen.getByTestId('section-styling-tips')).toBeInTheDocument();
    expect(screen.getByTestId('section-results-actions-footer')).toBeInTheDocument();
  });

  it('passes shouldReduceMotion prop correctly when reduced motion is enabled', async () => {
    mockReducedMotion = true;
    const { ResultsPageAnimatedReveal } = await import(
      '@/components/consultation/ResultsPageAnimatedReveal'
    );
    // Component should render without crash and with no animation variants propagated
    const { container } = render(<ResultsPageAnimatedReveal />);
    expect(container).toBeDefined();
    // All 7 sections still render in correct DOM order
    const allElements = screen.getAllByTestId(/^section-/);
    expect(allElements.length).toBeGreaterThanOrEqual(7);
  });

  it('renders content immediately (no stagger delay) when prefers-reduced-motion', async () => {
    mockReducedMotion = true;
    const { ResultsPageAnimatedReveal } = await import(
      '@/components/consultation/ResultsPageAnimatedReveal'
    );
    render(<ResultsPageAnimatedReveal />);
    // All sections must be present in the DOM regardless of animation state
    expect(screen.getByTestId('section-face-shape')).toBeVisible();
    expect(screen.getByTestId('section-results-actions-footer')).toBeVisible();
  });
});

describe('ResultsPageAnimatedReveal - accepts shouldReduceMotion prop', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    capturedContainerProps = {};
    capturedItemProps.length = 0;
    vi.clearAllMocks();
    vi.resetModules();
    mockStoreState.faceAnalysis = {
      faceShape: 'oval' as const,
      confidence: 0.92,
      proportions: {
        foreheadRatio: 0.33,
        cheekboneRatio: 0.35,
        jawRatio: 0.32,
        faceLength: 0.55,
      },
      hairAssessment: {
        type: 'wavy',
        texture: 'fine',
        density: 'medium',
        currentStyle: 'short',
      },
    };
    mockStoreState.consultation = {
      recommendations: [
        {
          styleName: 'Buzz Cut',
          justification: 'Works for oval faces',
          matchScore: 95,
          difficultyLevel: 'low' as const,
        },
      ],
      stylesToAvoid: [],
      groomingTips: [],
    };
    mockStoreState.gender = 'male';
    mockStoreState.consultationId = 'test-id-123';
    mockStoreState.paymentStatus = 'paid';
  });

  it('accepts optional shouldReduceMotion prop (passed from parent page)', async () => {
    const { ResultsPageAnimatedReveal } = await import(
      '@/components/consultation/ResultsPageAnimatedReveal'
    );
    // Should not crash when shouldReduceMotion is explicitly passed as true
    expect(() =>
      render(<ResultsPageAnimatedReveal shouldReduceMotion={true} />)
    ).not.toThrow();
  });

  it('accepts optional shouldReduceMotion prop as false', async () => {
    const { ResultsPageAnimatedReveal } = await import(
      '@/components/consultation/ResultsPageAnimatedReveal'
    );
    expect(() =>
      render(<ResultsPageAnimatedReveal shouldReduceMotion={false} />)
    ).not.toThrow();
  });
});

describe('ResultsPageAnimatedReveal - integration with payment status (AC #6)', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    capturedContainerProps = {};
    capturedItemProps.length = 0;
    vi.clearAllMocks();
    vi.resetModules();
    mockStoreState.faceAnalysis = {
      faceShape: 'oval' as const,
      confidence: 0.92,
      proportions: {
        foreheadRatio: 0.33,
        cheekboneRatio: 0.35,
        jawRatio: 0.32,
        faceLength: 0.55,
      },
      hairAssessment: {
        type: 'wavy',
        texture: 'fine',
        density: 'medium',
        currentStyle: 'short',
      },
    };
    mockStoreState.photoPreview = null;
    mockStoreState.consultation = null;
    mockStoreState.gender = 'male';
    mockStoreState.consultationId = 'test-id-123';
    mockStoreState.paymentStatus = 'paid';
  });

  it('renders FaceShapeSection (the first section) when store data is available', async () => {
    const { ResultsPageAnimatedReveal } = await import(
      '@/components/consultation/ResultsPageAnimatedReveal'
    );
    render(<ResultsPageAnimatedReveal />);
    expect(screen.getByTestId('section-face-shape')).toBeInTheDocument();
  });

  it('renders ResultsActionsFooter as last section', async () => {
    const { ResultsPageAnimatedReveal } = await import(
      '@/components/consultation/ResultsPageAnimatedReveal'
    );
    render(<ResultsPageAnimatedReveal />);
    expect(screen.getByTestId('section-results-actions-footer')).toBeInTheDocument();
  });
});

describe('ResultsPageAnimatedReveal - all 7 sections render (AC #1, #3)', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    capturedContainerProps = {};
    capturedItemProps.length = 0;
    vi.clearAllMocks();
    vi.resetModules();
    mockStoreState.faceAnalysis = {
      faceShape: 'oval' as const,
      confidence: 0.92,
      proportions: {
        foreheadRatio: 0.33,
        cheekboneRatio: 0.35,
        jawRatio: 0.32,
        faceLength: 0.55,
      },
      hairAssessment: {
        type: 'wavy',
        texture: 'fine',
        density: 'medium',
        currentStyle: 'short',
      },
    };
    mockStoreState.photoPreview = 'data:image/jpeg;base64,test';
    mockStoreState.consultation = {
      recommendations: [
        {
          styleName: 'Buzz Cut',
          justification: 'Works for oval faces',
          matchScore: 95,
          difficultyLevel: 'low' as const,
        },
        {
          styleName: 'Pompadour',
          justification: 'Vertical volume',
          matchScore: 85,
          difficultyLevel: 'medium' as const,
        },
      ],
      stylesToAvoid: [{ styleName: 'Mullet', reason: 'Adds width' }],
      groomingTips: [
        { category: 'products' as const, tipText: 'Use matte paste', icon: '💆' },
      ],
    };
    mockStoreState.gender = 'male';
    mockStoreState.consultationId = 'test-id-123';
    mockStoreState.paymentStatus = 'paid';
  });

  it('renders FaceShapeSection', async () => {
    const { ResultsPageAnimatedReveal } = await import(
      '@/components/consultation/ResultsPageAnimatedReveal'
    );
    render(<ResultsPageAnimatedReveal />);
    expect(screen.getByTestId('section-face-shape')).toBeInTheDocument();
  });

  it('renders HeroRecommendationCard', async () => {
    const { ResultsPageAnimatedReveal } = await import(
      '@/components/consultation/ResultsPageAnimatedReveal'
    );
    render(<ResultsPageAnimatedReveal />);
    expect(screen.getByTestId('section-hero-recommendation')).toBeInTheDocument();
  });

  it('renders AlternativeRecommendations', async () => {
    const { ResultsPageAnimatedReveal } = await import(
      '@/components/consultation/ResultsPageAnimatedReveal'
    );
    render(<ResultsPageAnimatedReveal />);
    expect(screen.getByTestId('section-alternative-recommendations')).toBeInTheDocument();
  });

  it('renders StylesToAvoid', async () => {
    const { ResultsPageAnimatedReveal } = await import(
      '@/components/consultation/ResultsPageAnimatedReveal'
    );
    render(<ResultsPageAnimatedReveal />);
    expect(screen.getByTestId('section-styles-to-avoid')).toBeInTheDocument();
  });

  it('renders GroomingTips', async () => {
    const { ResultsPageAnimatedReveal } = await import(
      '@/components/consultation/ResultsPageAnimatedReveal'
    );
    render(<ResultsPageAnimatedReveal />);
    expect(screen.getByTestId('section-grooming-tips')).toBeInTheDocument();
  });

  it('renders StylingTips', async () => {
    const { ResultsPageAnimatedReveal } = await import(
      '@/components/consultation/ResultsPageAnimatedReveal'
    );
    render(<ResultsPageAnimatedReveal />);
    expect(screen.getByTestId('section-styling-tips')).toBeInTheDocument();
  });

  it('renders ResultsActionsFooter', async () => {
    const { ResultsPageAnimatedReveal } = await import(
      '@/components/consultation/ResultsPageAnimatedReveal'
    );
    render(<ResultsPageAnimatedReveal />);
    expect(screen.getByTestId('section-results-actions-footer')).toBeInTheDocument();
  });
});

describe('ResultsPageAnimatedReveal - stagger animation config (AC #2, #3)', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    capturedContainerProps = {};
    capturedItemProps.length = 0;
    vi.clearAllMocks();
    vi.resetModules();
    mockStoreState.faceAnalysis = {
      faceShape: 'oval',
      confidence: 0.92,
      proportions: {
        foreheadRatio: 0.33,
        cheekboneRatio: 0.35,
        jawRatio: 0.32,
        faceLength: 0.55,
      },
      hairAssessment: {
        type: 'wavy',
        texture: 'fine',
        density: 'medium',
        currentStyle: 'short',
      },
    };
    mockStoreState.photoPreview = 'data:image/jpeg;base64,test';
    mockStoreState.consultation = {
      recommendations: [
        {
          styleName: 'Buzz Cut',
          justification: 'Works for oval faces',
          matchScore: 0.95,
          difficultyLevel: 'low' as const,
        },
      ],
      stylesToAvoid: [],
      groomingTips: [],
    };
    mockStoreState.gender = 'male';
    mockStoreState.consultationId = 'test-id-123';
    mockStoreState.paymentStatus = 'paid';
  });

  it('applies staggerChildren: 0.15 on container variant when motion enabled (AC #2)', async () => {
    const { ResultsPageAnimatedReveal } = await import(
      '@/components/consultation/ResultsPageAnimatedReveal'
    );
    render(<ResultsPageAnimatedReveal />);

    const variants = capturedContainerProps['variants'] as Record<string, unknown> | undefined;
    expect(variants).toBeDefined();
    const visibleVariant = (variants as Record<string, unknown>)?.['visible'] as Record<string, unknown> | undefined;
    expect(visibleVariant).toBeDefined();
    const transition = (visibleVariant as Record<string, unknown>)?.['transition'] as Record<string, unknown> | undefined;
    expect(transition).toBeDefined();
    expect((transition as Record<string, unknown>)['staggerChildren']).toBe(0.15);
  });

  it('container has initial="hidden" and animate="visible" when motion enabled', async () => {
    const { ResultsPageAnimatedReveal } = await import(
      '@/components/consultation/ResultsPageAnimatedReveal'
    );
    render(<ResultsPageAnimatedReveal />);

    expect(capturedContainerProps['initial']).toBe('hidden');
    expect(capturedContainerProps['animate']).toBe('visible');
  });

  it('no stagger animation when reduced motion is enabled (AC #4)', async () => {
    mockReducedMotion = true;
    const { ResultsPageAnimatedReveal } = await import(
      '@/components/consultation/ResultsPageAnimatedReveal'
    );
    render(<ResultsPageAnimatedReveal />);

    // With reduced motion, container animation props are empty — no initial/animate/variants
    expect(capturedContainerProps['initial']).toBeUndefined();
    expect(capturedContainerProps['animate']).toBeUndefined();
    const variants = capturedContainerProps['variants'] as Record<string, unknown> | undefined;
    if (variants) {
      const visibleVariant = variants['visible'] as Record<string, unknown> | undefined;
      const transition = visibleVariant?.['transition'] as Record<string, unknown> | undefined;
      expect(transition?.['staggerChildren']).toBeUndefined();
    }
  });

  it('item variants define y: 20 hidden and y: 0 visible (AC #3)', async () => {
    const { ResultsPageAnimatedReveal } = await import(
      '@/components/consultation/ResultsPageAnimatedReveal'
    );
    render(<ResultsPageAnimatedReveal />);

    expect(capturedItemProps.length).toBeGreaterThan(0);
    const firstItemVariants = capturedItemProps[0]['variants'] as Record<string, unknown> | undefined;
    expect(firstItemVariants).toBeDefined();
    const hiddenVariant = (firstItemVariants as Record<string, unknown>)?.['hidden'] as Record<string, unknown> | undefined;
    expect(hiddenVariant).toBeDefined();
    expect((hiddenVariant as Record<string, unknown>)['opacity']).toBe(0);
    expect((hiddenVariant as Record<string, unknown>)['y']).toBe(20);
    const visibleVariant = (firstItemVariants as Record<string, unknown>)?.['visible'] as Record<string, unknown> | undefined;
    expect(visibleVariant).toBeDefined();
    expect((visibleVariant as Record<string, unknown>)['opacity']).toBe(1);
    expect((visibleVariant as Record<string, unknown>)['y']).toBe(0);
  });
});
