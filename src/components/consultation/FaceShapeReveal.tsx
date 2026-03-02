'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { FaceAnalysisOutput } from '@/lib/ai/schemas';

interface FaceShapeRevealProps {
  faceAnalysis: FaceAnalysisOutput;
  onContinue: () => void;
}

const FACE_SHAPE_LABELS: Record<FaceAnalysisOutput['faceShape'], string> = {
  oval: 'Oval',
  round: 'Redondo',
  square: 'Quadrado',
  oblong: 'Oblongo',
  heart: 'Coração',
  diamond: 'Diamante',
  triangle: 'Triangular',
};

const FACE_SHAPE_DESCRIPTIONS: Record<FaceAnalysisOutput['faceShape'], string> = {
  oval: 'O rosto oval é considerado o formato mais versátil. As maçãs do rosto são ligeiramente mais largas que a testa e o queixo é levemente arredondado. Praticamente qualquer estilo de cabelo fica bem neste formato.',
  round: 'O rosto redondo tem largura e comprimento semelhantes, com bochechas cheias e queixo arredondado. Cortes que adicionam altura no topo e reduzem volume nas laterais criam um visual mais alongado.',
  square: 'O rosto quadrado é caracterizado por uma testa larga, maçãs do rosto e queixo com larguras semelhantes, com ângulos marcados. Cortes com volume no topo e laterais mais curtas equilibram as proporções.',
  oblong: 'O rosto oblongo é mais comprido do que largo, com testa, maçãs do rosto e queixo de larguras semelhantes. Cortes com volume nas laterais e franja ajudam a equilibrar o comprimento do rosto.',
  heart: 'O rosto em coração tem testa mais larga que o queixo, com um queixo estreito e pontudo. Cortes com volume abaixo das orelhas e franja lateral equilibram as proporções superiores e inferiores.',
  diamond: 'O rosto diamante tem maçãs do rosto largas, com testa e queixo estreitos. Cortes com volume na testa e no queixo criam equilíbrio com as maçãs proeminentes.',
  triangle: 'O rosto triangular tem queixo mais largo que a testa. Cortes com volume no topo e laterais mais curtas na parte inferior equilibram a base mais larga.',
};

export function FaceShapeReveal({ faceAnalysis, onContinue }: FaceShapeRevealProps) {
  const shouldReduceMotion = useReducedMotion();
  const label = FACE_SHAPE_LABELS[faceAnalysis.faceShape];
  const description = FACE_SHAPE_DESCRIPTIONS[faceAnalysis.faceShape];
  const confidencePercent = Math.round(faceAnalysis.confidence * 100);

  const revealAnimation = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, ease: 'easeOut' as const },
      };

  const buttonAnimation = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, ease: 'easeOut' as const, delay: 0.2 },
      };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        {/* Face Shape Badge */}
        <motion.div {...revealAnimation}>
          <div className="mb-2 inline-flex items-center rounded-lg bg-primary px-6 py-3">
            <span className="text-3xl font-bold text-primary-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Rosto {label}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {confidencePercent}% de certeza
          </p>
          <p className="mt-4 text-base text-foreground leading-relaxed">
            {description}
          </p>
        </motion.div>

        {/* Continue Button (staggered 200ms delay) */}
        <motion.div className="mt-8" {...buttonAnimation}>
          <button
            onClick={onContinue}
            className="w-full rounded-xl bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Continuar
          </button>
        </motion.div>
      </div>
    </div>
  );
}
