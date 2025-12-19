import { API_BASE_URL } from '../constants';

const getAuthHeaders = (token) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

// Helper function to safely parse JSON responses
const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type');
  
  // Check if response is JSON
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  
  // If not JSON (e.g., HTML error page), throw descriptive error
  const text = await response.text();
  console.error('Non-JSON response received:', text.substring(0, 200));
  throw new Error('Server returned invalid response. Please try again or contact support.');
};

// Helper function to handle API calls with proper error handling
const apiCall = async (url, options = {}) => {
  try {
    const response = await fetch(url, options);
    
    // Parse response (will throw if not JSON)
    const data = await parseResponse(response);
    
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
    }
    // Check HTTP status
    if (!response.ok) {
      throw new Error(data?.message || `Request failed with status ${response.status}`);
    }
    
    return data;
  } catch (error) {
    // Handle network errors, CORS issues, etc.
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to server. Please check if the server is running.');
    }
    throw error;
  }
};

// Auth API
export const login = async (credentials) => {
  return apiCall(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
};

export const register = async (credentials) => {
  return apiCall(`${API_BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
};

// Assets API
export const fetchAssets = async (token) => {
  return apiCall(`${API_BASE_URL}/assets`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const createAsset = async (token, assetData) => {
  return apiCall(`${API_BASE_URL}/assets`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(assetData),
  });
};

export const deleteAsset = async (token, assetId) => {
  return apiCall(`${API_BASE_URL}/assets/${assetId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
};

// History API
export const fetchHistory = async (token) => {
  return apiCall(`${API_BASE_URL}/history`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const updateHistory = async (token, totalValue) => {
  return apiCall(`${API_BASE_URL}/history/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ total_value: totalValue }),
  });
};

// Prices API (server-side proxy to Finnhub - keeps API key secure)
export const fetchQuote = async (token, symbol) => {
  return apiCall(`${API_BASE_URL}/prices/quote/${encodeURIComponent(symbol)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const fetchBatchQuotes = async (token, symbols) => {
  return apiCall(`${API_BASE_URL}/prices/batch`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ symbols }),
  });
};

export const searchSymbols = async (token, query) => {
  return apiCall(`${API_BASE_URL}/prices/search?q=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Crypto API (server-side proxy to CoinGecko - free, no API key)
export const fetchCryptoQuote = async (token, symbol) => {
  return apiCall(`${API_BASE_URL}/crypto/quote/${encodeURIComponent(symbol)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const searchCrypto = async (token, query) => {
  return apiCall(`${API_BASE_URL}/crypto/search?q=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Portfolio Insights API (backend-heavy calculations)
export const fetchPortfolioInsights = async (token, livePrices = {}) => {
  return apiCall(`${API_BASE_URL}/portfolio/insights`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ prices: livePrices }),
  });
};

// Benchmark Comparison API (Portfolio vs S&P 500)
export const fetchBenchmarkComparison = async (token) => {
  return apiCall(`${API_BASE_URL}/benchmark/comparison`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const getMe = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    return null;
  }
  
  const data = await apiCall(`${API_BASE_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  // Backend returns {user: {...}}, extract and return just the user object
  return data?.user || data;
};