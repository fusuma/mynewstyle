'use client';

import { Loader2, CloudUpload, AlertCircle } from 'lucide-react';

interface PhotoUploadProps {
  isUploading: boolean;
  error?: string;
  onRetry: () => void;
  onCancel: () => void;
}

/**
 * PhotoUpload component displays upload progress or error state.
 * - Uploading: shows indeterminate spinner with Portuguese message
 * - Error: shows error message with retry and cancel buttons
 */
export function PhotoUpload({ isUploading, error, onRetry, onCancel }: PhotoUploadProps) {
  if (isUploading) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center"
        role="status"
        aria-live="polite"
        aria-label="A enviar a foto"
      >
        <CloudUpload className="mb-2 h-8 w-8 text-accent" />
        <Loader2 className="mb-4 h-6 w-6 animate-spin text-accent" />
        <p className="text-foreground font-medium">A enviar a foto...</p>
        <p className="mt-2 text-sm text-muted-foreground">Aguarde um momento</p>
      </div>
    );
  }

  // Error state
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center"
      role="alert"
      aria-live="assertive"
      data-error={error}
    >
      <AlertCircle className="mb-4 h-10 w-10 text-destructive" />
      <p className="text-foreground font-medium">Erro ao enviar a foto</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Verifique a sua ligação e tente novamente.
      </p>
      <div className="mt-6 flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onRetry}
          className="w-full rounded-xl bg-accent py-4 text-base font-semibold text-accent-foreground min-h-[48px]"
          aria-label="Tentar enviar novamente"
        >
          Tentar novamente
        </button>
        <button
          onClick={onCancel}
          className="w-full rounded-xl border border-border py-4 text-base font-medium text-muted-foreground min-h-[48px]"
          aria-label="Voltar para a revisão da foto"
        >
          Voltar
        </button>
      </div>
    </div>
  );
}
