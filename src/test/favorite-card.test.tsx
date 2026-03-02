import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <div {...props as React.HTMLAttributes<HTMLDivElement>}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Heart: ({ className }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-heart" className={className} />
  ),
  Star: ({ className }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-star" className={className} />
  ),
  Calendar: ({ className }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-calendar" className={className} />
  ),
  User: ({ className }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-user" className={className} />
  ),
}));

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

const mockFavorite = {
  id: 'fav-1',
  favoritedAt: '2026-02-01T10:00:00Z',
  recommendationId: 'rec-1',
  styleName: 'Pompadour Clássico',
  matchScore: 88,
  consultationId: 'consult-1',
  faceShape: 'square' as const,
  gender: 'male' as const,
  consultationDate: '2026-01-15T10:00:00Z',
};

describe('FavoriteCard - rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('renders style name', async () => {
    const { FavoriteCard } = await import('@/components/profile/FavoriteCard');
    render(<FavoriteCard favorite={mockFavorite} />);
    expect(screen.getByText(/pompadour clássico/i)).toBeInTheDocument();
  });

  it('renders match score', async () => {
    const { FavoriteCard } = await import('@/components/profile/FavoriteCard');
    render(<FavoriteCard favorite={mockFavorite} />);
    expect(screen.getByText(/88/)).toBeInTheDocument();
  });

  it('renders face shape badge with label', async () => {
    const { FavoriteCard } = await import('@/components/profile/FavoriteCard');
    render(<FavoriteCard favorite={mockFavorite} />);
    expect(screen.getByText(/quadrado/i)).toBeInTheDocument();
  });

  it('renders consultation date', async () => {
    const { FavoriteCard } = await import('@/components/profile/FavoriteCard');
    render(<FavoriteCard favorite={mockFavorite} />);
    // Some date text should be visible
    expect(screen.getByText(/2026|Jan|fev|mar|jan/i)).toBeInTheDocument();
  });

  it('is accessible with a data-testid for the card container', async () => {
    const { FavoriteCard } = await import('@/components/profile/FavoriteCard');
    render(<FavoriteCard favorite={mockFavorite} />);
    expect(screen.getByTestId('favorite-card')).toBeInTheDocument();
  });
});

describe('FavoriteCard - navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('navigates to /consultation/results/:consultationId when card is clicked', async () => {
    const { FavoriteCard } = await import('@/components/profile/FavoriteCard');
    render(<FavoriteCard favorite={mockFavorite} />);
    const card = screen.getByTestId('favorite-card');
    fireEvent.click(card);
    expect(mockPush).toHaveBeenCalledWith('/consultation/results/consult-1');
  });

  it('uses the correct consultationId in navigation URL', async () => {
    const { FavoriteCard } = await import('@/components/profile/FavoriteCard');
    const favorite2 = { ...mockFavorite, consultationId: 'consult-xyz-789' };
    render(<FavoriteCard favorite={favorite2} />);
    const card = screen.getByTestId('favorite-card');
    fireEvent.click(card);
    expect(mockPush).toHaveBeenCalledWith('/consultation/results/consult-xyz-789');
  });
});
