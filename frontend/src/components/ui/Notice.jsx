import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { enter, exit } from '../../lib/motion';

// Errors interrupt the screen reader; everything else is announced politely.
const ROLE_FOR_TONE = { error: 'alert', success: 'status', info: 'status' };

export const Notice = ({ tone = 'info', onDismiss, children }) => (
  <AnimatePresence initial={false}>
    {children ? (
      <motion.div
        className={`notice ${tone}`}
        role={ROLE_FOR_TONE[tone] || 'status'}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0, transition: enter }}
        exit={{ opacity: 0, y: -4, transition: exit }}
      >
        <span className="notice-text">{children}</span>
        {onDismiss && (
          <button type="button" className="notice-dismiss" aria-label="Dismiss" onClick={onDismiss}>
            <X size={16} />
          </button>
        )}
      </motion.div>
    ) : null}
  </AnimatePresence>
);
