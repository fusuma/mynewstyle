import type { User, Session } from '@supabase/supabase-js';

export type { User, Session };

export type Gender = "male" | "female";

// Auth types (Story 8.1)
export interface UserProfile {
  id: string;
  displayName: string | null;
  email?: string;
  genderPreference: 'male' | 'female' | null;
  createdAt: string;
  updatedAt?: string;
}

// Profile history types (Story 8.6)
export interface ConsultationHistoryItem {
  id: string;
  gender: 'male' | 'female';
  faceShape: FaceShape;
  confidence: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  completedAt: string | null;
  topRecommendation: {
    styleName: string;
    matchScore: number;
  } | null;
}

export interface FavoriteItem {
  id: string;
  favoritedAt: string;
  recommendationId: string;
  styleName: string;
  matchScore: number;
  consultationId: string;
  faceShape: FaceShape;
  gender: 'male' | 'female';
  consultationDate: string;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
}

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
  /** Guest session UUID (Story 8.4). Omit for authenticated users. */
  guestSessionId?: string;
  /** Referral code from localStorage (Story 9.5). Omit if not attributed. */
  referralCode?: string;
}

export interface ConsultationStartResponse {
  consultationId: string;
}

// Rating types (Story 10.5)
export interface RatingDetails {
  faceShapeAccuracy?: number;
  recommendationQuality?: number;
  previewRealism?: number;
  ratedAt: string;
}

export interface ConsultationRecord {
  id: string;
  gender: 'male' | 'female';
  photoUrl: string;
  questionnaireResponses: Record<string, string | string[] | number>;
  status: 'pending';
  createdAt: string;
  /** Guest session UUID (null for authenticated users). Story 8.4 */
  guest_session_id: string | null;
  /** Referral code captured from ?ref= param. Story 9.5 */
  referral_code: string | null;
  /** Overall 1-5 star rating for the consultation. Story 10.5 */
  rating?: number | null;
  /** Decomposed rating details. Story 10.5 */
  rating_details?: RatingDetails | null;
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

// Preview status type (Story 7.4)
export interface PreviewStatus {
  status: 'idle' | 'generating' | 'ready' | 'failed' | 'unavailable';
  previewUrl?: string;
  error?: string;
  startedAt?: string; // ISO timestamp
}

export interface PreviewGenerationParams {
  taskId?: string;              // Set for Kie.ai async path
  model: 'nano-banana-2' | 'gemini-3-pro-image-preview';
  callbackUrl?: string;         // Set for Kie.ai async path only
  requestedAt: string;          // ISO timestamp
  photoStoragePath: string;     // Supabase Storage path (NOT signed URL)
  stylePrompt: string;
  styleName: string;
  gender: 'male' | 'female';
  // Fallback-specific fields (Story 7-6)
  provider?: 'kie' | 'gemini-pro-image';
  fallbackReason?: 'kie_error' | 'kie_timeout';
  completedAt?: string;         // ISO timestamp (set when sync fallback completes)
  quality_gate_reason?: string; // Set when face similarity check fails
  similarity_score?: number;    // Face similarity score from quality gate
}

export interface AIProviderConfig {
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}
