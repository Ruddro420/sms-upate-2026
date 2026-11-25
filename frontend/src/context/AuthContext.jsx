import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest, clearStoredAuth, getStoredToken, setStoredAuth } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [schoolSettings, setSchoolSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    try {
      const data = await apiRequest('/api/public/overview', { skipAuth: true });
      setSchoolSettings(data.settings);
    } catch {
      // ignore if backend not reachable yet
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadSettings();
      const token = getStoredToken();
      if (token) {
        try {
          const data = await apiRequest('/api/auth/me');
          setUser(data.user);
        } catch {
          clearStoredAuth();
          setUser(null);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const login = async (username, password) => {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify({ username, password }),
    });
    setStoredAuth(data.token, data.user);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    clearStoredAuth();
    setUser(null);
  };

  const refreshMe = async () => {
    const data = await apiRequest('/api/auth/me');
    setUser(data.user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        schoolSettings,
        setSchoolSettings,
        refreshSettings: loadSettings,
        loading,
        login,
        logout,
        refreshMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
