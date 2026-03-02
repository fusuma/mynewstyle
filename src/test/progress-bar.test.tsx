import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { QuestionnaireFlow, getEncouragementMessage } from '@/components/consultation/QuestionnaireFlow';
import type { QuestionnaireConfig } from '@/types/questionnaire';

// Mock Framer Motion
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: React.forwardRef(
      (
        { children, ...props }: { children?: React.ReactNode } & Record<string, unknown>,
        ref: React.Ref<HTMLDivElement>
      ) => {
        const validProps: Record<string, unknown> = {};
        const invalidKeys = ['initial', 'animate', 'exit', 'variants', 'custom', 'transition', 'whileInView', 'viewport'];
        for (const [key, value] of Object.entries(props)) {
          if (!invalidKeys.includes(key)) {
            validProps[key] = value;
          }
        }
        return <div ref={ref} {...validProps}>{children}</div>;
      }
    ),
  },
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock Zustand store
const mockSetQuestionnaireResponse = vi.fn();
const mockSetQuestionnaireComplete = vi.fn();
vi.mock('@/stores/consultation', () => ({
  useConsultationStore: Object.assign(
    (selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        gender: 'male',
        questionnaire: null,
        setQuestionnaireResponse: mockSetQuestionnaireResponse,
        setQuestionnaireComplete: mockSetQuestionnaireComplete,
      }),
    {
      getState: () => ({
        gender: 'male',
        questionnaire: null,
        setQuestionnaireResponse: mockSetQuestionnaireResponse,
        setQuestionnaireComplete: mockSetQuestionnaireComplete,
      }),
    }
  ),
}));

// Helper: 5-question config (no skip conditions) for predictable progress values
const fiveQuestionConfig: QuestionnaireConfig = {
  id: 'test-progress',
  gender: 'male',
  questions: [
    {
      id: 'q1',
      question: 'Pergunta 1',
      type: 'image-grid',
      options: [
        { value: 'a', label: 'Opcao A' },
        { value: 'b', label: 'Opcao B' },
      ],
      required: true,
    },
    {
      id: 'q2',
      question: 'Pergunta 2',
      type: 'image-grid',
      options: [
        { value: 'a', label: 'Opcao A' },
        { value: 'b', label: 'Opcao B' },
      ],
      required: true,
    },
    {
      id: 'q3',
      question: 'Pergunta 3',
      type: 'image-grid',
      options: [
        { value: 'a', label: 'Opcao A' },
        { value: 'b', label: 'Opcao B' },
      ],
      required: true,
    },
    {
      id: 'q4',
      question: 'Pergunta 4',
      type: 'image-grid',
      options: [
        { value: 'a', label: 'Opcao A' },
        { value: 'b', label: 'Opcao B' },
      ],
      required: true,
    },
    {
      id: 'q5',
      question: 'Pergunta 5',
      type: 'image-grid',
      options: [
        { value: 'a', label: 'Opcao A' },
        { value: 'b', label: 'Opcao B' },
      ],
      required: true,
    },
  ],
};

// Helper: 3-question config for quick progression to high percentages
const threeQuestionConfig: QuestionnaireConfig = {
  id: 'test-progress-short',
  gender: 'male',
  questions: [
    {
      id: 'q1',
      question: 'Pergunta 1',
      type: 'image-grid',
      options: [
        { value: 'a', label: 'Opcao A' },
        { value: 'b', label: 'Opcao B' },
      ],
      required: true,
    },
    {
      id: 'q2',
      question: 'Pergunta 2',
      type: 'image-grid',
      options: [
        { value: 'a', label: 'Opcao A' },
        { value: 'b', label: 'Opcao B' },
      ],
      required: true,
    },
    {
      id: 'q3',
      question: 'Pergunta 3',
      type: 'image-grid',
      options: [
        { value: 'a', label: 'Opcao A' },
        { value: 'b', label: 'Opcao B' },
      ],
      required: true,
    },
  ],
};

