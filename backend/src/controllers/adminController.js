/**
 * MoneyLink — AdminController (Espace Administrateur, KPIs & Arbitrage Litiges)
 */

import { memoryStore } from '../config/db.js';
import { EscrowService } from '../services/escrowService.js';

export class AdminController {
  /**
   * Vue d'ensemble & KPIs de la plateforme
   */
  static async getDashboardStats(req, res, next) {
    try {
      const usersCount = memoryStore.users.length;
      const merchantsCount = memoryStore.merchants.length;
      const ordersCount = memoryStore.orders.length;
      const disputesCount = memoryStore.disputes.length;
      const savingsGoalsCount = memoryStore.savings_goals.length;

      const totalTransactionVolume = memoryStore.transactions
        .filter(t => t.status === 'SUCCESS' && (t.type === 'ESCROW_LOCK' || t.type === 'DEPOSIT'))
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

      const totalEscrowLocked = memoryStore.orders
        .filter(o => o.status === 'PAYMENT_CONFIRMED' || o.status === 'PROCESSING' || o.status === 'SHIPPED' || o.status === 'DELIVERED' || o.status === 'DISPUTED')
        .reduce((sum, o) => sum + (parseFloat(o.escrow_amount) || 0), 0);

      const totalSavingsCollected = memoryStore.savings_goals
        .reduce((sum, s) => sum + (parseFloat(s.current_amount) || 0), 0);

      return res.status(200).json({
        success: true,
        data: {
          metrics: {
            usersCount,
            merchantsCount,
            ordersCount,
            disputesCount,
            savingsGoalsCount,
            totalTransactionVolumeFCFA: totalTransactionVolume,
            totalEscrowLockedFCFA: totalEscrowLocked,
            totalSavingsCollectedFCFA: totalSavingsCollected
          },
          recentOrders: memoryStore.orders.slice(-5).reverse(),
          recentTransactions: memoryStore.transactions.slice(-5).reverse(),
          pendingDisputes: memoryStore.disputes.filter(d => d.status === 'OPENED' || d.status === 'IN_INVESTIGATION')
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Liste de tous les utilisateurs
   */
  static async listUsers(req, res, next) {
    try {
      const users = memoryStore.users.map(u => {
        const wallet = memoryStore.wallets.find(w => w.user_id === u.id);
        const merchant = memoryStore.merchants.find(m => m.user_id === u.id);
        return {
          id: u.id,
          first_name: u.first_name,
          last_name: u.last_name,
          phone: u.phone,
          email: u.email,
          role: u.role,
          status: u.status,
          avatar_url: u.avatar_url,
          available_balance: wallet?.available_balance || 0,
          locked_balance: wallet?.locked_balance || 0,
          merchant_name: merchant?.business_name,
          created_at: u.created_at
        };
      });

      return res.status(200).json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mise à jour du statut d'un utilisateur (ex: SUSPENDED, ACTIVE)
   */
  static async updateUserStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const user = memoryStore.users.find(u => u.id === id);
      if (!user) return res.status(404).json({ success: false, error: 'Utilisateur introuvable.' });

      user.status = status;
      return res.status(200).json({ success: true, message: 'Statut utilisateur mis à jour.', data: user });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Liste des litiges
   */
  static async listDisputes(req, res, next) {
    try {
      const disputes = memoryStore.disputes.map(d => {
        const order = memoryStore.orders.find(o => o.id === d.order_id);
        const buyer = memoryStore.users.find(u => u.id === d.opened_by);
        const merchant = order ? memoryStore.merchants.find(m => m.id === order.merchant_id) : null;
        return {
          ...d,
          order,
          buyer_name: buyer ? `${buyer.first_name} ${buyer.last_name}` : 'Client',
          merchant_name: merchant?.business_name || 'Commerçant'
        };
      });

      return res.status(200).json({ success: true, data: disputes });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Résolution d'un litige par l'administrateur
   */
  static async resolveDispute(req, res, next) {
    try {
      const { id } = req.params;
      const { resolution, notes } = req.body; // resolution = 'REFUND_BUYER' | 'RELEASE_MERCHANT'

      const dispute = memoryStore.disputes.find(d => d.id === id);
      if (!dispute) return res.status(404).json({ success: false, error: 'Litige introuvable.' });

      const order = memoryStore.orders.find(o => o.id === dispute.order_id);
      if (!order) return res.status(404).json({ success: false, error: 'Commande liée introuvable.' });

      dispute.resolution_notes = notes || '';
      dispute.resolved_by = req.user.id;
      dispute.resolved_at = new Date().toISOString();

      if (resolution === 'REFUND_BUYER') {
        dispute.status = 'REFUNDED_BUYER';
        await EscrowService.refundOrderToBuyer({
          orderId: order.id,
          adminNotes: notes,
          resolvedByUserId: req.user.id
        });
      } else if (resolution === 'RELEASE_MERCHANT') {
        dispute.status = 'RELEASED_MERCHANT';
        await EscrowService._executeEscrowRelease(order, 'ADMIN_DISPUTE_RESOLUTION');
      } else {
        return res.status(400).json({ success: false, error: 'Type de résolution invalide (REFUND_BUYER ou RELEASE_MERCHANT attendu).' });
      }

      return res.status(200).json({
        success: true,
        message: 'Litige résolu avec succès.',
        data: dispute
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }
}
