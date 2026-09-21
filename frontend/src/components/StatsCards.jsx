import { ShieldCheck, Activity, Wallet } from 'lucide-react';
import { currency, signedCurrency, percent } from '../utils/formatters';
import { CardHeader } from './ui/CardHeader';
import { RevealGroup, RevealItem } from './motion/Reveal';
import { AnimatedValue } from './motion/AnimatedValue';

// Three stat cards: Portfolio Value, Invested, Assets Tracked
export const StatsCards = ({ portfolioTotals, allocationData, netChange, netChangePct }) => {
  return (
    <RevealGroup as="section" className="stats-grid" onMount gap={0.04}>
      <RevealItem as="article" className="card">
        <CardHeader icon={ShieldCheck} title="Portfolio value" />
        <p className="card-value tabular">
          <AnimatedValue>{currency(portfolioTotals.value)}</AnimatedValue>
        </p>
        <p className={netChange >= 0 ? 'positive' : 'negative'}>
          {signedCurrency(netChange)} ({percent(netChangePct, { signed: true })})
        </p>
      </RevealItem>

      <RevealItem as="article" className="card">
        <CardHeader icon={Activity} title="Invested" />
        <p className="card-value tabular">
          <AnimatedValue>{currency(portfolioTotals.invested)}</AnimatedValue>
        </p>
        <p className="muted">Total cost basis</p>
      </RevealItem>

      <RevealItem as="article" className="card">
        <CardHeader icon={Wallet} title="Assets tracked" />
        <p className="card-value tabular">
          <AnimatedValue>{portfolioTotals.rows.length}</AnimatedValue>
        </p>
        <p className="muted">Across {allocationData.length || 0} categories</p>
      </RevealItem>
    </RevealGroup>
  );
};
