'use client';

/**
 * PreviewUnavailable — Shown when preview generation is unavailable for a style.
 *
 * AC: 8 (Story 7.4, Task 7.1)
 */
export function PreviewUnavailable() {
  return (
    <div
      data-testid="preview-unavailable"
      className="flex items-center justify-center rounded-xl border border-border bg-muted/30 p-4 text-center"
      role="status"
      aria-label="Preview indisponivel para este estilo"
    >
      <p className="text-sm text-muted-foreground">
        Visualizacao indisponivel para este estilo
      </p>
    </div>
  );
}
