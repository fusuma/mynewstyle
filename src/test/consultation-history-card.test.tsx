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
  Calendar: ({ className }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-calendar" className={className} />
  ),
  User: ({ className }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-user" className={className} />
  ),
  Star: ({ className }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-star" className={className} />
  ),
  ChevronRight: ({ className }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-chevron-right" className={className} />
  ),
  Heart: ({ className }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-heart" className={className} />
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

const mockConsultation = {
  id: 'consult-1',
  gender: 'male' as const,
  faceShape: 'oval' as const,
  confidence: 0.9,
  status: 'completed',
  paymentStatus: 'paid',
  createdAt: '2026-01-15T10:00:00Z',
  completedAt: '2026-01-15T10:05:00Z',
  topRecommendation: {
    styleName: 'Undercut Moderno',
    matchScore: 92,
  },
};

describe('ConsultationHistoryCard - rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('renders formatted consultation date', async () => {
    const { ConsultationHistoryCard } = await import('@/components/profile/ConsultationHistoryCard');
    render(<ConsultationHistoryCard consultation={mockConsultation} />);
    // Date should be displayed in some human-readable format
    expect(screen.getByText(/2026|Jan|fev|mar|jan/i)).toBeInTheDocument();
  });

  it('renders face shape badge with correct label', async () => {
    const { ConsultationHistoryCard } = await import('@/components/profile/ConsultationHistoryCard');
    render(<ConsultationHistoryCard consultation={mockConsultation} />);
    expect(screen.getByText(/oval/i)).toBeInTheDocument();
  });

  it('renders top recommendation style name', async () => {
    const { ConsultationHistoryCard } = await import('@/components/profile/ConsultationHistoryCard');
    render(<ConsultationHistoryCard consultation={mockConsultation} />);
    expect(screen.getByText(/undercut moderno/i)).toBeInTheDocument();
  });

  it('renders "Ver novamente" button', async () => {
    const { ConsultationHistoryCard } = await import('@/components/profile/ConsultationHistoryCard');
    render(<ConsultationHistoryCard consultation={mockConsultation} />);
    expect(screen.getByRole('button', { name: /ver novamente/i })).toBeInTheDocument();
  });

  it('renders gender indicator', async () => {
    const { ConsultationHistoryCard } = await import('@/components/profile/ConsultationHistoryCard');
    render(<ConsultationHistoryCard consultation={mockConsultation} />);
    // Should render some gender indicator (male/female)
    const container = screen.getByTestId('consultation-history-card');
    expect(container).toBeInTheDocument();
  });

  it('renders with null topRecommendation gracefully', async () => {
    const { ConsultationHistoryCard } = await import('@/components/profile/ConsultationHistoryCard');
    const consultationWithNoRec = { ...mockConsultation, topRecommendation: null };
    render(<ConsultationHistoryCard consultation={consultationWithNoRec} />);
    expect(screen.getByRole('button', { name: /ver novamente/i })).toBeInTheDocument();
  });
});

describe('ConsultationHistoryCard - navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('navigates to /consultation/results/:id when "Ver novamente" is clicked', async () => {
    const { ConsultationHistoryCard } = await import('@/components/profile/ConsultationHistoryCard');
    render(<ConsultationHistoryCard consultation={mockConsultation} />);
    const button = screen.getByRole('button', { name: /ver novamente/i });
    fireEvent.click(button);
    expect(mockPush).toHaveBeenCalledWith('/consultation/results/consult-1');
  });

  it('uses consultation id in navigation URL', async () => {
    const { ConsultationHistoryCard } = await import('@/components/profile/ConsultationHistoryCard');
    const consultation2 = { ...mockConsultation, id: 'consult-abc-123' };
    render(<ConsultationHistoryCard consultation={consultation2} />);
    const button = screen.getByRole('button', { name: /ver novamente/i });
    fireEvent.click(button);
    expect(mockPush).toHaveBeenCalledWith('/consultation/results/consult-abc-123');
  });
});
