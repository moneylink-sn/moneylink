/**
 * MoneyLink — NotificationService (Service de Notifications & Alertes Multi-Canal)
 * Supporte : In-App, Push Notifications, Webhook SMS / WhatsApp
 */

import { v4 as uuidv4 } from 'uuid';
import { memoryStore } from '../config/db.js';

export class NotificationService {
  /**
   * Envoie une notification et la journalise
   */
  static sendNotification({ userId, title, message, type = 'SYSTEM', payload = {}, channel = 'PUSH' }) {
    const notification = {
      id: uuidv4(),
      user_id: userId,
      title,
      message,
      type,
      payload,
      is_read: false,
      channel,
      created_at: new Date().toISOString()
    };

    memoryStore.notifications.unshift(notification);

    // Simulation d'envoi Push FCM / SMS externe
    console.log(`🔔 [NOTIFICATION ${channel}] Pour User ${userId}: ${title} — ${message}`);

    return notification;
  }

  /**
   * Récupère les notifications d'un utilisateur
   */
  static getUserNotifications(userId) {
    return memoryStore.notifications.filter(n => n.user_id === userId);
  }

  /**
   * Marque une notification comme lue
   */
  static markAsRead(notificationId, userId) {
    const notification = memoryStore.notifications.find(n => n.id === notificationId && n.user_id === userId);
    if (notification) {
      notification.is_read = true;
    }
    return notification;
  }
}

export const notificationService = NotificationService;
