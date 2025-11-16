import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Plus, Trash2, LogOut, DollarSign, Package, Activity } from 'lucide-react';

// Alpha Vantage API Configuration

const ALPHA_VANTAGE_KEY = 'BUEQ8CUDZ3G6GI2X'; // Replace with your API key
const API_BASE_URL = 'http://localhost:5000/api';

// Mock price fetching (will use Alpha Vantage in real implementation)
const fetchStockPrice = async (symbol) => {
  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`
    );
    const data = await response.json();
    
    console.log(`Fetching price for ${symbol}:`, data); // Debug log
    
    if (data['Global Quote'] && data['Global Quote']['05. price']) {
      const price = parseFloat(data['Global Quote']['05. price']);
      console.log(`✓ Got real price for ${symbol}: $${price}`);
      return price;
    }
    
    // If no price available, return null.
    console.log(`✗ No price data for ${symbol}, using cost basis`);
    return null;
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return null;
  }
};

const StockPulse = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState('login');
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [assets, setAssets] = useState([]);
  const [livePrices, setLivePrices] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newAsset, setNewAsset] = useState({
    name: '',
    type: 'Stock',
    quantity: '',
    cost_basis: ''
  });

  // Chart colors
  const COLORS = {
    'Stock': '#3b82f6',
    'Crypto': '#f59e0b',
    'Bond': '#10b981',
    'ETF': '#8b5cf6',
    'Commodity': '#f97316',
  };

  // Fetch assets from backend
  const fetchAssets = async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/assets`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAssets(data);
        
        // Fetch live prices for stocks
        data.forEach(async (asset) => {
          if (asset.type === 'Stock') {
            const price = await fetchStockPrice(asset.name);
            setLivePrices(prev => ({ ...prev, [asset.name]: price }));
          }
        });
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  };

  // Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setToken(data.token);
        setUser(data.user);
        setIsLoggedIn(true);
        setCurrentView('dashboard');
        setEmail('');
        setPassword('');
      } else {
        alert(data.message || 'Login failed');
      }
    } catch (error) {
      alert('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  // Register
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('Registration successful! Please login.');
        setCurrentView('login');
        setEmail('');
        setPassword('');
      } else {
        alert(data.message || 'Registration failed');
      }
    } catch (error) {
      alert('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  // Add Asset
  const handleAddAsset = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/assets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newAsset)
      });
      
      if (response.ok) {
        setNewAsset({ name: '', type: 'Stock', quantity: '', cost_basis: '' });
        fetchAssets();
      } else {
        alert('Failed to add asset');
      }
    } catch (error) {
      alert('Error adding asset');
    } finally {
      setLoading(false);
    }
  };

  // Delete Asset
  const handleDeleteAsset = async (assetId) => {
    if (!window.confirm('Delete this asset?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/assets/${assetId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        fetchAssets();
      }
    } catch (error) {
      alert('Error deleting asset');
    }
  };

  // Logout
  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setIsLoggedIn(false);
    setAssets([]);
    setCurrentView('login');
  };

  // Fetch assets on login
  useEffect(() => {
    if (isLoggedIn && token) {
      fetchAssets();
    }
  }, [isLoggedIn, token]);

  // Calculate portfolio metrics
  const totalCostBasis = assets.reduce((sum, a) => sum + a.cost_basis, 0);
  const totalCurrentValue = assets.reduce((sum, a) => {
    const currentPrice = livePrices[a.name] || a.cost_basis / a.quantity;
    return sum + (currentPrice * a.quantity);
  }, 0);
  const totalGainLoss = totalCurrentValue - totalCostBasis;
  const totalGainLossPercent = totalCostBasis > 0 ? ((totalGainLoss / totalCostBasis) * 100).toFixed(2) : 0;

  // Chart data
  const chartData = Object.entries(
    assets.reduce((acc, asset) => {
      if (!acc[asset.type]) acc[asset.type] = 0;
      const currentPrice = livePrices[asset.name] || asset.cost_basis / asset.quantity;
      acc[asset.type] += currentPrice * asset.quantity;
      return acc;
    }, {})
  ).map(([type, value]) => ({
    name: type,
    value: value,
    percentage: ((value / totalCurrentValue) * 100).toFixed(1)
  }));

  // ========================================================================
  // LOGIN VIEW
  // ========================================================================
  if (currentView === 'login' || currentView === 'register') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Activity className="text-indigo-600" size={32} />
              <h1 className="text-3xl font-bold text-gray-900">StockPulse</h1>
            </div>
            <p className="text-gray-500">Track your investments in real-time</p>
          </div>

          <form onSubmit={currentView === 'login' ? handleLogin : handleRegister}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {loading ? 'Please wait...' : (currentView === 'login' ? 'Login' : 'Register')}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setCurrentView(currentView === 'login' ? 'register' : 'login')}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {currentView === 'login' ? "Don't have an account? Register" : 'Already have an account? Login'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========================================================================
  // DASHBOARD VIEW
  // ========================================================================
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="text-indigo-600" size={28} />
              <h1 className="text-2xl font-bold text-gray-900">StockPulse</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Portfolio Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="text-indigo-600" size={24} />
              <p className="text-sm text-gray-500">Total Value</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              ${totalCurrentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div className={`flex items-center gap-1 mt-2 ${totalGainLoss >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {totalGainLoss >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span className="font-semibold text-sm">
                ${Math.abs(totalGainLoss).toLocaleString('en-US', { minimumFractionDigits: 2 })} ({totalGainLossPercent}%)
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Package className="text-gray-600" size={24} />
              <p className="text-sm text-gray-500">Cost Basis</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              ${totalCostBasis.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-gray-400 mt-2">Initial investment</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="text-gray-600" size={24} />
              <p className="text-sm text-gray-500">Total Assets</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{assets.length}</p>
            <p className="text-sm text-gray-400 mt-2">{chartData.length} asset types</p>
          </div>
        </div>

        {/* Charts and Assets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* Pie Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Asset Allocation</h2>
            {assets.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} ${percentage}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {chartData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: COLORS[item.name] || '#6b7280' }}
                      />
                      <span className="text-sm text-gray-700">{item.name}</span>
                      <span className="text-sm font-semibold text-gray-900">{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                No assets yet. Add your first investment!
              </div>
            )}
          </div>

          {/* Add Asset Form */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Add New Asset</h2>
            <form onSubmit={handleAddAsset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asset Name (e.g., AAPL, BTC)
                </label>
                <input
                  type="text"
                  value={newAsset.name}
                  onChange={(e) => setNewAsset({...newAsset, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="AAPL"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={newAsset.type}
                  onChange={(e) => setNewAsset({...newAsset, type: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option>Stock</option>
                  <option>Crypto</option>
                  <option>Bond</option>
                  <option>ETF</option>
                  <option>Commodity</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newAsset.quantity}
                    onChange={(e) => setNewAsset({...newAsset, quantity: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="10"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cost Basis ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newAsset.cost_basis}
                    onChange={(e) => setNewAsset({...newAsset, cost_basis: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="1500"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Add Asset
              </button>
            </form>
          </div>
        </div>

        {/* Assets List */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Holdings</h2>
          {assets.length > 0 ? (
            <div className="space-y-4">
              {assets.map((asset) => {
                const currentPrice = livePrices[asset.name] || asset.cost_basis / asset.quantity;
                const currentValue = currentPrice * asset.quantity;
                const gainLoss = currentValue - asset.cost_basis;
                const gainLossPercent = ((gainLoss / asset.cost_basis) * 100).toFixed(2);
                
                return (
                  <div key={asset.id} className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[asset.type] || '#6b7280' }}
                        />
                        <div>
                          <h3 className="font-semibold text-gray-900">{asset.name}</h3>
                          <p className="text-sm text-gray-500">{asset.type}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteAsset(asset.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Quantity</p>
                        <p className="font-semibold text-gray-900">{asset.quantity}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Cost Basis</p>
                        <p className="font-semibold text-gray-900">${asset.cost_basis.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Current Value</p>
                        <p className="font-semibold text-gray-900">${currentValue.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Gain/Loss</p>
                        <p className={`font-semibold ${gainLoss >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          ${Math.abs(gainLoss).toFixed(2)} ({gainLossPercent}%)
                        </p>
                      </div>
                    </div>

                    {asset.type === 'Stock' && livePrices[asset.name] && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-600">
                        <Activity size={14} />
                        <span>Live Price: ${livePrices[asset.name].toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Package size={48} className="mx-auto mb-4 opacity-50" />
              <p>No assets yet. Start by adding your first investment above!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StockPulse;