/**
 * MoneyLink — NotificationController
 */

import { notificationService } from '../services/notificationService.js';
import { NotificationDispatcher } from '../services/notificationDispatcher.js';
import { SavingsReminderJob } from '../services/savingsReminderJob.js';
import { memoryStore } from '../config/db.js';

export class NotificationController {
  static async getNotifications(req, res, next) {
    try {
      const notifications = await notificationService.getUserNotifications(req.user.id);
      return res.status(200).json({ success: true, data: notifications });
    } catch (err) {
      next(err);
    }
  }

  static async markAsRead(req, res, next) {
    try {
      const { id } = req.params;
      const notification = await notificationService.markAsRead(id, req.user.id);
      return res.status(200).json({ success: true, data: notification });
    } catch (err) {
      next(err);
    }
  }

  static async markAllAsRead(req, res, next) {
    try {
      await notificationService.markAllAsRead(req.user.id);
      return res.status(200).json({ success: true, message: 'Toutes les notifications ont été marquées comme lues.' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Déclenche manuellement le worker de relance des tontines et coffres (J-2)
   */
  static async triggerSavingsReminderJob(req, res, next) {
    try {
      const result = await SavingsReminderJob.checkAndSendReminders();
      return res.status(200).json({
        success: true,
        message: 'Worker d’analyse des échéances exécuté avec succès.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Simule l'envoi d'une notification multi-canal (SMS / WhatsApp / Push)
   */
  static async testDispatch(req, res, next) {
    try {
      const { phone, templateKey, params } = req.body;
      const result = await NotificationDispatcher.dispatch({
        userId: req.user?.id,
        phone: phone || req.user?.phone,
        templateKey: templateKey || 'PAYMENT_ESCROW_LOCKED',
        params: params || ['ML-2026-TEST', 50000, '998877']
      });

      return res.status(200).json({
        success: true,
        message: 'Notification multi-canal envoyée avec succès.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
}
