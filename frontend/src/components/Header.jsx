import React from 'react';
import { Activity, LogOut, RefreshCw } from 'lucide-react';

export const Header = ({ user, onLogout, onRefresh, fetchingAssets }) => {
  return (
    <header className="page-header">
      <div className="brand">
        <Activity size={26} />
        <div>
          <p className="eyebrow">StockPulse</p>
          <strong>{user?.email}</strong>
        </div>
      </div>
      <div className="header-actions">
        <button className="btn ghost" type="button" onClick={onRefresh} disabled={fetchingAssets}>
          <RefreshCw size={16} />
          {fetchingAssets ? 'Syncing…' : 'Sync data'}
        </button>
        <button className="btn ghost" type="button" onClick={onLogout}>
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </header>
  );
};
