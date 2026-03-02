import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock face-shape-labels
vi.mock('@/lib/consultation/face-shape-labels', () => ({
  FACE_SHAPE_LABELS: {
    oval: 'Oval',
    round: 'Redondo',
    square: 'Quadrado',
    oblong: 'Oblongo',
    heart: 'Coração',
    diamond: 'Diamante',
    triangle: 'Triangular',
  },
}));

const mockFaceAnalysis = {
  faceShape: 'oval' as const,
  confidence: 0.92,
  proportions: {
    foreheadRatio: 0.85,
    cheekboneRatio: 0.95,
    jawRatio: 0.75,
    faceLength: 1.3,
  },
  hairAssessment: {
    type: 'straight',
    texture: 'fine',
    density: 'medium',
    currentStyle: 'short',
  },
};

const mockRecommendation = {
  styleName: 'Textured Crop',
  justification: 'Creates vertical height for round faces and balances proportions well.',
  matchScore: 93,
  difficultyLevel: 'low' as const,
};

const mockPhotoPreview = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/';
const mockPreviewUrl = 'data:image/jpeg;base64,previewdata123';

// ---- ShareCardSquare Unit Tests ----

describe('ShareCardSquare - renders required elements (with AI preview)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders container with correct data-testid', async () => {
    const { ShareCardSquare } = await import('@/components/share/ShareCardSquare');
    render(
      <ShareCardSquare
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={mockPreviewUrl}
        gender="male"
      />
    );
    expect(screen.getByTestId('share-card-square-container')).toBeInTheDocument();
  });

  it('renders user photo with correct testid and src', async () => {
    const { ShareCardSquare } = await import('@/components/share/ShareCardSquare');
    render(
      <ShareCardSquare
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={mockPreviewUrl}
        gender="male"
      />
    );
    const photo = screen.getByTestId('share-card-square-photo');
    expect(photo).toBeInTheDocument();
    expect(photo).toHaveAttribute('src', mockPhotoPreview);
  });

  it('renders AI preview image with correct testid and src', async () => {
    const { ShareCardSquare } = await import('@/components/share/ShareCardSquare');
    render(
      <ShareCardSquare
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={mockPreviewUrl}
        gender="male"
      />
    );
    const preview = screen.getByTestId('share-card-square-preview');
    expect(preview).toBeInTheDocument();
    expect(preview).toHaveAttribute('src', mockPreviewUrl);
  });

  it('renders face shape badge with correct testid and text', async () => {
    const { ShareCardSquare } = await import('@/components/share/ShareCardSquare');
    render(
      <ShareCardSquare
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={mockPreviewUrl}
        gender="male"
      />
    );
    const badge = screen.getByTestId('share-card-square-face-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Oval');
  });

  it('renders top recommended style name prominently', async () => {
    const { ShareCardSquare } = await import('@/components/share/ShareCardSquare');
    render(
      <ShareCardSquare
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={mockPreviewUrl}
        gender="male"
      />
    );
    const styleName = screen.getByTestId('share-card-square-style-name');
    expect(styleName).toBeInTheDocument();
    expect(styleName).toHaveTextContent('Textured Crop');
  });

  it('renders match score with correct testid', async () => {
    const { ShareCardSquare } = await import('@/components/share/ShareCardSquare');
    render(
      <ShareCardSquare
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={mockPreviewUrl}
        gender="male"
      />
    );
    const matchScore = screen.getByTestId('share-card-square-match-score');
    expect(matchScore).toBeInTheDocument();
    expect(matchScore.textContent).toMatch(/93/);
    expect(matchScore.textContent).toMatch(/compativel|compatível/i);
  });

  it('renders branding footer with "Descubra o seu estilo em mynewstyle.com"', async () => {
    const { ShareCardSquare } = await import('@/components/share/ShareCardSquare');
    render(
      <ShareCardSquare
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={mockPreviewUrl}
        gender="male"
      />
    );
    const branding = screen.getByTestId('share-card-square-branding');
    expect(branding).toBeInTheDocument();
    expect(branding.textContent).toMatch(/mynewstyle\.com/i);
    expect(branding.textContent).toMatch(/Descubra o seu estilo/i);
  });
});

