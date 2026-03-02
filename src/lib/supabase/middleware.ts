import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Creates a Supabase client configured for Next.js middleware.
 * Returns both the client and the response object (which holds updated cookies).
 *
 * IMPORTANT: The returned `supabaseResponse` must be used as the response
 * from the middleware, so that updated auth cookies are forwarded to the browser.
 *
 * Usage:
 *   const { supabase, supabaseResponse } = createSupabaseMiddlewareClient(request);
 *   await supabase.auth.getUser();
 *   return supabaseResponse;
 */
export function createSupabaseMiddlewareClient(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  return { supabase, supabaseResponse };
}
