import { useId } from 'react';
import { LayoutGroup, motion } from 'framer-motion';
import { enter } from '../../lib/motion';

// Timeframe / view switcher. The active pill slides between options via a
// layoutId scoped with useId, so pills in different cards never fly into
// each other.
export const SegmentedControl = ({ options, value, onChange, label, compact = false }) => {
  const groupId = useId();

  return (
    <LayoutGroup id={groupId}>
      <div className={`segmented${compact ? ' segmented--compact' : ''}`} role="group" aria-label={label}>
        {options.map((option) => {
          const isActive = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              className={`segmented-btn${isActive ? ' active' : ''}`}
              aria-pressed={isActive}
              disabled={option.disabled}
              title={option.title}
              onClick={() => onChange(option.value)}
            >
              {isActive && (
                <motion.span
                  className="segmented-pill"
                  layoutId={`${groupId}-pill`}
                  transition={enter}
                  aria-hidden="true"
                />
              )}
              <span className="segmented-label">
                {option.icon}
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
};
