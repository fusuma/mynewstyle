'use client';

import type { QuestionConfig } from '@/types/questionnaire';

interface SliderInputProps {
  question: QuestionConfig;
  value: number | null;
  onChange: (value: number) => void;
}

export function SliderInput({ question, value, onChange }: SliderInputProps) {
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
