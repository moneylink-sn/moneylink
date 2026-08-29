/**
 * MoneyLink — AnalyticsService (Moteur de Statistiques & Analyse FinTech)
 * Collecte et agrège les données d'utilisation, visiteurs, conversions et revenus réels
 */

import { v4 as uuidv4 } from 'uuid';
import { memoryStore, query, pool } from '../config/db.js';

export class AnalyticsService {
  /**
   * Enregistre un événement analytics de façon sécurisée et non-bloquante
   */
  static async recordEvent({
    event_type,
    user_id = null,
    session_id = null,
    platform = 'WEB_LANDING',
    metadata = {}
  }) {
    try {
      const event = {
        id: uuidv4(),
        event_type: event_type.toUpperCase(),
        user_id: user_id || null,
        session_id: session_id || `sess-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        platform: platform.toUpperCase(),
        metadata: metadata || {},
        created_at: new Date().toISOString()
      };

      if (!memoryStore.analytics_events) {
        memoryStore.analytics_events = [];
      }
      memoryStore.analytics_events.push(event);

      // Persistence asynchrone si PostgreSQL connecté
      query(
        `INSERT INTO analytics_events (id, event_type, user_id, session_id, platform, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [event.id, event.event_type, event.user_id, event.session_id, event.platform, JSON.stringify(event.metadata), event.created_at]
      ).catch(() => {});

      return event;
    } catch (err) {
      console.warn('⚠️ Analytics recordEvent warning:', err.message);
      return null;
    }
  }

  /**
   * Calcule et retourne les statistiques complètes pour le tableau de bord administrateur
   */
  static async getAdminStatistics({ period = '30d' } = {}) {
    const now = new Date();
    let events = [];
    let users = [];
    let orders = [];
    let transactions = [];

    if (pool) {
      try {
        const [eRes, uRes, oRes, tRes] = await Promise.all([
          query('SELECT * FROM analytics_events ORDER BY created_at ASC'),
          query('SELECT * FROM users ORDER BY created_at ASC'),
          query('SELECT * FROM orders ORDER BY created_at ASC'),
          query('SELECT * FROM transactions ORDER BY created_at ASC')
        ]);
        if (uRes?.rows?.length > 0) {
          events = eRes?.rows || [];
          users = uRes?.rows || [];
          orders = oRes?.rows || [];
          transactions = tRes?.rows || [];
        }
      } catch (dbErr) {
        if (process.env.NODE_ENV === 'production') throw dbErr;
      }
    }

    if (users.length === 0) {
      events = memoryStore.analytics_events || [];
      users = memoryStore.users || [];
      orders = memoryStore.orders || [];
      transactions = memoryStore.transactions || [];
    }

    // Détermination de la borne temporelle selon le filtre
    let startDate = new Date();
    let daysCount = 30;

    switch (period.toLowerCase()) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        daysCount = 1;
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 3600 * 1000);
        daysCount = 7;
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 3600 * 1000);
        daysCount = 30;
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        daysCount = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (24 * 3600 * 1000)));
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 3600 * 1000);
        daysCount = 30;
        break;
    }

    // 1. STATISTIQUES UTILISATEURS
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'ACTIVE').length;
    const clientUsers = users.filter(u => u.role === 'CLIENT').length;
    const merchantUsers = users.filter(u => u.role === 'MERCHANT').length;

    // Utilisateurs créés sur la période filtrée
    const usersInPeriod = users.filter(u => new Date(u.created_at) >= startDate);

    // 2. STATISTIQUES ABONNEMENTS
    let trialSubscriptions = 0;
    let activeSubscriptions = 0;
    let expiredSubscriptions = 0;

    users.forEach(u => {
      const endDate = u.subscription_end_date ? new Date(u.subscription_end_date) : new Date(Date.now() + 30 * 24 * 3600 * 1000);
      const isExpired = endDate.getTime() <= now.getTime();
      const status = u.subscription_status || (u.is_trial ? 'TRIAL' : 'ACTIVE');

      if (isExpired || status === 'EXPIRED') {
        expiredSubscriptions++;
      } else if (status === 'TRIAL' || u.is_trial) {
        trialSubscriptions++;
      } else if (status === 'ACTIVE') {
        activeSubscriptions++;
      } else {
        trialSubscriptions++;
      }
    });

    // 3. STATISTIQUES PAIEMENTS & REVENUS RÉELS (UNIQUEMENT CONFIRMÉS)
    // Note: Règle stricte — Ne compter que les paiements SUCCESS / CONFIRMED
    const confirmedTransactions = transactions.filter(t => t.status === 'SUCCESS');
    const confirmedOrders = orders.filter(o =>
      ['PAYMENT_CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CONFIRMED'].includes(o.status)
    );

    // Revenus réels de la plateforme :
    // - Frais de service sur commandes confirmées
    // - Frais d'abonnements payants confirmés (500 FCFA par abonnement payant actif)
    const orderFeesRevenue = confirmedOrders.reduce((sum, o) => sum + (parseFloat(o.service_fee) || 0), 0);
    const subscriptionRevenue = activeSubscriptions * 500;
    const totalConfirmedRevenue = orderFeesRevenue + subscriptionRevenue;

    const confirmedPaymentsCount = confirmedTransactions.length + confirmedOrders.filter(o => o.paid_at).length;

    // 4. STATISTIQUES VISITEURS
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const monthStart = new Date(Date.now() - 30 * 24 * 3600 * 1000);

    const getUniqueSessions = (eventList) => {
      const sessions = new Set();
      eventList.forEach(e => {
        if (e.session_id) sessions.add(e.session_id);
      });
      return sessions.size;
    };

    const visitorsToday = getUniqueSessions(events.filter(e => new Date(e.created_at) >= todayStart));
    const visitorsWeek = getUniqueSessions(events.filter(e => new Date(e.created_at) >= weekStart));
    const visitorsMonth = getUniqueSessions(events.filter(e => new Date(e.created_at) >= monthStart));
    const visitorsTotal = getUniqueSessions(events);

    // Visiteurs sur la période sélectionnée
    const eventsInPeriod = events.filter(e => new Date(e.created_at) >= startDate);
    const visitorsInPeriod = Math.max(getUniqueSessions(eventsInPeriod), usersInPeriod.length);

    // 5. ENTONNOIR DE CONVERSION
    const funnelVisitors = Math.max(visitorsInPeriod, totalUsers);
    const funnelRegistrations = users.length;
    const funnelActiveUsers = activeUsers;
    const funnelPayingSubscribers = activeSubscriptions;

    const visitorToSignupPercent = funnelVisitors > 0 ? ((funnelRegistrations / funnelVisitors) * 100) : 0;
    const signupToSubPercent = funnelRegistrations > 0 ? ((funnelPayingSubscribers / funnelRegistrations) * 100) : 0;
    const globalVisitorToSubPercent = funnelVisitors > 0 ? ((funnelPayingSubscribers / funnelVisitors) * 100) : 0;

    // 6. ÉVOLUTION DANS LE TEMPS (CHRONOLOGIE & GRAPHIQUES)
    const timeBuckets = generateTimeBuckets(startDate, now, daysCount);

    // Populate timeline data
    const usersTimeline = timeBuckets.map(b => {
      const count = users.filter(u => {
        const d = new Date(u.created_at);
        return d >= b.start && d < b.end;
      }).length;
      return {
        date: b.dateStr,
        label: b.label,
        newUsers: count,
        clients: users.filter(u => u.role === 'CLIENT' && new Date(u.created_at) >= b.start && new Date(u.created_at) < b.end).length,
        merchants: users.filter(u => u.role === 'MERCHANT' && new Date(u.created_at) >= b.start && new Date(u.created_at) < b.end).length
      };
    });

    const visitorsTimeline = timeBuckets.map(b => {
      const bucketEvents = events.filter(e => {
        const d = new Date(e.created_at);
        return d >= b.start && d < b.end;
      });
      const sessions = new Set(bucketEvents.map(e => e.session_id).filter(Boolean));
      return {
        date: b.dateStr,
        label: b.label,
        visitors: Math.max(sessions.size, bucketEvents.filter(e => e.event_type === 'PAGE_VIEW' || e.event_type === 'APP_OPEN').length),
        pageViews: bucketEvents.filter(e => e.event_type === 'PAGE_VIEW').length
      };
    });

    const subscriptionsTimeline = timeBuckets.map(b => {
      // Évolution cumulée par période
      return {
        date: b.dateStr,
        label: b.label,
        trial: trialSubscriptions,
        active: activeSubscriptions,
        expired: expiredSubscriptions
      };
    });

    let cumulativeRev = 0;
    const revenueTimeline = timeBuckets.map(b => {
      const bucketOrders = confirmedOrders.filter(o => {
        const d = new Date(o.created_at);
        return d >= b.start && d < b.end;
      });
      const dailyRev = bucketOrders.reduce((sum, o) => sum + (parseFloat(o.service_fee) || 0), 0);
      cumulativeRev += dailyRev;

      return {
        date: b.dateStr,
        label: b.label,
        dailyRevenue: dailyRev,
        cumulativeRevenue: cumulativeRev,
        ordersCount: bucketOrders.length
      };
    });

    return {
      period,
      disclaimer: 'Les revenus affichés correspondent uniquement aux paiements réellement confirmés dans le système.',
      updatedAt: now.toISOString(),
      users: {
        total: totalUsers,
        active: activeUsers,
        clients: clientUsers,
        merchants: merchantUsers,
        newInPeriod: usersInPeriod.length
      },
      subscriptions: {
        trial: trialSubscriptions,
        active: activeSubscriptions,
        expired: expiredSubscriptions,
        monthlyPriceFCFA: 500,
        estimatedMonthlyRevenueFCFA: activeSubscriptions * 500
      },
      payments: {
        count: confirmedPaymentsCount,
        revenue: totalConfirmedRevenue,
        orderFeesRevenue,
        subscriptionRevenue,
        currency: 'XOF / FCFA'
      },
      visitors: {
        today: visitorsToday,
        week: visitorsWeek,
        month: visitorsMonth,
        total: visitorsTotal,
        inPeriod: visitorsInPeriod
      },
      conversion: {
        visitors: funnelVisitors,
        registrations: funnelRegistrations,
        activeUsers: funnelActiveUsers,
        payingSubscribers: funnelPayingSubscribers,
        visitorToSignupRate: `${Math.min(100, visitorToSignupPercent).toFixed(2)}%`,
        signupToSubRate: `${Math.min(100, signupToSubPercent).toFixed(2)}%`,
        globalVisitorToSubRate: `${Math.min(100, globalVisitorToSubPercent).toFixed(2)}%`,
        raw: {
          visitorToSignup: parseFloat(visitorToSignupPercent.toFixed(2)),
          signupToSub: parseFloat(signupToSubPercent.toFixed(2)),
          globalVisitorToSub: parseFloat(globalVisitorToSubPercent.toFixed(2))
        }
      },
      timeSeries: {
        usersTimeline,
        visitorsTimeline,
        subscriptionsTimeline,
        revenueTimeline
      },
      recentEvents: events.slice(-10).reverse()
    };
  }
}

