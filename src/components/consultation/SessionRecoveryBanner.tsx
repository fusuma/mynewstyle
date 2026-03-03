"use client";

import { RefreshCw } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

// ============================================================
// Props
// ============================================================

interface SessionRecoveryBannerProps {
  /** Called when user chooses to continue with the recovered photo */
  onUseRecovered: () => void;
  /** Called when user chooses to retake a new photo */
  onRetake: () => void;
}

// ============================================================
// Component
// ============================================================

/**
 * SessionRecoveryBanner: Informational banner shown when a previously
 * persisted consultation session is found in IndexedDB.
 *
 * - Non-blocking (not a modal) -- user can dismiss and start fresh
 * - All text in Portuguese (pt-BR) with correct diacritical marks
 * - Uses theme CSS variables exclusively (no hardcoded hex)
 * - Minimum 48px touch targets on buttons
 * - Accessible: ARIA labels, role="status"
 * - Respects prefers-reduced-motion
 */
export function SessionRecoveryBanner({ onUseRecovered, onRetake }: SessionRecoveryBannerProps) {
  const prefersReducedMotion = useReducedMotion();

  const animationProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, ease: "easeOut" as const },
      };

  return (
    <motion.div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-background p-6 text-center shadow-sm"
      {...animationProps}
    >
      <RefreshCw className="h-8 w-8 text-accent" aria-hidden="true" />

      <div>
        <h2 className="text-lg font-semibold text-foreground">Encontramos a sua foto anterior</h2>
        <p className="mt-1 text-sm text-muted-foreground">Deseja continuar com esta foto?</p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <button
          onClick={onUseRecovered}
          aria-label="Continuar com a foto recuperada"
          className="min-h-[48px] w-full rounded-xl bg-accent py-3 text-base font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
        >
          Continuar
        </button>
        <button
          onClick={onRetake}
          aria-label="Tirar outra foto"
          className="min-h-[48px] w-full rounded-xl border border-border py-3 text-base font-medium text-muted-foreground transition-colors hover:bg-muted"
        >
          Tirar outra foto
        </button>
      </div>
    </motion.div>
  );
}
