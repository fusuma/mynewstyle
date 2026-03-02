'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { captureReferralFromUrl } from '@/lib/referral/capture';

/**
 * ReferralCapture — invisible root-level client component.
 *
 * Runs on app load to capture the `?ref=CODE` URL parameter and store it
 * in localStorage for first-touch attribution. Re-runs when search params
 * change (e.g., after navigation to a referral link).
 *
 * AC #3: Captures ref param, stores in localStorage(mynewstyle_ref), first-touch.
 * AC #10: Works for both authenticated and guest users.
 */
export function ReferralCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    captureReferralFromUrl();
  }, [searchParams]);

  return null; // Invisible component — no DOM output
}
