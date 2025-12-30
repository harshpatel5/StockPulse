/**
 * Price Service - All price data fetched via backend proxy
 * API keys are NEVER exposed to the frontend
 */
import { 
  fetchQuote, 
  fetchBatchQuotes, 
  searchSymbols as apiSearchSymbols,
  fetchCryptoQuote,
  searchCrypto as apiSearchCrypto
} from './api';
import { dedupeRequest } from '../utils/requestDeduplication';

/**
 * Fetch live price for a single stock symbol via backend
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
 * Fetch live price for a single crypto symbol via backend
 */
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

/**
 * Refresh prices for all assets (stocks, ETFs, and crypto) via backend
 */
export const refreshPrices = async (token, assetList = []) => {
  const list = Array.isArray(assetList) ? assetList : [];
  
  // Stocks and ETFs both use Finnhub API
  const stocksAndETFs = list.filter((asset) => {
    const normalizedType = asset.type ? asset.type.toLowerCase().trim() : '';
    return normalizedType === 'stock' || normalizedType === 'etf';
  });
  
  const cryptos = list.filter((asset) => {
    const normalizedType = asset.type ? asset.type.toLowerCase().trim() : '';
    return normalizedType === 'crypto';
  });

  if (!stocksAndETFs.length && !cryptos.length) {
    return { prices: {}, warning: null };
  }

  if (!token) {
    return {
      prices: {},
      warning: 'Please log in to fetch live prices.',
    };
  }

  const prices = {};
  let hasError = false;

  // Fetch stock and ETF prices (both use Finnhub)
  if (stocksAndETFs.length) {
    try {
      const symbols = stocksAndETFs.map((asset) => asset.name.trim().toUpperCase());
      const symbolsKey = symbols.sort().join(',');
      const data = await dedupeRequest(
        `fetchBatchQuotes:${token}:${symbolsKey}`,
        () => fetchBatchQuotes(token, symbols),
        1000 // 1 second dedupe window for price calls
      );
      Object.assign(prices, data?.prices || {});
    } catch (error) {
      console.warn('Stock/ETF price fetch failed', error);
      hasError = true;
    }
  }

  // Fetch crypto prices (one by one since CoinGecko doesn't have batch)
  if (cryptos.length) {
    const cryptoPrices = await Promise.all(
      cryptos.map(async (asset) => {
        const symbol = asset.name.trim().toUpperCase();
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

