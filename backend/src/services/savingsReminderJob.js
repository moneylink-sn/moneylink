/**
 * MoneyLink — SavingsReminderJob (Worker automatique de relance des Coffres et Tontines)
 * Détecte les coffres arrivant à échéance sous 48h et déclenche les alertes SMS/WhatsApp/Push
 * Supporte PostgreSQL avec fallback mémoire
 */

import { memoryStore, query, pool } from '../config/db.js';
import { NotificationDispatcher } from './notificationDispatcher.js';

export class SavingsReminderJob {
  /**
   * Analyse tous les coffres actifs et envoie les rappels 48h
   */
  static async checkAndSendReminders() {
    console.log('⏰ [CRON WORKER] Analyse des échéances de coffres d’épargne...');

    const now = new Date();
    const twoDaysLater = new Date(now.getTime() + 48 * 3600 * 1000);
    const twoDaysDateStr = twoDaysLater.toISOString().split('T')[0];

    let goalsDueSoon = [];

    if (pool) {
      try {
        const gRes = await query(`
          SELECT g.*, u.phone AS owner_phone, u.id AS owner_user_id
          FROM savings_goals g
          JOIN users u ON g.owner_id = u.id
          WHERE g.status = 'ACTIVE' AND g.target_date = $1;
        `, [twoDaysDateStr]);
        if (gRes?.rows) goalsDueSoon = gRes.rows;
      } catch (dbErr) {
        if (process.env.NODE_ENV === 'production') throw dbErr;
      }
    }

    if (goalsDueSoon.length === 0) {
      goalsDueSoon = memoryStore.savings_goals.filter(g =>
        g.status === 'ACTIVE' && g.target_date === twoDaysDateStr
      );
    }

    console.log(`   ${goalsDueSoon.length} coffre(s) trouvé(s) arrivant à échéance sous 48 heures.`);

    for (const goal of goalsDueSoon) {
      let owner = null;
      if (goal.owner_phone) {
        owner = { id: goal.owner_user_id || goal.owner_id, phone: goal.owner_phone };
      } else {
        if (pool) {
          try {
            const uRes = await query('SELECT id, phone FROM users WHERE id = $1 LIMIT 1', [goal.owner_id]);
            if (uRes?.rows?.length > 0) owner = uRes.rows[0];
          } catch (dbErr) {
            if (process.env.NODE_ENV === 'production') throw dbErr;
          }
        }
        if (!owner) owner = memoryStore.users.find(u => u.id === goal.owner_id);
      }

      if (owner) {
        await NotificationDispatcher.dispatch({
          userId: owner.id,
          phone: owner.phone,
          templateKey: 'SAVINGS_DEADLINE_48H',
          params: [goal.title, goal.current_amount, goal.target_amount]
        });
      }

      // Si tontine collective, alerter également les participants
      if (goal.type === 'COLLECTIVE') {
        let members = [];
        if (pool) {
          try {
            const mRes = await query(`
              SELECT sm.*, u.phone AS member_phone
              FROM savings_members sm
              JOIN users u ON sm.user_id = u.id
              WHERE sm.savings_goal_id = $1;
            `, [goal.id]);
            if (mRes?.rows) members = mRes.rows;
          } catch (dbErr) {
            if (process.env.NODE_ENV === 'production') throw dbErr;
          }
        }

        if (members.length === 0) {
          members = memoryStore.savings_members.filter(m => m.savings_goal_id === goal.id);
        }

        for (const member of members) {
          if (member.user_id !== goal.owner_id) {
            let memberUser = null;
            if (member.member_phone) {
              memberUser = { id: member.user_id, phone: member.member_phone };
            } else {
              if (pool) {
                try {
                  const uRes = await query('SELECT id, phone FROM users WHERE id = $1 LIMIT 1', [member.user_id]);
                  if (uRes?.rows?.length > 0) memberUser = uRes.rows[0];
                } catch (dbErr) {
                  if (process.env.NODE_ENV === 'production') throw dbErr;
                }
              }
              if (!memberUser) memberUser = memoryStore.users.find(u => u.id === member.user_id);
            }

            if (memberUser) {
              await NotificationDispatcher.dispatch({
                userId: memberUser.id,
                phone: memberUser.phone,
                templateKey: 'SAVINGS_DEADLINE_48H',
                params: [goal.title, goal.current_amount, goal.target_amount]
              });
            }
          }
        }
      }
    }

    return { goalsProcessed: goalsDueSoon.length };
  }
}
