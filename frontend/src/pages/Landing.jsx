import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  TrendingUp,
  PieChart,
  Shield,
  BarChart3,
  Zap,
  Globe,
  ArrowRight
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Reveal, RevealGroup, RevealItem } from '../components/motion/Reveal';
import { CountUp } from '../components/motion/CountUp';
import { RotatingWord } from '../components/motion/RotatingWord';
import { pop } from '../lib/motion';
import './Landing.css';

const ROTATING_WORDS = ['Simplified', 'Visualized', 'Optimized'];

const FEATURES = [
  {
    icon: PieChart,
    title: 'Portfolio Analytics',
    description: 'Beautiful visualizations of your entire portfolio with real-time allocation charts.'
  },
  {
    icon: BarChart3,
    title: 'Historical Tracking',
    description: '30-day performance history with forward-filling for seamless trend analysis.'
  },
  {
    icon: TrendingUp,
    title: 'Benchmark Comparison',
    description: 'Compare your portfolio performance against the S&P 500 index.'
  },
  {
    icon: Shield,
    title: 'Live Price Updates',
    description: 'Real-time prices from Finnhub and CoinGecko with 60-second smart caching.'
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Parallel API fetching and in-memory caching for instant page loads.'
  },
  {
    icon: Globe,
    title: 'Multi-Asset Support',
    description: 'Track stocks, ETFs, and cryptocurrencies all in one unified dashboard.'
  }
];

const STATS = [
  { value: 10, suffix: '+', label: 'Active Users' },
  { value: 50, suffix: 'K+', label: 'Assets Tracked' },
  { value: 99.9, suffix: '%', label: 'Uptime' },
  { value: 4.9, suffix: '/5', label: 'User Rating' }
];

// Get started + Try Demo, used in the hero and again in the closing CTA
const CtaButtons = ({ rowClassName, large = false, demoLoading, demoError, onDemoClick }) => {
  const size = large ? ' btn-landing--lg' : '';

  return (
    <div className="landing-cta">
      <div className={rowClassName}>
        <Link to="/login?mode=register" className={`btn-landing btn-landing--primary${size}`}>
          Get started
        </Link>
        <button
          type="button"
          onClick={onDemoClick}
          className={`btn-landing btn-landing--secondary${size}`}
          disabled={demoLoading}
          aria-busy={demoLoading}
        >
          {demoLoading && <span className="btn-spinner" aria-hidden="true" />}
          {demoLoading ? 'Loading…' : 'Try Demo'}
        </button>
      </div>
      {demoError && (
        <p className="landing-cta-error" role="alert">
          {demoError}
        </p>
      )}
    </div>
  );
};

const Landing = () => {
  const { handleDemoLogin } = useAuth();
  const navigate = useNavigate();
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState(null);

  const onDemoClick = async () => {
    setDemoLoading(true);
    setDemoError(null);

    try {
      await handleDemoLogin();
      navigate('/dashboard');
    } catch (error) {
      setDemoError(error?.message || 'Could not start the demo. Please try again.');
      setDemoLoading(false);
    }
  };

  const ctaProps = { demoLoading, demoError, onDemoClick };

  return (
    <div className="landing-page">
      <Navbar />

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <RevealGroup className="hero-text" onMount gap={0.06}>
            <RevealItem as="h1" className="hero-title">
              Better than{' '}
              <br />
              your broker
            </RevealItem>
            <RevealItem as="p" className="hero-description">
              Get the most out of your investments with smart tracking,
              beautiful analytics, and insights to build long-term wealth.
            </RevealItem>
            <RevealItem>
              <CtaButtons rowClassName="hero-buttons" {...ctaProps} />
            </RevealItem>
          </RevealGroup>

          <Reveal className="hero-visual" onMount variants={pop}>
            <div className="hero-visual-placeholder">
              <div className="hero-mockup-card">
                <div className="mockup-header">
                  <TrendingUp size={20} />
                  <span>StockPulse</span>
                </div>
                <div className="mockup-value">$7,298.98</div>
                <div className="mockup-change positive">+3.42%</div>
                <div className="mockup-chart">
                  <svg viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 45 Q25 40 50 35 T100 20 T150 25 T200 10" stroke="var(--success)" strokeWidth="2" fill="none" />
                    <path d="M0 45 Q25 40 50 35 T100 20 T150 25 T200 10 V60 H0 Z" fill="url(#chartGrad)" opacity="0.15" />
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--success)" />
                        <stop offset="100%" stopColor="var(--success)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Value Prop Section */}
      <section className="value-section">
        <RevealGroup className="value-content" gap={0.05}>
          <RevealItem as="h2" className="section-title">
            Your Money,{' '}
            <span className="title-typewriter">
              <RotatingWord words={ROTATING_WORDS} />
            </span>
          </RevealItem>
          <RevealItem as="p" className="section-subtitle">
            Track all your investments in one place. Real-time prices, beautiful charts,
            and insights that help you make smarter financial decisions.
          </RevealItem>
          <RevealItem>
            <a href="#features" className="btn-landing btn-landing--secondary">
              Learn more
              <ArrowRight size={18} />
            </a>
          </RevealItem>
        </RevealGroup>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="features-container">
          <Reveal className="features-header">
            <h2 className="section-title-sm">
              Everything you need to{' '}
              <br />
              grow your wealth
            </h2>
            <p className="section-subtitle-sm">
              Powerful features designed to give you complete control and visibility over your investments.
            </p>
          </Reveal>

          <RevealGroup className="features-grid">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <RevealItem key={title} className="feature-card" whileHover={{ y: -2 }}>
                <div className="feature-icon">
                  <Icon size={28} />
                </div>
                <h3 className="feature-title">{title}</h3>
                <p className="feature-description">{description}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-container">
          <RevealGroup className="stats-grid">
            {STATS.map((stat) => (
              <RevealItem key={stat.label} className="stat-item">
                <div className="stat-value">
                  <CountUp value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="stat-label">{stat.label}</div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <Reveal className="cta-content">
          <h2 className="cta-title">
            Show your portfolio{' '}
            <br />
            its worth
          </h2>
          <p className="cta-description">
            Join investors choosing StockPulse
            as a trusted place to track, analyze, and grow.
          </p>
          <CtaButtons rowClassName="cta-buttons" large {...ctaProps} />
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="landing-footer-new">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-brand">
              <TrendingUp size={24} />
              <span>StockPulse</span>
            </div>
            <p className="footer-copyright">
              &copy; {new Date().getFullYear()} StockPulse. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
