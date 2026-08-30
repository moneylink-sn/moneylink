import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  UserCheck,
  UserPlus,
  Store,
  ShoppingBag,
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
  DollarSign,
  ShieldCheck,
  MessageCircle,
  ShoppingCart,
  AlertTriangle,
  Clock,
  Compass,
  Laptop,
  Tablet,
  Radio,
  Flame
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { API_BASE } from '../config/api';

export function StatisticsPage() {
  const [period, setPeriod] = useState('30d');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(30); // 0 (off), 15, 30, 60
  const [activeChartTab, setActiveChartTab] = useState('all'); // all, visitors, revenue, orders, products, whatsapp
  const [activeProductTab, setActiveProductTab] = useState('views'); // views, cart, whatsapp, orders, revenue
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
      console.error('Erreur lors du chargement des statistiques réelles :', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatistics(true);
  }, [period]);

  // Actualisation automatique configurable
  useEffect(() => {
    if (autoRefreshInterval > 0) {
      autoRefreshTimerRef.current = setInterval(() => {
        fetchStatistics(false);
      }, autoRefreshInterval * 1000);
    }
    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
      }
    };
  }, [autoRefreshInterval, period]);

  // Export CSV complet et multi-sections
  const handleExportCSV = () => {
    if (!stats) return;

    const overview = stats.overview?.kpis || {};
    const visitors = stats.visitors || {};
    const timeline = stats.evolution?.timeline || [];
    const funnel = stats.conversion?.funnel || [];
    const products = stats.products || {};
    const devices = stats.devices?.devices || [];
    const sources = stats.sources?.sources || [];
    const nowStr = new Date().toISOString().slice(0, 10);

    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += '=== TABLEAU DE BORD DE PILOTAGE MONEYLINK (DONNÉES RÉELLES) ===\r\n';
    csvContent += `Date d'exportation;${new Date().toLocaleString('fr-FR')}\r\n`;
    csvContent += `Période sélectionnée;${period}\r\n`;
    csvContent += `Avertissement financier;${stats.disclaimer}\r\n\r\n`;

    csvContent += '--- 1. INDICATEURS CLÉS (KPIS GLOBAUX) ---\r\n';
    csvContent += 'Indicateur;Valeur;Variation vs période précédente;Unité\r\n';
    csvContent += `Visiteurs;${overview.visitors?.value || 0};${overview.visitors?.change || '0%'};Visiteurs uniques\r\n`;
    csvContent += `Clients;${overview.clients?.value || 0};${overview.clients?.change || '0%'};Comptes\r\n`;
    csvContent += `Marchands;${overview.merchants?.value || 0};${overview.merchants?.change || '0%'};Boutiques\r\n`;
    csvContent += `Produits Actifs;${overview.products?.value || 0};-;Articles\r\n`;
    csvContent += `Commandes Période;${overview.orders?.value || 0};${overview.orders?.change || '0%'};Commandes\r\n`;
    csvContent += `Chiffre d'Affaires Réel;${overview.revenue?.value || 0};${overview.revenue?.change || '0%'};FCFA\r\n`;
    csvContent += `Séquestre Verrouillé;${overview.escrowLocked?.value || 0};-;FCFA\r\n`;
    csvContent += `Commissions Réelles;${overview.commissions?.value || 0};-;FCFA\r\n`;
    csvContent += `Clics WhatsApp;${overview.whatsappClicks?.value || 0};${overview.whatsappClicks?.change || '0%'};Interactions\r\n`;
    csvContent += `Ajouts au Panier;${overview.carts?.value || 0};${overview.carts?.change || '0%'};Paniers\r\n`;
    csvContent += `Litiges;${overview.disputes?.value || 0};${overview.disputes?.change || '0%'};Dossiers\r\n\r\n`;

    csvContent += '--- 2. ANALYSE VISITEURS DÉTAILLÉE ---\r\n';
    csvContent += `Visiteurs Aujourd'hui;${visitors.today || 0}\r\n`;
    csvContent += `Visiteurs Hier;${visitors.yesterday || 0}\r\n`;
    csvContent += `Visiteurs 7 Jours;${visitors.sevenDays || 0}\r\n`;
    csvContent += `Visiteurs 30 Jours;${visitors.thirtyDays || 0}\r\n`;
    csvContent += `Visiteurs 90 Jours;${visitors.ninetyDays || 0}\r\n`;
    csvContent += `Visiteurs Cette Année;${visitors.year || 0}\r\n`;
    csvContent += `Visiteurs Uniques Total;${visitors.uniqueVisitors || 0}\r\n`;
    csvContent += `Sessions Totales;${visitors.sessions || 0}\r\n`;
    csvContent += `Pages Vues Totales;${visitors.pageViews || 0}\r\n`;
    csvContent += `Visiteurs Actifs en Direct (5 min);${visitors.activeVisitors || 0}\r\n\r\n`;

    csvContent += '--- 3. ENTONNOIR DE CONVERSION RÉEL ---\r\n';
    csvContent += 'Étape;Effectif;Taux de conversion étape;Taux de conversion global;Taux d\'abandon\r\n';
    funnel.forEach(step => {
      csvContent += `${step.name};${step.count};${step.stepConversionRate};${step.globalConversionRate};${step.dropoffRate}\r\n`;
    });
    csvContent += `\r\nTaux de Conversion Final Global;${stats.conversion?.globalConversionRate || '0%'}\r\n\r\n`;

    csvContent += '--- 4. ÉVOLUTION TEMPORELLE ---\r\n';
    csvContent += 'Date/Heure;Visiteurs;Nouveaux Utilisateurs;Commandes;Chiffre d\'Affaires (FCFA);Vues Produits;Clics WhatsApp\r\n';
    timeline.forEach(t => {
      csvContent += `${t.label};${t.visitors || 0};${t.newUsers || 0};${t.orders || 0};${t.revenue || 0};${t.productViews || 0};${t.whatsappClicks || 0}\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `moneylink_analytics_${period}_${nowStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !stats) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center' }}>
        <RefreshCw className="animate-spin" size={40} color="#00a86b" style={{ margin: '0 auto 18px' }} />
        <h3 style={{ fontSize: '20px', color: '#0f172a', fontWeight: 700 }}>Extraction des données réelles PostgreSQL...</h3>
        <p style={{ color: '#64748b', fontSize: '14px', marginTop: '6px' }}>
          Calcul en temps réel des visiteurs uniques, conversions, paniers et flux financiers confirmés.
        </p>
      </div>
    );
  }

  const kpis = stats?.overview?.kpis || {};
  const visitors = stats?.visitors || {};
  const timeline = stats?.evolution?.timeline || [];
  const funnel = stats?.conversion?.funnel || [];
  const products = stats?.products || {};
  const devices = stats?.devices || {};
  const sources = stats?.sources || {};
  const realtime = stats?.realtime?.events || [];
  const pages = stats?.pages || {};
  const geography = stats?.geography || {};

  // Données maximales pour le scaling des graphiques SVG
  const maxVisitors = Math.max(1, ...timeline.map(t => t.visitors || 0));
  const maxRevenue = Math.max(1, ...timeline.map(t => t.revenue || 0));
  const maxOrders = Math.max(1, ...timeline.map(t => t.orders || 0));
  const maxProductViews = Math.max(1, ...timeline.map(t => t.productViews || 0));
  const maxWaClicks = Math.max(1, ...timeline.map(t => t.whatsappClicks || 0));

  return (
    <div className="analytics-cockpit">
      {/* 1. EN-TÊTE PRINCIPAL & BARRE DE CONTRÔLE */}
      <div className="stats-header-bar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '32px' }}>📊</span>
            <div>
              <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
                Console Analytics &amp; Pilotage FinTech
              </h1>
              <p style={{ color: '#64748b', fontSize: '13.5px', marginTop: '4px', margin: 0 }}>
                Données 100% réelles issues de PostgreSQL — Visiteurs, interactions WhatsApp, conversions et chiffre d'affaires.
              </p>
            </div>
          </div>
        </div>

        <div className="stats-actions">
          {/* Sélecteur de période */}
          <div className="period-filters">
            {[
              { id: 'today', label: "Aujourd'hui" },
              { id: 'yesterday', label: 'Hier' },
              { id: '7d', label: '7 jours' },
              { id: '30d', label: '30 jours' },
              { id: '90d', label: '90 jours' },
              { id: 'year', label: 'Cette année' }
            ].map(tab => (
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
            style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            <span>Actualiser</span>
          </button>

          {/* Bouton Exporter CSV */}
          <button
            className="btn btn-primary"
            onClick={handleExportCSV}
            style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={15} />
            <span>Exporter CSV</span>
          </button>
        </div>
      </div>

      {/* 2. BARRE D'ÉTAT TEMPS RÉEL & VISITEURS ACTIFS */}
      <div className="stats-meta-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Badge Visiteurs Actifs en Direct */}
          <div className="live-active-badge">
            <span className="live-pulse-dot"></span>
            <span style={{ fontWeight: 700, color: '#007a4d' }}>
              {visitors.activeVisitors || 0}
            </span>
            <span style={{ color: '#007a4d' }}>visiteur{(visitors.activeVisitors || 0) > 1 ? 's' : ''} actuellement en direct</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b' }}>
            <span>•</span>
            <span>Dernière synchro : <strong>{lastUpdated || 'En cours...'}</strong></span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', cursor: 'pointer' }}>
            <Clock size={14} />
            <span>Auto-refresh :</span>
            <select
              value={autoRefreshInterval}
              onChange={e => setAutoRefreshInterval(parseInt(e.target.value, 10))}
              style={{
                fontSize: '12px',
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#FFFFFF',
                color: '#0f172a'
              }}
            >
              <option value={0}>Désactivé</option>
              <option value={15}>Toutes les 15s</option>
              <option value={30}>Toutes les 30s</option>
              <option value={60}>Toutes les 60s</option>
            </select>
          </label>
        </div>
      </div>

      {/* 3. LES 11 KPIS PRINCIPAUX AVEC VARIATION DE PÉRIODE */}
      <div className="kpi-section-title">
        <h3>Indicateurs Clés de Performance (KPIs)</h3>
        <span className="kpi-section-subtitle">Comparaison automatique avec la période précédente équivalente</span>
      </div>

      <div className="stat-grid-11">
        {/* 1. Visiteurs */}
        <StatCard
          title="👥 Visiteurs"
          value={(kpis.visitors?.value || 0).toLocaleString('fr-FR')}
          subtitle={`${kpis.visitors?.change || '0%'} vs précédente`}
          icon={Users}
          color="#3b82f6"
          bgColor="#dbeafe"
        />

        {/* 2. Clients */}
        <StatCard
          title="👤 Clients"
          value={(kpis.clients?.value || 0).toLocaleString('fr-FR')}
          subtitle={`+${kpis.clients?.newInPeriod || 0} nouveaux`}
          icon={UserPlus}
          color="#10b981"
          bgColor="#dcfce7"
        />

        {/* 3. Marchands */}
        <StatCard
          title="🏪 Marchands"
          value={(kpis.merchants?.value || 0).toLocaleString('fr-FR')}
          subtitle={`+${kpis.merchants?.newInPeriod || 0} nouveaux`}
          icon={Store}
          color="#f59e0b"
          bgColor="#fef3c7"
        />

        {/* 4. Produits */}
        <StatCard
          title="🛍️ Produits"
          value={(kpis.products?.value || 0).toLocaleString('fr-FR')}
          subtitle="Articles en ligne"
          icon={ShoppingBag}
          color="#8b5cf6"
          bgColor="#ede9fe"
        />

        {/* 5. Commandes */}
        <StatCard
          title="📦 Commandes"
          value={(kpis.orders?.value || 0).toLocaleString('fr-FR')}
          subtitle={`${kpis.orders?.change || '0%'} (${kpis.orders?.totalAllTime || 0} au total)`}
          icon={TrendingUp}
          color="#00a86b"
          bgColor="#e8f8f2"
        />

        {/* 6. Chiffre d'affaires */}
        <StatCard
          title="💰 Chiffre d'Affaires"
          value={`${(kpis.revenue?.value || 0).toLocaleString('fr-FR')} FCFA`}
          subtitle={`${kpis.revenue?.change || '0%'} confirmés`}
          icon={DollarSign}
          color="#00a86b"
          bgColor="#e8f8f2"
        />

        {/* 7. Séquestre */}
        <StatCard
          title="🔐 Séquestre"
          value={`${(kpis.escrowLocked?.value || 0).toLocaleString('fr-FR')} FCFA`}
          subtitle={`${kpis.escrowLocked?.count || 0} colis en cours`}
          icon={ShieldCheck}
          color="#2563eb"
          bgColor="#eff6ff"
        />

        {/* 8. Commissions */}
        <StatCard
          title="💳 Commissions"
          value={`${(kpis.commissions?.value || 0).toLocaleString('fr-FR')} FCFA`}
          subtitle="Revenus plateforme réels"
          icon={CreditCard}
          color="#059669"
          bgColor="#ecfdf5"
        />

        {/* 9. Clics WhatsApp */}
        <StatCard
          title="💬 Clics WhatsApp"
          value={(kpis.whatsappClicks?.value || 0).toLocaleString('fr-FR')}
          subtitle={`${kpis.whatsappClicks?.change || '0%'} vs précédente`}
          icon={MessageCircle}
          color="#25D366"
          bgColor="#e6f9ed"
        />

        {/* 10. Paniers */}
        <StatCard
          title="🛒 Paniers"
          value={(kpis.carts?.value || 0).toLocaleString('fr-FR')}
          subtitle={`${kpis.carts?.change || '0%'} ajouts`}
          icon={ShoppingCart}
          color="#6366f1"
          bgColor="#e0e7ff"
        />

        {/* 11. Litiges */}
        <StatCard
          title="⚠️ Litiges"
          value={(kpis.disputes?.value || 0).toLocaleString('fr-FR')}
          subtitle={`${kpis.disputes?.openCount || 0} en cours d'arbitrage`}
          icon={AlertTriangle}
          color="#ef4444"
          bgColor="#fee2e2"
        />
      </div>

      {/* 4. SECTION VISITEURS APPROFONDIE */}
      <div className="analytics-card" style={{ marginTop: '24px' }}>
        <div className="analytics-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Eye size={20} color="#3b82f6" />
            <h3 style={{ fontSize: '17px', margin: 0, fontWeight: 700 }}>Analyse Détaillée des Visiteurs Réels</h3>
          </div>
          <span className="badge badge-emerald">100% PostgreSQL Events</span>
        </div>

        <div className="visitors-deep-grid">
          <div className="visitor-metric-box">
            <span className="visitor-metric-label">Aujourd'hui</span>
            <span className="visitor-metric-value">{(visitors.today || 0).toLocaleString('fr-FR')}</span>
            <span className="visitor-metric-sub">visiteurs uniques</span>
          </div>

          <div className="visitor-metric-box">
            <span className="visitor-metric-label">Hier</span>
            <span className="visitor-metric-value">{(visitors.yesterday || 0).toLocaleString('fr-FR')}</span>
            <span className="visitor-metric-sub">visiteurs uniques</span>
          </div>

          <div className="visitor-metric-box">
            <span className="visitor-metric-label">7 Jours</span>
            <span className="visitor-metric-value">{(visitors.sevenDays || 0).toLocaleString('fr-FR')}</span>
            <span className="visitor-metric-sub">visiteurs uniques</span>
          </div>

          <div className="visitor-metric-box">
            <span className="visitor-metric-label">30 Jours</span>
            <span className="visitor-metric-value">{(visitors.thirtyDays || 0).toLocaleString('fr-FR')}</span>
            <span className="visitor-metric-sub">visiteurs uniques</span>
          </div>

          <div className="visitor-metric-box">
            <span className="visitor-metric-label">90 Jours</span>
            <span className="visitor-metric-value">{(visitors.ninetyDays || 0).toLocaleString('fr-FR')}</span>
            <span className="visitor-metric-sub">visiteurs uniques</span>
          </div>

          <div className="visitor-metric-box">
            <span className="visitor-metric-label">Cette Année</span>
            <span className="visitor-metric-value">{(visitors.year || 0).toLocaleString('fr-FR')}</span>
            <span className="visitor-metric-sub">visiteurs uniques</span>
          </div>

          <div className="visitor-metric-box highlight">
            <span className="visitor-metric-label">Total Unique</span>
            <span className="visitor-metric-value">{(visitors.uniqueVisitors || 0).toLocaleString('fr-FR')}</span>
            <span className="visitor-metric-sub">visiteurs uniques cumulés</span>
          </div>

          <div className="visitor-metric-box">
            <span className="visitor-metric-label">Sessions</span>
            <span className="visitor-metric-value">{(visitors.sessions || 0).toLocaleString('fr-FR')}</span>
            <span className="visitor-metric-sub">sessions de navigation</span>
          </div>

          <div className="visitor-metric-box">
            <span className="visitor-metric-label">Pages Vues</span>
            <span className="visitor-metric-value">{(visitors.pageViews || 0).toLocaleString('fr-FR')}</span>
            <span className="visitor-metric-sub">pages &amp; produits vus</span>
          </div>

          <div className="visitor-metric-box active-pulse">
            <span className="visitor-metric-label">Actifs Direct</span>
            <span className="visitor-metric-value live-text">{(visitors.activeVisitors || 0).toLocaleString('fr-FR')}</span>
            <span className="visitor-metric-sub">dernières 5 min</span>
          </div>
        </div>
      </div>

      {/* 5. GRAPHIQUES D'ÉVOLUTION DYNAMIQUE */}
      <div className="analytics-card" style={{ marginTop: '24px' }}>
        <div className="analytics-card-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={20} color="#00a86b" />
              <h3 style={{ fontSize: '17px', margin: 0, fontWeight: 700 }}>Évolution Temporelle</h3>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748b' }}>
              Chronologie réelle par jour ou tranche horaire ({period})
            </p>
          </div>

          <div className="chart-tabs">
            {[
              { id: 'all', label: 'Tout Afficher' },
              { id: 'visitors', label: '👥 Visiteurs' },
              { id: 'revenue', label: '💰 CA (FCFA)' },
              { id: 'orders', label: '📦 Commandes' },
              { id: 'products', label: '👁️ Vues Produits' },
              { id: 'whatsapp', label: '💬 Clics WhatsApp' }
            ].map(tab => (
              <button
                key={tab.id}
                className={`chart-tab-btn ${activeChartTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveChartTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rendu Graphique SVG Interactif */}
        <div className="chart-container-box">
          {timeline.length === 0 ? (
            <div className="empty-chart-state">
              <span>📭</span>
              <h4>Aucune donnée temporelle sur cette période</h4>
              <p>Les données s'afficheront au fur et à mesure des visites et transactions réelles.</p>
            </div>
          ) : (
            <div className="interactive-svg-chart">
              <svg viewBox={`0 0 ${Math.max(600, timeline.length * 50)} 220`} className="chart-svg">
                {/* Lignes de repère */}
                <line x1="0" y1="30" x2="100%" y2="30" stroke="#f1f5f9" strokeDasharray="4" />
                <line x1="0" y1="80" x2="100%" y2="80" stroke="#f1f5f9" strokeDasharray="4" />
                <line x1="0" y1="130" x2="100%" y2="130" stroke="#f1f5f9" strokeDasharray="4" />
                <line x1="0" y1="180" x2="100%" y2="180" stroke="#f1f5f9" strokeDasharray="4" />

                {/* Barres et Points */}
                {timeline.map((point, index) => {
                  const stepX = (Math.max(600, timeline.length * 50) - 60) / Math.max(1, timeline.length - 1);
                  const x = 30 + index * stepX;
                  
                  // Hauteurs normalisées (0 - 150px)
                  const vHeight = ((point.visitors || 0) / maxVisitors) * 140;
                  const oHeight = ((point.orders || 0) / maxOrders) * 140;
                  const rHeight = ((point.revenue || 0) / maxRevenue) * 140;
                  const pHeight = ((point.productViews || 0) / maxProductViews) * 140;
                  const wHeight = ((point.whatsappClicks || 0) / maxWaClicks) * 140;

                  return (
                    <g
                      key={index}
                      className="chart-col-group"
                      onMouseEnter={() => setHoveredPoint(point)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    >
                      {/* Ligne repère verticale au survol */}
                      <line x1={x} y1="20" x2={x} y2="180" stroke="#e2e8f0" strokeWidth="1" opacity="0.6" />

                      {/* Barres selon l'onglet actif */}
                      {(activeChartTab === 'all' || activeChartTab === 'visitors') && (
                        <rect
                          x={x - 8}
                          y={180 - vHeight}
                          width="7"
                          height={Math.max(2, vHeight)}
                          rx="3"
                          fill="#3b82f6"
                          opacity="0.85"
                        />
                      )}

                      {(activeChartTab === 'all' || activeChartTab === 'whatsapp') && (
                        <rect
                          x={x + 1}
                          y={180 - wHeight}
                          width="7"
                          height={Math.max(2, wHeight)}
                          rx="3"
                          fill="#25D366"
                          opacity="0.85"
                        />
                      )}

                      {(activeChartTab === 'all' || activeChartTab === 'orders') && (
                        <circle
                          cx={x}
                          cy={180 - oHeight}
                          r="4"
                          fill="#f59e0b"
                        />
                      )}

                      {(activeChartTab === 'revenue') && (
                        <rect
                          x={x - 10}
                          y={180 - rHeight}
                          width="20"
                          height={Math.max(2, rHeight)}
                          rx="4"
                          fill="#00a86b"
                        />
                      )}

                      {(activeChartTab === 'products') && (
                        <rect
                          x={x - 8}
                          y={180 - pHeight}
                          width="16"
                          height={Math.max(2, pHeight)}
                          rx="4"
                          fill="#8b5cf6"
                        />
                      )}

                      {/* Libellé axe X */}
                      <text
                        x={x}
                        y="202"
                        textAnchor="middle"
                        fontSize="10.5"
                        fill="#64748b"
                        fontWeight="600"
                      >
                        {point.date}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Infobulle de survol (Tooltip) */}
              {hoveredPoint && (
                <div className="chart-tooltip">
                  <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '6px', color: '#0f172a' }}>
                    📅 {hoveredPoint.label}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px' }}>
                    <div>👥 Visiteurs : <strong>{hoveredPoint.visitors || 0}</strong></div>
                    <div>👤 Inscriptions : <strong>{hoveredPoint.newUsers || 0}</strong></div>
                    <div>📦 Commandes : <strong>{hoveredPoint.orders || 0}</strong></div>
                    <div>💰 CA : <strong>{(hoveredPoint.revenue || 0).toLocaleString('fr-FR')} FCFA</strong></div>
                    <div>👁️ Vues Articles : <strong>{hoveredPoint.productViews || 0}</strong></div>
                    <div>💬 Clics WhatsApp : <strong>{hoveredPoint.whatsappClicks || 0}</strong></div>
                  </div>
                </div>
              )}

              {/* Légende du graphique */}
              <div className="chart-legend">
                <span className="legend-item"><span className="legend-dot" style={{ background: '#3b82f6' }}></span> Visiteurs</span>
                <span className="legend-item"><span className="legend-dot" style={{ background: '#25D366' }}></span> Clics WhatsApp</span>
                <span className="legend-item"><span className="legend-dot" style={{ background: '#f59e0b' }}></span> Commandes</span>
                <span className="legend-item"><span className="legend-dot" style={{ background: '#00a86b' }}></span> Chiffre d'Affaires</span>
                <span className="legend-item"><span className="legend-dot" style={{ background: '#8b5cf6' }}></span> Vues Produits</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6. ENTONNOIR DE CONVERSION RÉEL (CONVERSION FUNNEL) */}
      <div className="analytics-card" style={{ marginTop: '24px' }}>
        <div className="analytics-card-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={20} color="#6366f1" />
              <h3 style={{ fontSize: '17px', margin: 0, fontWeight: 700 }}>Entonnoir de Conversion Réel</h3>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748b' }}>
              Parcours visiteur complet de la découverte à la livraison finale
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Taux Global Final :</span>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#00a86b' }}>
              {stats?.conversion?.globalConversionRate || '0%'}
            </div>
          </div>
        </div>

        <div className="funnel-container">
          {funnel.map((step, index) => {
            return (
              <div key={step.id} className="funnel-step-card">
                <div className="funnel-step-header">
                  <span className="funnel-step-index">{index + 1}</span>
                  <span className="funnel-step-name">{step.name}</span>
                </div>

                <div className="funnel-step-value">
                  {(step.count || 0).toLocaleString('fr-FR')}
                </div>

                <div className="funnel-step-rates">
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Étape : <strong>{step.stepConversionRate}</strong>
                  </div>
                  <div style={{ fontSize: '11px', color: '#00a86b', fontWeight: 700 }}>
                    Global : {step.globalConversionRate}
                  </div>
                </div>

                {index < funnel.length - 1 && (
                  <div className="funnel-arrow">
                    <ArrowRight size={16} color="#94a3b8" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 7. PALMARÈS & CLASSEMENTS DES PRODUITS RÉELS */}
      <div className="analytics-card" style={{ marginTop: '24px' }}>
        <div className="analytics-card-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingBag size={20} color="#f59e0b" />
              <h3 style={{ fontSize: '17px', margin: 0, fontWeight: 700 }}>Classements &amp; Performance Produits</h3>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748b' }}>
              Palmarès réel calculé sur les consultations, ajouts paniers, interactions WhatsApp et commandes
            </p>
          </div>

          <div className="chart-tabs">
            {[
              { id: 'views', label: '🏆 Plus Consultés' },
              { id: 'cart', label: '🛒 Ajouts Panier' },
              { id: 'whatsapp', label: '💬 Clics WhatsApp' },
              { id: 'orders', label: '📦 Plus Commandés' },
              { id: 'revenue', label: '💰 Top CA' }
            ].map(tab => (
              <button
                key={tab.id}
                className={`chart-tab-btn ${activeProductTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveProductTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="products-ranking-table-wrap">
          {(() => {
            let list = [];
            let valueLabel = 'Consultations';
            let valKey = 'viewsCount';

            switch (activeProductTab) {
              case 'cart':
                list = products.mostAddedToCart || [];
                valueLabel = 'Ajouts Panier';
                valKey = 'cartAddsCount';
                break;
              case 'whatsapp':
                list = products.mostWhatsAppClicks || [];
                valueLabel = 'Clics WhatsApp';
                valKey = 'whatsappClicksCount';
                break;
              case 'orders':
                list = products.mostOrdered || [];
                valueLabel = 'Commandes';
                valKey = 'ordersCount';
                break;
              case 'revenue':
                list = products.topRevenue || [];
                valueLabel = 'Chiffre d\'Affaires';
                valKey = 'revenueFCFA';
                break;
              default:
                list = products.mostViewed || [];
                valueLabel = 'Consultations';
                valKey = 'viewsCount';
                break;
            }

            if (list.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  <span>📦</span>
                  <p style={{ fontSize: '13.5px', marginTop: '6px' }}>Aucun produit dans ce classement pour la période sélectionnée.</p>
                </div>
              );
            }

            return (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>Rang</th>
                    <th>Produit</th>
                    <th>Catégorie</th>
                    <th>Prix Unitaire</th>
                    <th style={{ textAlign: 'right' }}>{valueLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td style={{ fontWeight: 800, color: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#64748b' }}>
                        #{idx + 1} {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : ''}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {item.image_url ? (
                            <img src={item.image_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🛍️</div>
                          )}
                          <span style={{ fontWeight: 600 }}>{item.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={{ background: '#f1f5f9', color: '#475569' }}>
                          {item.category || 'Général'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: '#00a86b' }}>
                        {(item.price || 0).toLocaleString('fr-FR')} FCFA
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                        {item.formattedValue || (item[valKey] || 0).toLocaleString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </div>
      </div>

      {/* 8. SOURCES DE TRAFIC & APPAREILS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
        {/* Sources de Trafic */}
        <div className="analytics-card">
          <div className="analytics-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={20} color="#2563eb" />
              <h3 style={{ fontSize: '17px', margin: 0, fontWeight: 700 }}>Sources de Trafic</h3>
            </div>
            <span style={{ fontSize: '12px', color: '#64748b' }}>UTM &amp; Référents</span>
          </div>

          <div style={{ padding: '16px 0' }}>
            {(sources.sources || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '13px' }}>
                Aucune source enregistrée.
              </div>
            ) : (
              (sources.sources || []).map((src) => (
                <div key={src.name} className="share-row">
                  <div className="share-info">
                    <span style={{ fontWeight: 600, fontSize: '13.5px' }}>{src.name}</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{src.count} visites ({src.percent}%)</span>
                  </div>
                  <div className="share-progress-bg">
                    <div className="share-progress-fill" style={{ width: `${src.percent}%`, background: '#2563eb' }}></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Répartition Appareils & OS */}
        <div className="analytics-card">
          <div className="analytics-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Smartphone size={20} color="#8b5cf6" />
              <h3 style={{ fontSize: '17px', margin: 0, fontWeight: 700 }}>Appareils &amp; Systèmes d'Exploitation</h3>
            </div>
            <span style={{ fontSize: '12px', color: '#64748b' }}>User-Agent réel</span>
          </div>

          <div style={{ padding: '16px 0' }}>
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '13px', color: '#475569', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Types d'Appareils
              </h4>
              {(devices.devices || []).map((dev) => (
                <div key={dev.name} className="share-row">
                  <div className="share-info">
                    <span style={{ fontWeight: 600, fontSize: '13.5px' }}>
                      {dev.name === 'MOBILE' ? '📱 Mobile' : dev.name === 'TABLET' ? '📟 Tablette' : '💻 Desktop'}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{dev.count} ({dev.percent}%)</span>
                  </div>
                  <div className="share-progress-bg">
                    <div className="share-progress-fill" style={{ width: `${dev.percent}%`, background: '#8b5cf6' }}></div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h4 style={{ fontSize: '13px', color: '#475569', margin: '14px 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Systèmes d'Exploitation (OS)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {(devices.os || []).map((osItem) => (
                  <div key={osItem.name} className="os-badge-item">
                    <span style={{ fontWeight: 600 }}>{osItem.name}</span>
                    <span style={{ color: '#64748b', fontSize: '11.5px' }}>{osItem.percent}% ({osItem.count})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 9. GÉOGRAPHIE, PAGES POPULAIRES & 🔥 ACTIVITÉ EN DIRECT */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
        {/* Performance Pages & Navigation */}
        <div className="analytics-card">
          <div className="analytics-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass size={20} color="#00a86b" />
              <h3 style={{ fontSize: '17px', margin: 0, fontWeight: 700 }}>Pages Populaires &amp; Navigation</h3>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Rebond : <strong>{pages.bounceRate || '0%'}</strong>
            </div>
          </div>

          <div style={{ padding: '10px 0' }}>
            {(pages.topPages || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '13px' }}>
                Aucune page enregistrée pour cette période.
              </div>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Page / URL</th>
                    <th style={{ textAlign: 'right' }}>Vues</th>
                    <th style={{ textAlign: 'right' }}>Visiteurs</th>
                  </tr>
                </thead>
                <tbody>
                  {(pages.topPages || []).map((p, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600, fontSize: '13px' }}>{p.url || '/'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#00a86b' }}>{p.views || 0}</td>
                      <td style={{ textAlign: 'right', color: '#64748b' }}>{p.uniqueVisitors || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 🔥 ACTIVITÉ EN DIRECT (REALTIME STREAM) */}
        <div className="analytics-card">
          <div className="analytics-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flame size={20} color="#ef4444" />
              <h3 style={{ fontSize: '17px', margin: 0, fontWeight: 700 }}>Activité en Direct 🔥</h3>
            </div>
            <span className="live-pulse-badge">Flux temps réel</span>
          </div>

          <div className="live-stream-box">
            {realtime.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: '13px' }}>
                En attente des premiers événements en direct...
              </div>
            ) : (
              realtime.map((ev) => (
                <div key={ev.id} className="live-event-item">
                  <div className="live-event-icon">{ev.icon || '⚡'}</div>
                  <div className="live-event-content">
                    <div className="live-event-title">{ev.title}</div>
                    <div className="live-event-time">
                      {new Date(ev.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • {ev.platform || 'WEB'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 10. BANNIÈRE TRANSPARENCE FINANCIÈRE */}
      <div className="stats-alert-banner" style={{ marginTop: '28px' }}>
        <Info size={20} color="#00a86b" style={{ flexShrink: 0 }} />
        <div>
          <strong style={{ color: '#007a4d', fontSize: '13px' }}>Transparence Financière &amp; Intégrité FinTech :</strong>{' '}
          <span style={{ fontSize: '13px', color: '#334155' }}>
            {stats?.disclaimer || "Les revenus affichés correspondent uniquement aux paiements réellement confirmés dans le système."}
            &nbsp;Toutes les statistiques sont calculées dynamiquement depuis la base PostgreSQL de production sans aucune valeur fictive ou simulée.
          </span>
        </div>
      </div>
    </div>
  );
}
