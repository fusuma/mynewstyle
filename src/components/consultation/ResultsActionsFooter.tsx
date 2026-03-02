'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Share2, Bookmark, PlusCircle, Home, Scissors, Loader2, Image } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useConsultationStore } from '@/stores/consultation';
import { useBarberCard } from '@/hooks/useBarberCard';
import { useShareCard } from '@/hooks/useShareCard';
import { BarberCardRenderer } from '@/components/consultation/BarberCardRenderer';
import { ShareCardStoryRenderer } from '@/components/share/ShareCardStoryRenderer';
import { ShareCardSquareRenderer } from '@/components/share/ShareCardSquareRenderer';
import type { Consultation } from '@/types/index';

interface ResultsActionsFooterProps {
  consultationId: string;
}

export function ResultsActionsFooter({ consultationId: _consultationId }: ResultsActionsFooterProps) {
  const router = useRouter();
  const reset = useConsultationStore((state) => state.reset);
  const shouldReduceMotion = useReducedMotion();

  // Consultation data for barber card and share card
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

  // Barber card hook (secondary action — "Mostrar ao barbeiro")
  const { generateCard, isGenerating: isGeneratingBarberCard, cardRef } = useBarberCard({
    faceAnalysis,
    recommendation: topRecommendation,
    photoPreview,
    previewUrl,
    gender,
    groomingTips,
  });

  // Share card hook (primary action — "Partilhar resultado" + square "Cartão Instagram")
  const {
    generateShareCard,
    isGenerating: isGeneratingShareCard,
    cardRef: shareCardRef,
    squareCardRef,
  } = useShareCard({
    faceAnalysis,
    recommendation: topRecommendation,
    photoPreview,
    previewUrl,
    gender,
  });

  const animationProps = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 24 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, ease: 'easeOut' as const, delay: 0.15 },
      };

  const handleShare = async () => {
    await generateShareCard('story');
  };

  const handleShareSquare = async () => {
    await generateShareCard('square');
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

      {/* Hidden ShareCardStoryRenderer — off-screen capture target for story share card (9:16) */}
      <ShareCardStoryRenderer
        cardRef={shareCardRef}
        faceAnalysis={faceAnalysis}
        recommendation={topRecommendation}
        photoPreview={photoPreview}
        previewUrl={previewUrl}
        gender={gender}
      />

      {/* Hidden ShareCardSquareRenderer — off-screen capture target for square share card (1:1) */}
      <ShareCardSquareRenderer
        cardRef={squareCardRef}
        faceAnalysis={faceAnalysis}
        recommendation={topRecommendation}
        photoPreview={photoPreview}
        previewUrl={previewUrl}
        gender={gender}
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
            {/* Primary: Share — generates story-format branded share card image */}
            <Button
              variant="default"
              onClick={handleShare}
              disabled={isGeneratingShareCard}
              aria-label={isGeneratingShareCard ? 'A gerar cartão de partilha…' : 'Partilhar resultado'}
              aria-busy={isGeneratingShareCard}
              className="w-full md:w-auto"
            >
              {isGeneratingShareCard ? (
                <Loader2 data-testid="icon-loader-share" className="animate-spin" aria-hidden="true" />
              ) : (
                <Share2 aria-hidden="true" />
              )}
              Partilhar resultado
            </Button>

            {/* Secondary: Cartão Instagram — generates 1:1 square share card for Instagram feed */}
            <Button
              variant="secondary"
              onClick={handleShareSquare}
              disabled={isGeneratingShareCard}
              aria-label={isGeneratingShareCard ? 'A gerar cartão Instagram…' : 'Cartão Instagram (1:1)'}
              aria-busy={isGeneratingShareCard}
              className="w-full md:w-auto"
            >
              {isGeneratingShareCard ? (
                <Loader2 data-testid="icon-loader-square" className="animate-spin" aria-hidden="true" />
              ) : (
                <Image aria-hidden="true" />
              )}
              Cartão Instagram
            </Button>

            {/* Secondary: Mostrar ao barbeiro */}
            <Button
              variant="secondary"
              onClick={generateCard}
              disabled={isGeneratingBarberCard}
              aria-label={isGeneratingBarberCard ? 'A gerar cartão…' : 'Mostrar ao barbeiro'}
              aria-busy={isGeneratingBarberCard}
              className="w-full md:w-auto"
            >
              {isGeneratingBarberCard ? (
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
