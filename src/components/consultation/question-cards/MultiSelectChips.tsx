'use client';

import type { QuestionConfig } from '@/types/questionnaire';
import { Check } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface MultiSelectChipsProps {
  question: QuestionConfig;
  value: string[];
  onChange: (value: string[]) => void;
}

export function MultiSelectChips({ question, value, onChange }: MultiSelectChipsProps) {
  const prefersReducedMotion = useReducedMotion();

  const handleToggle = (chipValue: string) => {
    if (value.includes(chipValue)) {
      onChange(value.filter((v) => v !== chipValue));
    } else {
      onChange([...value, chipValue]);
    }
  };

  return (
    <div
      data-type="multi-select-chips"
      role="group"
      aria-label={question.question}
      className="flex flex-wrap gap-2"
    >
      {question.options.map((option) => {
        const isSelected = value.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            role="checkbox"
            aria-checked={isSelected}
            data-selected={isSelected ? 'true' : 'false'}
            className={`
              flex items-center gap-2 rounded-full px-4 py-2
              min-h-[48px] transition-all duration-200 ease-out
              ${
                isSelected
                  ? `border-2 border-accent bg-accent/10${prefersReducedMotion ? '' : ' scale-105'}`
                  : 'border-2 border-border bg-card hover:border-accent/50'
              }
            `}
            onClick={() => handleToggle(option.value)}
          >
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
