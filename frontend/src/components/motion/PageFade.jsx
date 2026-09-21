import { motion } from 'framer-motion';
import { enter } from '../../lib/motion';

// Enter-only page fade. Opacity only, so it never creates a containing block
// for sticky or fixed children.
export const PageFade = ({ className, children }) => (
  <motion.div className={className} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={enter}>
    {children}
  </motion.div>
);
