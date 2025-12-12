import { useState, useEffect } from 'react';
import { login, register } from '../services/api';

export const useAuth = () => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [credentials, setCredentials] = useState({ email: '', password: '' });

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

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

