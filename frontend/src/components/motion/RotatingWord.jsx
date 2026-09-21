import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { DUR, EASE_OUT } from '../../lib/motion';

// Cycles through words inside a slot sized to the longest one, so the
// surrounding headline never reflows as the word changes.
export const RotatingWord = ({ words, interval = 2800 }) => {
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || words.length < 2) return undefined;

    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, interval);

    return () => clearInterval(id);
  }, [reduced, words, interval]);

  return (
    <span className="rotating-word">
      <span className="visually-hidden">{words[index]}</span>
      <span className="rotating-word-slot" aria-hidden="true">
        {words.map((word) => (
          <span key={word} className="rotating-word-sizer">
            {word}
          </span>
        ))}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={words[index]}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: DUR.base, ease: EASE_OUT }}
          >
            {words[index]}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
};
