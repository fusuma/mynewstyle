'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';
import type { FaceAnalysisOutput } from '@/lib/ai/schemas';
import {
  FACE_SHAPE_LABELS,
  FACE_SHAPE_DESCRIPTIONS,
} from '@/lib/consultation/face-shape-labels';
import { FaceShapeOverlay } from './FaceShapeOverlay';
import { ProportionAnalysis } from './ProportionAnalysis';

interface FaceShapeAnalysisSectionProps {
  faceAnalysis: FaceAnalysisOutput;
  photoPreview: string | null;
}

export function FaceShapeAnalysisSection({
  faceAnalysis,
  photoPreview,
}: FaceShapeAnalysisSectionProps) {
  const shouldReduceMotion = useReducedMotion();

  const label = FACE_SHAPE_LABELS[faceAnalysis.faceShape];
  const description = FACE_SHAPE_DESCRIPTIONS[faceAnalysis.faceShape];
  const confidencePercent = Math.round(faceAnalysis.confidence * 100);

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.15,
      },
    },
  };

  const itemVariants: Variants = shouldReduceMotion
    ? {
        hidden: {},
        visible: {},
      }
    : {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
      };

  return (
    <motion.section
      className="w-full px-4 py-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      aria-label="Análise do formato do rosto"
    >
      <div className="mx-auto max-w-lg space-y-6">
        {/* Heading */}
        <motion.div variants={itemVariants}>
          <h1 className="text-center text-lg font-semibold text-muted-foreground">
            Formato do Rosto
          </h1>
        </motion.div>

        {/* Face shape badge */}
        <motion.div className="flex flex-col items-center gap-2" variants={itemVariants}>
          <div className="inline-flex items-center rounded-lg bg-primary px-6 py-3">
            <span className="font-display text-3xl font-bold text-primary-foreground">
              Rosto {label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{confidencePercent}% de certeza</p>
        </motion.div>

        {/* Photo with overlay */}
        {photoPreview && (
          <motion.div variants={itemVariants}>
            <FaceShapeOverlay
              photoPreview={photoPreview}
              faceShape={faceAnalysis.faceShape}
            />
          </motion.div>
        )}

        {/* Description */}
        <motion.p
          className="text-base leading-relaxed text-foreground"
          variants={itemVariants}
        >
          {description}
        </motion.p>

        {/* Proportion analysis */}
        <motion.div variants={itemVariants}>
          <ProportionAnalysis proportions={faceAnalysis.proportions} />
        </motion.div>
      </div>
    </motion.section>
  );
}
