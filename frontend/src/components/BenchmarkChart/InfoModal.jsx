import React from 'react';
import { X } from 'lucide-react';

/**
 * Info Modal - Explains benchmark comparison to users
 */
export const InfoModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="info-modal-overlay" onClick={onClose}>
      <div className="info-modal" onClick={(e) => e.stopPropagation()}>
        <button className="info-modal-close" onClick={onClose}>
          <X size={20} />
        </button>
        <h3>📊 Understanding Benchmark Comparison</h3>

        <div className="info-section">
          <h4>🟡 Your Portfolio</h4>
          <p>
            Shows the percentage change of your portfolio value since you started
            tracking. If you began with $1,000 and now have $1,150, it shows{' '}
            <strong>+15%</strong>.
          </p>
        </div>

        <div className="info-section">
          <h4>🔴 S&P 500 (Benchmark)</h4>
          <p>
            The S&P 500 represents the 500 largest US companies. We use{' '}
            <strong>SPY ETF</strong> to track it. This shows how "the market"
            performed over the same period.
          </p>
        </div>

        <div className="info-section">
          <h4>🔵 vs Benchmark</h4>
          <p>The difference between your returns and the market:</p>
          <ul>
            <li>
              <strong>Positive (+)</strong> = You're beating the market! 🎉
            </li>
            <li>
              <strong>Negative (-)</strong> = Market is outperforming your picks
            </li>
            <li>
              <strong>~0%</strong> = Matching market returns
            </li>
          </ul>
        </div>

        <div className="info-section tip">
          <h4>💡 Why Compare?</h4>
          <p>
            Professional investors always compare their returns to the S&P 500.
            If you can't beat it consistently, you might be better off just
            buying an index fund!
          </p>
        </div>
      </div>
    </div>
  );
};
