import React from 'react';
import { currency } from '../../utils/formatters';

export const RiskStats = ({ stats }) => {
  if (!stats) return null;

  const isPositiveReturn = stats.expected_return_pct >= 0;

  return (
    <div className="mc-stats">
      <div className={`mc-stat-item expected ${isPositiveReturn ? 'positive' : 'negative'}`}>
        <span className="mc-stat-label">Expected Return</span>
        <span className="mc-stat-value">
          {isPositiveReturn ? '+' : ''}{stats.expected_return_pct.toFixed(2)}%
        </span>
        <span className="mc-stat-sub">{currency(stats.expected_value)}</span>
      </div>

      <div className="mc-stat-item var">
        <span className="mc-stat-label">Value at Risk (95%)</span>
        <span className="mc-stat-value">{currency(stats.var_95)}</span>
        <span className="mc-stat-sub">{stats.var_95_pct.toFixed(1)}% of portfolio</span>
      </div>

      <div className="mc-stat-item range">
        <span className="mc-stat-label">Outcome Range</span>
        <span className="mc-stat-value">{currency(stats.worst_case)} — {currency(stats.best_case)}</span>
        <span className="mc-stat-sub">Median: {currency(stats.median_final)}</span>
      </div>
    </div>
  );
};
