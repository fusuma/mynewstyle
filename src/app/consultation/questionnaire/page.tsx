'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useConsultationStore } from '@/stores/consultation';
import { QuestionnaireFlow } from '@/components/consultation/QuestionnaireFlow';
import { getQuestionnaireConfig } from '@/lib/questionnaire';
import { submitConsultation } from '@/lib/consultation/submit';
import type { QuestionnaireResponses } from '@/stores/consultation';
import { trackEvent } from '@/lib/analytics/tracker';
import { AnalyticsEventType } from '@/lib/analytics/types';

export default function QuestionnairePage() {
  const router = useRouter();
  const gender = useConsultationStore((state) => state.gender);
  const photoPreview = useConsultationStore((state) => state.photoPreview);
  const setQuestionnaireComplete = useConsultationStore(
    (state) => state.setQuestionnaireComplete
  );
  const setConsultationId = useConsultationStore(
    (state) => state.setConsultationId
  );
  const photoConsentGivenAt = useConsultationStore(
    (state) => state.photoConsentGivenAt
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const questionnaireStartTime = useRef<number | null>(null);
  // Track current question index for questionnaire_abandoned analytics (Task 7.6)
  const currentQuestionIndexRef = useRef<number>(0);

  useEffect(() => {
    if (!gender) {
      router.replace('/start');
    }
  }, [gender, router]);

  // Track questionnaire_started when the questionnaire mounts (Task 7.4)
  useEffect(() => {
    if (gender) {
      questionnaireStartTime.current = Date.now();
      trackEvent(AnalyticsEventType.QUESTIONNAIRE_STARTED);
    }
  }, [gender]);

  // Track questionnaire_abandoned when user navigates away without completing (Task 7.6)
  useEffect(() => {
    if (!gender) return;
    const handleVisibilityChange = () => {
      if (document.hidden && !isSubmittingRef.current) {
        trackEvent(AnalyticsEventType.QUESTIONNAIRE_ABANDONED, {
          lastQuestion: currentQuestionIndexRef.current,
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [gender]);

  const config = useMemo(
    () => (gender ? getQuestionnaireConfig(gender) : null),
    [gender]
  );

  const handleProgress = useCallback((currentIndex: number) => {
    currentQuestionIndexRef.current = currentIndex;
  }, []);

  const handleComplete = useCallback(
    async (responses: QuestionnaireResponses) => {
      if (isSubmittingRef.current) return;

      setQuestionnaireComplete(responses);
      isSubmittingRef.current = true;
      setIsSubmitting(true);

      // Track questionnaire_completed with duration (Task 7.5)
      const durationMs = questionnaireStartTime.current
        ? Date.now() - questionnaireStartTime.current
        : 0;
      trackEvent(AnalyticsEventType.QUESTIONNAIRE_COMPLETED, { durationMs });

      try {
        // LGPD (Story 11.2): photoConsentGivenAt is required by the API.
        // It was captured when the user checked the consent checkbox on the photo page.
        // If null, the user reached this page without going through the consent flow
        // (e.g., direct navigation). Redirect back to the photo page to require consent.
        if (!photoConsentGivenAt) {
          console.warn('[QuestionnairePage] photoConsentGivenAt is null — redirecting to photo page for consent');
          router.replace('/consultation/photo');
          isSubmittingRef.current = false;
          setIsSubmitting(false);
          return;
        }

        const result = await submitConsultation({
          gender: gender!,
          photoUrl: photoPreview || '',
          questionnaire: responses,
          photoConsentGivenAt: photoConsentGivenAt,
        });

        setConsultationId(result.consultationId);
        router.push('/consultation/processing');
      } catch (error) {
        console.error('[QuestionnairePage] Submission failed:', error);
        toast.error('Algo correu mal. Tente novamente.');
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [gender, photoPreview, photoConsentGivenAt, setQuestionnaireComplete, setConsultationId, router]
  );

  if (!gender || !config) return null;

  return (
    <>
      <QuestionnaireFlow
        config={config}
        onComplete={handleComplete}
        onProgress={handleProgress}
      />
      {isSubmitting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80"
          data-testid="submission-loading"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
            <p className="text-sm text-muted-foreground">
              A enviar as suas respostas...
            </p>
          </div>
        </div>
      )}
    </>
  );
}
