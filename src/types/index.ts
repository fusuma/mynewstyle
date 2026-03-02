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
