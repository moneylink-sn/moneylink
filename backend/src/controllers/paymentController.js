/**
 * MoneyLink — PaymentController (Gestion des Paiements, Solde & Transactions)
 */

import { memoryStore } from '../config/db.js';
import { PaymentGateway } from '../services/paymentGateway.js';

export class PaymentController {
  /**
   * Effectue le règlement d'une commande
   */
  static async checkout(req, res, next) {
    try {
      const buyerId = req.user.id;
      const { order_id, payment_method = 'WAVE_MOCK', phone } = req.body;

      const order = memoryStore.orders.find(o => o.id === order_id);
      if (!order) {
        return res.status(404).json({ success: false, error: 'Commande introuvable.' });
      }

      if (order.status !== 'PENDING_PAYMENT') {
        return res.status(400).json({ success: false, error: `Cette commande a déjà le statut : ${order.status}` });
      }

      const result = await PaymentGateway.processPayment({
        orderId: order_id,
        buyerId,
        paymentMethod: payment_method,
        phone: phone || req.user.phone,
        amount: order.total_amount
      });

      return res.status(200).json({
        success: true,
        message: 'Paiement effectué avec succès ! Montant bloqué en séquestre.',
        data: result
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * Recharge du portefeuille MoneyLink
   */
  static async topUp(req, res, next) {
    try {
      const userId = req.user.id;
      const { amount, payment_method, phone } = req.body;

      const result = await PaymentGateway.topUpWallet({
        userId,
        amount: parseFloat(amount),
        paymentMethod: payment_method || 'WAVE_MOCK',
        phone: phone || req.user.phone
      });

      return res.status(200).json({
        success: true,
        message: 'Portefeuille rechargé avec succès.',
        data: result
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * Récupère l'historique des transactions de l'utilisateur
   */
  static async getTransactions(req, res, next) {
    try {
      const userId = req.user.id;
      const txns = memoryStore.transactions.filter(t => t.sender_id === userId || t.receiver_id === userId);

      return res.status(200).json({
        success: true,
        data: txns.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Récupère le solde du portefeuille
   */
  static async getWallet(req, res, next) {
    try {
      const userId = req.user.id;
      const wallet = memoryStore.wallets.find(w => w.user_id === userId);

      return res.status(200).json({
        success: true,
        data: wallet || { available_balance: 0, locked_balance: 0, currency: 'XOF' }
      });
    } catch (err) {
      next(err);
    }
  }
}
