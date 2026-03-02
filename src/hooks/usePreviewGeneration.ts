'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useConsultationStore } from '@/stores/consultation';
import type { PreviewStatus } from '@/types/index';
import { trackEvent } from '@/lib/analytics/tracker';
import { AnalyticsEventType } from '@/lib/analytics/types';

/**
 * Mock mode: set NEXT_PUBLIC_PREVIEW_MOCK=true to simulate preview generation
 * without calling real API endpoints (useful for development when API routes
 * for stories 7-1, 7-2, 7-3 are not yet available).
 */
const IS_MOCK_MODE = process.env.NEXT_PUBLIC_PREVIEW_MOCK === 'true';

/** Poll interval in milliseconds */
const POLL_INTERVAL_MS = 5000;

/** Timeout for preview generation in milliseconds (90 seconds) */
const GENERATION_TIMEOUT_MS = 90000;

/** Placeholder image for mock mode */
const MOCK_PREVIEW_URL = '/images/mock-preview-placeholder.jpg';

interface UsePreviewGenerationReturn {
  /** True if any preview is currently in 'generating' state */
  isAnyGenerating: boolean;
  /** Start preview generation for a recommendation */
  triggerPreview: (recommendationId: string, styleName: string, recommendationRank?: number) => Promise<void>;
  /** Get current preview status for a recommendation */
  getPreviewStatus: (recommendationId: string) => PreviewStatus;
}

/**
 * usePreviewGeneration — manages preview generation state per recommendation.
 *
 * Features:
 * - Sequential queue: only one preview can generate at a time (AC: 6)
 * - Polling: polls GET /api/preview/:id/status every 5 seconds
 * - 90-second timeout: marks as 'failed' if not resolved (AC: 8)
 * - Mock mode: simulate generation without real API (NEXT_PUBLIC_PREVIEW_MOCK=true)
 *
 * Story 7.4, Task 3
 */
export function usePreviewGeneration(): UsePreviewGenerationReturn {
  const previews = useConsultationStore((s) => s.previews);
  const consultationId = useConsultationStore((s) => s.consultationId);
  const startPreview = useConsultationStore((s) => s.startPreview);
  const updatePreviewStatus = useConsultationStore((s) => s.updatePreviewStatus);
  const setPreviewUrl = useConsultationStore((s) => s.setPreviewUrl);

  // Track active polling intervals and timeout refs per recommendation
  const pollRefs = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const timeoutRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Cleanup on unmount
  useEffect(() => {
    const polls = pollRefs.current;
    const timeouts = timeoutRefs.current;
    return () => {
      for (const interval of polls.values()) {
        clearInterval(interval);
      }
      for (const timeout of timeouts.values()) {
        clearTimeout(timeout);
      }
    };
  }, []);

  const isAnyGenerating = (() => {
    for (const [, status] of previews) {
      if (status.status === 'generating') return true;
    }
    return false;
  })();

  const getPreviewStatus = useCallback(
    (recommendationId: string): PreviewStatus => {
      return previews.get(recommendationId) ?? { status: 'idle' };
    },
    [previews]
  );

  const stopPolling = useCallback((recommendationId: string) => {
    const interval = pollRefs.current.get(recommendationId);
    if (interval !== undefined) {
      clearInterval(interval);
      pollRefs.current.delete(recommendationId);
    }
    const timeout = timeoutRefs.current.get(recommendationId);
    if (timeout !== undefined) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(recommendationId);
    }
  }, []);

  const pollStatus = useCallback(
    async (recommendationId: string) => {
      try {
        const response = await fetch(`/api/preview/${recommendationId}/status`);
        if (!response.ok) {
          // If API doesn't exist yet (404), treat as still generating
          if (response.status === 404) return;
          stopPolling(recommendationId);
          updatePreviewStatus(recommendationId, { status: 'failed', error: `HTTP ${response.status}` });
          return;
        }

        const data = (await response.json()) as { status: string; previewUrl?: string };

        if (data.status === 'ready' && data.previewUrl) {
          stopPolling(recommendationId);
          // Track preview_completed with duration (Task 7.13)
          const startTime = previewStartTimes.current.get(recommendationId);
          const durationMs = startTime ? Date.now() - startTime : 0;
          previewStartTimes.current.delete(recommendationId);
          trackEvent(AnalyticsEventType.PREVIEW_COMPLETED, {
            durationMs,
            qualityGate: 'pass',
          });
          setPreviewUrl(recommendationId, data.previewUrl);
        } else if (data.status === 'failed' || data.status === 'unavailable') {
          stopPolling(recommendationId);
          updatePreviewStatus(recommendationId, {
            status: data.status as 'failed' | 'unavailable',
            error: 'Preview generation failed',
          });
        }
        // If still 'generating', continue polling
      } catch {
        // Network error — continue polling (don't fail immediately)
      }
    },
    [stopPolling, updatePreviewStatus, setPreviewUrl]
  );

  const startPolling = useCallback(
    (recommendationId: string) => {
      // Set up polling interval
      const interval = setInterval(() => {
        void pollStatus(recommendationId);
      }, POLL_INTERVAL_MS);
      pollRefs.current.set(recommendationId, interval);

      // Set up 90-second timeout
      // AC8: timeout → 'unavailable' so "Visualizacao indisponivel" is shown (not the retry error)
      const timeout = setTimeout(() => {
        stopPolling(recommendationId);
        updatePreviewStatus(recommendationId, {
          status: 'unavailable',
          error: 'Generation timed out after 90 seconds',
        });
      }, GENERATION_TIMEOUT_MS);
      timeoutRefs.current.set(recommendationId, timeout);
    },
    [pollStatus, stopPolling, updatePreviewStatus]
  );

  // Track preview start times for duration calculation
  const previewStartTimes = useRef<Map<string, number>>(new Map());

  const startMockGeneration = useCallback(
    (recommendationId: string) => {
      // Simulate 10-second generation delay
      const timeout = setTimeout(() => {
        stopPolling(recommendationId);
        setPreviewUrl(recommendationId, MOCK_PREVIEW_URL);
      }, 10000);
      timeoutRefs.current.set(recommendationId, timeout);
    },
    [stopPolling, setPreviewUrl]
  );

  const triggerPreview = useCallback(
    async (recommendationId: string, styleName: string, recommendationRank: number = 1) => {
      // Sequential queue: block if another preview is generating
      for (const [, status] of previews) {
        if (status.status === 'generating') {
          return; // Another preview is in progress
        }
      }

      // Mark as generating in store
      startPreview(recommendationId);

      // Track preview_requested (Task 7.12)
      previewStartTimes.current.set(recommendationId, Date.now());
      trackEvent(AnalyticsEventType.PREVIEW_REQUESTED, { recommendationRank });

      if (IS_MOCK_MODE) {
        startMockGeneration(recommendationId);
        return;
      }

      try {
        const response = await fetch('/api/preview/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            consultationId,
            recommendationId,
            styleName,
          }),
        });

        if (!response.ok) {
          updatePreviewStatus(recommendationId, {
            status: 'failed',
            error: `Failed to start generation: HTTP ${response.status}`,
          });
          return;
        }

        // Successfully started — begin polling for status
        startPolling(recommendationId);
      } catch {
        updatePreviewStatus(recommendationId, {
          status: 'failed',
          error: 'Network error starting preview generation',
        });
      }
    },
    [previews, consultationId, startPreview, updatePreviewStatus, startPolling, startMockGeneration]
  );

  return {
    isAnyGenerating,
    triggerPreview,
    getPreviewStatus,
  };
}
