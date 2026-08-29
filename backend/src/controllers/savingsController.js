/**
 * MoneyLink — SavingsController (Coffres d'Épargne & Tontines)
 * Prise en charge PostgreSQL avec fallback mémoire
 */

import { memoryStore, query, pool } from '../config/db.js';
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
      let goals = [];

      if (pool) {
        try {
          const gRes = await query(`
            SELECT DISTINCT g.*
            FROM savings_goals g
            LEFT JOIN savings_members sm ON g.id = sm.savings_goal_id
            WHERE g.owner_id = $1 OR sm.user_id = $1
            ORDER BY g.created_at DESC;
          `, [userId]);

          if (gRes?.rows) {
            goals = gRes.rows;
            for (const goal of goals) {
              const memRes = await query(`
                SELECT sm.*, u.first_name || ' ' || u.last_name AS user_name, u.avatar_url AS user_avatar
                FROM savings_members sm
                JOIN users u ON sm.user_id = u.id
                WHERE sm.savings_goal_id = $1;
              `, [goal.id]);
              goal.members = memRes?.rows || [];
            }
          }
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      if (goals.length === 0) {
        const memberGoalIds = memoryStore.savings_members
          .filter(m => m.user_id === userId)
          .map(m => m.savings_goal_id);

        const memGoals = memoryStore.savings_goals.filter(g =>
          g.owner_id === userId || memberGoalIds.includes(g.id)
        );

        goals = memGoals.map(goal => {
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
          return { ...goal, members };
        });
      }

      const enrichedGoals = goals.map(goal => {
        const currentAmt = parseFloat(goal.current_amount || 0);
        const targetAmt = parseFloat(goal.target_amount || 1);
        const progressPercent = Math.min(100, Math.round((currentAmt / targetAmt) * 100));

        return {
          ...goal,
          current_amount: currentAmt,
          target_amount: targetAmt,
          progress_percent: progressPercent,
          remaining_amount: Math.max(0, targetAmt - currentAmt),
          members_count: goal.members?.length || 1,
          members: goal.members || []
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
      let goal = null;
      let members = [];
      let contributions = [];

      if (pool) {
        try {
          const gRes = await query('SELECT * FROM savings_goals WHERE id = $1 LIMIT 1', [id]);
          if (gRes?.rows?.length > 0) {
            goal = gRes.rows[0];

            const mRes = await query(`
              SELECT sm.*, (u.first_name || ' ' || u.last_name) AS user_name, u.phone AS user_phone, u.avatar_url AS user_avatar
              FROM savings_members sm
              JOIN users u ON sm.user_id = u.id
              WHERE sm.savings_goal_id = $1;
            `, [id]);
            members = mRes?.rows || [];

            const cRes = await query(`
              SELECT sc.*, (u.first_name || ' ' || u.last_name) AS user_name
              FROM savings_contributions sc
              JOIN users u ON sc.user_id = u.id
              WHERE sc.savings_goal_id = $1
              ORDER BY sc.created_at DESC;
            `, [id]);
            contributions = cRes?.rows || [];
          }
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      if (!goal) {
        goal = memoryStore.savings_goals.find(g => g.id === id);
        if (!goal) return res.status(404).json({ success: false, error: 'Coffre d’épargne introuvable.' });

        members = memoryStore.savings_members
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

        contributions = memoryStore.savings_contributions
          .filter(c => c.savings_goal_id === goal.id)
          .map(c => {
            const u = memoryStore.users.find(user => user.id === c.user_id);
            return {
              ...c,
              user_name: u ? `${u.first_name} ${u.last_name}` : 'Membre'
            };
          })
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }

      // Contrôle d'accès : Seul le propriétaire, les membres ou un administrateur peuvent voir les détails du coffre
      if (req.user.role !== 'ADMIN' && goal.owner_id !== req.user.id && !members.some(m => m.user_id === req.user.id)) {
        return res.status(403).json({ success: false, error: 'Accès non autorisé à ce coffre d’épargne.' });
      }

      const currentAmt = parseFloat(goal.current_amount || 0);
      const targetAmt = parseFloat(goal.target_amount || 1);

      return res.status(200).json({
        success: true,
        data: {
          ...goal,
          current_amount: currentAmt,
          target_amount: targetAmt,
          progress_percent: Math.min(100, Math.round((currentAmt / targetAmt) * 100)),
          remaining_amount: Math.max(0, targetAmt - currentAmt),
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
