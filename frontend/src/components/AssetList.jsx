import { Activity, Trash2 } from 'lucide-react';
import { currency, signedCurrency, percent } from '../utils/formatters';
import { CardHeader } from './ui/CardHeader';
import { ChartState } from './ui/ChartState';

export const AssetList = ({ assets, onDelete }) => {
  return (
    <article className="card asset-card">
      <CardHeader icon={Activity} title="Your holdings" />
      {assets.length ? (
        <div className="asset-list">
          {assets.map((asset) => (
            <div key={asset.id || asset.name} className="asset-row">
              <div className="asset-main">
                <div>
                  <strong>{asset.name}</strong>
                  <p className="muted">{asset.type}</p>
                </div>
                {onDelete && (
                  <button
                    type="button"
                    className="btn icon-delete"
                    onClick={() => onDelete(asset.id)}
                    title="Delete asset"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
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
                  <strong>{currency(asset.currentValue)}</strong>
                </div>
                <div>
                  <span>Change</span>
                  <strong className={asset.change >= 0 ? 'positive' : 'negative'}>
                    {signedCurrency(asset.change)} ({percent(asset.changePct, { signed: true })})
                  </strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ChartState height={200} message="Add your first asset to get started." />
      )}
    </article>
  );
};
