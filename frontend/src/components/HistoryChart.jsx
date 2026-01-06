import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Activity } from 'lucide-react';
import { currency } from '../utils/formatters';

export const HistoryChart = ({ lineSeries }) => {
  const [timeframe, setTimeframe] = useState('30d');

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

      {/* Timeframe Selector */}
      <div className="timeframe-selector">
        {timeframeOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setTimeframe(option.value)}
            className={`timeframe-btn ${timeframe === option.value ? 'active' : ''}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {filteredData.length ? (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={filteredData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis 
              dataKey="fullDate" 
              stroke="#94a3b8" 
              tick={{ fill: '#94a3b8', fontSize: 12 }} 
              tickLine={false}
              angle={-45}
              textAnchor="end"
              height={60}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }}
              interval={filteredData.length <= 7 ? 0 : Math.ceil(filteredData.length / 5)}
            />
            <YAxis 
              stroke="#94a3b8" 
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickFormatter={(value) => currency(value)}
              domain={yDomain}
            />
            <Tooltip
              formatter={(value) => currency(value)}
              labelFormatter={(label) => {
                const date = new Date(label);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              }}
              contentStyle={{ 
                backgroundColor: '#0b1220', 
                border: '1px solid #243447',
                borderRadius: '4px'
              }}
              labelStyle={{ color: '#cbd5e1', fontWeight: 'bold' }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#5B8DEF" 
              strokeWidth={2}
              dot={false}
              activeDot={{ fill: '#5B8DEF', r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="placeholder">Portfolio history will appear here once you sync your data.</p>
      )}
    </article>
  );
};
