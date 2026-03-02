import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock next/navigation
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/profile',
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
  User: ({ className }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-user" className={className} />
  ),
  Star: ({ className }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-star" className={className} />
  ),
  Calendar: ({ className }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-calendar" className={className} />
  ),
  Heart: ({ className }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-heart" className={className} />
  ),
  ChevronRight: ({ className }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-chevron-right" className={className} />
  ),
  // Icons used by ReferralLinkCard (Story 9.5)
  Copy: ({ className }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-copy" className={className} />
  ),
  Check: ({ className }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-check" className={className} />
  ),
  Link: ({ className }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-link" className={className} />
  ),
  AlertCircle: ({ className }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-alert-circle" className={className} />
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

// Global fetch mock
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Default referral code response (used by ReferralLinkCard)
const mockReferralResponse = {
  ok: true,
  json: async () => ({ referralCode: 'ABC1234', referralLink: 'https://mynewstyle.com/?ref=ABC1234' }),
};

// Helper to create a URL-aware fetch mock
function createUrlAwareFetch(consultationResponse = { consultations: [] as unknown[], favorites: [] as unknown[] }) {
  return vi.fn().mockImplementation((url: string) => {
    if (url.includes('/api/referral/code')) {
      return Promise.resolve(mockReferralResponse);
    }
    return Promise.resolve({
      ok: true,
      json: async () => consultationResponse,
    });
  });
}

const mockUserProfile = {
  id: 'user-123',
  displayName: 'João Silva',
  genderPreference: 'male' as const,
  createdAt: '2026-01-01T00:00:00Z',
};

describe('ProfilePage - tab switching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockFetch.mockImplementation(createUrlAwareFetch());
  });

  it('renders "Consultorias" tab by default', async () => {
    const { ProfilePage } = await import('@/components/profile/ProfilePage');
    render(<ProfilePage userProfile={mockUserProfile} />);
    expect(screen.getByRole('tab', { name: /consultorias/i })).toBeInTheDocument();
  });

  it('renders "Favoritos" tab', async () => {
    const { ProfilePage } = await import('@/components/profile/ProfilePage');
    render(<ProfilePage userProfile={mockUserProfile} />);
    expect(screen.getByRole('tab', { name: /favoritos/i })).toBeInTheDocument();
  });

  it('"Consultorias" tab is selected by default', async () => {
    const { ProfilePage } = await import('@/components/profile/ProfilePage');
    render(<ProfilePage userProfile={mockUserProfile} />);
    const tab = screen.getByRole('tab', { name: /consultorias/i });
    expect(tab).toHaveAttribute('data-state', 'active');
  });

  it('has two tabs rendered', async () => {
    const { ProfilePage } = await import('@/components/profile/ProfilePage');
    render(<ProfilePage userProfile={mockUserProfile} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
  });
});

describe('ProfilePage - user display name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockFetch.mockImplementation(createUrlAwareFetch());
  });

  it('displays user displayName in header', async () => {
    const { ProfilePage } = await import('@/components/profile/ProfilePage');
    render(<ProfilePage userProfile={mockUserProfile} />);
    expect(screen.getByText(/joão silva/i)).toBeInTheDocument();
  });

  it('falls back to email when displayName is null', async () => {
    const { ProfilePage } = await import('@/components/profile/ProfilePage');
    const profileWithEmail = {
      ...mockUserProfile,
      displayName: null,
      email: 'joao@example.com',
    };
    render(<ProfilePage userProfile={profileWithEmail} />);
    expect(screen.getByText(/joao@example\.com/i)).toBeInTheDocument();
  });
});

describe('ProfilePage - empty states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('shows empty consultation state when no consultations', async () => {
    mockFetch.mockImplementation(createUrlAwareFetch({ consultations: [], favorites: [] }));
    const { ProfilePage } = await import('@/components/profile/ProfilePage');
    render(<ProfilePage userProfile={mockUserProfile} />);
    await waitFor(() => {
      expect(screen.getByText(/ainda nao tem consultorias\. descubra o seu estilo!/i)).toBeInTheDocument();
    });
  });

  it('renders Favoritos tab panel with correct role', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/referral/code')) {
        return Promise.resolve(mockReferralResponse);
      }
      if (url.includes('favorites')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ favorites: [] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ consultations: [] }),
      });
    });
    const { ProfilePage } = await import('@/components/profile/ProfilePage');
    render(<ProfilePage userProfile={mockUserProfile} />);
    // Verify the favorites tab panel exists in the DOM
    const favTab = screen.getByRole('tab', { name: /favoritos/i });
    expect(favTab).toBeInTheDocument();
    // Tab panel for favorites should exist (even when inactive)
    const allTabPanels = screen.getAllByRole('tabpanel', { hidden: true });
    expect(allTabPanels.length).toBeGreaterThanOrEqual(1);
  });

  it('shows CTA button for empty consultations state', async () => {
    mockFetch.mockImplementation(createUrlAwareFetch({ consultations: [], favorites: [] }));
    const { ProfilePage } = await import('@/components/profile/ProfilePage');
    render(<ProfilePage userProfile={mockUserProfile} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /iniciar consultoria/i })).toBeInTheDocument();
    });
  });
});

describe('ProfilePage - loading states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('renders skeleton placeholders during consultation history loading', async () => {
    // Simulate slow fetch
    mockFetch.mockImplementation(() => new Promise(() => {}));
    const { ProfilePage } = await import('@/components/profile/ProfilePage');
    render(<ProfilePage userProfile={mockUserProfile} />);
    // Should show loading skeleton or skeleton elements
    expect(screen.getByTestId('consultation-history-loading')).toBeInTheDocument();
  });
});

describe('ProfilePage - gender theming', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockFetch.mockImplementation(createUrlAwareFetch());
  });

  it('applies male theme class when genderPreference is male', async () => {
    const { ProfilePage } = await import('@/components/profile/ProfilePage');
    const { container } = render(<ProfilePage userProfile={mockUserProfile} />);
    expect(container.firstChild).toHaveAttribute('data-gender', 'male');
  });

  it('applies female theme class when genderPreference is female', async () => {
    const { ProfilePage } = await import('@/components/profile/ProfilePage');
    const femaleProfile = { ...mockUserProfile, genderPreference: 'female' as const };
    const { container } = render(<ProfilePage userProfile={femaleProfile} />);
    expect(container.firstChild).toHaveAttribute('data-gender', 'female');
  });

  it('applies neutral theme when genderPreference is null', async () => {
    const { ProfilePage } = await import('@/components/profile/ProfilePage');
    const neutralProfile = { ...mockUserProfile, genderPreference: null };
    const { container } = render(<ProfilePage userProfile={neutralProfile} />);
    expect(container.firstChild).not.toHaveAttribute('data-gender');
  });
});
