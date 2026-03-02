/**
 * Tests for useShareCard hook (Story 9-3: Native Share Integration)
 * Tests the blob-based share hook that accepts a pre-generated shareImageBlob.
 *
 * Covers AC: 1, 2, 3, 6, 8, 9
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock sonner toast
const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
vi.mock('sonner', () => ({ toast: mockToast }));

// Mock analytics
const mockTrackShareEvent = vi.fn();
vi.mock('@/lib/utils/analytics', () => ({
  trackShareEvent: mockTrackShareEvent,
}));

// Save original createElement before any spy
const originalCreateElement = document.createElement.bind(document);

// Helper to create a mock Blob
function makeBlob(): Blob {
  return new Blob(['fake-image-data'], { type: 'image/png' });
}

// Helper defaults
const defaultParams = {
  consultationId: 'cons-123',
  shareFormat: 'story' as const,
  shareImageBlob: null as Blob | null,
};

describe('useShareCard (native share) - initial state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns isSharing=false initially', async () => {
    const { useNativeShare } = await import('@/hooks/useNativeShare');
    const { result } = renderHook(() => useNativeShare(defaultParams));
    expect(result.current.isSharing).toBe(false);
  });

  it('returns share function', async () => {
    const { useNativeShare } = await import('@/hooks/useNativeShare');
    const { result } = renderHook(() => useNativeShare(defaultParams));
    expect(typeof result.current.share).toBe('function');
  });

  it('returns canShareFiles boolean', async () => {
    const { useNativeShare } = await import('@/hooks/useNativeShare');
    const { result } = renderHook(() => useNativeShare(defaultParams));
    expect(typeof result.current.canShareFiles).toBe('boolean');
  });

  it('returns canShareBasic boolean', async () => {
    const { useNativeShare } = await import('@/hooks/useNativeShare');
    const { result } = renderHook(() => useNativeShare(defaultParams));
    expect(typeof result.current.canShareBasic).toBe('boolean');
  });
});

describe('useNativeShare - navigator.share with files (AC: 1, 3, 6)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('calls navigator.share with files when canShare({files}) returns true (AC: 1, 3, 6)', async () => {
    const { useNativeShare } = await import('@/hooks/useNativeShare');

    const mockShare = vi.fn().mockResolvedValue(undefined);
    const mockCanShare = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'share', { value: mockShare, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: mockCanShare, configurable: true });

    const blob = makeBlob();
    const { result } = renderHook(() =>
      useNativeShare({ ...defaultParams, shareImageBlob: blob })
    );

    await act(async () => {
      await result.current.share();
    });

    expect(mockShare).toHaveBeenCalledTimes(1);
    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({
        files: expect.any(Array),
        url: expect.stringContaining('mynewstyle.com'),
        title: expect.any(String),
        text: expect.any(String),
      })
    );
    // Verify the file in the payload is a File object
    const callArg = mockShare.mock.calls[0][0];
    expect(callArg.files[0]).toBeInstanceOf(File);
    expect(callArg.files[0].type).toBe('image/png');
  });

  it('uses navigator.canShare({files}) before attempting file share (AC: 6)', async () => {
    const { useNativeShare } = await import('@/hooks/useNativeShare');

    const mockShare = vi.fn().mockResolvedValue(undefined);
    const mockCanShare = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'share', { value: mockShare, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: mockCanShare, configurable: true });

    const blob = makeBlob();
    const { result } = renderHook(() =>
      useNativeShare({ ...defaultParams, shareImageBlob: blob })
    );

    await act(async () => {
      await result.current.share();
    });

    // canShare must be called with files to validate
    expect(mockCanShare).toHaveBeenCalledWith(
      expect.objectContaining({ files: expect.any(Array) })
    );
  });

  it('canShareFiles=true when navigator.canShare({files}) returns true', async () => {
    const { useNativeShare } = await import('@/hooks/useNativeShare');

    const blob = makeBlob();
    const mockFile = new File([blob], 'test.png', { type: 'image/png' });
    const mockCanShare = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'share', { value: vi.fn(), configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: mockCanShare, configurable: true });

    const { result } = renderHook(() =>
      useNativeShare({ ...defaultParams, shareImageBlob: blob })
    );

    // canShareFiles reflects navigator.canShare({ files }) with a test file
    expect(result.current.canShareFiles).toBe(true);
    expect(mockCanShare).toHaveBeenCalled();
  });

  it('canShareFiles=false when navigator.canShare is not available', async () => {
    const { useNativeShare } = await import('@/hooks/useNativeShare');

    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });

    const blob = makeBlob();
    const { result } = renderHook(() =>
      useNativeShare({ ...defaultParams, shareImageBlob: blob })
    );

    expect(result.current.canShareFiles).toBe(false);
  });
});

describe('useNativeShare - URL-only share fallback (AC: 2)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('falls back to URL-only share when file sharing unsupported but navigator.share exists (AC: 2)', async () => {
    const { useNativeShare } = await import('@/hooks/useNativeShare');

    const mockShare = vi.fn().mockResolvedValue(undefined);
    // canShare returns false for files but navigator.share exists
    const mockCanShare = vi.fn().mockReturnValue(false);
    Object.defineProperty(navigator, 'share', { value: mockShare, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: mockCanShare, configurable: true });

    const blob = makeBlob();
    const { result } = renderHook(() =>
      useNativeShare({ ...defaultParams, shareImageBlob: blob })
    );

    await act(async () => {
      await result.current.share();
    });

    // Should share URL-only (no files)
    expect(mockShare).toHaveBeenCalledTimes(1);
    const callArg = mockShare.mock.calls[0][0];
    expect(callArg.files).toBeUndefined();
    expect(callArg.url).toContain('mynewstyle.com');
  });

  it('canShareBasic=true when navigator.share exists', async () => {
    const { useNativeShare } = await import('@/hooks/useNativeShare');

    Object.defineProperty(navigator, 'share', { value: vi.fn(), configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });

    const { result } = renderHook(() => useNativeShare(defaultParams));
    expect(result.current.canShareBasic).toBe(true);
  });

  it('canShareBasic=false when navigator.share is absent', async () => {
    const { useNativeShare } = await import('@/hooks/useNativeShare');

    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });

    const { result } = renderHook(() => useNativeShare(defaultParams));
    expect(result.current.canShareBasic).toBe(false);
  });
});

describe('useNativeShare - desktop fallback (AC: 2)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('triggers download + clipboard copy when no navigator.share (desktop fallback)', async () => {
    const { useNativeShare } = await import('@/hooks/useNativeShare');

    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });

    const mockClipboard = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockClipboard },
      configurable: true,
    });

    const mockLink = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') return mockLink as unknown as HTMLAnchorElement;
      return originalCreateElement(tagName);
    });

    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn().mockReturnValue('blob:fake-url'),
      configurable: true,
    });

    const blob = makeBlob();
    const { result } = renderHook(() =>
      useNativeShare({ ...defaultParams, shareImageBlob: blob })
    );

    await act(async () => {
      await result.current.share();
    });

    // Download should be triggered
    expect(mockLink.download).toBe('mynewstyle-share-story.png');
    expect(mockLink.click).toHaveBeenCalledTimes(1);
    // Clipboard copy should be called
    expect(mockClipboard).toHaveBeenCalledWith(expect.stringContaining('mynewstyle.com'));
  });

  it('downloads square format with correct filename', async () => {
    const { useNativeShare } = await import('@/hooks/useNativeShare');

    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });

    const mockClipboard = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockClipboard },
      configurable: true,
    });

    const mockLink = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') return mockLink as unknown as HTMLAnchorElement;
      return originalCreateElement(tagName);
    });

    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn().mockReturnValue('blob:fake-url'),
      configurable: true,
    });

    const blob = makeBlob();
    const { result } = renderHook(() =>
      useNativeShare({ ...defaultParams, shareFormat: 'square', shareImageBlob: blob })
    );

    await act(async () => {
      await result.current.share();
    });

    expect(mockLink.download).toBe('mynewstyle-share-card.png');
    expect(mockLink.click).toHaveBeenCalledTimes(1);
  });
});

describe('useNativeShare - error handling (AC: 8, 9)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('AbortError is silently caught — no toast shown (AC: 8)', async () => {
    const { useNativeShare } = await import('@/hooks/useNativeShare');

    const abortError = new DOMException('User aborted', 'AbortError');
    const mockShare = vi.fn().mockRejectedValue(abortError);
    const mockCanShare = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'share', { value: mockShare, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: mockCanShare, configurable: true });

    const blob = makeBlob();
    const { result } = renderHook(() =>
      useNativeShare({ ...defaultParams, shareImageBlob: blob })
    );

    await act(async () => {
      await result.current.share();
    });

    // No error toast on user abort
    expect(mockToast.error).not.toHaveBeenCalled();
    expect(result.current.isSharing).toBe(false);
  });

  it('generic share errors show Portuguese error toast (AC: 9)', async () => {
    const { useNativeShare } = await import('@/hooks/useNativeShare');

    const genericError = new Error('Network error');
    const mockShare = vi.fn().mockRejectedValue(genericError);
    const mockCanShare = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'share', { value: mockShare, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: mockCanShare, configurable: true });

    const blob = makeBlob();
    const { result } = renderHook(() =>
      useNativeShare({ ...defaultParams, shareImageBlob: blob })
    );

    await act(async () => {
      await result.current.share();
    });

    expect(mockToast.error).toHaveBeenCalledWith(
      expect.stringMatching(/Não foi possível partilhar|partilhar/i)
    );
  });

  it('clipboard failure shows Portuguese toast (AC: 9)', async () => {
    const { useNativeShare } = await import('@/hooks/useNativeShare');

    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });

    // Clipboard fails
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('Clipboard denied')) },
      configurable: true,
    });

    const mockLink = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') return mockLink as unknown as HTMLAnchorElement;
      return originalCreateElement(tagName);
    });

    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn().mockReturnValue('blob:fake-url'),
      configurable: true,
    });

    const blob = makeBlob();
    const { result } = renderHook(() =>
      useNativeShare({ ...defaultParams, shareImageBlob: blob })
    );

    await act(async () => {
      await result.current.share();
    });

    // Download should still trigger, clipboard failure should show toast
    expect(mockLink.click).toHaveBeenCalledTimes(1);
    expect(mockToast.error).toHaveBeenCalledWith(
      expect.stringMatching(/copiar o link|Tente novamente/i)
    );
  });

  it('isSharing resets to false even after error', async () => {
    const { useNativeShare } = await import('@/hooks/useNativeShare');

    const mockShare = vi.fn().mockRejectedValue(new Error('fail'));
    const mockCanShare = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'share', { value: mockShare, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: mockCanShare, configurable: true });

    const blob = makeBlob();
    const { result } = renderHook(() =>
      useNativeShare({ ...defaultParams, shareImageBlob: blob })
    );

    await act(async () => {
      await result.current.share();
    });

    expect(result.current.isSharing).toBe(false);
  });
});

describe('useNativeShare - analytics tracking (AC: 4)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('tracks share_generated event after successful native share', async () => {
    const { useNativeShare } = await import('@/hooks/useNativeShare');

    const mockShare = vi.fn().mockResolvedValue(undefined);
    const mockCanShare = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'share', { value: mockShare, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: mockCanShare, configurable: true });

    const blob = makeBlob();
    const { result } = renderHook(() =>
      useNativeShare({ ...defaultParams, shareImageBlob: blob })
    );

    await act(async () => {
      await result.current.share();
    });

    expect(mockTrackShareEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'share_generated',
        format: 'story',
        method: 'native_share',
        success: true,
      })
    );
  });

  it('tracks share_generated event for desktop download fallback', async () => {
    const { useNativeShare } = await import('@/hooks/useNativeShare');

    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });

    const mockClipboard = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockClipboard },
      configurable: true,
    });

    const mockLink = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') return mockLink as unknown as HTMLAnchorElement;
      return originalCreateElement(tagName);
    });

    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn().mockReturnValue('blob:fake-url'),
      configurable: true,
    });

    const blob = makeBlob();
    const { result } = renderHook(() =>
      useNativeShare({ ...defaultParams, shareImageBlob: blob })
    );

    await act(async () => {
      await result.current.share();
    });

    expect(mockTrackShareEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'share_generated',
        method: 'download',
        success: true,
      })
    );
  });
});

describe('useNativeShare - NotAllowedError handling (AC: task 5.2)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('NotAllowedError on file share falls back to clipboard copy without error toast', async () => {
    const { useNativeShare } = await import('@/hooks/useNativeShare');

    const notAllowedError = new DOMException('Not allowed', 'NotAllowedError');
    const mockShare = vi.fn().mockRejectedValue(notAllowedError);
    const mockCanShare = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'share', { value: mockShare, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: mockCanShare, configurable: true });

    const mockClipboard = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockClipboard },
      configurable: true,
    });

    const mockLink = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') return mockLink as unknown as HTMLAnchorElement;
      return originalCreateElement(tagName);
    });

    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn().mockReturnValue('blob:fake-url'),
      configurable: true,
    });

    const blob = makeBlob();
    const { result } = renderHook(() =>
      useNativeShare({ ...defaultParams, shareImageBlob: blob })
    );

    await act(async () => {
      await result.current.share();
    });

    // No generic error toast on NotAllowedError — falls back silently to clipboard
    expect(mockToast.error).not.toHaveBeenCalledWith(
      expect.stringMatching(/Não foi possível partilhar/i)
    );
    // Clipboard copy should be triggered as fallback
    expect(mockClipboard).toHaveBeenCalledWith(expect.stringContaining('mynewstyle.com'));
    expect(result.current.isSharing).toBe(false);
  });

  it('NotAllowedError on URL-only share falls back to clipboard copy', async () => {
    const { useNativeShare } = await import('@/hooks/useNativeShare');

    const notAllowedError = new DOMException('Not allowed', 'NotAllowedError');
    const mockShare = vi.fn().mockRejectedValue(notAllowedError);
    // canShare returns false so we skip file share, go straight to URL-only
    const mockCanShare = vi.fn().mockReturnValue(false);
    Object.defineProperty(navigator, 'share', { value: mockShare, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: mockCanShare, configurable: true });

    const mockClipboard = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockClipboard },
      configurable: true,
    });

    const mockLink = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') return mockLink as unknown as HTMLAnchorElement;
      return originalCreateElement(tagName);
    });

    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn().mockReturnValue('blob:fake-url'),
      configurable: true,
    });

    const blob = makeBlob();
    const { result } = renderHook(() =>
      useNativeShare({ ...defaultParams, shareImageBlob: blob })
    );

    await act(async () => {
      await result.current.share();
    });

    // Should fall back to clipboard
    expect(mockClipboard).toHaveBeenCalledWith(expect.stringContaining('mynewstyle.com'));
    expect(result.current.isSharing).toBe(false);
  });
});

describe('useNativeShare - blob null handling (AC: 5)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('does not attempt share when shareImageBlob is null', async () => {
    const { useNativeShare } = await import('@/hooks/useNativeShare');

    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: mockShare, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: vi.fn().mockReturnValue(true), configurable: true });

    const { result } = renderHook(() =>
      useNativeShare({ ...defaultParams, shareImageBlob: null })
    );

    await act(async () => {
      await result.current.share();
    });

    // Should still be able to share URL-only when blob is null
    expect(mockShare).toHaveBeenCalledTimes(1);
    const callArg = mockShare.mock.calls[0][0];
    // No files in payload when blob is null
    expect(callArg.files).toBeUndefined();
  });
});
