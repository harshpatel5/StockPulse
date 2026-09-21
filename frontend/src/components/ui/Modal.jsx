import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { fade, pop } from '../../lib/motion';

// Accessible dialog rendered into document.body, so an ancestor transform can
// never break its fixed positioning.
export const Modal = ({ isOpen, onClose, title, className = '', children }) => {
  const titleId = useId();
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);

  // Keep the latest handler without re-running the open effect (which would
  // steal focus back to the close button on every parent render).
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return undefined;

    const previouslyFocused = document.activeElement;
    const root = document.getElementById('root');
    const previousOverflow = document.body.style.overflow;
    const previousInert = root ? root.inert : false;

    // inert traps focus and hides the page behind the dialog from assistive tech
    if (root) root.inert = true;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current?.();
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (root) root.inert = previousInert;
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [isOpen]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="info-modal-overlay"
          variants={fade}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            className={`info-modal ${className}`.trim()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            variants={pop}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <button
              ref={closeRef}
              type="button"
              className="info-modal-close"
              aria-label="Close"
              onClick={onClose}
            >
              <X size={20} />
            </button>
            <h3 id={titleId}>{title}</h3>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
