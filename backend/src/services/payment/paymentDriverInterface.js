/**
 * MoneyLink — PaymentDriverInterface
 * Interface abstraite standardisée pour tous les fournisseurs de paiement Mobile Money
 */

export class PaymentDriverInterface {
  /**
   * Initialise une session de paiement sécurisé (Checkout Session)
   * @param {Object} params { orderId, amount, currency, returnUrl, cancelUrl, clientRef }
   * @returns {Promise<{ checkoutUrl: string, providerSessionId: string, reference: string }>}
   */
  async createCheckoutSession(params) {
    throw new Error('La méthode createCheckoutSession() doit être implémentée.');
  }

  /**
   * Valide la signature cryptographique du Webhook entrant
   * @param {string|Buffer} rawBody
   * @param {string} signatureHeader
   * @param {string} secret
   * @returns {boolean}
   */
  verifyWebhookSignature(rawBody, signatureHeader, secret) {
    throw new Error('La méthode verifyWebhookSignature() doit être implémentée.');
  }

  /**
   * Traite le payload du Webhook et extrait le statut et la référence
   * @param {Object} payload
   * @returns {{ status: 'SUCCESS'|'FAILED'|'PENDING', orderId: string, transactionReference: string, amount: number }}
   */
  parseWebhookPayload(payload) {
    throw new Error('La méthode parseWebhookPayload() doit être implémentée.');
  }
}
