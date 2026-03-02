import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

// Mock html-to-image
vi.mock('html-to-image', () => ({
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,mockedpng'),
}));

// Mock sonner toast
const mockToast = {
  success: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
};
vi.mock('sonner', () => ({
  toast: mockToast,
}));

// Mock document.createElement to intercept anchor creation for download
const mockClick = vi.fn();
const mockAnchor = {
  download: '',
  href: '',
  click: mockClick,
};
const originalCreateElement = document.createElement.bind(document);
vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
  if (tag === 'a') return mockAnchor as unknown as HTMLElement;
  return originalCreateElement(tag);
});

const mockFaceAnalysis = {
  faceShape: 'oval' as const,
  confidence: 0.92,
  proportions: {
    foreheadRatio: 0.85,
    cheekboneRatio: 0.95,
    jawRatio: 0.75,
    faceLength: 1.3,
  },
  hairAssessment: {
    type: 'straight',
    texture: 'fine',
    density: 'medium',
    currentStyle: 'short',
  },
};

const mockRecommendation = {
  styleName: 'Textured Crop',
  justification: 'Creates vertical height for round faces.',
  matchScore: 93,
  difficultyLevel: 'low' as const,
};

describe('useShareCard - square format state management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns squareCardRef (for square format capture)', async () => {
    const { useShareCard } = await import('@/hooks/useShareCard');
    const { result } = renderHook(() =>
      useShareCard({
        faceAnalysis: mockFaceAnalysis,
        recommendation: mockRecommendation,
        photoPreview: 'data:image/jpeg;base64,photo',
        previewUrl: undefined,
        gender: 'male',
      })
    );
    expect(result.current.squareCardRef).toBeDefined();
    // squareCardRef must be a ref object (has .current property)
    expect(Object.prototype.hasOwnProperty.call(result.current.squareCardRef, 'current')).toBe(true);
  });

  it('toPng is called with pixelRatio:2 and square dimensions (540x540) for square format (AC7)', async () => {
    const { toPng } = await import('html-to-image');
    // Provide a fake DOM node so the hook proceeds past the null-ref guard
    const fakeNode = document.createElement('div');
    // We'll spy on the toPng mock to capture args
    vi.mocked(toPng).mockResolvedValueOnce('data:image/png;base64,done');

    const { useShareCard } = await import('@/hooks/useShareCard');
    const { result } = renderHook(() =>
      useShareCard({
        faceAnalysis: mockFaceAnalysis,
        recommendation: mockRecommendation,
        photoPreview: 'data:image/jpeg;base64,photo',
        previewUrl: undefined,
        gender: 'male',
      })
    );

    // Manually set the squareCardRef to a real DOM node
    Object.defineProperty(result.current.squareCardRef, 'current', {
      value: fakeNode,
      writable: true,
      configurable: true,
    });

    await act(async () => {
      await result.current.generateShareCard('square');
    });

    // toPng must be called with pixelRatio:2 for social media compression resilience (AC7)
    expect(toPng).toHaveBeenCalledWith(
      fakeNode,
      expect.objectContaining({
        pixelRatio: 2,
        width: 540,
        height: 540,
      })
    );
  });

  it('returns isGenerating as false initially', async () => {
    const { useShareCard } = await import('@/hooks/useShareCard');
    const { result } = renderHook(() =>
      useShareCard({
        faceAnalysis: mockFaceAnalysis,
        recommendation: mockRecommendation,
        photoPreview: 'data:image/jpeg;base64,photo',
        previewUrl: undefined,
        gender: 'male',
      })
    );
    expect(result.current.isGenerating).toBe(false);
  });

  it('returns generateShareCard function', async () => {
    const { useShareCard } = await import('@/hooks/useShareCard');
    const { result } = renderHook(() =>
      useShareCard({
        faceAnalysis: mockFaceAnalysis,
        recommendation: mockRecommendation,
        photoPreview: 'data:image/jpeg;base64,photo',
        previewUrl: undefined,
        gender: 'male',
      })
    );
    expect(typeof result.current.generateShareCard).toBe('function');
  });

  it('returns shareCardRef (for backward compat with story format)', async () => {
    const { useShareCard } = await import('@/hooks/useShareCard');
    const { result } = renderHook(() =>
      useShareCard({
        faceAnalysis: mockFaceAnalysis,
        recommendation: mockRecommendation,
        photoPreview: 'data:image/jpeg;base64,photo',
        previewUrl: undefined,
        gender: 'male',
      })
    );
    expect(result.current.cardRef).toBeDefined();
  });

  it('sets isGenerating to false after generateShareCard("square") completes or errors', async () => {
    const { useShareCard } = await import('@/hooks/useShareCard');

    const { result } = renderHook(() =>
      useShareCard({
        faceAnalysis: mockFaceAnalysis,
        recommendation: mockRecommendation,
        photoPreview: 'data:image/jpeg;base64,photo',
        previewUrl: undefined,
        gender: 'male',
      })
    );

    expect(result.current.isGenerating).toBe(false);

    // After calling generateShareCard('square') — will error due to no DOM in test env
    await act(async () => {
      await result.current.generateShareCard('square');
    });

    // isGenerating should be false again (reset in finally block)
    expect(result.current.isGenerating).toBe(false);
  });

  it('shows error toast when data is missing', async () => {
    const { useShareCard } = await import('@/hooks/useShareCard');
    const { result } = renderHook(() =>
      useShareCard({
        faceAnalysis: null,
        recommendation: null,
        photoPreview: null,
        previewUrl: undefined,
        gender: null,
      })
    );

    await act(async () => {
      await result.current.generateShareCard('square');
    });

    expect(mockToast.error).toHaveBeenCalledTimes(1);
  });

  it('shows error toast when toPng fails for square format', async () => {
    const { toPng } = await import('html-to-image');
    vi.mocked(toPng).mockRejectedValueOnce(new Error('PNG generation failed'));

    const { useShareCard } = await import('@/hooks/useShareCard');
    const { result } = renderHook(() =>
      useShareCard({
        faceAnalysis: mockFaceAnalysis,
        recommendation: mockRecommendation,
        photoPreview: 'data:image/jpeg;base64,photo',
        previewUrl: undefined,
        gender: 'male',
      })
    );

    await act(async () => {
      await result.current.generateShareCard('square');
    });

    expect(mockToast.error).toHaveBeenCalledTimes(1);
    expect(result.current.isGenerating).toBe(false);
  });

  it('still supports "story" format (backward compat)', async () => {
    const { useShareCard } = await import('@/hooks/useShareCard');

    const { result } = renderHook(() =>
      useShareCard({
        faceAnalysis: mockFaceAnalysis,
        recommendation: mockRecommendation,
        photoPreview: 'data:image/jpeg;base64,photo',
        previewUrl: undefined,
        gender: 'male',
      })
    );

    // Should not throw calling with 'story'
    await act(async () => {
      await result.current.generateShareCard('story');
    });

    expect(result.current.isGenerating).toBe(false);
  });
});
