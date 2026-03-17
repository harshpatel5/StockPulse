import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
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
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: "easeOut" }
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
      description: "Beautiful visualizations of your entire portfolio with real-time allocation charts."
    },
    {
      icon: <BarChart3 size={28} />,
      title: "Historical Tracking",
      description: "30-day performance history with forward-filling for seamless trend analysis."
    },
    {
      icon: <TrendingUp size={28} />,
      title: "Benchmark Comparison",
      description: "Compare your portfolio performance against the S&P 500 index."
    },
    {
      icon: <Shield size={28} />,
      title: "Live Price Updates",
      description: "Real-time prices from Finnhub and CoinGecko with 60-second smart caching."
    },
    {
      icon: <Zap size={28} />,
      title: "Lightning Fast",
      description: "Parallel API fetching and in-memory caching for instant page loads."
    },
    {
      icon: <Globe size={28} />,
      title: "Multi-Asset Support",
      description: "Track stocks, ETFs, and cryptocurrencies all in one unified dashboard."
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
      <section className="hero-section">
        <div className="hero-content">
          <motion.div
            className="hero-text"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="hero-title">
              Better than{' '}
              <br />
              your broker
            </h1>
            <p className="hero-description">
              Get the most out of your investments with smart tracking,
              beautiful analytics, and insights to build long-term wealth.
            </p>
            <div className="hero-buttons">
              <Link to="/login" className="btn-primary-landing">
                Get started
              </Link>
            </div>
          </motion.div>

          <motion.div
            className="hero-visual"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
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
                    <path d="M0 45 Q25 40 50 35 T100 20 T150 25 T200 10" stroke="#486635" strokeWidth="2" fill="none" />
                    <path d="M0 45 Q25 40 50 35 T100 20 T150 25 T200 10 V60 H0 Z" fill="url(#chartGrad)" opacity="0.15" />
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#486635" />
                        <stop offset="100%" stopColor="#486635" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Value Prop Section */}
      <section className="value-section">
        <div className="value-content">
          <motion.h2
            className="section-title"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Your Money,{' '}
            <span className="title-typewriter">
              <TypeWriter words={['Simplified', 'Visualized', 'Optimized']} />
            </span>
          </motion.h2>
          <motion.p
            className="section-subtitle"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Track all your investments in one place. Real-time prices, beautiful charts,
            and insights that help you make smarter financial decisions.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <a href="#features" className="btn-secondary-landing">
              Learn more
              <ArrowRight size={18} />
            </a>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="features-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="features-header"
          >
            <h2 className="section-title-sm">
              Everything you need to{' '}
              <br />
              grow your wealth
            </h2>
            <p className="section-subtitle-sm">
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
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="cta-content"
        >
          <h2 className="cta-title">
            Show your portfolio{' '}
            <br />
            its worth
          </h2>
          <p className="cta-description">
            Join investors choosing StockPulse
            as a trusted place to track, analyze, and grow.
          </p>
          <Link to="/login" className="btn-cta">
            Get started
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
            <p className="footer-copyright">&copy; 2025 StockPulse. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
