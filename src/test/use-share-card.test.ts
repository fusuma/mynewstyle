import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock html-to-image
const mockToPng = vi.fn().mockResolvedValue('data:image/png;base64,mockedpng');
vi.mock('html-to-image', () => ({
  toPng: mockToPng,
}));

// Mock sonner toast
const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
vi.mock('sonner', () => ({ toast: mockToast }));

// Mock src/lib/utils/image
const mockToDataUrl = vi.fn().mockImplementation((url: string) => Promise.resolve(url));
vi.mock('@/lib/utils/image', () => ({
  toDataUrl: mockToDataUrl,
}));

// Save original createElement BEFORE any spy — avoids recursive call in mocks
const originalCreateElement = document.createElement.bind(document);

// Common test data
const testFaceAnalysis = {
  faceShape: 'oval' as const,
  confidence: 0.92,
  proportions: { foreheadRatio: 0.85, cheekboneRatio: 0.95, jawRatio: 0.75, faceLength: 1.3 },
  hairAssessment: { type: 'straight', texture: 'fine', density: 'medium', currentStyle: 'short' },
};

const testRecommendation = {
  styleName: 'Textured Crop',
  justification: 'Creates vertical height.',
  matchScore: 93,
  difficultyLevel: 'low' as const,
};

const testHookParams = {
  faceAnalysis: testFaceAnalysis,
  recommendation: testRecommendation,
  photoPreview: 'data:image/jpeg;base64,photo',
  previewUrl: undefined as string | undefined,
  gender: 'male' as const,
};

// Helper: mock download path (no Web Share API)
function setupDownloadPath(mockLink: { href: string; download: string; click: ReturnType<typeof vi.fn> }) {
  Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
  const mockBlob = new Blob(['fake'], { type: 'image/png' });
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    blob: () => Promise.resolve(mockBlob),
  }) as unknown as typeof fetch;
  vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
    if (tagName === 'a') return mockLink as unknown as HTMLAnchorElement;
    return originalCreateElement(tagName);
  });
}

// ---- useShareCard Hook Tests ----

describe('useShareCard - initial state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns isGenerating=false initially', async () => {
    const { useShareCard } = await import('@/hooks/useShareCard');
    const { result } = renderHook(() => useShareCard(testHookParams));
    expect(result.current.isGenerating).toBe(false);
  });

  it('returns generateShareCard function', async () => {
    const { useShareCard } = await import('@/hooks/useShareCard');
    const { result } = renderHook(() => useShareCard(testHookParams));
    expect(typeof result.current.generateShareCard).toBe('function');
  });

  it('returns cardRef', async () => {
    const { useShareCard } = await import('@/hooks/useShareCard');
    const { result } = renderHook(() => useShareCard(testHookParams));
    expect(result.current.cardRef).toBeDefined();
    expect(result.current.cardRef.current).toBeNull();
  });
});

describe('useShareCard - generation with DOM node', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('calls toPng with correct dimensions (540x960, pixelRatio 2)', async () => {
    const { useShareCard } = await import('@/hooks/useShareCard');
    mockToPng.mockResolvedValueOnce('data:image/png;base64,iVBORw0KGgo=');

    const fakeNode = originalCreateElement('div');
    const mockLink = { href: '', download: '', click: vi.fn() };
    setupDownloadPath(mockLink);

    const { result } = renderHook(() => useShareCard(testHookParams));
    (result.current.cardRef as React.MutableRefObject<HTMLDivElement>).current = fakeNode;

    await act(async () => {
      await result.current.generateShareCard('story');
    });

    expect(mockToPng).toHaveBeenCalledWith(
      fakeNode,
      expect.objectContaining({ width: 540, height: 960, pixelRatio: 2 })
    );
  });

  it('emits analytics console.log on success', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { useShareCard } = await import('@/hooks/useShareCard');
    mockToPng.mockResolvedValueOnce('data:image/png;base64,iVBORw0KGgo=');

    const fakeNode = originalCreateElement('div');
    const mockLink = { href: '', download: '', click: vi.fn() };
    setupDownloadPath(mockLink);

    const { result } = renderHook(() => useShareCard(testHookParams));
    (result.current.cardRef as React.MutableRefObject<HTMLDivElement>).current = fakeNode;

    await act(async () => {
      await result.current.generateShareCard('story');
    });

    expect(consoleSpy).toHaveBeenCalledWith('[analytics] share_generated', { format: 'story' });
    consoleSpy.mockRestore();
  });

  it('shows toast error on toPng failure', async () => {
    const { useShareCard } = await import('@/hooks/useShareCard');
    mockToPng.mockRejectedValueOnce(new Error('PNG generation failed'));

    const fakeNode = originalCreateElement('div');

    const { result } = renderHook(() => useShareCard(testHookParams));
    (result.current.cardRef as React.MutableRefObject<HTMLDivElement>).current = fakeNode;

    await act(async () => {
      await result.current.generateShareCard('story');
    });

    expect(mockToast.error).toHaveBeenCalledWith(
      expect.stringMatching(/Nao foi possivel|não foi possível/i)
    );
  });

  it('sets isGenerating=true during generation and false after', async () => {
    const { useShareCard } = await import('@/hooks/useShareCard');

    let resolvePromise!: (value: string) => void;
    mockToPng.mockReturnValueOnce(
      new Promise<string>((resolve) => {
        resolvePromise = resolve;
      })
    );

    const fakeNode = originalCreateElement('div');

    const { result } = renderHook(() => useShareCard(testHookParams));
    (result.current.cardRef as React.MutableRefObject<HTMLDivElement>).current = fakeNode;

    expect(result.current.isGenerating).toBe(false);

    act(() => {
      result.current.generateShareCard('story');
    });

    expect(result.current.isGenerating).toBe(true);

    await act(async () => {
      resolvePromise('data:image/png;base64,iVBORw0KGgo=');
    });

    expect(result.current.isGenerating).toBe(false);
  });
});

