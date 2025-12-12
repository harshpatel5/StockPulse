import React from 'react';
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
  // Calculate domain for Y-axis to show only the relevant data range
  // This prevents small changes from appearing flat
  const yDomain = React.useMemo(() => {
    if (!lineSeries.length) return [0, 1];
    
    const values = lineSeries.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    
    // Add 10% padding on each side for visual breathing room
    const padding = range * 0.1 || Math.abs(min) * 0.1 || 100;
    
    return [
      Math.max(0, min - padding),
      max + padding
    ];
  }, [lineSeries]);

  return (
    <article className="card chart-card">
      <div className="card-head">
        <Activity size={18} />
        <span>Portfolio Value Over Time</span>
      </div>
      {lineSeries.length ? (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={lineSeries} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis 
              dataKey="date" 
              stroke="#94a3b8" 
              tick={{ fill: '#94a3b8', fontSize: 12 }} 
              tickLine={false}
              angle={lineSeries.length > 7 ? -45 : 0}
              textAnchor={lineSeries.length > 7 ? 'end' : 'middle'}
              height={lineSeries.length > 7 ? 60 : 30}
            />
            <YAxis 
              stroke="#94a3b8" 
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickFormatter={(value) => currency(value)}
              domain={yDomain}
            />
            <Tooltip
              formatter={(value) => currency(value)}
              labelFormatter={(label) => `Date: ${label}`}
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
              dot={{ fill: '#5B8DEF', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="placeholder">Portfolio history will appear here once you sync your data.</p>
      )}
    </article>
  );
};
