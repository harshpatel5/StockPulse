import { Link, useLocation, useNavigate } from 'react-router-dom';
import { TrendingUp, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const Navbar = () => {
  const { user, isAuthenticated, handleLogout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === '/';

  const onLogout = () => {
    handleLogout();
    navigate('/');
  };

  return (
    <nav className="landing-nav">
      <Link to="/" className="logo">
        <TrendingUp size={28} />
        <span>StockPulse</span>
      </Link>

      {isLanding && (
        <div className="landing-nav-center">
          <a href="#features" className="landing-nav-link">Features</a>
        </div>
      )}

      <button className="hamburger-btn" aria-label="Open menu" onClick={() => {}}>
        <Menu size={24} />
      </button>

      <div className="nav-actions">
        {isAuthenticated ? (
          <>
            {location.pathname !== '/dashboard' && (
              <Link to="/dashboard" className="btn ghost">
                Dashboard
              </Link>
            )}
            {user && <span className="user-email">{user.email}</span>}
            <button onClick={onLogout} className="btn ghost">
              <LogOut size={16} />
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn-nav-login">
              Log in
            </Link>
            <Link to="/login" className="btn-nav-start">
              Get started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};
