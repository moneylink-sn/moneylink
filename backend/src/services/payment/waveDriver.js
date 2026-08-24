/**
 * MoneyLink — Wave Sénégal Driver
 * Connecteur officiel pour l'API Wave Checkout & Webhooks sécurisés (Marché Sénégal)
 */

import crypto from 'crypto';
import { PaymentDriverInterface } from './paymentDriverInterface.js';

export class WaveDriver extends PaymentDriverInterface {
  constructor() {
    super();
    this.isSandbox = process.env.NODE_ENV !== 'production';
    this.apiKey = process.env.WAVE_API_KEY || (this.isSandbox ? 'wave_sn_test_key_sample' : '');
    this.webhookSecret = process.env.WAVE_WEBHOOK_SECRET || (this.isSandbox ? 'wave_sn_webhook_secret_key_2026' : '');
    this.apiUrl = process.env.WAVE_API_URL || 'https://api.wave.com/v1';
  }

  /**
   * Crée une session de paiement Wave Checkout
   */
  async createCheckoutSession({ orderId, orderNumber, amount, currency = 'XOF', returnUrl, cancelUrl }) {
    // Si en mode Sandbox / Simulation locale hors-production
    if (this.isSandbox && !process.env.WAVE_API_KEY) {
      const mockSessionId = `cos_wv_sn_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      return {
        success: true,
        provider: 'WAVE_SN',
        checkoutUrl: `https://pay.wave.com/c/${mockSessionId}`,
        providerSessionId: mockSessionId,
        reference: `WAVE-SN-${Date.now()}`,
        mode: 'SANDBOX_SIMULATION'
      };
    }

    if (!this.apiKey) {
      throw new Error('Clé API Wave Sénégal (WAVE_API_KEY) non configurée pour l’environnement de production.');
    }

    try {
      const response = await fetch(`${this.apiUrl}/checkout/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amount.toString(),
          currency: currency,
          error_url: cancelUrl || 'https://moneylink.sn/payment/error',
          success_url: returnUrl || 'https://moneylink.sn/payment/success',
          client_reference: orderId,
          metadata: {
            orderNumber,
            platform: 'MoneyLink Escrow'
          }
        })
      });

      const data = await response.json();
      return {
        success: true,
        provider: 'WAVE_SN',
        checkoutUrl: data.wave_launch_url || data.checkout_url,
        providerSessionId: data.id,
        reference: data.client_reference
      };
    } catch (err) {
      console.error('Erreur API Wave Checkout :', err);
      throw new Error(`Échec de création de session Wave: ${err.message}`);
    }
  }

  /**
   * Vérification de la signature HMAC-SHA256 Wave
   * Header Wave standard : `Wave-Signature: t=1614835800,v1=5257186dbcdf...`
   */
  verifyWebhookSignature(rawBody, signatureHeader, secretKey) {
    if (!signatureHeader) return false;

    try {
      const secret = secretKey || this.webhookSecret;
      const parts = signatureHeader.split(',');
      let timestamp = '';
      let signature = '';

      for (const part of parts) {
        const [key, value] = part.trim().split('=');
        if (key === 't') timestamp = value;
        if (key === 'v1') signature = value;
      }

      if (!timestamp || !signature) return false;

      const payloadToSign = `${timestamp}.${typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody)}`;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payloadToSign)
        .digest('hex');

      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    } catch (err) {
      console.error('Erreur validation signature Wave :', err);
      return false;
    }
  }

  /**
   * Parse et normalise le payload Webhook Wave
   */
  parseWebhookPayload(payload) {
    const eventType = payload.type || payload.event;
    const session = payload.data || payload;

    const isSuccess = eventType === 'checkout.session.completed' || session.payment_status === 'succeeded';

    return {
      status: isSuccess ? 'SUCCESS' : 'FAILED',
      orderId: session.client_reference || session.metadata?.orderId,
      transactionReference: session.id || session.transaction_id,
      amount: parseFloat(session.amount) || 0,
      currency: session.currency || 'XOF',
      rawEvent: eventType
    };
  }
}
