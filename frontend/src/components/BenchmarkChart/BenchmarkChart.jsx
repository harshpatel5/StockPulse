import { useState, useEffect, useMemo, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { fetchBenchmarkComparison } from '../../services/api';
import { dedupeRequest } from '../../utils/requestDeduplication';
import { percent, formatDateUTC } from '../../utils/formatters';
import {
  SERIES,
  BENCHMARK_DASH,
  axisProps,
  gridProps,
  REFERENCE_STROKE,
} from '../../lib/chartTheme';
import { useChartAnimation } from '../../hooks/useChartAnimation';
import { CardHeader } from '../ui/CardHeader';
import { InfoButton } from '../ui/InfoButton';
import { SegmentedControl } from '../ui/SegmentedControl';
import { StatTile } from '../ui/StatTile';
import { ChartState } from '../ui/ChartState';
import { ChartTooltip } from '../ui/ChartTooltip';

// Sub-components
import { InfoModal } from './InfoModal';
import { PerformanceMessage } from './PerformanceMessage';

// Styles
import './BenchmarkChart.css';

const TIMEFRAME_OPTIONS = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'ALL' },
];

const DAYS_BY_TIMEFRAME = { '7d': 7, '30d': 30, '3m': 90, '6m': 180, '1y': 365 };

const BenchmarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <ChartTooltip
      title={formatDateUTC(label, 'long')}
      rows={payload.map((entry) => ({
        label: entry.name,
        value: entry.value !== null ? percent(entry.value, { signed: true }) : 'N/A',
        color: entry.color,
        dashed: entry.dataKey === 'sp500',
      }))}
    />
  );
};

/**
 * BenchmarkChart - Portfolio vs S&P 500 Comparison
 */
export const BenchmarkChart = ({ token }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSP500, setHasSP500] = useState(false);
  const [timeframe, setTimeframe] = useState('all');
  const [showInfo, setShowInfo] = useState(false);
  const hasFetchedRef = useRef(false);
  const lastTokenRef = useRef(null);
  const animation = useChartAnimation();

  // Fetch comparison data
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;

      // Prevent duplicate calls for the same token
      if (hasFetchedRef.current && lastTokenRef.current === token) return;
      hasFetchedRef.current = true;
      lastTokenRef.current = token;

      setLoading(true);
      setError(null);

      try {
        const response = await dedupeRequest(`fetchBenchmark:${token}`, () =>
          fetchBenchmarkComparison(token)
        );
        setData(response.data || []);
        setHasSP500(response.has_sp500_data || false);
      } catch (err) {
        setError(err.message);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // Filter data based on timeframe
  const filteredData = useMemo(() => {
    if (!data.length) return [];
    if (timeframe === 'all') return data;

    const daysAgo = DAYS_BY_TIMEFRAME[timeframe] || 365;
    const cutoffDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    return data.filter((item) => new Date(item.date) >= cutoffDate);
  }, [data, timeframe]);

  // Calculate Y-axis domain with padding
  const yDomain = useMemo(() => {
    if (!filteredData.length) return [-10, 10];

    const allValues = filteredData.flatMap((d) => [d.portfolio, d.sp500].filter((v) => v !== null));
    if (!allValues.length) return [-10, 10];

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = Math.max((max - min) * 0.15, 5);

    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [filteredData]);

  // Get latest data point for summary
  const latestData = filteredData.length > 0 ? filteredData[filteredData.length - 1] : null;
  const showBenchmark = hasSP500 && latestData?.sp500 !== null && latestData?.sp500 !== undefined;
  const difference = showBenchmark ? latestData.portfolio - latestData.sp500 : null;

  const retry = () => {
    hasFetchedRef.current = false;
    lastTokenRef.current = null;
    setError(null);
    setTimeframe((current) => current);
  };

  let body;
  if (loading) {
    body = <ChartState status="loading" height={300} message="Loading comparison data" />;
  } else if (error) {
    body = <ChartState status="error" height={300} message={error} onRetry={retry} />;
  } else if (filteredData.length > 1) {
    body = (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={filteredData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
          <CartesianGrid {...gridProps} strokeOpacity={0.6} />
          <XAxis
            dataKey="date"
            {...axisProps}
            tickFormatter={(value) => formatDateUTC(value)}
            angle={-45}
            textAnchor="end"
            height={60}
            interval={filteredData.length <= 7 ? 0 : Math.ceil(filteredData.length / 5)}
          />
          <YAxis {...axisProps} tickFormatter={(value) => `${value}%`} domain={yDomain} />
          <ReferenceLine y={0} stroke={REFERENCE_STROKE} strokeDasharray="3 3" />
          <Tooltip content={<BenchmarkTooltip />} />
          <Legend verticalAlign="top" height={36} iconType="line" wrapperStyle={{ paddingBottom: '10px' }} />
          <Line
            type="monotone"
            dataKey="portfolio"
            name="Your Portfolio"
            stroke={SERIES.portfolio}
            strokeWidth={2}
            dot={false}
            activeDot={{ fill: SERIES.portfolio, r: 5, strokeWidth: 0 }}
            {...animation}
          />
          {hasSP500 && (
            <Line
              type="monotone"
              dataKey="sp500"
              name="S&P 500"
              stroke={SERIES.benchmark}
              strokeWidth={2}
              strokeDasharray={BENCHMARK_DASH}
              dot={false}
              activeDot={{ fill: SERIES.benchmark, r: 5, strokeWidth: 0 }}
              {...animation}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    );
  } else {
    body = (
      <ChartState
        height={300}
        icon={TrendingUp}
        message="Need at least 2 days of portfolio history to show comparison"
        hint="Keep tracking your portfolio to see how it performs vs the market"
      />
    );
  }

  return (
    <article className="card benchmark-card">
      <InfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} />

      <CardHeader
        icon={BarChart3}
        title="Portfolio vs S&P 500"
        actions={
          <SegmentedControl
            compact
            options={TIMEFRAME_OPTIONS}
            value={timeframe}
            onChange={setTimeframe}
            label="Comparison timeframe"
          />
        }
      >
        <InfoButton label="How benchmark comparison works" onClick={() => setShowInfo(true)} />
      </CardHeader>

      {latestData && (
        <div className="stat-tiles">
          <StatTile
            label="Your portfolio"
            value={percent(latestData.portfolio, { signed: true })}
            tone={latestData.portfolio >= 0 ? 'positive' : 'negative'}
            accent={SERIES.portfolio}
          />

          {showBenchmark && (
            <StatTile
              label="S&P 500"
              value={percent(latestData.sp500, { signed: true })}
              tone={latestData.sp500 >= 0 ? 'positive' : 'negative'}
              accent={SERIES.benchmark}
            />
          )}

          {showBenchmark && (
            <StatTile
              label="vs Benchmark"
              value={percent(difference, { signed: true })}
              tone={difference >= 0 ? 'positive' : 'negative'}
            />
          )}
        </div>
      )}

      {showBenchmark && (
        <PerformanceMessage portfolioReturn={latestData.portfolio} sp500Return={latestData.sp500} />
      )}

      {body}

      {!hasSP500 && filteredData.length > 1 && (
        <p className="benchmark-note">
          S&P 500 data requires a valid Finnhub API key configured on the server.
        </p>
      )}
    </article>
  );
};
