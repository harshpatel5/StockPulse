import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useAssets } from './hooks/useAssets';
import { usePortfolio } from './hooks/usePortfolio';
import { AuthForm } from './components/AuthForm';
import { Navbar } from './components/Navbar';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { AllocationChart } from './components/AllocationChart';
import { HistoryChart } from './components/HistoryChart';
import { BenchmarkChart } from './components/BenchmarkChart';
import { AssetForm } from './components/AssetForm';
import { AssetList } from './components/AssetList';
import Landing from './pages/Landing';


// Dashboard component (logged in view)
const Dashboard = () => {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const { token, isAuthenticated, isValidating } = useAuth();
  

  const {
    assets,
    livePrices,
    history,
    formAsset,
    setFormAsset,
    fetchingAssets,
    priceWarning,
    pricesLoaded,
    loadAssets,
    addAsset,
    removeAsset,
  } = useAssets(token);

  const { portfolioTotals, allocationData, lineSeries, netChange, netChangePct } = usePortfolio(
    assets,
    livePrices,
    history
  );

  const handleAddAsset = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const successMessage = await addAsset();
      setMessage({ type: 'success', text: successMessage });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAsset = async (assetId) => {
    setBusy(true);
    setMessage(null);

    try {
      await removeAsset(assetId);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const handleRefresh = async () => {
    setMessage(null);
    try {
      await loadAssets();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  // Show loading while validating authentication
  if (isValidating) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Show loading while fetching assets and prices
  // This prevents showing cost basis values before live prices load
  if (fetchingAssets || !pricesLoaded) {
    return (
      <>
        <Navbar />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 60px)' }}>
          <div>Loading portfolio data...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="app-shell">
        <Header
          onRefresh={handleRefresh}
          fetchingAssets={fetchingAssets}
        />

        {priceWarning && <div className="notice error">{priceWarning}</div>}

      {message && (
        <div className={`notice ${message.type === 'error' ? 'error' : 'success'}`}>
          {message.text}
        </div>
      )}

      <StatsCards
        portfolioTotals={portfolioTotals}
        allocationData={allocationData}
        netChange={netChange}
        netChangePct={netChangePct}
      />

      <section className="charts-grid">
        <AllocationChart 
          allocationData={allocationData} 
          token={token}
          livePrices={livePrices}
        />
        <HistoryChart lineSeries={lineSeries} />
      </section>

      {/* Portfolio vs S&P 500 Comparison */}
      <section className="benchmark-section">
        <BenchmarkChart token={token} />
      </section>

      <section className="content-grid">
        <AssetForm
          formAsset={formAsset}
          setFormAsset={setFormAsset}
          onSubmit={handleAddAsset}
          busy={busy}
          token={token}
        />
        <AssetList assets={portfolioTotals.rows} onDelete={handleDeleteAsset} />
      </section>
      </div>
    </>
  );
};

// Login page wrapper
const LoginPage = () => {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const submittingRef = useRef(false);
  const { isAuthenticated, isValidating, authMode, setAuthMode, credentials, setCredentials, handleLogin, handleRegister } = useAuth();

  // Redirect if already authenticated (but wait for validation to complete)
  useEffect(() => {
    if (!isValidating && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isValidating, navigate]);

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    
    // Prevent duplicate submissions (React StrictMode in dev causes double calls)
    if (submittingRef.current || busy) {
      return;
    }
    
    submittingRef.current = true;
    setBusy(true);
    setMessage(null);
    
    try {
      if (authMode === 'login') {
        await handleLogin();
        // Login successful - useEffect will handle redirect
      } else {
        await handleRegister();
        setMessage({ type: 'success', text: 'Account created. Please sign in.' });
      }
    } catch (error) {
      console.error('Auth error:', error);
      setMessage({ type: 'error', text: error.message || 'Authentication failed. Please try again.' });
    } finally {
      setBusy(false);
      submittingRef.current = false;
    }
  };

  // Show loading while validating authentication
  if (isValidating) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  // Show loading or redirect if authenticated
  if (isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <>
      <Navbar />
      <AuthForm
        authMode={authMode}
        setAuthMode={setAuthMode}
        credentials={credentials}
        setCredentials={setCredentials}
        handleSubmit={handleAuthSubmit}
        busy={busy}
        message={message}
      />
    </>
  );
};

// Main App with routing
const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;