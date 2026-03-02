/**
 * Client-Side Analytics Event Tracker
 * Story 10.1, Task 5
 *
 * Fire-and-forget event tracking with batching.
 * - Batches up to 10 events, flushes every 5 seconds (whichever comes first)
 * - Uses navigator.sendBeacon on beforeunload (more reliable during page teardown)
 * - Handles visibilitychange for mobile browser backgrounding
 * - Silent error handling: never blocks user flow
 */

import { getOrCreateGuestSessionId } from '@/lib/guest-session';
import { getDeviceInfo } from './device-info';
import type { AnalyticsEventType } from './types';

const BATCH_SIZE = 10;
const FLUSH_INTERVAL_MS = 5000;
const API_ENDPOINT = '/api/analytics/events';

interface QueuedEvent {
  eventType: string;
  eventData: Record<string, unknown>;
  sessionId: string;
  deviceInfo: Record<string, unknown>;
  timestamp: string;
}

// Internal state — module-level (singleton)
let eventQueue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let listenersRegistered = false;

// Stored listener references so they can be removed during _resetTracker()
let _beforeUnloadListener: (() => void) | null = null;
let _visibilityChangeListener: (() => void) | null = null;

/**
 * Track an analytics event. Fire-and-forget — never throws.
 */
export function trackEvent(eventType: AnalyticsEventType | string, eventData?: object): void {
  // SSR guard: no-op server-side
  if (typeof window === 'undefined') return;

  const event: QueuedEvent = {
    eventType,
    eventData: (eventData as Record<string, unknown>) ?? {},
    sessionId: getOrCreateGuestSessionId(),
    deviceInfo: getDeviceInfo() as unknown as Record<string, unknown>,
    timestamp: new Date().toISOString(),
  };

  eventQueue.push(event);

  // Flush immediately if batch size reached
  if (eventQueue.length >= BATCH_SIZE) {
    void flushEvents();
  }

  // Start the periodic flush timer on first event
  if (!flushTimer) {
    flushTimer = setInterval(() => void flushEvents(), FLUSH_INTERVAL_MS);
  }

  // Register page lifecycle listeners once
  if (!listenersRegistered) {
    registerLifecycleListeners();
    listenersRegistered = true;
  }
}

/**
 * Flush the event queue to the API endpoint.
 * Exported for manual flushing in tests or critical moments.
 */
export async function flushEvents(): Promise<void> {
  if (eventQueue.length === 0) return;

  // Snapshot and clear the queue atomically
  const batch = eventQueue.splice(0, eventQueue.length);

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch }),
    });

    if (!response.ok) {
      // Log but don't retry (prevents infinite loops)
      console.error('[analytics] Flush failed:', response.status);
    }
  } catch (error) {
    // Silent failure — log for debugging only
    console.error('[analytics] Flush error:', error);
    // Do NOT re-queue the batch or retry
  }
}

/**
 * Flush using sendBeacon (more reliable during page unload).
 * Falls back to fetch if sendBeacon is unavailable.
 */
function flushWithBeacon(): void {
  if (eventQueue.length === 0) return;

  const batch = eventQueue.splice(0, eventQueue.length);
  const payload = JSON.stringify({ events: batch });

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([payload], { type: 'application/json' });
    const sent = navigator.sendBeacon(API_ENDPOINT, blob);
    if (!sent) {
      // sendBeacon returned false (queue full) — fall back to fetch
      console.warn('[analytics] sendBeacon returned false, trying fetch');
      void fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch((err) => console.error('[analytics] Beacon fallback fetch error:', err));
    }
  } else {
    // No sendBeacon support (older browsers) — attempt fetch with keepalive
    void fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch((err) => console.error('[analytics] Flush on unload error:', err));
  }
}

/**
 * Register page lifecycle event listeners for automatic flushing.
 * Called once when the first event is tracked.
 * Stores listener references so _resetTracker() can remove them cleanly.
 */
function registerLifecycleListeners(): void {
  // beforeunload: use sendBeacon for reliability during page teardown
  _beforeUnloadListener = () => {
    // Stop the interval timer
    if (flushTimer !== null) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
    flushWithBeacon();
  };
  window.addEventListener('beforeunload', _beforeUnloadListener);

  // visibilitychange: handles mobile browser backgrounding (tab switch, home button)
  // Modern mobile browsers fire visibilitychange but may not fire beforeunload
  _visibilityChangeListener = () => {
    if (document.hidden) {
      void flushEvents();
    }
  };
  document.addEventListener('visibilitychange', _visibilityChangeListener);
}

/**
 * Stop the flush timer, remove lifecycle listeners, and reset state.
 * For testing/cleanup only.
 * @internal
 */
export function _resetTracker(): void {
  eventQueue = [];
  if (flushTimer !== null) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  // Remove registered listeners to prevent duplicate registrations in tests
  if (_beforeUnloadListener !== null) {
    window.removeEventListener('beforeunload', _beforeUnloadListener);
    _beforeUnloadListener = null;
  }
  if (_visibilityChangeListener !== null) {
    document.removeEventListener('visibilitychange', _visibilityChangeListener);
    _visibilityChangeListener = null;
  }
  listenersRegistered = false;
}
