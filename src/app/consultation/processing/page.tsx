'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useConsultationStore } from '@/stores/consultation';
import type { FaceAnalysisOutput } from '@/lib/ai/schemas';
import { ProcessingScreen } from '@/components/consultation/ProcessingScreen';
import { FaceShapeReveal } from '@/components/consultation/FaceShapeReveal';

type PageState = 'loading' | 'revealed' | 'error';

interface ErrorStateProps {
  message: string | null;
  onRetry: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="flex flex-col items-center gap-6">
        <p className="text-base text-foreground font-medium">
          {message ?? 'Algo correu mal. Tentar de novo?'}
        </p>
        <button
          onClick={onRetry}
          className="rounded-xl bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Tentar de novo
        </button>
      </div>
    </div>
  );
}

export default function ProcessingPage() {
  const router = useRouter();
  const consultationId = useConsultationStore((state) => state.consultationId);
  const photoPreview = useConsultationStore((state) => state.photoPreview);
  const setFaceAnalysis = useConsultationStore((state) => state.setFaceAnalysis);

  const [pageState, setPageState] = useState<PageState>('loading');
  const [faceAnalysisResult, setFaceAnalysisResult] = useState<FaceAnalysisOutput | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Guard: redirect if no consultationId
  useEffect(() => {
    if (!consultationId) {
      router.replace('/consultation/questionnaire');
    }
  }, [consultationId, router]);

  const runAnalysis = useCallback(async (signal?: AbortSignal) => {
    if (!consultationId) return;

    // Guard: if photoPreview is missing, show error state immediately
    if (!photoPreview) {
      setPageState('error');
      setErrorMessage('Algo correu mal. Tentar de novo?');
      return;
    }

    setPageState('loading');
    setErrorMessage(null);

    try {
      // Strip data URL prefix: "data:image/jpeg;base64,/9j/..." → "/9j/..."
      const photoBase64 = photoPreview.split(',')[1];
      const response = await fetch('/api/consultation/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultationId, photoBase64 }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const data = (await response.json()) as { faceAnalysis: FaceAnalysisOutput };
      const analysis = data.faceAnalysis;

      setFaceAnalysis(analysis); // Store in Zustand
      setFaceAnalysisResult(analysis); // Local state for render
      setPageState('revealed');
    } catch (err) {
      // Ignore abort errors (component unmounted)
      if (err instanceof Error && err.name === 'AbortError') return;
      setPageState('error');
      setErrorMessage('Algo correu mal. Tentar de novo?');
    }
  }, [consultationId, photoPreview, setFaceAnalysis]);

  useEffect(() => {
    if (consultationId) {
      const controller = new AbortController();
      void runAnalysis(controller.signal);
      return () => controller.abort();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!consultationId) return null;

  if (pageState === 'loading') {
    return <ProcessingScreen photoPreview={photoPreview} />;
  }

  if (pageState === 'error') {
    return <ErrorState message={errorMessage} onRetry={() => void runAnalysis(undefined)} />;
  }

  if (pageState === 'revealed' && faceAnalysisResult) {
    return (
      <FaceShapeReveal
        faceAnalysis={faceAnalysisResult}
        onContinue={() => router.push(`/consultation/results/${consultationId}`)}
      />
    );
  }

  return null;
}
