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

// ---- ShareCardStory Component Tests ----

describe('ShareCardStory - renders with preview (before/after layout)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders container with correct data-testid', async () => {
    const { ShareCardStory } = await import('@/components/share/ShareCardStory');
    render(
      <ShareCardStory
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={mockPreviewUrl}
        gender="male"
      />
    );
    expect(screen.getByTestId('share-card-story-container')).toBeInTheDocument();
  });

  it('renders user photo with correct testid and src', async () => {
    const { ShareCardStory } = await import('@/components/share/ShareCardStory');
    render(
      <ShareCardStory
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={mockPreviewUrl}
        gender="male"
      />
    );
    const photo = screen.getByTestId('share-card-story-user-photo');
    expect(photo).toBeInTheDocument();
    expect(photo).toHaveAttribute('src', mockPhotoPreview);
  });

  it('renders AI preview image with correct testid and src', async () => {
    const { ShareCardStory } = await import('@/components/share/ShareCardStory');
    render(
      <ShareCardStory
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={mockPreviewUrl}
        gender="male"
      />
    );
    const preview = screen.getByTestId('share-card-story-preview');
    expect(preview).toBeInTheDocument();
    expect(preview).toHaveAttribute('src', mockPreviewUrl);
  });

  it('renders face shape badge with correct testid and text', async () => {
    const { ShareCardStory } = await import('@/components/share/ShareCardStory');
    render(
      <ShareCardStory
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={mockPreviewUrl}
        gender="male"
      />
    );
    const badge = screen.getByTestId('share-card-story-face-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Oval');
  });

  it('renders style name with correct testid and text', async () => {
    const { ShareCardStory } = await import('@/components/share/ShareCardStory');
    render(
      <ShareCardStory
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={mockPreviewUrl}
        gender="male"
      />
    );
    const styleName = screen.getByTestId('share-card-story-style-name');
    expect(styleName).toBeInTheDocument();
    expect(styleName).toHaveTextContent('Textured Crop');
  });

  it('renders branding footer with correct testid and content', async () => {
    const { ShareCardStory } = await import('@/components/share/ShareCardStory');
    render(
      <ShareCardStory
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={mockPreviewUrl}
        gender="male"
      />
    );
    const branding = screen.getByTestId('share-card-story-branding');
    expect(branding).toBeInTheDocument();
    expect(branding.textContent).toMatch(/mynewstyle\.com/i);
  });

  it('renders ANTES and DEPOIS labels in before/after layout', async () => {
    const { ShareCardStory } = await import('@/components/share/ShareCardStory');
    render(
      <ShareCardStory
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={mockPreviewUrl}
        gender="male"
      />
    );
    expect(screen.getByText('ANTES')).toBeInTheDocument();
    expect(screen.getByText('DEPOIS')).toBeInTheDocument();
  });

  it('container has 540x960 dimensions for 2x capture to 1080x1920', async () => {
    const { ShareCardStory } = await import('@/components/share/ShareCardStory');
    render(
      <ShareCardStory
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={mockPreviewUrl}
        gender="male"
      />
    );
    const container = screen.getByTestId('share-card-story-container');
    const style = container.getAttribute('style') ?? '';
    expect(style).toContain('540px');
    expect(style).toContain('960px');
  });
});

