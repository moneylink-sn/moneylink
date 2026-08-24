/**
 * MoneyLink — EscrowService (Moteur de Séquestre & Tiers de Confiance)
 * Gère le cycle de vie complet des fonds bloqués, validation OTP et libération
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { memoryStore } from '../config/db.js';
import { notificationService } from './notificationService.js';

export class EscrowService {
  /**
   * Génère un code OTP aléatoire de 6 chiffres pour la réception sécurisée
   */
  static generateDeliveryCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Bloque les fonds d'une commande en séquestre après confirmation de paiement
   */
  static async lockFundsForOrder({ orderId, buyerId, merchantId, totalAmount, paymentMethod, reference }) {
    const order = memoryStore.orders.find(o => o.id === orderId);
    if (!order) throw new Error('Commande introuvable.');

    // Calcul frais de service (1%)
    const feePercent = parseFloat(process.env.ESCROW_FEE_PERCENT || '1.0');
    const serviceFee = Math.round((totalAmount * feePercent) / 100);
    const escrowAmount = totalAmount;

    // Génération du code de livraison
    const plainDeliveryCode = this.generateDeliveryCode();
    const deliveryCodeHash = await bcrypt.hash(plainDeliveryCode, 10);

    // Mise à jour de la commande
    order.status = 'PAYMENT_CONFIRMED';
    order.escrow_amount = escrowAmount;
    order.service_fee = serviceFee;
    order.delivery_code_hash = deliveryCodeHash;
    order.paid_at = new Date().toISOString();

    // Création de la transaction ESCROW_LOCK
    const txn = {
      id: uuidv4(),
      reference: reference || `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      idempotency_key: `IDEM-LOCK-${orderId}`,
      sender_id: buyerId,
      receiver_id: merchantId,
      order_id: orderId,
      type: 'ESCROW_LOCK',
      amount: totalAmount,
      fee: serviceFee,
      currency: 'XOF',
      payment_method: paymentMethod || 'WAVE_MOCK',
      status: 'SUCCESS',
      created_at: new Date().toISOString()
    };
    memoryStore.transactions.push(txn);

    // Ajustement portefeuille commerçant (fonds en séquestre)
    const merchant = memoryStore.merchants.find(m => m.id === merchantId);
    if (merchant) {
      const merchantWallet = memoryStore.wallets.find(w => w.user_id === merchant.user_id);
      if (merchantWallet) {
        merchantWallet.locked_balance = (parseFloat(merchantWallet.locked_balance) || 0) + totalAmount;
      }
    }

    // Notifications
    notificationService.sendNotification({
      userId: buyerId,
      title: 'Paiement Sécurisé Garanti 🔒',
      message: `Votre paiement de ${totalAmount.toLocaleString('fr-FR')} FCFA pour la commande #${order.order_number} est sous séquestre. Votre code secret de réception est : ${plainDeliveryCode}`,
      type: 'PAYMENT',
      payload: { orderId, plainDeliveryCode }
    });

    if (merchant) {
      notificationService.sendNotification({
        userId: merchant.user_id,
        title: 'Nouvelle Vente Payée (Séquestrée) 📦',
        message: `La commande #${order.order_number} (${totalAmount.toLocaleString('fr-FR')} FCFA) a été réglée et sécurisée. Vous pouvez expédier le colis.`,
        type: 'ORDER_STATUS',
        payload: { orderId }
      });
    }

    return {
      order,
      plainDeliveryCode,
      transaction: txn
    };
  }

  /**
   * Libère les fonds au commerçant suite à la saisie du code OTP de réception
   */
  static async releaseFundsWithCode({ orderId, inputCode, validatedByUserId }) {
    const order = memoryStore.orders.find(o => o.id === orderId);
    if (!order) throw new Error('Commande introuvable.');

    if (order.status === 'CONFIRMED') {
      throw new Error('Les fonds de cette commande ont déjà été libérés.');
    }

    if (order.status === 'DISPUTED') {
      throw new Error('Cette commande est sous litige. Un arbitrage administrateur est nécessaire.');
    }

    // Vérification du code de sécurité
    const isCodeValid = await bcrypt.compare(inputCode.trim(), order.delivery_code_hash);
    if (!isCodeValid) {
      throw new Error('Code de réception incorrect. Veuillez demander le code valide à l’acheteur.');
    }

    return await this._executeEscrowRelease(order, 'CODE_VALIDATION');
  }

  /**
   * Confirmation directe 1-clic par l'acheteur
   */
  static async releaseFundsByBuyer({ orderId, buyerId }) {
    const order = memoryStore.orders.find(o => o.id === orderId);
    if (!order) throw new Error('Commande introuvable.');

    if (order.buyer_id !== buyerId) {
      throw new Error('Seul l’acheteur de cette commande peut confirmer la réception.');
    }

    if (order.status === 'CONFIRMED') {
      throw new Error('Cette commande a déjà été confirmée.');
    }

    return await this._executeEscrowRelease(order, 'BUYER_CONFIRMATION');
  }

  /**
   * Exécution interne du transfert de fonds vers le solde disponible
   */
  static async _executeEscrowRelease(order, reason) {
    const merchant = memoryStore.merchants.find(m => m.id === order.merchant_id);
    if (!merchant) throw new Error('Commerçant introuvable.');

    const merchantWallet = memoryStore.wallets.find(w => w.user_id === merchant.user_id);
    if (!merchantWallet) throw new Error('Portefeuille commerçant introuvable.');

    const releaseAmount = order.total_amount - (order.service_fee || 0);

    // Mise à jour des soldes (Comptabilité en partie double)
    merchantWallet.locked_balance = Math.max(0, (parseFloat(merchantWallet.locked_balance) || 0) - order.total_amount);
    merchantWallet.available_balance = (parseFloat(merchantWallet.available_balance) || 0) + releaseAmount;

    // Mise à jour de la commande
    order.status = 'CONFIRMED';
    order.delivered_at = new Date().toISOString();
    order.confirmed_at = new Date().toISOString();

    // Transaction de libération
    const releaseTxn = {
      id: uuidv4(),
      reference: `TXN-REL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      idempotency_key: `IDEM-REL-${order.id}`,
      sender_id: order.buyer_id,
      receiver_id: merchant.user_id,
      order_id: order.id,
      type: 'ESCROW_RELEASE',
      amount: releaseAmount,
      fee: order.service_fee || 0,
      currency: 'XOF',
      payment_method: 'WALLET',
      status: 'SUCCESS',
      created_at: new Date().toISOString()
    };
    memoryStore.transactions.push(releaseTxn);

    // Notifications
    notificationService.sendNotification({
      userId: merchant.user_id,
      title: 'Paiement Débloqué ! 💰',
      message: `Votre compte a été crédité de ${releaseAmount.toLocaleString('fr-FR')} FCFA pour la commande #${order.order_number}.`,
      type: 'PAYMENT',
      payload: { orderId: order.id }
    });

    notificationService.sendNotification({
      userId: order.buyer_id,
      title: 'Commande Terminée avec Succès ✅',
      message: `La réception de la commande #${order.order_number} a été validée. Merci d’avoir utilisé MoneyLink !`,
      type: 'ORDER_STATUS',
      payload: { orderId: order.id }
    });

    return {
      order,
      releaseTxn,
      releasedAmount: releaseAmount
    };
  }

  /**
   * Remboursement de l'acheteur en cas de résolution de litige en sa faveur
   */
  static async refundOrderToBuyer({ orderId, adminNotes, resolvedByUserId }) {
    const order = memoryStore.orders.find(o => o.id === orderId);
    if (!order) throw new Error('Commande introuvable.');

    const merchant = memoryStore.merchants.find(m => m.id === order.merchant_id);
    const buyerWallet = memoryStore.wallets.find(w => w.user_id === order.buyer_id);

    if (merchant) {
      const merchantWallet = memoryStore.wallets.find(w => w.user_id === merchant.user_id);
      if (merchantWallet) {
        merchantWallet.locked_balance = Math.max(0, (parseFloat(merchantWallet.locked_balance) || 0) - order.total_amount);
      }
    }

    if (buyerWallet) {
      buyerWallet.available_balance = (parseFloat(buyerWallet.available_balance) || 0) + order.total_amount;
    }

    order.status = 'REFUNDED';

    const refundTxn = {
      id: uuidv4(),
      reference: `TXN-REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      idempotency_key: `IDEM-REF-${order.id}`,
      sender_id: merchant ? merchant.user_id : null,
      receiver_id: order.buyer_id,
      order_id: order.id,
      type: 'ESCROW_REFUND',
      amount: order.total_amount,
      fee: 0.00,
      currency: 'XOF',
      payment_method: 'WALLET',
      status: 'SUCCESS',
      created_at: new Date().toISOString()
    };
    memoryStore.transactions.push(refundTxn);

    // Notification acheteur
    notificationService.sendNotification({
      userId: order.buyer_id,
      title: 'Remboursement Effectué 🔄',
      message: `Votre commande #${order.order_number} de ${order.total_amount.toLocaleString('fr-FR')} FCFA a été remboursée sur votre solde.`,
      type: 'PAYMENT',
      payload: { orderId: order.id }
    });

    return { order, refundTxn };
  }
}
