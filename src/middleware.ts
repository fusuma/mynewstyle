import { type NextRequest } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware';

/**
 * Next.js middleware for Supabase auth token refresh.
 * Runs on every request (except static assets) to keep the session fresh.
 * IMPORTANT: Does NOT redirect unauthenticated users -- auth is additive in this app.
 */
export async function middleware(request: NextRequest) {
  const { supabase, supabaseResponse } = createSupabaseMiddlewareClient(request);

  // IMPORTANT: use getUser() not getSession() -- getUser() validates token against Supabase Auth server
  // This is required to refresh expired tokens and pass the updated session to server components via cookies.
  // Catch network/auth errors so a Supabase outage does not take down all page requests.
  try {
    await supabase.auth.getUser();
  } catch {
    // Token refresh failed (e.g., network error, Supabase outage).
    // Continue serving the request without a refreshed session rather than crashing.
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (browser icon)
     * - image files (svg, png, jpg, jpeg, gif, webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
