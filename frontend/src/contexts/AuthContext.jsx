import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { login, register, getMe } from '../services/api';
import { dedupeRequest } from '../utils/requestDeduplication';

// Initialize from localStorage synchronously to prevent flickering
const getInitialToken = () => localStorage.getItem('token');
const getInitialUser = () => {
  const saved = localStorage.getItem('user');
  return saved ? JSON.parse(saved) : null;
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(getInitialToken);
  const [user, setUser] = useState(getInitialUser);
  const [isValidating, setIsValidating] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const hasValidatedRef = useRef(false);

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    hasValidatedRef.current = false;
  };

  // Validate token only once on mount
  useEffect(() => {
    // Prevent duplicate validation even with StrictMode
    if (hasValidatedRef.current) return;
    hasValidatedRef.current = true;
    
    let isMounted = true;
    const initialToken = getInitialToken();
    
    const validateToken = async () => {
      if (!initialToken) {
        if (isMounted) {
          setIsValidating(false);
        }
        return;
      }

      try {
        // Use deduplication to prevent multiple calls
        const userData = await dedupeRequest('auth:validate', () => getMe());
        if (isMounted && userData) {
          setUser(userData); // Update user data
        }
      } catch (error) {
        // Token is invalid, clear state
        if (isMounted) {
          handleLogout();
        }
      } finally {
        if (isMounted) {
          setIsValidating(false);
        }
      }
    };

    validateToken();

    return () => {
      isMounted = false;
    };
  }, []); // Only run once on mount

  useEffect(() => {
    if (!token) return;

    try {
      // Decode the JWT to find out when it expires
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = payload.exp * 1000; 
      const timeLeft = expiryTime - Date.now();

      // If it's already expired, log out immediately
      if (timeLeft <= 0) {
        handleLogout();
        return;
      }

      // Set the "Alarm Clock" for the future
      const timer = setTimeout(() => {
        console.log("Session expired!");
        handleLogout();
        window.location.href = '/login?reason=expired';
      }, timeLeft);

      // IMPORTANT: Cleanup function
      // This stops the old timer if the user logs out or gets a new token
      return () => clearTimeout(timer);
    } catch (e) {
      console.error("Error setting expiry timer", e);
    }
  }, [token]);

  const handleLogin = async () => {
    const data = await login(credentials);
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setCredentials({ email: '', password: '' });
    // Set isValidating to false since we already have user data from login
    setIsValidating(false);
    return data;
  };

  const handleRegister = async () => {
    await register(credentials);
    setAuthMode('login');
    setCredentials({ email: '', password: '' });
    return { success: true, message: 'Account created. Please sign in.' };
  };

  const isAuthenticated = Boolean(token && user);

  const value = {
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
    isValidating,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

