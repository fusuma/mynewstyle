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
  justification: 'Creates vertical height for round faces.',
  matchScore: 93,
  difficultyLevel: 'low' as const,
};

const mockPhotoPreview = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/';

// ---- ShareCardStoryRenderer Tests ----

describe('ShareCardStoryRenderer - off-screen positioning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders off-screen with position absolute and top -9999px', async () => {
    const { ShareCardStoryRenderer } = await import('@/components/share/ShareCardStoryRenderer');
    const cardRef = { current: null } as React.RefObject<HTMLDivElement | null>;
    render(
      <ShareCardStoryRenderer
        cardRef={cardRef}
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
      />
    );
    const renderer = screen.getByTestId('share-card-story-renderer');
    const style = renderer.getAttribute('style') ?? '';
    expect(style).toContain('position: absolute');
    expect(style).toContain('-9999px');
  });

  it('sets aria-hidden="true"', async () => {
    const { ShareCardStoryRenderer } = await import('@/components/share/ShareCardStoryRenderer');
    const cardRef = { current: null } as React.RefObject<HTMLDivElement | null>;
    render(
      <ShareCardStoryRenderer
        cardRef={cardRef}
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
      />
    );
    const renderer = screen.getByTestId('share-card-story-renderer');
    expect(renderer).toHaveAttribute('aria-hidden', 'true');
  });

  it('has explicit 540x960 container dimensions', async () => {
    const { ShareCardStoryRenderer } = await import('@/components/share/ShareCardStoryRenderer');
    const cardRef = { current: null } as React.RefObject<HTMLDivElement | null>;
    render(
      <ShareCardStoryRenderer
        cardRef={cardRef}
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
      />
    );
    const renderer = screen.getByTestId('share-card-story-renderer');
    const style = renderer.getAttribute('style') ?? '';
    expect(style).toContain('540px');
    expect(style).toContain('960px');
  });

  it('sets pointer-events: none', async () => {
    const { ShareCardStoryRenderer } = await import('@/components/share/ShareCardStoryRenderer');
    const cardRef = { current: null } as React.RefObject<HTMLDivElement | null>;
    render(
      <ShareCardStoryRenderer
        cardRef={cardRef}
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
      />
    );
    const renderer = screen.getByTestId('share-card-story-renderer');
    const style = renderer.getAttribute('style') ?? '';
    expect(style).toContain('pointer-events: none');
  });
});

describe('ShareCardStoryRenderer - null return when data is missing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when faceAnalysis is null', async () => {
    const { ShareCardStoryRenderer } = await import('@/components/share/ShareCardStoryRenderer');
    const cardRef = { current: null } as React.RefObject<HTMLDivElement | null>;
    const { container } = render(
      <ShareCardStoryRenderer
        cardRef={cardRef}
        faceAnalysis={null}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when recommendation is null', async () => {
    const { ShareCardStoryRenderer } = await import('@/components/share/ShareCardStoryRenderer');
    const cardRef = { current: null } as React.RefObject<HTMLDivElement | null>;
    const { container } = render(
      <ShareCardStoryRenderer
        cardRef={cardRef}
        faceAnalysis={mockFaceAnalysis}
        recommendation={null}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when photoPreview is null', async () => {
    const { ShareCardStoryRenderer } = await import('@/components/share/ShareCardStoryRenderer');
    const cardRef = { current: null } as React.RefObject<HTMLDivElement | null>;
    const { container } = render(
      <ShareCardStoryRenderer
        cardRef={cardRef}
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={null}
        previewUrl={undefined}
        gender="male"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when gender is null', async () => {
    const { ShareCardStoryRenderer } = await import('@/components/share/ShareCardStoryRenderer');
    const cardRef = { current: null } as React.RefObject<HTMLDivElement | null>;
    const { container } = render(
      <ShareCardStoryRenderer
        cardRef={cardRef}
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender={null}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders when all required data is provided', async () => {
    const { ShareCardStoryRenderer } = await import('@/components/share/ShareCardStoryRenderer');
    const cardRef = { current: null } as React.RefObject<HTMLDivElement | null>;
    render(
      <ShareCardStoryRenderer
        cardRef={cardRef}
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
      />
    );
    expect(screen.getByTestId('share-card-story-renderer')).toBeInTheDocument();
  });
});
