'use client';

import { useCallback, useRef } from 'react';
import type { QuestionConfig } from '@/types/questionnaire';
import { Check } from 'lucide-react';
import { resolveIcon } from './icon-resolver';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface IconCardsProps {
  question: QuestionConfig;
  value: string | null;
  onChange: (value: string) => void;
}

export function IconCards({ question, value, onChange }: IconCardsProps) {
  const prefersReducedMotion = useReducedMotion();

  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, currentIndex: number) => {
      const options = question.options;
      let nextIndex: number | null = null;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          nextIndex = (currentIndex + 1) % options.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          nextIndex = (currentIndex - 1 + options.length) % options.length;
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          onChange(options[currentIndex].value);
          return;
        default:
          return;
      }

      if (nextIndex !== null) {
        onChange(options[nextIndex].value);
        const buttons = containerRef.current?.querySelectorAll('[role="radio"]');
        if (buttons && buttons[nextIndex]) {
          (buttons[nextIndex] as HTMLElement).focus();
        }
      }
    },
    [onChange, question.options]
  );

  return (
    <div
      ref={containerRef}
      data-type="icon-cards"
      role="radiogroup"
      aria-label={question.question}
      className="flex flex-row gap-3 overflow-x-auto"
    >
      {question.options.map((option, index) => {
        const isSelected = value === option.value;
        const IconComponent = resolveIcon(option.icon);

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            data-selected={isSelected ? 'true' : 'false'}
            tabIndex={isSelected || (value === null && index === 0) ? 0 : -1}
            className={`
              flex flex-col items-center justify-center gap-2 rounded-xl p-4
              min-h-[48px] min-w-[80px] flex-shrink-0 transition-all duration-200 ease-out
              ${
                isSelected
                  ? `border-2 border-accent bg-accent/10${prefersReducedMotion ? '' : ' scale-105'}`
                  : 'border-2 border-border bg-card hover:border-accent/50'
              }
            `}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
          >
            {IconComponent && (
              <IconComponent className="h-6 w-6 text-accent" />
            )}
            {isSelected && <Check className="h-4 w-4 text-accent" />}
            <span className="text-sm font-medium text-foreground">
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
