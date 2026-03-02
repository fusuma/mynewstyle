import { z } from 'zod';

const StyleRecommendationSchema = z.object({
  styleName: z.string(),
  justification: z.string().min(10).max(500),
  matchScore: z.number().min(0).max(1),
  difficultyLevel: z.enum(['low', 'medium', 'high']),
});

const StyleToAvoidSchema = z.object({
  styleName: z.string(),
  reason: z.string().min(10),
});

const GroomingTipSchema = z.object({
  category: z.enum(['products', 'routine', 'barber_tips']),
  tipText: z.string().min(5),
  icon: z.string(),
});

export const ConsultationSchema = z.object({
  recommendations: z.array(StyleRecommendationSchema).min(2).max(3),
  stylesToAvoid: z.array(StyleToAvoidSchema).min(2).max(3),
  groomingTips: z.array(GroomingTipSchema).min(1),
});

export type ConsultationOutput = z.infer<typeof ConsultationSchema>;
