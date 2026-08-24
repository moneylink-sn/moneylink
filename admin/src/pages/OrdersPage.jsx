import React, { useState, useEffect } from 'react';
import { ShoppingBag, Search } from 'lucide-react';
import { API_BASE } from '../config/api';

export function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem('moneylink_admin_token');
        const res = await fetch(`${API_BASE}/admin/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data.recentOrders) {
          setOrders(data.data.recentOrders);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px' }}>Supervision des Commandes & Séquestres</h1>
        <p style={{ color: '#64748b', fontSize: '13px' }}>
          Suivi temps réel du cycle de vie des fonds : séquestration, expédition, code OTP et déblocage.
        </p>
      </div>

      <div className="card-table-container">
        <div className="table-header">
          <h3 style={{ fontSize: '16px' }}>Toutes les Commandes</h3>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>Numéro</th>
              <th>Acheteur</th>
              <th>Marchand</th>
              <th>Montant Total</th>
              <th>Séquestre</th>
              <th>Statut</th>
              <th>Adresse Livraison</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px' }}>
                  Chargement des commandes...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Aucune commande enregistrée.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 700 }}>#{o.order_number}</td>
                  <td>{o.buyer_name || 'Client'}</td>
                  <td>{o.merchant_name || 'Marchand'}</td>
                  <td style={{ fontWeight: 700, color: '#00a86b' }}>
                    {(o.total_amount || 0).toLocaleString('fr-FR')} FCFA
                  </td>
                  <td style={{ fontWeight: 600, color: '#3b82f6' }}>
                    {(o.escrow_amount || 0).toLocaleString('fr-FR')} FCFA
                  </td>
                  <td>
                    <span
                      className={`status-pill ${
                        o.status === 'CONFIRMED'
                          ? 'status-success'
                          : o.status === 'DISPUTED'
                          ? 'status-danger'
                          : 'status-warning'
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px', color: '#64748b' }}>{o.delivery_address}</td>
                  <td style={{ fontSize: '12px', color: '#64748b' }}>
                    {new Date(o.created_at).toLocaleDateString('fr-FR')}
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
