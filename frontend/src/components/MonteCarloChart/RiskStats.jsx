import { currency, percent } from '../../utils/formatters';
import { SERIES } from '../../lib/chartTheme';
import { StatTile } from '../ui/StatTile';

export const RiskStats = ({ stats }) => {
  if (!stats) return null;

  const isPositiveReturn = stats.expected_return_pct >= 0;

  return (
    <div className="stat-tiles">
      <StatTile
        label="Expected return"
        value={percent(stats.expected_return_pct, { signed: true })}
        sub={currency(stats.expected_value)}
        tone={isPositiveReturn ? 'positive' : 'negative'}
      />
      <StatTile
        label="Value at risk (95%)"
        value={currency(stats.var_95)}
        sub={`${percent(stats.var_95_pct, { digits: 1 })} of portfolio`}
        accent={SERIES.negative}
      />
      <StatTile
        label="Outcome range"
        value={`${currency(stats.worst_case)} — ${currency(stats.best_case)}`}
        sub={`Median: ${currency(stats.median_final)}`}
        accent={SERIES.simulation}
      />
    </div>
  );
};
