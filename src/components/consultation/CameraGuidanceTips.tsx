"use client";

import { useState, useEffect } from "react";
import { Sun, Eye, EyeOff, Scan } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const TIPS = [
  { text: "Boa iluminação", Icon: Sun },
  { text: "Olhe diretamente para a câmera", Icon: Eye },
  { text: "Sem óculos de sol", Icon: EyeOff },
  { text: "Mantenha o rosto dentro do oval", Icon: Scan },
] as const;

/** Interval for cycling tips (ms) */
const TIP_CYCLE_INTERVAL = 3000;

/**
 * Rotating camera guidance tips displayed during camera capture.
 * Tips cycle every 3 seconds with a fade animation.
 * If prefers-reduced-motion is enabled, all tips are shown statically.
 * Portuguese (pt-BR) text with correct diacritical marks.
 */
export function CameraGuidanceTips() {
  const prefersReducedMotion = useReducedMotion();
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % TIPS.length);
    }, TIP_CYCLE_INTERVAL);

    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

  // Static display for reduced motion
  if (prefersReducedMotion) {
    return (
      <div
        className="flex flex-col items-center gap-2 py-3"
        data-testid="camera-guidance-tips"
        role="status"
        aria-live="polite"
      >
        {TIPS.map(({ text, Icon }) => (
          <div
            key={text}
            className="flex items-center gap-2 text-sm text-foreground/80"
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{text}</span>
          </div>
        ))}
      </div>
    );
  }

  const { text, Icon } = TIPS[currentTipIndex];

  return (
    <div
      className="flex h-10 items-center justify-center py-3"
      data-testid="camera-guidance-tips"
      role="status"
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTipIndex}
          className="flex items-center gap-2 text-sm text-foreground/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          <span>{text}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
