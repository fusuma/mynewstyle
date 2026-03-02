import type { FaceAnalysisOutput } from '@/lib/ai/schemas';

export const FACE_SHAPE_LABELS: Record<FaceAnalysisOutput['faceShape'], string> = {
  oval: 'Oval',
  round: 'Redondo',
  square: 'Quadrado',
  oblong: 'Oblongo',
  heart: 'Coração',
  diamond: 'Diamante',
  triangle: 'Triangular',
};

export const FACE_SHAPE_DESCRIPTIONS: Record<FaceAnalysisOutput['faceShape'], string> = {
  oval: 'O rosto oval é considerado o formato mais versátil. As maçãs do rosto são ligeiramente mais largas que a testa e o queixo é levemente arredondado. Praticamente qualquer estilo de cabelo fica bem neste formato.',
  round: 'O rosto redondo tem largura e comprimento semelhantes, com bochechas cheias e queixo arredondado. Cortes que adicionam altura no topo e reduzem volume nas laterais criam um visual mais alongado.',
  square: 'O rosto quadrado é caracterizado por uma testa larga, maçãs do rosto e queixo com larguras semelhantes, com ângulos marcados. Cortes com volume no topo e laterais mais curtas equilibram as proporções.',
  oblong: 'O rosto oblongo é mais comprido do que largo, com testa, maçãs do rosto e queixo de larguras semelhantes. Cortes com volume nas laterais e franja ajudam a equilibrar o comprimento do rosto.',
  heart: 'O rosto em coração tem testa mais larga que o queixo, com um queixo estreito e pontudo. Cortes com volume abaixo das orelhas e franja lateral equilibram as proporções superiores e inferiores.',
  diamond: 'O rosto diamante tem maçãs do rosto largas, com testa e queixo estreitos. Cortes com volume na testa e no queixo criam equilíbrio com as maçãs proeminentes.',
  triangle: 'O rosto triangular tem queixo mais largo que a testa. Cortes com volume no topo e laterais mais curtas na parte inferior equilibram a base mais larga.',
};
