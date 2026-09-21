import { useState, useEffect, useMemo, useRef } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { Shuffle, TrendingUp } from 'lucide-react';
import { fetchMonteCarloSimulation } from '../../services/api';
import { dedupeRequest } from '../../utils/requestDeduplication';
import { currency, compactCurrency } from '../../utils/formatters';
import { SERIES, BAND_OPACITY, axisProps, gridProps, REFERENCE_STROKE } from '../../lib/chartTheme';
import { useChartAnimation } from '../../hooks/useChartAnimation';
import { CardHeader } from '../ui/CardHeader';
import { InfoButton } from '../ui/InfoButton';
import { SegmentedControl } from '../ui/SegmentedControl';
import { ChartState } from '../ui/ChartState';
import { ChartTooltip } from '../ui/ChartTooltip';

import { RiskStats } from './RiskStats';
import { InfoModal } from './InfoModal';
import './MonteCarloChart.css';

const TIMEFRAME_OPTIONS = [
  { value: 30, label: '30D' },
  { value: 90, label: '90D' },
  { value: 252, label: '1Y' },
];

const SimulationTooltip = ({ active, payload }) => {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <ChartTooltip
      title={`Day ${point.day}`}
      rows={[
        { label: '95th percentile', value: currency(point.p95) },
        { label: '75th percentile', value: currency(point.p75) },
        { label: 'Median', value: currency(point.p50), color: SERIES.simulation },
        { label: '25th percentile', value: currency(point.p25) },
        { label: '5th percentile', value: currency(point.p5) },
      ]}
    />
  );
};

