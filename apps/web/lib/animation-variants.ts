export const fadeInUp = {
  initial: { opacity: 0.4, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: 'easeOut' },
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

export const fadeInScale = {
  initial: { opacity: 0.4, scale: 0.97 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.4, ease: 'easeOut' },
};

/**
 * Check if user prefers reduced motion.
 * Use in components to skip initial hidden state.
 */
export function getReducedMotionInitial<T extends Record<string, unknown>>(
  variant: { initial: T },
): T | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? undefined
    : variant.initial;
}
