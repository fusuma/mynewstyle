import { useEffect, useRef, useState, useCallback } from 'react';
import { useConsultationStore } from '@/stores/consultation';
import { buildGuestHeaders } from '@/lib/api/headers';

type ConsultationPaymentStatus = 'none' | 'pending' | 'paid' | 'failed' | 'refunded';
type ConsultationStatus = 'pending' | 'complete' | 'failed';

interface ConsultationStatusResponse {
  id: string;
  status: ConsultationStatus | string;
  paymentStatus: ConsultationPaymentStatus | string;
}

const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_DURATION_MS = 60_000;
const MAX_ATTEMPTS = MAX_POLL_DURATION_MS / POLL_INTERVAL_MS; // 12

export function useConsultationStatus(
  consultationId: string,
  enabled: boolean
) {
  const [isPolling, setIsPolling] = useState(false);
  const [consultationStatus, setConsultationStatus] =
    useState<ConsultationStatusResponse | null>(null);
  const setPaymentStatus = useConsultationStore((state) => state.setPaymentStatus);
  const attemptRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFetchingRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const pollStatus = useCallback(async () => {
    // Guard against concurrent requests: skip if a fetch is already in-flight
    if (isFetchingRef.current) return;

    attemptRef.current += 1;

    if (attemptRef.current > MAX_ATTEMPTS) {
      stopPolling();
      return;
    }

    isFetchingRef.current = true;
    try {
      // Include x-guest-session-id header when unauthenticated (Story 8.4, AC #2)
      const response = await fetch(
        `/api/consultation/${consultationId}/status`,
        { headers: buildGuestHeaders({ isAuthenticated: false }) }
      );
      if (!response.ok) return;

      const data: ConsultationStatusResponse = await response.json();
      setConsultationStatus(data);

      if (data.paymentStatus === 'refunded') {
        setPaymentStatus('refunded');
        stopPolling();
      } else if (data.status === 'complete') {
        stopPolling();
      }
    } catch {
      // Silently fail -- next poll will retry
    } finally {
      isFetchingRef.current = false;
    }
  }, [consultationId, setPaymentStatus, stopPolling]);

  useEffect(() => {
    if (!enabled || !consultationId) {
      stopPolling();
      return;
    }

    attemptRef.current = 0;
    isFetchingRef.current = false;
    setIsPolling(true);

    // Immediate first poll
    pollStatus();

    intervalRef.current = setInterval(pollStatus, POLL_INTERVAL_MS);

    return () => stopPolling();
  }, [enabled, consultationId, pollStatus, stopPolling]);

  return { isPolling, consultationStatus };
}
