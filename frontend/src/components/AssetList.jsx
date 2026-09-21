import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Trash2 } from 'lucide-react';
import { currency, signedCurrency, percent } from '../utils/formatters';
import { enter, exit } from '../lib/motion';
import { CardHeader } from './ui/CardHeader';
import { ChartState } from './ui/ChartState';

export const AssetList = ({ assets, onDelete }) => {
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (assetId) => {
    setDeletingId(assetId);
    try {
      await onDelete(assetId);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <article className="card asset-card">
      <CardHeader icon={Activity} title="Your holdings" />
      {assets.length ? (
        <div className="asset-list">
          {/* popLayout keeps the remaining rows sliding up smoothly as one leaves */}
          <AnimatePresence initial={false} mode="popLayout">
            {assets.map((asset) => {
              const isDeleting = deletingId === asset.id;

              return (
                <motion.div
                  key={asset.id || asset.name}
                  layout="position"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: isDeleting ? 0.5 : 1, y: 0, transition: enter }}
                  exit={{ opacity: 0, scale: 0.98, transition: exit }}
                  className="asset-row"
                  aria-busy={isDeleting || undefined}
                >
                  <div className="asset-main">
                    <div>
                      <strong>{asset.name}</strong>
                      <p className="muted">{asset.type}</p>
                    </div>
                    {onDelete && (
                      <button
                        type="button"
                        className="btn icon-delete"
                        onClick={() => handleDelete(asset.id)}
                        disabled={isDeleting}
                        aria-label={`Delete ${asset.name}`}
                      >
                        {isDeleting ? (
                          <span className="btn-spinner" aria-hidden="true" />
                        ) : (
                          <Trash2 size={18} aria-hidden="true" />
                        )}
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
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <ChartState height={200} message="Add your first asset to get started." />
      )}
    </article>
  );
};
