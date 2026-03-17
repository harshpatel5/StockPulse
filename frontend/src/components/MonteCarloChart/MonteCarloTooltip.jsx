import React from 'react';
import { currency } from '../../utils/formatters';

export const MonteCarloTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  // Reconstruct actual values from stacked bands
  const dataPoint = payload[0]?.payload;
  if (!dataPoint) return null;

  return (
    <div className="mc-tooltip">
      <p className="tooltip-day">Day {dataPoint.day}</p>
      <div className="tooltip-line">
        <span className="tooltip-name">95th Percentile</span>
        <span className="tooltip-value">{currency(dataPoint.p95)}</span>
      </div>
      <div className="tooltip-line">
        <span className="tooltip-name">75th Percentile</span>
        <span className="tooltip-value">{currency(dataPoint.p75)}</span>
      </div>
      <div className="tooltip-line highlight">
        <span className="tooltip-name">Median</span>
        <span className="tooltip-value">{currency(dataPoint.p50)}</span>
      </div>
      <div className="tooltip-line">
        <span className="tooltip-name">25th Percentile</span>
        <span className="tooltip-value">{currency(dataPoint.p25)}</span>
      </div>
      <div className="tooltip-line">
        <span className="tooltip-name">5th Percentile</span>
        <span className="tooltip-value">{currency(dataPoint.p5)}</span>
      </div>
    </div>
  );
};
