'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useConsultationStore } from '@/stores/consultation';

export function RefundBanner() {
  const router = useRouter();
  const reset = useConsultationStore((state) => state.reset);
  const shouldReduceMotion = useReducedMotion();

  const handleNewConsultation = () => {
    reset();
    router.push('/start');
  };

  const fadeIn = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, ease: 'easeOut' as const },
      };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <motion.div
        className="w-full max-w-md rounded-xl border border-destructive/30 bg-card p-8 text-center space-y-6"
        {...fadeIn}
      >
        <ShieldAlert
          className="mx-auto h-12 w-12 text-destructive"
          aria-hidden="true"
        />
        <p
          className="text-lg font-medium text-foreground"
          role="alert"
        >
          Ocorreu um erro. O seu pagamento foi reembolsado.
        </p>
        <p className="text-sm text-muted-foreground">
          O reembolso será processado em 5-10 dias úteis.
        </p>
        <button
          onClick={handleNewConsultation}
          className="w-full min-h-[48px] rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          type="button"
        >
          Nova consultoria
        </button>
      </motion.div>
    </div>
  );
}
