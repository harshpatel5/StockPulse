import { useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ANIMATION } from '../lib/chartTheme';

// Charts animate once, when their data first arrives. Refetches, timeframe
// changes and tab switches then update instantly, so refreshing the dashboard
// never replays every chart. The flag flips on animation end, so the first
// animation is never cut short.
export const useChartAnimation = () => {
  const hasAnimatedRef = useRef(false);
  const reduced = useReducedMotion();

  return {
    isAnimationActive: !reduced && !hasAnimatedRef.current,
    animationDuration: ANIMATION.duration,
    animationEasing: ANIMATION.easing,
    onAnimationEnd: () => {
      hasAnimatedRef.current = true;
    },
  };
};
