import { Trophy, TrendingDown, Minus } from 'lucide-react';
import { percent } from '../../utils/formatters';

/**
 * Performance Message - Shows encouragement/feedback based on performance
 */
export const PerformanceMessage = ({ portfolioReturn, sp500Return }) => {
  if (sp500Return === null || sp500Return === undefined) return null;

  const diff = portfolioReturn - sp500Return;
  const isBeating = diff > 0;
  const isTied = Math.abs(diff) < 0.5;

  if (isTied) {
    return (
      <div className="performance-message neutral">
        <Minus size={18} className="perf-icon" aria-hidden="true" />
        <span>You're tracking right alongside the market. Steady as she goes.</span>
      </div>
    );
  }

  if (isBeating) {
    return (
      <div className="performance-message positive">
        <Trophy size={18} className="perf-icon" aria-hidden="true" />
        <span>
          You're <strong>outperforming</strong> the S&P 500 by {percent(diff)}.
        </span>
      </div>
    );
  }

  return (
    <div className="performance-message negative">
      <TrendingDown size={18} className="perf-icon" aria-hidden="true" />
      <span>
        The market is ahead by {percent(Math.abs(diff))}. Consider diversifying or
        reviewing your strategy.
      </span>
    </div>
  );
};
