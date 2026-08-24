/**
 * MoneyLink — SavingsReminderJob (Worker automatique de relance des Coffres et Tontines)
 * Détecte les coffres arrivant à échéance sous 48h et déclenche les alertes SMS/WhatsApp/Push
 */

import { memoryStore } from '../config/db.js';
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

    const goalsDueSoon = memoryStore.savings_goals.filter(g => 
      g.status === 'ACTIVE' && g.target_date === twoDaysDateStr
    );

    console.log(`   ${goalsDueSoon.length} coffre(s) trouvé(s) arrivant à échéance sous 48 heures.`);

    for (const goal of goalsDueSoon) {
      const owner = memoryStore.users.find(u => u.id === goal.owner_id);
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
        const members = memoryStore.savings_members.filter(m => m.savings_goal_id === goal.id);
        for (const member of members) {
          if (member.user_id !== goal.owner_id) {
            const memberUser = memoryStore.users.find(u => u.id === member.user_id);
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
