import React, { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieChartIcon, TrendingUp, TrendingDown, Layers } from 'lucide-react';
import { currency } from '../utils/formatters';
import { fetchPortfolioInsights } from '../services/api';
import { dedupeRequest } from '../utils/requestDeduplication';

// Extended color palette matching the reference image style
const CHART_COLORS = [
  '#2B9EB3', // Teal (Rent)
  '#C94C4C', // Red (Food)
  '#D4A84B', // Gold/Amber (Utilities)
  '#E87C4F', // Orange (Leisure)
  '#7D8C93', // Gray-blue (Clothes)
  '#3498DB', // Blue (Phone)
  '#9B59B6', // Purple
  '#1ABC9C', // Turquoise
  '#E74C3C', // Bright Red
  '#F39C12', // Yellow-orange
  '#27AE60', // Green
  '#8E44AD', // Deep Purple
];

// Format percentage - never show 0% if there's any value
const formatPercentage = (value) => {
  if (value === 0) return '0%';
  if (value < 0.01) return '<0.01%';
  if (value < 0.1) return value.toFixed(2) + '%';
  if (value < 1) return value.toFixed(1) + '%';
  return Math.round(value) + '%';
};

// Custom label that renders on the pie segments
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  // Don't render label for very small segments
  if (percent < 0.03) return null;
  
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
      style={{ 
        fontSize: '12px', 
        fontWeight: '600',
        textShadow: '0 1px 2px rgba(0,0,0,0.5)'
      }}
    >
      {formatPercentage(percent * 100)}
    </text>
  );
};

// Custom tooltip for the chart
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const displayPct = formatPercentage(data.percentage);
    return (
      <div className="chart-tooltip">
        <p className="tooltip-label">{data.name || data.type}</p>
        <p className="tooltip-value">{currency(data.value)}</p>
        <p className="tooltip-pct">{displayPct} of portfolio</p>
      </div>
    );
  }
  return null;
};

// Custom legend that shows allocation list with proper small value handling
const AllocationLegend = ({ data }) => {
  return (
    <div className="allocation-legend">
      {data.map((entry, index) => (
        <div key={entry.name || entry.type} className="legend-item">
          <div className="legend-color" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
          <div className="legend-info">
            <span className="legend-name">{entry.name || entry.type}</span>
            <span className="legend-pct">{formatPercentage(entry.percentage)}</span>
          </div>
          <span className="legend-value">{currency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

export const AllocationChart = ({ allocationData, token, livePrices }) => {
  const [viewMode, setViewMode] = useState('asset'); // 'asset' or 'type'
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const prevPricesRef = useRef(null);
  const fetchTimeoutRef = useRef(null);

  // Fetch insights from backend when prices change
  useEffect(() => {
    const fetchInsights = async () => {
      if (!token || !livePrices || Object.keys(livePrices).length === 0) return;
      
      // Check if prices actually changed
      const pricesStr = JSON.stringify(livePrices);
      if (prevPricesRef.current === pricesStr) return;
      prevPricesRef.current = pricesStr;
      
      setLoading(true);
      try {
        // Use deduplication with a key based on token and prices hash
        const pricesHash = pricesStr.substring(0, 50); // Use first 50 chars as hash
        const data = await dedupeRequest(
          `fetchInsights:${token}:${pricesHash}`,
          () => fetchPortfolioInsights(token, livePrices),
          500 // 500ms dedupe window
        );
        setInsights(data);
      } catch (error) {
        console.warn('Failed to fetch portfolio insights:', error);
      } finally {
        setLoading(false);
      }
    };

    // Clear any pending timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Debounce to prevent multiple rapid calls
    fetchTimeoutRef.current = setTimeout(() => {
      fetchInsights();
    }, 300);

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [token, livePrices]);

  // Get data based on view mode
  const chartData = viewMode === 'asset' 
    ? (insights?.by_asset || [])
    : (insights?.by_type || allocationData || []);

  const hasData = chartData.length > 0;

  return (
    <article className="card allocation-card">
      <div className="allocation-header">
        <div className="card-head">
          <PieChartIcon size={18} />
          <span>Portfolio Allocation</span>
        </div>

        {/* View mode tabs */}
        <div className="allocation-tabs">
          <button 
            className={`tab-btn ${viewMode === 'asset' ? 'active' : ''}`}
            onClick={() => setViewMode('asset')}
          >
            <Layers size={14} />
            By Asset
          </button>
          <button 
            className={`tab-btn ${viewMode === 'type' ? 'active' : ''}`}
            onClick={() => setViewMode('type')}
          >
            <PieChartIcon size={14} />
            By Type
          </button>
        </div>
      </div>

      {loading ? (
        <div className="chart-loading">
          <div className="loading-spinner" />
          <p>Calculating allocation...</p>
        </div>
      ) : hasData ? (
        <div className="allocation-content">
          {/* Donut Chart */}
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
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={entry.name || entry.type} 
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center stats */}
            {insights && (
              <div className="chart-center-stats">
                <span className="center-label">Total</span>
                <span className="center-value">{currency(insights.total_value)}</span>
                <span className={`center-change ${insights.total_gain_loss >= 0 ? 'positive' : 'negative'}`}>
                  {insights.total_gain_loss >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {insights.total_gain_loss >= 0 ? '+' : ''}{insights.total_gain_loss_pct.toFixed(2)}%
                </span>
              </div>
            )}
          </div>

          {/* Legend / Allocation List */}
          <AllocationLegend data={chartData} />
        </div>
      ) : (
        <div className="chart-empty">
          <PieChartIcon size={48} strokeWidth={1} />
          <p>Add assets to see your portfolio allocation</p>
        </div>
      )}
    </article>
  );
};
