import React from 'react';
import { Search, Bell, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Header() {
  const { adminUser } = useAuth();

  // Affichage du profil de l'administrateur
  const displayName = adminUser?.first_name && adminUser.first_name !== 'Moustapha'
    ? `${adminUser.first_name} ${adminUser.last_name || ''}`.trim()
    : 'Codé Samb';

  const initial = displayName.charAt(0).toUpperCase() || 'C';

  return (
    <header className="admin-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '380px' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Rechercher une commande, un utilisateur, un litige, un abonnement..."
            className="form-input"
            style={{ paddingLeft: '38px', backgroundColor: '#f8fafc' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#e8f8f2',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#007a4d',
          }}
        >
          <Globe size={14} />
          <span>Sénégal (XOF)</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: '#00a86b',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '14px',
            }}
          >
            {initial}
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>{displayName}</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Administrateur</div>
          </div>
        </div>
      </div>
    </header>
  );
}
