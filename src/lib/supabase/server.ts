import { createServerClient as createSSRServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a user-scoped Supabase server client using @supabase/ssr.
 * Respects Row Level Security (RLS) — uses the anon key + cookies for user auth.
 * Use in Server Components, Server Actions, and Route Handlers for user-scoped operations.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createSSRServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // In Route Handlers cookies() is read-only after response headers are sent.
          // Wrap in try/catch to avoid throwing in those contexts -- the middleware
          // handles session refresh for server components anyway.
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Intentionally ignored: setAll called from a context where cookies are read-only.
          }
        },
      },
    }
  );
}

/**
 * Creates a Supabase client with the service role key.
 * Bypasses Row Level Security (RLS) — for API route admin operations.
 * NEVER use in client components — server-side only.
 *
 * Previously exported as createServerSupabaseClient() — renamed for clarity.
 */
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * @deprecated Use createServiceRoleClient() instead.
 * Kept for backward compatibility with existing API routes.
 */
export function createServerSupabaseClient() {
  return createServiceRoleClient();
}
