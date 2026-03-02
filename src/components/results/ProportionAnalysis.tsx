'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { FaceAnalysisOutput } from '@/lib/ai/schemas';

interface ProportionAnalysisProps {
  proportions: FaceAnalysisOutput['proportions'];
}

const PROPORTION_LABELS: Record<string, string> = {
  foreheadRatio: 'Testa',
  cheekboneRatio: 'Maçãs do rosto',
  jawRatio: 'Queixo',
};

const PROPORTION_KEYS: Array<keyof Omit<FaceAnalysisOutput['proportions'], 'faceLength'>> = [
  'foreheadRatio',
  'cheekboneRatio',
  'jawRatio',
];

export function ProportionAnalysis({ proportions }: ProportionAnalysisProps) {
  const shouldReduceMotion = useReducedMotion();

  // Normalize: find max of the three ratios
  const values = PROPORTION_KEYS.map((key) => proportions[key]);
  const maxValue = Math.max(...values);

  return (
    <div className="w-full space-y-3" aria-label="Análise das proporções faciais">
      {PROPORTION_KEYS.map((key, index) => {
        const value = proportions[key];
        const normalizedWidth = maxValue > 0 ? (value / maxValue) * 100 : 0;
        const percentage = Math.round(value * 100);

        return (
          <div key={key} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                {PROPORTION_LABELS[key]}
              </span>
              <span className="text-xs text-muted-foreground">{percentage}%</span>
            </div>
            {/* Track */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              {/* Bar */}
              {shouldReduceMotion ? (
                <div
                  className="h-full origin-left rounded-full bg-primary"
                  style={{ width: `${normalizedWidth}%` }}
                />
              ) : (
                <motion.div
                  className="h-full origin-left rounded-full bg-primary"
                  style={{ width: `${normalizedWidth}%` }}
                  initial={{ scaleX: 0 }}
                  animate={{
                    scaleX: 1,
                    transition: {
                      duration: 0.5,
                      ease: 'easeOut',
                      delay: index * 0.1,
                    },
                  }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
