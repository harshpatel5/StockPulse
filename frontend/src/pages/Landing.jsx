import { Link, Navigate } from 'react-router-dom';
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
import { useAuth } from '../hooks/useAuth';
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
  const { isAuthenticated } = useAuth();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

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
      description: "Beautiful visualizations of your entire portfolio with real-time allocation charts."
    },
    {
      icon: <BarChart3 size={28} />,
      title: "Live Market Data",
      description: "Real-time stock prices powered by professional-grade market data APIs."
    },
    {
      icon: <Shield size={28} />,
      title: "Bank-Level Security",
      description: "Your data is encrypted with industry-standard protocols. We never sell your information."
    },
    {
      icon: <Zap size={28} />,
      title: "Lightning Fast",
      description: "Instant updates and seamless experience across all your devices."
    },
    {
      icon: <Globe size={28} />,
      title: "Global Markets",
      description: "Track stocks, ETFs, crypto, and more from markets around the world."
    },
    {
      icon: <TrendingUp size={28} />,
      title: "Smart Insights",
      description: "Track your performance over time with historical data and trend analysis."
    }
  ];

  const stats = [
    { value: 10000, suffix: '+', label: 'Active Users' },
    { value: 50, suffix: 'M+', label: 'Assets Tracked' },
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
            <span className="hero-badge">✨ The smarter way to track your wealth</span>
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
