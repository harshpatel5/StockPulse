import React from 'react';
import { X } from 'lucide-react';

export const InfoModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="info-modal-overlay" onClick={onClose}>
      <div className="info-modal mc-info-modal" onClick={(e) => e.stopPropagation()}>
        <button className="info-modal-close" onClick={onClose}>
          <X size={20} />
        </button>
        <h3>What is Monte Carlo Simulation?</h3>

        <div className="info-section">
          <h4>The Big Idea</h4>
          <p>
            Monte Carlo simulation is a way to answer: <strong>"What could happen
            to my portfolio over the next X days?"</strong> Instead of making one
            prediction, it generates <strong>10,000 possible futures</strong> based
            on how your assets have actually behaved in the past.
          </p>
        </div>

        <div className="info-section">
          <h4>How It Works (Step by Step)</h4>
          <ol className="mc-steps">
            <li>
              <strong>Gather history</strong> — We fetch ~1 year of daily prices
              for each asset in your portfolio from Yahoo Finance.
            </li>
            <li>
              <strong>Calculate patterns</strong> — From the historical prices, we
              compute each asset's average daily return and how much it typically
              swings (volatility). We also measure how your assets move together
              (correlation).
            </li>
            <li>
              <strong>Simulate 10,000 paths</strong> — Using those patterns, we
              randomly generate 10,000 possible day-by-day scenarios for your
              portfolio. Each path is different because randomness is built in, but
              they all follow the statistical "shape" of real market behavior.
            </li>
            <li>
              <strong>Summarize the results</strong> — We sort all 10,000 outcomes
              and show you the range: worst case, best case, and everything in between.
            </li>
          </ol>
        </div>

        <div className="info-section">
          <h4>Reading the Chart</h4>
          <p>The fan chart shows confidence bands:</p>
          <ul>
            <li>
              <strong>Dark band (25th–75th percentile)</strong> — There's a 50%
              chance your portfolio lands in this range. This is the "most likely"
              zone.
            </li>
            <li>
              <strong>Light band (5th–95th percentile)</strong> — 90% of all
              simulations fell within this wider range.
            </li>
            <li>
              <strong>Solid line (50th percentile)</strong> — The median outcome.
              Half the simulations ended above this, half below.
            </li>
            <li>
              <strong>Dashed line</strong> — Your current portfolio value for
              reference.
            </li>
          </ul>
        </div>

        <div className="info-section">
          <h4>Understanding the Stats</h4>
          <ul>
            <li>
              <strong>Expected Return</strong> — The average outcome across all
              10,000 simulations, shown as a percentage gain or loss.
            </li>
            <li>
              <strong>Value at Risk (VaR 95%)</strong> — The maximum you could
              lose in 95% of scenarios. In other words, only 5% of simulations
              had losses worse than this number. This is the same metric used by
              banks and hedge funds to measure risk.
            </li>
            <li>
              <strong>Outcome Range</strong> — The best case (95th percentile) and
              worst case (5th percentile) endpoints, with the median in between.
            </li>
          </ul>
        </div>

        <div className="info-section">
          <h4>Timeframe Options</h4>
          <ul>
            <li><strong>30D</strong> — Short-term outlook. Useful for seeing near-term risk.</li>
            <li><strong>90D</strong> — Medium-term. Good default for quarterly planning.</li>
            <li><strong>1Y</strong> — Long-term projection (252 trading days). Shows how uncertainty grows over time.</li>
          </ul>
        </div>

        <div className="info-section">
          <h4>Limitations</h4>
          <ul>
            <li>
              <strong>Past ≠ future</strong> — The simulation assumes future
              returns will have similar patterns to the past year. Markets can
              change.
            </li>
            <li>
              <strong>Black swan events</strong> — Extremely rare, unprecedented
              events (like COVID crash or 2008 crisis) are not captured because
              they've never appeared in the training data.
            </li>
            <li>
              <strong>Normal distribution assumption</strong> — Real markets have
              "fat tails" (extreme moves happen more often than a bell curve
              predicts). Our simulation somewhat underestimates tail risk.
            </li>
          </ul>
        </div>

        <div className="info-section tip">
          <h4>How to Use This</h4>
          <p>
            Use Monte Carlo as a <strong>risk awareness tool</strong>, not a crystal ball.
            If the VaR number makes you uncomfortable, your portfolio may be too risky
            for your tolerance. Consider diversifying or reducing position sizes.
            A wider fan means more uncertainty — a narrower fan means more predictable outcomes.
          </p>
        </div>
      </div>
    </div>
  );
};
