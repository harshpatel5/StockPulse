import { Skeleton } from './ui/Skeleton';

// Mirrors the real dashboard layout so the first paint reserves the same space
// and nothing jumps when the data arrives.
export const DashboardSkeleton = () => (
  <div className="app-shell" role="status" aria-busy="true">
    <span className="visually-hidden">Loading your portfolio</span>

    <div className="page-header">
      <Skeleton width="11rem" height="2.25rem" />
      <Skeleton width="8rem" height="2.875rem" radius="var(--radius-pill)" />
    </div>

    <section className="stats-grid">
      {[0, 1, 2].map((index) => (
        <div key={index} className="card skeleton-stack">
          <Skeleton width="7rem" height="0.85rem" />
          <Skeleton width="60%" height="2.2rem" />
          <Skeleton width="45%" height="0.9rem" />
        </div>
      ))}
    </section>

    <section className="charts-grid">
      {[0, 1].map((index) => (
        <div key={index} className="card skeleton-stack">
          <Skeleton width="9rem" height="0.85rem" />
          <Skeleton height="280px" radius="var(--radius-card)" />
        </div>
      ))}
    </section>

    <section className="benchmark-section">
      <div className="card skeleton-stack">
        <Skeleton width="12rem" height="0.85rem" />
        <Skeleton height="300px" radius="var(--radius-card)" />
      </div>
    </section>
  </div>
);
