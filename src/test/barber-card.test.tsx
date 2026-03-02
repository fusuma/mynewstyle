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

const mockGroomingTips = [
  {
    category: 'barber_tips' as const,
    tipText: 'Peça ao barbeiro textura no topo com laterais curtas',
    icon: 'scissors',
  },
  {
    category: 'routine' as const,
    tipText: 'Use creme de penteado para definir a textura',
    icon: 'droplets',
  },
];

const mockPhotoPreview = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/';

// ---- BarberCard Unit Tests ----

describe('BarberCard - renders required elements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders user photo with correct src', async () => {
    const { BarberCard } = await import('@/components/consultation/BarberCard');
    render(
      <BarberCard
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
        groomingTips={mockGroomingTips}
      />
    );
    const photo = screen.getByTestId('barber-card-photo');
    expect(photo).toBeInTheDocument();
    expect(photo).toHaveAttribute('src', mockPhotoPreview);
  });

  it('renders face shape badge with correct label', async () => {
    const { BarberCard } = await import('@/components/consultation/BarberCard');
    render(
      <BarberCard
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
        groomingTips={mockGroomingTips}
      />
    );
    const badge = screen.getByTestId('barber-card-face-shape-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Rosto Oval');
  });

  it('renders top recommended style name prominently', async () => {
    const { BarberCard } = await import('@/components/consultation/BarberCard');
    render(
      <BarberCard
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
        groomingTips={mockGroomingTips}
      />
    );
    const styleName = screen.getByTestId('barber-card-style-name');
    expect(styleName).toBeInTheDocument();
    expect(styleName).toHaveTextContent('Textured Crop');
  });

  it('renders style notes (maintenance difficulty)', async () => {
    const { BarberCard } = await import('@/components/consultation/BarberCard');
    render(
      <BarberCard
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
        groomingTips={mockGroomingTips}
      />
    );
    const notes = screen.getByTestId('barber-card-notes');
    expect(notes).toBeInTheDocument();
    expect(notes.textContent).toMatch(/Manutenção|Manutencao|Baixa/i);
  });

  it('renders barber tip from groomingTips when available', async () => {
    const { BarberCard } = await import('@/components/consultation/BarberCard');
    render(
      <BarberCard
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
        groomingTips={mockGroomingTips}
      />
    );
    const notes = screen.getByTestId('barber-card-notes');
    expect(notes.textContent).toContain('Peça ao barbeiro textura no topo com laterais curtas');
  });

  it('renders AI preview image when previewUrl is provided', async () => {
    const { BarberCard } = await import('@/components/consultation/BarberCard');
    render(
      <BarberCard
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl="data:image/jpeg;base64,preview"
        gender="male"
        groomingTips={mockGroomingTips}
      />
    );
    const preview = screen.getByTestId('barber-card-ai-preview');
    expect(preview).toBeInTheDocument();
    expect(preview).toHaveAttribute('src', 'data:image/jpeg;base64,preview');
  });

  it('renders subtle footer with mynewstyle.com', async () => {
    const { BarberCard } = await import('@/components/consultation/BarberCard');
    render(
      <BarberCard
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
        groomingTips={mockGroomingTips}
      />
    );
    const footer = screen.getByTestId('barber-card-footer');
    expect(footer).toBeInTheDocument();
    expect(footer.textContent).toContain('mynewstyle.com');
  });

  it('has fixed 390x600 card container dimensions', async () => {
    const { BarberCard } = await import('@/components/consultation/BarberCard');
    render(
      <BarberCard
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
        groomingTips={mockGroomingTips}
      />
    );
    const card = screen.getByTestId('barber-card-container');
    expect(card).toBeInTheDocument();
    // Check inline styles or data attributes indicating fixed size
    const style = card.getAttribute('style') ?? '';
    expect(style).toContain('390px');
    expect(style).toContain('600px');
  });
});

