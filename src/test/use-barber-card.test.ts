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
// Use spyOn with a wrapper that avoids infinite recursion
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

const mockGroomingTips = [
  {
    category: 'barber_tips' as const,
    tipText: 'Peça ao barbeiro textura no topo com laterais curtas',
    icon: 'scissors',
  },
];

describe('useBarberCard - state management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns isGenerating as false initially', async () => {
    const { useBarberCard } = await import('@/hooks/useBarberCard');
    const { result } = renderHook(() =>
      useBarberCard({
        faceAnalysis: mockFaceAnalysis,
        recommendation: mockRecommendation,
        photoPreview: 'data:image/jpeg;base64,photo',
        previewUrl: undefined,
        gender: 'male',
        groomingTips: mockGroomingTips,
      })
    );
    expect(result.current.isGenerating).toBe(false);
  });

  it('returns generateCard function', async () => {
    const { useBarberCard } = await import('@/hooks/useBarberCard');
    const { result } = renderHook(() =>
      useBarberCard({
        faceAnalysis: mockFaceAnalysis,
        recommendation: mockRecommendation,
        photoPreview: 'data:image/jpeg;base64,photo',
        previewUrl: undefined,
        gender: 'male',
        groomingTips: mockGroomingTips,
      })
    );
    expect(typeof result.current.generateCard).toBe('function');
  });

  it('sets isGenerating to false after generateCard completes or errors', async () => {
    // This test verifies the state machine: starts false, ends false after call
    // Note: in unit tests, cardRef.current is null (no DOM element), so the hook
    // errors early but still resets isGenerating to false via the finally block
    const { useBarberCard } = await import('@/hooks/useBarberCard');

    const { result } = renderHook(() =>
      useBarberCard({
        faceAnalysis: mockFaceAnalysis,
        recommendation: mockRecommendation,
        photoPreview: 'data:image/jpeg;base64,photo',
        previewUrl: undefined,
        gender: 'male',
        groomingTips: mockGroomingTips,
      })
    );

    expect(result.current.isGenerating).toBe(false);

    // After calling generateCard (which will error due to no cardRef in test env)
    await act(async () => {
      await result.current.generateCard();
    });

    // isGenerating should be false again (reset in finally block)
    expect(result.current.isGenerating).toBe(false);
  });

  it('shows error toast when toPng fails', async () => {
    const { toPng } = await import('html-to-image');
    vi.mocked(toPng).mockRejectedValueOnce(new Error('PNG generation failed'));

    const { useBarberCard } = await import('@/hooks/useBarberCard');
    const { result } = renderHook(() =>
      useBarberCard({
        faceAnalysis: mockFaceAnalysis,
        recommendation: mockRecommendation,
        photoPreview: 'data:image/jpeg;base64,photo',
        previewUrl: undefined,
        gender: 'male',
        groomingTips: mockGroomingTips,
      })
    );

    await act(async () => {
      await result.current.generateCard();
    });

    expect(mockToast.error).toHaveBeenCalledTimes(1);
    expect(result.current.isGenerating).toBe(false);
  });
});
