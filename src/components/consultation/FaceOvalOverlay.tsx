"use client";

import { useReducedMotion } from "framer-motion";

/**
 * SVG-based face oval overlay for the camera viewfinder.
 * Shows a semi-transparent dark overlay outside the oval
 * with a subtle pulsing border animation.
 * Respects prefers-reduced-motion.
 */
export function FaceOvalOverlay() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
      data-testid="face-oval-overlay"
    >
      <svg
        className="h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <mask id="oval-mask">
            <rect width="100" height="100" fill="white" />
            <ellipse cx="50" cy="45" rx="30" ry="37.5" fill="black" />
          </mask>
          {!prefersReducedMotion && (
            <style>{`
              @keyframes pulse-oval {
                0%, 100% { opacity: 0.6; }
                50% { opacity: 1; }
              }
              .oval-border {
                animation: pulse-oval 2s ease-in-out infinite;
              }
            `}</style>
          )}
        </defs>

        {/* Dark overlay outside the oval */}
        <rect
          width="100"
          height="100"
          fill="rgba(0, 0, 0, 0.5)"
          mask="url(#oval-mask)"
        />

        {/* Oval border */}
        <ellipse
          cx="50"
          cy="45"
          rx="30"
          ry="37.5"
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth="0.4"
          className={prefersReducedMotion ? "" : "oval-border"}
          opacity={prefersReducedMotion ? 0.8 : undefined}
        />
      </svg>
    </div>
  );
}
