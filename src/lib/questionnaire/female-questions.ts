import type { QuestionnaireConfig } from '@/types/questionnaire';

export const femaleQuestionnaireConfig: QuestionnaireConfig = {
  id: 'female-questionnaire',
  gender: 'female',
  questions: [
    {
      id: 'style-preference',
      question: 'Qual estilo combina mais com você?',
      type: 'image-grid',
      options: [
        { value: 'romantico', label: 'Romântico' },
        { value: 'moderno', label: 'Moderno' },
        { value: 'natural', label: 'Natural' },
        { value: 'sofisticado', label: 'Sofisticado' },
      ],
      required: true,
    },
    {
      id: 'hair-type',
      question: 'Como é o seu cabelo?',
      type: 'icon-cards',
      options: [
        { value: 'liso', label: 'Liso' },
        { value: 'ondulado', label: 'Ondulado' },
        { value: 'cacheado', label: 'Cacheado' },
        { value: 'crespo', label: 'Crespo' },
      ],
      required: true,
    },
    {
      id: 'current-length',
      question: 'Qual o comprimento atual do seu cabelo?',
      type: 'icon-cards',
      options: [
        { value: 'curto', label: 'Curto' },
        { value: 'medio', label: 'Médio' },
        { value: 'longo', label: 'Longo' },
        { value: 'muito-longo', label: 'Muito longo' },
      ],
      required: true,
    },
  ],
};
