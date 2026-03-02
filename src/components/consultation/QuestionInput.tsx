'use client';

import type { QuestionConfig } from '@/types/questionnaire';
import { ImageGrid, IconCards, SliderInput, MultiSelectChips } from './question-cards';

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
