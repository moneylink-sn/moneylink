/**
 * MoneyLink — Orange Money Sénégal Driver
 * Connecteur officiel pour Orange Developer Web Payment (Marché Sénégal & UEMOA)
 */

import crypto from 'crypto';
import { PaymentDriverInterface } from './paymentDriverInterface.js';

export class OrangeMoneyDriver extends PaymentDriverInterface {
  constructor() {
    super();
    this.isSandbox = process.env.NODE_ENV !== 'production';
    this.clientId = process.env.ORANGE_MONEY_CLIENT_ID || (this.isSandbox ? 'om_client_id_sample' : '');
    this.clientSecret = process.env.ORANGE_MONEY_CLIENT_SECRET || (this.isSandbox ? 'om_client_secret_sample' : '');
    this.merchantKey = process.env.ORANGE_MONEY_MERCHANT_KEY || process.env.ORANGE_MONEY_MERCHANT_ID || (this.isSandbox ? 'om_merchant_key_sn' : '');
    this.webhookSecret = process.env.ORANGE_MONEY_WEBHOOK_SECRET || (this.isSandbox ? 'om_sn_webhook_secret_key_2026' : '');
    this.apiUrl = process.env.ORANGE_MONEY_API_URL || 'https://api.orange.com/orange-money-webpay/dev/v1';
  }

  /**
   * Initialise un paiement Orange Money Webpay
   */
  async createCheckoutSession({ orderId, orderNumber, amount, currency = 'OUV', returnUrl, cancelUrl }) {
    if (this.isSandbox && !process.env.ORANGE_MONEY_CLIENT_ID) {
      const mockPayToken = `om_sn_token_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      return {
        success: true,
        provider: 'ORANGE_MONEY_SN',
        checkoutUrl: `https://webpayment.orange-money.sn/pay?token=${mockPayToken}`,
        providerSessionId: mockPayToken,
        reference: `OM-SN-${Date.now()}`,
        mode: 'SANDBOX_SIMULATION'
      };
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error('Identifiants Orange Money Sénégal (ORANGE_MONEY_CLIENT_ID / CLIENT_SECRET) non configurés pour la production.');
    }

    try {
      // Génération token OAuth2 puis appel WebPayment
      const response = await fetch(`${this.apiUrl}/webpayment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.clientSecret}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          merchant_key: this.merchantKey,
          currency: 'OUV', // Code monétaire Orange Money pour FCFA
          order_id: orderId,
          amount: amount,
          return_url: returnUrl || 'https://moneylink.sn/payment/om-return',
          cancel_url: cancelUrl || 'https://moneylink.sn/payment/om-cancel',
          notif_url: 'https://api.moneylink.sn/api/webhooks/orange-money',
          lang: 'fr',
          reference: `ML-${orderNumber}`
        })
      });

      const data = await response.json();
      return {
        success: true,
        provider: 'ORANGE_MONEY_SN',
        checkoutUrl: data.payment_url,
        providerSessionId: data.pay_token,
        reference: data.notif_token
      };
    } catch (err) {
      console.error('Erreur API Orange Money :', err);
      throw new Error(`Échec d'initialisation Orange Money: ${err.message}`);
    }
  }

  /**
   * Validation de la signature Webhook Orange Money
   */
  verifyWebhookSignature(rawBody, signatureHeader, secretKey) {
    if (!signatureHeader) return false;

    try {
      const secret = secretKey || this.webhookSecret;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody))
        .digest('hex');

      const sigBuf = Buffer.from(signatureHeader, 'utf8');
      const expectedBuf = Buffer.from(expectedSignature, 'utf8');

      if (sigBuf.length !== expectedBuf.length) {
        return false;
      }

      return crypto.timingSafeEqual(sigBuf, expectedBuf);
    } catch (err) {
      console.error('Erreur validation signature Orange Money :', err);
      return false;
    }
  }

  /**
   * Parse et normalise le payload Webhook Orange Money
   */
  parseWebhookPayload(payload) {
    const isSuccess = payload.status === 'SUCCESS' || payload.status === 'SUCCESSFUL' || payload.status === '200';

    return {
      status: isSuccess ? 'SUCCESS' : 'FAILED',
      orderId: payload.order_id || payload.orderId,
      transactionReference: payload.txnid || payload.notif_token || payload.pay_token,
      amount: parseFloat(payload.amount) || 0,
      currency: 'XOF',
      rawEvent: payload.status
    };
  }
}
