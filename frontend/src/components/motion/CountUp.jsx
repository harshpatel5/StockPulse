import { useEffect, useRef } from 'react';
import { animate, useInView, useReducedMotion } from 'framer-motion';
import { EASE_OUT } from '../../lib/motion';

// Counts up to `value` once, the first time it scrolls into view.
// Decimals follow the target, so 99.9 and 4.9 never display as whole numbers.
export const CountUp = ({ value, suffix = '', duration = 0.9 }) => {
  const ref = useRef(null);
  const numberRef = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const reduced = useReducedMotion();

  const decimals = String(value).includes('.') ? String(value).split('.')[1].length : 0;
  const format = (n) =>
    n.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  useEffect(() => {
    const node = numberRef.current;
    if (!node) return undefined;

    // Imperative animate() is not covered by MotionConfig, so check directly
    if (!inView || reduced) {
      node.textContent = format(value);
      return undefined;
    }

    const controls = animate(0, value, {
      duration,
      ease: EASE_OUT,
      onUpdate: (latest) => {
        node.textContent = format(latest);
      },
    });

    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduced, value, duration]);

  return (
    <span ref={ref}>
      <span className="visually-hidden">
        {format(value)}
        {suffix}
      </span>
      <span aria-hidden="true">
        <span ref={numberRef} className="tabular">
          {format(0)}
        </span>
        {suffix}
      </span>
    </span>
  );
};
