import type { QuestionnaireConfig } from '@/types/questionnaire';

export const femaleQuestionnaireConfig: QuestionnaireConfig = {
  id: 'female-questionnaire',
  gender: 'female',
  questions: [
    {
      id: 'style-preference',
      question: 'Qual é o seu estilo?',
      type: 'image-grid',
      options: [
        { value: 'classico', label: 'Clássico' },
        { value: 'moderno', label: 'Moderno' },
        { value: 'ousado', label: 'Ousado' },
        { value: 'natural', label: 'Natural' },
      ],
      required: true,
    },
    {
      id: 'hair-time',
      question: 'Quanto tempo você dedica ao cabelo?',
      type: 'slider',
      options: [],
      sliderMin: 0,
      sliderMax: 30,
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
      ],
      required: true,
    },
    {
      id: 'current-length',
      question: 'Qual o comprimento atual do seu cabelo?',
      type: 'image-grid',
      options: [
        { value: 'muito-curto', label: 'Muito curto' },
        { value: 'curto', label: 'Curto' },
        { value: 'medio', label: 'Médio' },
        { value: 'longo', label: 'Longo' },
      ],
      required: true,
    },
    {
      id: 'desired-length',
      question: 'Qual comprimento você deseja?',
      type: 'image-grid',
      options: [
        { value: 'mais-curto', label: 'Mais curto' },
        { value: 'manter', label: 'Manter' },
        { value: 'mais-longo', label: 'Mais longo' },
        { value: 'sem-preferencia', label: 'Sem preferência' },
      ],
      required: true,
    },
    {
      id: 'concerns',
      question: 'Alguma preocupação com o cabelo?',
      type: 'multi-select-chips',
      options: [
        { value: 'frizz', label: 'Frizz' },
        { value: 'pontas-duplas', label: 'Pontas duplas' },
        { value: 'volume', label: 'Volume' },
        { value: 'fios-brancos', label: 'Fios brancos' },
        { value: 'nenhuma', label: 'Nenhuma' },
      ],
      required: true,
    },
  ],
};