// Helper: advance through questions by clicking option and waiting for auto-advance
function answerAndAdvance(optionLabel = 'Opcao A') {
  fireEvent.click(screen.getByText(optionLabel));
  act(() => {
    vi.advanceTimersByTime(300);
  });
}

describe('Progress Bar Enhancements', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSetQuestionnaireResponse.mockClear();
    mockSetQuestionnaireComplete.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Progress Bar ARIA Tests ──────────────────────────────────────
  describe('ARIA attributes', () => {
    it('renders with role="progressbar"', () => {
      render(
        <QuestionnaireFlow config={fiveQuestionConfig} onComplete={vi.fn()} />
      );
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });

    it('has correct aria-valuenow matching current progress percentage', () => {
      render(
        <QuestionnaireFlow config={fiveQuestionConfig} onComplete={vi.fn()} />
      );
      const progressBar = screen.getByRole('progressbar');
      // First question of 5: (0+1)/5 * 100 = 20%
      expect(progressBar).toHaveAttribute('aria-valuenow', '20');
    });

    it('has aria-valuemin="0" and aria-valuemax="100"', () => {
      render(
        <QuestionnaireFlow config={fiveQuestionConfig} onComplete={vi.fn()} />
      );
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('has aria-label describing the progress bar purpose', () => {
      render(
        <QuestionnaireFlow config={fiveQuestionConfig} onComplete={vi.fn()} />
      );
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label');
      expect(progressBar.getAttribute('aria-label')).toBeTruthy();
    });
  });

  // ── Estimated Time Remaining Tests ──────────────────────────────
  describe('Estimated time remaining', () => {
    it('shows estimated time for the first question', () => {
      render(
        <QuestionnaireFlow config={fiveQuestionConfig} onComplete={vi.fn()} />
      );
      // First question of 5: remaining = 5 - 1 = 4, time = 4 * 10 = 40s
      expect(screen.getByText('~40 segundos')).toBeInTheDocument();
    });

    it('updates estimated time as user progresses through questions', () => {
      render(
        <QuestionnaireFlow config={fiveQuestionConfig} onComplete={vi.fn()} />
      );

      // On q1: remaining = 4, time = 40s
      expect(screen.getByText('~40 segundos')).toBeInTheDocument();

      // Answer q1 -> move to q2
      answerAndAdvance();

      // On q2: remaining = 3, time = 30s
      expect(screen.getByText('~30 segundos')).toBeInTheDocument();
    });

    it('hides estimated time on the last question', () => {
      render(
        <QuestionnaireFlow config={fiveQuestionConfig} onComplete={vi.fn()} />
      );

      // Advance to last question (q5)
      answerAndAdvance(); // q1 -> q2
      answerAndAdvance(); // q2 -> q3
      answerAndAdvance(); // q3 -> q4
      answerAndAdvance(); // q4 -> q5

      // On last question, no time remaining should be shown
      expect(screen.queryByText(/~\d+ segundos/)).not.toBeInTheDocument();
    });

    it('displays in text-muted-foreground styling class', () => {
      const { container } = render(
        <QuestionnaireFlow config={fiveQuestionConfig} onComplete={vi.fn()} />
      );

      const timeElement = container.querySelector('[data-testid="estimated-time"]');
      expect(timeElement).toBeInTheDocument();
      expect(timeElement?.className).toContain('text-muted-foreground');
    });
  });

  // ── Encouragement Message Tests ──────────────────────────────────
  describe('Encouragement messages', () => {
    it('shows "Vamos la!" when progress is <= 20%', () => {
      render(
        <QuestionnaireFlow config={fiveQuestionConfig} onComplete={vi.fn()} />
      );
      // First question of 5: progress = 20%
      expect(screen.getByText('Vamos la!')).toBeInTheDocument();
    });

    it('shows no message when progress is between 21-50%', () => {
      render(
        <QuestionnaireFlow config={fiveQuestionConfig} onComplete={vi.fn()} />
      );

      // Answer q1 -> q2: progress = 40%
      answerAndAdvance();

      expect(screen.queryByText('Vamos la!')).not.toBeInTheDocument();
      expect(screen.queryByText('Muito bem, continue!')).not.toBeInTheDocument();
      expect(screen.queryByText(/Quase l/)).not.toBeInTheDocument();
    });

    it('shows "Muito bem, continue!" when progress is 51-79%', () => {
      render(
        <QuestionnaireFlow config={fiveQuestionConfig} onComplete={vi.fn()} />
      );

      // Answer q1 -> q2 (40%), q2 -> q3 (60%)
      answerAndAdvance();
      answerAndAdvance();

      // On q3: progress = 60%
      expect(screen.getByText('Muito bem, continue!')).toBeInTheDocument();
    });

    it('shows "Quase la!" when progress is 80-99%', () => {
      render(
        <QuestionnaireFlow config={fiveQuestionConfig} onComplete={vi.fn()} />
      );

      // Advance to q4 (80%) or q5 (100%)
      answerAndAdvance(); // q1 -> q2 (40%)
      answerAndAdvance(); // q2 -> q3 (60%)
      answerAndAdvance(); // q3 -> q4 (80%)

      // On q4: progress = 80%
      expect(screen.getByText('Quase la!')).toBeInTheDocument();
    });

    it('message container has aria-live="polite" for screen reader announcements', () => {
      const { container } = render(
        <QuestionnaireFlow config={fiveQuestionConfig} onComplete={vi.fn()} />
      );

      const messageContainer = container.querySelector('[data-testid="encouragement-message"]');
      expect(messageContainer).toBeInTheDocument();
      expect(messageContainer).toHaveAttribute('aria-live', 'polite');
    });
  });

  // ── Theme Compliance Tests ──────────────────────────────────────
  describe('Theme compliance', () => {
    it('uses Tailwind theme classes for encouragement message (text-accent)', () => {
      const { container } = render(
        <QuestionnaireFlow config={fiveQuestionConfig} onComplete={vi.fn()} />
      );

      // Encouragement message at 20% should use text-accent
      const messageContainer = container.querySelector('[data-testid="encouragement-message"]');
      expect(messageContainer).toBeInTheDocument();
      expect(messageContainer?.className).toContain('text-accent');
    });

    it('uses Tailwind theme classes for progress bar container (bg-border)', () => {
      render(
        <QuestionnaireFlow config={fiveQuestionConfig} onComplete={vi.fn()} />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar.className).toContain('bg-border');
    });

    it('uses Tailwind theme classes for progress bar fill (bg-accent)', () => {
      const { container } = render(
        <QuestionnaireFlow config={fiveQuestionConfig} onComplete={vi.fn()} />
      );

      const progressBar = screen.getByRole('progressbar');
      const fill = progressBar.querySelector('div');
      expect(fill?.className).toContain('bg-accent');
    });
  });

  // ── Reduced Motion Tests ──────────────────────────────────────
  describe('Reduced motion', () => {
    it('progress bar has duration-300 transition by default', () => {
      const { container } = render(
        <QuestionnaireFlow config={fiveQuestionConfig} onComplete={vi.fn()} />
      );

      const progressBar = screen.getByRole('progressbar');
      const fill = progressBar.querySelector('div');
      expect(fill?.className).toContain('duration-300');
    });

    it('progress bar transition changes to duration-0 when reduced motion is preferred', () => {
      // Override matchMedia to return reduced-motion: true
      const originalMatchMedia = window.matchMedia;
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }),
      });

      try {
        const { container } = render(
          <QuestionnaireFlow config={fiveQuestionConfig} onComplete={vi.fn()} />
        );

        const progressBar = screen.getByRole('progressbar');
        const fill = progressBar.querySelector('div');
        expect(fill?.className).toContain('duration-0');
        expect(fill?.className).not.toContain('duration-300');
      } finally {
        // Restore original matchMedia even if test fails
        Object.defineProperty(window, 'matchMedia', {
          writable: true,
          value: originalMatchMedia,
        });
      }
    });
  });

  // ── Integration Tests ──────────────────────────────────────
  describe('Integration: full questionnaire flow', () => {
    it('progress bar updates correctly at each step', () => {
      render(
        <QuestionnaireFlow config={fiveQuestionConfig} onComplete={vi.fn()} />
      );

      // q1: 20%
      let progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '20');

      answerAndAdvance(); // -> q2: 40%
      progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '40');

      answerAndAdvance(); // -> q3: 60%
      progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '60');

      answerAndAdvance(); // -> q4: 80%
      progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '80');

      answerAndAdvance(); // -> q5: 100%
      progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });

    it('encouragement messages appear at correct milestones through full flow', () => {
      render(
        <QuestionnaireFlow config={fiveQuestionConfig} onComplete={vi.fn()} />
      );

      // q1 (20%): "Vamos la!"
      expect(screen.getByText('Vamos la!')).toBeInTheDocument();

      answerAndAdvance(); // -> q2 (40%): no message
      expect(screen.queryByText('Vamos la!')).not.toBeInTheDocument();
      expect(screen.queryByText('Muito bem, continue!')).not.toBeInTheDocument();

      answerAndAdvance(); // -> q3 (60%): "Muito bem, continue!"
      expect(screen.getByText('Muito bem, continue!')).toBeInTheDocument();

      answerAndAdvance(); // -> q4 (80%): "Quase la!"
      expect(screen.getByText('Quase la!')).toBeInTheDocument();
    });

    it('estimated time decreases with each question answered', () => {
      render(
        <QuestionnaireFlow config={fiveQuestionConfig} onComplete={vi.fn()} />
      );

      // q1: remaining = 4, time = 40s
      expect(screen.getByText('~40 segundos')).toBeInTheDocument();

      answerAndAdvance(); // q2: remaining = 3, time = 30s
      expect(screen.getByText('~30 segundos')).toBeInTheDocument();

      answerAndAdvance(); // q3: remaining = 2, time = 20s
      expect(screen.getByText('~20 segundos')).toBeInTheDocument();

      answerAndAdvance(); // q4: remaining = 1, time = 10s
      expect(screen.getByText('~10 segundos')).toBeInTheDocument();

      answerAndAdvance(); // q5: last question, no time shown
      expect(screen.queryByText(/~\d+ segundos/)).not.toBeInTheDocument();
    });
  });
});

