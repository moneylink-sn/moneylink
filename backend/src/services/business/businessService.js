/**
 * MoneyLink V2 — Service MoneyLink Business (Espace Dédié Commerçants & Entrepreneurs)
 * Indicateurs de performance réels, ventilation temporelle, calculs statistiques stricts
 * et synthèse intelligente « 🤖 Analyse MoneyLink ».
 */

import { query, pool, memoryStore } from '../../config/db.js';
import crypto from 'crypto';

export class BusinessService {
  /**
   * Récupère ou crée le profil business d'un commerçant
   */
  static async getOrCreateProfile(userId) {
    let merchant = null;
    let businessProfile = null;

    if (pool) {
      try {
        const mRes = await query('SELECT * FROM merchants WHERE user_id = $1 LIMIT 1', [userId]);
        merchant = mRes.rows[0] || null;

        if (merchant) {
          const bpRes = await query('SELECT * FROM business_profiles WHERE user_id = $1 LIMIT 1', [userId]);
          businessProfile = bpRes.rows[0] || null;

          if (!businessProfile) {
            const newBpId = `bp_${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
            const insRes = await query(
              'INSERT INTO business_profiles (id, user_id, merchant_id, business_category, currency, monthly_target, settings) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
              [newBpId, userId, merchant.id, merchant.business_type || 'Commerce Général', 'XOF', 1000000, JSON.stringify({ notify_whatsapp: true, auto_receipt: true })]
            );
            businessProfile = insRes.rows[0];
          }
        }
      } catch (err) {
        console.warn('⚠️ Fallback memoryStore pour BusinessService.getOrCreateProfile :', err.message);
      }
    }

    if (!merchant && memoryStore.merchants) {
      merchant = memoryStore.merchants.find(m => m.user_id === userId) || null;
    }

    if (!businessProfile && memoryStore.business_profiles && merchant) {
      businessProfile = memoryStore.business_profiles.find(bp => bp.user_id === userId) || null;
      if (!businessProfile) {
        businessProfile = {
          id: `bp_${Date.now()}`,
          user_id: userId,
          merchant_id: merchant.id,
          business_category: merchant.business_type || 'Commerce Général',
          tax_id: 'NINEA-0000000',
          currency: 'XOF',
          monthly_target: 1000000,
          settings: { notify_whatsapp: true, auto_receipt: true },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        memoryStore.business_profiles.push(businessProfile);
      }
    }

    return { merchant, businessProfile };
  }

  /**
   * Calcule le Dashboard Business consolidé avec toutes les métriques de vente
   */
  static async getDashboard(userId) {
    const { merchant, businessProfile } = await this.getOrCreateProfile(userId);
    if (!merchant) {
      throw new Error('Espace Business réservé aux comptes marchands actifs.');
    }

    const merchantId = merchant.id;
    const now = new Date();

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    let orders = [];
    let invoices = [];
    let wallet = null;

    if (pool) {
      try {
        const ordRes = await query('SELECT * FROM orders WHERE merchant_id = $1 ORDER BY created_at DESC', [merchantId]);
        orders = ordRes.rows || [];

        const invRes = await query('SELECT * FROM invoices WHERE merchant_id = $1 ORDER BY created_at DESC', [merchantId]);
        invoices = invRes.rows || [];

        const wRes = await query('SELECT * FROM wallets WHERE user_id = $1 LIMIT 1', [userId]);
        wallet = wRes.rows[0] || null;
      } catch (err) {
        console.warn('⚠️ Fallback memoryStore pour BusinessService.getDashboard :', err.message);
      }
    }

    if (!orders.length && memoryStore.orders) {
      orders = memoryStore.orders.filter(o => o.merchant_id === merchantId);
    }
    if (!invoices.length && memoryStore.invoices) {
      invoices = memoryStore.invoices.filter(i => i.merchant_id === merchantId);
    }
    if (!wallet && memoryStore.wallets) {
      wallet = memoryStore.wallets.find(w => w.user_id === userId) || null;
    }

    // Calcul Chiffre d'Affaires (Commandes livrées/confirmées ou payées + Factures payées)
    let revenueToday = 0;
    let revenueThisWeek = 0;
    let revenueThisMonth = 0;
    let revenuePrevMonth = 0;
    let totalServiceFees = 0;

    const daysCount = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }; // Dimanche=0 à Samedi=6
    const dayNamesFr = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const customerOrdersMap = {};

    let completedOrdersCount = 0;
    let pendingOrdersCount = 0;
    let totalSalesVolume = 0;

    orders.forEach(o => {
      const amount = parseFloat(o.total_amount || 0);
      const fee = parseFloat(o.service_fee || 0);
      const oDate = new Date(o.created_at || now);
      const isDeliveredOrPaid = o.status === 'DELIVERED' || o.status === 'CONFIRMED' || o.status === 'PAID';

      if (isDeliveredOrPaid) {
        completedOrdersCount++;
        totalSalesVolume += amount;
        totalServiceFees += fee;

        if (oDate >= startOfToday) revenueToday += amount;
        if (oDate >= startOfWeek) revenueThisWeek += amount;
        if (oDate >= startOfMonth) revenueThisMonth += amount;
        if (oDate >= prevMonthStart && oDate <= prevMonthEnd) revenuePrevMonth += amount;

        // Comptage des jours de pointe
        const dayIndex = oDate.getDay();
        daysCount[dayIndex] = (daysCount[dayIndex] || 0) + amount;

        // Suivi récurrence clients
        if (o.buyer_id || o.delivery_phone) {
          const clientKey = o.buyer_id || o.delivery_phone;
          customerOrdersMap[clientKey] = (customerOrdersMap[clientKey] || 0) + 1;
        }
      } else if (o.status === 'PENDING_PAYMENT' || o.status === 'PAID_ESCROW_LOCKED' || o.status === 'IN_TRANSIT') {
        pendingOrdersCount++;
      }
    });

    // Intégrer également les factures payées directement
    invoices.forEach(inv => {
      if (inv.status === 'PAYÉE') {
        const invAmount = parseFloat(inv.total_amount || 0);
        const invDate = new Date(inv.created_at || now);
        if (invDate >= startOfToday) revenueToday += invAmount;
        if (invDate >= startOfWeek) revenueThisWeek += invAmount;
        if (invDate >= startOfMonth) revenueThisMonth += invAmount;
        if (invDate >= prevMonthStart && invDate <= prevMonthEnd) revenuePrevMonth += invAmount;
      }
    });

    // Panier moyen (Average Order Value)
    const avgOrderValue = completedOrdersCount > 0 ? Math.round(totalSalesVolume / completedOrdersCount) : 0;

    // Jour le plus performant
    let bestDayIndex = 6; // Samedi par défaut
    let maxDaySales = -1;
    for (let d = 0; d < 7; d++) {
      if (daysCount[d] > maxDaySales) {
        maxDaySales = daysCount[d];
        bestDayIndex = d;
      }
    }
    const bestDayName = dayNamesFr[bestDayIndex] || 'Samedi';

    // Croissance mensuelle
    let growthRatePercent = 0;
    if (revenuePrevMonth > 0) {
      growthRatePercent = Math.round(((revenueThisMonth - revenuePrevMonth) / revenuePrevMonth) * 100);
    } else if (revenueThisMonth > 0) {
      growthRatePercent = 100;
    }

    // Clients récurrents
    const recurrentCustomersCount = Object.values(customerOrdersMap).filter(count => count > 1).length;
    const totalUniqueCustomers = Object.keys(customerOrdersMap).length;

    // Génération de l'analyse intelligente IA marchande (« 🤖 Analyse MoneyLink »)
    const aiAnalysisPoints = [];
    if (revenueThisMonth > 0) {
      if (growthRatePercent > 0) {
        aiAnalysisPoints.push(`📈 Votre chiffre d'affaires a progressé de **+${growthRatePercent}%** par rapport au mois précédent.`);
      }
      aiAnalysisPoints.push(`📅 Votre journée la plus performante pour les ventes est le **${bestDayName}**.`);
      aiAnalysisPoints.push(`🛒 Votre panier moyen est de **${avgOrderValue.toLocaleString('fr-FR')} FCFA** sur ${completedOrdersCount} commande(s) réalisée(s).`);
      if (recurrentCustomersCount > 0) {
        aiAnalysisPoints.push(`👥 Vous comptez **${recurrentCustomersCount} client(s) fidèle(s)** ayant commandé plus d'une fois.`);
      }
    } else {
      aiAnalysisPoints.push('💡 Publiez des promotions sur WhatsApp et partagez vos factures MoneyLink pour stimuler vos ventes ce mois-ci.');
      aiAnalysisPoints.push(`📅 Historiquement au Sénégal, les journées du **Vendredi** et du **Samedi** enregistrent les plus forts volumes de commande.`);
    }

    return {
      merchant: {
        id: merchant.id,
        businessName: merchant.business_name,
        businessType: merchant.business_type,
        city: merchant.city || 'Dakar',
        whatsappPhone: merchant.whatsapp_phone || merchant.phone,
        isVerified: merchant.is_verified
      },
      wallet: {
        availableBalance: parseFloat(wallet?.available_balance || 0),
        lockedBalance: parseFloat(wallet?.locked_balance || 0),
        currency: wallet?.currency || 'XOF'
      },
      revenue: {
        today: revenueToday,
        week: revenueThisWeek,
        month: revenueThisMonth,
        prevMonth: revenuePrevMonth,
        growthRatePercent,
        totalSalesVolume,
        totalServiceFees
      },
      performance: {
        completedOrdersCount,
        pendingOrdersCount,
        totalOrdersCount: orders.length,
        avgOrderValue,
        bestDay: bestDayName,
        totalUniqueCustomers,
        recurrentCustomersCount,
        invoicesCount: invoices.length,
        invoicesPaidCount: invoices.filter(i => i.status === 'PAYÉE').length
      },
      aiAnalysis: aiAnalysisPoints,
      monthlyTarget: parseFloat(businessProfile?.monthly_target || 1000000),
      monthlyTargetProgress: businessProfile?.monthly_target > 0
        ? Math.min(100, Math.round((revenueThisMonth / businessProfile.monthly_target) * 100))
        : 0
    };
  }

  /**
   * Met à jour le profil business et les objectifs d'un commerçant
   */
  static async updateProfile(userId, updateData) {
    const { monthly_target, business_category, tax_id, settings } = updateData;
    const nowIso = new Date().toISOString();

    if (pool) {
      try {
        const res = await query(`
          UPDATE business_profiles SET
            monthly_target = COALESCE($1, monthly_target),
            business_category = COALESCE($2, business_category),
            tax_id = COALESCE($3, tax_id),
            settings = COALESCE($4, settings),
            updated_at = $5
          WHERE user_id = $6
          RETURNING *
        `, [monthly_target, business_category, tax_id, settings ? JSON.stringify(settings) : null, nowIso, userId]);

        if (res.rows && res.rows.length > 0) return res.rows[0];
      } catch (err) {
        console.warn('⚠️ Fallback memoryStore pour BusinessService.updateProfile :', err.message);
      }
    }

    if (memoryStore.business_profiles) {
      const bp = memoryStore.business_profiles.find(b => b.user_id === userId);
      if (bp) {
        if (monthly_target !== undefined) bp.monthly_target = parseFloat(monthly_target);
        if (business_category !== undefined) bp.business_category = business_category;
        if (tax_id !== undefined) bp.tax_id = tax_id;
        if (settings !== undefined) bp.settings = { ...bp.settings, ...settings };
        bp.updated_at = nowIso;
        return bp;
      }
    }

    throw new Error('Profil business introuvable.');
  }
}

export default BusinessService;
