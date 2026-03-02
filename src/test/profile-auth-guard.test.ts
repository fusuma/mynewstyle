import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/navigation redirect
const mockRedirect = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

// Use vi.hoisted for mock functions
const { mockGetUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
}));

// Mock Supabase DB query chain
const mockSingle = vi.fn();
const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

// Mock @supabase/ssr
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn().mockImplementation(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

describe('Profile page auth guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('redirects unauthenticated user to /login?redirect=/profile', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const { getProfileData } = await import('@/app/profile/page');
    await getProfileData();

    expect(mockRedirect).toHaveBeenCalledWith('/login?redirect=/profile');
  });

  it('returns user profile data for authenticated user', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      created_at: '2026-01-01T00:00:00Z',
      user_metadata: { display_name: 'Test User' },
    };
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    mockSingle.mockResolvedValue({
      data: {
        id: 'user-123',
        display_name: 'Test User',
        gender_preference: 'male',
        created_at: '2026-01-01T00:00:00Z',
      },
      error: null,
    });

    const { getProfileData } = await import('@/app/profile/page');
    const profileData = await getProfileData();

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(profileData).toBeDefined();
    expect(profileData?.userId).toBe('user-123');
  });

  it('redirects when getUser returns an error', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Token expired' },
    });

    const { getProfileData } = await import('@/app/profile/page');
    await getProfileData();

    expect(mockRedirect).toHaveBeenCalledWith('/login?redirect=/profile');
  });
});
