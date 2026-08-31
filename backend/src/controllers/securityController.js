/**
 * MoneyLink V2 — Contrôleur MoneyLink Shield (Sécurité & Scoring)
 */

import { ShieldService } from '../services/security/shieldService.js';

export const SecurityController = {
  /**
   * Analyse le risque d'une transaction
   * POST /api/security/analyze
   */
  async analyze(req, res, next) {
    try {
      const userId = req.user.id;
      const { amount, recipient_id, payment_method, transaction_type } = req.body;

      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

      const analysis = await ShieldService.analyzeTransaction({
        userId,
        amount,
        recipientId: recipient_id,
        paymentMethod: payment_method,
        ipAddress: ip,
        transactionType: transaction_type
      });

      return res.status(200).json({
        success: true,
        data: analysis
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Récupère les alertes de sécurité de l'utilisateur
   * GET /api/security/alerts
   */
  async getAlerts(req, res, next) {
    try {
      const userId = req.user.id;
      const unacknowledgedOnly = req.query.unread === 'true';

      const alerts = await ShieldService.getAlerts(userId, unacknowledgedOnly);

      return res.status(200).json({
        success: true,
        data: alerts
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Récupère les événements de sécurité (journal d'audit)
   * GET /api/security/events
   */
  async getEvents(req, res, next) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit || '50', 10);

      const events = await ShieldService.getEvents(userId, limit);

      return res.status(200).json({
        success: true,
        data: events
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Confirme ou annule explicitement une transaction à risque
   * POST /api/security/confirm
   */
  async confirm(req, res, next) {
    try {
      const userId = req.user.id;
      const { alert_id, decision } = req.body;

      if (!alert_id) {
        return res.status(400).json({
          success: false,
          error: 'alert_id est requis.'
        });
      }

      const updated = await ShieldService.confirmOperation(userId, alert_id, decision || 'CONFIRMED');

      return res.status(200).json({
        success: true,
        message: decision === 'CANCELLED' ? 'Opération annulée avec succès.' : 'Opération confirmée et sécurisée.',
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }
};

export default SecurityController;