describe('ShareCardStory - renders without preview (analysis-only layout)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders user photo in analysis-only layout', async () => {
    const { ShareCardStory } = await import('@/components/share/ShareCardStory');
    render(
      <ShareCardStory
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
      />
    );
    const photo = screen.getByTestId('share-card-story-user-photo');
    expect(photo).toBeInTheDocument();
    expect(photo).toHaveAttribute('src', mockPhotoPreview);
  });

  it('does NOT render preview section without previewUrl', async () => {
    const { ShareCardStory } = await import('@/components/share/ShareCardStory');
    render(
      <ShareCardStory
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
      />
    );
    expect(screen.queryByTestId('share-card-story-preview')).not.toBeInTheDocument();
  });

  it('renders face shape badge in analysis-only layout', async () => {
    const { ShareCardStory } = await import('@/components/share/ShareCardStory');
    render(
      <ShareCardStory
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
      />
    );
    expect(screen.getByTestId('share-card-story-face-badge')).toBeInTheDocument();
  });

  it('renders style name and match score in analysis-only layout', async () => {
    const { ShareCardStory } = await import('@/components/share/ShareCardStory');
    render(
      <ShareCardStory
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
      />
    );
    expect(screen.getByTestId('share-card-story-style-name')).toHaveTextContent('Textured Crop');
    // Match score should appear somewhere
    const container = screen.getByTestId('share-card-story-container');
    expect(container.textContent).toMatch(/93/);
  });

  it('renders branding in analysis-only layout', async () => {
    const { ShareCardStory } = await import('@/components/share/ShareCardStory');
    render(
      <ShareCardStory
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
      />
    );
    const branding = screen.getByTestId('share-card-story-branding');
    expect(branding.textContent).toMatch(/mynewstyle\.com/i);
  });

  it('does NOT render ANTES/DEPOIS labels in analysis-only layout', async () => {
    const { ShareCardStory } = await import('@/components/share/ShareCardStory');
    render(
      <ShareCardStory
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
      />
    );
    expect(screen.queryByText('ANTES')).not.toBeInTheDocument();
    expect(screen.queryByText('DEPOIS')).not.toBeInTheDocument();
  });
});

describe('ShareCardStory - male theme (dark background, amber accent)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies dark background for male', async () => {
    const { ShareCardStory } = await import('@/components/share/ShareCardStory');
    render(
      <ShareCardStory
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
      />
    );
    const container = screen.getByTestId('share-card-story-container');
    const style = container.getAttribute('style') ?? '';
    // jsdom converts #1A1A2E → rgb(26, 26, 46) in the style attribute
    expect(style).toMatch(/#1A1A2E|rgb\(26,\s*26,\s*46\)/i);
  });

  it('applies amber accent for male face shape badge', async () => {
    const { ShareCardStory } = await import('@/components/share/ShareCardStory');
    render(
      <ShareCardStory
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
      />
    );
    const badge = screen.getByTestId('share-card-story-face-badge');
    const style = badge.getAttribute('style') ?? '';
    // jsdom converts #F5A623 → rgb(245, 166, 35) in the style attribute
    expect(style).toMatch(/#F5A623|rgb\(245,\s*166,\s*35\)/i);
  });
});

describe('ShareCardStory - female theme (light background, dusty rose accent)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies warm light background for female', async () => {
    const { ShareCardStory } = await import('@/components/share/ShareCardStory');
    render(
      <ShareCardStory
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="female"
      />
    );
    const container = screen.getByTestId('share-card-story-container');
    const style = container.getAttribute('style') ?? '';
    // jsdom converts #FFF8F0 → rgb(255, 248, 240) in the style attribute
    expect(style).toMatch(/#FFF8F0|rgb\(255,\s*248,\s*240\)/i);
  });

  it('applies dusty rose accent for female face shape badge', async () => {
    const { ShareCardStory } = await import('@/components/share/ShareCardStory');
    render(
      <ShareCardStory
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="female"
      />
    );
    const badge = screen.getByTestId('share-card-story-face-badge');
    const style = badge.getAttribute('style') ?? '';
    // jsdom converts #C4787A → rgb(196, 120, 122) in the style attribute
    expect(style).toMatch(/#C4787A|rgb\(196,\s*120,\s*122\)/i);
  });
});

describe('ShareCardStory - uses inline styles only (no Tailwind)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('container uses inline style not className for sizing', async () => {
    const { ShareCardStory } = await import('@/components/share/ShareCardStory');
    render(
      <ShareCardStory
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
      />
    );
    const container = screen.getByTestId('share-card-story-container');
    // Must have inline style with width and height
    const style = container.getAttribute('style') ?? '';
    expect(style).toContain('width');
    expect(style).toContain('height');
  });
});
