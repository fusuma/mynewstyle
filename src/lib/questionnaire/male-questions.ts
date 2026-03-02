import type { QuestionnaireConfig } from '@/types/questionnaire';

export const maleQuestionnaireConfig: QuestionnaireConfig = {
  id: 'male-questionnaire',
  gender: 'male',
  questions: [
    {
      id: 'style-preference',
      question: 'Qual é o seu estilo?',
      type: 'image-grid',
      options: [
        { value: 'classico', label: 'Clássico' },
        { value: 'moderno', label: 'Moderno' },
        { value: 'ousado', label: 'Ousado' },
        { value: 'minimalista', label: 'Minimalista' },
      ],
      required: true,
    },
    {
      id: 'hair-time',
      question: 'Quanto tempo você dedica ao cabelo?',
      type: 'slider',
      options: [],
      sliderMin: 0,
      sliderMax: 15,
      sliderStep: 1,
      sliderUnit: 'min',
      required: true,
    },
    {
      id: 'work-environment',
      question: 'Qual é o seu ambiente profissional?',
      type: 'icon-cards',
      options: [
        { value: 'corporativo', label: 'Corporativo', icon: 'Briefcase' },
        { value: 'criativo', label: 'Criativo', icon: 'Palette' },
        { value: 'casual', label: 'Casual', icon: 'Coffee' },
        { value: 'remoto', label: 'Remoto', icon: 'Monitor' },
      ],
      required: true,
    },
    {
      id: 'hair-type',
      question: 'O seu cabelo é...',
      type: 'image-grid',
      options: [
        { value: 'liso', label: 'Liso' },
        { value: 'ondulado', label: 'Ondulado' },
        { value: 'cacheado', label: 'Cacheado' },
        { value: 'crespo', label: 'Crespo' },
        { value: 'calvo', label: 'Pouco cabelo/Calvo' },
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
    },
    {
      id: 'concerns',
      question: 'Alguma preocupação com o cabelo?',
      type: 'multi-select-chips',
      options: [
        { value: 'entradas', label: 'Entradas' },
        { value: 'fios-brancos', label: 'Fios brancos' },
        { value: 'cabelo-fino', label: 'Cabelo fino' },
        { value: 'nenhuma', label: 'Nenhuma' },
      ],
      required: true,
      skipCondition: {
        questionId: 'hair-type',
        value: 'calvo',
      },
    },
  ],
};
