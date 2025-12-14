import { Link, Navigate } from 'react-router-dom';
import { PieChart, Shield, BarChart3 } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../hooks/useAuth';

const Landing = () => {
  const { isAuthenticated } = useAuth();

  // If already logged in, go straight to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="landing">
      <Navbar />

      {/* Hero */}
      <section className="hero">
        <h1>Track Your Investments<br /><span>With Confidence</span></h1>
        <p>Simple, powerful portfolio tracking. Monitor your stocks, see real-time prices, and watch your wealth grow.</p>
        <Link to="/login" className="btn primary btn-large">Get Started Free</Link>
      </section>

      {/* Features */}
      <section className="features">
        <div className="feature-card">
          <PieChart size={32} />
          <h3>Portfolio Overview</h3>
          <p>See your entire portfolio at a glance with beautiful charts.</p>
        </div>
        <div className="feature-card">
          <BarChart3 size={32} />
          <h3>Real-Time Prices</h3>
          <p>Live stock prices powered by Alpha Vantage API.</p>
        </div>
        <div className="feature-card">
          <Shield size={32} />
          <h3>Secure & Private</h3>
          <p>Your data is encrypted and never shared.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© 2024 StockPulse. Track smarter.</p>
      </footer>
    </div>
  );
};

export default Landing;
