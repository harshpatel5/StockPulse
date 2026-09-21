import { AlertCircle } from 'lucide-react';
import { Skeleton } from './Skeleton';

// Loading, empty and error states that all reserve the same height, so the card
// never changes size as it moves between them.
export const ChartState = ({
  status = 'empty',
  height = 280,
  icon: Icon,
  message,
  hint,
  onRetry,
}) => {
  if (status === 'loading') {
    return (
      <div className="chart-state" style={{ minHeight: height }} role="status" aria-busy="true">
        <Skeleton height={height - 32} radius="var(--radius-card)" />
        <span className="visually-hidden">{message || 'Loading chart'}</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="chart-state" style={{ minHeight: height }}>
        <AlertCircle size={32} strokeWidth={1.5} aria-hidden="true" />
        <p>{message || 'Could not load this chart.'}</p>
        {onRetry && (
          <button type="button" className="btn ghost" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="chart-state" style={{ minHeight: height }}>
      {Icon && <Icon size={48} strokeWidth={1} aria-hidden="true" />}
      <p>{message}</p>
      {hint && <span className="chart-state-hint">{hint}</span>}
    </div>
  );
};
