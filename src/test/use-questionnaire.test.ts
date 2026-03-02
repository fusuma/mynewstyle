import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQuestionnaire } from '@/hooks/useQuestionnaire';
import type { QuestionnaireConfig } from '@/types/questionnaire';

// Mock Zustand store
const mockSetQuestionnaireResponse = vi.fn();
vi.mock('@/stores/consultation', () => ({
  useConsultationStore: Object.assign(
    (selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        setQuestionnaireResponse: mockSetQuestionnaireResponse,
      }),
    {
      getState: () => ({
        setQuestionnaireResponse: mockSetQuestionnaireResponse,
      }),
    }
  ),
}));

const createTestConfig = (overrides?: Partial<QuestionnaireConfig>): QuestionnaireConfig => ({
  id: 'test-config',
  gender: 'male',
  questions: [
    {
      id: 'q1',
      question: 'Qual e o seu estilo?',
      type: 'image-grid',
      options: [
        { value: 'classic', label: 'Classico' },
        { value: 'modern', label: 'Moderno' },
      ],
      required: true,
    },
    {
      id: 'q2',
      question: 'Tipo de cabelo?',
      type: 'icon-cards',
      options: [
        { value: 'liso', label: 'Liso' },
        { value: 'ondulado', label: 'Ondulado' },
        { value: 'calvo', label: 'Calvo' },
      ],
      required: true,
    },
    {
      id: 'q3',
      question: 'Preocupacoes com cabelo?',
      type: 'multi-select-chips',
      options: [
        { value: 'queda', label: 'Queda' },
        { value: 'caspa', label: 'Caspa' },
      ],
      required: true,
      skipCondition: { questionId: 'q2', value: 'calvo' },
    },
  ],
  ...overrides,
});

