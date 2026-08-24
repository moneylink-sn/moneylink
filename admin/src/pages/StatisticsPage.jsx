import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  UserCheck,
  UserPlus,
  Store,
  Sparkles,
  Award,
  AlertOctagon,
  CreditCard,
  CheckCircle2,
  Eye,
  RefreshCw,
  Download,
  TrendingUp,
  Filter,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  Activity,
  Smartphone,
  Globe,
  DollarSign
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { API_BASE } from '../config/api';

export function StatisticsPage() {
  const [period, setPeriod] = useState('30d');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const autoRefreshTimerRef = useRef(null);

  const fetchStatistics = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setRefreshing(true);
    try {
      const token = localStorage.getItem('moneylink_admin_token');
      const res = await fetch(`${API_BASE}/admin/statistics?period=${period}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
        const now = new Date();
        setLastUpdated(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (err) {
      console.error('Erreur chargement statistiques :', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatistics(true);
  }, [period]);

  // Actualisation automatique toutes les 60 secondes
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshTimerRef.current = setInterval(() => {
        fetchStatistics(false);
      }, 60000);
    }
    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
      }
    };
  }, [autoRefresh, period]);

  // Fonction d'export CSV
  const handleExportCSV = () => {
    if (!stats) return;

    const u = stats.users || {};
    const s = stats.subscriptions || {};
    const p = stats.payments || {};
    const v = stats.visitors || {};
    const c = stats.conversion || {};
    const nowStr = new Date().toISOString().slice(0, 10);

    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += '=== RAPPORT STATISTIQUES MONEYLINK ===\r\n';
    csvContent += `Date d'exportation;${new Date().toLocaleString('fr-FR')}\r\n`;
    csvContent += `Période d'analyse;${period}\r\n`;
    csvContent += `Note sur les revenus;${stats.disclaimer}\r\n\r\n`;

    csvContent += '--- 1. INDICATEURS PRINCIPAUX (KPIS) ---\r\n';
    csvContent += 'Indicateur;Valeur;Unité\r\n';
    csvContent += `Total Utilisateurs;${u.total || 0};Comptes\r\n`;
    csvContent += `Utilisateurs Actifs;${u.active || 0};Comptes\r\n`;
    csvContent += `Clients;${u.clients || 0};Comptes\r\n`;
    csvContent += `Commerçants;${u.merchants || 0};Comptes\r\n`;
    csvContent += `Essais Gratuits (30j);${s.trial || 0};Abonnements\r\n`;
    csvContent += `Abonnés Payants;${s.active || 0};Abonnements\r\n`;
    csvContent += `Abonnements Expirés;${s.expired || 0};Abonnements\r\n`;
    csvContent += `Revenus Réels Confirmés;${p.revenue || 0};FCFA\r\n`;
    csvContent += `Paiements Confirmés;${p.count || 0};Transactions\r\n`;
    csvContent += `Visiteurs Période;${v.inPeriod || 0};Visiteurs uniques\r\n`;
    csvContent += `Visiteurs Total;${v.total || 0};Visiteurs uniques\r\n\r\n`;

    csvContent += '--- 2. ENTONNOIR DE CONVERSION ---\r\n';
    csvContent += 'Étape;Effectif;Taux de conversion\r\n';
    csvContent += `Visiteurs;${c.visitors || 0};100%\r\n`;
    csvContent += `Inscriptions;${c.registrations || 0};${c.visitorToSignupRate || '0%'}\r\n`;
    csvContent += `Utilisateurs Actifs;${c.activeUsers || 0};-\r\n`;
    csvContent += `Abonnés Payants;${c.payingSubscribers || 0};${c.signupToSubRate || '0%'}\r\n`;
    csvContent += `Taux Global Visiteur -> Abonné Payant;-;${c.globalVisitorToSubRate || '0%'}\r\n\r\n`;

    csvContent += '--- 3. SÉRIES TEMPORELLES (UTILISATEURS & REVENUS) ---\r\n';
    csvContent += 'Période / Date;Nouveaux Utilisateurs;Visiteurs;Revenus Journaliers (FCFA);Revenus Cumulés (FCFA)\r\n';

    const usersTimeline = stats.timeSeries?.usersTimeline || [];
    const visitorsTimeline = stats.timeSeries?.visitorsTimeline || [];
    const revenueTimeline = stats.timeSeries?.revenueTimeline || [];

    usersTimeline.forEach((item, index) => {
      const vis = visitorsTimeline[index]?.visitors || 0;
      const rev = revenueTimeline[index]?.dailyRevenue || 0;
      const cum = revenueTimeline[index]?.cumulativeRevenue || 0;
      csvContent += `${item.label};${item.newUsers || 0};${vis};${rev};${cum}\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `moneylink_statistiques_${period}_${nowStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !stats) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <RefreshCw className="animate-spin" size={36} color="#00a86b" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: '18px', color: '#0f172a' }}>Calcul des statistiques MoneyLink en temps réel...</h3>
        <p style={{ color: '#64748b', fontSize: '14px' }}>Agrégation sécurisée des utilisateurs, paiements et analytics.</p>
      </div>
    );
  }

  const u = stats?.users || {};
  const s = stats?.subscriptions || {};
  const p = stats?.payments || {};
  const v = stats?.visitors || {};
  const c = stats?.conversion || {};
  const timeSeries = stats?.timeSeries || {};

  const usersTimeline = timeSeries.usersTimeline || [];
  const visitorsTimeline = timeSeries.visitorsTimeline || [];
  const revenueTimeline = timeSeries.revenueTimeline || [];
  const subscriptionsTimeline = timeSeries.subscriptionsTimeline || [];

  return (
    <div className="statistics-page">
      {/* En-tête de la page */}
      <div className="stats-header-bar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px' }}>📊</span>
            <h1 style={{ fontSize: '26px', margin: 0 }}>Centre de Pilotage &amp; Statistiques</h1>
          </div>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
            Console d’analyse FinTech — Suivi en temps réel des utilisateurs, visiteurs, conversions et revenus réels confirmés.
          </p>
        </div>

        <div className="stats-actions">
          {/* Filtres Temporels */}
          <div className="period-filters">
            {[
              { id: 'today', label: "Aujourd'hui" },
              { id: '7d', label: '7 jours' },
              { id: '30d', label: '30 jours' },
              { id: 'year', label: 'Cette année' }
            ].map((tab) => (
              <button
                key={tab.id}
                className={`period-btn ${period === tab.id ? 'active' : ''}`}
                onClick={() => setPeriod(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Bouton Actualiser */}
          <button
            className="btn btn-outline"
            onClick={() => fetchStatistics(false)}
            disabled={refreshing}
            style={{ fontSize: '13px' }}
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            <span>Actualiser</span>
          </button>

          {/* Bouton Exporter CSV */}
          <button
            className="btn btn-primary"
            onClick={handleExportCSV}
            style={{ fontSize: '13px' }}
          >
            <Download size={15} />
            <span>Exporter CSV</span>
          </button>
        </div>
      </div>

      {/* Barre d'état d'actualisation & auto-refresh */}
      <div className="stats-meta-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b' }}>
          <span className="live-pulse-dot"></span>
          <span>Données en direct</span>
          <span>•</span>
          <span>Mis à jour à : <strong>{lastUpdated || 'En cours...'}</strong></span>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            style={{ accentColor: '#00a86b' }}
          />
          <span>Actualisation auto (60s)</span>
        </label>
      </div>

      {/* Bannière de Transparence & Règle des Revenus */}
      <div className="stats-alert-banner">
        <Info size={20} color="#00a86b" style={{ flexShrink: 0 }} />
        <div>
          <strong style={{ color: '#007a4d', fontSize: '13px' }}>Transparence Financière FinTech :</strong>{' '}
          <span style={{ fontSize: '13px', color: '#334155' }}>
            {stats?.disclaimer || "Les revenus affichés correspondent uniquement aux paiements réellement confirmés dans le système."}
            &nbsp;Les intentions de paiement ou versements en attente ne sont jamais comptabilisés comme revenus.
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. LES 10 CARTES KPIS PRINCIPALES */}
      {/* ========================================================================= */}
      <div className="stat-grid-10">
        {/* 1. Utilisateurs */}
        <StatCard
          title="Total Utilisateurs"
          value={(u.total || 0).toLocaleString('fr-FR')}
          subtitle={`+${u.newInPeriod || 0} sur la période`}
          icon={Users}
          color="#8b5cf6"
          bgColor="#ede9fe"
        />

        {/* 2. Utilisateurs Actifs */}
        <StatCard
          title="Utilisateurs Actifs"
          value={(u.active || 0).toLocaleString('fr-FR')}
          subtitle="Comptes en statut actif"
          icon={UserCheck}
          color="#10b981"
          bgColor="#dcfce7"
        />

        {/* 3. Clients */}
        <StatCard
          title="Comptes Clients"
          value={(u.clients || 0).toLocaleString('fr-FR')}
          subtitle="Acheteurs vérifiés"
          icon={UserPlus}
          color="#3b82f6"
          bgColor="#dbeafe"
        />

        {/* 4. Commerçants */}
        <StatCard
          title="Commerçants"
          value={(u.merchants || 0).toLocaleString('fr-FR')}
          subtitle="Boutiques & vendeurs"
          icon={Store}
          color="#f59e0b"
          bgColor="#fef3c7"
        />

        {/* 5. Essais Gratuits */}
        <StatCard
          title="Essais Gratuits (30j)"
          value={(s.trial || 0).toLocaleString('fr-FR')}
          subtitle="Période découverte offerte"
          icon={Sparkles}
          color="#ec4899"
          bgColor="#fce7f3"
        />

        {/* 6. Abonnés Payants */}
        <StatCard
          title="Abonnés Payants"
          value={(s.active || 0).toLocaleString('fr-FR')}
          subtitle="500 FCFA / mois"
          icon={Award}
          color="#00a86b"
          bgColor="#e8f8f2"
        />

        {/* 7. Abonnements Expirés */}
        <StatCard
          title="Abonnements Expirés"
          value={(s.expired || 0).toLocaleString('fr-FR')}
          subtitle="À renouveler via Wave / OM"
          icon={AlertOctagon}
          color="#ef4444"
          bgColor="#fee2e2"
        />

        {/* 8. Revenus Réels Confirmés */}
        <StatCard
          title="Revenus Confirmés"
          value={`${(p.revenue || 0).toLocaleString('fr-FR')} FCFA`}
          subtitle="Frais séquestre + Abonnements"
          icon={TrendingUp}
          color="#00a86b"
          bgColor="#d1fae5"
        />

        {/* 9. Paiements Confirmés */}
        <StatCard
          title="Paiements Confirmés"
          value={(p.count || 0).toLocaleString('fr-FR')}
          subtitle="Transactions SUCCESS"
          icon={CreditCard}
          color="#6366f1"
          bgColor="#e0e7ff"
        />

        {/* 10. Visiteurs */}
        <StatCard
          title="Visiteurs Enregistrés"
          value={(v.inPeriod || 0).toLocaleString('fr-FR')}
          subtitle={`${v.today || 0} aujourd'hui • ${v.month || 0} ce mois`}
          icon={Eye}
          color="#0284c7"
          bgColor="#e0f2fe"
        />
      </div>

      {/* ========================================================================= */}
      {/* 3. SECTION ENTONNOIR DE CONVERSION */}
      {/* ========================================================================= */}
      <div className="card-table-container" style={{ marginBottom: '28px' }}>
        <div className="table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>📈</span>
            <div>
              <h3 style={{ fontSize: '17px' }}>Entonnoir de Conversion FinTech</h3>
              <p style={{ fontSize: '13px', color: '#64748b' }}>
                Parcours des visiteurs depuis la découverte de MoneyLink jusqu'à l'abonnement payant.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <span className="badge-rate badge-rate-primary">
              Visiteur → Inscription : <strong>{c.visitorToSignupRate || '0.00%'}</strong>
            </span>
            <span className="badge-rate badge-rate-success">
              Inscription → Abonné Payant : <strong>{c.signupToSubRate || '0.00%'}</strong>
            </span>
            <span className="badge-rate badge-rate-gold">
              Taux Global (Visiteur → Payant) : <strong>{c.globalVisitorToSubRate || '0.00%'}</strong>
            </span>
          </div>
        </div>

        <div className="funnel-container">
          {/* Étape 1 : Visiteurs */}
          <div className="funnel-step">
            <div className="funnel-step-header">
              <div className="funnel-icon-box" style={{ background: '#e0f2fe', color: '#0284c7' }}>
                <Eye size={20} />
              </div>
              <div>
                <span className="funnel-label">1. Visiteurs Uniques</span>
                <div className="funnel-value">{(c.visitors || 0).toLocaleString('fr-FR')}</div>
              </div>
            </div>
            <div className="funnel-bar-bg">
              <div className="funnel-bar-fill" style={{ width: '100%', background: '#0284c7' }}></div>
            </div>
            <span className="funnel-sub">Base de trafic initial (100%)</span>
          </div>

          <div className="funnel-arrow">
            <ArrowRight size={22} color="#94a3b8" />
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{c.visitorToSignupRate || '0%'}</span>
          </div>

          {/* Étape 2 : Inscriptions */}
          <div className="funnel-step">
            <div className="funnel-step-header">
              <div className="funnel-icon-box" style={{ background: '#ede9fe', color: '#8b5cf6' }}>
                <UserPlus size={20} />
              </div>
              <div>
                <span className="funnel-label">2. Inscriptions Réalisées</span>
                <div className="funnel-value">{(c.registrations || 0).toLocaleString('fr-FR')}</div>
              </div>
            </div>
            <div className="funnel-bar-bg">
              <div
                className="funnel-bar-fill"
                style={{ width: `${Math.min(100, Math.max(10, c.raw?.visitorToSignup || 0))}%`, background: '#8b5cf6' }}
              ></div>
            </div>
            <span className="funnel-sub">Clients &amp; Commerçants inscrits</span>
          </div>

          <div className="funnel-arrow">
            <ArrowRight size={22} color="#94a3b8" />
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Actifs</span>
          </div>

          {/* Étape 3 : Utilisateurs Actifs */}
          <div className="funnel-step">
            <div className="funnel-step-header">
              <div className="funnel-icon-box" style={{ background: '#dcfce7', color: '#10b981' }}>
                <UserCheck size={20} />
              </div>
              <div>
                <span className="funnel-label">3. Utilisateurs Actifs</span>
                <div className="funnel-value">{(c.activeUsers || 0).toLocaleString('fr-FR')}</div>
              </div>
            </div>
            <div className="funnel-bar-bg">
              <div
                className="funnel-bar-fill"
                style={{ width: `${Math.min(100, Math.max(10, ((c.activeUsers || 0) / Math.max(1, c.registrations || 1)) * 100))}%`, background: '#10b981' }}
              ></div>
            </div>
            <span className="funnel-sub">Utilisateurs engagés et connectés</span>
          </div>

          <div className="funnel-arrow">
            <ArrowRight size={22} color="#94a3b8" />
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{c.signupToSubRate || '0%'}</span>
          </div>

          {/* Étape 4 : Abonnés Payants */}
          <div className="funnel-step">
            <div className="funnel-step-header">
              <div className="funnel-icon-box" style={{ background: '#e8f8f2', color: '#00a86b' }}>
                <Award size={20} />
              </div>
              <div>
                <span className="funnel-label">4. Abonnés Payants</span>
                <div className="funnel-value" style={{ color: '#00a86b' }}>{(c.payingSubscribers || 0).toLocaleString('fr-FR')}</div>
              </div>
            </div>
            <div className="funnel-bar-bg">
              <div
                className="funnel-bar-fill"
                style={{ width: `${Math.min(100, Math.max(10, c.raw?.signupToSub || 0))}%`, background: '#00a86b' }}
              ></div>
            </div>
            <span className="funnel-sub">Abonnements actifs (500 FCFA/m)</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. GRAPHIQUES D'ÉVOLUTION DANS LE TEMPS */}
      {/* ========================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        {/* GRAPHIQUE A : NOUVEAUX UTILISATEURS */}
        <div className="card-table-container">
          <div className="table-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} color="#8b5cf6" />
              <h3 style={{ fontSize: '16px' }}>A. Évolution des Nouveaux Utilisateurs</h3>
            </div>
            <span className="status-pill status-info" style={{ fontSize: '11px' }}>
              Période : {period}
            </span>
          </div>

          <div style={{ padding: '24px 20px' }}>
            <SimpleAreaChart
              data={usersTimeline.map((item) => ({
                label: item.label,
                value: item.newUsers || 0,
                extra: `Clients: ${item.clients || 0} • Commerçants: ${item.merchants || 0}`
              }))}
              strokeColor="#8b5cf6"
              fillColor="rgba(139, 92, 246, 0.15)"
              valueSuffix=" inscription(s)"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '12px', color: '#64748b' }}>
              <span>Total inscrits sur la période : <strong>{u.newInPeriod || 0}</strong></span>
              <span>Clients : <strong>{u.clients || 0}</strong> • Commerçants : <strong>{u.merchants || 0}</strong></span>
            </div>
          </div>
        </div>

        {/* GRAPHIQUE B : VISITEURS ET TRAFIC */}
        <div className="card-table-container">
          <div className="table-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Eye size={18} color="#0284c7" />
              <h3 style={{ fontSize: '16px' }}>B. Fréquentation &amp; Visiteurs</h3>
            </div>
            <span className="status-pill status-info" style={{ fontSize: '11px' }}>
              {v.inPeriod || 0} sessions
            </span>
          </div>

          <div style={{ padding: '24px 20px' }}>
            <SimpleBarChart
              data={visitorsTimeline.map((item) => ({
                label: item.label,
                value: item.visitors || 0,
                secondaryValue: item.pageViews || 0,
                extra: `${item.pageViews || 0} page views`
              }))}
              barColor="#0284c7"
              secondaryColor="#bae6fd"
              valueSuffix=" visiteurs"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '12px', color: '#64748b' }}>
              <span>Aujourd'hui : <strong>{v.today || 0}</strong></span>
              <span>7 derniers jours : <strong>{v.week || 0}</strong></span>
              <span>30 derniers jours : <strong>{v.month || 0}</strong></span>
            </div>
          </div>
        </div>

        {/* GRAPHIQUE C : RÉPARTITION DES ABONNEMENTS */}
        <div className="card-table-container">
          <div className="table-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="#00a86b" />
              <h3 style={{ fontSize: '16px' }}>C. Répartition des Abonnements</h3>
            </div>
            <span className="status-pill status-success" style={{ fontSize: '11px' }}>
              500 FCFA / mois
            </span>
          </div>

          <div style={{ padding: '24px 20px' }}>
            <SubscriptionDonutBreakdown
              trial={s.trial || 0}
              active={s.active || 0}
              expired={s.expired || 0}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '20px', textAlign: 'center' }}>
              <div style={{ background: '#fce7f3', padding: '10px', borderRadius: '8px' }}>
                <span style={{ fontSize: '11px', color: '#be185d', fontWeight: 600 }}>Essais Gratuits</span>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#9d174d' }}>{s.trial || 0}</div>
              </div>
              <div style={{ background: '#dcfce7', padding: '10px', borderRadius: '8px' }}>
                <span style={{ fontSize: '11px', color: '#15803d', fontWeight: 600 }}>Abonnés Payants</span>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#166534' }}>{s.active || 0}</div>
              </div>
              <div style={{ background: '#fee2e2', padding: '10px', borderRadius: '8px' }}>
                <span style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 600 }}>Expirés</span>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#991b1b' }}>{s.expired || 0}</div>
              </div>
            </div>
          </div>
        </div>

        {/* GRAPHIQUE D : REVENUS CONFIRMÉS */}
        <div className="card-table-container">
          <div className="table-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DollarSign size={18} color="#00a86b" />
              <h3 style={{ fontSize: '16px' }}>D. Évolution des Revenus Réels Confirmés</h3>
            </div>
            <span className="status-pill status-success" style={{ fontSize: '11px' }}>
              {(p.revenue || 0).toLocaleString('fr-FR')} FCFA
            </span>
          </div>

          <div style={{ padding: '24px 20px' }}>
            <SimpleAreaChart
              data={revenueTimeline.map((item) => ({
                label: item.label,
                value: item.cumulativeRevenue || 0,
                extra: `Journalier: ${(item.dailyRevenue || 0).toLocaleString('fr-FR')} FCFA (${item.ordersCount || 0} cdes)`
              }))}
              strokeColor="#00a86b"
              fillColor="rgba(0, 168, 107, 0.18)"
              valueSuffix=" FCFA"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '12px', color: '#64748b' }}>
              <span>Frais séquestre : <strong>{(p.orderFeesRevenue || 0).toLocaleString('fr-FR')} FCFA</strong></span>
              <span>Abonnements : <strong>{(p.subscriptionRevenue || 0).toLocaleString('fr-FR')} FCFA</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. DERNIERS ÉVÉNEMENTS D'ANALYTICS EN DIRECT */}
      {/* ========================================================================= */}
      <div className="card-table-container">
        <div className="table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="#00a86b" />
            <div>
              <h3 style={{ fontSize: '16px' }}>Journal des Dernières Activités &amp; Visiteurs</h3>
              <p style={{ fontSize: '12px', color: '#64748b' }}>Flux d'événements anonymisés capturés en temps réel</p>
            </div>
          </div>
          <span className="status-pill status-info" style={{ fontSize: '11px' }}>
            {(stats?.recentEvents || []).length} derniers événements
          </span>
        </div>

        <table className="custom-table">
          <thead>
            <tr>
              <th>Type d'événement</th>
              <th>Plateforme</th>
              <th>Session / Utilisateur</th>
              <th>Détails &amp; Métadonnées</th>
              <th>Date &amp; Heure</th>
            </tr>
          </thead>
          <tbody>
            {(stats?.recentEvents || []).length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: '#64748b', padding: '24px' }}>
                  Aucun événement récent enregistré.
                </td>
              </tr>
            ) : (
              (stats?.recentEvents || []).map((evt) => (
                <tr key={evt.id}>
                  <td>
                    <span
                      className={`status-pill ${
                        evt.event_type === 'PAYMENT_SUCCESS' || evt.event_type === 'SUBSCRIPTION_ACTIVATED'
                          ? 'status-success'
                          : evt.event_type === 'REGISTER' || evt.event_type === 'LOGIN'
                          ? 'status-info'
                          : 'status-warning'
                      }`}
                      style={{ fontSize: '11px' }}
                    >
                      {evt.event_type}
                    </span>
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569' }}>
                      {evt.platform === 'MOBILE_APP' ? (
                        <>
                          <Smartphone size={14} color="#8b5cf6" />
                          <span>Mobile</span>
                        </>
                      ) : evt.platform === 'WEB_ADMIN' ? (
                        <>
                          <Layers size={14} color="#00a86b" />
                          <span>Web Admin</span>
                        </>
                      ) : (
                        <>
                          <Globe size={14} color="#3b82f6" />
                          <span>Web Landing</span>
                        </>
                      )}
                    </span>
                  </td>
                  <td style={{ fontSize: '13px', fontFamily: 'monospace', color: '#64748b' }}>
                    {evt.session_id ? evt.session_id.slice(0, 16) : 'Anonyme'}
                  </td>
                  <td style={{ fontSize: '12px', color: '#475569' }}>
                    {evt.metadata?.amount
                      ? `Montant: ${evt.metadata.amount.toLocaleString('fr-FR')} FCFA (${evt.metadata.method || 'Paiement'})`
                      : evt.metadata?.path
                      ? `Page: ${evt.metadata.path}`
                      : evt.metadata?.role
                      ? `Rôle: ${evt.metadata.role}`
                      : 'Consultation standard'}
                  </td>
                  <td style={{ fontSize: '12px', color: '#64748b' }}>
                    {new Date(evt.created_at).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
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

/* ============================================================================
   COMPOSANTS GRAPHIQUES SVG NATIFS ET LÉGERS (SANS DÉPENDANCE EXTERNE)
   ============================================================================ */

/**
 * Graphique de type "Aire continue" avec lissage, dégradé et infobulles interactives
 */
function SimpleAreaChart({ data, strokeColor = '#00a86b', fillColor = 'rgba(0, 168, 107, 0.15)', valueSuffix = '' }) {
  const [tooltip, setTooltip] = useState(null);

  if (!data || data.length === 0) {
    return <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Aucune donnée temporelle</div>;
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const width = 500;
  const height = 180;
  const paddingX = 30;
  const paddingY = 25;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const points = data.map((d, index) => {
    const x = paddingX + (index / Math.max(1, data.length - 1)) * chartWidth;
    const y = height - paddingY - (d.value / maxValue) * chartHeight;
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`, '');
  const areaD = `${pathD} L ${points[points.length - 1].x},${height - paddingY} L ${points[0].x},${height - paddingY} Z`;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        <defs>
          <linearGradient id={`grad-${strokeColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.35" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Lignes de repère */}
        {[0, 0.5, 1].map((pct, i) => {
          const y = height - paddingY - pct * chartHeight;
          return (
            <g key={i}>
              <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <text x={paddingX - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8">
                {Math.round(maxValue * pct).toLocaleString('fr-FR')}
              </text>
            </g>
          );
        })}

        {/* Remplissage Aire & Ligne */}
        <path d={areaD} fill={`url(#grad-${strokeColor.replace('#', '')})`} />
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Points interactifs */}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r="4"
              fill="#ffffff"
              stroke={strokeColor}
              strokeWidth="2"
              style={{ cursor: 'pointer', transition: 'r 0.2s' }}
              onMouseEnter={() => setTooltip(p)}
              onMouseLeave={() => setTooltip(null)}
            />
          </g>
        ))}

        {/* Libellés X */}
        {points.filter((_, i) => i === 0 || i === Math.floor(points.length / 2) || i === points.length - 1).map((p, i) => (
          <text key={i} x={p.x} y={height - 5} textAnchor="middle" fontSize="10" fill="#64748b">
            {p.label}
          </text>
        ))}
      </svg>

      {/* Tooltip au survol */}
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: `${(tooltip.x / width) * 100}%`,
            top: `${(tooltip.y / height) * 100}%`,
            transform: 'translate(-50%, -120%)',
            background: '#0f172a',
            color: '#ffffff',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            pointerEvents: 'none',
            zIndex: 10
          }}
        >
          <strong>{tooltip.label}</strong> : {tooltip.value.toLocaleString('fr-FR')}{valueSuffix}
          {tooltip.extra && <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{tooltip.extra}</div>}
        </div>
      )}
    </div>
  );
}

