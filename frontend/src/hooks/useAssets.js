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

  // Parallel data loading using Promise.all
  const loadAssets = useCallback(async () => {
    if (!token) return;

    setFetchingAssets(true);
    try {
      // Step 1: Fetch assets and history in parallel
      const [assetsData, historyData] = await Promise.all([
        fetchAssets(token),
        fetchHistory(token)
      ]);

      // Set initial data immediately
      setAssets(assetsData);
      setHistory(historyData);

      // Step 2: Fetch live prices (depends on assets data)
      const { prices, warning } = await refreshPrices(token, assetsData);
      setLivePrices(prices);
      setPriceWarning(warning);

      // Step 3: Calculate current portfolio value with live prices
      const currentTotalValue = assetsData.reduce((total, asset) => {
        const quantity = toNumber(asset.quantity);
        const costBasis = toNumber(asset.cost_basis ?? asset.costBasis);
        const averagePrice = quantity ? costBasis / quantity : 0;
        const symbolKey = asset.name?.trim().toUpperCase();
        const currentPrice = prices[symbolKey] ?? averagePrice;
        const currentValue = currentPrice * quantity;
        return total + currentValue;
      }, 0);

      // Step 4: Update history with calculated total value
      // This is fire-and-forget to avoid blocking UI
      updateHistory(token, currentTotalValue)
        .then(() => fetchHistory(token))
        .then(setHistory)
        .catch((error) => console.error('Failed to update history:', error));

    } catch (error) {
      console.error('Failed to load assets:', error);
      throw error;
    } finally {
      setFetchingAssets(false);
    }
  }, [token]);

  // Initialize data on mount or token change
  useEffect(() => {
    if (token) {
      loadAssets();
    } else {
      // Clear state on logout
      setAssets([]);
      setLivePrices({});
      setHistory([]);
      setFormAsset(DEFAULT_ASSET);
      setPriceWarning(null);
    }
  }, [token, loadAssets]);

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