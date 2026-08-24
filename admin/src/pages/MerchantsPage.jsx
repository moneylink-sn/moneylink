import React, { useState, useEffect } from 'react';
import { Store, CheckCircle, Shield } from 'lucide-react';
import { API_BASE } from '../config/api';

export function MerchantsPage() {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMerchants = async () => {
      try {
        const res = await fetch(`${API_BASE}/merchants`);
        const data = await res.json();
        if (data.success) {
          setMerchants(data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMerchants();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px' }}>Gestion des Commerçants Partenaires</h1>
        <p style={{ color: '#64748b', fontSize: '13px' }}>
          Vérification des profils vendeurs, boutiques et conformité commerciale.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {merchants.map((m) => (
          <div key={m.id} className="card-table-container" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
              <img
                src={m.logo_url}
                alt={m.business_name}
                style={{ width: '50px', height: '50px', borderRadius: '12px', objectFit: 'cover' }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h3 style={{ fontSize: '16px' }}>{m.business_name}</h3>
                  {m.is_verified && <CheckCircle size={16} color="#00a86b" />}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{m.business_type} • {m.city}</div>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px', minHeight: '38px' }}>
              {m.description || 'Boutique certifiée MoneyLink Sénégal.'}
            </p>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="status-pill status-success">{m.status}</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>{m.phone}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
