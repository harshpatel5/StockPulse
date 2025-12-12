import { API_BASE_URL } from '../constants';

const getAuthHeaders = (token) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

// Auth API
export const login = async (credentials) => {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || 'Something went wrong.');
  }
  return data;
};

export const register = async (credentials) => {
  const response = await fetch(`${API_BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || 'Something went wrong.');
  }
  return data;
};

// Assets API
export const fetchAssets = async (token) => {
  const response = await fetch(`${API_BASE_URL}/assets`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error('Unable to load your assets right now.');
  }
  return response.json();
};

export const createAsset = async (token, assetData) => {
  const response = await fetch(`${API_BASE_URL}/assets`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(assetData),
  });
  if (!response.ok) {
    throw new Error('Unable to add asset right now.');
  }
  return response.json();
};

export const deleteAsset = async (token, assetId) => {
  const response = await fetch(`${API_BASE_URL}/assets/${assetId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error('Failed to delete asset.');
  }
  return response.json();
};

// History API
export const fetchHistory = async (token) => {
  const response = await fetch(`${API_BASE_URL}/history`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error('Unable to load history');
  }
  return response.json();
};

export const updateHistory = async (token, totalValue) => {
  const response = await fetch(`${API_BASE_URL}/history/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ total_value: totalValue }),
  });
  if (!response.ok) {
    throw new Error('Unable to update history');
  }
  return response.json();
};

