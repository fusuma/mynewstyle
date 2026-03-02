import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import React from 'react';
import ProcessingPage from '@/app/consultation/processing/page';
import { FaceShapeReveal } from '@/components/consultation/FaceShapeReveal';
import { ProcessingScreen } from '@/components/consultation/ProcessingScreen';
import type { FaceAnalysisOutput } from '@/lib/ai/schemas';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock Zustand store
vi.mock('@/stores/consultation', () => ({
  useConsultationStore: vi.fn(),
}));

// Mock framer-motion (avoid animation complexity in tests)
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  },
  useReducedMotion: vi.fn(() => false),
}));

import { useRouter } from 'next/navigation';
import { useConsultationStore } from '@/stores/consultation';

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockSetFaceAnalysis = vi.fn();

// Valid face analysis fixture
const validFaceAnalysis: FaceAnalysisOutput = {
  faceShape: 'oval' as const,
  confidence: 0.92,
  proportions: { foreheadRatio: 0.78, cheekboneRatio: 1.0, jawRatio: 0.72, faceLength: 1.35 },
  hairAssessment: { type: 'straight', texture: 'medium', density: 'medium', currentStyle: 'short' },
};

interface MockStoreState {
  consultationId: string | null;
  photoPreview: string | null;
  setFaceAnalysis: typeof mockSetFaceAnalysis;
}

const mockStoreState: MockStoreState = {
  consultationId: 'test-uuid-1234',
  photoPreview: 'data:image/jpeg;base64,/9j/testbase64data',
  setFaceAnalysis: mockSetFaceAnalysis,
};

function setupMocks(overrides?: Partial<MockStoreState>) {
  const state = { ...mockStoreState, ...overrides };
  (useConsultationStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (selector: (s: MockStoreState) => unknown) => selector(state)
  );
  (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({ push: mockPush, replace: mockReplace });
}

describe('ProcessingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ faceAnalysis: validFaceAnalysis }),
    });
    setupMocks();
  });

  describe('API call behavior', () => {
    it('calls POST /api/consultation/analyze on mount with correct body', async () => {
      render(<ProcessingPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledOnce();
      });

      const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/consultation/analyze');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body as string) as Record<string, unknown>;
      expect(body.consultationId).toBe('test-uuid-1234');
      expect(body.photoBase64).toBe('/9j/testbase64data'); // strips "data:image/jpeg;base64," prefix
    });

    it('sends correct Content-Type header', async () => {
      render(<ProcessingPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledOnce();
      });

      const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
      const headers = options.headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json');
    });
  });

  describe('Loading state', () => {
    it('shows loading/processing screen while fetch is pending', async () => {
      // Delay the fetch resolution
      let resolvePromise!: (v: unknown) => void;
      global.fetch = vi.fn().mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      render(<ProcessingPage />);

      expect(screen.getByText('A analisar o formato do seu rosto...')).toBeInTheDocument();

      // Cleanup: resolve the promise
      await act(async () => {
        resolvePromise({ ok: true, json: async () => ({ faceAnalysis: validFaceAnalysis }) });
      });
    });
  });

  describe('Successful response', () => {
    it('shows FaceShapeReveal with correct Portuguese label after successful response', async () => {
      render(<ProcessingPage />);

      await waitFor(() => {
        expect(screen.getByText('Rosto Oval')).toBeInTheDocument();
      });
    });

    it('shows confidence score as "92% de certeza"', async () => {
      render(<ProcessingPage />);

      await waitFor(() => {
        expect(screen.getByText('92% de certeza')).toBeInTheDocument();
      });
    });

    it('calls setFaceAnalysis with the response faceAnalysis', async () => {
      render(<ProcessingPage />);

      await waitFor(() => {
        expect(mockSetFaceAnalysis).toHaveBeenCalledOnce();
        expect(mockSetFaceAnalysis).toHaveBeenCalledWith(validFaceAnalysis);
      });
    });

    it('"Continuar" button is visible after reveal', async () => {
      render(<ProcessingPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument();
      });
    });

    it('"Continuar" button navigates to /consultation/results/:id', async () => {
      render(<ProcessingPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
      expect(mockPush).toHaveBeenCalledWith('/consultation/results/test-uuid-1234');
    });
  });

  describe('Error states', () => {
    it('shows error message on API 422 response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({ error: 'AI analysis failed validation' }),
      });

      render(<ProcessingPage />);

      await waitFor(() => {
        expect(screen.getByText('Algo correu mal. Tentar de novo?')).toBeInTheDocument();
      });
    });

    it('shows error message on API 500 response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      });

      render(<ProcessingPage />);

      await waitFor(() => {
        expect(screen.getByText('Algo correu mal. Tentar de novo?')).toBeInTheDocument();
      });
    });

    it('shows error message on network error (fetch rejects)', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

      render(<ProcessingPage />);

      await waitFor(() => {
        expect(screen.getByText('Algo correu mal. Tentar de novo?')).toBeInTheDocument();
      });
    });

    it('shows retry button in error state', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Error' }),
      });

      render(<ProcessingPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /tentar de novo/i })).toBeInTheDocument();
      });
    });

    it('retry button re-triggers the analysis call', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'Error' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ faceAnalysis: validFaceAnalysis }) });

      render(<ProcessingPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /tentar de novo/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /tentar de novo/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Guard: no consultationId', () => {
    it('redirects to /consultation/questionnaire if no consultationId', async () => {
      setupMocks({ consultationId: null });

      render(<ProcessingPage />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/consultation/questionnaire');
      });
    });

    it('returns null (renders nothing) when consultationId is absent', () => {
      setupMocks({ consultationId: null });

      const { container } = render(<ProcessingPage />);
      expect(container).toBeEmptyDOMElement();
    });
  });
});

describe('FaceShapeReveal - Portuguese label mapping', () => {
  const onContinue = vi.fn();

  const shapes: Array<{ shape: FaceAnalysisOutput['faceShape']; label: string }> = [
    { shape: 'oval', label: 'Oval' },
    { shape: 'round', label: 'Redondo' },
    { shape: 'square', label: 'Quadrado' },
    { shape: 'oblong', label: 'Oblongo' },
    { shape: 'heart', label: 'Coração' },
    { shape: 'diamond', label: 'Diamante' },
    { shape: 'triangle', label: 'Triangular' },
  ];

  shapes.forEach(({ shape, label }) => {
    it(`maps "${shape}" to Portuguese label "Rosto ${label}"`, () => {
      const analysis: FaceAnalysisOutput = {
        ...validFaceAnalysis,
        faceShape: shape,
      };

      render(
        <FaceShapeReveal faceAnalysis={analysis} onContinue={onContinue} />
      );

      expect(screen.getByText(`Rosto ${label}`)).toBeInTheDocument();
    });
  });
});

describe('ProcessingScreen', () => {
  it('shows processing text "A analisar o formato do seu rosto..."', () => {
    render(<ProcessingScreen photoPreview={null} />);
    expect(screen.getByText('A analisar o formato do seu rosto...')).toBeInTheDocument();
  });

  it('renders user photo when photoPreview is provided', () => {
    render(<ProcessingScreen photoPreview="data:image/jpeg;base64,abc123" />);
    const img = screen.getByAltText('A sua foto a ser analisada');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'data:image/jpeg;base64,abc123');
  });

  it('does not render image when photoPreview is null', () => {
    render(<ProcessingScreen photoPreview={null} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
