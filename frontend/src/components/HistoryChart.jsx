import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Activity } from 'lucide-react';
import { currency } from '../utils/formatters';

export const HistoryChart = ({ lineSeries }) => {
  const [timeframe, setTimeframe] = useState('all');

  // Calculate total days of data available
  const totalDaysOfData = useMemo(() => {
    if (!lineSeries.length) return 0;
    return lineSeries.length;
  }, [lineSeries]);

  // Determine which timeframe buttons should be enabled
  const getButtonState = (option) => {
    const daysRequired = {
      '7d': 2,
      '30d': 7,
      '3m': 30,
      '6m': 90,
      '1y': 180,
      'all': 1,
    };
    return totalDaysOfData >= daysRequired[option];
  };

  // Filter data based on selected timeframe
  const filteredData = useMemo(() => {
    if (!lineSeries.length) return [];

    const now = new Date();
    let daysAgo = 30;

    switch (timeframe) {
      case '7d':
        daysAgo = 7;
        break;
      case '30d':
        daysAgo = 30;
        break;
      case '3m':
        daysAgo = 90;
        break;
      case '6m':
        daysAgo = 180;
        break;
      case '1y':
        daysAgo = 365;
        break;
      case 'all':
        return lineSeries;
      default:
        daysAgo = 30;
    }

    const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return lineSeries.filter((item) => {
      const itemDate = new Date(item.timestamp);
      return itemDate >= cutoffDate;
    });
  }, [lineSeries, timeframe]);

  // Calculate domain for Y-axis to show only the relevant data range
  const yDomain = useMemo(() => {
    if (!filteredData.length) return [0, 1];
    
    const values = filteredData.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    
    const padding = range * 0.1 || Math.abs(min) * 0.1 || 100;
    
    return [
      Math.max(0, min - padding),
      max + padding
    ];
  }, [filteredData]);

  // Calculate current value and change
  const currentValue = filteredData.length > 0 ? filteredData[filteredData.length - 1].value : 0;
  const startValue = filteredData.length > 0 ? filteredData[0].value : 0;
  const valueChange = currentValue - startValue;
  const percentChange = startValue > 0 ? ((valueChange / startValue) * 100) : 0;
  const isPositive = valueChange >= 0;

  const timeframeOptions = [
    { value: '7d', label: '7D' },
    { value: '30d', label: '1M' },
    { value: '3m', label: '3M' },
    { value: '6m', label: '6M' },
    { value: '1y', label: '1Y' },
    { value: 'all', label: 'ALL' },
  ];

  return (
    <article className="card chart-card">
      <div className="card-head">
        <Activity size={18} />
        <span>Portfolio Value Over Time</span>
      </div>

      {/* Current Value Display */}
      {filteredData.length > 0 && (
        <div className="chart-value-display">
          <span className="chart-current-value">{currency(currentValue)}</span>
          <span className={`chart-value-change ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? '+' : ''}{currency(valueChange)} ({isPositive ? '+' : ''}{percentChange.toFixed(2)}%)
          </span>
        </div>
      )}

      {/* Timeframe Selector */}
      <div className="timeframe-selector">
        {timeframeOptions.map((option) => {
          const isEnabled = getButtonState(option.value);
          return (
            <button
              key={option.value}
              onClick={() => isEnabled && setTimeframe(option.value)}
              className={`timeframe-btn ${timeframe === option.value ? 'active' : ''} ${!isEnabled ? 'disabled' : ''}`}
              disabled={!isEnabled}
              title={!isEnabled ? `Need more data for ${option.label} view` : ''}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {filteredData.length > 0 ? (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={filteredData} margin={{ top: 10, right: 20, left: 50, bottom: 50 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#334155" 
              strokeOpacity={0.4}
              horizontal={true}
              vertical={false}
            />
            <XAxis 
              dataKey="fullDate" 
              stroke="#64748b" 
              tick={{ fill: '#64748b', fontSize: 11 }} 
              tickLine={false}
              axisLine={{ stroke: '#475569', strokeWidth: 1.5 }}
              angle={-45}
              textAnchor="end"
              height={70}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
              }}
              interval={filteredData.length <= 7 ? 0 : Math.ceil(filteredData.length / 6)}
            />
            <YAxis 
              stroke="#64748b" 
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickLine={true}
              axisLine={{ stroke: '#475569', strokeWidth: 1.5 }}
              tickFormatter={(value) => {
                if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
                if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
                return `$${value.toFixed(0)}`;
              }}
              domain={yDomain}
              width={50}
            />
            <Tooltip
              formatter={(value) => [currency(value), 'Value']}
              labelFormatter={(label) => {
                const date = new Date(label);
                return date.toLocaleDateString('en-US', { 
                  weekday: 'short',
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric', 
                  timeZone: 'UTC' 
                });
              }}
              contentStyle={{ 
                backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                border: '1px solid #334155',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                padding: '10px 14px'
              }}
              labelStyle={{ color: '#e2e8f0', fontWeight: '600', marginBottom: '4px' }}
              itemStyle={{ color: isPositive ? '#10b981' : '#ef4444' }}
              cursor={{ stroke: '#475569', strokeDasharray: '4 4' }}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={isPositive ? "#10b981" : "#ef4444"}
              strokeWidth={2}
              fill="url(#colorValue)"
              dot={false}
              activeDot={{ 
                fill: isPositive ? "#10b981" : "#ef4444", 
                r: 5, 
                stroke: '#0f172a',
                strokeWidth: 2
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="chart-placeholder">
          <Activity size={48} className="placeholder-icon" />
          <p>No portfolio history yet</p>
          <span>Add assets and your chart will build automatically</span>
        </div>
      )}
    </article>
  );
};