// ── getEncouragementMessage unit tests ──────────────────────────────
describe('getEncouragementMessage', () => {
  it('returns "Vamos la!" for progress 0', () => {
    expect(getEncouragementMessage(0)).toBe('Vamos la!');
  });

  it('returns "Vamos la!" for progress 20', () => {
    expect(getEncouragementMessage(20)).toBe('Vamos la!');
  });

  it('returns null for progress 21-50', () => {
    expect(getEncouragementMessage(21)).toBeNull();
    expect(getEncouragementMessage(35)).toBeNull();
    expect(getEncouragementMessage(50)).toBeNull();
  });

  it('returns "Muito bem, continue!" for progress 51-79', () => {
    expect(getEncouragementMessage(51)).toBe('Muito bem, continue!');
    expect(getEncouragementMessage(65)).toBe('Muito bem, continue!');
    expect(getEncouragementMessage(79)).toBe('Muito bem, continue!');
  });

  it('returns "Quase la!" for progress 80-99', () => {
    expect(getEncouragementMessage(80)).toBe('Quase la!');
    expect(getEncouragementMessage(90)).toBe('Quase la!');
    expect(getEncouragementMessage(99)).toBe('Quase la!');
  });

  it('returns null for progress 100', () => {
    expect(getEncouragementMessage(100)).toBeNull();
  });
});
