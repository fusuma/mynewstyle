/**
 * Tests for usePreviewGeneration hook (Story 7.4, AC: 6, 8)
 * Task 8.1: Unit tests for usePreviewGeneration hook (state transitions, timeout, queue)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock consultation store
const mockStartPreview = vi.fn();
const mockUpdatePreviewStatus = vi.fn();
const mockSetPreviewUrl = vi.fn();

const mockPreviewsMap = new Map();

vi.mock('@/stores/consultation', () => ({
  useConsultationStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      consultationId: 'consultation-123',
      previews: mockPreviewsMap,
      startPreview: mockStartPreview,
      updatePreviewStatus: mockUpdatePreviewStatus,
      setPreviewUrl: mockSetPreviewUrl,
    }),
}));

// Import hook after mocks
import { usePreviewGeneration } from '@/hooks/usePreviewGeneration';

describe('usePreviewGeneration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockPreviewsMap.clear();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial state with isAnyGenerating false', () => {
    const { result } = renderHook(() => usePreviewGeneration());
    expect(result.current.isAnyGenerating).toBe(false);
  });

  it('exposes triggerPreview function', () => {
    const { result } = renderHook(() => usePreviewGeneration());
    expect(typeof result.current.triggerPreview).toBe('function');
  });

  it('exposes getPreviewStatus function', () => {
    const { result } = renderHook(() => usePreviewGeneration());
    expect(typeof result.current.getPreviewStatus).toBe('function');
  });

  it('returns idle status for unknown recommendationId', () => {
    const { result } = renderHook(() => usePreviewGeneration());
    const status = result.current.getPreviewStatus('unknown-id');
    expect(status.status).toBe('idle');
  });

  describe('triggerPreview - state transitions', () => {
    it('calls startPreview when triggerPreview is invoked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'generating', estimatedSeconds: 45 }),
      });

      const { result } = renderHook(() => usePreviewGeneration());

      await act(async () => {
        await result.current.triggerPreview('rec-1', 'Corte Degradê');
      });

      expect(mockStartPreview).toHaveBeenCalledWith('rec-1');
    });

    it('calls POST /api/preview/generate with correct body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'generating', estimatedSeconds: 45 }),
      });

      const { result } = renderHook(() => usePreviewGeneration());

      await act(async () => {
        await result.current.triggerPreview('rec-1', 'Corte Degradê');
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/preview/generate',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('rec-1'),
        })
      );
    });

    it('handles mock mode when NEXT_PUBLIC_PREVIEW_MOCK is set', async () => {
      const originalEnv = process.env.NEXT_PUBLIC_PREVIEW_MOCK;
      process.env.NEXT_PUBLIC_PREVIEW_MOCK = 'true';

      const { result } = renderHook(() => usePreviewGeneration());

      await act(async () => {
        result.current.triggerPreview('rec-mock', 'Style Name');
      });

      expect(mockStartPreview).toHaveBeenCalledWith('rec-mock');

      process.env.NEXT_PUBLIC_PREVIEW_MOCK = originalEnv;
    });

    it('does not trigger preview if another is already generating', async () => {
      // Set up a generating state
      mockPreviewsMap.set('rec-1', { status: 'generating', startedAt: new Date().toISOString() });

      const { result } = renderHook(() => usePreviewGeneration());

      await act(async () => {
        await result.current.triggerPreview('rec-2', 'Style 2');
      });

      // Should NOT call startPreview since rec-1 is already generating
      expect(mockStartPreview).not.toHaveBeenCalled();
    });

    it('updates to failed state when POST /api/preview/generate fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      });

      const { result } = renderHook(() => usePreviewGeneration());

      await act(async () => {
        await result.current.triggerPreview('rec-fail', 'Style Fail');
      });

      expect(mockUpdatePreviewStatus).toHaveBeenCalledWith('rec-fail', expect.objectContaining({
        status: 'failed',
      }));
    });
  });

  describe('polling logic', () => {
    it('polls GET /api/preview/:id/status every 5 seconds', async () => {
      // First call: start generation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'generating', estimatedSeconds: 45 }),
      });
      // Second call: still generating (at 5s poll)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'generating' }),
      });
      // Third call: ready (at 10s poll)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ready', previewUrl: 'https://example.com/preview.jpg' }),
      });

      const { result } = renderHook(() => usePreviewGeneration());

      await act(async () => {
        await result.current.triggerPreview('rec-poll', 'Style Poll');
      });

      // Advance 5 seconds for first poll and flush promises
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
      await act(async () => { await Promise.resolve(); });

      // Advance another 5 seconds for second poll and flush promises
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
      await act(async () => { await Promise.resolve(); });
      await act(async () => { await Promise.resolve(); });

      expect(mockSetPreviewUrl).toHaveBeenCalledWith(
        'rec-poll',
        'https://example.com/preview.jpg'
      );
    }, 15000);

    it('stops polling when status is ready', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'generating', estimatedSeconds: 10 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'ready', previewUrl: 'https://example.com/img.jpg' }),
        });

      const { result } = renderHook(() => usePreviewGeneration());

      await act(async () => {
        await result.current.triggerPreview('rec-ready', 'Style Ready');
      });

      await act(async () => {
        vi.advanceTimersByTime(5000);
        await Promise.resolve();
      });

      const fetchCallsAfterReady = mockFetch.mock.calls.length;

      await act(async () => {
        vi.advanceTimersByTime(10000);
        await Promise.resolve();
      });

      // No more fetch calls after ready
      expect(mockFetch.mock.calls.length).toBe(fetchCallsAfterReady);
    });

    it('stops polling when status is failed', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'generating', estimatedSeconds: 10 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'failed' }),
        });

      const { result } = renderHook(() => usePreviewGeneration());

      await act(async () => {
        await result.current.triggerPreview('rec-fail-poll', 'Style Fail');
      });

      await act(async () => {
        vi.advanceTimersByTime(5000);
        await Promise.resolve();
      });

      const fetchCountAfterFailed = mockFetch.mock.calls.length;

      await act(async () => {
        vi.advanceTimersByTime(10000);
        await Promise.resolve();
      });

      expect(mockFetch.mock.calls.length).toBe(fetchCountAfterFailed);
    });
  });

  describe('90-second timeout', () => {
    it('marks as failed after 90 seconds with no resolution', async () => {
      // Start generation
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'generating' }),
      });

      const { result } = renderHook(() => usePreviewGeneration());

      await act(async () => {
        await result.current.triggerPreview('rec-timeout', 'Style Timeout');
      });

      // Advance 90 seconds (timeout fires)
      await act(async () => {
        vi.advanceTimersByTime(90000);
      });
      await act(async () => { await Promise.resolve(); });

      // AC8: timeout shows "Visualizacao indisponivel" → status must be 'unavailable', not 'failed'
      expect(mockUpdatePreviewStatus).toHaveBeenCalledWith(
        'rec-timeout',
        expect.objectContaining({ status: 'unavailable' })
      );
    }, 15000);
  });

  describe('isAnyGenerating flag', () => {
    it('returns true when any preview has generating status', () => {
      mockPreviewsMap.set('rec-gen', { status: 'generating', startedAt: new Date().toISOString() });

      const { result } = renderHook(() => usePreviewGeneration());
      expect(result.current.isAnyGenerating).toBe(true);
    });

    it('returns false when all previews are in terminal states', () => {
      mockPreviewsMap.set('rec-ready', { status: 'ready', previewUrl: 'http://example.com/img.jpg' });
      mockPreviewsMap.set('rec-idle', { status: 'idle' });

      const { result } = renderHook(() => usePreviewGeneration());
      expect(result.current.isAnyGenerating).toBe(false);
    });
  });

  describe('getPreviewStatus', () => {
    it('returns status from previews map', () => {
      mockPreviewsMap.set('rec-known', { status: 'ready', previewUrl: 'http://example.com/img.jpg' });

      const { result } = renderHook(() => usePreviewGeneration());
      const status = result.current.getPreviewStatus('rec-known');
      expect(status.status).toBe('ready');
      expect(status.previewUrl).toBe('http://example.com/img.jpg');
    });
  });
});
