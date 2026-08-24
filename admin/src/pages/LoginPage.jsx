import React, { useState } from 'react';
import { Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const [identifier, setIdentifier] = useState('admin@moneylink.sn');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const { login, loading } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await login(identifier, password);
    if (!res.success) {
      setError(res.error || 'Identifiants administrateur invalides.');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          padding: '40px 32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
            <img
              src="/assets/moneylink_logo_mark.svg"
              alt="MoneyLink Logo"
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '20px',
                boxShadow: '0 10px 25px -5px rgba(0, 168, 107, 0.4)',
                objectFit: 'contain'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'inline-flex';
              }}
            />
            <div
              className="login-mk-badge"
              style={{
                display: 'none',
                width: '64px',
                height: '64px',
                background: 'linear-gradient(135deg, #00c48c 0%, #007a4d 100%)',
                borderRadius: '18px',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 10px 25px -5px rgba(0, 168, 107, 0.4)',
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 800,
                fontSize: '26px',
                letterSpacing: '-1px',
                border: '2px solid rgba(255, 255, 255, 0.25)',
              }}
            >
              MK
            </div>
          </div>
          <h1 style={{ fontSize: '24px', color: '#0f172a', fontWeight: 800 }}>MoneyLink Admin</h1>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            Console de Sécurité &amp; Gestionnaire FinTech
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fee2e2',
              color: '#b91c1c',
              padding: '12px',
              borderRadius: '10px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Identifiant Administrateur (Email ou Téléphone)
            </label>
            <input
              type="text"
              className="form-input"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="admin@moneylink.sn"
              required
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Mot de passe
            </label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '15px' }}
            disabled={loading}
          >
            {loading ? 'Authentification...' : (
              <>
                <span>Accéder à la console</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '28px', borderTop: '1px solid #e2e8f0', paddingTop: '20px', textAlign: 'center' }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Marché Sénégal (UEMOA) • Sécurité JWT 256 bits
          </span>
        </div>
      </div>
    </div>
  );
}
