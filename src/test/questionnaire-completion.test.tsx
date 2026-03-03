import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import type { QuestionnaireResponses } from '@/stores/consultation';

// --- Mock setup ---

const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: vi.fn(),
  }),
}));

// Mock store state
let mockStoreState: Record<string, unknown> = {};
const mockSetQuestionnaireComplete = vi.fn();
const mockSetConsultationId = vi.fn();
const mockSetQuestionnaireResponse = vi.fn();

vi.mock('@/stores/consultation', () => ({
  useConsultationStore: Object.assign(
    (selector: (state: Record<string, unknown>) => unknown) => selector(mockStoreState),
    {
      getState: () => mockStoreState,
    }
  ),
}));

// Mock submitConsultation
const mockSubmitConsultation = vi.fn();
vi.mock('@/lib/consultation/submit', () => ({
  submitConsultation: (...args: unknown[]) => mockSubmitConsultation(...args),
  ConsultationSubmissionError: class ConsultationSubmissionError extends Error {
    retryable: boolean;
    constructor(message: string, retryable: boolean = true) {
      super(message);
      this.name = 'ConsultationSubmissionError';
      this.retryable = retryable;
    }
  },
}));

// Mock sonner toast
const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock QuestionnaireFlow - capture onComplete callback
let capturedOnComplete: ((responses: QuestionnaireResponses) => void) | null = null;
vi.mock('@/components/consultation/QuestionnaireFlow', () => ({
  QuestionnaireFlow: ({ onComplete }: { onComplete: (responses: QuestionnaireResponses) => void }) => {
    capturedOnComplete = onComplete;
    return <div data-testid="questionnaire-flow">QuestionnaireFlow</div>;
  },
}));

// Mock questionnaire config
vi.mock('@/lib/questionnaire', () => ({
  getQuestionnaireConfig: () => ({
    id: 'test',
    gender: 'male',
    questions: [{ id: 'q1', question: 'Test?', type: 'image-grid', options: [{ value: 'a', label: 'A' }], required: true }],
  }),
}));

// Dynamically import after mocks are set up
import QuestionnairePage from '@/app/consultation/questionnaire/page';

const testResponses: QuestionnaireResponses = {
  q1: 'answer1',
  q2: ['opt1', 'opt2'],
  q3: 5,
};

