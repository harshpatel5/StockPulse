// Placeholder block that reserves the final layout while data loads
export const Skeleton = ({ width = '100%', height = '1rem', radius, className = '' }) => (
  <span
    className={`skeleton ${className}`.trim()}
    style={{ width, height, borderRadius: radius }}
    aria-hidden="true"
  />
);
