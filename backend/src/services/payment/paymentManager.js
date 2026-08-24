/**
 * MoneyLink — PaymentManager (Gestionnaire & Orchestrateur des Fournisseurs de Paiement)
 */

import { WaveDriver } from './waveDriver.js';
import { OrangeMoneyDriver } from './orangeMoneyDriver.js';

export class PaymentManager {
  static getDriver(providerKey) {
    const key = providerKey.toUpperCase();
    if (key.includes('WAVE')) {
      return new WaveDriver();
    } else if (key.includes('ORANGE') || key.includes('OM')) {
      return new OrangeMoneyDriver();
    }
    // Par défaut, fallback Wave
    return new WaveDriver();
  }

  /**
   * Crée la session de paiement avec le driver approprié
   */
  static async createSession(providerKey, params) {
    const driver = this.getDriver(providerKey);
    return await driver.createCheckoutSession(params);
  }

  /**
   * Vérifie la signature du webhook
   */
  static verifySignature(providerKey, rawBody, signatureHeader) {
    const driver = this.getDriver(providerKey);
    return driver.verifyWebhookSignature(rawBody, signatureHeader);
  }

  /**
   * Extrait les informations de la transaction du webhook
   */
  static parseWebhook(providerKey, payload) {
    const driver = this.getDriver(providerKey);
    return driver.parseWebhookPayload(payload);
  }
}