describe('QuestionnairePage - submission flow', () => {
  beforeEach(() => {
    mockStoreState = {
      gender: 'male',
      photoPreview: 'data:image/jpeg;base64,testphoto',
      photoConsentGivenAt: '2026-03-03T00:00:00.000Z',
      questionnaire: null,
      consultationId: null,
      setQuestionnaireComplete: mockSetQuestionnaireComplete,
      setConsultationId: mockSetConsultationId,
      setQuestionnaireResponse: mockSetQuestionnaireResponse,
    };
    capturedOnComplete = null;
    mockPush.mockClear();
    mockReplace.mockClear();
    mockSetQuestionnaireComplete.mockClear();
    mockSetConsultationId.mockClear();
    mockSubmitConsultation.mockClear();
    mockToastError.mockClear();
  });

  it('renders QuestionnaireFlow when gender is set', () => {
    render(<QuestionnairePage />);
    expect(screen.getByTestId('questionnaire-flow')).toBeInTheDocument();
  });

  it('handleComplete calls submitConsultation with correct payload from store', async () => {
    mockSubmitConsultation.mockResolvedValueOnce({ consultationId: 'test-id-123' });
    render(<QuestionnairePage />);

    expect(capturedOnComplete).not.toBeNull();
    await act(async () => {
      await capturedOnComplete!(testResponses);
    });

    expect(mockSetQuestionnaireComplete).toHaveBeenCalledWith(testResponses);
    expect(mockSubmitConsultation).toHaveBeenCalledWith({
      gender: 'male',
      photoUrl: 'data:image/jpeg;base64,testphoto',
      questionnaire: testResponses,
      photoConsentGivenAt: expect.any(String),
    });
  });

  it('shows loading indicator during submission', async () => {
    // Create a never-resolving promise to keep submission in progress
    let resolveSubmit!: (value: { consultationId: string }) => void;
    mockSubmitConsultation.mockReturnValueOnce(
      new Promise((resolve) => { resolveSubmit = resolve; })
    );

    render(<QuestionnairePage />);

    // Trigger submission
    act(() => {
      capturedOnComplete!(testResponses);
    });

    // Loading should appear
    await waitFor(() => {
      expect(screen.getByTestId('submission-loading')).toBeInTheDocument();
    });
    expect(screen.getByText('A enviar as suas respostas...')).toBeInTheDocument();

    // Clean up
    await act(async () => {
      resolveSubmit({ consultationId: 'cleanup-id' });
    });
  });

  it('successful submission stores consultationId in ConsultationStore', async () => {
    mockSubmitConsultation.mockResolvedValueOnce({ consultationId: 'new-consultation-id' });
    render(<QuestionnairePage />);

    await act(async () => {
      await capturedOnComplete!(testResponses);
    });

    expect(mockSetConsultationId).toHaveBeenCalledWith('new-consultation-id');
  });

  it('successful submission navigates to /consultation/processing', async () => {
    mockSubmitConsultation.mockResolvedValueOnce({ consultationId: 'nav-test-id' });
    render(<QuestionnairePage />);

    await act(async () => {
      await capturedOnComplete!(testResponses);
    });

    expect(mockPush).toHaveBeenCalledWith('/consultation/processing');
  });

  it('failed submission shows error toast', async () => {
    mockSubmitConsultation.mockRejectedValueOnce(new Error('Network fail'));
    render(<QuestionnairePage />);

    await act(async () => {
      await capturedOnComplete!(testResponses);
    });

    expect(mockToastError).toHaveBeenCalledWith('Algo correu mal. Tente novamente.');
  });

  it('failed submission does NOT navigate away from questionnaire', async () => {
    mockSubmitConsultation.mockRejectedValueOnce(new Error('Network fail'));
    render(<QuestionnairePage />);

    await act(async () => {
      await capturedOnComplete!(testResponses);
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('duplicate submission prevented while isSubmitting is true', async () => {
    let resolveSubmit!: (value: { consultationId: string }) => void;
    mockSubmitConsultation.mockReturnValueOnce(
      new Promise((resolve) => { resolveSubmit = resolve; })
    );

    render(<QuestionnairePage />);

    // First submission
    act(() => {
      capturedOnComplete!(testResponses);
    });

    // Wait for loading to appear
    await waitFor(() => {
      expect(screen.getByTestId('submission-loading')).toBeInTheDocument();
    });

    // Try second submission while first is in progress
    act(() => {
      capturedOnComplete!(testResponses);
    });

    // Should only have been called once
    expect(mockSubmitConsultation).toHaveBeenCalledTimes(1);

    // Clean up
    await act(async () => {
      resolveSubmit({ consultationId: 'cleanup-id' });
    });
  });

  it('questionnaire data preserved in store after failed submission', async () => {
    mockSubmitConsultation.mockRejectedValueOnce(new Error('fail'));
    render(<QuestionnairePage />);

    await act(async () => {
      await capturedOnComplete!(testResponses);
    });

    // setQuestionnaireComplete should have been called before the API call
    expect(mockSetQuestionnaireComplete).toHaveBeenCalledWith(testResponses);
    // The store data should not be cleared on failure
    // (no reset call should have been made)
  });

  // Story 11.2 LGPD compliance: redirect to photo page when consent is missing
  it('redirects to /consultation/photo when photoConsentGivenAt is null (direct navigation)', async () => {
    // Simulate user navigating directly to questionnaire without going through consent flow
    mockStoreState = {
      ...mockStoreState,
      photoConsentGivenAt: null,
    };

    render(<QuestionnairePage />);

    await act(async () => {
      await capturedOnComplete!(testResponses);
    });

    // Should redirect to photo page to require consent
    expect(mockReplace).toHaveBeenCalledWith('/consultation/photo');
    // Should NOT call submitConsultation
    expect(mockSubmitConsultation).not.toHaveBeenCalled();
  });

  it('passes the exact stored photoConsentGivenAt timestamp to submitConsultation', async () => {
    const consentTimestamp = '2026-03-03T10:30:00.000Z';
    mockStoreState = {
      ...mockStoreState,
      photoConsentGivenAt: consentTimestamp,
    };
    mockSubmitConsultation.mockResolvedValueOnce({ consultationId: 'consent-ts-test' });
    render(<QuestionnairePage />);

    await act(async () => {
      await capturedOnComplete!(testResponses);
    });

    expect(mockSubmitConsultation).toHaveBeenCalledWith(
      expect.objectContaining({
        photoConsentGivenAt: consentTimestamp,
      })
    );
  });
});
