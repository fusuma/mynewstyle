import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { initial, animate, exit, transition, variants, ...rest } = props;
      return <div data-testid="motion-div" {...rest}>{children}</div>;
    },
  },
  useReducedMotion: () => false,
}));

// Mock lucide-react icons — include UserPlus icon for "Convidar amigos"
vi.mock('lucide-react', () => ({
  Share2: () => <svg data-testid="icon-share2" />,
  Bookmark: () => <svg data-testid="icon-bookmark" />,
  PlusCircle: () => <svg data-testid="icon-plus-circle" />,
  Home: () => <svg data-testid="icon-home" />,
  Scissors: () => <svg data-testid="icon-scissors" />,
  Loader2: ({ 'data-testid': testId }: { 'data-testid'?: string }) => (
    <svg data-testid={testId ?? 'icon-loader'} />
  ),
  Image: () => <svg data-testid="icon-image" />,
  UserPlus: () => <svg data-testid="icon-user-plus" />,
}));

// Mock sonner toast
const mockToastSuccess = vi.fn();
const mockToastInfo = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    info: mockToastInfo,
    error: vi.fn(),
  },
}));

// Mock consultation store
vi.mock('@/stores/consultation', () => ({
  useConsultationStore: vi.fn((selector) => {
    const mockState = {
      reset: vi.fn(),
      faceAnalysis: null,
      photoPreview: null,
      consultation: null,
      gender: null,
      previews: new Map(),
    };
    return typeof selector === 'function' ? selector(mockState) : mockState;
  }),
}));

// Mock hooks
vi.mock('@/hooks/useBarberCard', () => ({
  useBarberCard: () => ({
    generateCard: vi.fn(),
    isGenerating: false,
    cardRef: { current: null },
  }),
}));

vi.mock('@/hooks/useShareCard', () => ({
  useShareCard: () => ({
    generateShareCard: vi.fn(),
    isGenerating: false,
    cardRef: { current: null },
    squareCardRef: { current: null },
  }),
}));

// Mock card renderer components
vi.mock('@/components/consultation/BarberCardRenderer', () => ({
  BarberCardRenderer: () => <div data-testid="barber-card-renderer" />,
}));

vi.mock('@/components/share/ShareCardStoryRenderer', () => ({
  ShareCardStoryRenderer: () => <div data-testid="share-card-story-renderer" />,
}));

vi.mock('@/components/share/ShareCardSquareRenderer', () => ({
  ShareCardSquareRenderer: () => <div data-testid="share-card-square-renderer" />,
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock navigator.clipboard
const mockWriteText = vi.fn();
Object.defineProperty(global.navigator, 'clipboard', {
  value: { writeText: mockWriteText },
  writable: true,
  configurable: true,
});

// Mock navigator.share
let mockShare: ((data: ShareData) => Promise<void>) | undefined;

describe('ResultsActionsFooter — "Convidar amigos" button (AC #7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteText.mockResolvedValue(undefined);
    mockShare = undefined;
    Object.defineProperty(global.navigator, 'share', {
      value: mockShare,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders "Convidar amigos" button', async () => {
    // Unauthenticated guest path (no fetch needed)
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');

    await act(async () => {
      render(<ResultsActionsFooter consultationId="test-id" />);
    });

    expect(screen.getByRole('button', { name: /Convidar amigos/i })).toBeTruthy();
  });

  it('renders UserPlus icon in "Convidar amigos" button', async () => {
    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');

    await act(async () => {
      render(<ResultsActionsFooter consultationId="test-id" />);
    });

    const button = screen.getByRole('button', { name: /Convidar amigos/i });
    // Icon should be inside the button
    expect(button.querySelector('[data-testid="icon-user-plus"]')).toBeTruthy();
  });

  it('copies base URL to clipboard for guest users (no Web Share API)', async () => {
    // No navigator.share available
    Object.defineProperty(global.navigator, 'share', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');

    await act(async () => {
      render(<ResultsActionsFooter consultationId="test-id" />);
    });

    const button = screen.getByRole('button', { name: /Convidar amigos/i });
    await act(async () => {
      fireEvent.click(button);
    });

    // Guest gets base URL
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalled();
    });
  });

  it('shows "Link copiado!" toast on clipboard copy fallback', async () => {
    Object.defineProperty(global.navigator, 'share', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');

    await act(async () => {
      render(<ResultsActionsFooter consultationId="test-id" />);
    });

    const button = screen.getByRole('button', { name: /Convidar amigos/i });
    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('Link copiado!');
    });
  });

  it('calls navigator.share with correct params when Web Share API is available', async () => {
    const mockShareFn = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(global.navigator, 'share', {
      value: mockShareFn,
      writable: true,
      configurable: true,
    });

    const { ResultsActionsFooter } = await import('@/components/consultation/ResultsActionsFooter');

    await act(async () => {
      render(<ResultsActionsFooter consultationId="test-id" />);
    });

    const button = screen.getByRole('button', { name: /Convidar amigos/i });
    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(mockShareFn).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'mynewstyle',
          text: expect.any(String),
          url: expect.any(String),
        })
      );
    });
  });
});
