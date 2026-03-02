import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @supabase/ssr
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn().mockReturnValue({
    auth: {
      getUser: vi.fn(),
    },
  }),
}));

import { createServerClient } from '@supabase/ssr';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/auth-server';

describe('createAuthenticatedSupabaseClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createServerClient).mockReturnValue({
      auth: { getUser: vi.fn() },
    } as unknown as ReturnType<typeof createServerClient>);
  });

  it('creates a Supabase client from the request', () => {
    const mockRequest = new Request('http://localhost:3000/api/profile/consultations', {
      method: 'GET',
      headers: {
        cookie: 'sb-access-token=test-token; sb-refresh-token=test-refresh',
      },
    });

    const client = createAuthenticatedSupabaseClient(mockRequest);
    expect(client).toBeDefined();
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
  });

  it('uses the anon key (not service role key) to respect RLS', () => {
    const mockRequest = new Request('http://localhost:3000/api/profile/consultations');
    createAuthenticatedSupabaseClient(mockRequest);
    const calls = vi.mocked(createServerClient).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const [, key] = calls[0];
    expect(key).toBe(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  });

  it('getAll() returns parsed cookies from the request', () => {
    const mockRequest = new Request('http://localhost:3000/api/profile/consultations', {
      headers: {
        cookie: 'sb-access-token=abc123; sb-refresh-token=refresh456',
      },
    });

    let capturedGetAll: (() => Array<{ name: string; value: string }>) | undefined;
    vi.mocked(createServerClient).mockImplementationOnce((_url, _key, options) => {
      capturedGetAll = options?.cookies?.getAll;
      return { auth: { getUser: vi.fn() } } as unknown as ReturnType<typeof createServerClient>;
    });

    createAuthenticatedSupabaseClient(mockRequest);

    const cookies = capturedGetAll?.();
    expect(cookies).toBeDefined();
    expect(cookies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'sb-access-token', value: 'abc123' }),
        expect.objectContaining({ name: 'sb-refresh-token', value: 'refresh456' }),
      ])
    );
  });

  it('getAll() returns empty array when no cookies', () => {
    const mockRequest = new Request('http://localhost:3000/api/profile/consultations');

    let capturedGetAll: (() => Array<{ name: string; value: string }>) | undefined;
    vi.mocked(createServerClient).mockImplementationOnce((_url, _key, options) => {
      capturedGetAll = options?.cookies?.getAll;
      return { auth: { getUser: vi.fn() } } as unknown as ReturnType<typeof createServerClient>;
    });

    createAuthenticatedSupabaseClient(mockRequest);

    const cookies = capturedGetAll?.();
    expect(cookies).toEqual([]);
  });

  it('setAll() does not throw (cookies are read-only in Route Handlers)', () => {
    const mockRequest = new Request('http://localhost:3000/api/profile/consultations');

    let capturedSetAll: ((cookies: Array<{ name: string; value: string; options: object }>) => void) | undefined;
    vi.mocked(createServerClient).mockImplementationOnce((_url, _key, options) => {
      capturedSetAll = options?.cookies?.setAll;
      return { auth: { getUser: vi.fn() } } as unknown as ReturnType<typeof createServerClient>;
    });

    createAuthenticatedSupabaseClient(mockRequest);

    // setAll must not throw in Route Handler context
    expect(() =>
      capturedSetAll?.([{ name: 'sb-access-token', value: 'new-token', options: {} }])
    ).not.toThrow();
  });
});
