/**
 * MoneyLink — WebhookController (Réception des Callbacks Partenaires Wave & Orange Money)
 */

import { PaymentManager } from '../services/payment/paymentManager.js';
import { EscrowService } from '../services/escrowService.js';
import { memoryStore } from '../config/db.js';

export class WebhookController {
  /**
   * Réception des Webhooks Wave Sénégal
   */
  static async handleWaveWebhook(req, res) {
    const signatureHeader = req.headers['wave-signature'];
    const rawPayload = req.body;

    console.log('⚡ [WEBHOOK WAVE SÉNÉGAL] Événement reçu :', rawPayload.type || 'Event');

    // 1. Vérification de la signature (en environnement de prod ou test avec signature)
    if (signatureHeader) {
      const isValid = PaymentManager.verifySignature('WAVE', rawPayload, signatureHeader);
      if (!isValid) {
        console.warn('⚠️ Signature Webhook Wave invalide !');
        return res.status(401).json({ error: 'Signature invalide' });
      }
    }

    // 2. Extraction des données
    const parsed = PaymentManager.parseWebhook('WAVE', rawPayload);

    if (parsed.status === 'SUCCESS' && parsed.orderId) {
      const order = memoryStore.orders.find(o => o.id === parsed.orderId || o.order_number === parsed.orderId);
      if (order && order.status === 'PENDING_PAYMENT') {
        const merchant = memoryStore.merchants.find(m => m.id === order.merchant_id);
        
        await EscrowService.lockFundsForOrder({
          orderId: order.id,
          buyerId: order.buyer_id,
          merchantId: merchant?.id,
          totalAmount: parsed.amount || order.total_amount,
          paymentMethod: 'WAVE_SN',
          reference: parsed.transactionReference
        });

        console.log(`✅ [ESCROW LOCK AUTO] Commande #${order.order_number} verrouillée suite à confirmation Wave !`);
      }
    }

    // Réponse rapide 200 OK pour accuser réception
    return res.status(200).json({ received: true });
  }

  /**
   * Réception des Webhooks Orange Money Sénégal
   */
  static async handleOrangeMoneyWebhook(req, res) {
    const signatureHeader = req.headers['x-om-signature'] || req.headers['authorization'];
    const rawPayload = req.body;

    console.log('⚡ [WEBHOOK ORANGE MONEY SÉNÉGAL] Notification reçue :', rawPayload.status || 'Status');

    if (signatureHeader) {
      const isValid = PaymentManager.verifySignature('ORANGE_MONEY', rawPayload, signatureHeader);
      if (!isValid) {
        console.warn('⚠️ Signature Webhook Orange Money invalide !');
        return res.status(401).json({ error: 'Signature invalide' });
      }
    }

    const parsed = PaymentManager.parseWebhook('ORANGE_MONEY', rawPayload);

    if (parsed.status === 'SUCCESS' && parsed.orderId) {
      const order = memoryStore.orders.find(o => o.id === parsed.orderId || o.order_number === parsed.orderId);
      if (order && order.status === 'PENDING_PAYMENT') {
        const merchant = memoryStore.merchants.find(m => m.id === order.merchant_id);

        await EscrowService.lockFundsForOrder({
          orderId: order.id,
          buyerId: order.buyer_id,
          merchantId: merchant?.id,
          totalAmount: parsed.amount || order.total_amount,
          paymentMethod: 'ORANGE_MONEY_SN',
          reference: parsed.transactionReference
        });

        console.log(`✅ [ESCROW LOCK AUTO] Commande #${order.order_number} verrouillée suite à confirmation Orange Money !`);
      }
    }

    return res.status(200).json({ received: true });
  }
}
