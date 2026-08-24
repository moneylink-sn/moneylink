/**
 * MoneyLink — PaymentGateway (Adaptateur de Passerelle de Paiement)
 * Simule fidèlement les API Wave Sénégal, Orange Money et Free Money
 */

import { v4 as uuidv4 } from 'uuid';
import { memoryStore } from '../config/db.js';
import { EscrowService } from './escrowService.js';
import { AnalyticsService } from './analyticsService.js';

export class PaymentGateway {
  /**
   * Initialise un paiement sécurisé (Wave, Orange Money ou Solde)
   */
  static async processPayment({ orderId, buyerId, paymentMethod, phone, amount, idempotencyKey }) {
    const order = memoryStore.orders.find(o => o.id === orderId);
    if (!order) throw new Error('Commande introuvable.');

    const merchant = memoryStore.merchants.find(m => m.id === order.merchant_id);
    if (!merchant) throw new Error('Commerçant introuvable.');

    // 1. Cas Paiement via Solde MoneyLink
    if (paymentMethod === 'WALLET') {
      const buyerWallet = memoryStore.wallets.find(w => w.user_id === buyerId);
      if (!buyerWallet || buyerWallet.available_balance < amount) {
        throw new Error('Solde MoneyLink insuffisant pour régler cette commande.');
      }

      // Débit du solde acheteur
      buyerWallet.available_balance -= amount;

      // Verrouillage en séquestre
      const escrowResult = await EscrowService.lockFundsForOrder({
        orderId,
        buyerId,
        merchantId: merchant.id,
        totalAmount: amount,
        paymentMethod: 'WALLET',
        reference: `TXN-WLT-${Date.now()}`
      });

      return {
        success: true,
        method: 'WALLET',
        status: 'PAID',
        reference: escrowResult.transaction.reference,
        deliveryCode: escrowResult.plainDeliveryCode,
        order: escrowResult.order
      };
    }

    // 2. Cas Paiement Mobile Money simulé (Wave Sénégal / Orange Money)
    const simulatedReference = `${paymentMethod.startsWith('WAVE') ? 'WV' : 'OM'}-SN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Simule la validation immédiate par webhook du partenaire
    const escrowResult = await EscrowService.lockFundsForOrder({
      orderId,
      buyerId,
      merchantId: merchant.id,
      totalAmount: amount,
      paymentMethod,
      reference: simulatedReference
    });

    // Traçage de l'événement de paiement confirmé
    AnalyticsService.recordEvent({
      event_type: 'PAYMENT_SUCCESS',
      user_id: buyerId,
      platform: 'MOBILE_APP',
      metadata: { amount, method: paymentMethod, order_id: orderId, reference: simulatedReference }
    });

    return {
      success: true,
      method: paymentMethod,
      providerReference: simulatedReference,
      status: 'PAID',
      checkoutUrl: `https://pay.moneylink.sn/mock-checkout/${simulatedReference}`,
      deliveryCode: escrowResult.plainDeliveryCode,
      order: escrowResult.order
    };
  }

  /**
   * Recharge de portefeuille (Top-up)
   */
  static async topUpWallet({ userId, amount, paymentMethod, phone }) {
    if (amount <= 0) throw new Error('Le montant de rechargement doit être supérieur à 0 FCFA.');

    const wallet = memoryStore.wallets.find(w => w.user_id === userId);
    if (!wallet) throw new Error('Portefeuille introuvable.');

    wallet.available_balance = (parseFloat(wallet.available_balance) || 0) + amount;

    const txn = {
      id: uuidv4(),
      reference: `TOPUP-${Date.now()}`,
      sender_id: userId,
      receiver_id: userId,
      type: 'DEPOSIT',
      amount,
      fee: 0,
      currency: 'XOF',
      payment_method: paymentMethod || 'WAVE_MOCK',
      status: 'SUCCESS',
      created_at: new Date().toISOString()
    };
    memoryStore.transactions.push(txn);

    AnalyticsService.recordEvent({
      event_type: 'PAYMENT_SUCCESS',
      user_id: userId,
      platform: 'MOBILE_APP',
      metadata: { amount, type: 'WALLET_TOPUP', reference: txn.reference }
    });

    return {
      wallet,
      transaction: txn
    };
  }
}
