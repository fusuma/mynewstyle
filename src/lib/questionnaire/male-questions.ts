import type { QuestionnaireConfig } from '@/types/questionnaire';

export const maleQuestionnaireConfig: QuestionnaireConfig = {
  id: 'male-questionnaire',
  gender: 'male',
  questions: [
    {
      id: 'style-preference',
      question: 'Qual estilo combina mais com você?',
      type: 'image-grid',
      options: [
        { value: 'classico', label: 'Clássico' },
        { value: 'moderno', label: 'Moderno' },
        { value: 'despojado', label: 'Despojado' },
        { value: 'elegante', label: 'Elegante' },
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
        { value: 'calvo', label: 'Calvo' },
      ],
      required: true,
    },
    {
      id: 'beard',
      question: 'Qual estilo de barba você prefere?',
      type: 'image-grid',
      options: [
        { value: 'sem-barba', label: 'Sem barba' },
        { value: 'curta', label: 'Barba curta' },
        { value: 'media', label: 'Barba média' },
        { value: 'longa', label: 'Barba longa' },
      ],
      required: true,
      skipCondition: {
        questionId: 'hair-type',
        value: 'calvo',
      },
    },
  ],
};
