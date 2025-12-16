import React from 'react';
import { Trophy, TrendingDown as TrendingDownIcon } from 'lucide-react';

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
        <span className="perf-icon">📊</span>
        <span>You're tracking right alongside the market. Steady as she goes!</span>
      </div>
    );
  }

  if (isBeating) {
    return (
      <div className="performance-message positive">
        <Trophy size={18} className="perf-icon" />
        <span>
          Congratulations! You're <strong>outperforming</strong> the S&P 500 by{' '}
          {diff.toFixed(2)}%! Your stock picks are paying off! 🚀
        </span>
      </div>
    );
  }

  return (
    <div className="performance-message negative">
      <TrendingDownIcon size={18} className="perf-icon" />
      <span>
        The market is ahead by {Math.abs(diff).toFixed(2)}%. Consider
        diversifying or reviewing your strategy.
      </span>
    </div>
  );
};
