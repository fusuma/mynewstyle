'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuestionnaire } from '@/hooks/useQuestionnaire';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { QuestionInput } from '@/components/consultation/QuestionInput';
import type { QuestionnaireConfig } from '@/types/questionnaire';
import type { QuestionnaireResponses } from '@/stores/consultation';

interface QuestionnaireFlowProps {
  config: QuestionnaireConfig;
  onComplete: (responses: QuestionnaireResponses) => void;
  /** Called whenever the active question index changes (0-based). Used for analytics. */
  onProgress?: (currentIndex: number) => void;
}

const AVG_SECONDS_PER_QUESTION = 10;

export function getEncouragementMessage(progress: number): string | null {
  if (progress <= 20) return 'Vamos la!';
  if (progress <= 50) return null;
  if (progress < 80) return 'Muito bem, continue!';
  if (progress < 100) return 'Quase la!';
  return null;
}

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction < 0 ? 200 : -200,
    opacity: 0,
  }),
};

export function QuestionnaireFlow({ config, onComplete, onProgress }: QuestionnaireFlowProps) {
  const {
    currentQuestion,
    progress,
    totalActiveQuestions,
    currentActiveIndex,
    answers,
    isFirstQuestion,
    isLastQuestion,
    goNext,
    goBack,
    setAnswer,
    isComplete,
  } = useQuestionnaire(config);

  const [direction, setDirection] = useState(1);
  const hasCalledComplete = useRef(false);
  const prefersReducedMotion = useReducedMotion();

  // Notify parent of question index changes for analytics (abandoned tracking)
  useEffect(() => {
    onProgress?.(currentActiveIndex);
  }, [currentActiveIndex, onProgress]);

  // Handle completion
  useEffect(() => {
    if (isComplete && !hasCalledComplete.current) {
      hasCalledComplete.current = true;
      const responses: QuestionnaireResponses = {};
      answers.forEach((value, key) => {
        responses[key] = value;
      });
      onComplete(responses);
    }
  }, [isComplete, answers, onComplete]);

  const handleAnswer = useCallback(
    (value: string | string[] | number) => {
      setDirection(1);
      setAnswer(currentQuestion.id, value);
    },
    [currentQuestion.id, setAnswer]
  );

  const handleNext = useCallback(() => {
    setDirection(1);
    goNext();
  }, [goNext]);

  const handleBack = useCallback(() => {
    setDirection(-1);
    goBack();
  }, [goBack]);

  const currentValue = answers.get(currentQuestion.id) ?? null;
  const hasAnswer = currentValue !== null && currentValue !== undefined;

  // Encouragement message based on progress milestones
  const encouragementMessage = getEncouragementMessage(progress);

  // Estimated time remaining (hide on last question)
  const remainingQuestions = totalActiveQuestions - (currentActiveIndex + 1);
  const estimatedSeconds = remainingQuestions * AVG_SECONDS_PER_QUESTION;
  const showEstimatedTime = !isLastQuestion && remainingQuestions > 0;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Progress bar */}
      <div className="w-full px-4 pt-4">
        <div
          data-testid="progress-bar"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso do questionário"
          className="h-2 w-full overflow-hidden rounded-full bg-border"
        >
          <div
            className={`h-full rounded-full bg-accent transition-all ${prefersReducedMotion ? 'duration-0' : 'duration-300'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-1 min-h-[2rem] text-center">
          <div
            data-testid="encouragement-message"
            className="text-xs text-accent"
            aria-live="polite"
          >
            {encouragementMessage}
          </div>
          {showEstimatedTime && (
            <p
              data-testid="estimated-time"
              className="text-xs text-muted-foreground"
            >
              ~{estimatedSeconds} segundos
            </p>
          )}
        </div>
      </div>

      {/* Question area */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-8" aria-live="polite">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={currentQuestion.id}
            data-testid="question-container"
            custom={direction}
            variants={prefersReducedMotion ? undefined : variants}
            initial={prefersReducedMotion ? undefined : 'enter'}
            animate={prefersReducedMotion ? undefined : 'center'}
            exit={prefersReducedMotion ? undefined : 'exit'}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.25, ease: 'easeInOut' }
            }
            className="w-full max-w-md"
          >
            <h2 className="mb-6 text-center text-xl font-semibold text-foreground">
              {currentQuestion.question}
            </h2>

            <QuestionInput
              question={currentQuestion}
              value={currentValue}
              onChange={handleAnswer}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation buttons */}
      <nav className="flex items-center justify-between px-6 pb-8" aria-label="Navegação do questionário">
        {!isFirstQuestion ? (
          <button
            type="button"
            onClick={handleBack}
            aria-label="Voltar para a pergunta anterior"
            className="flex items-center gap-1 rounded-lg px-4 py-3 min-h-[48px] text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </button>
        ) : (
          <div />
        )}

        {(isLastQuestion || currentQuestion.type === 'multi-select-chips' || currentQuestion.type === 'slider') && (
          <button
            type="button"
            onClick={handleNext}
            disabled={!hasAnswer}
            aria-label="Continuar para a próxima pergunta"
            className={`
              flex items-center gap-1 rounded-lg px-6 py-3 min-h-[48px] text-sm font-medium transition-all
              ${
                hasAnswer
                  ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }
            `}
          >
            Continuar
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </nav>
    </div>
  );
}
