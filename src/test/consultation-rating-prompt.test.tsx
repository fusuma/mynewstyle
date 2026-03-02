/**
 * Tests for ConsultationRatingPrompt component
 * Story 10.5: Post-Consultation Rating — AC #1, #2, #5, #6, #9
 *
 * Target: 10+ tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import React from 'react';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock framer-motion
let mockReducedMotion = false;
vi.mock('framer-motion', () => ({
  useReducedMotion: () => mockReducedMotion,
  motion: {
    div: ({
      children,
      initial,
      animate,
      transition,
      ...props
    }: {
      children?: React.ReactNode;
      initial?: unknown;
      animate?: unknown;
      transition?: unknown;
      [key: string]: unknown;
    }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock StarRating component
vi.mock('@/components/consultation/StarRating', () => ({
  StarRating: ({
    value,
    onChange,
    label,
  }: {
    value: number | null;
    onChange: (v: number) => void;
    label?: string;
  }) => (
    <div data-testid="star-rating" data-value={value} aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onChange(n)} data-testid={`star-${n}`}>
          {n}
        </button>
      ))}
    </div>
  ),
}));

// Mock analytics
vi.mock('@/lib/utils/analytics', () => ({
  trackEvent: vi.fn(),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

// Mock Zustand consultation store (needed for setRatingSubmitted)
const mockSetRatingSubmitted = vi.fn();
vi.mock('@/stores/consultation', () => ({
  useConsultationStore: (selector: (state: { setRatingSubmitted: typeof mockSetRatingSubmitted }) => unknown) => {
    if (typeof selector === 'function') {
      return selector({ setRatingSubmitted: mockSetRatingSubmitted });
    }
    return { setRatingSubmitted: mockSetRatingSubmitted };
  },
}));

const VALID_CONSULTATION_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('ConsultationRatingPrompt — renders rating prompt', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, rating: 4 }),
    });
    mockSetRatingSubmitted.mockReset();
  });

  it('renders the overall rating heading', async () => {
    const { ConsultationRatingPrompt } = await import(
      '@/components/consultation/ConsultationRatingPrompt'
    );
    render(
      <ConsultationRatingPrompt
        consultationId={VALID_CONSULTATION_ID}
        hasGeneratedPreviews={false}
      />
    );
    expect(screen.getByText('Como avalia esta consultoria?')).toBeInTheDocument();
  });

  it('renders a "Agora nao" skip link', async () => {
    const { ConsultationRatingPrompt } = await import(
      '@/components/consultation/ConsultationRatingPrompt'
    );
    render(
      <ConsultationRatingPrompt
        consultationId={VALID_CONSULTATION_ID}
        hasGeneratedPreviews={false}
      />
    );
    expect(screen.getByText('Agora nao')).toBeInTheDocument();
  });

  it('renders with existing rating in edit mode (shows Atualizar)', async () => {
    const { ConsultationRatingPrompt } = await import(
      '@/components/consultation/ConsultationRatingPrompt'
    );
    render(
      <ConsultationRatingPrompt
        consultationId={VALID_CONSULTATION_ID}
        existingRating={3}
        hasGeneratedPreviews={false}
      />
    );
    expect(screen.getByText('Atualizar')).toBeInTheDocument();
  });
});

describe('ConsultationRatingPrompt — submits overall rating', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, rating: 4 }),
    });
  });

  it('submits overall rating when a star is clicked', async () => {
    const { ConsultationRatingPrompt } = await import(
      '@/components/consultation/ConsultationRatingPrompt'
    );
    render(
      <ConsultationRatingPrompt
        consultationId={VALID_CONSULTATION_ID}
        hasGeneratedPreviews={false}
      />
    );
    const starButton = screen.getByTestId('star-4');
    fireEvent.click(starButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/consultation/${VALID_CONSULTATION_ID}/rate`),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('calls trackEvent with results_rated only once when user skips details', async () => {
    const { ConsultationRatingPrompt } = await import(
      '@/components/consultation/ConsultationRatingPrompt'
    );
    const { trackEvent } = await import('@/lib/utils/analytics');
    render(
      <ConsultationRatingPrompt
        consultationId={VALID_CONSULTATION_ID}
        hasGeneratedPreviews={false}
      />
    );

    // Click star to submit overall rating (transitions to 'details' state)
    const starButton = screen.getByTestId('star-5');
    fireEvent.click(starButton);

    // Wait for details state
    await waitFor(() => screen.getByText('Saltar'));

    // Skip decomposed ratings — analytics event should fire here
    fireEvent.click(screen.getByText('Saltar'));

    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledTimes(1);
      expect(trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'results_rated',
          rating: 5,
          hasDetails: false,
          consultationId: VALID_CONSULTATION_ID,
        })
      );
    });
  });

  it('calls setRatingSubmitted(true) when user skips decomposed ratings', async () => {
    const { ConsultationRatingPrompt } = await import(
      '@/components/consultation/ConsultationRatingPrompt'
    );
    render(
      <ConsultationRatingPrompt
        consultationId={VALID_CONSULTATION_ID}
        hasGeneratedPreviews={false}
      />
    );

    fireEvent.click(screen.getByTestId('star-4'));
    await waitFor(() => screen.getByText('Saltar'));
    fireEvent.click(screen.getByText('Saltar'));

    await waitFor(() => {
      expect(mockSetRatingSubmitted).toHaveBeenCalledWith(true);
    });
  });
});

describe('ConsultationRatingPrompt — shows decomposed ratings after overall', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, rating: 4 }),
    });
  });

  it('shows decomposed ratings section after overall rating is submitted', async () => {
    const { ConsultationRatingPrompt } = await import(
      '@/components/consultation/ConsultationRatingPrompt'
    );
    render(
      <ConsultationRatingPrompt
        consultationId={VALID_CONSULTATION_ID}
        hasGeneratedPreviews={false}
      />
    );
    const starButton = screen.getByTestId('star-4');
    fireEvent.click(starButton);

    await waitFor(() => {
      expect(screen.getByText('Precisao do formato do rosto')).toBeInTheDocument();
      expect(screen.getByText('Qualidade das recomendacoes')).toBeInTheDocument();
    });
  });

  it('does NOT show preview realism sub-rating if no previews generated', async () => {
    const { ConsultationRatingPrompt } = await import(
      '@/components/consultation/ConsultationRatingPrompt'
    );
    render(
      <ConsultationRatingPrompt
        consultationId={VALID_CONSULTATION_ID}
        hasGeneratedPreviews={false}
      />
    );
    fireEvent.click(screen.getByTestId('star-4'));

    await waitFor(() => {
      expect(screen.queryByText('Realismo da pre-visualizacao')).not.toBeInTheDocument();
    });
  });

  it('shows preview realism sub-rating when previews were generated', async () => {
    const { ConsultationRatingPrompt } = await import(
      '@/components/consultation/ConsultationRatingPrompt'
    );
    render(
      <ConsultationRatingPrompt
        consultationId={VALID_CONSULTATION_ID}
        hasGeneratedPreviews={true}
      />
    );
    fireEvent.click(screen.getByTestId('star-4'));

    await waitFor(() => {
      expect(screen.getByText('Realismo da pre-visualizacao')).toBeInTheDocument();
    });
  });
});

describe('ConsultationRatingPrompt — shows confirmation', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, rating: 4 }),
    });
  });

  it('shows Obrigado! confirmation after submitting decomposed ratings', async () => {
    const { ConsultationRatingPrompt } = await import(
      '@/components/consultation/ConsultationRatingPrompt'
    );
    render(
      <ConsultationRatingPrompt
        consultationId={VALID_CONSULTATION_ID}
        hasGeneratedPreviews={false}
      />
    );

    // Submit overall rating
    fireEvent.click(screen.getByTestId('star-4'));
    await waitFor(() => screen.getByText('Saltar'));

    // Submit decomposed ratings (skip them)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, rating: 4 }),
    });
    fireEvent.click(screen.getByText('Saltar'));

    await waitFor(() => {
      expect(screen.getByText(/Obrigado!/i)).toBeInTheDocument();
    });
  });
});

describe('ConsultationRatingPrompt — skips decomposed ratings', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, rating: 4 }),
    });
  });

  it('can skip decomposed ratings with Saltar link', async () => {
    const { ConsultationRatingPrompt } = await import(
      '@/components/consultation/ConsultationRatingPrompt'
    );
    render(
      <ConsultationRatingPrompt
        consultationId={VALID_CONSULTATION_ID}
        hasGeneratedPreviews={false}
      />
    );
    fireEvent.click(screen.getByTestId('star-3'));
    await waitFor(() => screen.getByText('Saltar'));
    fireEvent.click(screen.getByText('Saltar'));
    await waitFor(() => {
      expect(screen.getByText(/Obrigado!/i)).toBeInTheDocument();
    });
  });
});

describe('ConsultationRatingPrompt — auto-dismisses', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, rating: 4 }),
    });
  });

  it('auto-dismisses after 3 seconds in success state', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { ConsultationRatingPrompt } = await import(
      '@/components/consultation/ConsultationRatingPrompt'
    );
    render(
      <ConsultationRatingPrompt
        consultationId={VALID_CONSULTATION_ID}
        hasGeneratedPreviews={false}
      />
    );

    // Click star to start rating process (triggers async fetch)
    await act(async () => {
      fireEvent.click(screen.getByTestId('star-5'));
      await vi.runAllTimersAsync();
    });

    // If details screen appeared, click Saltar
    if (screen.queryByText('Saltar')) {
      await act(async () => {
        fireEvent.click(screen.getByText('Saltar'));
        await Promise.resolve();
      });
    }

    // Verify we're in success state
    await waitFor(() => {
      expect(screen.queryByText(/Obrigado!/i)).toBeInTheDocument();
    });

    // Advance timers past 3 seconds auto-dismiss
    await act(async () => {
      vi.advanceTimersByTime(3500);
    });

    // Should be dismissed now
    expect(screen.queryByText(/Obrigado!/i)).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});

describe('ConsultationRatingPrompt — existing rating edit mode', () => {
  beforeEach(() => {
    mockReducedMotion = false;
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, rating: 4 }),
    });
  });

  it('shows existing rating value in edit mode', async () => {
    const { ConsultationRatingPrompt } = await import(
      '@/components/consultation/ConsultationRatingPrompt'
    );
    render(
      <ConsultationRatingPrompt
        consultationId={VALID_CONSULTATION_ID}
        existingRating={4}
        hasGeneratedPreviews={false}
      />
    );
    const starRating = screen.getByTestId('star-rating');
    expect(starRating.getAttribute('data-value')).toBe('4');
  });
});

describe('ConsultationRatingPrompt — respects reduced motion', () => {
  it('renders without animation when prefers-reduced-motion is active', async () => {
    mockReducedMotion = true;
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, rating: 4 }),
    });

    const { ConsultationRatingPrompt } = await import(
      '@/components/consultation/ConsultationRatingPrompt'
    );
    const { container } = render(
      <ConsultationRatingPrompt
        consultationId={VALID_CONSULTATION_ID}
        hasGeneratedPreviews={false}
      />
    );
    expect(container).toBeDefined();
    expect(screen.getByText('Como avalia esta consultoria?')).toBeInTheDocument();
  });
});
