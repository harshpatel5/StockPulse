import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
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
import { MonteCarloChart } from './components/MonteCarloChart';
import { DiversificationScore } from './components/DiversificationScore';
import { AssetForm } from './components/AssetForm';
import { AssetList } from './components/AssetList';
import { LoadingSpinner } from './components/LoadingSpinner';
import Landing from './pages/Landing';


// Dashboard component (logged in view)
const Dashboard = () => {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const { token, isAuthenticated, isValidating, isDemo, triggerValidation, handleLogout } = useAuth();

  // Check authentication when component loads
  useEffect(() => {
    triggerValidation();
  }, [triggerValidation]);

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

  // Show spinner while validating auth
  if (isValidating) {
    return <LoadingSpinner />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Show loading while fetching assets and prices
  // This prevents showing cost basis values before live prices load
  if (fetchingAssets || !pricesLoaded) {
    return (
      <div className="dashboard-dark">
        <Navbar />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 60px)' }}>
          <div>Loading portfolio data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-dark">
      <Navbar />
      {isDemo && (
        <div className="demo-banner">
          Viewing demo account (read-only).{' '}
          <Link to="/login" onClick={handleLogout}>Sign up for free</Link>
        </div>
      )}
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

      {/* Monte Carlo Risk Simulation */}
      <section className="benchmark-section">
        <MonteCarloChart token={token} livePrices={livePrices} />
      </section>

      {/* Portfolio Diversification Analysis */}
      <section className="benchmark-section">
        <DiversificationScore token={token} livePrices={livePrices} />
      </section>

      <section className="content-grid">
        {!isDemo && (
          <AssetForm
            formAsset={formAsset}
            setFormAsset={setFormAsset}
            onSubmit={handleAddAsset}
            busy={busy}
            token={token}
          />
        )}
        <AssetList assets={portfolioTotals.rows} onDelete={isDemo ? null : handleDeleteAsset} />
      </section>
      </div>
    </div>
  );
};

// Login page wrapper
const LoginPage = () => {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const submittingRef = useRef(false);
  const { isAuthenticated, isValidating, authMode, setAuthMode, credentials, setCredentials, handleLogin, handleRegister, handleDemoLogin, triggerValidation } = useAuth();

  // Check if user is already logged in when entering login page
  useEffect(() => {
    triggerValidation();
  }, []);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!isValidating && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isValidating, navigate]);

  const onDemoLogin = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await handleDemoLogin();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Demo login failed.' });
      setBusy(false);
    }
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    
    // Prevent duplicate submissions
    if (submittingRef.current || busy) {
      return;
    }
    
    submittingRef.current = true;
    setBusy(true);
    setMessage(null);
    
    try {
      if (authMode === 'login') {
        await handleLogin();
        // Redirect happens automatically via useEffect
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

  // Show spinner while checking auth status
  if (isValidating) {
    return <LoadingSpinner />;
  }

  // Don't show anything while redirecting authenticated users
  if (isAuthenticated) {
    return null;
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
        onDemoLogin={onDemoLogin}
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