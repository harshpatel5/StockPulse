import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useAssets } from './hooks/useAssets';
import { usePortfolio } from './hooks/usePortfolio';
import { AuthForm } from './components/AuthForm';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { AllocationChart } from './components/AllocationChart';
import { HistoryChart } from './components/HistoryChart';
import { AssetForm } from './components/AssetForm';
import { AssetList } from './components/AssetList';

const StockPulse = () => {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const {
    token,
    user,
    isAuthenticated,
    authMode,
    setAuthMode,
    credentials,
    setCredentials,
    handleLogin,
    handleRegister,
    handleLogout,
  } = useAuth();

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

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      if (authMode === 'login') {
        await handleLogin();
      } else {
        const result = await handleRegister();
        setMessage({ type: 'success', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusy(false);
    }
  };

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

  if (!isAuthenticated) {
    return (
      <AuthForm
        authMode={authMode}
        setAuthMode={setAuthMode}
        credentials={credentials}
        setCredentials={setCredentials}
        handleSubmit={handleAuthSubmit}
        busy={busy}
        message={message}
      />
    );
  }

  return (
    <div className="app-shell">
      <Header
        user={user}
        onLogout={handleLogout}
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
        />
        <AssetList assets={portfolioTotals.rows} onDelete={handleDeleteAsset} />
      </section>
    </div>
  );
};

export default StockPulse;
