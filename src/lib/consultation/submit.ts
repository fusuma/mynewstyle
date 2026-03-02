import type { ConsultationStartPayload, ConsultationStartResponse } from '@/types';
import { getGuestRequestHeaders } from '@/lib/api/headers';
import { getGuestSessionId } from '@/lib/guest-session';

export class ConsultationSubmissionError extends Error {
  retryable: boolean;

  constructor(message: string, retryable: boolean = true) {
    super(message);
    this.name = 'ConsultationSubmissionError';
    this.retryable = retryable;
  }
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  const totalAttempts = maxRetries + 1;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  const retryError = new Error(
    `Failed after ${totalAttempts} attempts: ${lastError?.message ?? 'Unknown error'}`
  );
  retryError.cause = lastError;
  throw retryError;
}

export interface SubmitOptions {
  /** Override retry delay in ms (default: 1000). Useful for testing. */
  retryDelayMs?: number;
}

export async function submitConsultation(
  payload: ConsultationStartPayload,
  options?: SubmitOptions
): Promise<ConsultationStartResponse> {
  const delayMs = options?.retryDelayMs ?? 1000;

  try {
    return await withRetry(
      async () => {
        // Attach x-guest-session-id header when unauthenticated (Story 8.4, AC #2)
        // Also include guestSessionId in body so the server can store it on the record
        const guestSessionId = getGuestSessionId();
        const enrichedPayload: ConsultationStartPayload = guestSessionId
          ? { ...payload, guestSessionId }
          : payload;

        const response = await fetch('/api/consultation/start', {
          method: 'POST',
          headers: getGuestRequestHeaders({ isAuthenticated: false }),
          body: JSON.stringify(enrichedPayload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            (errorData as { error?: string }).error || `HTTP ${response.status}`
          );
        }

        return response.json() as Promise<ConsultationStartResponse>;
      },
      2,
      delayMs
    );
  } catch (error) {
    if (error instanceof ConsultationSubmissionError) {
      throw error;
    }
    throw new ConsultationSubmissionError(
      (error as Error).message || 'Submission failed',
      true
    );
  }
}