describe('useShareCard - Web Share API', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('attempts navigator.share with file on supported browsers', async () => {
    const { useShareCard } = await import('@/hooks/useShareCard');
    mockToPng.mockResolvedValueOnce('data:image/png;base64,iVBORw0KGgo=');

    const mockShare = vi.fn().mockResolvedValue(undefined);
    const mockCanShare = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'share', { value: mockShare, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: mockCanShare, configurable: true });

    // Mock fetch so blob/File creation succeeds
    const mockBlob = new Blob(['fake'], { type: 'image/png' });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    }) as unknown as typeof fetch;

    const fakeNode = originalCreateElement('div');
    const { result } = renderHook(() => useShareCard(testHookParams));
    (result.current.cardRef as React.MutableRefObject<HTMLDivElement>).current = fakeNode;

    await act(async () => {
      await result.current.generateShareCard('story');
    });

    expect(mockShare).toHaveBeenCalledTimes(1);
    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.any(String),
        text: expect.any(String),
        files: expect.any(Array),
      })
    );
  });

  it('falls back to download on unsupported browsers', async () => {
    const { useShareCard } = await import('@/hooks/useShareCard');
    mockToPng.mockResolvedValueOnce('data:image/png;base64,iVBORw0KGgo=');

    const fakeNode = originalCreateElement('div');
    const mockLink = { href: '', download: '', click: vi.fn() };
    setupDownloadPath(mockLink);

    const { result } = renderHook(() => useShareCard(testHookParams));
    (result.current.cardRef as React.MutableRefObject<HTMLDivElement>).current = fakeNode;

    await act(async () => {
      await result.current.generateShareCard('story');
    });

    expect(mockLink.download).toBe('mynewstyle-share-story.png');
    expect(mockLink.click).toHaveBeenCalledTimes(1);
  });

  it('falls back to download on AbortError from navigator.share', async () => {
    const { useShareCard } = await import('@/hooks/useShareCard');
    mockToPng.mockResolvedValueOnce('data:image/png;base64,iVBORw0KGgo=');

    const abortError = new DOMException('User aborted', 'AbortError');
    const mockShare = vi.fn().mockRejectedValue(abortError);
    const mockCanShare = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'share', { value: mockShare, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: mockCanShare, configurable: true });

    // Mock fetch for blob/File creation
    const mockBlob = new Blob(['fake'], { type: 'image/png' });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    }) as unknown as typeof fetch;

    const fakeNode = originalCreateElement('div');
    const mockLink = { href: '', download: '', click: vi.fn() };
    // Override createElement spy for the 'a' element only
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') return mockLink as unknown as HTMLAnchorElement;
      return originalCreateElement(tagName);
    });

    const { result } = renderHook(() => useShareCard(testHookParams));
    (result.current.cardRef as React.MutableRefObject<HTMLDivElement>).current = fakeNode;

    await act(async () => {
      await result.current.generateShareCard('story');
    });

    // Should fall back to download after AbortError
    expect(mockLink.download).toBe('mynewstyle-share-story.png');
    expect(mockLink.click).toHaveBeenCalledTimes(1);
    // Should NOT show error toast on abort
    expect(mockToast.error).not.toHaveBeenCalled();
  });
});
