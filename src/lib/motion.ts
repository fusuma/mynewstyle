import type { Transition, Variants } from "framer-motion";

/**
 * Micro interaction transition — buttons, toggles, hovers
 * 200ms with easeOut
 */
export const microTransition: Transition = {
  duration: 0.2,
  ease: "easeOut",
};

/**
 * Page-level transition — route changes, panel slides
 * 350ms with easeInOut
 */
export const pageTransition: Transition = {
  duration: 0.35,
  ease: "easeInOut",
};

/**
 * Loading loop transition — spinners, skeleton pulses
 * 1.5s infinite repeat
 */
export const loadingTransition: Transition = {
  duration: 1.5,
  repeat: Infinity,
  ease: "easeInOut",
};

/**
 * Results reveal container — staggers children at 150ms intervals
 */
export const resultsRevealContainer: Transition & { staggerChildren: number } = {
  staggerChildren: 0.15,
};

/**
 * Results reveal item — fades in and slides up
 */
export const resultsRevealItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: microTransition,
  },
};

/**
 * Framer Motion variant set for staggered reveal animations
 */
export const revealVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: resultsRevealContainer,
  },
};

/**
 * Returns a reduced-motion-safe transition.
 * When prefers-reduced-motion is active, returns zero-duration transition.
 *
 * @param prefersReducedMotion - Whether the user prefers reduced motion
 * @param transition - The original transition to use when motion is allowed (defaults to micro)
 */
export function getReducedMotionTransition(
  prefersReducedMotion: boolean,
  transition: Transition = microTransition
): Transition {
  if (prefersReducedMotion) {
    return { duration: 0 };
  }
  return transition;
}
