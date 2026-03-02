'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { QuestionConfig, QuestionnaireConfig } from '@/types/questionnaire';
import { useConsultationStore } from '@/stores/consultation';

function shouldSkip(
  question: QuestionConfig,
  answers: Map<string, string | string[] | number>
): boolean {
  if (!question.skipCondition) return false;
  const { questionId, value } = question.skipCondition;
  const answer = answers.get(questionId);
  if (answer === undefined) return false;
  if (Array.isArray(value)) {
    return value.includes(String(answer));
  }
  return String(answer) === String(value);
}

export interface UseQuestionnaireReturn {
  currentQuestion: QuestionConfig;
  currentIndex: number;
  progress: number;
  totalActiveQuestions: number;
  currentActiveIndex: number;
  answers: Map<string, string | string[] | number>;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  goNext: () => void;
  goBack: () => void;
  setAnswer: (questionId: string, value: string | string[] | number) => void;
  isComplete: boolean;
}

export function useQuestionnaire(config: QuestionnaireConfig): UseQuestionnaireReturn {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string | string[] | number>>(new Map());
  const [isComplete, setIsComplete] = useState(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setQuestionnaireResponse = useConsultationStore(
    (state) => state.setQuestionnaireResponse
  );

  // Track config identity for reset
  const configIdRef = useRef(config.id);

  useEffect(() => {
    if (configIdRef.current !== config.id) {
      configIdRef.current = config.id;
      setCurrentIndex(0);
      setAnswers(new Map());
      setIsComplete(false);
    }
  }, [config.id]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) {
        clearTimeout(autoAdvanceTimer.current);
      }
    };
  }, []);

  const questions = config.questions;

  // Get non-skipped questions based on current answers
  const activeQuestions = useMemo(() => {
    return questions.filter((q) => !shouldSkip(q, answers));
  }, [questions, answers]);

  // Find the current question in the active list
  const currentActiveIndex = useMemo(() => {
    // currentIndex tracks position in the full questions array
    // Map it to the active (non-skipped) questions
    let activeIdx = 0;
    for (let i = 0; i < questions.length; i++) {
      if (shouldSkip(questions[i], answers)) continue;
      if (i === currentIndex) return activeIdx;
      activeIdx++;
    }
    return Math.min(activeIdx, activeQuestions.length - 1);
  }, [currentIndex, questions, answers, activeQuestions.length]);

  const currentQuestion = questions[currentIndex] || questions[0];

  const isFirstQuestion = currentActiveIndex === 0;
  const isLastQuestion = currentActiveIndex === activeQuestions.length - 1;

  const progress = useMemo(() => {
    if (activeQuestions.length === 0) return 0;
    return Math.round(((currentActiveIndex + 1) / activeQuestions.length) * 10000) / 100;
  }, [currentActiveIndex, activeQuestions.length]);

  const findNextNonSkippedIndex = useCallback(
    (fromIndex: number, answersMap: Map<string, string | string[] | number>): number => {
      for (let i = fromIndex + 1; i < questions.length; i++) {
        if (!shouldSkip(questions[i], answersMap)) {
          return i;
        }
      }
      return -1; // No more questions
    },
    [questions]
  );

  const findPrevNonSkippedIndex = useCallback(
    (fromIndex: number): number => {
      for (let i = fromIndex - 1; i >= 0; i--) {
        if (!shouldSkip(questions[i], answers)) {
          return i;
        }
      }
      return -1; // Already at start
    },
    [questions, answers]
  );

  const goNext = useCallback(() => {
    if (isComplete) return;

    const nextIndex = findNextNonSkippedIndex(currentIndex, answers);
    if (nextIndex === -1) {
      // No more questions -- mark complete
      setIsComplete(true);
    } else {
      setCurrentIndex(nextIndex);
    }
  }, [currentIndex, answers, findNextNonSkippedIndex, isComplete]);

  const goBack = useCallback(() => {
    const prevIndex = findPrevNonSkippedIndex(currentIndex);
    if (prevIndex !== -1) {
      setCurrentIndex(prevIndex);
      setIsComplete(false);
    }
  }, [currentIndex, findPrevNonSkippedIndex]);

  const setAnswer = useCallback(
    (questionId: string, value: string | string[] | number) => {
      setAnswers((prev) => {
        const next = new Map(prev);
        next.set(questionId, value);
        return next;
      });

      // Sync to Zustand store
      setQuestionnaireResponse(questionId, value);

      // Clear any existing auto-advance timer
      if (autoAdvanceTimer.current) {
        clearTimeout(autoAdvanceTimer.current);
        autoAdvanceTimer.current = null;
      }

      // Auto-advance for single-select types only (not multi-select-chips or slider)
      const question = questions.find((q) => q.id === questionId);
      if (question && question.type !== 'multi-select-chips' && question.type !== 'slider') {
        autoAdvanceTimer.current = setTimeout(() => {
          // Need to re-evaluate with updated answers for skip logic
          setAnswers((currentAnswers) => {
            const nextIndex = findNextNonSkippedIndex(currentIndex, currentAnswers);
            if (nextIndex === -1) {
              setIsComplete(true);
            } else {
              setCurrentIndex(nextIndex);
            }
            return currentAnswers;
          });
        }, 300);
      }
    },
    [questions, currentIndex, findNextNonSkippedIndex, setQuestionnaireResponse]
  );

  return {
    currentQuestion,
    currentIndex,
    progress,
    totalActiveQuestions: activeQuestions.length,
    currentActiveIndex,
    answers,
    isFirstQuestion,
    isLastQuestion,
    goNext,
    goBack,
    setAnswer,
    isComplete,
  };
}
