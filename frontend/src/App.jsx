import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
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
import { DashboardSkeleton } from './components/DashboardSkeleton';
import { Notice } from './components/ui/Notice';
import Landing from './pages/Landing';
import { PageFade } from './components/motion/PageFade';
import { useDocumentTheme } from './hooks/useDocumentTheme';


// Dashboard component (logged in view)
const Dashboard = () => {
  useDocumentTheme('dark');
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
    loadError,
    dataVersion,
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

  // Success messages clear themselves; errors stay until dismissed
  useEffect(() => {
    if (message?.type !== 'success') return undefined;

    const timer = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [message]);

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

  // Only the first load blanks the dashboard: refreshes keep it mounted so
  // charts, tabs and scroll position survive adding or deleting an asset.
  if (!pricesLoaded) {
    if (loadError) {
      return (
        <div className="dashboard-dark">
          <Navbar />
          <div className="app-shell">
            <Notice tone="error">{loadError}</Notice>
            <button className="btn primary" type="button" onClick={() => loadAssets().catch(() => {})}>
              Retry
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="dashboard-dark">
        <Navbar />
        <DashboardSkeleton />
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
      <PageFade className="app-shell">
        <Header
          onRefresh={handleRefresh}
          fetchingAssets={fetchingAssets}
        />

        <Notice tone="warning">{priceWarning}</Notice>

        <Notice
          tone={message?.type === 'error' ? 'error' : 'success'}
          onDismiss={() => setMessage(null)}
        >
          {message?.text}
        </Notice>

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
          dataVersion={dataVersion}
        />
        <HistoryChart lineSeries={lineSeries} />
      </section>

      {/* Portfolio vs S&P 500 Comparison */}
      <section className="benchmark-section">
        <BenchmarkChart token={token} dataVersion={dataVersion} />
      </section>

      {/* Monte Carlo Risk Simulation */}
      <section className="benchmark-section">
        <MonteCarloChart token={token} livePrices={livePrices} dataVersion={dataVersion} />
      </section>

      {/* Portfolio Diversification Analysis */}
      <section className="benchmark-section">
        <DiversificationScore token={token} livePrices={livePrices} dataVersion={dataVersion} />
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
      </PageFade>
    </div>
  );
};

// Login page wrapper
const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [pendingAction, setPendingAction] = useState(null);
  const [message, setMessage] = useState(() =>
    searchParams.get('reason') === 'expired'
      ? { type: 'info', text: 'Your session expired. Please sign in again.' }
      : null
  );
  const submittingRef = useRef(false);
  const { isAuthenticated, isValidating, authMode, setAuthMode, credentials, setCredentials, handleLogin, handleRegister, handleDemoLogin, triggerValidation } = useAuth();

  // Check if user is already logged in when entering login page
  useEffect(() => {
    triggerValidation();
  }, []);

  // "Get started" links arrive with ?mode=register
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'register' || mode === 'login') {
      setAuthMode(mode);
    }
  }, [searchParams, setAuthMode]);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!isValidating && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isValidating, navigate]);

  const onDemoLogin = async () => {
    setPendingAction('demo');
    setMessage(null);
    try {
      await handleDemoLogin();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Demo login failed.' });
      setPendingAction(null);
    }
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    
    // Prevent duplicate submissions
    if (submittingRef.current || pendingAction) {
      return;
    }

    submittingRef.current = true;
    setPendingAction('submit');
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
      setPendingAction(null);
      submittingRef.current = false;
    }
  };

  // Show spinner while checking auth status
  if (isValidating) {
    return <LoadingSpinner />;
  }

  // Keep the loader on screen while redirecting authenticated users
  if (isAuthenticated) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <Navbar />
      <PageFade>
        <AuthForm
          authMode={authMode}
          setAuthMode={setAuthMode}
          credentials={credentials}
          setCredentials={setCredentials}
          handleSubmit={handleAuthSubmit}
          pendingAction={pendingAction}
          message={message}
          onDemoLogin={onDemoLogin}
        />
      </PageFade>
    </>
  );
};

// Main App with routing
const App = () => {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </MotionConfig>
  );
};

export default App;