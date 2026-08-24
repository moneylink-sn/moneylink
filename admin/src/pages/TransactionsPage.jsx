import React, { useState, useEffect } from 'react';
import { CreditCard } from 'lucide-react';
import { API_BASE } from '../config/api';

export function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const token = localStorage.getItem('moneylink_admin_token');
        const res = await fetch(`${API_BASE}/admin/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data.recentTransactions) {
          setTransactions(data.data.recentTransactions);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px' }}>Journal Financier & Grand Livre (Ledger)</h1>
        <p style={{ color: '#64748b', fontSize: '13px' }}>
          Traçabilité intégrale de tous les mouvements : Verrouillages Séquestre, Déblocages, Rechargements et Remboursements.
        </p>
      </div>

      <div className="card-table-container">
        <div className="table-header">
          <h3 style={{ fontSize: '16px' }}>Historique des Flux Financiers</h3>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>Référence</th>
              <th>Type d'Opération</th>
              <th>Montant</th>
              <th>Frais (1%)</th>
              <th>Moyen de Paiement</th>
              <th>Statut</th>
              <th>Horodatage</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>
                  Chargement des transactions...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Aucune transaction enregistrée.
                </td>
              </tr>
            ) : (
              transactions.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{t.reference}</td>
                  <td>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{t.type}</span>
                  </td>
                  <td style={{ fontWeight: 700, color: '#00a86b' }}>
                    {(t.amount || 0).toLocaleString('fr-FR')} FCFA
                  </td>
                  <td style={{ color: '#64748b' }}>
                    {(t.fee || 0).toLocaleString('fr-FR')} FCFA
                  </td>
                  <td>
                    <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, backgroundColor: '#f1f5f9' }}>
                      {t.payment_method}
                    </span>
                  </td>
                  <td>
                    <span className="status-pill status-success">{t.status}</span>
                  </td>
                  <td style={{ fontSize: '12px', color: '#64748b' }}>
                    {new Date(t.created_at).toLocaleString('fr-FR')}
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
