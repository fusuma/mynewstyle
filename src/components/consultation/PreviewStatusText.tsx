'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

const STATUS_MESSAGES = [
  'A aplicar o estilo...',
  'A ajustar ao seu rosto...',
  'Quase pronto...',
] as const;

const CYCLE_INTERVAL_MS = 4000;

/**
 * PreviewStatusText — Cycling text component showing AI generation status.
 *
 * Features:
 * - Cycles through 3 status messages every ~4 seconds (AC: 5)
 * - Crossfade animation between messages using Framer Motion AnimatePresence (AC: 5)
 * - aria-live="polite" for screen reader announcements (AC: 10)
 * - Reduced-motion: static text, no cycling (AC: 7)
 *
 * Story 7.4, Task 2
 */
export function PreviewStatusText() {
  const shouldReduceMotion = useReducedMotion();
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    // In reduced-motion mode, don't cycle text
    if (shouldReduceMotion) return;

    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, CYCLE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [shouldReduceMotion]);

  const currentMessage = STATUS_MESSAGES[messageIndex];

  if (shouldReduceMotion) {
    return (
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="text-center text-sm font-medium text-foreground"
      >
        {STATUS_MESSAGES[0]}
      </p>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="relative h-6 overflow-hidden text-center"
    >
      <AnimatePresence mode="wait">
        <motion.p
          key={messageIndex}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="text-sm font-medium text-foreground"
        >
          {currentMessage}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
