import React from 'react';
import { ShieldCheck, Activity } from 'lucide-react';
import { currency } from '../utils/formatters';

// Three stat cards: Portfolio Value, Invested, Assets Tracked
export const StatsCards = ({ portfolioTotals, allocationData, netChange, netChangePct }) => {
  return (
    <section className="stats-grid">
      {/* Card 1: Portfolio Value */}
      <article className="card">
        <div className="card-head">
          <ShieldCheck size={18} />
          <span>Portfolio value</span>
        </div>
        <h2>{currency(portfolioTotals.value)}</h2>
        <p className={netChange >= 0 ? 'positive' : 'negative'}>
          {netChange >= 0 ? '+' : '-'}
          {currency(Math.abs(netChange))} ({netChangePct.toFixed(2)}%)
        </p>
      </article>

      {/* Card 2: Total Invested */}
      <article className="card">
        <div className="card-head">
          <Activity size={18} />
          <span>Invested</span>
        </div>
        <h2>{currency(portfolioTotals.invested)}</h2>
        <p className="muted">Total cost basis</p>
      </article>

      {/* Card 3: Number of Assets */}
      <article className="card">
        <div className="card-head">
          <ShieldCheck size={18} />
          <span>Assets tracked</span>
        </div>
        <h2>{portfolioTotals.rows.length}</h2>
        <p className="muted">Across {allocationData.length || 0} categories</p>
      </article>
    </section>
  );
};
