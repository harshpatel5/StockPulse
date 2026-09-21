import { motion } from 'framer-motion';
import { fadeUp, inViewOnce, stagger } from '../../lib/motion';

// Motion components are created once at module scope: building motion[tag]
// inline would remount the node on every render.
const TAGS = {
  div: motion.div,
  section: motion.section,
  article: motion.article,
  header: motion.header,
  h2: motion.h2,
  h3: motion.h3,
  p: motion.p,
  span: motion.span,
  ul: motion.ul,
  li: motion.li,
};

const resolve = (as) => TAGS[as] || motion.div;

const triggerFor = (onMount) =>
  onMount ? { animate: 'visible' } : { whileInView: 'visible', viewport: inViewOnce };

// Fades content in when it scrolls into view, or on mount with `onMount`.
export const Reveal = ({ as = 'div', onMount = false, variants = fadeUp, children, ...rest }) => {
  const Tag = resolve(as);

  return (
    <Tag initial="hidden" variants={variants} {...triggerFor(onMount)} {...rest}>
      {children}
    </Tag>
  );
};

// Staggers its RevealItem children.
export const RevealGroup = ({
  as = 'div',
  onMount = false,
  gap = 0.04,
  delay = 0,
  children,
  ...rest
}) => {
  const Tag = resolve(as);

  return (
    <Tag initial="hidden" variants={stagger(gap, delay)} {...triggerFor(onMount)} {...rest}>
      {children}
    </Tag>
  );
};

// Child of RevealGroup: it inherits the animation state from its parent.
export const RevealItem = ({ as = 'div', variants = fadeUp, children, ...rest }) => {
  const Tag = resolve(as);

  return (
    <Tag variants={variants} {...rest}>
      {children}
    </Tag>
  );
};
