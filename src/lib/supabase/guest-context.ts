/**
 * Server-side guest session RLS helper.
 * Story 8.4, Task 3.3 (AC: #9, #10)
 *
 * Sets the PostgreSQL session variable `app.guest_session_id` so that
 * RLS policies on the `consultations` and `recommendations` tables can
 * grant SELECT access to guest-owned rows using:
 *   current_setting('app.guest_session_id', true)::uuid
 */
import type { SupabaseClient } from '@supabase/supabase-js';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates that the given value is a well-formed UUID string.
 * Returns the UUID if valid, or null if invalid/absent.
 *
 * Used on every API route that accepts x-guest-session-id to reject
 * malformed values with HTTP 400 before any DB access.
 */
export function validateGuestSessionHeader(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!UUID_REGEX.test(value)) return null;
  return value;
}

/**
 * Sets the `app.guest_session_id` session variable on the Supabase client's
 * underlying PostgreSQL connection, enabling RLS policies to grant guest access.
 *
 * Must be called BEFORE any SELECT on `consultations` or `recommendations`
 * when the request has an `x-guest-session-id` header (unauthenticated path).
 *
 * @param supabaseClient - Server-side Supabase client (anon key, SSR client)
 * @param guestSessionId - Validated UUID string from x-guest-session-id header
 */
export async function setGuestContext(
  supabaseClient: SupabaseClient,
  guestSessionId: string
): Promise<void> {
  // Use is_local: true so the config is scoped to the current transaction only.
  // Without this, the setting persists for the entire connection, which is unsafe
  // in a connection-pooled environment (e.g., PgBouncer / Supabase Pooler) —
  // it could leak one guest's session ID into a subsequent request on the same connection.
  await supabaseClient.rpc('set_config', {
    setting: 'app.guest_session_id',
    value: guestSessionId,
    is_local: true,
  });
}
