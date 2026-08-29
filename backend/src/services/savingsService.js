/**
 * MoneyLink — SavingsService (Gestionnaire des Coffres Personnels & Collectifs / Tontines)
 * Supporte PostgreSQL avec transactions ACID et fallback mémoire
 */

import { v4 as uuidv4 } from 'uuid';
import { memoryStore, query, withTransaction, pool } from '../config/db.js';
import { notificationService } from './notificationService.js';

export class SavingsService {
  /**
   * Crée un nouveau coffre d'épargne (Personnel ou Collectif)
   */
  static async createGoal({ ownerId, title, description, targetAmount, targetDate, type, frequency, initialAmount = 0 }) {
    const goalId = uuidv4();
    const targetAmt = parseFloat(targetAmount);
    const initAmt = parseFloat(initialAmount) || 0;
    const nowIso = new Date().toISOString();
    const startDate = nowIso.split('T')[0];

    let newGoal = {
      id: goalId,
      owner_id: ownerId,
      title,
      description: description || '',
      target_amount: targetAmt,
      current_amount: 0.00,
      start_date: startDate,
      target_date: targetDate,
      type: type || 'PERSONAL',
      frequency: frequency || 'MONTHLY',
      status: 'ACTIVE',
      created_at: nowIso,
      updated_at: nowIso
    };

    if (pool) {
      try {
        await withTransaction(async (client) => {
          if (client) {
            const gSql = `
              INSERT INTO savings_goals (
                id, owner_id, title, description, target_amount, current_amount,
                start_date, target_date, type, frequency, status, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, 0.00, $6, $7, $8, $9, 'ACTIVE', NOW(), NOW())
              RETURNING *;
            `;
            const gRes = await client.query(gSql, [
              goalId,
              ownerId,
              title,
              description || '',
              targetAmt,
              startDate,
              targetDate,
              type || 'PERSONAL',
              frequency || 'MONTHLY'
            ]);
            if (gRes?.rows?.length > 0) newGoal = gRes.rows[0];

            if (type === 'COLLECTIVE') {
              const memId = uuidv4();
              await client.query(`
                INSERT INTO savings_members (id, savings_goal_id, user_id, role, total_contributed, joined_at)
                VALUES ($1, $2, $3, 'CREATOR', 0.00, NOW())
                ON CONFLICT (savings_goal_id, user_id) DO NOTHING;
              `, [memId, goalId, ownerId]);
            }
          }
        });
      } catch (dbErr) {
        if (process.env.NODE_ENV === 'production') throw dbErr;
      }
    }

    // Miroir memoryStore
    if (!memoryStore.savings_goals.some(g => g.id === newGoal.id)) {
      memoryStore.savings_goals.push(newGoal);
    }

    if (type === 'COLLECTIVE') {
      if (!memoryStore.savings_members.some(m => m.savings_goal_id === goalId && m.user_id === ownerId)) {
        memoryStore.savings_members.push({
          id: uuidv4(),
          savings_goal_id: goalId,
          user_id: ownerId,
          role: 'CREATOR',
          total_contributed: 0.00,
          joined_at: nowIso
        });
      }
    }

    // Si versement initial, débit du portefeuille
    if (initAmt > 0) {
      await this.contribute({
        goalId,
        userId: ownerId,
        amount: initAmt,
        note: 'Dépôt initial'
      });
    }

    return newGoal;
  }