describe('useQuestionnaire', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSetQuestionnaireResponse.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with first question as current', () => {
    const config = createTestConfig();
    const { result } = renderHook(() => useQuestionnaire(config));
    expect(result.current.currentQuestion.id).toBe('q1');
    expect(result.current.currentIndex).toBe(0);
  });

  it('setAnswer stores answer for current question', () => {
    const config = createTestConfig();
    const { result } = renderHook(() => useQuestionnaire(config));

    act(() => {
      result.current.setAnswer('q1', 'classic');
    });

    expect(result.current.answers.get('q1')).toBe('classic');
  });

  it('goNext advances to next question', () => {
    const config = createTestConfig();
    const { result } = renderHook(() => useQuestionnaire(config));

    act(() => {
      result.current.setAnswer('q1', 'classic');
    });

    act(() => {
      result.current.goNext();
    });

    expect(result.current.currentQuestion.id).toBe('q2');
    expect(result.current.currentIndex).toBe(1);
  });

  it('goBack returns to previous question', () => {
    const config = createTestConfig();
    const { result } = renderHook(() => useQuestionnaire(config));

    act(() => {
      result.current.setAnswer('q1', 'classic');
    });
    act(() => {
      result.current.goNext();
    });
    act(() => {
      result.current.goBack();
    });

    expect(result.current.currentQuestion.id).toBe('q1');
  });

  it('goBack on first question does nothing', () => {
    const config = createTestConfig();
    const { result } = renderHook(() => useQuestionnaire(config));

    act(() => {
      result.current.goBack();
    });

    expect(result.current.currentQuestion.id).toBe('q1');
    expect(result.current.currentIndex).toBe(0);
  });

  it('auto-advance triggers goNext after 300ms delay', () => {
    const config = createTestConfig();
    const { result } = renderHook(() => useQuestionnaire(config));

    act(() => {
      result.current.setAnswer('q1', 'classic');
    });

    // Before 300ms, should still be on q1
    expect(result.current.currentQuestion.id).toBe('q1');

    // Advance timer by 300ms
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.currentQuestion.id).toBe('q2');
  });

  it('progress reflects current position vs total questions', () => {
    const config = createTestConfig();
    const { result } = renderHook(() => useQuestionnaire(config));

    // First question of 3 = ~33%
    expect(result.current.progress).toBeCloseTo(33.33, 0);

    act(() => {
      result.current.setAnswer('q1', 'classic');
    });
    act(() => {
      result.current.goNext();
    });

    // Second question of 3 = ~67%
    expect(result.current.progress).toBeCloseTo(66.67, 0);
  });

  it('isFirstQuestion is true on first question only', () => {
    const config = createTestConfig();
    const { result } = renderHook(() => useQuestionnaire(config));

    expect(result.current.isFirstQuestion).toBe(true);

    act(() => {
      result.current.setAnswer('q1', 'classic');
    });
    act(() => {
      result.current.goNext();
    });

    expect(result.current.isFirstQuestion).toBe(false);
  });

  it('isLastQuestion is true on last question only', () => {
    const config = createTestConfig();
    const { result } = renderHook(() => useQuestionnaire(config));

    expect(result.current.isLastQuestion).toBe(false);

    // Navigate to q2
    act(() => {
      result.current.setAnswer('q1', 'classic');
    });
    act(() => {
      result.current.goNext();
    });

    // Navigate to q3
    act(() => {
      result.current.setAnswer('q2', 'liso');
    });
    act(() => {
      result.current.goNext();
    });

    expect(result.current.isLastQuestion).toBe(true);
  });

  it('conditional skip: question with met skipCondition is skipped on goNext', () => {
    const config = createTestConfig();
    const { result } = renderHook(() => useQuestionnaire(config));

    // Answer q1
    act(() => {
      result.current.setAnswer('q1', 'classic');
    });
    act(() => {
      result.current.goNext();
    });

    // Answer q2 with 'calvo' -- q3 should be skipped
    act(() => {
      result.current.setAnswer('q2', 'calvo');
    });
    act(() => {
      result.current.goNext();
    });

    // Should have skipped q3 and be at the end (isComplete)
    expect(result.current.isComplete).toBe(true);
  });

  it('conditional skip: skipped question is skipped on goBack', () => {
    const config = createTestConfig({
      questions: [
        {
          id: 'q1',
          question: 'Question 1',
          type: 'image-grid',
          options: [{ value: 'a', label: 'A' }],
          required: true,
        },
        {
          id: 'q2',
          question: 'Question 2',
          type: 'image-grid',
          options: [
            { value: 'skip', label: 'Skip' },
            { value: 'noskip', label: 'No Skip' },
          ],
          required: true,
        },
        {
          id: 'q3',
          question: 'Question 3 (skippable)',
          type: 'image-grid',
          options: [{ value: 'c', label: 'C' }],
          required: true,
          skipCondition: { questionId: 'q2', value: 'skip' },
        },
        {
          id: 'q4',
          question: 'Question 4',
          type: 'image-grid',
          options: [{ value: 'd', label: 'D' }],
          required: true,
        },
      ],
    });

    const { result } = renderHook(() => useQuestionnaire(config));

    // Go to q2
    act(() => {
      result.current.setAnswer('q1', 'a');
    });
    act(() => {
      result.current.goNext();
    });

    // Answer q2 with 'skip', then go next (q3 should be skipped, land on q4)
    act(() => {
      result.current.setAnswer('q2', 'skip');
    });
    act(() => {
      result.current.goNext();
    });

    expect(result.current.currentQuestion.id).toBe('q4');

    // Now go back -- should skip q3 and go to q2
    act(() => {
      result.current.goBack();
    });

    expect(result.current.currentQuestion.id).toBe('q2');
  });

  it('conditional skip: progress calculation excludes skipped questions', () => {
    const config = createTestConfig();
    const { result } = renderHook(() => useQuestionnaire(config));

    // Answer q1
    act(() => {
      result.current.setAnswer('q1', 'classic');
    });
    act(() => {
      result.current.goNext();
    });

    // Answer q2 with 'calvo' (triggers skip for q3)
    act(() => {
      result.current.setAnswer('q2', 'calvo');
    });

    // Progress should now be based on 2 total questions (q3 skipped)
    // q2 is 2nd of 2 = 100%
    expect(result.current.progress).toBe(100);
  });

  it('multi-select answer stores array of values', () => {
    const config = createTestConfig();
    const { result } = renderHook(() => useQuestionnaire(config));

    act(() => {
      result.current.setAnswer('q1', ['classic', 'modern']);
    });

    expect(result.current.answers.get('q1')).toEqual(['classic', 'modern']);
  });

  it('slider answer stores numeric value', () => {
    const config = createTestConfig({
      questions: [
        {
          id: 'q-slider',
          question: 'Comprimento?',
          type: 'slider',
          options: [],
          sliderMin: 0,
          sliderMax: 100,
          sliderStep: 10,
          sliderUnit: 'cm',
          required: true,
        },
      ],
    });

    const { result } = renderHook(() => useQuestionnaire(config));

    act(() => {
      result.current.setAnswer('q-slider', 50);
    });

    expect(result.current.answers.get('q-slider')).toBe(50);
  });

  it('isComplete is true after answering last question', () => {
    const config = createTestConfig({
      questions: [
        {
          id: 'q1',
          question: 'Only question',
          type: 'image-grid',
          options: [{ value: 'a', label: 'A' }],
          required: true,
        },
      ],
    });

    const { result } = renderHook(() => useQuestionnaire(config));

    expect(result.current.isComplete).toBe(false);

    act(() => {
      result.current.setAnswer('q1', 'a');
    });
    act(() => {
      result.current.goNext();
    });

    expect(result.current.isComplete).toBe(true);
  });

  it('resets to first question when config changes', () => {
    const config1 = createTestConfig();
    const config2 = createTestConfig({
      id: 'config-2',
      gender: 'female',
      questions: [
        {
          id: 'fq1',
          question: 'Female Q1',
          type: 'image-grid',
          options: [{ value: 'x', label: 'X' }],
          required: true,
        },
      ],
    });

    const { result, rerender } = renderHook(
      ({ config }) => useQuestionnaire(config),
      { initialProps: { config: config1 } }
    );

    // Navigate to q2
    act(() => {
      result.current.setAnswer('q1', 'classic');
    });
    act(() => {
      result.current.goNext();
    });

    expect(result.current.currentQuestion.id).toBe('q2');

    // Change config
    rerender({ config: config2 });

    expect(result.current.currentQuestion.id).toBe('fq1');
    expect(result.current.currentIndex).toBe(0);
  });
});