/**
 * Histogramme / Bar Chart SVG responsive
 */
function SimpleBarChart({ data, barColor = '#0284c7', secondaryColor = '#bae6fd', valueSuffix = '' }) {
  const [tooltip, setTooltip] = useState(null);

  if (!data || data.length === 0) {
    return <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Aucune donnée</div>;
  }

  const maxValue = Math.max(...data.map(d => Math.max(d.value, d.secondaryValue || 0)), 1);
  const width = 500;
  const height = 180;
  const paddingX = 30;
  const paddingY = 25;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;
  const barWidth = Math.max(8, (chartWidth / data.length) * 0.55);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
        {/* Lignes repères */}
        {[0, 0.5, 1].map((pct, i) => {
          const y = height - paddingY - pct * chartHeight;
          return (
            <g key={i}>
              <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <text x={paddingX - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8">
                {Math.round(maxValue * pct)}
              </text>
            </g>
          );
        })}

        {/* Barres */}
        {data.map((d, index) => {
          const x = paddingX + (index / Math.max(1, data.length - 1)) * (chartWidth - barWidth);
          const barHeight = (d.value / maxValue) * chartHeight;
          const y = height - paddingY - barHeight;

          return (
            <g key={index}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(2, barHeight)}
                rx="4"
                fill={barColor}
                style={{ cursor: 'pointer', transition: 'fill 0.2s' }}
                onMouseEnter={() => setTooltip({ x: x + barWidth / 2, y, ...d })}
                onMouseLeave={() => setTooltip(null)}
              />
            </g>
          );
        })}

        {/* Libellés X */}
        {data.filter((_, i) => i === 0 || i === Math.floor(data.length / 2) || i === data.length - 1).map((d, i) => {
          const originalIndex = i === 0 ? 0 : i === 1 ? Math.floor(data.length / 2) : data.length - 1;
          const x = paddingX + (originalIndex / Math.max(1, data.length - 1)) * (chartWidth - barWidth) + barWidth / 2;
          return (
            <text key={i} x={x} y={height - 5} textAnchor="middle" fontSize="10" fill="#64748b">
              {d.label}
            </text>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: `${(tooltip.x / width) * 100}%`,
            top: `${(tooltip.y / height) * 100}%`,
            transform: 'translate(-50%, -120%)',
            background: '#0f172a',
            color: '#ffffff',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            pointerEvents: 'none',
            zIndex: 10
          }}
        >
          <strong>{tooltip.label}</strong> : {tooltip.value}{valueSuffix}
          {tooltip.extra && <div style={{ fontSize: '10px', color: '#94a3b8' }}>{tooltip.extra}</div>}
        </div>
      )}
    </div>
  );
}

