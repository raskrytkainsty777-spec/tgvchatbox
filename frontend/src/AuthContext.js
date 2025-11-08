import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // Check for token in URL (for regular users)
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      
      if (urlToken) {
        // User with token in URL - login via token
        try {
          const response = await axios.get(`${API}/auth/token/${urlToken}`);
          setUser(response.data);
          localStorage.setItem('access_token', response.data.access_token);
          // Remove token from URL
          window.history.replaceState({}, document.title, window.location.pathname);
          setLoading(false);
          return;
        } catch (error) {
          console.error('Token login failed:', error);
          // Continue to check localStorage
        }
      }
      
      // Check if user is logged in from localStorage
      const token = localStorage.getItem('access_token');
      if (token) {
        // Validate token and load user
        try {
          const response = await axios.get(`${API}/auth/token/${token}`);
          setUser(response.data);
          setLoading(false);
          return;
        } catch (error) {
          localStorage.removeItem('access_token');
        }
      }
      
      // Auto-login as admin (default behavior)
      try {
        const response = await axios.post(`${API}/auth/login`, { 
          username: 'admin', 
          password: 'admin123' 
        });
        setUser(response.data);
        localStorage.setItem('access_token', response.data.access_token);
        setLoading(false);
      } catch (error) {
        console.error('Admin auto-login failed:', error);
        setLoading(false);
      }
    };
    
    initAuth();
  }, []);

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { username, password });
      const userData = response.data;
      setUser(userData);
      localStorage.setItem('access_token', userData.access_token);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Неверный логин или пароль' };
    }
  };

  const loginByToken = async (token) => {
    try {
      const response = await axios.get(`${API}/auth/token/${token}`);
      const userData = response.data;
      setUser(userData);
      localStorage.setItem('access_token', userData.access_token);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Неверный токен' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('access_token');
  };

  const isAdmin = () => {
    return user && user.role === 'admin';
  };

  const value = {
    user,
    loading,
    login,
    loginByToken,
    logout,
    isAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
