import { TrendingUp, TrendingDown } from 'lucide-react';

// tone drives an arrow icon as well as the color, so gain and loss are never
// signalled by hue alone.
export const StatTile = ({ label, value, sub, tone = 'neutral', accent }) => (
  <div
    className={`stat-tile ${tone}`}
    style={accent ? { borderLeftColor: accent } : undefined}
  >
    <span className="stat-tile-label">{label}</span>
    <span className="stat-tile-value">
      {tone === 'positive' && <TrendingUp size={14} aria-hidden="true" />}
      {tone === 'negative' && <TrendingDown size={14} aria-hidden="true" />}
      {value}
    </span>
    {sub && <span className="stat-tile-sub">{sub}</span>}
  </div>
);
