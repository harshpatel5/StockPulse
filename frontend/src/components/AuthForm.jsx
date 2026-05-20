import React from 'react';
import { Activity, LogIn, UserPlus } from 'lucide-react';

export const AuthForm = ({
  authMode,
  setAuthMode,
  credentials,
  setCredentials,
  handleSubmit,
  busy,
  message,
  onDemoLogin,
}) => {
  return (
    <div className="app-shell auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <Activity size={32} />
          <div>
            <p className="eyebrow">StockPulse</p>
            <h1>Track, plan, and grow.</h1>
          </div>
        </div>

        <p className="muted">
          Sign in to manage your assets with live prices from Alpha Vantage.
        </p>

        {message && (
          <div className={`notice ${message.type === 'error' ? 'error' : 'success'}`}>
            {message.text}
          </div>
        )}

        <form className="stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={credentials.email}
              onChange={(event) =>
                setCredentials((prev) => ({ ...prev, email: event.target.value }))
              }
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={credentials.password}
              onChange={(event) =>
                setCredentials((prev) => ({ ...prev, password: event.target.value }))
              }
              placeholder="••••••••"
              required
            />
          </label>

          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Create account'}
            {authMode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
          </button>
        </form>

        <button
          className="btn ghost swap"
          type="button"
          onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
        >
          {authMode === 'login' ? 'Need an account? Register' : 'Already a member? Sign in'}
        </button>

        {onDemoLogin && (
          <>
            <div className="auth-divider"><span>or</span></div>
            <button className="btn ghost demo-btn" type="button" onClick={onDemoLogin}>
              Try Demo Account
            </button>
          </>
        )}
      </div>
    </div>
  );
};
