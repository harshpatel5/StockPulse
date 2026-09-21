import { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieChartIcon, TrendingUp, TrendingDown, Layers } from 'lucide-react';
import { currency, percent } from '../utils/formatters';
import { CATEGORICAL } from '../lib/chartTheme';
import { useChartAnimation } from '../hooks/useChartAnimation';
import { fetchPortfolioInsights } from '../services/api';
import { dedupeRequest } from '../utils/requestDeduplication';
import { CardHeader } from './ui/CardHeader';
import { SegmentedControl } from './ui/SegmentedControl';
import { ChartState } from './ui/ChartState';
import { ChartTooltip } from './ui/ChartTooltip';

const VIEW_OPTIONS = [
  { value: 'asset', label: 'By Asset', icon: <Layers size={14} aria-hidden="true" /> },
  { value: 'type', label: 'By Type', icon: <PieChartIcon size={14} aria-hidden="true" /> },
];

// Never show 0% when there is any value at all
const formatPercentage = (value) => {
  if (value === 0) return '0%';
  if (value < 0.01) return '<0.01%';
  if (value < 0.1) return percent(value, { digits: 2 });
  if (value < 1) return percent(value, { digits: 1 });
  return `${Math.round(value)}%`;
};

// Categorical hues are assigned in fixed order and never cycled, so anything
// past the last slot folds into a single "Other" slice.
const foldToOther = (rows) => {
  if (rows.length <= CATEGORICAL.length) return rows;

  const sorted = [...rows].sort((a, b) => (b.value || 0) - (a.value || 0));
  const head = sorted.slice(0, CATEGORICAL.length - 1);
  const rest = sorted.slice(CATEGORICAL.length - 1);

  const other = rest.reduce(
    (acc, row) => ({
      ...acc,
      value: acc.value + (row.value || 0),
      percentage: acc.percentage + (row.percentage || 0),
    }),
    { name: 'Other', type: 'Other', value: 0, percentage: 0, count: rest.length }
  );

  return [...head, other];
};

// Label drawn on each segment
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent: fraction }) => {
  if (fraction < 0.03) return null;

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      style={{ fontSize: '12px', fontWeight: '600', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
    >
      {formatPercentage(fraction * 100)}
    </text>
  );
};

const AllocationTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  return (
    <ChartTooltip
      title={data.name || data.type}
      rows={[
        { label: 'Value', value: currency(data.value), color: payload[0].color },
        { label: 'Share', value: `${formatPercentage(data.percentage)} of portfolio` },
      ]}
    />
  );
};

const AllocationLegend = ({ data }) => (
  <div className="allocation-legend">
    {data.map((entry, index) => (
      <div key={entry.name || entry.type} className="legend-item">
        <div className="legend-color" style={{ backgroundColor: CATEGORICAL[index] }} />
        <div className="legend-info">
          <span className="legend-name">
            {entry.name || entry.type}
            {entry.count ? ` (${entry.count})` : ''}
          </span>
          <span className="legend-pct tabular">{formatPercentage(entry.percentage)}</span>
        </div>
        <span className="legend-value tabular">{currency(entry.value)}</span>
      </div>
    ))}
  </div>
);

export const AllocationChart = ({ allocationData, token, livePrices }) => {
  const [viewMode, setViewMode] = useState('asset');
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const prevPricesRef = useRef(null);
  const fetchTimeoutRef = useRef(null);
  const animation = useChartAnimation();

  // Fetch insights from backend when prices change
  useEffect(() => {
    const fetchInsights = async () => {
      if (!token || !livePrices || Object.keys(livePrices).length === 0) return;

      // Check if prices actually changed
      const pricesStr = JSON.stringify(livePrices);
      if (prevPricesRef.current === pricesStr) return;
      prevPricesRef.current = pricesStr;

      setLoading(true);
      setError(null);
      try {
        // Use deduplication with a key based on token and prices hash
        const pricesHash = pricesStr.substring(0, 50);
        const data = await dedupeRequest(
          `fetchInsights:${token}:${pricesHash}`,
          () => fetchPortfolioInsights(token, livePrices),
          500
        );
        setInsights(data);
      } catch (err) {
        console.warn('Failed to fetch portfolio insights:', err);
        setError(err?.message || 'Could not load your allocation.');
      } finally {
        setLoading(false);
      }
    };

    // Clear any pending timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Debounce to prevent multiple rapid calls
    fetchTimeoutRef.current = setTimeout(fetchInsights, 300);

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [token, livePrices]);

  const rawData = viewMode === 'asset' ? insights?.by_asset || [] : insights?.by_type || allocationData || [];
  const chartData = foldToOther(rawData);
  const hasData = chartData.length > 0;
  const retry = () => {
    prevPricesRef.current = null;
    setError(null);
  };

  let body;
  if (loading && !hasData) {
    body = <ChartState status="loading" message="Calculating allocation" />;
  } else if (error && !hasData) {
    body = <ChartState status="error" message={error} onRetry={retry} />;
  } else if (hasData) {
    body = (
      <div className="allocation-content">
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey={viewMode === 'asset' ? 'name' : 'type'}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={120}
                paddingAngle={1}
                strokeWidth={0}
                label={renderCustomLabel}
                labelLine={false}
                {...animation}
              >
                {chartData.map((entry, index) => (
                  <Cell key={entry.name || entry.type} fill={CATEGORICAL[index]} />
                ))}
              </Pie>
              <Tooltip content={<AllocationTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {insights && (
            <div className="chart-center-stats">
              <span className="center-label">Total</span>
              <span className="center-value tabular">{currency(insights.total_value)}</span>
              <span className={`center-change tabular ${insights.total_gain_loss >= 0 ? 'positive' : 'negative'}`}>
                {insights.total_gain_loss >= 0 ? (
                  <TrendingUp size={14} aria-hidden="true" />
                ) : (
                  <TrendingDown size={14} aria-hidden="true" />
                )}
                {percent(insights.total_gain_loss_pct, { signed: true })}
              </span>
            </div>
          )}
        </div>

        <AllocationLegend data={chartData} />
      </div>
    );
  } else {
    body = <ChartState icon={PieChartIcon} message="Add assets to see your portfolio allocation" />;
  }

  return (
    <article className="card allocation-card">
      <CardHeader
        icon={PieChartIcon}
        title="Portfolio Allocation"
        actions={
          <SegmentedControl
            options={VIEW_OPTIONS}
            value={viewMode}
            onChange={setViewMode}
            label="Allocation view"
          />
        }
      />
      {body}
    </article>
  );
};
