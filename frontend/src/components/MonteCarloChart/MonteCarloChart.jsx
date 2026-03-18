import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { Shuffle, TrendingUp, Info } from 'lucide-react';
import { fetchMonteCarloSimulation } from '../../services/api';
import { dedupeRequest } from '../../utils/requestDeduplication';

import { RiskStats } from './RiskStats';
import { MonteCarloTooltip } from './MonteCarloTooltip';
import { InfoModal } from './InfoModal';
import './MonteCarloChart.css';

const TIMEFRAME_OPTIONS = [
  { value: 30, label: '30D' },
  { value: 90, label: '90D' },
  { value: 252, label: '1Y' },
];

export const MonteCarloChart = ({ token, livePrices }) => {
  const [simData, setSimData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState(90);
  const [showInfo, setShowInfo] = useState(false);
  const hasFetchedRef = useRef(false);
  const lastParamsRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;

      // Prevent duplicate calls for same params
      const paramKey = `${token}:${timeframe}`;
      if (hasFetchedRef.current && lastParamsRef.current === paramKey) return;
      hasFetchedRef.current = true;
      lastParamsRef.current = paramKey;

      setLoading(true);
      setError(null);

      try {
        const response = await dedupeRequest(
          `monteCarlo:${token}:${timeframe}`,
          () => fetchMonteCarloSimulation(token, livePrices, timeframe)
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
  }, [token, timeframe, livePrices]);

  const handleTimeframeChange = (newTimeframe) => {
    if (newTimeframe === timeframe) return;
    hasFetchedRef.current = false;
    lastParamsRef.current = null;
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
    const range = max - min;
    const padding = range * 0.1 || Math.abs(min) * 0.1 || 100;
    return [Math.max(0, min - padding), max + padding];
  }, [chartData]);

  // Format currency for Y-axis
  const formatYAxis = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <article className="card mc-card">
      <InfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} />

      {/* Header */}
      <div className="mc-header">
        <div className="card-head">
          <Shuffle size={18} />
          <span>Monte Carlo Risk Simulation</span>
          <button
            className="info-btn"
            onClick={() => setShowInfo(true)}
            title="What is Monte Carlo?"
          >
            <Info size={16} />
          </button>
        </div>

        <div className="timeframe-selector compact">
          {TIMEFRAME_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleTimeframeChange(option.value)}
              className={`timeframe-btn ${timeframe === option.value ? 'active' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Risk Stats */}
      {simData?.stats && <RiskStats stats={simData.stats} />}

      {/* Chart */}
      {loading ? (
        <div className="chart-loading">
          <div className="loading-spinner" />
          <p>Running 10,000 simulations...</p>
        </div>
      ) : error ? (
        <div className="chart-empty">
          <TrendingUp size={48} strokeWidth={1} />
          <p>{error}</p>
        </div>
      ) : chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
          >
            <defs>
              <linearGradient id="mcBandOuter" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#32302f" stopOpacity={0.06} />
                <stop offset="100%" stopColor="#32302f" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="mcBandInner" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#32302f" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#32302f" stopOpacity={0.06} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e4e2e1"
              strokeOpacity={0.6}
              horizontal={true}
              vertical={false}
            />
            <XAxis
              dataKey="day"
              stroke="#c9c6c4"
              tick={{ fill: '#94908d', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#e4e2e1', strokeWidth: 1 }}
              tickFormatter={(day) => `Day ${day}`}
              interval={Math.max(1, Math.ceil(chartData.length / 6))}
            />
            <YAxis
              stroke="#c9c6c4"
              tick={{ fill: '#94908d', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#e4e2e1', strokeWidth: 1 }}
              tickFormatter={formatYAxis}
              domain={yDomain}
              width={55}
            />
            <ReferenceLine
              y={simData?.stats?.current_value}
              stroke="#c9c6c4"
              strokeDasharray="4 4"
              label={{
                value: 'Current',
                position: 'right',
                fill: '#94908d',
                fontSize: 11,
              }}
            />
            <Tooltip content={<MonteCarloTooltip />} />

            {/* Stacked bands: base (invisible) + band1 + band2 + band3 */}
            <Area
              type="monotone"
              dataKey="base"
              stackId="mc"
              stroke="none"
              fill="transparent"
            />
            <Area
              type="monotone"
              dataKey="band1"
              stackId="mc"
              stroke="none"
              fill="url(#mcBandOuter)"
            />
            <Area
              type="monotone"
              dataKey="band2"
              stackId="mc"
              stroke="none"
              fill="url(#mcBandInner)"
            />
            <Area
              type="monotone"
              dataKey="band3"
              stackId="mc"
              stroke="none"
              fill="url(#mcBandOuter)"
            />

            {/* Median line overlay */}
            <Area
              type="monotone"
              dataKey="p50"
              stroke="#32302f"
              strokeWidth={2}
              fill="none"
              dot={false}
              activeDot={{
                fill: '#32302f',
                r: 4,
                stroke: '#ffffff',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="chart-empty">
          <TrendingUp size={48} strokeWidth={1} />
          <p>Add assets to your portfolio to run risk simulation</p>
        </div>
      )}

      {/* Excluded assets warning */}
      {simData?.assets_excluded?.length > 0 && (
        <p className="mc-excluded">
          Could not fetch historical data for: {simData.assets_excluded.join(', ')}.
          These assets were excluded from the simulation.
        </p>
      )}

      {/* Disclaimer */}
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
