/**
 * API header utility for guest session context.
 * Story 8.4, Task 2 (AC: #2)
 *
 * Attaches `x-guest-session-id` header to fetch calls when user is NOT
 * authenticated. When an authenticated session exists, this header is
 * deliberately omitted so the server uses the authenticated user context.
 *
 * IMPORTANT: Never expose guest_session_id in URL parameters — use headers only.
 */
import { getGuestSessionId } from '@/lib/guest-session';

export interface GuestHeaderOptions {
  /** Whether the current user has an active Supabase auth session */
  isAuthenticated: boolean;
}

/**
 * Returns a partial headers record with `x-guest-session-id` when applicable.
 *
 * - Authenticated users: returns empty object (no guest header)
 * - Unauthenticated users with an existing session: returns { 'x-guest-session-id': <uuid> }
 * - Unauthenticated users without any session: returns empty object
 *   (does NOT generate a new session; call getOrCreateGuestSessionId() explicitly for that)
 */
export function buildGuestHeaders(
  options: GuestHeaderOptions
): Record<string, string> {
  if (options.isAuthenticated) {
    return {};
  }

  const guestSessionId = getGuestSessionId();
  if (!guestSessionId) {
    return {};
  }

  return {
    'x-guest-session-id': guestSessionId,
  };
}

/**
 * Returns a complete headers record for JSON API requests, including the
 * Content-Type header and, when applicable, the x-guest-session-id header.
 *
 * Usage:
 *   const headers = getGuestRequestHeaders({ isAuthenticated: false });
 *   await fetch('/api/consultation/start', { method: 'POST', headers, body: ... });
 */
export function getGuestRequestHeaders(
  options: GuestHeaderOptions
): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...buildGuestHeaders(options),
  };
}
