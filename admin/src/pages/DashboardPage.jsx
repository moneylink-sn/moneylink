import React, { useState, useEffect } from 'react';
import {
  Users,
  Store,
  ShoppingBag,
  CreditCard,
  AlertTriangle,
  PiggyBank,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { DisputeModal } from '../components/DisputeModal';
import { API_BASE } from '../config/api';

export function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState(null);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('moneylink_admin_token');
      const res = await fetch(`${API_BASE}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleResolveDispute = async (id, resolution, notes) => {
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
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Chargement des données en direct...</div>;
  }

  const metrics = stats?.metrics || {};

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px' }}>Tableau de Bord & Supervision FinTech</h1>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          Surveillance en temps réel des transactions sous séquestre, commandes et litiges au Sénégal (UEMOA).
        </p>
      </div>

      {/* Cartes KPIs Statistiques */}
      <div className="stat-grid">
        <StatCard
          title="Volume Transactions Total"
          value={`${(metrics.totalTransactionVolumeFCFA || 0).toLocaleString('fr-FR')} FCFA`}
          subtitle="Wave, OM & Solde interne"
          icon={TrendingUp}
          color="#00a86b"
          bgColor="#e8f8f2"
        />
        <StatCard
          title="Fonds Verrouillés en Séquestre"
          value={`${(metrics.totalEscrowLockedFCFA || 0).toLocaleString('fr-FR')} FCFA`}
          subtitle="Garantis en attente de livraison"
          icon={ShieldCheck}
          color="#3b82f6"
          bgColor="#dbeafe"
        />
        <StatCard
          title="Total Utilisateurs"
          value={metrics.usersCount || 0}
          subtitle="Clients & Acheteurs"
          icon={Users}
          color="#8b5cf6"
          bgColor="#ede9fe"
        />
        <StatCard
          title="Commerçants Partenaires"
          value={metrics.merchantsCount || 0}
          subtitle="Boutiques actives"
          icon={Store}
          color="#f59e0b"
          bgColor="#fef3c7"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '28px' }}>
        {/* Commandes Récentes */}
        <div className="card-table-container">
          <div className="table-header">
            <div>
              <h3 style={{ fontSize: '16px' }}>Dernières Commandes Séquestrées</h3>
              <p style={{ fontSize: '12px', color: '#64748b' }}>Flux de livraison en cours</p>
            </div>
          </div>

          <table className="custom-table">
            <thead>
              <tr>
                <th>Commande</th>
                <th>Montant</th>
                <th>Statut</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.recentOrders || []).map((order) => (
                <tr key={order.id}>
                  <td style={{ fontWeight: 600 }}>#{order.order_number}</td>
                  <td style={{ fontWeight: 700, color: '#00a86b' }}>
                    {(order.total_amount || 0).toLocaleString('fr-FR')} FCFA
                  </td>
                  <td>
                    <span
                      className={`status-pill ${
                        order.status === 'CONFIRMED'
                          ? 'status-success'
                          : order.status === 'DISPUTED'
                          ? 'status-danger'
                          : 'status-warning'
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px', color: '#64748b' }}>
                    {new Date(order.created_at).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Litiges en attente d'arbitrage */}
        <div className="card-table-container">
          <div className="table-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle color="#ef4444" size={18} />
              <h3 style={{ fontSize: '16px' }}>Litiges en Attente</h3>
            </div>
          </div>

          <div style={{ padding: '16px' }}>
            {(stats?.pendingDisputes || []).length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', padding: '20px' }}>
                Aucun litige ouvert actuellement. Tous les séquestres sont réguliers.
              </div>
            ) : (
              (stats?.pendingDisputes || []).map((dispute) => (
                <div
                  key={dispute.id}
                  style={{
                    padding: '14px',
                    borderRadius: '12px',
                    border: '1px solid #fee2e2',
                    backgroundColor: '#fff5f5',
                    marginBottom: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#991b1b' }}>
                      {dispute.reason}
                    </span>
                    <span className="status-pill status-danger" style={{ fontSize: '10px' }}>
                      ACTION REQUISE
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#4b5563', marginBottom: '10px' }}>
                    {dispute.description}
                  </p>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '6px 12px', fontSize: '12px', width: '100%' }}
                    onClick={() => setSelectedDispute(dispute)}
                  >
                    Arbitrer le litige
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal d'arbitrage */}
      {selectedDispute && (
        <DisputeModal
          dispute={selectedDispute}
          onClose={() => setSelectedDispute(null)}
          onResolve={handleResolveDispute}
        />
      )}
    </div>
  );
}
