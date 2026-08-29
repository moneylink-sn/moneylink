/**
 * MoneyLink — PaymentGateway (Adaptateur de Passerelle de Paiement)
 * Simule fidèlement les API Wave Sénégal, Orange Money et Free Money
 * Supporte PostgreSQL avec transactions ACID et fallback mémoire
 */

import { v4 as uuidv4 } from 'uuid';
import { memoryStore, query, withTransaction, pool } from '../config/db.js';
import { EscrowService } from './escrowService.js';
import { AnalyticsService } from './analyticsService.js';

export class PaymentGateway {
  /**
   * Initialise un paiement sécurisé (Wave, Orange Money ou Solde)
   */
  static async processPayment({ orderId, buyerId, paymentMethod, phone, amount, idempotencyKey }) {
    let order = null;
    let merchant = null;

    if (pool) {
      try {
        const ordRes = await query('SELECT * FROM orders WHERE id = $1 LIMIT 1', [orderId]);
        if (ordRes?.rows?.length > 0) order = ordRes.rows[0];
        if (order) {
          const mRes = await query('SELECT * FROM merchants WHERE id = $1 LIMIT 1', [order.merchant_id]);
          if (mRes?.rows?.length > 0) merchant = mRes.rows[0];
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'production') throw err;
      }
    }

    if (!order) order = memoryStore.orders.find(o => o.id === orderId);
    if (!order) throw new Error('Commande introuvable.');

    if (!merchant) merchant = memoryStore.merchants.find(m => m.id === order.merchant_id);
    if (!merchant) throw new Error('Commerçant introuvable.');

    const paymentAmount = parseFloat(amount || order.total_amount);

    // 1. Cas Paiement via Solde MoneyLink (débit et verrouillage atomiques dans la transaction)
    if (paymentMethod === 'WALLET') {
      const escrowResult = await EscrowService.lockFundsForOrder({
        orderId,
        buyerId,
        merchantId: merchant.id,
        totalAmount: paymentAmount,
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
      totalAmount: paymentAmount,
      paymentMethod,
      reference: simulatedReference
    });

    // Traçage de l'événement de paiement confirmé
    AnalyticsService.recordEvent({
      event_type: 'PAYMENT_SUCCESS',
      user_id: buyerId,
      platform: 'MOBILE_APP',
      metadata: { amount: paymentAmount, method: paymentMethod, order_id: orderId, reference: simulatedReference }
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
    const topUpAmount = parseFloat(amount);
    if (isNaN(topUpAmount) || topUpAmount <= 0) {
      throw new Error('Le montant de rechargement doit être supérieur à 0 FCFA.');
    }

    let wallet = null;
    let txn = null;
    const txnId = uuidv4();
    const txnRef = `TOPUP-${Date.now()}`;
    const nowIso = new Date().toISOString();

    if (pool) {
      try {
        await withTransaction(async (client) => {
          if (client) {
            const wRes = await client.query(`
              UPDATE wallets
              SET available_balance = available_balance + $1,
                  updated_at = NOW()
              WHERE user_id = $2
              RETURNING *;
            `, [topUpAmount, userId]);
            if (wRes?.rows?.length > 0) wallet = wRes.rows[0];

            const tRes = await client.query(`
              INSERT INTO transactions (
                id, reference, sender_id, receiver_id, type, amount, fee,
                currency, payment_method, status, created_at
              ) VALUES ($1, $2, $3, $3, 'DEPOSIT', $4, 0, 'XOF', $5, 'SUCCESS', NOW())
              RETURNING *;
            `, [txnId, txnRef, userId, topUpAmount, paymentMethod || 'WAVE_MOCK']);
            if (tRes?.rows?.length > 0) txn = tRes.rows[0];
          }
        });
      } catch (dbErr) {
        if (process.env.NODE_ENV === 'production') throw dbErr;
      }
    }

    // Miroir memoryStore
    const memWallet = memoryStore.wallets.find(w => w.user_id === userId);
    if (memWallet) {
      memWallet.available_balance = (parseFloat(memWallet.available_balance) || 0) + topUpAmount;
      if (!wallet) wallet = memWallet;
    }

    if (!wallet) throw new Error('Portefeuille introuvable.');

    if (!txn) {
      txn = {
        id: txnId,
        reference: txnRef,
        sender_id: userId,
        receiver_id: userId,
        type: 'DEPOSIT',
        amount: topUpAmount,
        fee: 0,
        currency: 'XOF',
        payment_method: paymentMethod || 'WAVE_MOCK',
        status: 'SUCCESS',
        created_at: nowIso
      };
      memoryStore.transactions.push(txn);
    }

    AnalyticsService.recordEvent({
      event_type: 'PAYMENT_SUCCESS',
      user_id: userId,
      platform: 'MOBILE_APP',
      metadata: { amount: topUpAmount, type: 'WALLET_TOPUP', reference: txn.reference }
    });

    return {
      wallet,
      transaction: txn
    };
  }
}
