import { ShieldCheck, Activity, Wallet } from 'lucide-react';
import { currency, signedCurrency, percent } from '../utils/formatters';
import { CardHeader } from './ui/CardHeader';

// Three stat cards: Portfolio Value, Invested, Assets Tracked
export const StatsCards = ({ portfolioTotals, allocationData, netChange, netChangePct }) => {
  return (
    <section className="stats-grid">
      <article className="card">
        <CardHeader icon={ShieldCheck} title="Portfolio value" />
        <p className="card-value tabular">{currency(portfolioTotals.value)}</p>
        <p className={netChange >= 0 ? 'positive' : 'negative'}>
          {signedCurrency(netChange)} ({percent(netChangePct, { signed: true })})
        </p>
      </article>

      <article className="card">
        <CardHeader icon={Activity} title="Invested" />
        <p className="card-value tabular">{currency(portfolioTotals.invested)}</p>
        <p className="muted">Total cost basis</p>
      </article>

      <article className="card">
        <CardHeader icon={Wallet} title="Assets tracked" />
        <p className="card-value tabular">{portfolioTotals.rows.length}</p>
        <p className="muted">Across {allocationData.length || 0} categories</p>
      </article>
    </section>
  );
};
