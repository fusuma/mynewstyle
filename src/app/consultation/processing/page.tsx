'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useConsultationStore } from '@/stores/consultation';

export default function ProcessingPage() {
  const router = useRouter();
  const consultationId = useConsultationStore((state) => state.consultationId);

  useEffect(() => {
    if (!consultationId) {
      router.replace('/consultation/questionnaire');
    }
  }, [consultationId, router]);

  if (!consultationId) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <h1 className="text-xl font-semibold text-foreground">
          A processar...
        </h1>
        <p className="text-sm text-muted-foreground">
          A sua consulta está a ser preparada.
        </p>
        <p className="mt-2 text-xs text-muted-foreground/60">
          ID: {consultationId}
        </p>
      </div>
    </div>
  );
}
