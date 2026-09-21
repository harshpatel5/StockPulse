// Shared motion presets. Durations and easings mirror the --dur-* and --ease-*
// tokens in styles/tokens.css; keep the two in sync.

export const EASE_OUT = [0.22, 1, 0.36, 1];
export const EASE_IN = [0.4, 0, 1, 1];

export const DUR = {
  fast: 0.12,
  base: 0.2,
  slow: 0.32,
};

// Entrances decelerate; exits are shorter so dismissing feels immediate.
export const enter = { duration: 0.28, ease: EASE_OUT };
export const exit = { duration: 0.18, ease: EASE_IN };

export const fade = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: enter },
  exit: { opacity: 0, transition: exit },
};

export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: enter },
  exit: { opacity: 0, y: -4, transition: exit },
};

export const pop = {
  hidden: { opacity: 0, scale: 0.97, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: enter },
  exit: { opacity: 0, scale: 0.98, transition: exit },
};

export const stagger = (gap = 0.04, delay = 0) => ({
  hidden: {},
  visible: { transition: { staggerChildren: gap, delayChildren: delay } },
});

export const inViewOnce = { once: true, amount: 0.25 };