describe('ShareCardSquare - correct container dimensions (540x540px)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('container has 540x540 dimensions for 2x capture to 1080x1080', async () => {
    const { ShareCardSquare } = await import('@/components/share/ShareCardSquare');
    render(
      <ShareCardSquare
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
      />
    );
    const container = screen.getByTestId('share-card-square-container');
    const style = container.getAttribute('style') ?? '';
    expect(style).toContain('540px');
    // width and height should both be 540px (1:1 square)
    const widthMatch = style.match(/width:\s*(\S+)/);
    const heightMatch = style.match(/height:\s*(\S+)/);
    expect(widthMatch?.[1]).toContain('540px');
    expect(heightMatch?.[1]).toContain('540px');
  });

  it('uses inline styles not className for all sizing', async () => {
    const { ShareCardSquare } = await import('@/components/share/ShareCardSquare');
    render(
      <ShareCardSquare
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
      />
    );
    const container = screen.getByTestId('share-card-square-container');
    const style = container.getAttribute('style') ?? '';
    expect(style).toContain('width');
    expect(style).toContain('height');
  });
});

describe('ShareCardSquare - graceful fallback without AI preview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does NOT render AI preview when previewUrl is undefined', async () => {
    const { ShareCardSquare } = await import('@/components/share/ShareCardSquare');
    render(
      <ShareCardSquare
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
      />
    );
    expect(screen.queryByTestId('share-card-square-preview')).not.toBeInTheDocument();
  });

  it('still renders photo, face badge, style name, match score, branding without preview', async () => {
    const { ShareCardSquare } = await import('@/components/share/ShareCardSquare');
    render(
      <ShareCardSquare
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
      />
    );
    expect(screen.getByTestId('share-card-square-photo')).toBeInTheDocument();
    expect(screen.getByTestId('share-card-square-face-badge')).toBeInTheDocument();
    expect(screen.getByTestId('share-card-square-style-name')).toBeInTheDocument();
    expect(screen.getByTestId('share-card-square-match-score')).toBeInTheDocument();
    expect(screen.getByTestId('share-card-square-branding')).toBeInTheDocument();
  });

  it('photo uses larger size (200px) when no AI preview', async () => {
    const { ShareCardSquare } = await import('@/components/share/ShareCardSquare');
    render(
      <ShareCardSquare
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
      />
    );
    const photo = screen.getByTestId('share-card-square-photo');
    const style = photo.getAttribute('style') ?? '';
    expect(style).toContain('200px');
  });

  it('photo is smaller (140px) when AI preview is present', async () => {
    const { ShareCardSquare } = await import('@/components/share/ShareCardSquare');
    render(
      <ShareCardSquare
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={mockPreviewUrl}
        gender="male"
      />
    );
    const photo = screen.getByTestId('share-card-square-photo');
    const style = photo.getAttribute('style') ?? '';
    expect(style).toContain('140px');
  });
});