/**
 * Composant de répartition circulaire (Donut) pour les abonnements
 */
function SubscriptionDonutBreakdown({ trial = 0, active = 0, expired = 0 }) {
  const total = Math.max(1, trial + active + expired);
  const trialPct = (trial / total) * 100;
  const activePct = (active / total) * 100;
  const expiredPct = (expired / total) * 100;

  // Calcul circonférence (rayon r = 50, C = 2 * PI * 50 = 314.159)
  const radius = 50;
  const circumference = 2 * Math.PI * radius;

  const activeStroke = (activePct / 100) * circumference;
  const trialStroke = (trialPct / 100) * circumference;
  const expiredStroke = (expiredPct / 100) * circumference;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px' }}>
      <div style={{ position: 'relative', width: '130px', height: '130px' }}>
        <svg viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
          {/* Fond gris */}
          <circle cx="60" cy="60" r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth="16" />

          {/* Abonnés Payants (Vert) */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="transparent"
            stroke="#00a86b"
            strokeWidth="16"
            strokeDasharray={`${activeStroke} ${circumference}`}
            strokeDashoffset="0"
          />

          {/* Essais Gratuits (Rose) */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="transparent"
            stroke="#ec4899"
            strokeWidth="16"
            strokeDasharray={`${trialStroke} ${circumference}`}
            strokeDashoffset={-activeStroke}
          />

          {/* Expirés (Rouge) */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="transparent"
            stroke="#ef4444"
            strokeWidth="16"
            strokeDasharray={`${expiredStroke} ${circumference}`}
            strokeDashoffset={-(activeStroke + trialStroke)}
          />
        </svg>

        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{trial + active + expired}</span>
          <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Comptes</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#00a86b' }}></span>
          <span style={{ color: '#334155' }}>Abonnés Actifs : <strong>{active}</strong> ({activePct.toFixed(1)}%)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ec4899' }}></span>
          <span style={{ color: '#334155' }}>Essais Gratuits : <strong>{trial}</strong> ({trialPct.toFixed(1)}%)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></span>
          <span style={{ color: '#334155' }}>Expirés : <strong>{expired}</strong> ({expiredPct.toFixed(1)}%)</span>
        </div>
      </div>
    </div>
  );
}
