'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useCallback, useMemo } from 'react';
import { useConsultationStore } from '@/stores/consultation';
import { QuestionnaireFlow } from '@/components/consultation/QuestionnaireFlow';
import { getQuestionnaireConfig } from '@/lib/questionnaire';
import type { QuestionnaireResponses } from '@/stores/consultation';

export default function QuestionnairePage() {
  const router = useRouter();
  const gender = useConsultationStore((state) => state.gender);
  const setQuestionnaireComplete = useConsultationStore(
    (state) => state.setQuestionnaireComplete
  );

  useEffect(() => {
    if (!gender) {
      router.replace('/start');
    }
  }, [gender, router]);

  const config = useMemo(
    () => (gender ? getQuestionnaireConfig(gender) : null),
    [gender]
  );

  const handleComplete = useCallback(
    (responses: QuestionnaireResponses) => {
      setQuestionnaireComplete(responses);
      router.push('/consultation/processing');
    },
    [setQuestionnaireComplete, router]
  );

  if (!gender || !config) return null;

  return (
    <QuestionnaireFlow
      config={config}
      onComplete={handleComplete}
    />
  );
}
