'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface QuestionnaireResponses {
  [questionId: string]: string | string[] | number;
}

export interface ConsultationStore {
  // Flow state
  gender: 'male' | 'female' | null;
  photo: Blob | null;
  photoPreview: string | null;
  questionnaire: QuestionnaireResponses | null;

  // Results (future stories)
  consultationId: string | null;
  faceAnalysis: unknown | null;
  consultation: unknown | null;
  previews: Map<string, unknown>;

  // Payment (future stories)
  paymentStatus: 'none' | 'pending' | 'paid' | 'failed';
  isReturningUser: boolean;

  // Actions
  setGender: (gender: 'male' | 'female') => void;
  setPhoto: (photo: Blob) => void;
  setPhotoPreview: (preview: string) => void;
  setQuestionnaireResponse: (questionId: string, value: string | string[] | number) => void;
  setQuestionnaireComplete: (responses: QuestionnaireResponses) => void;
  setConsultationId: (id: string) => void;
  reset: () => void;
}

const initialState = {
  gender: null as 'male' | 'female' | null,
  photo: null as Blob | null,
  photoPreview: null as string | null,
  questionnaire: null as QuestionnaireResponses | null,
  consultationId: null as string | null,
  faceAnalysis: null as unknown | null,
  consultation: null as unknown | null,
  previews: new Map<string, unknown>(),
  paymentStatus: 'none' as const,
  isReturningUser: false,
};

export const useConsultationStore = create<ConsultationStore>()(
  persist(
    (set) => ({
      ...initialState,

      setGender: (gender) => set({ gender }),
      setPhoto: (photo) => set({ photo }),
      setPhotoPreview: (preview) => set({ photoPreview: preview }),
      setQuestionnaireResponse: (questionId, value) =>
        set((state) => ({
          questionnaire: {
            ...(state.questionnaire ?? {}),
            [questionId]: value,
          },
        })),
      setQuestionnaireComplete: (responses) => set({ questionnaire: responses }),
      setConsultationId: (id) => set({ consultationId: id }),
      reset: () => set({ ...initialState, previews: new Map<string, unknown>() }),
    }),
    {
      name: 'mynewstyle-consultation',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        gender: state.gender,
        photoPreview: state.photoPreview,
        questionnaire: state.questionnaire,
        consultationId: state.consultationId,
        paymentStatus: state.paymentStatus,
        isReturningUser: state.isReturningUser,
        // EXCLUDE: photo (Blob -- cannot serialize to JSON, handled by IndexedDB in Story 2.7)
        // EXCLUDE: faceAnalysis, consultation, previews (future stories, re-fetched from API)
      }),
    }
  )
);
