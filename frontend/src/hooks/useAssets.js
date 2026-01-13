import { useState, useCallback, useEffect, useRef } from 'react';
import { fetchAssets, createAsset, deleteAsset, updateHistory, fetchHistory } from '../services/api';
import { refreshPrices } from '../services/priceService';
import { DEFAULT_ASSET } from '../constants';
import { toNumber } from '../utils/formatters';
import { dedupeRequest } from '../utils/requestDeduplication';

// Global tracking to prevent duplicate loads
const loadingTokens = new Set();
const lastLoadTime = new Map();

// Main hook for managing portfolio assets, prices, and history
export const useAssets = (token) => {
  const [assets, setAssets] = useState([]);
  const [livePrices, setLivePrices] = useState({});
  const [history, setHistory] = useState([]);
  const [formAsset, setFormAsset] = useState(DEFAULT_ASSET);
  const [fetchingAssets, setFetchingAssets] = useState(false);
  const [priceWarning, setPriceWarning] = useState(null);
  const [pricesLoaded, setPricesLoaded] = useState(false);
  const componentIdRef = useRef(Math.random().toString(36));

  // Load assets, history, and prices using Promise.all for parallel fetching
  const loadAssets = useCallback(async () => {
    if (!token) return;
    
    const loadKey = `loadAssets:${token}`;
    const now = Date.now();
    const lastLoad = lastLoadTime.get(loadKey) || 0;
    
    // Prevent duplicate calls within 500ms
    if (loadingTokens.has(loadKey) || (now - lastLoad < 500)) {
      return;
    }
    
    loadingTokens.add(loadKey);
    lastLoadTime.set(loadKey, now);
    setFetchingAssets(true);
    setPricesLoaded(false);
    
    try {
      // Step 1: Get assets first (needed for price fetching)
      const assetsData = await dedupeRequest(`fetchAssets:${token}`, () => fetchAssets(token));

      // Step 2: Fetch history + prices in parallel
      const [historyData, priceData] = await Promise.all([
        dedupeRequest(`fetchHistory:${token}`, () => fetchHistory(token)),
        (async () => {
          try {
            return await refreshPrices(token, assetsData);
          } catch (priceError) {
            console.warn('Failed to fetch live prices, using cost basis:', priceError);
            return { prices: {}, warning: 'Could not fetch live prices. Using cost basis.' };
          }
        })()
      ]);

      const prices = priceData.prices || {};
      const warning = priceData.warning || null;
      
      // Step 3: Set all data together once everything is loaded
      // This ensures the UI only renders once with the correct values
      setAssets(assetsData);
      setHistory(historyData);
      setLivePrices(prices);
      setPriceWarning(warning);
      setPricesLoaded(true);

      // Step 4: Calculate current portfolio value with live prices
      const currentTotalValue = assetsData.reduce((total, asset) => {
        const quantity = toNumber(asset.quantity);
        const costBasis = toNumber(asset.cost_basis ?? asset.costBasis);
        const averagePrice = quantity ? costBasis / quantity : 0;
        const symbolKey = asset.name?.trim().toUpperCase();
        const currentPrice = prices[symbolKey] ?? averagePrice;
        const currentValue = currentPrice * quantity;
        return total + currentValue;
      }, 0);

      // Step 5: Update history with calculated total value
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
      loadingTokens.delete(loadKey);
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
      setPricesLoaded(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]); // Only depend on token, not loadAssets to avoid circular dependency

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
    pricesLoaded, // Export this so components can show loading state
    loadAssets,
    addAsset,
    removeAsset,
  };
};