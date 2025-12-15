/**
 * Price Service - All price data fetched via backend proxy
 * API keys are NEVER exposed to the frontend
 */
import { fetchQuote, fetchBatchQuotes, searchSymbols as apiSearchSymbols } from './api';

/**
 * Fetch live price for a single symbol via backend
 */
export const fetchPriceForSymbol = async (token, symbol) => {
  if (!token) {
    console.warn('No auth token; skip live quote.');
    return null;
  }

  try {
    const data = await fetchQuote(token, symbol);
    return data?.price ?? null;
  } catch (error) {
    console.warn(`Live price lookup failed for ${symbol}`, error);
    return null;
  }
};

/**
 * Refresh prices for all stock assets via backend
 */
export const refreshPrices = async (token, assetList = []) => {
  const list = Array.isArray(assetList) ? assetList : [];
  const stocks = list.filter((asset) => {
    const normalizedType = asset.type ? asset.type.toLowerCase().trim() : '';
    return normalizedType === 'stock';
  });

  if (!stocks.length) {
    return { prices: {}, warning: null };
  }

  if (!token) {
    return {
      prices: {},
      warning: 'Please log in to fetch live stock prices.',
    };
  }

  try {
    // Use batch endpoint for efficiency
    const symbols = stocks.map((asset) => asset.name.trim().toUpperCase());
    const data = await fetchBatchQuotes(token, symbols);
    
    const prices = data?.prices || {};

    const warning = !Object.keys(prices).length
      ? 'Could not fetch live prices. Using cost basis.'
      : null;

    return { prices, warning };
  } catch (error) {
    console.warn('Batch price fetch failed', error);
    return {
      prices: {},
      warning: 'Price service temporarily unavailable. Using cost basis.',
    };
  }
};

/**
 * Search for stock symbols via backend
 */
export const searchSymbols = async (token, query) => {
  if (!token) {
    console.warn('No auth token; cannot search symbols.');
    return [];
  }

  if (!query || query.length < 2) {
    return [];
  }

  try {
    const data = await apiSearchSymbols(token, query);
    return data?.results || [];
  } catch (error) {
    console.warn(`Symbol search failed for ${query}`, error);
    return [];
  }
};

