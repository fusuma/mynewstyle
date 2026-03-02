import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @supabase/ssr
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn().mockReturnValue({
    auth: {
      getUser: vi.fn(),
    },
  }),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}));

// Mock @supabase/supabase-js (for service role client)
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockReturnValue({ auth: {} }),
}));

import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient, createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server';

describe('Supabase Server Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-setup mock after clear
    vi.mocked(createServerClient).mockReturnValue({
      auth: { getUser: vi.fn() },
    } as unknown as ReturnType<typeof createServerClient>);
    vi.mocked(createSupabaseClient).mockReturnValue({ auth: {} } as unknown as ReturnType<typeof createSupabaseClient>);
  });

  // 11.2 Unit test: createClient() from server client creates a client with cookie handling
  it('createClient() creates a server client with cookie handlers', async () => {
    const client = await createClient();
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

  it('createServiceRoleClient() creates a client with service role key', () => {
    const client = createServiceRoleClient();
    expect(client).toBeDefined();
  });

  it('createClient() uses the anon key (not service role key)', async () => {
    await createClient();
    const calls = vi.mocked(createServerClient).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const [, key] = calls[0];
    expect(key).toBe(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  });

  // Backward-compat alias (Task 3.5): createServerSupabaseClient() must still work
  it('createServerSupabaseClient() is a working alias for createServiceRoleClient()', () => {
    const client = createServerSupabaseClient();
    expect(client).toBeDefined();
    // Both should call createClient from @supabase/supabase-js
    expect(vi.mocked(createSupabaseClient)).toHaveBeenCalled();
  });

  // Cookie setAll must not throw when the underlying cookie store is read-only (Route Handler context)
  it('setAll in createClient() cookie handler does not throw when cookieStore.set throws', async () => {
    const { cookies } = await import('next/headers');
    vi.mocked(cookies).mockResolvedValueOnce({
      getAll: vi.fn().mockReturnValue([]),
      set: vi.fn().mockImplementation(() => {
        throw new Error('cookies are read-only in this context');
      }),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    // Capture the options passed to createServerClient so we can invoke setAll directly
    let capturedSetAll: ((cookies: Array<{ name: string; value: string; options: object }>) => void) | undefined;
    vi.mocked(createServerClient).mockImplementationOnce((_url, _key, options) => {
      capturedSetAll = options?.cookies?.setAll;
      return { auth: { getUser: vi.fn() } } as unknown as ReturnType<typeof createServerClient>;
    });

    await createClient();

    // Calling setAll should NOT throw even though cookieStore.set throws internally
    expect(() => capturedSetAll?.([{ name: 'sb-token', value: 'tok', options: {} }])).not.toThrow();
  });
});
