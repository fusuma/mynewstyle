'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ConsultationHistoryCard } from './ConsultationHistoryCard';
import { EmptyState } from './EmptyState';
import type { ConsultationHistoryItem } from '@/types';

type FetchState = 'idle' | 'loading' | 'success' | 'error';

export function ConsultationHistoryTab() {
  const [state, setState] = useState<FetchState>('loading');
  const [consultations, setConsultations] = useState<ConsultationHistoryItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchConsultations = async (signal?: AbortSignal) => {
    setState('loading');
    setErrorMessage(null);
    try {
      const response = await fetch('/api/profile/consultations', { signal });
      if (!response.ok) {
        throw new Error('Erro ao carregar consultorias');
      }
      const data = await response.json();
      setConsultations(data.consultations ?? []);
      setState('success');
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Erro ao carregar consultorias';
      setErrorMessage(message);
      setState('error');
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchConsultations(controller.signal);
    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Loading state: show skeleton shimmer cards
  if (state === 'loading') {
    return (
      <div
        data-testid="consultation-history-loading"
        className="space-y-3 p-4"
        aria-label="A carregar consultorias"
        aria-busy="true"
      >
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2 p-4 border rounded-card">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-4">
        <p className="text-sm text-destructive">{errorMessage}</p>
        <Button variant="outline" onClick={fetchConsultations}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  // Empty state
  if (consultations.length === 0) {
    return <EmptyState type="consultations" />;
  }

  // Success: render list with staggered animation
  return (
    <div className="space-y-3 p-4">
      {consultations.map((consultation, index) => (
        <motion.div
          key={consultation.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.15 }}
        >
          <ConsultationHistoryCard consultation={consultation} />
        </motion.div>
      ))}
    </div>
  );
}
