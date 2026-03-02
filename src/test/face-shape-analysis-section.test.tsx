import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock framer-motion
function stripMotionProps(props: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { initial, animate, exit, transition, variants, whileHover, whileTap, whileInView, ...rest } = props;
  return rest;
}

let mockReducedMotion = false;

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <div {...stripMotionProps(props)}>{children}</div>
    ),
    p: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <p {...stripMotionProps(props)}>{children}</p>
    ),
    span: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <span {...stripMotionProps(props)}>{children}</span>
    ),
    section: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <section {...stripMotionProps(props)}>{children}</section>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => mockReducedMotion,
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

const mockFaceAnalysis = {
  faceShape: 'oval' as const,
  confidence: 0.93,
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

// Helper to find the badge span specifically (not the description text)
function getBadgeSpan(text: string) {
  const elements = screen.getAllByText(new RegExp(text, 'i'));
  // Badge is a span element inside the badge container
  const badgeSpan = elements.find((el) => el.tagName === 'SPAN');
  return badgeSpan;
}

describe('FaceShapeAnalysisSection', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.resetModules();
  });

  it('renders the face shape badge for oval', async () => {
    const { FaceShapeAnalysisSection } = await import('@/components/results/FaceShapeAnalysisSection');
    render(<FaceShapeAnalysisSection faceAnalysis={mockFaceAnalysis} photoPreview={null} />);
    const badge = getBadgeSpan('Rosto Oval');
    expect(badge).toBeDefined();
    expect(badge?.tagName).toBe('SPAN');
  });

  it('renders badge for round face shape', async () => {
    const { FaceShapeAnalysisSection } = await import('@/components/results/FaceShapeAnalysisSection');
    render(
      <FaceShapeAnalysisSection
        faceAnalysis={{ ...mockFaceAnalysis, faceShape: 'round' }}
        photoPreview={null}
      />
    );
    const badge = getBadgeSpan('Rosto Redondo');
    expect(badge).toBeDefined();
  });

  it('renders badge for square face shape', async () => {
    const { FaceShapeAnalysisSection } = await import('@/components/results/FaceShapeAnalysisSection');
    render(
      <FaceShapeAnalysisSection
        faceAnalysis={{ ...mockFaceAnalysis, faceShape: 'square' }}
        photoPreview={null}
      />
    );
    const badge = getBadgeSpan('Rosto Quadrado');
    expect(badge).toBeDefined();
  });

  it('renders badge for oblong face shape', async () => {
    const { FaceShapeAnalysisSection } = await import('@/components/results/FaceShapeAnalysisSection');
    render(
      <FaceShapeAnalysisSection
        faceAnalysis={{ ...mockFaceAnalysis, faceShape: 'oblong' }}
        photoPreview={null}
      />
    );
    const badge = getBadgeSpan('Rosto Oblongo');
    expect(badge).toBeDefined();
  });

  it('renders badge for heart face shape', async () => {
    const { FaceShapeAnalysisSection } = await import('@/components/results/FaceShapeAnalysisSection');
    render(
      <FaceShapeAnalysisSection
        faceAnalysis={{ ...mockFaceAnalysis, faceShape: 'heart' }}
        photoPreview={null}
      />
    );
    // "Coração" text appears in the badge span
    const badge = getBadgeSpan('Rosto Coração');
    expect(badge).toBeDefined();
  });

  it('renders badge for diamond face shape', async () => {
    const { FaceShapeAnalysisSection } = await import('@/components/results/FaceShapeAnalysisSection');
    render(
      <FaceShapeAnalysisSection
        faceAnalysis={{ ...mockFaceAnalysis, faceShape: 'diamond' }}
        photoPreview={null}
      />
    );
    const badge = getBadgeSpan('Rosto Diamante');
    expect(badge).toBeDefined();
  });

  it('renders badge for triangle face shape', async () => {
    const { FaceShapeAnalysisSection } = await import('@/components/results/FaceShapeAnalysisSection');
    render(
      <FaceShapeAnalysisSection
        faceAnalysis={{ ...mockFaceAnalysis, faceShape: 'triangle' }}
        photoPreview={null}
      />
    );
    const badge = getBadgeSpan('Rosto Triangular');
    expect(badge).toBeDefined();
  });

  it('renders confidence percentage correctly for 0.93', async () => {
    const { FaceShapeAnalysisSection } = await import('@/components/results/FaceShapeAnalysisSection');
    render(<FaceShapeAnalysisSection faceAnalysis={mockFaceAnalysis} photoPreview={null} />);
    expect(screen.getByText(/93% de certeza/i)).toBeInTheDocument();
  });

  it('renders confidence percentage correctly for 0.87', async () => {
    const { FaceShapeAnalysisSection } = await import('@/components/results/FaceShapeAnalysisSection');
    render(
      <FaceShapeAnalysisSection
        faceAnalysis={{ ...mockFaceAnalysis, confidence: 0.87 }}
        photoPreview={null}
      />
    );
    expect(screen.getByText(/87% de certeza/i)).toBeInTheDocument();
  });

  it('renders face shape description text', async () => {
    const { FaceShapeAnalysisSection } = await import('@/components/results/FaceShapeAnalysisSection');
    render(<FaceShapeAnalysisSection faceAnalysis={mockFaceAnalysis} photoPreview={null} />);
    expect(screen.getByText(/O rosto oval é considerado o formato mais versátil/i)).toBeInTheDocument();
  });

  it('renders proportion bars with correct labels', async () => {
    const { FaceShapeAnalysisSection } = await import('@/components/results/FaceShapeAnalysisSection');
    render(<FaceShapeAnalysisSection faceAnalysis={mockFaceAnalysis} photoPreview={null} />);
    expect(screen.getByText(/^Testa$/i)).toBeInTheDocument();
    // "Maçãs do rosto" appears in both description and bar label; verify bar span exists
    const macasElements = screen.getAllByText(/Maçãs do rosto/i);
    const macasSpan = macasElements.find((el) => el.tagName === 'SPAN');
    expect(macasSpan).toBeDefined();
    expect(screen.getByText(/^Queixo$/i)).toBeInTheDocument();
  });

  it('renders user photo when photoPreview is provided', async () => {
    const { FaceShapeAnalysisSection } = await import('@/components/results/FaceShapeAnalysisSection');
    render(
      <FaceShapeAnalysisSection
        faceAnalysis={mockFaceAnalysis}
        photoPreview="data:image/jpeg;base64,test123"
      />
    );
    const photo = screen.getByAltText(/foto do rosto/i);
    expect(photo).toBeInTheDocument();
  });

  it('does NOT render photo when photoPreview is null', async () => {
    const { FaceShapeAnalysisSection } = await import('@/components/results/FaceShapeAnalysisSection');
    render(<FaceShapeAnalysisSection faceAnalysis={mockFaceAnalysis} photoPreview={null} />);
    expect(screen.queryByAltText(/foto do rosto/i)).not.toBeInTheDocument();
  });

  it('renders face shape overlay SVG when photo is provided', async () => {
    const { FaceShapeAnalysisSection } = await import('@/components/results/FaceShapeAnalysisSection');
    const { container } = render(
      <FaceShapeAnalysisSection
        faceAnalysis={mockFaceAnalysis}
        photoPreview="data:image/jpeg;base64,test123"
      />
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('does NOT render SVG overlay when photoPreview is null', async () => {
    const { FaceShapeAnalysisSection } = await import('@/components/results/FaceShapeAnalysisSection');
    const { container } = render(
      <FaceShapeAnalysisSection faceAnalysis={mockFaceAnalysis} photoPreview={null} />
    );
    const svg = container.querySelector('svg');
    expect(svg).not.toBeInTheDocument();
  });

  it('has accessible heading structure', async () => {
    const { FaceShapeAnalysisSection } = await import('@/components/results/FaceShapeAnalysisSection');
    render(<FaceShapeAnalysisSection faceAnalysis={mockFaceAnalysis} photoPreview={null} />);
    // Should have a heading element
    const heading = screen.queryByRole('heading');
    expect(heading).toBeInTheDocument();
  });
});

describe('ProportionAnalysis', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders 3 proportion bars', async () => {
    const { ProportionAnalysis } = await import('@/components/results/ProportionAnalysis');
    const proportions = { foreheadRatio: 0.33, cheekboneRatio: 0.35, jawRatio: 0.32, faceLength: 0.55 };
    render(<ProportionAnalysis proportions={proportions} />);
    expect(screen.getByText(/^Testa$/i)).toBeInTheDocument();
    expect(screen.getByText(/Maçãs do rosto/i)).toBeInTheDocument();
    expect(screen.getByText(/^Queixo$/i)).toBeInTheDocument();
  });

  it('renders percentage labels for each proportion', async () => {
    const { ProportionAnalysis } = await import('@/components/results/ProportionAnalysis');
    const proportions = { foreheadRatio: 0.33, cheekboneRatio: 0.35, jawRatio: 0.32, faceLength: 0.55 };
    render(<ProportionAnalysis proportions={proportions} />);
    // Each bar should display its percentage
    expect(screen.getByText(/33%/i)).toBeInTheDocument();
    expect(screen.getByText(/35%/i)).toBeInTheDocument();
    expect(screen.getByText(/32%/i)).toBeInTheDocument();
  });
});

