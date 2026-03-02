import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a Supabase browser client using @supabase/ssr.
 * Returns a fresh client on each call (no singleton) for proper SSR cookie access.
 * Use in client components only ('use client').
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
