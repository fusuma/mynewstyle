'use client';

/**
 * GuestClaimHandler -- triggers client-side guest-to-auth migration.
 * Story 8.5, Task 5.3
 *
 * When the OAuth callback route (/auth/callback) redirects after a successful
 * code exchange, it appends `?claim_guest=1` to the destination URL.
 *
 * This component reads that query parameter, fires the claimGuestSession()
 * utility, and removes the param from the URL (to avoid re-triggering on refresh).
 *
 * Place this in any page that is a valid OAuth redirect destination (e.g. /profile).
 * It is a no-op if the query param is absent or no guest session exists.
 */

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { claimGuestSession } from '@/lib/auth/claim-guest';

export default function GuestClaimHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const shouldClaim = searchParams.get('claim_guest') === '1';
    if (!shouldClaim) return;

    // Remove `claim_guest` param from URL without re-triggering navigation
    const current = new URL(window.location.href);
    current.searchParams.delete('claim_guest');
    router.replace(current.pathname + (current.search || ''), { scroll: false });

    // Fire best-effort claim -- never blocks navigation
    claimGuestSession()
      .then((result) => {
        if (result.migrated > 0) {
          toast.success('Sua consultoria foi salva no seu perfil!');
        }
      })
      .catch(() => {
        // Intentionally swallowed -- claim failure never blocks UX
      });
  }, [searchParams, router]);

  // Renders nothing -- side-effect only component
  return null;
}
