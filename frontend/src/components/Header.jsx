import React from 'react';
import { RefreshCw } from 'lucide-react';

// Header with refresh button to reload assets
export const Header = ({ onRefresh, fetchingAssets }) => {
  return (
    <header className="page-header">
      <div className="brand">
        <h2>Dashboard</h2>
      </div>
      <div className="landing-nav-actions">
        <button className="btn ghost" type="button" onClick={onRefresh} disabled={fetchingAssets}>
          <RefreshCw size={16} />
          {fetchingAssets ? 'Syncing…' : 'Sync data'}
        </button>
      </div>
    </header>
  );
};