describe('BarberCard - graceful fallback without AI preview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does NOT render AI preview image when previewUrl is undefined', async () => {
    const { BarberCard } = await import('@/components/consultation/BarberCard');
    render(
      <BarberCard
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
        groomingTips={mockGroomingTips}
      />
    );
    expect(screen.queryByTestId('barber-card-ai-preview')).not.toBeInTheDocument();
  });

  it('renders larger photo (160x160) in no-preview layout', async () => {
    const { BarberCard } = await import('@/components/consultation/BarberCard');
    render(
      <BarberCard
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
        groomingTips={mockGroomingTips}
      />
    );
    const photo = screen.getByTestId('barber-card-photo');
    // In no-preview layout the photo should be 160px (all sizing via inline styles, not className)
    const style = photo.getAttribute('style') ?? '';
    expect(style).toContain('160px');
  });

  it('renders match score when no AI preview is available', async () => {
    const { BarberCard } = await import('@/components/consultation/BarberCard');
    render(
      <BarberCard
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
        groomingTips={mockGroomingTips}
      />
    );
    const notes = screen.getByTestId('barber-card-notes');
    expect(notes.textContent).toMatch(/93%|compatível/i);
  });

  it('still renders photo, face shape badge, style name, and notes without preview', async () => {
    const { BarberCard } = await import('@/components/consultation/BarberCard');
    render(
      <BarberCard
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
        groomingTips={mockGroomingTips}
      />
    );
    expect(screen.getByTestId('barber-card-photo')).toBeInTheDocument();
    expect(screen.getByTestId('barber-card-face-shape-badge')).toBeInTheDocument();
    expect(screen.getByTestId('barber-card-style-name')).toBeInTheDocument();
    expect(screen.getByTestId('barber-card-notes')).toBeInTheDocument();
  });
});

describe('BarberCard - gender-themed accent colors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies amber accent for male theme', async () => {
    const { BarberCard } = await import('@/components/consultation/BarberCard');
    render(
      <BarberCard
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
        groomingTips={mockGroomingTips}
      />
    );
    const badge = screen.getByTestId('barber-card-face-shape-badge');
    // Male uses amber accent color
    const badgeStyle = badge.getAttribute('style') ?? '';
    const badgeClass = badge.className ?? '';
    expect(badgeStyle + badgeClass).toMatch(/#F5A623|amber|male/i);
  });

  it('applies dusty rose accent for female theme', async () => {
    const { BarberCard } = await import('@/components/consultation/BarberCard');
    render(
      <BarberCard
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="female"
        groomingTips={mockGroomingTips}
      />
    );
    const badge = screen.getByTestId('barber-card-face-shape-badge');
    const badgeStyle = badge.getAttribute('style') ?? '';
    const badgeClass = badge.className ?? '';
    expect(badgeStyle + badgeClass).toMatch(/#C4787A|rose|female/i);
  });

  it('background is always white regardless of gender theme', async () => {
    const { BarberCard } = await import('@/components/consultation/BarberCard');
    const { rerender } = render(
      <BarberCard
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="male"
        groomingTips={mockGroomingTips}
      />
    );
    let card = screen.getByTestId('barber-card-container');
    // jsdom converts #FFFFFF to rgb(255, 255, 255) in computed styles
    expect(card.getAttribute('style') ?? card.className).toMatch(/white|#FFFFFF|rgb\(255, 255, 255\)|bg-white/i);

    rerender(
      <BarberCard
        faceAnalysis={mockFaceAnalysis}
        recommendation={mockRecommendation}
        photoPreview={mockPhotoPreview}
        previewUrl={undefined}
        gender="female"
        groomingTips={mockGroomingTips}
      />
    );
    card = screen.getByTestId('barber-card-container');
    expect(card.getAttribute('style') ?? card.className).toMatch(/white|#FFFFFF|rgb\(255, 255, 255\)|bg-white/i);
  });
});
