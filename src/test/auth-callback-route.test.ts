import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @/lib/supabase/server -- must use vi.hoisted() for variables referenced in factory
const { mockExchangeCodeForSession } = vi.hoisted(() => ({
  mockExchangeCodeForSession: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
    },
  }),
}));

// Mock NextResponse to track redirects
vi.mock('next/server', () => ({
  NextResponse: {
    redirect: vi.fn((url: string) => ({ redirectUrl: url, status: 302 })),
  },
}));

import { NextResponse } from 'next/server';
import { GET } from '@/app/auth/callback/route';

describe('Auth Callback Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(NextResponse.redirect).mockImplementation((url: string) => ({
      redirectUrl: url,
      status: 302,
    }) as unknown as ReturnType<typeof NextResponse.redirect>);
  });

  // 11.3 Unit test: Auth callback route exchanges code for session and redirects
  it('exchanges code for session and redirects to /profile on success', async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });

    const request = new Request('http://localhost:3000/auth/callback?code=test-code');
    await GET(request);

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('test-code');
    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.stringContaining('/profile')
    );
  });

  // Story 8-5 Task 5.3: OAuth callback appends claim_guest=1 to trigger client-side claim
  it('appends claim_guest=1 to redirect URL after successful code exchange', async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });

    const request = new Request('http://localhost:3000/auth/callback?code=test-code');
    await GET(request);

    const redirectArg = vi.mocked(NextResponse.redirect).mock.calls[0][0] as string;
    expect(redirectArg).toContain('claim_guest=1');
  });

  it('redirects to custom next param on success', async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });

    const request = new Request('http://localhost:3000/auth/callback?code=test-code&next=/dashboard');
    await GET(request);

    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.stringContaining('/dashboard')
    );
  });

  // 11.4 Unit test: Auth callback route handles missing code gracefully
  it('redirects to /login when no code param provided', async () => {
    const request = new Request('http://localhost:3000/auth/callback');
    await GET(request);

    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.stringContaining('/login')
    );
  });

  it('redirects to /login?error=auth_callback_failed on session exchange error', async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: { message: 'Invalid code' } });

    const request = new Request('http://localhost:3000/auth/callback?code=bad-code');
    await GET(request);

    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.stringContaining('/login?error=auth_callback_failed')
    );
  });

  // Security: open redirect protection
  it('rejects absolute URL in next param and falls back to /profile', async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });

    const maliciousNext = encodeURIComponent('https://evil.com');
    const request = new Request(
      `http://localhost:3000/auth/callback?code=test-code&next=${maliciousNext}`
    );
    await GET(request);

    const redirectArg = vi.mocked(NextResponse.redirect).mock.calls[0][0] as string;
    // Must redirect to /profile, not to evil.com
    expect(redirectArg).toContain('/profile');
    expect(redirectArg).not.toContain('evil.com');
  });

  it('rejects protocol-relative URL in next param and falls back to /profile', async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null });

    const maliciousNext = encodeURIComponent('//evil.com');
    const request = new Request(
      `http://localhost:3000/auth/callback?code=test-code&next=${maliciousNext}`
    );
    await GET(request);

    const redirectArg = vi.mocked(NextResponse.redirect).mock.calls[0][0] as string;
    expect(redirectArg).toContain('/profile');
    expect(redirectArg).not.toContain('evil.com');
  });
});
