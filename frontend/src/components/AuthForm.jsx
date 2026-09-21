import { Activity, LogIn, UserPlus } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Notice } from './ui/Notice';
import { DUR } from '../lib/motion';

const COPY = {
  login: {
    title: 'Track, plan, and grow.',
    subtitle: 'Sign in to manage your assets with live prices from Finnhub and CoinGecko.',
    submit: 'Sign in',
    swap: 'Need an account? Register',
  },
  register: {
    title: 'Start tracking today.',
    subtitle: 'Create an account to follow your portfolio with live prices from Finnhub and CoinGecko.',
    submit: 'Create account',
    swap: 'Already a member? Sign in',
  },
};

// Opacity-only crossfade: the inputs stay mounted, only the wording swaps
const swapTransition = { duration: DUR.fast };
const swapExit = { opacity: 0, transition: { duration: 0.08 } };

export const AuthForm = ({
  authMode,
  setAuthMode,
  credentials,
  setCredentials,
  handleSubmit,
  pendingAction,
  message,
  onDemoLogin,
}) => {
  const copy = COPY[authMode] || COPY.login;
  const isSubmitting = pendingAction === 'submit';
  const isDemoPending = pendingAction === 'demo';
  const isBusy = Boolean(pendingAction);

  return (
    <div className="app-shell auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <Activity size={32} />
          <div>
            <p className="eyebrow">StockPulse</p>
            <AnimatePresence mode="wait" initial={false}>
              <motion.h1
                key={authMode}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={swapExit}
                transition={swapTransition}
              >
                {copy.title}
              </motion.h1>
            </AnimatePresence>
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={authMode}
            className="muted"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={swapExit}
            transition={swapTransition}
          >
            {copy.subtitle}
          </motion.p>
        </AnimatePresence>

        <Notice tone={message?.type || 'info'}>{message?.text}</Notice>

        <form className="stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
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
              name="password"
              autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
              value={credentials.password}
              onChange={(event) =>
                setCredentials((prev) => ({ ...prev, password: event.target.value }))
              }
              placeholder="••••••••"
              required
            />
          </label>

          <button className="btn primary" type="submit" disabled={isBusy} aria-busy={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="btn-spinner" aria-hidden="true" />
                Please wait…
              </>
            ) : (
              <>
                {copy.submit}
                {authMode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
              </>
            )}
          </button>
        </form>

        <button
          className="btn ghost swap"
          type="button"
          disabled={isBusy}
          onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
        >
          {copy.swap}
        </button>

        {onDemoLogin && (
          <>
            <div className="auth-divider"><span>or</span></div>
            <button
              className="btn ghost demo-btn"
              type="button"
              onClick={onDemoLogin}
              disabled={isBusy}
              aria-busy={isDemoPending}
            >
              {isDemoPending && <span className="btn-spinner" aria-hidden="true" />}
              {isDemoPending ? 'Signing in…' : 'Try Demo Account'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
