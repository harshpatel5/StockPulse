import { useState, useCallback, useEffect } from 'react';
import { fetchAssets, createAsset, deleteAsset, updateHistory, fetchHistory } from '../services/api';
import { refreshPrices } from '../services/priceService';
import { DEFAULT_ASSET } from '../constants';
import { toNumber } from '../utils/formatters';

export const useAssets = (token) => {
  const [assets, setAssets] = useState([]);
  const [livePrices, setLivePrices] = useState({});
  const [history, setHistory] = useState([]);
  const [formAsset, setFormAsset] = useState(DEFAULT_ASSET);
  const [fetchingAssets, setFetchingAssets] = useState(false);
  const [priceWarning, setPriceWarning] = useState(null);

  const loadHistory = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchHistory(token);
      setHistory(data);
    } catch (error) {
      console.error('History fetch failed:', error);
    }
  }, [token]);

  const loadAssets = useCallback(async () => {
    if (!token) return;

    setFetchingAssets(true);
    try {
      const data = await fetchAssets(token);
      setAssets(data);

      // Get live prices first
      const { prices, warning } = await refreshPrices(data);
      setLivePrices(prices);
      setPriceWarning(warning);

      // Calculate current portfolio value with live prices
      const currentTotalValue = data.reduce((total, asset) => {
        const quantity = toNumber(asset.quantity);
        const costBasis = toNumber(asset.cost_basis ?? asset.costBasis);
        const averagePrice = quantity ? costBasis / quantity : 0;
        const currentPrice = prices[asset.name] ?? averagePrice;
        const currentValue = currentPrice * quantity;
        return total + currentValue;
      }, 0);

      // Update history with calculated total value
      await updateHistory(token, currentTotalValue);
      await loadHistory();
    } catch (error) {
      console.error('Failed to load assets:', error);
      throw error;
    } finally {
      setFetchingAssets(false);
    }
  }, [token, loadHistory]);

  useEffect(() => {
    if (token) {
      loadAssets();
      loadHistory();
    } else {
      // Clear state on logout
      setAssets([]);
      setLivePrices({});
      setHistory([]);
      setFormAsset(DEFAULT_ASSET);
      setPriceWarning(null);
    }
  }, [token, loadAssets, loadHistory]);

  const addAsset = async () => {
    if (!token) return;

    const payload = {
      name: formAsset.name.trim().toUpperCase(),
      type: formAsset.type,
      quantity: toNumber(formAsset.quantity),
      cost_basis: toNumber(formAsset.costBasis),
    };

    if (!payload.name || !payload.quantity || !payload.cost_basis) {
      throw new Error('Please complete all asset fields.');
    }

    // Check if this stock already exists
    const existingAsset = assets.find((asset) => asset.name?.toUpperCase() === payload.name);

    if (existingAsset) {
      // Merge: Calculate new quantity and average cost basis
      const existingQuantity = toNumber(existingAsset.quantity);
      const existingCostBasis = toNumber(existingAsset.cost_basis ?? existingAsset.costBasis);

      const newTotalQuantity = existingQuantity + payload.quantity;
      const newTotalCostBasis = existingCostBasis + payload.cost_basis;

      // Update existing asset with merged values
      const updatePayload = {
        quantity: newTotalQuantity,
        cost_basis: newTotalCostBasis,
      };

      // Call backend update endpoint
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/assets/${existingAsset.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        throw new Error('Failed to update asset');
      }

      setFormAsset(DEFAULT_ASSET);
      await loadAssets();
      return `${payload.name} quantity updated.`;
    }

    // If not a duplicate, create new asset
    await createAsset(token, payload);
    setFormAsset(DEFAULT_ASSET);
    await loadAssets();
    return `${payload.name} saved to your portfolio.`;
  };

  const removeAsset = async (assetId) => {
    if (!token || !assetId) return;
    await deleteAsset(token, assetId);
    await loadAssets();
  };

  return {
    assets,
    livePrices,
    history,
    formAsset,
    setFormAsset,
    fetchingAssets,
    priceWarning,
    loadAssets,
    addAsset,
    removeAsset,
  };
};

