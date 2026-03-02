import { createServerClient } from '@supabase/ssr';

/**
 * Creates a Supabase client authenticated with the user's session from the request.
 *
 * Reads the Supabase auth tokens from request cookies, enabling RLS-aware queries
 * as the authenticated user. This is DISTINCT from createServiceRoleClient() in
 * server.ts which bypasses RLS.
 *
 * Use in Route Handlers that need to query data scoped to the authenticated user.
 * Example: GET /api/profile/consultations, GET /api/profile/favorites
 *
 * @param request - The incoming Next.js Request object
 * @returns A Supabase client with the user's session applied (respects RLS)
 */
export function createAuthenticatedSupabaseClient(request: Request) {
  const cookieHeader = request.headers.get('cookie') ?? '';

  // Parse cookies from the request header into a key-value map
  const parsedCookies = parseCookieHeader(cookieHeader);

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return Object.entries(parsedCookies).map(([name, value]) => ({ name, value }));
        },
        setAll(_cookiesToSet) {
          // Route handlers: cookies are read-only after response is sent.
          // Auth token refresh is handled by the middleware (src/middleware.ts).
        },
      },
    }
  );
}

/**
 * Parses a Cookie header string into a key-value record.
 * Example: "name=value; name2=value2" → { name: "value", name2: "value2" }
 */
function parseCookieHeader(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach((pair) => {
    const eqIndex = pair.indexOf('=');
    if (eqIndex === -1) return;
    const name = pair.slice(0, eqIndex).trim();
    const value = pair.slice(eqIndex + 1).trim();
    if (name) {
      cookies[name] = decodeURIComponent(value);
    }
  });

  return cookies;
}
