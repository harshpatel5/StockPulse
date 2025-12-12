import React from 'react';
import { Activity, Trash2 } from 'lucide-react';
import { currency } from '../utils/formatters';

export const AssetList = ({ assets, onDelete }) => {
  return (
    <article className="card asset-card">
      <div className="card-head">
        <Activity size={18} />
        <span>Your holdings</span>
      </div>
      {assets.length ? (
        <div className="asset-list">
          {assets.map((asset) => (
            <div key={asset.id || asset.name} className="asset-row">
              <div className="asset-main">
                <div>
                  <strong>{asset.name}</strong>
                  <p className="muted">{asset.type}</p>
                </div>
                <button
                  type="button"
                  className="btn icon"
                  onClick={() => onDelete(asset.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="asset-metrics">
                <div>
                  <span>Quantity</span>
                  <strong>{asset.quantity}</strong>
                </div>
                <div>
                  <span>Cost</span>
                  <strong>{currency(asset.costBasis)}</strong>
                </div>
                <div>
                  <span>Current</span>
                  <strong>{currency(asset.currentPrice)}</strong>
                </div>
                <div>
                  <span>Change</span>
                  <strong className={asset.change >= 0 ? 'positive' : 'negative'}>
                    {asset.change >= 0 ? '+' : '-'}
                    {currency(Math.abs(asset.change))} ({asset.changePct.toFixed(2)}%)
                  </strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="placeholder">Add your first asset to get started.</p>
      )}
    </article>
  );
};