  /**
   * Effectue un versement dans un coffre
   */
  static async contribute({ goalId, userId, amount, note }) {
    const contribAmount = parseFloat(amount);
    if (isNaN(contribAmount) || contribAmount <= 0) {
      throw new Error('Le montant du versement doit être supérieur à 0 FCFA.');
    }

    let goal = null;
    let wallet = null;

    if (pool) {
      try {
        const gRes = await query('SELECT * FROM savings_goals WHERE id = $1 AND status = \'ACTIVE\' LIMIT 1', [goalId]);
        if (gRes?.rows?.length > 0) goal = gRes.rows[0];

        const wRes = await query('SELECT * FROM wallets WHERE user_id = $1 LIMIT 1', [userId]);
        if (wRes?.rows?.length > 0) wallet = wRes.rows[0];
      } catch (dbErr) {
        if (process.env.NODE_ENV === 'production') throw dbErr;
      }
    }

    if (!goal) goal = memoryStore.savings_goals.find(g => g.id === goalId && g.status === 'ACTIVE');
    if (!goal) throw new Error('Coffre d’épargne introuvable ou clôturé.');

    if (!wallet) wallet = memoryStore.wallets.find(w => w.user_id === userId);
    if (!wallet || parseFloat(wallet.available_balance) < contribAmount) {
      throw new Error('Solde disponible insuffisant pour alimenter ce coffre.');
    }

    const contributionId = uuidv4();
    const txnId = uuidv4();
    const txnRef = `SAV-${Date.now()}`;
    const nowIso = new Date().toISOString();
    let updatedGoal = goal;
    let contribution = null;

    if (pool) {
      try {
        await withTransaction(async (client) => {
          if (client) {
            // 1. Débit portefeuille (atomique avec vérification de solde)
            const wUpd = await client.query(`
              UPDATE wallets
              SET available_balance = available_balance - $1,
                  updated_at = NOW()
              WHERE user_id = $2 AND available_balance >= $1
              RETURNING *;
            `, [contribAmount, userId]);
            if (!wUpd?.rows?.length) {
              throw new Error('Solde disponible insuffisant pour alimenter ce coffre.');
            }
            wallet = wUpd.rows[0];


            // 2. Crédit coffre
            const gUpd = await client.query(`
              UPDATE savings_goals
              SET current_amount = current_amount + $1,
                  status = CASE WHEN current_amount + $1 >= target_amount THEN 'COMPLETED' ELSE status END,
                  updated_at = NOW()
              WHERE id = $2
              RETURNING *;
            `, [contribAmount, goalId]);
            if (gUpd?.rows?.length > 0) updatedGoal = gUpd.rows[0];

            // 3. Si collectif, màj savings_members
            if (goal.type === 'COLLECTIVE') {
              await client.query(`
                INSERT INTO savings_members (id, savings_goal_id, user_id, role, total_contributed, joined_at)
                VALUES ($1, $2, $3, 'CONTRIBUTOR', $4, NOW())
                ON CONFLICT (savings_goal_id, user_id)
                DO UPDATE SET total_contributed = savings_members.total_contributed + $4;
              `, [uuidv4(), goalId, userId, contribAmount]);
            }

            // 4. Contribution
            const cRes = await client.query(`
              INSERT INTO savings_contributions (id, savings_goal_id, user_id, amount, note, created_at)
              VALUES ($1, $2, $3, $4, $5, NOW())
              RETURNING *;
            `, [contributionId, goalId, userId, contribAmount, note || 'Versement régulier']);
            if (cRes?.rows?.length > 0) contribution = cRes.rows[0];

            // 5. Transaction
            await client.query(`
              INSERT INTO transactions (
                id, reference, sender_id, type, amount, fee, currency, payment_method, status, created_at
              ) VALUES ($1, $2, $3, 'SAVINGS_DEPOSIT', $4, 0, 'XOF', 'WALLET', 'SUCCESS', NOW());
            `, [txnId, txnRef, userId, contribAmount]);
          }
        });
      } catch (dbErr) {
        if (process.env.NODE_ENV === 'production') throw dbErr;
      }
    }

    // Miroir memoryStore
    const memWallet = memoryStore.wallets.find(w => w.user_id === userId);
    if (memWallet) {
      memWallet.available_balance = (parseFloat(memWallet.available_balance) || 0) - contribAmount;
      if (!wallet) wallet = memWallet;
    }

    const memGoal = memoryStore.savings_goals.find(g => g.id === goalId);
    if (memGoal) {
      memGoal.current_amount = (parseFloat(memGoal.current_amount) || 0) + contribAmount;
      if (memGoal.current_amount >= memGoal.target_amount) {
        memGoal.status = 'COMPLETED';
      }
      updatedGoal = memGoal;
    }

    if (goal.type === 'COLLECTIVE') {
      let member = memoryStore.savings_members.find(m => m.savings_goal_id === goalId && m.user_id === userId);
      if (!member) {
        member = {
          id: uuidv4(),
          savings_goal_id: goalId,
          user_id: userId,
          role: 'CONTRIBUTOR',
          total_contributed: 0,
          joined_at: nowIso
        };
        memoryStore.savings_members.push(member);
      }
      member.total_contributed = (parseFloat(member.total_contributed) || 0) + contribAmount;
    }

    if (!contribution) {
      contribution = {
        id: contributionId,
        savings_goal_id: goalId,
        user_id: userId,
        amount: contribAmount,
        note: note || 'Versement régulier',
        created_at: nowIso
      };
      memoryStore.savings_contributions.push(contribution);
    }

    const txn = {
      id: txnId,
      reference: txnRef,
      sender_id: userId,
      receiver_id: null,
      type: 'SAVINGS_DEPOSIT',
      amount: contribAmount,
      fee: 0,
      currency: 'XOF',
      payment_method: 'WALLET',
      status: 'SUCCESS',
      created_at: nowIso
    };
    memoryStore.transactions.push(txn);

    // Vérification de complétion
    if (parseFloat(updatedGoal.current_amount) >= parseFloat(updatedGoal.target_amount)) {
      notificationService.sendNotification({
        userId: updatedGoal.owner_id,
        title: 'Félicitations ! Objectif Atteint 🎯',
        message: `Votre coffre "${updatedGoal.title}" a atteint son montant cible de ${parseFloat(updatedGoal.target_amount).toLocaleString('fr-FR')} FCFA !`,
        type: 'SAVINGS_REMINDER',
        payload: { goalId }
      });
    }

    return {
      goal: updatedGoal,
      contribution,
      wallet
    };
  }

