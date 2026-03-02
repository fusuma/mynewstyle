/**
 * Client-side utility for claiming a guest session after authentication.
 * Story 8.5, Task 4.1 – 4.5
 *
 * Called automatically after:
 * - Email/password registration success (Story 8-2 register page)
 * - Email/password login success (Story 8-3 login page)
 * - Google OAuth callback (Story 8-1 auth callback route via GuestClaimHandler)
 *
 * Contract:
 * - Reads guestSessionId from localStorage (via getGuestSessionId from Story 8-4)
 * - If no guest session ID exists, returns { migrated: 0 } immediately (no-op)
 * - Calls POST /api/auth/claim-guest with the guest session ID
 * - On success: calls clearGuestSessionId() to remove from localStorage
 * - On success with migrated > 0: resets Zustand consultation store so profile page
 *   fetches fresh data from the server (Task 4.5)
 * - On failure: logs error, does NOT block auth flow (graceful degradation)
 * - Never throws -- all errors are caught and swallowed
 *
 * AC: #6, #7, #8
 */

import { getGuestSessionId, clearGuestSessionId } from '@/lib/guest-session';
import { useConsultationStore } from '@/stores/consultation';

export interface ClaimGuestResult {
  migrated: number;
}

/**
 * Attempts to claim a pending guest session for the currently authenticated user.
 *
 * This function is safe to call unconditionally after any successful auth event.
 * If there is no guest session in localStorage, it returns immediately without
 * making any network request.
 *
 * @returns Promise<{ migrated: number }> -- always resolves, never rejects
 */
export async function claimGuestSession(): Promise<ClaimGuestResult> {
  // Task 4.2: Read guestSessionId from localStorage via getGuestSessionId()
  const guestSessionId = getGuestSessionId();

  // Task 4.2: If no guest session ID exists, return no-op immediately
  if (!guestSessionId) {
    return { migrated: 0 };
  }

  try {
    // Task 4.2: Call POST /api/auth/claim-guest with { guestSessionId }
    const response = await fetch('/api/auth/claim-guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestSessionId }),
    });

    if (!response.ok) {
      // Log but do NOT throw -- registration/login flow must not be blocked
      console.warn(
        `[claimGuestSession] API returned ${response.status}. Guest migration skipped.`
      );
      return { migrated: 0 };
    }

    const data = await response.json();
    const migrated: number = data?.migrated ?? 0;

    // Task 4.2: On success, clear the guest session ID from localStorage
    clearGuestSessionId();

    // Task 4.5: Invalidate cached consultation data in Zustand store so the profile
    // page fetches fresh server data. Only reset when records were actually migrated.
    if (migrated > 0) {
      useConsultationStore.getState().reset();
    }

    return { migrated };
  } catch (error) {
    // Task 4.2: On any failure, log but do NOT throw -- graceful degradation
    console.warn('[claimGuestSession] Migration failed (will not block auth flow):', error);
    return { migrated: 0 };
  }
}
