import { FINNHUB_KEY } from '../constants';

export const fetchPriceForSymbol = async (symbol) => {
  if (!FINNHUB_KEY) {
    console.warn('Finnhub key missing; skip live quote.');
    return null;
  }

  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`
    );
    const data = await response.json();

    if (!data || data.error) {
      console.warn('Finnhub response', symbol, data);
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

  if (!FINNHUB_KEY) {
    return {
      prices: {},
      warning: 'Add your Finnhub API key (VITE_ALPHA_VANTAGE_KEY) to enable live quotes.',
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
    ? 'Finnhub did not return live prices. Using cost basis.'
    : null;

  return { prices, warning };
};

export const searchSymbols = async (query) => {
  if (!FINNHUB_KEY) {
    console.warn('Finnhub key missing; cannot search symbols.');
    return [];
  }

  if (!query || query.length < 2) {
    return [];
  }

  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${FINNHUB_KEY}`
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

