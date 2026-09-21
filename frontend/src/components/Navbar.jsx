import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { TrendingUp, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { enter, exit } from '../lib/motion';

// Same actions for the desktop bar and the mobile menu
const NavActions = ({ isAuthenticated, isDemo, user, pathname, onLogout, onNavigate }) => {
  if (!isAuthenticated) {
    return (
      <>
        <Link to="/login" className="btn-nav-login" onClick={onNavigate}>
          Log in
        </Link>
        <Link to="/login?mode=register" className="btn-nav-start" onClick={onNavigate}>
          Get started
        </Link>
      </>
    );
  }

  return (
    <>
      {pathname !== '/dashboard' && (
        <Link to="/dashboard" className="btn ghost" onClick={onNavigate}>
          Dashboard
        </Link>
      )}
      {user && <span className="user-email">{isDemo ? 'Demo Account' : user.email}</span>}
      <button onClick={onLogout} className="btn ghost">
        <LogOut size={16} />
        Logout
      </button>
    </>
  );
};

export const Navbar = () => {
  const { user, isAuthenticated, isDemo, handleLogout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === '/';
  const [open, setOpen] = useState(false);
  const navRef = useRef(null);

  const onLogout = () => {
    setOpen(false);
    handleLogout();
    navigate('/');
  };

  // Close the menu when the route changes
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Escape and outside clicks close the menu
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) setOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  const actionProps = {
    isAuthenticated,
    isDemo,
    user,
    pathname: location.pathname,
    onLogout,
  };

  return (
    <nav className="landing-nav" ref={navRef}>
      <Link to="/" className="logo">
        <TrendingUp size={28} />
        <span>StockPulse</span>
      </Link>

      {isLanding && (
        <div className="landing-nav-center">
          <a href="#features" className="landing-nav-link">Features</a>
        </div>
      )}

      <button
        className="hamburger-btn"
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div className="nav-actions">
        <NavActions {...actionProps} />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            className="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0, transition: enter }}
            exit={{ opacity: 0, y: -8, transition: exit }}
          >
            {isLanding && (
              <a href="#features" className="mobile-menu-link" onClick={() => setOpen(false)}>
                Features
              </a>
            )}
            <NavActions {...actionProps} onNavigate={() => setOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
