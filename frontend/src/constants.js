export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
export const FINNHUB_KEY =
  import.meta.env.DEV?.VITE_ALPHA_VANTAGE_KEY ?? import.meta.env.VITE_ALPHA_VANTAGE_KEY;

export const DEFAULT_ASSET = { name: '', type: 'Stock', quantity: '', costBasis: '' };
export const ASSET_COLORS = ['#5B8DEF', '#F2A541', '#3FC1C9', '#E05D5D', '#7B7EF6', '#50C878'];

export const ASSET_TYPES = ['Stock', 'Crypto', 'Bond', 'ETF', 'Commodity'];

