/**
 * MoneyLink — SavingsController (Coffres d'Épargne & Tontines)
 */

import { memoryStore } from '../config/db.js';
import { SavingsService } from '../services/savingsService.js';

export class SavingsController {
  /**
   * Créer un coffre
   */
  static async createGoal(req, res, next) {
    try {
      const ownerId = req.user.id;
      const { title, description, target_amount, target_date, type, frequency, initial_amount } = req.body;

      const newGoal = await SavingsService.createGoal({
        ownerId,
        title,
        description,
        targetAmount: target_amount,
        targetDate: target_date,
        type,
        frequency,
        initialAmount: initial_amount
      });

      return res.status(201).json({
        success: true,
        message: 'Coffre d’épargne créé avec succès.',
        data: newGoal
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * Liste des coffres de l'utilisateur (Personnels + Tontines où il est membre)
   */
  static async getGoals(req, res, next) {
    try {
      const userId = req.user.id;

      // Récupère les coffres créés ou dont il est membre
      const memberGoalIds = memoryStore.savings_members
        .filter(m => m.user_id === userId)
        .map(m => m.savings_goal_id);

      const goals = memoryStore.savings_goals.filter(g => 
        g.owner_id === userId || memberGoalIds.includes(g.id)
      );

      const enrichedGoals = goals.map(goal => {
        const members = memoryStore.savings_members
          .filter(m => m.savings_goal_id === goal.id)
          .map(m => {
            const u = memoryStore.users.find(user => user.id === m.user_id);
            return {
              ...m,
              user_name: u ? `${u.first_name} ${u.last_name}` : 'Membre',
              user_avatar: u?.avatar_url
            };
          });

        const progressPercent = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));

        return {
          ...goal,
          progress_percent: progressPercent,
          remaining_amount: Math.max(0, goal.target_amount - goal.current_amount),
          members_count: members.length || 1,
          members
        };
      });

      return res.status(200).json({
        success: true,
        data: enrichedGoals
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Détail d'un coffre d'épargne avec historique des versements
   */
  static async getGoalById(req, res, next) {
    try {
      const { id } = req.params;
      const goal = memoryStore.savings_goals.find(g => g.id === id);

      if (!goal) return res.status(404).json({ success: false, error: 'Coffre d’épargne introuvable.' });

      const members = memoryStore.savings_members
        .filter(m => m.savings_goal_id === goal.id)
        .map(m => {
          const u = memoryStore.users.find(user => user.id === m.user_id);
          return {
            ...m,
            user_name: u ? `${u.first_name} ${u.last_name}` : 'Membre',
            user_phone: u?.phone,
            user_avatar: u?.avatar_url
          };
        });

      const contributions = memoryStore.savings_contributions
        .filter(c => c.savings_goal_id === goal.id)
        .map(c => {
          const u = memoryStore.users.find(user => user.id === c.user_id);
          return {
            ...c,
            user_name: u ? `${u.first_name} ${u.last_name}` : 'Membre'
          };
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      return res.status(200).json({
        success: true,
        data: {
          ...goal,
          progress_percent: Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100)),
          remaining_amount: Math.max(0, goal.target_amount - goal.current_amount),
          members,
          contributions
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Alimenter un coffre
   */
  static async contribute(req, res, next) {
    try {
      const { id } = req.params;
      const { amount, note } = req.body;

      const result = await SavingsService.contribute({
        goalId: id,
        userId: req.user.id,
        amount: parseFloat(amount),
        note
      });

      return res.status(200).json({
        success: true,
        message: 'Versement effectué avec succès dans le coffre.',
        data: result
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  /**
   * Inviter un membre dans une tontine / coffre collectif
   */
  static async inviteMember(req, res, next) {
    try {
      const { id } = req.params;
      const { phone } = req.body;

      const newMember = await SavingsService.inviteMember({
        goalId: id,
        phone,
        inviterUserId: req.user.id
      });

      return res.status(200).json({
        success: true,
        message: 'Membre ajouté au coffre collectif avec succès.',
        data: newMember
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }
}
