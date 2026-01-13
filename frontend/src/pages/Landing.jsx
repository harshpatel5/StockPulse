import { Link } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion, useScroll, useTransform } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { 
  TrendingUp, 
  PieChart, 
  Shield, 
  BarChart3, 
  Zap, 
  Globe,
  ArrowRight,
  ChevronDown
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import './Landing.css';

// Animated counter component
const AnimatedCounter = ({ target, duration = 2, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    
    let start = 0;
    const increment = target / (duration * 60);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);

    return () => clearInterval(timer);
  }, [isVisible, target, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

// Typewriter effect
const TypeWriter = ({ words }) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const word = words[currentWordIndex];
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        setCurrentText(word.substring(0, currentText.length + 1));
        if (currentText === word) {
          setTimeout(() => setIsDeleting(true), 1500);
        }
      } else {
        setCurrentText(word.substring(0, currentText.length - 1));
        if (currentText === '') {
          setIsDeleting(false);
          setCurrentWordIndex((prev) => (prev + 1) % words.length);
        }
      }
    }, isDeleting ? 50 : 100);

    return () => clearTimeout(timeout);
  }, [currentText, isDeleting, currentWordIndex, words]);

  return (
    <span>
      {currentText}
      <span className="typewriter-cursor">|</span>
    </span>
  );
};

