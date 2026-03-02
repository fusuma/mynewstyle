import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock consultation store
const mockSetPaymentStatus = vi.fn();
vi.mock('@/stores/consultation', () => ({
  useConsultationStore: (selector: (state: { setPaymentStatus: (s: string) => void }) => unknown) =>
    selector({ setPaymentStatus: mockSetPaymentStatus }),
}));

const validId = '550e8400-e29b-41d4-a716-446655440000';

describe('useConsultationStatus polling hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does NOT start polling when enabled is false', async () => {
    const { useConsultationStatus } = await import('@/hooks/useConsultationStatus');
    renderHook(() => useConsultationStatus(validId, false));
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('starts polling immediately when enabled is true', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: validId, status: 'pending', paymentStatus: 'paid' }),
    });
    const { useConsultationStatus } = await import('@/hooks/useConsultationStatus');
    renderHook(() => useConsultationStatus(validId, true));
    await act(async () => {
      await Promise.resolve(); // allow microtasks to flush
    });
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/consultation/${validId}/status`
    );
  });

  it('polls again after 5 seconds interval', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: validId, status: 'pending', paymentStatus: 'paid' }),
    });
    const { useConsultationStatus } = await import('@/hooks/useConsultationStatus');
    renderHook(() => useConsultationStatus(validId, true));
    // Flush microtasks to allow the immediate poll fetch + json() + finally to complete
    // before advancing the timer for the interval poll.
    await act(async () => {
      // Multiple flushes: fetch resolves -> json() resolves -> finally clears isFetchingRef
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      vi.advanceTimersByTime(5_000);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('stops polling and calls setPaymentStatus("refunded") when paymentStatus is refunded', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: validId, status: 'pending', paymentStatus: 'refunded' }),
    });
    const { useConsultationStatus } = await import('@/hooks/useConsultationStatus');
    renderHook(() => useConsultationStatus(validId, true));
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockSetPaymentStatus).toHaveBeenCalledWith('refunded');
    // Should have stopped after first poll
    const callCount = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;
    await act(async () => {
      vi.advanceTimersByTime(10_000);
      await Promise.resolve();
    });
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callCount);
  });

  it('stops polling when status is "complete"', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: validId, status: 'complete', paymentStatus: 'paid' }),
    });
    const { useConsultationStatus } = await import('@/hooks/useConsultationStatus');
    renderHook(() => useConsultationStatus(validId, true));
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockSetPaymentStatus).not.toHaveBeenCalled();
    const callCount = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;
    await act(async () => {
      vi.advanceTimersByTime(10_000);
      await Promise.resolve();
    });
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callCount);
  });

  it('stops polling after max 12 attempts', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: validId, status: 'pending', paymentStatus: 'paid' }),
    });
    const { useConsultationStatus } = await import('@/hooks/useConsultationStatus');
    renderHook(() => useConsultationStatus(validId, true));
    // Advance through 13 intervals (12 allowed + 1 to confirm stop)
    await act(async () => {
      for (let i = 0; i < 13; i++) {
        await Promise.resolve();
        vi.advanceTimersByTime(5_000);
        await Promise.resolve();
      }
    });
    // Should have stopped at 12 (MAX_ATTEMPTS)
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeLessThanOrEqual(12);
  });

  it('returns isPolling=true when polling is active', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: validId, status: 'pending', paymentStatus: 'paid' }),
    });
    const { useConsultationStatus } = await import('@/hooks/useConsultationStatus');
    const { result } = renderHook(() => useConsultationStatus(validId, true));
    expect(result.current.isPolling).toBe(true);
  });

  it('returns isPolling=false when not enabled', async () => {
    const { useConsultationStatus } = await import('@/hooks/useConsultationStatus');
    const { result } = renderHook(() => useConsultationStatus(validId, false));
    expect(result.current.isPolling).toBe(false);
  });

  it('cleans up interval on unmount', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: validId, status: 'pending', paymentStatus: 'paid' }),
    });
    const { useConsultationStatus } = await import('@/hooks/useConsultationStatus');
    const { unmount } = renderHook(() => useConsultationStatus(validId, true));
    await act(async () => {
      await Promise.resolve();
    });
    const callsBefore = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;
    unmount();
    await act(async () => {
      vi.advanceTimersByTime(10_000);
      await Promise.resolve();
    });
    // fetch should not be called again after unmount
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callsBefore);
  });

  it('silently ignores fetch errors and continues polling on next interval', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: validId, status: 'pending', paymentStatus: 'paid' }),
      });
    const { useConsultationStatus } = await import('@/hooks/useConsultationStatus');
    const { result } = renderHook(() => useConsultationStatus(validId, true));
    await act(async () => {
      await Promise.resolve();
      vi.advanceTimersByTime(5_000);
      await Promise.resolve();
    });
    // After network error on first call + success on second, should still be polling
    expect(result.current.isPolling).toBe(true);
    expect(mockSetPaymentStatus).not.toHaveBeenCalled();
  });

  it('does not make concurrent requests when a fetch is still in-flight', async () => {
    let resolveFetch!: (value: unknown) => void;
    const slowFetch = new Promise((resolve) => { resolveFetch = resolve; });
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(slowFetch);
    const { useConsultationStatus } = await import('@/hooks/useConsultationStatus');
    renderHook(() => useConsultationStatus(validId, true));

    // Immediate fetch is in-flight (not yet resolved)
    await act(async () => {
      // Advance timer by 5s -- interval fires, but isFetchingRef=true so it is skipped
      vi.advanceTimersByTime(5_000);
      await Promise.resolve();
    });

    // Only 1 fetch should have been made (the second was skipped due to concurrency guard)
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);

    // Resolve the slow fetch so cleanup works
    resolveFetch({ ok: false });
    await act(async () => { await Promise.resolve(); });
  });
});
