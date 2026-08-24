import React, { createContext, useContext, useState, useEffect } from 'react';

import { API_BASE } from '../config/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [adminUser, setAdminUser] = useState(() => {
    const saved = localStorage.getItem('moneylink_admin_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('moneylink_admin_token'));
  const [loading, setLoading] = useState(false);

  const login = async (identifier, password) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();

      if (data.success && data.data) {
        if (data.data.user.role !== 'ADMIN') {
          throw new Error('Accès réservé aux administrateurs autorisés.');
        }

        setAdminUser(data.data.user);
        setToken(data.data.token);
        localStorage.setItem('moneylink_admin_user', JSON.stringify(data.data.user));
        localStorage.setItem('moneylink_admin_token', data.data.token);
        setLoading(false);
        return { success: true };
      } else {
        setLoading(false);
        return { success: false, error: data.error || 'Identifiants invalides' };
      }
    } catch (err) {
      setLoading(false);
      return { success: false, error: err.message };
    }
  };

  const logout = () => {
    setAdminUser(null);
    setToken(null);
    localStorage.removeItem('moneylink_admin_user');
    localStorage.removeItem('moneylink_admin_token');
  };

  return (
    <AuthContext.Provider value={{ adminUser, token, login, logout, loading, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
