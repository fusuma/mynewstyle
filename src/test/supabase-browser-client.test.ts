import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @supabase/ssr
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn().mockReturnValue({
    auth: {
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn(),
    },
    storage: {
      from: vi.fn(),
    },
  }),
}));

import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@/lib/supabase/client';

describe('Supabase Browser Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 11.1 Unit test: createClient() from browser client returns a valid Supabase client instance
  it('createClient() returns a Supabase client instance', () => {
    const client = createClient();
    expect(client).toBeDefined();
    expect(createBrowserClient).toHaveBeenCalledWith(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  });

  it('createClient() calls createBrowserClient with env vars', () => {
    createClient();
    expect(createBrowserClient).toHaveBeenCalledOnce();
  });

  it('each createClient() call creates a fresh client (no singleton)', () => {
    createClient();
    createClient();
    expect(createBrowserClient).toHaveBeenCalledTimes(2);
  });
});
