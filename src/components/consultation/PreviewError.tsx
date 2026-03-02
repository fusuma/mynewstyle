'use client';

import { Button } from '@/components/ui/button';

interface PreviewErrorProps {
  /** Callback to retry preview generation */
  onRetry: () => void;
}

/**
 * PreviewError — Shown when preview generation fails, with retry option.
 *
 * AC: 8 (Story 7.4, Task 7.2, 7.3)
 */
export function PreviewError({ onRetry }: PreviewErrorProps) {
  return (
    <div
      data-testid="preview-error"
      className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/30 p-4 text-center"
      role="alert"
      aria-label="Erro ao gerar preview"
    >
      <p className="text-sm text-muted-foreground">
        Algo correu mal. Tentar de novo?
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        aria-label="Tentar gerar preview novamente"
      >
        Tentar de novo
      </Button>
    </div>
  );
}
