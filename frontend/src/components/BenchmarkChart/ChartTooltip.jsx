import React from 'react';

/**
 * Custom Tooltip for the Benchmark Comparison Chart
 */
export const ChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="benchmark-tooltip">
        <p className="tooltip-date">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="tooltip-line" style={{ color: entry.color }}>
            <span className="tooltip-name">{entry.name}:</span>
            <span className="tooltip-value">
              {entry.value !== null
                ? `${entry.value >= 0 ? '+' : ''}${entry.value.toFixed(2)}%`
                : 'N/A'}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};
