import { ALPHA_VANTAGE_KEY } from '../constants';

export const fetchPriceForSymbol = async (symbol) => {
  if (!ALPHA_VANTAGE_KEY) {
    console.warn('Alpha Vantage key missing; skip live quote.');
    return null;
  }

  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${ALPHA_VANTAGE_KEY}`
    );
    const data = await response.json();

    if (!data || data.error) {
      console.warn('Alpha Vantage response', symbol, data);
      return null;
    }

    const price = data?.c;
    return Number.isFinite(price) ? price : null;
  } catch (error) {
    console.warn(`Live price lookup failed for ${symbol}`, error);
    return null;
  }
};

export const refreshPrices = async (assetList = []) => {
  const list = Array.isArray(assetList) ? assetList : [];
  const stocks = list.filter((asset) => {
    const normalizedType = asset.type ? asset.type.toLowerCase().trim() : '';
    return normalizedType === 'stock';
  });

  if (!stocks.length) {
    return { prices: {}, warning: null };
  }

  if (!ALPHA_VANTAGE_KEY) {
    return {
      prices: {},
      warning: 'Add your Alpha Vantage API key (VITE_ALPHA_VANTAGE_KEY) to enable live quotes.',
    };
  }

  const entries = await Promise.all(
    stocks.map(async (asset) => {
      const price = await fetchPriceForSymbol(asset.name.trim().toUpperCase());
      return { symbol: asset.name, price };
    })
  );

  const prices = entries.reduce((acc, entry) => {
    if (entry.price) acc[entry.symbol] = entry.price;
    return acc;
  }, {});

  const warning = !Object.keys(prices).length
    ? 'Alpha Vantage did not return live prices. Using cost basis.'
    : null;

  return { prices, warning };
};

export const searchSymbols = async (query) => {
  if (!ALPHA_VANTAGE_KEY) {
    console.warn('Alpha Vantage key missing; cannot search symbols.');
    return [];
  }

  if (!query || query.length < 2) {
    return [];
  }

  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${ALPHA_VANTAGE_KEY}`
    );
    const data = await response.json();

    if (!data || data.error || !data.result) {
      return [];
    }

    // Return up to 10 results with symbol and description
    return data.result.slice(0, 10).map((item) => ({
      symbol: item.symbol,
      description: item.description,
      displaySymbol: item.displaySymbol || item.symbol,
    }));
  } catch (error) {
    console.warn(`Symbol search failed for ${query}`, error);
    return [];
  }
};