export const MonteCarloChart = ({ token, livePrices, dataVersion = 0 }) => {
  const [simData, setSimData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState(90);
  const [showInfo, setShowInfo] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const lastParamsRef = useRef(null);
  const animation = useChartAnimation();

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;

      // Refetch on token, timeframe, portfolio change, or retry
      const paramKey = `${token}:${timeframe}:${dataVersion}:${retryTick}`;
      if (lastParamsRef.current === paramKey) return;
      lastParamsRef.current = paramKey;

      setLoading(true);
      setError(null);

      try {
        const response = await dedupeRequest(`monteCarlo:${token}:${timeframe}`, () =>
          fetchMonteCarloSimulation(token, livePrices, timeframe)
        );

        if (response.message && !response.paths) {
          setError(response.message);
          setSimData(null);
        } else {
          setSimData(response);
        }
      } catch (err) {
        setError(err.message);
        setSimData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, timeframe, dataVersion, retryTick, livePrices]);

  const handleTimeframeChange = (newTimeframe) => {
    if (newTimeframe === timeframe) return;
    setTimeframe(newTimeframe);
  };

  // Transform percentile paths into chart data
  const chartData = useMemo(() => {
    if (!simData?.paths) return [];

    const { p5, p25, p50, p75, p95 } = simData.paths;
    return p50.map((_, i) => ({
      day: i,
      p5: p5[i],
      p25: p25[i],
      p50: p50[i],
      p75: p75[i],
      p95: p95[i],
      // Stacked band values (for the AreaChart stacking)
      base: p5[i],
      band1: p25[i] - p5[i],
      band2: p75[i] - p25[i],
      band3: p95[i] - p75[i],
    }));
  }, [simData]);

  // Y-axis domain
  const yDomain = useMemo(() => {
    if (!chartData.length) return [0, 1];
    const min = Math.min(...chartData.map((d) => d.p5));
    const max = Math.max(...chartData.map((d) => d.p95));
    const padding = (max - min) * 0.1 || Math.abs(min) * 0.1 || 100;
    return [Math.max(0, min - padding), max + padding];
  }, [chartData]);

  const retry = () => {
    setError(null);
    setRetryTick((tick) => tick + 1);
  };

  // The previous simulation stays visible (dimmed) while a new one runs
  const showSkeleton = loading && !simData;
  const isRefreshing = loading && Boolean(simData);

  let body;
  if (showSkeleton) {
    body = <ChartState status="loading" height={300} message="Running 10,000 simulations" />;
  } else if (error && !simData) {
    body = <ChartState status="error" height={300} message={error} onRetry={retry} />;
  } else if (chartData.length > 0) {
    body = (
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="mcBandOuter" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES.simulation} stopOpacity={BAND_OPACITY.outer} />
              <stop offset="100%" stopColor={SERIES.simulation} stopOpacity={BAND_OPACITY.outer * 0.4} />
            </linearGradient>
            <linearGradient id="mcBandInner" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES.simulation} stopOpacity={BAND_OPACITY.inner} />
              <stop offset="100%" stopColor={SERIES.simulation} stopOpacity={BAND_OPACITY.inner * 0.4} />
            </linearGradient>
          </defs>

          <CartesianGrid {...gridProps} strokeOpacity={0.5} />
          <XAxis
            dataKey="day"
            {...axisProps}
            tickFormatter={(day) => `Day ${day}`}
            interval={Math.max(1, Math.ceil(chartData.length / 6))}
          />
          <YAxis
            {...axisProps}
            tickFormatter={(value) => compactCurrency(value)}
            domain={yDomain}
            width={55}
          />
          <ReferenceLine
            y={simData?.stats?.current_value}
            stroke={REFERENCE_STROKE}
            strokeDasharray="4 4"
            label={{ value: 'Current', position: 'right', fill: '#9a9a9a', fontSize: 11 }}
          />
          <Tooltip content={<SimulationTooltip />} />

          {/* Stacked bands: base (invisible) + band1 + band2 + band3 */}
          <Area type="monotone" dataKey="base" stackId="mc" stroke="none" fill="transparent" {...animation} />
          <Area type="monotone" dataKey="band1" stackId="mc" stroke="none" fill="url(#mcBandOuter)" {...animation} />
          <Area type="monotone" dataKey="band2" stackId="mc" stroke="none" fill="url(#mcBandInner)" {...animation} />
          <Area type="monotone" dataKey="band3" stackId="mc" stroke="none" fill="url(#mcBandOuter)" {...animation} />

          {/* Median line overlay */}
          <Area
            type="monotone"
            dataKey="p50"
            stroke={SERIES.simulation}
            strokeWidth={2}
            fill="none"
            dot={false}
            activeDot={{ fill: SERIES.simulation, r: 4, stroke: '#1a1a1a', strokeWidth: 2 }}
            {...animation}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  } else {
    body = (
      <ChartState
        height={300}
        icon={TrendingUp}
        message="Add assets to your portfolio to run risk simulation"
      />
    );
  }

  return (
    <article className="card mc-card">
      <InfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} />

      <CardHeader
        icon={Shuffle}
        title="Monte Carlo Risk Simulation"
        actions={
          <>
            {isRefreshing && <span className="btn-spinner" aria-hidden="true" />}
            <SegmentedControl
              compact
              options={TIMEFRAME_OPTIONS}
              value={timeframe}
              onChange={handleTimeframeChange}
              label="Simulation horizon"
            />
          </>
        }
      >
        <InfoButton label="How Monte Carlo simulation works" onClick={() => setShowInfo(true)} />
      </CardHeader>

      <div className={isRefreshing ? 'is-refreshing' : undefined} aria-busy={isRefreshing || undefined}>
        {simData?.stats && <RiskStats stats={simData.stats} />}
        {body}
      </div>

      {simData?.assets_excluded?.length > 0 && (
        <p className="mc-excluded">
          Could not fetch historical data for: {simData.assets_excluded.join(', ')}.
          These assets were excluded from the simulation.
        </p>
      )}

      {simData?.paths && (
        <p className="mc-disclaimer">
          Based on {simData.num_simulations.toLocaleString()} simulated paths using historical
          return distributions. This is not financial advice. Past performance does not guarantee
          future results. Extreme market events (black swans) are not captured by this model.
        </p>
      )}
    </article>
  );
};
