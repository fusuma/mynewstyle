'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

const DISMISSED_KEY = 'mynewstyle-guest-banner-dismissed';

/**
 * GuestSaveBanner
 *
 * Non-intrusive, dismissible banner shown to guest users after viewing
 * consultation results. Prompts (but does NOT require) registration to
 * save their result.
 *
 * Story 8.4, Task 6 (AC: #4)
 *
 * Behaviour:
 * - Only rendered when sessionStorage has no dismissed flag
 * - On dismiss, writes flag to sessionStorage so it doesn't reappear
 * - Links to /register for account creation
 * - Uses theme CSS variables exclusively (no hardcoded hex)
 */
export function GuestSaveBanner() {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(DISMISSED_KEY) === '1';
  });

  const prefersReducedMotion = useReducedMotion();

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };

  const animationProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 8 },
        transition: { duration: 0.25, ease: 'easeOut' as const },
      };

  // AnimatePresence must manage the `dismissed` state transition so that the
  // exit animation plays before the element is removed from the DOM.
  // The early-return guard is removed and replaced by AnimatePresence's
  // conditional child, which fires exit animations before unmounting.
  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          role="status"
          aria-live="polite"
          className="relative flex items-center justify-between gap-4 rounded-2xl border border-border bg-background px-5 py-4 shadow-sm"
          {...animationProps}
        >
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-foreground">
              Crie conta para guardar este resultado
            </p>
            <Link
              href="/register"
              className="text-sm font-medium text-accent underline-offset-2 hover:underline"
            >
              Criar conta agora
            </Link>
          </div>

          <button
            onClick={handleDismiss}
            aria-label="Fechar"
            className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
