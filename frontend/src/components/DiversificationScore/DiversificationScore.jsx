import React, { useState, useEffect, useRef, useMemo } from 'react';
import { fetchDiversificationScore } from '../../services/api';
import { dedupeRequest } from '../../utils/requestDeduplication';
import './DiversificationScore.css';

// Severity colors for the recommendation badges
const SEVERITY_COLORS = {
  high: '#f87171',
  medium: '#fbbf24',
  low: '#60a5fa',
};

// Maps the overall score to a color and label
const getScoreColor = (score) => {
  if (score >= 75) return { color: '#4ade80', label: 'Well Diversified' };
  if (score >= 50) return { color: '#fbbf24', label: 'Moderate' };
  if (score >= 25) return { color: '#fb923c', label: 'Needs Work' };
  return { color: '#f87171', label: 'Poor' };
};

// SVG circular gauge — just draws an arc based on the score percentage
const ScoreGauge = ({ score, size = 180, strokeWidth = 14 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const { color, label } = getScoreColor(score);

  return (
    <div className="ds-gauge-wrapper">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-color)"
          strokeWidth={strokeWidth}
        />
        {/* Score arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 0.8s ease-out' }}
        />
      </svg>
      <div className="ds-gauge-center">
        <span className="ds-gauge-score" style={{ color }}>{Math.round(score)}</span>
        <span className="ds-gauge-label">{label}</span>
      </div>
    </div>
  );
};

// Small horizontal bar to show what % of the portfolio is in each sector
const SectorBar = ({ name, percentage, isTop }) => (
  <div className="ds-sector-row">
    <div className="ds-sector-info">
      <span className="ds-sector-name">{name}</span>
      <span className="ds-sector-pct">{percentage}%</span>
    </div>
    <div className="ds-sector-track">
      <div
        className={`ds-sector-fill ${isTop ? 'ds-sector-fill-top' : ''}`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
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

        const result = await dedupeRequest(
          `diversification:${token}`,
          () => fetchDiversificationScore(token, livePrices)
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
    return Object.entries(data.sectors)
      .sort(([, a], [, b]) => b - a);
  }, [data?.sectors]);

  // Figure out which sector has the highest allocation
  const topSector = sortedSectors.length > 0 ? sortedSectors[0][0] : null;

  if (loading) {
    return (
      <div className="card ds-card">
        <div className="chart-loading">
          <div className="spinner" />
          <p>Analyzing portfolio diversification...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card ds-card">
        <div className="chart-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
          </svg>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!data || data.holdings_count === 0) {
    return (
      <div className="card ds-card">
        <h3 className="card-head">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
          </svg>
          Diversification Score
        </h3>
        <div className="chart-empty">
          <p>Add assets to see your diversification score</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card ds-card">
      <h3 className="card-head">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
        </svg>
        Diversification Score
      </h3>

      <div className="ds-top-row">
        {/* Left side: circular gauge */}
        <ScoreGauge score={data.score} />

        {/* Right side: score breakdown */}
        <div className="ds-breakdown">
          <div className="ds-breakdown-item">
            <span className="ds-breakdown-label">Concentration (HHI)</span>
            <div className="ds-breakdown-bar-track">
              <div className="ds-breakdown-bar-fill" style={{ width: `${data.hhi_score}%` }} />
            </div>
            <span className="ds-breakdown-value">{data.hhi_score}</span>
          </div>
          <div className="ds-breakdown-item">
            <span className="ds-breakdown-label">Sector Diversity</span>
            <div className="ds-breakdown-bar-track">
              <div className="ds-breakdown-bar-fill" style={{ width: `${data.sector_score}%` }} />
            </div>
            <span className="ds-breakdown-value">{data.sector_score}</span>
          </div>
          <div className="ds-breakdown-item">
            <span className="ds-breakdown-label">Asset Classes</span>
            <div className="ds-breakdown-bar-track">
              <div className="ds-breakdown-bar-fill" style={{ width: `${data.class_score}%` }} />
            </div>
            <span className="ds-breakdown-value">{data.class_score}</span>
          </div>

          <div className="ds-meta">
            {data.holdings_count} holdings across {data.sector_count} sector{data.sector_count !== 1 ? 's' : ''}
            {data.crypto_count > 0 && `, ${data.crypto_count} crypto asset${data.crypto_count !== 1 ? 's' : ''}`}
            {' '}and {data.asset_class_count} asset class{data.asset_class_count !== 1 ? 'es' : ''}
          </div>
        </div>
      </div>

      {/* Sector allocation bars */}
      {sortedSectors.length > 0 && (
        <div className="ds-sectors">
          <h4 className="ds-section-title">Sector Allocation</h4>
          {sortedSectors.map(([name, pct]) => (
            <SectorBar key={name} name={name} percentage={pct} isTop={name === topSector} />
          ))}
        </div>
      )}

      {/* Asset class tags */}
      {data.asset_classes && Object.keys(data.asset_classes).length > 0 && (
        <div className="ds-classes">
          <h4 className="ds-section-title">Asset Classes</h4>
          <div className="ds-class-tags">
            {Object.entries(data.asset_classes).map(([name, pct]) => (
              <span key={name} className="ds-class-tag">
                {name} <strong>{pct}%</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {data.recommendations && data.recommendations.length > 0 && (
        <div className="ds-recommendations">
          <h4 className="ds-section-title">Recommendations</h4>
          {data.recommendations.map((rec, i) => (
            <div key={i} className="ds-rec-card">
              <span
                className="ds-rec-badge"
                style={{ background: SEVERITY_COLORS[rec.severity] || '#60a5fa' }}
              >
                {rec.severity}
              </span>
              <div className="ds-rec-content">
                <p className="ds-rec-message">{rec.message}</p>
                {rec.suggestion && (
                  <p className="ds-rec-suggestion">{rec.suggestion.message}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