  /**
   * Invite un membre dans un coffre collectif par son téléphone
   */
  static async inviteMember({ goalId, phone, inviterUserId }) {
    const cleanPhone = phone.trim();
    let goal = null;
    let userToInvite = null;

    if (pool) {
      try {
        const gRes = await query('SELECT * FROM savings_goals WHERE id = $1 AND type = \'COLLECTIVE\' LIMIT 1', [goalId]);
        if (gRes?.rows?.length > 0) goal = gRes.rows[0];

        const uRes = await query('SELECT * FROM users WHERE phone = $1 LIMIT 1', [cleanPhone]);
        if (uRes?.rows?.length > 0) userToInvite = uRes.rows[0];
      } catch (dbErr) {
        if (process.env.NODE_ENV === 'production') throw dbErr;
      }
    }

    if (!goal) goal = memoryStore.savings_goals.find(g => g.id === goalId && g.type === 'COLLECTIVE');
    if (!goal) throw new Error('Coffre collectif introuvable.');

    if (inviterUserId && goal.owner_id !== inviterUserId) {
      let isInviterMember = false;
      if (pool) {
        try {
          const memCheck = await query('SELECT 1 FROM savings_members WHERE savings_goal_id = $1 AND user_id = $2 LIMIT 1', [goalId, inviterUserId]);
          isInviterMember = memCheck?.rows?.length > 0;
        } catch {
          // fallback
        }
      }
      if (!isInviterMember) {
        isInviterMember = memoryStore.savings_members.some(m => m.savings_goal_id === goalId && m.user_id === inviterUserId);
      }
      if (!isInviterMember) {
        throw new Error('Vous devez être membre ou créateur de ce coffre collectif pour inviter des participants.');
      }
    }

    if (!userToInvite) userToInvite = memoryStore.users.find(u => u.phone === cleanPhone);
    if (!userToInvite) {
      throw new Error(`Aucun compte MoneyLink n’est associé au numéro ${cleanPhone}. Une invitation SMS sera envoyée.`);
    }


    let existingMember = null;
    if (pool) {
      try {
        const mCheck = await query('SELECT * FROM savings_members WHERE savings_goal_id = $1 AND user_id = $2 LIMIT 1', [goalId, userToInvite.id]);
        if (mCheck?.rows?.length > 0) existingMember = mCheck.rows[0];
      } catch (dbErr) {
        if (process.env.NODE_ENV === 'production') throw dbErr;
      }
    }

    if (!existingMember) {
      existingMember = memoryStore.savings_members.find(m => m.savings_goal_id === goalId && m.user_id === userToInvite.id);
    }
    if (existingMember) {
      throw new Error('Cet utilisateur participe déjà à ce coffre collectif.');
    }

    const memberId = uuidv4();
    const nowIso = new Date().toISOString();
    let newMember = {
      id: memberId,
      savings_goal_id: goalId,
      user_id: userToInvite.id,
      role: 'CONTRIBUTOR',
      total_contributed: 0.00,
      joined_at: nowIso
    };

    if (pool) {
      try {
        const insRes = await query(`
          INSERT INTO savings_members (id, savings_goal_id, user_id, role, total_contributed, joined_at)
          VALUES ($1, $2, $3, 'CONTRIBUTOR', 0.00, NOW())
          RETURNING *;
        `, [memberId, goalId, userToInvite.id]);
        if (insRes?.rows?.length > 0) newMember = insRes.rows[0];
      } catch (dbErr) {
        if (process.env.NODE_ENV === 'production') throw dbErr;
      }
    }

    // Miroir memoryStore
    if (!memoryStore.savings_members.some(m => m.savings_goal_id === goalId && m.user_id === userToInvite.id)) {
      memoryStore.savings_members.push(newMember);
    }

    notificationService.sendNotification({
      userId: userToInvite.id,
      title: 'Invitation à une Tontine / Coffre Collectif 🤝',
      message: `Vous avez été invité(e) à participer au coffre "${goal.title}" (Cible: ${parseFloat(goal.target_amount).toLocaleString('fr-FR')} FCFA).`,
      type: 'SAVINGS_REMINDER',
      payload: { goalId }
    });

    return newMember;
  }
}
