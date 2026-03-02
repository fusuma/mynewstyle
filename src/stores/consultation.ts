'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { FaceAnalysisOutput } from '@/lib/ai/schemas';
import type { PreviewStatus } from '@/types/index';
import { getOrCreateGuestSessionId } from '@/lib/guest-session';

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
  faceAnalysis: FaceAnalysisOutput | null;
  consultation: unknown | null;
  previews: Map<string, PreviewStatus>;

  // Payment (future stories)
  paymentStatus: 'none' | 'pending' | 'paid' | 'failed' | 'refunded';
  isReturningUser: boolean;

  // Guest session (Story 8.4)
  guestSessionId: string | null;

  // Actions
  setGender: (gender: 'male' | 'female') => void;
  setPhoto: (photo: Blob) => void;
  setPhotoPreview: (preview: string) => void;
  setQuestionnaireResponse: (questionId: string, value: string | string[] | number) => void;
  setQuestionnaireComplete: (responses: QuestionnaireResponses) => void;
  setConsultationId: (id: string) => void;
  setFaceAnalysis: (analysis: FaceAnalysisOutput) => void;
  setPaymentStatus: (status: 'none' | 'pending' | 'paid' | 'failed' | 'refunded') => void;
  setGuestSessionId: (id: string) => void;
  reset: () => void;

  // Preview actions (Story 7.4)
  startPreview: (recommendationId: string) => void;
  updatePreviewStatus: (recommendationId: string, status: Partial<PreviewStatus>) => void;
  setPreviewUrl: (recommendationId: string, url: string) => void;

  // Preview selectors (Story 7.4)
  isAnyPreviewGenerating: () => boolean;
}

// Compute guestSessionId on module load (client-side only).
// On the server, this returns a temporary UUID (not persisted to localStorage).
const initialGuestSessionId =
  typeof window !== 'undefined' ? getOrCreateGuestSessionId() : null;

const initialState = {
  gender: null as 'male' | 'female' | null,
  photo: null as Blob | null,
  photoPreview: null as string | null,
  questionnaire: null as QuestionnaireResponses | null,
  consultationId: null as string | null,
  faceAnalysis: null as FaceAnalysisOutput | null,
  consultation: null as unknown | null,
  previews: new Map<string, PreviewStatus>(),
  paymentStatus: 'none' as const,
  isReturningUser: false,
  // guestSessionId intentionally NOT in initialState so reset() doesn't clear it
};

export const useConsultationStore = create<ConsultationStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // guestSessionId is initialised separately so reset() won't touch it
      guestSessionId: initialGuestSessionId,

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
      setFaceAnalysis: (analysis) => set({ faceAnalysis: analysis }),
      setPaymentStatus: (status) => set({ paymentStatus: status }),
      setGuestSessionId: (id) => set({ guestSessionId: id }),

      reset: () => {
        // Preserve guestSessionId — it must survive across consultations
        const { guestSessionId } = get();
        set({
          ...initialState,
          previews: new Map<string, PreviewStatus>(),
          guestSessionId,
        });
      },

      // Preview actions (Story 7.4, Task 6)
      startPreview: (recommendationId) =>
        set((state) => {
          const newPreviews = new Map(state.previews);
          newPreviews.set(recommendationId, {
            status: 'generating',
            startedAt: new Date().toISOString(),
          });
          return { previews: newPreviews };
        }),

      updatePreviewStatus: (recommendationId, statusUpdate) =>
        set((state) => {
          const newPreviews = new Map(state.previews);
          const existing = newPreviews.get(recommendationId) ?? { status: 'idle' };
          newPreviews.set(recommendationId, { ...existing, ...statusUpdate });
          return { previews: newPreviews };
        }),

      setPreviewUrl: (recommendationId, url) =>
        set((state) => {
          const newPreviews = new Map(state.previews);
          const existing = newPreviews.get(recommendationId) ?? { status: 'ready' };
          newPreviews.set(recommendationId, {
            ...existing,
            status: 'ready',
            previewUrl: url,
          });
          return { previews: newPreviews };
        }),

      isAnyPreviewGenerating: () => {
        const { previews } = get();
        for (const [, status] of previews) {
          if (status.status === 'generating') return true;
        }
        return false;
      },
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
        guestSessionId: state.guestSessionId,
        // EXCLUDE: photo (Blob -- cannot serialize to JSON, handled by IndexedDB in Story 2.7)
        // EXCLUDE: faceAnalysis, consultation, previews (future stories, re-fetched from API)
      }),
    }
  )
);
