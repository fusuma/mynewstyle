'use client';

import type { QuestionConfig } from '@/types/questionnaire';
import { Check } from 'lucide-react';

interface QuestionInputProps {
  question: QuestionConfig;
  value: string | string[] | number | null;
  onChange: (value: string | string[] | number) => void;
}

export function QuestionInput({ question, value, onChange }: QuestionInputProps) {
  switch (question.type) {
    case 'image-grid':
      return (
        <ImageGrid
          question={question}
          value={value as string | null}
          onChange={onChange}
        />
      );
    case 'icon-cards':
      return (
        <IconCards
          question={question}
          value={value as string | null}
          onChange={onChange}
        />
      );
    case 'slider':
      return (
        <SliderInput
          question={question}
          value={value as number | null}
          onChange={onChange}
        />
      );
    case 'multi-select-chips':
      return (
        <MultiSelectChips
          question={question}
          value={(value as string[]) ?? []}
          onChange={onChange}
        />
      );
    default:
      return null;
  }
}

function ImageGrid({
  question,
  value,
  onChange,
}: {
  question: QuestionConfig;
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div
      data-type="image-grid"
      role="radiogroup"
      aria-label={question.question}
      className="grid grid-cols-2 gap-3"
    >
      {question.options.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            data-selected={isSelected ? 'true' : 'false'}
            className={`
              flex flex-col items-center justify-center gap-2 rounded-xl p-4
              min-h-[48px] transition-all duration-200
              ${
                isSelected
                  ? 'border-2 border-accent bg-accent/10 scale-105'
                  : 'border-2 border-border bg-card hover:border-accent/50'
              }
            `}
            onClick={() => onChange(option.value)}
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

function IconCards({
  question,
  value,
  onChange,
}: {
  question: QuestionConfig;
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <div
      data-type="icon-cards"
      role="radiogroup"
      aria-label={question.question}
      className="flex flex-row gap-3 overflow-x-auto"
    >
      {question.options.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            data-selected={isSelected ? 'true' : 'false'}
            className={`
              flex flex-col items-center justify-center gap-2 rounded-xl p-4
              min-h-[48px] min-w-[80px] flex-shrink-0 transition-all duration-200
              ${
                isSelected
                  ? 'border-2 border-accent bg-accent/10 scale-105'
                  : 'border-2 border-border bg-card hover:border-accent/50'
              }
            `}
            onClick={() => onChange(option.value)}
          >
            {option.icon && (
              <span className="text-xl">{option.icon}</span>
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

function SliderInput({
  question,
  value,
  onChange,
}: {
  question: QuestionConfig;
  value: number | null;
  onChange: (value: number) => void;
}) {
  const min = question.sliderMin ?? 0;
  const max = question.sliderMax ?? 100;
  const step = question.sliderStep ?? 1;
  const unit = question.sliderUnit ?? '';
  const currentValue = value ?? min;

  return (
    <div data-type="slider" className="flex flex-col gap-4 px-4">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{min}{unit}</span>
        <span className="text-lg font-semibold text-foreground">
          {currentValue}{unit}
        </span>
        <span>{max}{unit}</span>
      </div>
      <input
        type="range"
        role="slider"
        aria-label={question.question}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={currentValue}
        aria-valuetext={`${currentValue}${unit}`}
        min={min}
        max={max}
        step={step}
        value={currentValue}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-accent min-h-[48px]"
      />
    </div>
  );
}

function MultiSelectChips({
  question,
  value,
  onChange,
}: {
  question: QuestionConfig;
  value: string[];
  onChange: (value: string[]) => void;
}) {
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
              min-h-[48px] transition-all duration-200
              ${
                isSelected
                  ? 'border-2 border-accent bg-accent/10 scale-105'
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
