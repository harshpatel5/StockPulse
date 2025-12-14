import { useState } from 'react';
import { login, register } from '../services/api';

// Initialize from localStorage synchronously to prevent flickering
const getInitialToken = () => localStorage.getItem('token');
const getInitialUser = () => {
  const saved = localStorage.getItem('user');
  return saved ? JSON.parse(saved) : null;
};

export const useAuth = () => {
  const [token, setToken] = useState(getInitialToken);
  const [user, setUser] = useState(getInitialUser);
  const [authMode, setAuthMode] = useState('login');
  const [credentials, setCredentials] = useState({ email: '', password: '' });

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
  };
};

