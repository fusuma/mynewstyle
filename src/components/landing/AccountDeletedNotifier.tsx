'use client';

/**
 * AccountDeletedNotifier — reads ?deleted=true URL param and shows success toast.
 * Story 11.3: Right to Deletion — AC #5
 *
 * When a user successfully deletes their account, they are redirected to /?deleted=true.
 * This component detects that param, shows the success toast, and cleans up the URL.
 *
 * Pattern mirrors GuestClaimHandler (Story 8.5).
 */

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

export function AccountDeletedNotifier() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const isDeleted = searchParams.get('deleted') === 'true';
    if (!isDeleted) return;

    // Remove ?deleted=true from URL without re-triggering navigation
    const current = new URL(window.location.href);
    current.searchParams.delete('deleted');
    router.replace(current.pathname + (current.search || ''), { scroll: false });

    // Show success toast (AC #5)
    toast.success('A sua conta e todos os dados foram eliminados com sucesso.');
  }, [searchParams, router]);

  // Renders nothing — side-effect only component
  return null;
}
