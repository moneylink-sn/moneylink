/**
 * MoneyLink — SavingsService (Gestionnaire des Coffres Personnels & Collectifs / Tontines)
 */

import { v4 as uuidv4 } from 'uuid';
import { memoryStore } from '../config/db.js';
import { notificationService } from './notificationService.js';

export class SavingsService {
  /**
   * Crée un nouveau coffre d'épargne (Personnel ou Collectif)
   */
  static async createGoal({ ownerId, title, description, targetAmount, targetDate, type, frequency, initialAmount = 0 }) {
    const goalId = uuidv4();
    const newGoal = {
      id: goalId,
      owner_id: ownerId,
      title,
      description: description || '',
      target_amount: parseFloat(targetAmount),
      current_amount: parseFloat(initialAmount) || 0,
      start_date: new Date().toISOString().split('T')[0],
      target_date: targetDate,
      type: type || 'PERSONAL',
      frequency: frequency || 'MONTHLY',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    memoryStore.savings_goals.push(newGoal);

    // Si coffre collectif, enregistre le créateur comme membre 'CREATOR'
    if (type === 'COLLECTIVE') {
      memoryStore.savings_members.push({
        id: uuidv4(),
        savings_goal_id: goalId,
        user_id: ownerId,
        role: 'CREATOR',
        total_contributed: parseFloat(initialAmount) || 0,
        joined_at: new Date().toISOString()
      });
    }

    // Si versement initial, débit du portefeuille
    if (initialAmount > 0) {
      await this.contribute({
        goalId,
        userId: ownerId,
        amount: initialAmount,
        note: 'Dépôt initial'
      });
    }

    return newGoal;
  }

  /**
   * Effectue un versement dans un coffre
   */
  static async contribute({ goalId, userId, amount, note }) {
    const goal = memoryStore.savings_goals.find(g => g.id === goalId && g.status === 'ACTIVE');
    if (!goal) throw new Error('Coffre d’épargne introuvable ou clôturé.');

    const wallet = memoryStore.wallets.find(w => w.user_id === userId);
    if (!wallet || wallet.available_balance < amount) {
      throw new Error('Solde disponible insuffisant pour alimenter ce coffre.');
    }

    // Débit du portefeuille
    wallet.available_balance -= amount;

    // Crédit du coffre
    goal.current_amount = (parseFloat(goal.current_amount) || 0) + parseFloat(amount);

    // Si collectif, mise à jour de la contribution du membre
    if (goal.type === 'COLLECTIVE') {
      let member = memoryStore.savings_members.find(m => m.savings_goal_id === goalId && m.user_id === userId);
      if (!member) {
        member = {
          id: uuidv4(),
          savings_goal_id: goalId,
          user_id: userId,
          role: 'CONTRIBUTOR',
          total_contributed: 0,
          joined_at: new Date().toISOString()
        };
        memoryStore.savings_members.push(member);
      }
      member.total_contributed = (parseFloat(member.total_contributed) || 0) + parseFloat(amount);
    }

    // Enregistrement de la contribution
    const contribution = {
      id: uuidv4(),
      savings_goal_id: goalId,
      user_id: userId,
      amount: parseFloat(amount),
      note: note || 'Versement régulier',
      created_at: new Date().toISOString()
    };
    memoryStore.savings_contributions.push(contribution);

    // Enregistrement transaction
    const txn = {
      id: uuidv4(),
      reference: `SAV-${Date.now()}`,
      sender_id: userId,
      receiver_id: null,
      type: 'SAVINGS_DEPOSIT',
      amount: parseFloat(amount),
      fee: 0,
      currency: 'XOF',
      payment_method: 'WALLET',
      status: 'SUCCESS',
      created_at: new Date().toISOString()
    };
    memoryStore.transactions.push(txn);

    // Vérification de complétion
    if (goal.current_amount >= goal.target_amount) {
      goal.status = 'COMPLETED';
      notificationService.sendNotification({
        userId: goal.owner_id,
        title: 'Félicitations ! Objectif Atteint 🎯',
        message: `Votre coffre "${goal.title}" a atteint son montant cible de ${goal.target_amount.toLocaleString('fr-FR')} FCFA !`,
        type: 'SAVINGS_REMINDER',
        payload: { goalId }
      });
    }

    return {
      goal,
      contribution,
      wallet
    };
  }

  /**
   * Invite un membre dans un coffre collectif par son téléphone
   */
  static async inviteMember({ goalId, phone, inviterUserId }) {
    const goal = memoryStore.savings_goals.find(g => g.id === goalId && g.type === 'COLLECTIVE');
    if (!goal) throw new Error('Coffre collectif introuvable.');

    const userToInvite = memoryStore.users.find(u => u.phone === phone.trim());
    if (!userToInvite) {
      throw new Error(`Aucun compte MoneyLink n’est associé au numéro ${phone}. Une invitation SMS sera envoyée.`);
    }

    const existingMember = memoryStore.savings_members.find(m => m.savings_goal_id === goalId && m.user_id === userToInvite.id);
    if (existingMember) {
      throw new Error('Cet utilisateur participe déjà à ce coffre collectif.');
    }

    const newMember = {
      id: uuidv4(),
      savings_goal_id: goalId,
      user_id: userToInvite.id,
      role: 'CONTRIBUTOR',
      total_contributed: 0.00,
      joined_at: new Date().toISOString()
    };
    memoryStore.savings_members.push(newMember);

    notificationService.sendNotification({
      userId: userToInvite.id,
      title: 'Invitation à une Tontine / Coffre Collectif 🤝',
      message: `Vous avez été invité(e) à participer au coffre "${goal.title}" (Cible: ${goal.target_amount.toLocaleString('fr-FR')} FCFA).`,
      type: 'SAVINGS_REMINDER',
      payload: { goalId }
    });

    return newMember;
  }
}
