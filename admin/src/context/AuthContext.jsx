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

      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        throw new Error(`Réponse inattendue du serveur API (HTTP ${res.status}).`);
      }

      if (data.success && data.data) {
        const user = data.data.user;
        const isSuperAdminId = user.id === 'a0000000-0000-0000-0000-000000000001';
        const isSuperAdminEmail = user.email && user.email.toLowerCase() === 'admin@moneylink.sn';
        const isSuperAdminPhone = user.phone && user.phone.includes('770000001');

        if (user.role !== 'ADMIN' || (!isSuperAdminId && !isSuperAdminEmail && !isSuperAdminPhone)) {
          throw new Error('Accès strictement interdit. La console d’administration est réservée au Super Administrateur (Codé Samb).');
        }

        setAdminUser(user);
        setToken(data.data.token);
        localStorage.setItem('moneylink_admin_user', JSON.stringify(user));
        localStorage.setItem('moneylink_admin_token', data.data.token);
        setLoading(false);
        return { success: true };
      } else {
        setLoading(false);
        return { success: false, error: data.error || 'Identifiants invalides' };
      }
    } catch (err) {
      setLoading(false);
      let message = err.message;
      if (message === 'Failed to fetch' || message.includes('fetch')) {
        message = `Impossible de contacter le serveur API (${API_BASE}). Vérifiez l'état du backend ou votre connexion réseau.`;
      }
      return { success: false, error: message };
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
