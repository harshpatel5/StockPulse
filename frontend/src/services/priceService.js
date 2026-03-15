// Price Service - All API calls proxied through backend (API keys never exposed)
import {
  fetchQuote,
  fetchBatchQuotes,
  fetchCachedPricesApi,
  searchSymbols as apiSearchSymbols,
  fetchCryptoQuote,
  searchCrypto as apiSearchCrypto
} from './api';
import { dedupeRequest } from '../utils/requestDeduplication';

// Fetch live price for one stock symbol
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

// Fetch live price for one crypto symbol
export const fetchCryptoPriceForSymbol = async (token, symbol) => {
  if (!token) {
    console.warn('No auth token; skip crypto quote.');
    return null;
  }

  try {
    const data = await fetchCryptoQuote(token, symbol);
    return data?.price ?? null;
  } catch (error) {
    console.warn(`Crypto price lookup failed for ${symbol}`, error);
    return null;
  }
};

// Fetch all cached prices from Redis (single API call)
export const fetchCachedPrices = async (token) => {
  if (!token) return {};
  try {
    const data = await fetchCachedPricesApi(token);
    return data?.prices || {};
  } catch (error) {
    console.warn('Failed to fetch cached prices:', error);
    return {};
  }
};

// Fetch live prices for all assets (stocks, ETFs, crypto)
// Now tries Redis cache first, falls back to individual API calls for missing symbols
export const refreshPrices = async (token, assetList = []) => {
  const list = Array.isArray(assetList) ? assetList : [];

  if (!list.length) {
    return { prices: {}, warning: null };
  }

  if (!token) {
    return { prices: {}, warning: 'Please log in to fetch live prices.' };
  }

  const prices = {};
  let hasError = false;

  // Step 1: Try to get all prices from Redis cache (single call)
  try {
    const cachedPrices = await fetchCachedPrices(token);
    Object.assign(prices, cachedPrices);
  } catch (error) {
    console.warn('Cached prices fetch failed, falling back to individual calls', error);
  }

  // Step 2: Find symbols still missing from cache
  const missingStocks = [];
  const missingCryptos = [];

  for (const asset of list) {
    const symbol = asset.name?.trim().toUpperCase();
    if (!symbol || prices[symbol] !== undefined) continue;

    const normalizedType = asset.type ? asset.type.toLowerCase().trim() : '';
    if (normalizedType === 'stock' || normalizedType === 'etf') {
      missingStocks.push(symbol);
    } else if (normalizedType === 'crypto') {
      missingCryptos.push(symbol);
    }
  }

  // Step 3: Fetch missing stocks via batch (Finnhub)
  if (missingStocks.length) {
    try {
      const symbolsKey = [...missingStocks].sort().join(',');
      const data = await dedupeRequest(
        `fetchBatchQuotes:${token}:${symbolsKey}`,
        () => fetchBatchQuotes(token, missingStocks),
        1000
      );
      Object.assign(prices, data?.prices || {});
    } catch (error) {
      console.warn('Stock/ETF price fetch failed', error);
      hasError = true;
    }
  }

  // Step 4: Fetch missing crypto individually
  if (missingCryptos.length) {
    const cryptoPrices = await Promise.all(
      missingCryptos.map(async (symbol) => {
        const price = await fetchCryptoPriceForSymbol(token, symbol);
        return { symbol, price };
      })
    );

    cryptoPrices.forEach(({ symbol, price }) => {
      if (price !== null) {
        prices[symbol] = price;
      }
    });
  }

  const warning = hasError || !Object.keys(prices).length
    ? 'Could not fetch some live prices. Using cost basis.'
    : null;

  return { prices, warning };
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

/**
 * Search for crypto symbols via backend
 */
export const searchCrypto = async (token, query) => {
  if (!token) {
    console.warn('No auth token; cannot search crypto.');
    return [];
  }

  if (!query || query.length < 2) {
    return [];
  }

  try {
    const data = await apiSearchCrypto(token, query);
    return data?.results || [];
  } catch (error) {
    console.warn(`Crypto search failed for ${query}`, error);
    return [];
  }
};

