import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Globe, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { fetchDiversificationScore } from '../../services/api';
import { dedupeRequest } from '../../utils/requestDeduplication';
import { EASE_OUT } from '../../lib/motion';
import { CardHeader } from '../ui/CardHeader';
import { ChartState } from '../ui/ChartState';
import './DiversificationScore.css';

// Severity is shown as an icon plus a word, never as a color alone
const SEVERITY = {
  high: { label: 'High', icon: AlertTriangle },
  medium: { label: 'Medium', icon: AlertCircle },
  low: { label: 'Low', icon: Info },
};

// Maps the overall score to a color and label
const getScoreBand = (score) => {
  if (score >= 75) return { color: '#4ade80', label: 'Well Diversified' };
  if (score >= 50) return { color: '#fbbf24', label: 'Moderate' };
  if (score >= 25) return { color: '#fb923c', label: 'Needs Work' };
  return { color: '#f87171', label: 'Poor' };
};

const BREAKDOWN_ROWS = [
  { key: 'hhi_score', label: 'Concentration (HHI)' },
  { key: 'sector_score', label: 'Sector diversity' },
  { key: 'class_score', label: 'Asset classes' },
];

// SVG circular gauge. pathLength animates from empty to the score; it is not
// covered by MotionConfig, so reduced motion is checked directly.
const ScoreGauge = ({ score, size = 180, strokeWidth = 14 }) => {
  const reduced = useReducedMotion();
  const radius = (size - strokeWidth) / 2;
  const { color, label } = getScoreBand(score);
  const progress = Math.max(0, Math.min(score, 100)) / 100;

  return (
    <div className="ds-gauge-wrapper">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Diversification score ${Math.round(score)} out of 100: ${label}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-color)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={reduced ? false : { pathLength: 0 }}
          animate={{ pathLength: progress }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
        />
      </svg>
      <div className="ds-gauge-center" aria-hidden="true">
        <span className="ds-gauge-score tabular" style={{ color }}>
          {Math.round(score)}
        </span>
        <span className="ds-gauge-label">{label}</span>
      </div>
    </div>
  );
};

// Bars grow with scaleX (transform only), so reduced motion disables them
const ProgressBar = ({ value, className = '', delay = 0 }) => {
  const reduced = useReducedMotion();

  return (
    <div className="ds-bar-track">
      <motion.div
        className={`ds-bar-fill ${className}`.trim()}
        initial={reduced ? false : { scaleX: 0 }}
        animate={{ scaleX: Math.max(0, Math.min(value, 100)) / 100 }}
        transition={{ duration: 0.5, ease: EASE_OUT, delay }}
      />
    </div>
  );
};

// Small horizontal bar to show what % of the portfolio is in each sector
const SectorBar = ({ name, percentage, isTop, index }) => (
  <div className="ds-sector-row">
    <div className="ds-sector-info">
      <span className="ds-sector-name">{name}</span>
      <span className="ds-sector-pct tabular">{percentage}%</span>
    </div>
    <ProgressBar
      value={percentage}
      className={isTop ? 'ds-bar-fill-top' : ''}
      delay={index * 0.04}
    />
  </div>
);

export const DiversificationScore = ({ token, livePrices }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (!token || hasFetchedRef.current) return;

    const loadScore = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await dedupeRequest(`diversification:${token}`, () =>
          fetchDiversificationScore(token, livePrices)
        );

        if (result?.message && !result?.score && result.score !== 0) {
          setError(result.message);
        } else {
          setData(result);
        }
        hasFetchedRef.current = true;
      } catch (err) {
        setError(err.message || 'Failed to load diversification data');
      } finally {
        setLoading(false);
      }
    };

    loadScore();
  }, [token, livePrices]);

  // Sort sectors by weight so the biggest ones show up first
  const sortedSectors = useMemo(() => {
    if (!data?.sectors) return [];
    return Object.entries(data.sectors).sort(([, a], [, b]) => b - a);
  }, [data?.sectors]);

  // Figure out which sector has the highest allocation
  const topSector = sortedSectors.length > 0 ? sortedSectors[0][0] : null;

  const retry = () => {
    hasFetchedRef.current = false;
    setError(null);
    setLoading(true);
  };

  // The header always renders, so loading and error never shift the layout
  let body = null;
  if (loading) {
    body = <ChartState status="loading" height={240} message="Analyzing portfolio diversification" />;
  } else if (error) {
    body = <ChartState status="error" height={240} message={error} onRetry={retry} />;
  } else if (!data || data.holdings_count === 0) {
    body = <ChartState height={240} message="Add assets to see your diversification score" />;
  }

  return (
    <article className="card ds-card">
      <CardHeader icon={Globe} title="Diversification Score" />

      {body}

      {!body && (
        <>
          <div className="ds-top-row">
            <ScoreGauge score={data.score} />

            <div className="ds-breakdown">
              {BREAKDOWN_ROWS.map((row, index) => (
                <div key={row.key} className="ds-breakdown-item">
                  <span className="ds-breakdown-label">{row.label}</span>
                  <ProgressBar value={data[row.key]} delay={index * 0.04} />
                  <span className="ds-breakdown-value tabular">{data[row.key]}</span>
                </div>
              ))}

              <div className="ds-meta">
                {data.holdings_count} holdings across {data.sector_count} sector
                {data.sector_count !== 1 ? 's' : ''}
                {data.crypto_count > 0 &&
                  `, ${data.crypto_count} crypto asset${data.crypto_count !== 1 ? 's' : ''}`}
                {' '}and {data.asset_class_count} asset class
                {data.asset_class_count !== 1 ? 'es' : ''}
              </div>
            </div>
          </div>

          {sortedSectors.length > 0 && (
            <div className="ds-sectors">
              <h3 className="ds-section-title">Sector Allocation</h3>
              {sortedSectors.map(([name, pct], index) => (
                <SectorBar
                  key={name}
                  name={name}
                  percentage={pct}
                  isTop={name === topSector}
                  index={index}
                />
              ))}
            </div>
          )}

          {data.asset_classes && Object.keys(data.asset_classes).length > 0 && (
            <div className="ds-classes">
              <h3 className="ds-section-title">Asset Classes</h3>
              <div className="ds-class-tags">
                {Object.entries(data.asset_classes).map(([name, pct]) => (
                  <span key={name} className="ds-class-tag">
                    {name} <strong className="tabular">{pct}%</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.recommendations && data.recommendations.length > 0 && (
            <div className="ds-recommendations">
              <h3 className="ds-section-title">Recommendations</h3>
              {data.recommendations.map((rec) => {
                const severity = SEVERITY[rec.severity] || SEVERITY.low;
                const SeverityIcon = severity.icon;

                return (
                  <div key={`${rec.severity}-${rec.message}`} className="ds-rec-card">
                    <span className={`ds-rec-badge ${rec.severity || 'low'}`}>
                      <SeverityIcon size={12} aria-hidden="true" />
                      {severity.label}
                    </span>
                    <div className="ds-rec-content">
                      <p className="ds-rec-message">{rec.message}</p>
                      {rec.suggestion && <p className="ds-rec-suggestion">{rec.suggestion.message}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </article>
  );
};
