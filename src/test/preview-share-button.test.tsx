/**
 * Tests for PreviewShareButton component (Story 9-4: Standalone Preview Share)
 * Covers AC: 1, 4, 5, 6, 7, 8
 *
 * Test plan:
 * 5.2 - button renders only when previewStatus='ready' and previewUrl is truthy
 * 5.3 - button is hidden when previewStatus='idle' or 'unavailable'
 * 5.4 - button is disabled when previewStatus='generating'
 * 5.5 - click triggers navigator.share when available with correct File object
 * 5.6 - click falls back to download when navigator.share is unavailable
 * 5.7 - click falls back to download when navigator.share rejects (non-AbortError)
 * 5.8 - analytics event emitted on successful share
 * 5.9 - analytics event emitted on successful download
 * 5.10 - error toast shown on share/download failure
 * 5.11 - accessibility — button has correct aria-label
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock sonner toast
const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
vi.mock('sonner', () => ({ toast: mockToast }));

// Mock analytics
const mockTrackEvent = vi.fn();
vi.mock('@/lib/utils/analytics', () => ({
  trackShareEvent: mockTrackEvent,
  trackEvent: mockTrackEvent,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Share2: ({ 'aria-hidden': ariaHidden, className }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-share2" aria-hidden={ariaHidden} className={className} />
  ),
  Download: ({ 'aria-hidden': ariaHidden, className }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-download" aria-hidden={ariaHidden} className={className} />
  ),
}));

// Global fetch mock
const mockFetch = vi.fn();
global.fetch = mockFetch;

// URL.createObjectURL / revokeObjectURL mocks
const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url');
const mockRevokeObjectURL = vi.fn();
Object.defineProperty(URL, 'createObjectURL', { value: mockCreateObjectURL, writable: true });
Object.defineProperty(URL, 'revokeObjectURL', { value: mockRevokeObjectURL, writable: true });

// navigator.share / canShare mocks
const mockShare = vi.fn();
const mockCanShare = vi.fn();

const PREVIEW_URL = 'https://supabase.example.com/storage/v1/object/sign/previews/test.jpg';
const STYLE_NAME = 'Textured Crop';
const RECOMMENDATION_RANK = 1;

function renderButton(props: Partial<{
  previewUrl: string;
  previewStatus: 'idle' | 'generating' | 'ready' | 'failed' | 'unavailable';
  styleName: string;
  recommendationRank: number;
}> = {}) {
  const defaults = {
    previewUrl: PREVIEW_URL,
    previewStatus: 'ready' as const,
    styleName: STYLE_NAME,
    recommendationRank: RECOMMENDATION_RANK,
  };
  const merged = { ...defaults, ...props };
  return render(
    React.createElement(
      // dynamic import in test body; use synchronous require here
      // We use a wrapper to allow async import
      React.lazy(() => import('@/components/consultation/PreviewShareButton').then(m => ({ default: m.PreviewShareButton }))),
      merged
    )
  );
}

describe('PreviewShareButton - rendering (AC: 4, 6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      blob: vi.fn().mockResolvedValue(new Blob(['img'], { type: 'image/jpeg' })),
    });
  });

  it('5.2 renders button when previewStatus=ready and previewUrl is truthy', async () => {
    const { PreviewShareButton } = await import('@/components/consultation/PreviewShareButton');
    render(
      <PreviewShareButton
        previewUrl={PREVIEW_URL}
        previewStatus="ready"
        styleName={STYLE_NAME}
        recommendationRank={RECOMMENDATION_RANK}
      />
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('5.2 does not render button when previewUrl is empty string', async () => {
    const { PreviewShareButton } = await import('@/components/consultation/PreviewShareButton');
    render(
      <PreviewShareButton
        previewUrl=""
        previewStatus="ready"
        styleName={STYLE_NAME}
        recommendationRank={RECOMMENDATION_RANK}
      />
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('5.3 does not render button when previewStatus=idle', async () => {
    const { PreviewShareButton } = await import('@/components/consultation/PreviewShareButton');
    render(
      <PreviewShareButton
        previewUrl={PREVIEW_URL}
        previewStatus="idle"
        styleName={STYLE_NAME}
        recommendationRank={RECOMMENDATION_RANK}
      />
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('5.3 does not render button when previewStatus=unavailable', async () => {
    const { PreviewShareButton } = await import('@/components/consultation/PreviewShareButton');
    render(
      <PreviewShareButton
        previewUrl={PREVIEW_URL}
        previewStatus="unavailable"
        styleName={STYLE_NAME}
        recommendationRank={RECOMMENDATION_RANK}
      />
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('5.4 renders disabled button when previewStatus=generating', async () => {
    const { PreviewShareButton } = await import('@/components/consultation/PreviewShareButton');
    render(
      <PreviewShareButton
        previewUrl={PREVIEW_URL}
        previewStatus="generating"
        styleName={STYLE_NAME}
        recommendationRank={RECOMMENDATION_RANK}
      />
    );
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });
});

describe('PreviewShareButton - Web Share API (AC: 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      blob: vi.fn().mockResolvedValue(new Blob(['img'], { type: 'image/jpeg' })),
    });
    mockShare.mockResolvedValue(undefined);
    mockCanShare.mockReturnValue(true);
    Object.defineProperty(navigator, 'share', { value: mockShare, writable: true, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: mockCanShare, writable: true, configurable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('5.5 calls navigator.share with a File object when available and canShare returns true', async () => {
    const { PreviewShareButton } = await import('@/components/consultation/PreviewShareButton');
    render(
      <PreviewShareButton
        previewUrl={PREVIEW_URL}
        previewStatus="ready"
        styleName={STYLE_NAME}
        recommendationRank={RECOMMENDATION_RANK}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockShare).toHaveBeenCalledTimes(1);
    });

    const shareArgs = mockShare.mock.calls[0][0] as { files: File[] };
    expect(shareArgs).toHaveProperty('files');
    expect(shareArgs.files).toHaveLength(1);
    expect(shareArgs.files[0]).toBeInstanceOf(File);
    expect(shareArgs.files[0].type).toBe('image/jpeg');
  });
});

describe('PreviewShareButton - Download fallback (AC: 5)', () => {
  let mockAnchor: { href: string; download: string; click: ReturnType<typeof vi.fn>; style: { display: string } };
  let originalCreateElement: typeof document.createElement;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      blob: vi.fn().mockResolvedValue(new Blob(['img'], { type: 'image/jpeg' })),
    });

    mockAnchor = { href: '', download: '', click: vi.fn(), style: { display: '' } };

    // Store original before mocking — render must happen BEFORE spying on createElement
    originalCreateElement = document.createElement.bind(document);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore original createElement
    Object.defineProperty(document, 'createElement', {
      value: originalCreateElement,
      writable: true,
      configurable: true,
    });
  });

  it('5.6 falls back to download when navigator.share is not available', async () => {
    // Remove navigator.share
    Object.defineProperty(navigator, 'share', { value: undefined, writable: true, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: undefined, writable: true, configurable: true });

    const { PreviewShareButton } = await import('@/components/consultation/PreviewShareButton');
    const { unmount } = render(
      <PreviewShareButton
        previewUrl={PREVIEW_URL}
        previewStatus="ready"
        styleName={STYLE_NAME}
        recommendationRank={RECOMMENDATION_RANK}
      />
    );

    // Install anchor mock AFTER render so it doesn't break container creation
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') return mockAnchor as unknown as HTMLAnchorElement;
      return originalCreateElement(tag);
    });
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as unknown as Node);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as unknown as Node);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockAnchor.click).toHaveBeenCalledTimes(1);
    });

    expect(mockAnchor.href).toBe('blob:mock-url');
    expect(mockAnchor.download).toMatch(/mynewstyle-preview/);

    unmount();
  });

  it('5.7 falls back to download when navigator.share rejects with non-AbortError', async () => {
    mockShare.mockRejectedValue(new Error('Share failed'));
    mockCanShare.mockReturnValue(true);
    Object.defineProperty(navigator, 'share', { value: mockShare, writable: true, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: mockCanShare, writable: true, configurable: true });

    const { PreviewShareButton } = await import('@/components/consultation/PreviewShareButton');
    const { unmount } = render(
      <PreviewShareButton
        previewUrl={PREVIEW_URL}
        previewStatus="ready"
        styleName={STYLE_NAME}
        recommendationRank={RECOMMENDATION_RANK}
      />
    );

    // Install anchor mock AFTER render
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') return mockAnchor as unknown as HTMLAnchorElement;
      return originalCreateElement(tag);
    });
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as unknown as Node);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as unknown as Node);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockAnchor.click).toHaveBeenCalledTimes(1);
    });

    // Verify fetch was called only once (reuses blob, no redundant network request)
    expect(mockFetch).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('5.7b AbortError from navigator.share: no download triggered, no analytics emitted', async () => {
    const abortError = new Error('User cancelled');
    abortError.name = 'AbortError';
    mockShare.mockRejectedValue(abortError);
    mockCanShare.mockReturnValue(true);
    Object.defineProperty(navigator, 'share', { value: mockShare, writable: true, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: mockCanShare, writable: true, configurable: true });

    const { PreviewShareButton } = await import('@/components/consultation/PreviewShareButton');
    render(
      <PreviewShareButton
        previewUrl={PREVIEW_URL}
        previewStatus="ready"
        styleName={STYLE_NAME}
        recommendationRank={RECOMMENDATION_RANK}
      />
    );

    // Install anchor mock AFTER render to detect any download attempt
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') return mockAnchor as unknown as HTMLAnchorElement;
      return originalCreateElement(tag);
    });

    fireEvent.click(screen.getByRole('button'));

    // Wait for share to be called
    await waitFor(() => {
      expect(mockShare).toHaveBeenCalledTimes(1);
    });

    // No download should be triggered on AbortError
    expect(mockAnchor.click).not.toHaveBeenCalled();

    // No analytics should be emitted on AbortError (user cancelled intentionally)
    expect(mockTrackEvent).not.toHaveBeenCalled();

    // No error toast should be shown
    expect(mockToast.error).not.toHaveBeenCalled();
  });
});

describe('PreviewShareButton - Analytics (AC: 7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      blob: vi.fn().mockResolvedValue(new Blob(['img'], { type: 'image/jpeg' })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('5.8 emits analytics event with method=share on successful navigator.share', async () => {
    const shareSuccess = vi.fn().mockResolvedValue(undefined);
    const canShareSuccess = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'share', { value: shareSuccess, writable: true, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: canShareSuccess, writable: true, configurable: true });

    const { PreviewShareButton } = await import('@/components/consultation/PreviewShareButton');
    render(
      <PreviewShareButton
        previewUrl={PREVIEW_URL}
        previewStatus="ready"
        styleName={STYLE_NAME}
        recommendationRank={RECOMMENDATION_RANK}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    const eventArg = mockTrackEvent.mock.calls[0][0];
    expect(eventArg).toMatchObject({
      type: 'preview_shared',
      method: 'share',
      styleName: STYLE_NAME,
      recommendationRank: RECOMMENDATION_RANK,
    });
  });

  it('5.9 emits analytics event with method=download on download fallback', async () => {
    Object.defineProperty(navigator, 'share', { value: undefined, writable: true, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: undefined, writable: true, configurable: true });

    const mockAnchor2 = { href: '', download: '', click: vi.fn(), style: { display: '' } };
    const originalCreateElement2 = document.createElement.bind(document);

    const { PreviewShareButton } = await import('@/components/consultation/PreviewShareButton');
    const { unmount } = render(
      <PreviewShareButton
        previewUrl={PREVIEW_URL}
        previewStatus="ready"
        styleName={STYLE_NAME}
        recommendationRank={RECOMMENDATION_RANK}
      />
    );

    // Install anchor mock AFTER render
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') return mockAnchor2 as unknown as HTMLAnchorElement;
      return originalCreateElement2(tag);
    });
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor2 as unknown as Node);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor2 as unknown as Node);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    const eventArg = mockTrackEvent.mock.calls[0][0];
    expect(eventArg).toMatchObject({
      type: 'preview_shared',
      method: 'download',
      styleName: STYLE_NAME,
      recommendationRank: RECOMMENDATION_RANK,
    });

    unmount();
    vi.restoreAllMocks();
  });
});

describe('PreviewShareButton - Error handling (AC: 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('5.10 shows error toast when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    Object.defineProperty(navigator, 'share', { value: undefined, writable: true, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: undefined, writable: true, configurable: true });

    const { PreviewShareButton } = await import('@/components/consultation/PreviewShareButton');
    render(
      <PreviewShareButton
        previewUrl={PREVIEW_URL}
        previewStatus="ready"
        styleName={STYLE_NAME}
        recommendationRank={RECOMMENDATION_RANK}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledTimes(1);
    });
  });
});

describe('PreviewShareButton - Accessibility (AC: 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('5.11 button has correct aria-label when status=ready', async () => {
    const { PreviewShareButton } = await import('@/components/consultation/PreviewShareButton');
    render(
      <PreviewShareButton
        previewUrl={PREVIEW_URL}
        previewStatus="ready"
        styleName={STYLE_NAME}
        recommendationRank={RECOMMENDATION_RANK}
      />
    );
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label');
    expect(button.getAttribute('aria-label')).toBeTruthy();
  });

  it('5.11 button has correct aria-label when status=generating (disabled)', async () => {
    const { PreviewShareButton } = await import('@/components/consultation/PreviewShareButton');
    render(
      <PreviewShareButton
        previewUrl={PREVIEW_URL}
        previewStatus="generating"
        styleName={STYLE_NAME}
        recommendationRank={RECOMMENDATION_RANK}
      />
    );
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label');
  });
});

describe('PreviewShareButton - file naming (AC: 8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      blob: vi.fn().mockResolvedValue(new Blob(['img'], { type: 'image/jpeg' })),
    });
    Object.defineProperty(navigator, 'share', { value: undefined, writable: true, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: undefined, writable: true, configurable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('download filename includes slugified style name', async () => {
    const mockAnchor3 = { href: '', download: '', click: vi.fn(), style: { display: '' } };
    const originalCreateElement3 = document.createElement.bind(document);

    const { PreviewShareButton } = await import('@/components/consultation/PreviewShareButton');
    const { unmount } = render(
      <PreviewShareButton
        previewUrl={PREVIEW_URL}
        previewStatus="ready"
        styleName="Textured Crop"
        recommendationRank={1}
      />
    );

    // Install anchor mock AFTER render
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') return mockAnchor3 as unknown as HTMLAnchorElement;
      return originalCreateElement3(tag);
    });
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor3 as unknown as Node);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor3 as unknown as Node);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockAnchor3.click).toHaveBeenCalled();
    });

    // File should be named mynewstyle-preview-textured-crop.jpg
    expect(mockAnchor3.download).toBe('mynewstyle-preview-textured-crop.jpg');

    unmount();
  });
});
