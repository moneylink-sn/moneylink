/**
 * MoneyLink — NotificationService (Service de Notifications & Alertes Multi-Canal)
 * Supporte : In-App, Push Notifications, Webhook SMS / WhatsApp
 * Supporte PostgreSQL avec fallback mémoire
 */

import { v4 as uuidv4 } from 'uuid';
import { memoryStore, query, pool } from '../config/db.js';

export class NotificationService {
  /**
   * Envoie une notification et la journalise
   */
  static async sendNotification({ userId, title, message, type = 'SYSTEM', payload = {}, channel = 'PUSH' }) {
    const notificationId = uuidv4();
    const nowIso = new Date().toISOString();

    let notification = {
      id: notificationId,
      user_id: userId,
      title,
      message,
      type,
      payload: payload || {},
      is_read: false,
      channel,
      created_at: nowIso
    };

    if (pool) {
      try {
        const nRes = await query(`
          INSERT INTO notifications (id, user_id, title, message, type, payload, is_read, channel, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, false, $7, NOW())
          RETURNING *;
        `, [
          notificationId,
          userId,
          title,
          message,
          type,
          JSON.stringify(payload || {}),
          channel
        ]);
        if (nRes?.rows?.length > 0) notification = nRes.rows[0];
      } catch (dbErr) {
        if (process.env.NODE_ENV === 'production') throw dbErr;
      }
    }

    memoryStore.notifications.unshift(notification);

    // Simulation d'envoi Push FCM / SMS externe
    console.log(`🔔 [NOTIFICATION ${channel}] Pour User ${userId}: ${title} — ${message}`);

    return notification;
  }

  /**
   * Récupère les notifications d'un utilisateur
   */
  static async getUserNotifications(userId) {
    let notifs = [];

    if (pool) {
      try {
        const nRes = await query(`
          SELECT * FROM notifications
          WHERE user_id = $1
          ORDER BY created_at DESC;
        `, [userId]);
        if (nRes?.rows) notifs = nRes.rows;
      } catch (dbErr) {
        if (process.env.NODE_ENV === 'production') throw dbErr;
      }
    }

    if (notifs.length === 0) {
      notifs = memoryStore.notifications.filter(n => n.user_id === userId);
    }

    return notifs;
  }

  /**
   * Marque une notification comme lue
   */
  static async markAsRead(notificationId, userId) {
    let notification = null;

    if (pool) {
      try {
        const updRes = await query(`
          UPDATE notifications
          SET is_read = true
          WHERE id = $1 AND user_id = $2
          RETURNING *;
        `, [notificationId, userId]);
        if (updRes?.rows?.length > 0) notification = updRes.rows[0];
      } catch (dbErr) {
        if (process.env.NODE_ENV === 'production') throw dbErr;
      }
    }

    const memNotif = memoryStore.notifications.find(n => n.id === notificationId && n.user_id === userId);
    if (memNotif) {
      memNotif.is_read = true;
      if (!notification) notification = memNotif;
    }

    return notification;
  }

  /**
   * Marque toutes les notifications comme lues
   */
  static async markAllAsRead(userId) {
    if (pool) {
      try {
        await query('UPDATE notifications SET is_read = true WHERE user_id = $1', [userId]);
      } catch (dbErr) {
        if (process.env.NODE_ENV === 'production') throw dbErr;
      }
    }

    memoryStore.notifications
      .filter(n => n.user_id === userId)
      .forEach(n => { n.is_read = true; });

    return true;
  }
}

export const notificationService = NotificationService;