describe('ShareCardSquare - male theme (dark background, amber accent)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies dark background (#1A1A2E) for male theme', async () => {
    const { ShareCardSquare } = await import('@/components/share/ShareCardSquare');
    render(
      <ShareCardSquare
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
      />
    );
    const container = screen.getByTestId('share-card-square-container');
    const style = container.getAttribute('style') ?? '';
    expect(style).toMatch(/#1A1A2E|rgb\(26,\s*26,\s*46\)/i);
  });

  it('applies amber accent (#F5A623) for male face shape badge', async () => {
    const { ShareCardSquare } = await import('@/components/share/ShareCardSquare');
    render(
      <ShareCardSquare
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
      />
    );
    const badge = screen.getByTestId('share-card-square-face-badge');
    const style = badge.getAttribute('style') ?? '';
    expect(style).toMatch(/#F5A623|rgb\(245,\s*166,\s*35\)/i);
  });

  it('uses dark text (#1A1A2E) on amber badge (WCAG 4.5:1)', async () => {
    const { ShareCardSquare } = await import('@/components/share/ShareCardSquare');
    render(
      <ShareCardSquare
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
      />
    );
    const badge = screen.getByTestId('share-card-square-face-badge');
    const style = badge.getAttribute('style') ?? '';
    // Must NOT use white text on amber (fails 2.03:1)
    // Must use dark text (#1A1A2E) on amber (passes 8.42:1)
    expect(style).not.toMatch(/color:\s*#FFFFFF|color:\s*white|color:\s*rgb\(255,\s*255,\s*255\)/i);
    expect(style).toMatch(/#1A1A2E|rgb\(26,\s*26,\s*46\)/i);
  });
});

describe('ShareCardSquare - WCAG contrast for subtext and branding text', () => {
  // These colors are used for match score, justification snippet, and branding footer.
  // All must meet WCAG 4.5:1 minimum for small text (below 18px).
  // Male subtext: #C8B99A on #1A1A2E = 4.56:1 (passes AA)
  // Female subtext: #5A5A6A on #FFF8F0 = 4.67:1 (passes AA)
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('male subtext uses #C8B99A (4.56:1 on #1A1A2E — passes WCAG AA)', async () => {
    const { ShareCardSquare } = await import('@/components/share/ShareCardSquare');
    render(
      <ShareCardSquare
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
      />
    );
    const matchScore = screen.getByTestId('share-card-square-match-score');
    const style = matchScore.getAttribute('style') ?? '';
    // #C8B99A on #1A1A2E = 4.56:1 — passes WCAG AA for small text (4.5:1 min)
    expect(style).toMatch(/#C8B99A|rgb\(200,\s*185,\s*154\)/i);
  });

  it('male branding uses subtext color (#C8B99A) on dark background — passes WCAG AA', async () => {
    const { ShareCardSquare } = await import('@/components/share/ShareCardSquare');
    render(
      <ShareCardSquare
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
      />
    );
    const branding = screen.getByTestId('share-card-square-branding');
    const style = branding.getAttribute('style') ?? '';
    expect(style).toMatch(/#C8B99A|rgb\(200,\s*185,\s*154\)/i);
    // Must NOT use white (#FAF3E0 primary text) on the branding footer — subtext is required
    expect(style).not.toMatch(/color:\s*#1A1A2E/i);
  });

  it('female subtext uses #5A5A6A (4.67:1 on #FFF8F0 — passes WCAG AA)', async () => {
    const { ShareCardSquare } = await import('@/components/share/ShareCardSquare');
    render(
      <ShareCardSquare
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="female"
      />
    );
    const matchScore = screen.getByTestId('share-card-square-match-score');
    const style = matchScore.getAttribute('style') ?? '';
    // #5A5A6A on #FFF8F0 = 4.67:1 — passes WCAG AA
    expect(style).toMatch(/#5A5A6A|rgb\(90,\s*90,\s*106\)/i);
  });

  it('female branding uses subtext color (#5A5A6A) on warm white background — passes WCAG AA', async () => {
    const { ShareCardSquare } = await import('@/components/share/ShareCardSquare');
    render(
      <ShareCardSquare
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="female"
      />
    );
    const branding = screen.getByTestId('share-card-square-branding');
    const style = branding.getAttribute('style') ?? '';
    expect(style).toMatch(/#5A5A6A|rgb\(90,\s*90,\s*106\)/i);
  });
});

describe('ShareCardSquare - female theme (warm white background, dusty rose accent)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies warm white background (#FFF8F0) for female theme', async () => {
    const { ShareCardSquare } = await import('@/components/share/ShareCardSquare');
    render(
      <ShareCardSquare
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="female"
      />
    );
    const container = screen.getByTestId('share-card-square-container');
    const style = container.getAttribute('style') ?? '';
    expect(style).toMatch(/#FFF8F0|rgb\(255,\s*248,\s*240\)/i);
  });

  it('applies dusty rose accent (#C4787A) for female face shape badge', async () => {
    const { ShareCardSquare } = await import('@/components/share/ShareCardSquare');
    render(
      <ShareCardSquare
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="female"
      />
    );
    const badge = screen.getByTestId('share-card-square-face-badge');
    const style = badge.getAttribute('style') ?? '';
    expect(style).toMatch(/#C4787A|rgb\(196,\s*120,\s*122\)/i);
  });

  it('uses dark text on dusty rose badge (WCAG 4.5:1)', async () => {
    const { ShareCardSquare } = await import('@/components/share/ShareCardSquare');
    render(
      <ShareCardSquare
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="female"
      />
    );
    const badge = screen.getByTestId('share-card-square-face-badge');
    const style = badge.getAttribute('style') ?? '';
    // Must NOT use white text on dusty rose (fails 3.33:1)
    // Must use dark text on dusty rose (passes 5.13:1)
    expect(style).not.toMatch(/color:\s*#FFFFFF|color:\s*white|color:\s*rgb\(255,\s*255,\s*255\)/i);
  });
});
