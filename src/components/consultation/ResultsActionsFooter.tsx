'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Share2, Bookmark, PlusCircle, Home, Scissors, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useConsultationStore } from '@/stores/consultation';
import { useBarberCard } from '@/hooks/useBarberCard';
import { BarberCardRenderer } from '@/components/consultation/BarberCardRenderer';
import type { Consultation } from '@/types/index';

interface ResultsActionsFooterProps {
  consultationId: string;
}

export function ResultsActionsFooter({ consultationId: _consultationId }: ResultsActionsFooterProps) {
  const router = useRouter();
  const reset = useConsultationStore((state) => state.reset);
  const shouldReduceMotion = useReducedMotion();

  // Consultation data for barber card
  const faceAnalysis = useConsultationStore((state) => state.faceAnalysis);
  const photoPreview = useConsultationStore((state) => state.photoPreview);
  const consultationRaw = useConsultationStore((state) => state.consultation);
  const consultation = consultationRaw as Consultation | null;
  const gender = useConsultationStore((state) => state.gender);
  const previews = useConsultationStore((state) => state.previews);

  // Top recommendation and grooming tips from consultation
  const topRecommendation = consultation?.recommendations?.[0] ?? null;
  const groomingTips = consultation?.groomingTips ?? [];

  // Preview URL for top recommendation (if any AI preview was generated)
  const topRecommendationId = topRecommendation?.styleName ?? '';
  const previewStatus = previews.get(topRecommendationId);
  const previewUrl = previewStatus?.status === 'ready' ? previewStatus.previewUrl : undefined;

  const { generateCard, isGenerating, cardRef } = useBarberCard({
    faceAnalysis,
    recommendation: topRecommendation,
    photoPreview,
    previewUrl,
    gender,
    groomingTips,
  });

  const animationProps = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 24 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, ease: 'easeOut' as const, delay: 0.15 },
      };

  const handleShare = async () => {
    const shareData = {
      title: 'Meu resultado mynewstyle',
      text: 'Confira a minha consultoria de visagismo!',
      url: window.location.href,
    };

    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        try {
          await navigator.clipboard.writeText(window.location.href);
          toast.success('Link copiado!');
        } catch {
          toast.error('Não foi possível copiar o link. Tente novamente.');
        }
      }
    } catch (error) {
      // User cancelled share dialog -- not an error
      if ((error as DOMException)?.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(window.location.href);
          toast.success('Link copiado!');
        } catch {
          toast.error('Não foi possível copiar o link. Tente novamente.');
        }
      }
    }
  };

  const handleSave = () => {
    // Auth is not yet implemented (Epic 8)
    // When auth exists: check auth state, save to favorites if authenticated
    toast.info('Crie uma conta para guardar este resultado', {
      action: {
        label: 'Criar conta',
        onClick: () => router.push('/register'),
      },
      duration: 6000,
    });
  };

  const handleNewConsultation = () => {
    reset();
    router.push('/start');
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  return (
    <>
      {/* Hidden BarberCardRenderer — off-screen capture target for html-to-image */}
      <BarberCardRenderer
        cardRef={cardRef}
        faceAnalysis={faceAnalysis}
        recommendation={topRecommendation}
        photoPreview={photoPreview}
        previewUrl={previewUrl}
        gender={gender}
        groomingTips={groomingTips}
      />

      <motion.div
        className={cn(
          // Mobile: sticky footer
          'fixed bottom-0 left-0 right-0 z-40',
          'border-t bg-background/95 backdrop-blur-sm',
          'pb-[env(safe-area-inset-bottom)]',
          // Desktop: static within content
          'md:static md:z-auto md:border-t-0 md:bg-transparent md:backdrop-blur-none md:pb-0'
        )}
        {...animationProps}
      >
        <div className="mx-auto max-w-2xl px-4 py-4 md:py-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-center">
            {/* Primary: Share */}
            <Button
              variant="default"
              onClick={handleShare}
              aria-label="Partilhar resultado"
              className="w-full md:w-auto"
            >
              <Share2 aria-hidden="true" />
              Partilhar resultado
            </Button>

            {/* Secondary: Mostrar ao barbeiro (AC: 1, 10) */}
            <Button
              variant="secondary"
              onClick={generateCard}
              disabled={isGenerating}
              aria-label={isGenerating ? 'A gerar cartão…' : 'Mostrar ao barbeiro'}
              aria-busy={isGenerating}
              className="w-full md:w-auto"
            >
              {isGenerating ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Scissors aria-hidden="true" />
              )}
              Mostrar ao barbeiro
            </Button>

            {/* Secondary: Save */}
            <Button
              variant="secondary"
              onClick={handleSave}
              aria-label="Guardar resultado"
              className="w-full md:w-auto"
            >
              <Bookmark aria-hidden="true" />
              Guardar
            </Button>

            {/* Secondary: New consultation */}
            <Button
              variant="secondary"
              onClick={handleNewConsultation}
              aria-label="Nova consultoria (€2,99)"
              className="w-full md:w-auto"
            >
              <PlusCircle aria-hidden="true" />
              Nova consultoria (€2,99)
            </Button>

            {/* Ghost: Back to home */}
            <Button
              variant="ghost"
              onClick={handleBackToHome}
              aria-label="Voltar ao início"
              className="w-full md:w-auto"
            >
              <Home aria-hidden="true" />
              Voltar ao início
            </Button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
