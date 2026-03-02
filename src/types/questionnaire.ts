export type QuestionType = 'image-grid' | 'slider' | 'icon-cards' | 'multi-select-chips';

export interface QuestionOption {
  value: string;
  label: string;
  icon?: string;
  imageUrl?: string;
}

export interface SkipCondition {
  questionId: string;
  value: string | string[];
}

export interface QuestionConfig {
  id: string;
  question: string;
  type: QuestionType;
  options: QuestionOption[];
  sliderMin?: number;
  sliderMax?: number;
  sliderStep?: number;
  sliderUnit?: string;
  required: boolean;
  skipCondition?: SkipCondition;
}

export interface QuestionnaireConfig {
  id: string;
  gender: 'male' | 'female';
  questions: QuestionConfig[];
}
