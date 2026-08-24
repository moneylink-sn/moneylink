import React, { useState, useEffect } from 'react';
import { PiggyBank, Users } from 'lucide-react';
import { API_BASE } from '../config/api';

export function SavingsPage() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const token = localStorage.getItem('moneylink_admin_token');
        const res = await fetch(`${API_BASE}/savings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setGoals(data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchGoals();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px' }}>Supervision des Coffres & Tontines</h1>
        <p style={{ color: '#64748b', fontSize: '13px' }}>
          Suivi des fonds d’épargne individuelle et des tontines collectives communautaires.
        </p>
      </div>

      <div className="card-table-container">
        <div className="table-header">
          <h3 style={{ fontSize: '16px' }}>Coffres d'Épargne Actifs</h3>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>Nom du Coffre</th>
              <th>Type</th>
              <th>Montant Collecté</th>
              <th>Montant Cible</th>
              <th>Progression</th>
              <th>Date Cible</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>
                  Chargement des coffres...
                </td>
              </tr>
            ) : goals.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Aucun coffre d'épargne trouvé.
                </td>
              </tr>
            ) : (
              goals.map((g) => (
                <tr key={g.id}>
                  <td style={{ fontWeight: 600 }}>{g.title}</td>
                  <td>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: g.type === 'COLLECTIVE' ? '#ede9fe' : '#e8f8f2',
                        color: g.type === 'COLLECTIVE' ? '#6d28d9' : '#007a4d',
                      }}
                    >
                      {g.type === 'COLLECTIVE' ? `Tontine (${g.members_count || 1} pers)` : 'Personnel'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: '#00a86b' }}>
                    {(g.current_amount || 0).toLocaleString('fr-FR')} FCFA
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {(g.target_amount || 0).toLocaleString('fr-FR')} FCFA
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '6px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.min(100, g.progress_percent || 0)}%`,
                            height: '100%',
                            backgroundColor: '#00a86b',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 600 }}>{g.progress_percent || 0}%</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '12px', color: '#64748b' }}>{g.target_date}</td>
                  <td>
                    <span className="status-pill status-success">{g.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