const Landing = () => {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: "easeOut" }
  };

  const staggerContainer = {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const features = [
    {
      icon: <PieChart size={28} />,
      title: "Portfolio Analytics",
      description: "Beautiful visualizations of your entire portfolio with real-time allocation charts.",
      image: "allocation"
    },
    {
      icon: <BarChart3 size={28} />,
      title: "Historical Tracking",
      description: "30-day performance history with forward-filling for seamless trend analysis.",
      image: "history"
    },
    {
      icon: <TrendingUp size={28} />,
      title: "Benchmark Comparison",
      description: "Compare your portfolio performance against the S&P 500 index.",
      image: "benchmark"
    },
    {
      icon: <Shield size={28} />,
      title: "Live Price Updates",
      description: "Real-time prices from Finnhub and CoinGecko with 60-second smart caching.",
      image: "holdings"
    },
    {
      icon: <Zap size={28} />,
      title: "Lightning Fast",
      description: "Parallel API fetching and in-memory caching for instant page loads.",
      image: null
    },
    {
      icon: <Globe size={28} />,
      title: "Multi-Asset Support",
      description: "Track stocks, ETFs, and cryptocurrencies all in one unified dashboard.",
      image: "add-asset"
    }
  ];

  const stats = [
    { value: 10, suffix: '+', label: 'Active Users' },
    { value: 50, suffix: 'K+', label: 'Assets Tracked' },
    { value: 99.9, suffix: '%', label: 'Uptime' },
    { value: 4.9, suffix: '/5', label: 'User Rating' }
  ];

  return (
    <div className="landing-page">
      <Navbar />

      {/* Hero Section */}
      <section ref={heroRef} className="hero-section">
        <div className="hero-bg">
          <div className="hero-glow-1" />
          <div className="hero-glow-2" />
        </div>
        <div className="hero-grid" />

        <motion.div style={{ y, opacity }} className="hero-content">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="hero-badge">The smarter way to track your wealth</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="hero-title"
          >
            Your Money,{' '}
            <span className="hero-title-gradient">
              <TypeWriter words={['Simplified', 'Visualized', 'Optimized', 'Amplified']} />
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hero-description"
          >
            Track all your investments in one place. Real-time prices, beautiful charts, 
            and insights that help you make smarter financial decisions.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="hero-buttons"
          >
            <Link to="/login" className="btn-primary-landing">
              Start Tracking Free
              <ArrowRight size={20} />
            </Link>
            <a href="#features" className="btn-secondary-landing">
              See Features
            </a>
          </motion.div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="scroll-indicator"
        >
          <ChevronDown size={32} />
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="features-container">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="features-header"
          >
            <h2 className="features-title">
              Everything you need to{' '}
              <span className="hero-title-gradient">grow your wealth</span>
            </h2>
            <p className="features-subtitle">
              Powerful features designed to give you complete control and visibility over your investments.
            </p>
          </motion.div>

          <motion.div 
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="features-grid"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className="feature-card"
              >
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Screenshots Showcase Section */}
      <section className="showcase-section">
        <div className="showcase-container">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="showcase-header"
          >
            <h2 className="showcase-title">
              See <span className="hero-title-gradient">StockPulse</span> in Action
            </h2>
            <p className="showcase-subtitle">
              A modern, intuitive interface designed for investors who value clarity and speed.
            </p>
          </motion.div>

          {/* Dashboard Overview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="showcase-item"
          >
            <div className="showcase-content-left">
              <div className="showcase-badge">
                <PieChart size={16} />
                <span>Portfolio Dashboard</span>
              </div>
              <h3 className="showcase-item-title">Complete Portfolio Overview</h3>
              <p className="showcase-item-description">
                See your entire portfolio at a glance with three key metrics: total value, invested capital, 
                and number of assets tracked. Real-time calculations with live price updates.
              </p>
              <ul className="showcase-features-list">
                <li>✓ Live portfolio valuation</li>
                <li>✓ Net change tracking ($ and %)</li>
                <li>✓ Asset allocation breakdown</li>
              </ul>
            </div>
            <div className="showcase-image-container">
              <div className="showcase-image-wrapper">
                <img 
                  src="/docs/stats-cards.png" 
                  alt="Portfolio Stats Cards" 
                  className="showcase-image"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            </div>
          </motion.div>

          {/* Allocation Chart */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="showcase-item showcase-item-reverse"
          >
            <div className="showcase-image-container">
              <div className="showcase-image-wrapper">
                <img 
                  src="/docs/allocation-chart.png" 
                  alt="Portfolio Allocation Chart" 
                  className="showcase-image"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            </div>
            <div className="showcase-content-right">
              <div className="showcase-badge">
                <PieChart size={16} />
                <span>Asset Allocation</span>
              </div>
              <h3 className="showcase-item-title">Visual Portfolio Breakdown</h3>
              <p className="showcase-item-description">
                Interactive donut chart showing your portfolio distribution by asset. Switch between 
                viewing by individual assets or by asset type (stocks, crypto, ETFs).
              </p>
              <ul className="showcase-features-list">
                <li>✓ Color-coded asset distribution</li>
                <li>✓ Percentage allocation per asset</li>
                <li>✓ Toggle between asset/type view</li>
              </ul>
            </div>
          </motion.div>

          {/* Historical Chart */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="showcase-item"
          >
            <div className="showcase-content-left">
              <div className="showcase-badge">
                <BarChart3 size={16} />
                <span>Performance History</span>
              </div>
              <h3 className="showcase-item-title">Track Your Growth Over Time</h3>
              <p className="showcase-item-description">
                30-day historical portfolio value chart with multiple time ranges (7D, 1M, 3M, 6M, 1Y, ALL). 
                Forward-filling ensures smooth visualization even with missing data.
              </p>
              <ul className="showcase-features-list">
                <li>✓ Daily portfolio snapshots</li>
                <li>✓ Multiple time range views</li>
                <li>✓ Smooth trend visualization</li>
              </ul>
            </div>
            <div className="showcase-image-container">
              <div className="showcase-image-wrapper">
                <img 
                  src="/docs/history-chart.png" 
                  alt="Portfolio History Chart" 
                  className="showcase-image"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            </div>
          </motion.div>

          {/* Benchmark Comparison */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="showcase-item showcase-item-reverse"
          >
            <div className="showcase-image-container">
              <div className="showcase-image-wrapper">
                <img 
                  src="/docs/benchmark-chart.png" 
                  alt="Benchmark Comparison Chart" 
                  className="showcase-image"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            </div>
            <div className="showcase-content-right">
              <div className="showcase-badge">
                <TrendingUp size={16} />
                <span>Market Benchmark</span>
              </div>
              <h3 className="showcase-item-title">Outperform the Market</h3>
              <p className="showcase-item-description">
                Compare your portfolio returns against the S&P 500 index. See exactly how your stock 
                picks are performing versus the broader market benchmark.
              </p>
              <ul className="showcase-features-list">
                <li>✓ Portfolio vs S&P 500 comparison</li>
                <li>✓ Relative performance metrics</li>
                <li>✓ Normalized starting points</li>
              </ul>
            </div>
          </motion.div>

          {/* Holdings List */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="showcase-item"
          >
            <div className="showcase-content-left">
              <div className="showcase-badge">
                <Shield size={16} />
                <span>Holdings Management</span>
              </div>
              <h3 className="showcase-item-title">Detailed Asset Tracking</h3>
              <p className="showcase-item-description">
                View all your holdings with live prices, quantity, cost basis, current value, and 
                profit/loss calculations. Delete unwanted assets with a single click.
              </p>
              <ul className="showcase-features-list">
                <li>✓ Real-time price updates</li>
                <li>✓ Automatic P&L calculations</li>
                <li>✓ Easy asset management</li>
              </ul>
            </div>
            <div className="showcase-image-container">
              <div className="showcase-image-wrapper">
                <img 
                  src="/docs/holdings-list.png" 
                  alt="Holdings List" 
                  className="showcase-image"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            </div>
          </motion.div>

          {/* Add Asset Form */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="showcase-item showcase-item-reverse"
          >
            <div className="showcase-image-container">
              <div className="showcase-image-wrapper">
                <img 
                  src="/docs/add-asset.png" 
                  alt="Add Asset Form" 
                  className="showcase-image"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            </div>
            <div className="showcase-content-right">
              <div className="showcase-badge">
                <Globe size={16} />
                <span>Add Assets</span>
              </div>
              <h3 className="showcase-item-title">Simple Asset Entry</h3>
              <p className="showcase-item-description">
                Add stocks, ETFs, or cryptocurrencies in seconds. Just select the asset type, enter 
                the ticker symbol, quantity, and cost basis. StockPulse handles the rest.
              </p>
              <ul className="showcase-features-list">
                <li>Support for stocks, ETFs, crypto</li>
                <li>Clean, intuitive form</li>
                <li>Instant portfolio updates</li>
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-container">
          <motion.div 
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="stats-grid"
          >
            {stats.map((stat, index) => (
              <motion.div key={index} variants={fadeInUp} className="stat-item">
                <div className="stat-value">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </div>
                <div className="stat-label">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-bg" />
        <div className="cta-glow" />
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="cta-content"
        >
          <h2 className="cta-title">
            Ready to take control of your{' '}
            <span className="hero-title-gradient">financial future?</span>
          </h2>
          <p className="cta-description">
            Join thousands of investors who trust StockPulse to track their portfolios.
            Start free, no credit card required.
          </p>
          <Link to="/login" className="btn-cta">
            Get Started Now
            <ArrowRight size={20} />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="landing-footer-new">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-brand">
              <TrendingUp size={24} />
              <span>StockPulse</span>
            </div>
            <div className="footer-links">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Contact</a>
            </div>
            <p className="footer-copyright">© 2024 StockPulse. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
