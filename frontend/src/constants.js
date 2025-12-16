export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// NOTE: API keys are stored on the backend ONLY for security
// Frontend never directly calls third-party APIs

export const DEFAULT_ASSET = { name: '', type: 'Stock', quantity: '', costBasis: '' };
export const ASSET_COLORS = ['#5B8DEF', '#F2A541', '#3FC1C9', '#E05D5D', '#7B7EF6', '#50C878'];

// Supported asset types:
// - Stock: US stocks via Finnhub API
// - Crypto: Cryptocurrencies via CoinGecko API  
// - ETF: Exchange-traded funds via Finnhub API (treated like stocks)
export const ASSET_TYPES = ['Stock', 'ETF', 'Crypto'];

