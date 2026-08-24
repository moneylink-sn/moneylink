import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Users
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { API_BASE } from '../config/api';

export function SubscriptionsPage() {
  const [data, setData] = useState({ stats: null, subscribers: [] });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('moneylink_admin_token');
      const res = await fetch(`${API_BASE}/subscription/admin/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Erreur chargement abonnements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const formatDate = (isoStr) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (_) {
      return isoStr;
    }
  };

  // Filtrage local
  const filteredSubscribers = (data.subscribers || []).filter((sub) => {
    if (statusFilter !== 'ALL' && sub.subscriptionStatus.toUpperCase() !== statusFilter) {
      return false;
    }
    if (roleFilter !== 'ALL' && sub.role.toUpperCase() !== roleFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        sub.fullName.toLowerCase().includes(q) ||
        sub.phone.includes(q) ||
        sub.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'TRIAL':
        return (
          <span className="badge" style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}>
            <Clock size={12} style={{ marginRight: '4px' }} />
            Essai Gratuit (30j)
          </span>
        );
      case 'ACTIVE':
        return (
          <span className="badge badge-success">
            <CheckCircle size={12} style={{ marginRight: '4px' }} />
            Actif
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="badge badge-danger">
            <AlertTriangle size={12} style={{ marginRight: '4px' }} />
            Expiré
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="badge badge-warning">
            Suspendu
          </span>
        );
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const stats = data.stats || {
    totalUsers: 0,
    trialCount: 0,
    activeCount: 0,
    expiredCount: 0,
    estimatedMonthlyRevenueFCFA: 0,
  };

  return (
    <div>
      {/* En-tête de page */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', margin: 0, color: 'var(--text-main)' }}>
            Gestion des Abonnements MoneyLink
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Règle commerciale : 1er mois gratuit (30 jours), puis <strong>500 FCFA / mois</strong> par utilisateur.
          </p>
        </div>
        <button
          className="btn"
          style={{ backgroundColor: '#ffffff', border: '1px solid var(--border-color)', gap: '8px' }}
          onClick={fetchSubscriptions}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Cartes de statistiques KPI */}
      <div className="stats-grid" style={{ marginBottom: '28px' }}>
        <StatCard
          title="Utilisateurs en Essai Gratuit"
          value={stats.trialCount}
          subtitle="30 jours offerts à l'inscription"
          icon={Clock}
          trend="Nouveaux inscrits"
          color="blue"
        />
        <StatCard
          title="Abonnements Actifs (500 F)"
          value={stats.activeCount}
          subtitle="Renouvelés via Wave & Orange Money"
          icon={CheckCircle}
          trend="Comptes payants"
          color="green"
        />
        <StatCard
          title="Abonnements Expirés"
          value={stats.expiredCount}
          subtitle="En attente de régularisation"
          icon={AlertTriangle}
          trend="Relance automatique"
          color="red"
        />
        <StatCard
          title="Revenus Mensuels Estimés"
          value={`${stats.estimatedMonthlyRevenueFCFA.toLocaleString('fr-FR')} FCFA`}
          subtitle="Tarif fixe 500 FCFA / mois"
          icon={DollarSign}
          trend="+500 FCFA / actif"
          color="purple"
        />
      </div>

      {/* Filtres & Recherche */}
      <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Recherche */}
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Rechercher par nom, téléphone, email..."
              style={{ paddingLeft: '36px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filtre Statut */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} color="var(--text-muted)" />
            <select
              className="form-input"
              style={{ width: '180px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Tous les statuts</option>
              <option value="TRIAL">Essai gratuit (30j)</option>
              <option value="ACTIVE">Actifs (Payants)</option>
              <option value="EXPIRED">Expirés</option>
              <option value="SUSPENDED">Suspendus</option>
            </select>
          </div>

          {/* Filtre Rôle */}
          <div>
            <select
              className="form-input"
              style={{ width: '160px' }}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="ALL">Tous les rôles</option>
              <option value="CLIENT">Clients</option>
              <option value="MERCHANT">Commerçants</option>
              <option value="ADMIN">Administrateurs</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tableau des Abonnés */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Téléphone</th>
                <th>Type de Compte</th>
                <th>Statut Abonnement</th>
                <th>Date Début</th>
                <th>Date Expiration</th>
                <th>Jours Restants</th>
                <th>Tarif Mensuel</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Chargement des abonnements en cours...
                  </td>
                </tr>
              ) : filteredSubscribers.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Aucun abonné ne correspond aux critères sélectionnés.
                  </td>
                </tr>
              ) : (
                filteredSubscribers.map((sub) => (
                  <tr key={sub.id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{sub.fullName}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{sub.email}</div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{sub.phone}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: sub.role === 'MERCHANT' ? '#fef3c7' : '#f1f5f9',
                          color: sub.role === 'MERCHANT' ? '#b45309' : '#475569',
                          fontWeight: 600,
                        }}
                      >
                        {sub.role === 'MERCHANT' ? 'COMMERÇANT' : sub.role === 'ADMIN' ? 'ADMIN' : 'CLIENT'}
                      </span>
                    </td>
                    <td>{getStatusBadge(sub.subscriptionStatus)}</td>
                    <td>{formatDate(sub.startDate)}</td>
                    <td>{formatDate(sub.endDate)}</td>
                    <td>
                      <span
                        style={{
                          fontWeight: 'bold',
                          color: sub.daysRemaining <= 5 ? '#ef4444' : '#10b981',
                        }}
                      >
                        {sub.daysRemaining} jour{sub.daysRemaining > 1 ? 's' : ''}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--primary-dark)' }}>
                        {sub.price} FCFA
                      </strong>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
