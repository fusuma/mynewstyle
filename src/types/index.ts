export type Gender = "male" | "female";

export interface ThemeColors {
  background: string;
  foreground: string;
  accent: string;
  muted: string;
}

export interface ThemeContextValue {
  gender: Gender | null;
  setGender: (gender: Gender) => void;
  theme: ThemeColors;
}

// Consultation submission types (Story 3.6)
export interface ConsultationStartPayload {
  gender: 'male' | 'female';
  photoUrl: string;
  questionnaire: Record<string, string | string[] | number>;
}

export interface ConsultationStartResponse {
  consultationId: string;
}

export interface ConsultationRecord {
  id: string;
  gender: 'male' | 'female';
  photoUrl: string;
  questionnaireResponses: Record<string, string | string[] | number>;
  status: 'pending';
  createdAt: string;
}

// AI Provider types (Story 4.1)
export type FaceShape =
  | 'oval'
  | 'round'
  | 'square'
  | 'oblong'
  | 'heart'
  | 'diamond'
  | 'triangle';

export interface FaceProportions {
  foreheadRatio: number;
  cheekboneRatio: number;
  jawRatio: number;
  faceLength: number;
}

export interface HairAssessment {
  type: string;
  texture: string;
  density: string;
  currentStyle: string;
}

export interface FaceAnalysis {
  faceShape: FaceShape;
  confidence: number;
  proportions: FaceProportions;
  hairAssessment: HairAssessment;
}

export interface AnalysisOptions {
  temperature?: number;
  maxRetries?: number;
}

export type QuestionnaireData = Record<string, string | string[] | number>;

export interface StyleRecommendation {
  styleName: string;
  justification: string;
  matchScore: number;
  difficultyLevel: 'low' | 'medium' | 'high';
}

export interface StyleToAvoid {
  styleName: string;
  reason: string;
}

export interface GroomingTip {
  category: 'products' | 'routine' | 'barber_tips';
  tipText: string;
  icon: string;
}

export interface Consultation {
  recommendations: StyleRecommendation[];
  stylesToAvoid: StyleToAvoid[];
  groomingTips: GroomingTip[];
}

export interface AICallLog {
  id: string;
  provider: 'gemini' | 'openai' | 'kie';
  model: string;
  task: 'face-analysis' | 'consultation' | 'preview' | 'face-similarity';
  inputTokens: number;
  outputTokens: number;
  costCents: number;
  latencyMs: number;
  success: boolean;
  error?: string;
  timestamp: string;
}

export interface PreviewGenerationParams {
  taskId: string;
  model: 'nano-banana-2';
  callbackUrl: string;
  requestedAt: string;        // ISO timestamp
  photoStoragePath: string;   // Supabase Storage path (NOT signed URL)
  stylePrompt: string;
  styleName: string;
  gender: 'male' | 'female';
}

export interface AIProviderConfig {
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}
