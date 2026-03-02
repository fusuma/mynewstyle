import { maleQuestionnaireConfig } from './male-questions';
import { femaleQuestionnaireConfig } from './female-questions';
import type { QuestionnaireConfig } from '@/types/questionnaire';

export function getQuestionnaireConfig(gender: 'male' | 'female'): QuestionnaireConfig {
  return gender === 'male' ? maleQuestionnaireConfig : femaleQuestionnaireConfig;
}

export { maleQuestionnaireConfig, femaleQuestionnaireConfig };
