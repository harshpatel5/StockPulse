import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useAssets } from './hooks/useAssets';
import { usePortfolio } from './hooks/usePortfolio';
import { AuthForm } from './components/AuthForm';
import { Navbar } from './components/Navbar';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { AllocationChart } from './components/AllocationChart';
import { HistoryChart } from './components/HistoryChart';
import { AssetForm } from './components/AssetForm';
import { AssetList } from './components/AssetList';
import Landing from './pages/Landing';

// Dashboard component (logged in view)
const Dashboard = () => {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const { token, user, isAuthenticated, handleLogout } = useAuth();

  const {
    assets,
    livePrices,
    history,
    formAsset,
    setFormAsset,
    fetchingAssets,
    priceWarning,
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

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
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
        <AllocationChart allocationData={allocationData} />
        <HistoryChart lineSeries={lineSeries} />
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
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const { isAuthenticated, authMode, setAuthMode, credentials, setCredentials, handleLogin, handleRegister } = useAuth();

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (authMode === 'login') {
        await handleLogin();
      } else {
        await handleRegister();
        setMessage({ type: 'success', text: 'Account created. Please sign in.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusy(false);
    }
  };

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
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
