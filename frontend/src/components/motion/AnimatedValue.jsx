import { AnimatePresence, motion } from 'framer-motion';
import { DUR } from '../../lib/motion';

// Fades when the value changes. Deliberately not a count-up: a number caught
// mid-tween misrepresents money.
export const AnimatedValue = ({ className = '', children }) => (
  <AnimatePresence mode="wait" initial={false}>
    <motion.span
      key={String(children)}
      className={className}
      initial={{ opacity: 0.35 }}
      animate={{ opacity: 1 }}
      transition={{ duration: DUR.base }}
    >
      {children}
    </motion.span>
  </AnimatePresence>
);
