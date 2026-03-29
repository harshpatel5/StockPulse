import { API_BASE_URL } from '../constants';

// Build auth header with JWT token
const getAuthHeaders = (token) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

// Parse JSON responses safely
const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type');
  
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  
  // Non-JSON response (e.g., HTML error page)
  const text = await response.text();
  console.error('Non-JSON response received:', text.substring(0, 200));
  throw new Error('Server returned invalid response. Please try again or contact support.');
};

// Main API call wrapper with error handling
const apiCall = async (url, options = {}, skipAuthRedirect = false) => {
  try {
    const response = await fetch(url, options);
    const data = await parseResponse(response);
    
    // Only redirect on 401 for authenticated routes (not login/register)
    if (response.status === 401 && !skipAuthRedirect) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
    }
    
    if (!response.ok) {
      throw new Error(data?.message || `Request failed with status ${response.status}`);
    }
    
    return data;
  } catch (error) {
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to server. Please check if the server is running.');
    }
    throw error;
  }
};


// ========================================
// AUTH ENDPOINTS
// ========================================

export const login = async (credentials) => {
  return apiCall(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  }, true); // Skip auth redirect for login endpoint
};

export const register = async (credentials) => {
  return apiCall(`${API_BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  }, true); // Skip redirect on register
};


// ========================================
// ASSET ENDPOINTS
// ========================================

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

export const deleteAsset = async (token, assetId, currentValue = null) => {
  const options = {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  };
  if (currentValue !== null) {
    options.body = JSON.stringify({ current_value: currentValue });
  }
  return apiCall(`${API_BASE_URL}/assets/${assetId}`, options);
};


// ========================================
// PORTFOLIO HISTORY ENDPOINTS
// ========================================

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


// ========================================
// PRICE ENDPOINTS (Proxy to Finnhub)
// ========================================

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


// ========================================
// CACHED PRICES (Redis - single call)
// ========================================

export const fetchCachedPricesApi = async (token) => {
  return apiCall(`${API_BASE_URL}/prices/cached`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};


// ========================================
// CRYPTO ENDPOINTS (Proxy to CoinGecko)
// ========================================

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


// ========================================
// PORTFOLIO INSIGHTS
// ========================================

export const fetchPortfolioInsights = async (token, livePrices = {}) => {
  return apiCall(`${API_BASE_URL}/portfolio/insights`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ prices: livePrices }),
  });
};


// ========================================
// BENCHMARK COMPARISON (vs S&P 500)
// ========================================

export const fetchBenchmarkComparison = async (token) => {
  return apiCall(`${API_BASE_URL}/benchmark/comparison`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};


// ========================================
// MONTE CARLO RISK SIMULATION
// ========================================

export const fetchMonteCarloSimulation = async (token, livePrices = {}, timeframeDays = 90) => {
  return apiCall(`${API_BASE_URL}/portfolio/monte-carlo`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ prices: livePrices, timeframe_days: timeframeDays }),
  });
};


// ========================================
// DIVERSIFICATION SCORE
// ========================================

export const fetchDiversificationScore = async (token, livePrices = {}) => {
  return apiCall(`${API_BASE_URL}/portfolio/diversification`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ prices: livePrices }),
  });
};


// ========================================
// USER ENDPOINT
// ========================================

export const getMe = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    return null;
  }
  
  const data = await apiCall(`${API_BASE_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  return data?.user || data;  // Extract user object
};