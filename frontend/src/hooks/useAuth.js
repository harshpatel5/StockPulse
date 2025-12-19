import { useState, useEffect } from 'react';
import { login, register, getMe } from '../services/api';

// Initialize from localStorage synchronously to prevent flickering
const getInitialToken = () => localStorage.getItem('token');
const getInitialUser = () => {
  const saved = localStorage.getItem('user');
  return saved ? JSON.parse(saved) : null;
};

export const useAuth = () => {
  const [token, setToken] = useState(getInitialToken);
  const [user, setUser] = useState(getInitialUser);
  const [isValidating, setIsValidating] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [credentials, setCredentials] = useState({ email: '', password: '' });


  useEffect(() => {

    
    const validateToken = async () => {
      if (!token) {
        setIsValidating(false);
        return;
      }

    //   try {
    //     await getMe(); // This will throw if token is invalid
    //     setIsValidating(false);
    //   } catch (error) {
    //     // Token is invalid, logout
    //     handleLogout();
    //     setIsValidating(false);
    //   }
    // };

  //   validateToken();
  // }, []);


  try {
        // This will throw if token is expired (apiCall handles 401)
        const userData = await getMe();
        if (userData) {
          setUser(userData); // Update user data
        }
      } catch (error) {
        // Token is invalid, clear state
        handleLogout();
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, []);

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
    return data;
  };

  const handleRegister = async () => {
    await register(credentials);
    setAuthMode('login');
    setCredentials({ email: '', password: '' });
    return { success: true, message: 'Account created. Please sign in.' };
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const isAuthenticated = Boolean(token && user);

  return {
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
};