import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to avoid variable initialization issues
const { mockGetUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn().mockImplementation(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

import { middleware, config } from '@/middleware';
import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

function createMockRequest(url: string) {
  return new NextRequest(url, { method: 'GET' });
}

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createServerClient).mockImplementation(() => ({
      auth: { getUser: mockGetUser },
    }) as unknown as ReturnType<typeof createServerClient>);
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  // 11.7 Unit test: Middleware refreshes session and passes cookies
  it('calls getUser() to refresh session token', async () => {
    const request = createMockRequest('http://localhost:3000/some-page');
    await middleware(request);

    expect(createServerClient).toHaveBeenCalledWith(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      })
    );
    expect(mockGetUser).toHaveBeenCalledOnce();
  });

  it('does NOT redirect unauthenticated users (auth is additive)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const request = createMockRequest('http://localhost:3000/');
    const response = await middleware(request);

    // No redirect -- the response should exist (a next() response)
    expect(response).toBeDefined();
    // The response should NOT have a Location header indicating a redirect
    const location = response.headers.get('location');
    expect(location).toBeNull();
  });

  it('has a matcher that excludes static assets', () => {
    const matcher = config.matcher;
    expect(matcher).toBeDefined();
    expect(Array.isArray(matcher)).toBe(true);
    // Matcher should contain a pattern that excludes _next/static
    const pattern = matcher[0];
    expect(pattern).toContain('_next/static');
  });

  it('returns a response for authenticated pages', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    const request = createMockRequest('http://localhost:3000/profile');
    const response = await middleware(request);
    expect(response).toBeDefined();
  });

  // Resilience: middleware must not crash when getUser() throws (e.g., network error / Supabase outage)
  it('continues serving request when getUser() throws a network error', async () => {
    mockGetUser.mockRejectedValue(new Error('Network error'));
    const request = createMockRequest('http://localhost:3000/some-page');

    // Should NOT throw -- middleware must handle errors gracefully and still return a response
    const response = await middleware(request);
    expect(response).toBeDefined();
  });
});
