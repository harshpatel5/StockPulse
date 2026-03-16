import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { TrendingUp, BarChart3, Info } from 'lucide-react';
import { fetchBenchmarkComparison } from '../../services/api';
import { dedupeRequest } from '../../utils/requestDeduplication';

// Sub-components
import { InfoModal } from './InfoModal';
import { PerformanceMessage } from './PerformanceMessage';
import { ChartTooltip } from './ChartTooltip';

// Styles
import './BenchmarkChart.css';

// Timeframe options
const TIMEFRAME_OPTIONS = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'ALL' },
];

// Chart colors
const COLORS = {
  portfolio: '#F59E0B',
  sp500: '#EF4444',
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
        const response = await dedupeRequest(
          `fetchBenchmark:${token}`,
          () => fetchBenchmarkComparison(token)
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

    const now = new Date();
    const daysMap = {
      '7d': 7,
      '30d': 30,
      '3m': 90,
      '6m': 180,
      '1y': 365,
    };

    const daysAgo = daysMap[timeframe] || 365;
    const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    return data.filter((item) => {
      // Parse ISO datetime string (handles both "YYYY-MM-DD" and "YYYY-MM-DDTHH:MM:SS+00:00")
      const itemDate = new Date(item.date);
      return itemDate >= cutoffDate;
    });
  }, [data, timeframe]);

  // Format date for X-axis (displays in UTC to match backend date)
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      timeZone: 'UTC' // Force UTC display to match backend date
    });
  };

  // Calculate Y-axis domain with padding
  const yDomain = useMemo(() => {
    if (!filteredData.length) return [-10, 10];

    const allValues = filteredData.flatMap((d) =>
      [d.portfolio, d.sp500].filter((v) => v !== null)
    );

    if (!allValues.length) return [-10, 10];

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const range = max - min;
    const padding = Math.max(range * 0.15, 5);

    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [filteredData]);

  // Get latest data point for summary
  const latestData = filteredData.length > 0 ? filteredData[filteredData.length - 1] : null;

  return (
    <article className="card benchmark-card">
      <InfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} />

      {/* Header */}
      <div className="benchmark-header">
        <div className="card-head">
          <BarChart3 size={18} />
          <span>Portfolio vs S&P 500</span>
          <button
            className="info-btn"
            onClick={() => setShowInfo(true)}
            title="What is benchmark?"
          >
            <Info size={16} />
          </button>
        </div>

        <div className="timeframe-selector compact">
          {TIMEFRAME_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setTimeframe(option.value)}
              className={`timeframe-btn ${timeframe === option.value ? 'active' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Performance Summary */}
      {latestData && (
        <div className="benchmark-summary">
          <div
            className={`summary-item portfolio ${
              latestData.portfolio >= 0 ? 'positive' : 'negative'
            }`}
          >
            <span className="summary-label">Your Portfolio</span>
            <span className="summary-value">
              {latestData.portfolio >= 0 ? '+' : ''}
              {latestData.portfolio.toFixed(2)}%
            </span>
          </div>

          {hasSP500 && latestData.sp500 !== null && (
            <div
              className={`summary-item sp500 ${
                latestData.sp500 >= 0 ? 'positive' : 'negative'
              }`}
            >
              <span className="summary-label">S&P 500</span>
              <span className="summary-value">
                {latestData.sp500 >= 0 ? '+' : ''}
                {latestData.sp500.toFixed(2)}%
              </span>
            </div>
          )}

          {hasSP500 && latestData.sp500 !== null && (
            <div
              className={`summary-item diff ${
                latestData.portfolio - latestData.sp500 >= 0 ? 'positive' : 'negative'
              }`}
            >
              <span className="summary-label">vs Benchmark</span>
              <span className="summary-value">
                {latestData.portfolio - latestData.sp500 >= 0 ? '+' : ''}
                {(latestData.portfolio - latestData.sp500).toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Performance Message */}
      {latestData && hasSP500 && latestData.sp500 !== null && (
        <PerformanceMessage
          portfolioReturn={latestData.portfolio}
          sp500Return={latestData.sp500}
        />
      )}

      {/* Chart */}
      {loading ? (
        <div className="chart-loading">
          <div className="loading-spinner" />
          <p>Loading comparison data...</p>
        </div>
      ) : error ? (
        <div className="chart-empty">
          <TrendingUp size={48} strokeWidth={1} />
          <p>{error}</p>
        </div>
      ) : filteredData.length > 1 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={filteredData}
            margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
            <XAxis
              dataKey="date"
              stroke="#666666"
              tick={{ fill: '#666666', fontSize: 11 }}
              tickFormatter={formatDate}
              tickLine={false}
              angle={-45}
              textAnchor="end"
              height={60}
              interval={filteredData.length <= 7 ? 0 : Math.ceil(filteredData.length / 5)}
            />
            <YAxis
              stroke="#666666"
              tick={{ fill: '#666666', fontSize: 11 }}
              tickFormatter={(value) => `${value}%`}
              domain={yDomain}
            />
            <ReferenceLine y={0} stroke="#2A2A2A" strokeDasharray="3 3" />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="line"
              wrapperStyle={{ paddingBottom: '10px' }}
            />
            <Line
              type="monotone"
              dataKey="portfolio"
              name="Your Portfolio"
              stroke={COLORS.portfolio}
              strokeWidth={3}
              dot={false}
              activeDot={{ fill: COLORS.portfolio, r: 5, strokeWidth: 0 }}
            />
            {hasSP500 && (
              <Line
                type="monotone"
                dataKey="sp500"
                name="S&P 500"
                stroke={COLORS.sp500}
                strokeWidth={3}
                dot={false}
                activeDot={{ fill: COLORS.sp500, r: 5, strokeWidth: 0 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="chart-empty">
          <TrendingUp size={48} strokeWidth={1} />
          <p>Need at least 2 days of portfolio history to show comparison</p>
          <span className="empty-hint">
            Keep tracking your portfolio to see how it performs vs the market!
          </span>
        </div>
      )}

      {/* S&P 500 Note */}
      {!hasSP500 && filteredData.length > 1 && (
        <p className="benchmark-note">
          📊 S&P 500 data requires a valid Finnhub API key configured on the server.
        </p>
      )}
    </article>
  );
};
