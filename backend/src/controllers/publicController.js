/**
 * MoneyLink — PublicController
 * Informations publiques transparentes, statut des moyens de paiement et métriques réelles
 * Zéro donnée fictive — Confidentialité garantie
 */

import { memoryStore, query, pool } from '../config/db.js';

export class PublicController {
  /**
   * Retourne le statut dynamique des connecteurs de paiement Wave & Orange Money
   * Sans jamais exposer aucune clé API, secret ou webhook secret.
   */
  static async getPaymentMethodsStatus(req, res) {
    try {
      const isProduction = process.env.NODE_ENV === 'production';
      
      const hasWaveLiveCreds = Boolean(
        process.env.WAVE_API_KEY &&
        process.env.WAVE_API_KEY.startsWith('wave_live_')
      );

      const hasOmLiveCreds = Boolean(
        process.env.ORANGE_MONEY_CLIENT_ID &&
        process.env.ORANGE_MONEY_CLIENT_SECRET &&
        process.env.ORANGE_MONEY_ENVIRONMENT === 'production'
      );

      const waveStatus = hasWaveLiveCreds ? 'AVAILABLE' : (isProduction ? 'CONTROLLED_ACCESS' : 'SANDBOX');
      const omStatus = hasOmLiveCreds ? 'AVAILABLE' : (isProduction ? 'CONTROLLED_ACCESS' : 'SANDBOX');

      return res.status(200).json({
        success: true,
        data: {
          market: 'Sénégal (UEMOA) 🇸🇳',
          currency: 'XOF / FCFA',
          methods: [
            {
              id: 'WAVE_SN',
              name: 'Wave Digital Finance Sénégal',
              code: 'WAVE',
              status: waveStatus,
              status_label: waveStatus === 'AVAILABLE' ? '🟢 Disponible' : (waveStatus === 'CONTROLLED_ACCESS' ? '🟠 Accès contrôlé' : '🔵 Sandbox'),
              environment: hasWaveLiveCreds ? 'PRODUCTION' : 'SANDBOX',
              escrow_compatible: true,
              otp_protected: true,
              instant_payout: true
            },
            {
              id: 'ORANGE_MONEY_SN',
              name: 'Orange Money Sénégal',
              code: 'ORANGE_MONEY',
              status: omStatus,
              status_label: omStatus === 'AVAILABLE' ? '🟢 Disponible' : (omStatus === 'CONTROLLED_ACCESS' ? '🟠 Accès contrôlé' : '🔵 Sandbox'),
              environment: hasOmLiveCreds ? 'PRODUCTION' : 'SANDBOX',
              escrow_compatible: true,
              otp_protected: true,
              instant_payout: true
            },
            {
              id: 'FREE_MONEY_SN',
              name: 'Free Money Sénégal',
              code: 'FREE_MONEY',
              status: 'SANDBOX',
              status_label: '🔵 Sandbox',
              environment: 'SANDBOX',
              escrow_compatible: true,
              otp_protected: true,
              instant_payout: false
            }
          ],
          escrow_protection: {
            status: 'ACTIVE',
            fee_percentage: 1.0,
            fee_payer: 'MERCHANT',
            otp_verification: 'MANDATORY',
            subscription_fee: 500
          }
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Retourne les statistiques réelles de l'écosystème MoneyLink (Zéro chiffre inventé)
   */
  static async getEcosystemStats(req, res) {
    try {
      let merchantsCount = 0;
      let productsCount = 0;
      let ordersCount = 0;
      let earlyAccessCount = 0;

      if (pool) {
        try {
          const mRes = await query("SELECT COUNT(*) AS count FROM merchants WHERE status = 'ACTIVE';");
          merchantsCount = parseInt(mRes?.rows?.[0]?.count || '0', 10);

          const pRes = await query("SELECT COUNT(*) AS count FROM products WHERE is_active = TRUE AND status = 'APPROVED';");
          productsCount = parseInt(pRes?.rows?.[0]?.count || '0', 10);

          const oRes = await query("SELECT COUNT(*) AS count FROM orders;");
          ordersCount = parseInt(oRes?.rows?.[0]?.count || '0', 10);

          const eaRes = await query("SELECT COUNT(*) AS count FROM early_access_leads;");
          earlyAccessCount = parseInt(eaRes?.rows?.[0]?.count || '0', 10);
        } catch {
          merchantsCount = (memoryStore.merchants || []).filter(m => m.status === 'ACTIVE').length;
          productsCount = (memoryStore.products || []).filter(p => p.is_active !== false).length;
          ordersCount = (memoryStore.orders || []).length;
          earlyAccessCount = (memoryStore.early_access_leads || []).length;
        }
      } else {
        merchantsCount = (memoryStore.merchants || []).filter(m => m.status === 'ACTIVE').length;
        productsCount = (memoryStore.products || []).filter(p => p.is_active !== false).length;
        ordersCount = (memoryStore.orders || []).length;
        earlyAccessCount = (memoryStore.early_access_leads || []).length;
      }

      return res.status(200).json({
        success: true,
        data: {
          active_merchants: merchantsCount,
          active_products: productsCount,
          total_orders: ordersCount,
          early_access_users: earlyAccessCount,
          commission_rate: '1%',
          pass_monthly_price: '500 FCFA',
          updated_at: new Date().toISOString()
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
