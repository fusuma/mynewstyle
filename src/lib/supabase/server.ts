import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client using the service role key.
 * This bypasses Row Level Security (RLS) for API route operations.
 * NEVER use in client components — server-side only.
 */
export function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey);
}
