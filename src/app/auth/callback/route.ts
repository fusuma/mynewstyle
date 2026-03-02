import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * OAuth callback route for Supabase Auth (PKCE flow).
 *
 * Google Cloud Console setup required:
 * 1. Go to: https://console.cloud.google.com/ → APIs & Services → Credentials
 * 2. Create OAuth 2.0 Client ID (Web application type)
 * 3. Add authorized redirect URI: https://<your-project-ref>.supabase.co/auth/v1/callback
 * 4. Copy Client ID and Client Secret
 *
 * Supabase Dashboard setup required:
 * 1. Go to: Authentication → Providers → Google
 * 2. Enable Google provider
 * 3. Paste Client ID and Client Secret from Google Cloud Console
 * 4. Save
 *
 * The redirect URL format: https://<project-ref>.supabase.co/auth/v1/callback
 * This is Supabase's redirect URL -- the app does NOT handle Google OAuth directly.
 * Supabase then redirects to this route (/auth/callback) with a one-time code.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const nextParam = searchParams.get('next') ?? '/profile';

  // Sanitize the `next` redirect path to prevent open redirect attacks.
  // Only allow relative paths that start with exactly one '/' (not '//' which is protocol-relative).
  // Reject absolute URLs (http://...) and protocol-relative URLs (//evil.com).
  const isRelativePath = nextParam.startsWith('/') && !nextParam.startsWith('//');
  const next = isRelativePath ? nextParam : '/profile';

  // Handle missing code param (edge case)
  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (!error) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  // Exchange failed -- redirect with error info
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