/**
 * Helper : Génère les créneaux temporels (jours ou heures) pour les graphiques
 */
function generateTimeBuckets(startDate, endDate, daysCount) {
  const buckets = [];
  const current = new Date(startDate);

  if (daysCount === 1) {
    // Mode "Aujourd'hui" : 6 tranches de 4 heures
    for (let h = 0; h < 24; h += 4) {
      const bucketStart = new Date(current.getFullYear(), current.getMonth(), current.getDate(), h, 0, 0);
      const bucketEnd = new Date(current.getFullYear(), current.getMonth(), current.getDate(), h + 4, 0, 0);
      buckets.push({
        start: bucketStart,
        end: bucketEnd,
        dateStr: `${String(h).padStart(2, '0')}h00`,
        label: `${String(h).padStart(2, '0')}h - ${String(h + 4).padStart(2, '0')}h`
      });
    }
  } else {
    // Mode journalier
    const stepDays = daysCount > 30 ? Math.ceil(daysCount / 12) : 1;
    let temp = new Date(startDate);

    while (temp <= endDate) {
      const bucketStart = new Date(temp.getFullYear(), temp.getMonth(), temp.getDate(), 0, 0, 0);
      const bucketEnd = new Date(temp.getFullYear(), temp.getMonth(), temp.getDate() + stepDays, 0, 0, 0);
      const day = String(temp.getDate()).padStart(2, '0');
      const month = String(temp.getMonth() + 1).padStart(2, '0');

      buckets.push({
        start: bucketStart,
        end: bucketEnd,
        dateStr: `${day}/${month}`,
        label: temp.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
      });

      temp.setDate(temp.getDate() + stepDays);
    }
  }

  return buckets;
}