describe('FaceShapeOverlay', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders photo with alt text', async () => {
    const { FaceShapeOverlay } = await import('@/components/results/FaceShapeOverlay');
    render(
      <FaceShapeOverlay
        photoPreview="data:image/jpeg;base64,test123"
        faceShape="oval"
      />
    );
    expect(screen.getByAltText(/foto do rosto/i)).toBeInTheDocument();
  });

  it('renders SVG overlay', async () => {
    const { FaceShapeOverlay } = await import('@/components/results/FaceShapeOverlay');
    const { container } = render(
      <FaceShapeOverlay
        photoPreview="data:image/jpeg;base64,test123"
        faceShape="oval"
      />
    );
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders SVG path for round face shape', async () => {
    const { FaceShapeOverlay } = await import('@/components/results/FaceShapeOverlay');
    const { container } = render(
      <FaceShapeOverlay
        photoPreview="data:image/jpeg;base64,test123"
        faceShape="round"
      />
    );
    const path = container.querySelector('path');
    expect(path).toBeInTheDocument();
  });

  it('renders SVG path for square face shape', async () => {
    const { FaceShapeOverlay } = await import('@/components/results/FaceShapeOverlay');
    const { container } = render(
      <FaceShapeOverlay
        photoPreview="data:image/jpeg;base64,test123"
        faceShape="square"
      />
    );
    const path = container.querySelector('path');
    expect(path).toBeInTheDocument();
  });
});

describe('FaceShapeAnalysisSection reduced motion', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders content even when reduced motion is preferred', async () => {
    mockReducedMotion = true;
    const { FaceShapeAnalysisSection } = await import('@/components/results/FaceShapeAnalysisSection');
    render(<FaceShapeAnalysisSection faceAnalysis={mockFaceAnalysis} photoPreview={null} />);
    // Badge span should be present
    const elements = screen.getAllByText(/Rosto Oval/i);
    const badgeSpan = elements.find((el) => el.tagName === 'SPAN');
    expect(badgeSpan).toBeDefined();
    expect(screen.getByText(/93% de certeza/i)).toBeInTheDocument();
  });
});
