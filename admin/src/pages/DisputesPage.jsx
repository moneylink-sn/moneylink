import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, RotateCcw, Eye } from 'lucide-react';
import { DisputeModal } from '../components/DisputeModal';
import { API_BASE } from '../config/api';

export function DisputesPage() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState(null);

  const fetchDisputes = async () => {
    try {
      const token = localStorage.getItem('moneylink_admin_token');
      const res = await fetch(`${API_BASE}/admin/disputes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDisputes(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const handleResolve = async (id, resolution, notes) => {
    try {
      const token = localStorage.getItem('moneylink_admin_token');
      const res = await fetch(`${API_BASE}/admin/disputes/${id}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ resolution, notes })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedDispute(null);
        fetchDisputes();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px' }}>Gestion des Litiges & Remboursements</h1>
        <p style={{ color: '#64748b', fontSize: '13px' }}>
          Examinez les réclamations acheteurs/vendeurs et tranchez en toute impartialité.
        </p>
      </div>

      <div className="card-table-container">
        <div className="table-header">
          <h3 style={{ fontSize: '16px' }}>Registre des Litiges & Arbitrages</h3>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>Commande</th>
              <th>Acheteur</th>
              <th>Commerçant</th>
              <th>Motif</th>
              <th>Montant en Jeu</th>
              <th>Statut</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>
                  Chargement des litiges...
                </td>
              </tr>
            ) : disputes.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Aucun litige enregistré.
                </td>
              </tr>
            ) : (
              disputes.map((d) => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 600 }}>#{d.order?.order_number || d.order_id}</td>
                  <td>{d.buyer_name}</td>
                  <td>{d.merchant_name}</td>
                  <td>
                    <span style={{ fontWeight: 600, color: '#b91c1c' }}>{d.reason}</span>
                    <div style={{ fontSize: '12px', color: '#64748b', maxWidth: '280px' }}>{d.description}</div>
                  </td>
                  <td style={{ fontWeight: 700, color: '#00a86b' }}>
                    {(d.order?.total_amount || 0).toLocaleString('fr-FR')} FCFA
                  </td>
                  <td>
                    <span
                      className={`status-pill ${
                        d.status === 'REFUNDED_BUYER'
                          ? 'status-info'
                          : d.status === 'RELEASED_MERCHANT'
                          ? 'status-success'
                          : 'status-danger'
                      }`}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td>
                    {d.status === 'OPENED' || d.status === 'IN_INVESTIGATION' ? (
                      <button
                        className="btn btn-danger"
                        style={{ padding: '6px 12px', fontSize: '11px' }}
                        onClick={() => setSelectedDispute(d)}
                      >
                        Arbitrer
                      </button>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Dossier clôturé</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedDispute && (
        <DisputeModal
          dispute={selectedDispute}
          onClose={() => setSelectedDispute(null)}
          onResolve={handleResolve}
        />
      )}
    </div>
  );
}
