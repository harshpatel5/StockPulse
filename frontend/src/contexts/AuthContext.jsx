import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { login, register, getMe } from '../services/api';
import { dedupeRequest } from '../utils/requestDeduplication';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const hasValidatedRef = useRef(false);
  const validationRequestedRef = useRef(false);

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    hasValidatedRef.current = false;
  };

  // Allow components to request auth validation when needed
  const triggerValidation = () => {
    if (!validationRequestedRef.current) {
      validationRequestedRef.current = true;
      setIsValidating(true);
    }
  };

  // Validate stored token and fetch user data from backend
  useEffect(() => {
    if (!isValidating || hasValidatedRef.current) return;
    hasValidatedRef.current = true;
    
    let isMounted = true;
    
    const validateToken = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (!storedToken) {
        if (isMounted) {
          setIsValidating(false);
        }
        return;
      }

      try {
        // Check if token has expired before hitting the backend
        const payload = JSON.parse(atob(storedToken.split('.')[1]));
        const expiryTime = payload.exp * 1000;
        const isExpired = expiryTime <= Date.now();
        
        if (isExpired) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (isMounted) {
            setIsValidating(false);
          }
          return;
        }

        // Token is valid, confirm with backend and get current user data
        const userData = await dedupeRequest('auth:validate', () => getMe());
        if (isMounted && userData) {
          setToken(storedToken);
          setUser(userData);
        }
      } catch (error) {
        // Invalid token or network error - clear storage and logout
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (isMounted) {
          setToken(null);
          setUser(null);
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
  }, [isValidating]);

  // Auto logout when token expires
  useEffect(() => {
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = payload.exp * 1000; 
      const timeLeft = expiryTime - Date.now();

      if (timeLeft <= 0) {
        handleLogout();
        return;
      }

      // Set timer to logout when token expires
      const timer = setTimeout(() => {
        handleLogout();
        window.location.href = '/login?reason=expired';
      }, timeLeft);

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
    triggerValidation,
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