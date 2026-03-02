'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { FaceAnalysisOutput } from '@/lib/ai/schemas';
import {
  FACE_SHAPE_LABELS,
  FACE_SHAPE_DESCRIPTIONS,
} from '@/lib/consultation/face-shape-labels';

interface FaceShapeRevealProps {
  faceAnalysis: FaceAnalysisOutput;
  onContinue: () => void;
}

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
            <span className="font-display text-3xl font-bold text-primary-foreground">
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
