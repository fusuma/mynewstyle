import { z } from 'zod';

export const FaceAnalysisSchema = z.object({
  faceShape: z.enum(['oval', 'round', 'square', 'oblong', 'heart', 'diamond', 'triangle']),
  confidence: z.number().min(0).max(1),
  proportions: z.object({
    foreheadRatio: z.number(),
    cheekboneRatio: z.number(),
    jawRatio: z.number(),
    faceLength: z.number(),
  }),
  hairAssessment: z.object({
    type: z.string(),
    texture: z.string(),
    density: z.string(),
    currentStyle: z.string(),
  }),
});

export type FaceAnalysisOutput = z.infer<typeof FaceAnalysisSchema>;
