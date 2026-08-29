/**
 * MoneyLink — WebhookController (Réception des Callbacks Partenaires Wave & Orange Money)
 */

import { PaymentManager } from '../services/payment/paymentManager.js';
import { EscrowService } from '../services/escrowService.js';
import { memoryStore, query, pool } from '../config/db.js';

export class WebhookController {
  /**
   * Réception des Webhooks Wave Sénégal
   */
  static async handleWaveWebhook(req, res) {
    const signatureHeader = req.headers['wave-signature'];
    const rawPayload = req.body;
    const isProduction = process.env.NODE_ENV === 'production';

    console.log('⚡ [WEBHOOK WAVE SÉNÉGAL] Événement reçu :', rawPayload?.type || 'Event');

    // 1. Vérification de la signature HMAC (Obligatoire en production)
    if (isProduction && !signatureHeader) {
      console.warn('🚨 Webhook Wave rejeté : Header Wave-Signature manquant en production.');
      return res.status(401).json({ error: 'Signature requise en environnement de production' });
    }

    if (signatureHeader) {
      const isValid = PaymentManager.verifySignature('WAVE', rawPayload, signatureHeader);
      if (!isValid) {
        console.warn('⚠️ Signature Webhook Wave invalide !');
        return res.status(401).json({ error: 'Signature invalide' });
      }
    }

    // 2. Extraction des données
    try {
      const parsed = PaymentManager.parseWebhook('WAVE', rawPayload);

      if (parsed.status === 'SUCCESS' && parsed.orderId) {
        let order = null;
        let merchant = null;

        if (pool) {
          try {
            const ordRes = await query('SELECT * FROM orders WHERE id = $1 OR order_number = $1 LIMIT 1', [parsed.orderId]);
            if (ordRes?.rows?.length > 0) order = ordRes.rows[0];
            if (order) {
              const mRes = await query('SELECT * FROM merchants WHERE id = $1 LIMIT 1', [order.merchant_id]);
              if (mRes?.rows?.length > 0) merchant = mRes.rows[0];
            }
          } catch (dbErr) {
            if (isProduction) throw dbErr;
          }
        }

        if (!order) {
          order = memoryStore.orders.find(o => o.id === parsed.orderId || o.order_number === parsed.orderId);
        }

        if (order && order.status === 'PENDING_PAYMENT') {
          if (!merchant) merchant = memoryStore.merchants.find(m => m.id === order.merchant_id);

          await EscrowService.lockFundsForOrder({
            orderId: order.id,
            buyerId: order.buyer_id,
            merchantId: merchant?.id,
            totalAmount: parseFloat(parsed.amount || order.total_amount),
            paymentMethod: 'WAVE_SN',
            reference: parsed.transactionReference
          });

          console.log(`✅ [ESCROW LOCK AUTO] Commande #${order.order_number} verrouillée suite à confirmation Wave !`);
        }
      }
    } catch (err) {
      console.error('⚠️ Erreur lors du traitement du Webhook Wave :', err.message);
    }

    // Réponse 200 OK pour accuser réception
    return res.status(200).json({ received: true });
  }

  /**
   * Réception des Webhooks Orange Money Sénégal
   */
  static async handleOrangeMoneyWebhook(req, res) {
    const signatureHeader = req.headers['x-om-signature'] || req.headers['authorization'];
    const rawPayload = req.body;
    const isProduction = process.env.NODE_ENV === 'production';

    console.log('⚡ [WEBHOOK ORANGE MONEY SÉNÉGAL] Notification reçue :', rawPayload?.status || 'Status');

    // 1. Vérification de la signature (Obligatoire en production)
    if (isProduction && !signatureHeader) {
      console.warn('🚨 Webhook Orange Money rejeté : Signature manquante en production.');
      return res.status(401).json({ error: 'Signature requise en environnement de production' });
    }

    if (signatureHeader) {
      const isValid = PaymentManager.verifySignature('ORANGE_MONEY', rawPayload, signatureHeader);
      if (!isValid) {
        console.warn('⚠️ Signature Webhook Orange Money invalide !');
        return res.status(401).json({ error: 'Signature invalide' });
      }
    }

    try {
      const parsed = PaymentManager.parseWebhook('ORANGE_MONEY', rawPayload);

      if (parsed.status === 'SUCCESS' && parsed.orderId) {
        let order = null;
        let merchant = null;

        if (pool) {
          try {
            const ordRes = await query('SELECT * FROM orders WHERE id = $1 OR order_number = $1 LIMIT 1', [parsed.orderId]);
            if (ordRes?.rows?.length > 0) order = ordRes.rows[0];
            if (order) {
              const mRes = await query('SELECT * FROM merchants WHERE id = $1 LIMIT 1', [order.merchant_id]);
              if (mRes?.rows?.length > 0) merchant = mRes.rows[0];
            }
          } catch (dbErr) {
            if (isProduction) throw dbErr;
          }
        }

        if (!order) {
          order = memoryStore.orders.find(o => o.id === parsed.orderId || o.order_number === parsed.orderId);
        }

        if (order && order.status === 'PENDING_PAYMENT') {
          if (!merchant) merchant = memoryStore.merchants.find(m => m.id === order.merchant_id);

          await EscrowService.lockFundsForOrder({
            orderId: order.id,
            buyerId: order.buyer_id,
            merchantId: merchant?.id,
            totalAmount: parseFloat(parsed.amount || order.total_amount),
            paymentMethod: 'ORANGE_MONEY_SN',
            reference: parsed.transactionReference
          });

          console.log(`✅ [ESCROW LOCK AUTO] Commande #${order.order_number} verrouillée suite à confirmation Orange Money !`);
        }
      }
    } catch (err) {
      console.error('⚠️ Erreur lors du traitement du Webhook Orange Money :', err.message);
    }

    return res.status(200).json({ received: true });
  }
}
