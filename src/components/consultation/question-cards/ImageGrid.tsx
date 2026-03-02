'use client';

import { useCallback, useRef } from 'react';
import type { QuestionConfig } from '@/types/questionnaire';
import { Check } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface ImageGridProps {
  question: QuestionConfig;
  value: string | null;
  onChange: (value: string) => void;
}

export function ImageGrid({ question, value, onChange }: ImageGridProps) {
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
        // Focus the next radio button
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
      data-type="image-grid"
      role="radiogroup"
      aria-label={question.question}
      className="grid grid-cols-2 gap-3"
    >
      {question.options.map((option, index) => {
        const isSelected = value === option.value;
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
              min-h-[48px] transition-all duration-200 ease-out
              ${
                isSelected
                  ? `border-2 border-accent bg-accent/10${prefersReducedMotion ? '' : ' scale-105'}`
                  : 'border-2 border-border bg-card hover:border-accent/50'
              }
            `}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
          >
            {/* Image or placeholder area */}
            <div className="w-full aspect-square max-w-[80px] flex items-center justify-center rounded-lg overflow-hidden mb-1">
              {option.imageUrl ? (
                <img
                  src={option.imageUrl}
                  alt={option.label}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-accent/10 text-accent text-2xl font-bold">
                  {option.label.charAt(0)}
                </div>
              )}
            </div>
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
