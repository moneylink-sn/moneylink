/**
 * MoneyLink — SubscriptionController
 * Moteur d'abonnement : 1er mois gratuit (30j), puis 500 FCFA/mois (Wave / Orange Money)
 * Prise en charge PostgreSQL avec fallback mémoire
 */

import { v4 as uuidv4 } from 'uuid';
import { memoryStore, query, pool } from '../config/db.js';

export class SubscriptionController {
  /**
   * Récupère le statut d'abonnement de l'utilisateur connecté
   */
  static async getStatus(req, res, next) {
    try {
      let user = null;

      // 1. Recherche dans PostgreSQL si configuré
      if (pool) {
        try {
          const userRes = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [req.user.id]);
          if (userRes && userRes.rows && userRes.rows.length > 0) {
            user = userRes.rows[0];
          }
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      // 2. Fallback memoryStore
      if (!user) {
        user = memoryStore.users.find(u => u.id === req.user.id);
      }

      if (!user) {
        return res.status(404).json({ success: false, error: 'Utilisateur non trouvé.' });
      }

      const now = new Date();
      const endDate = user.subscription_end_date ? new Date(user.subscription_end_date) : new Date(Date.now() + 30 * 24 * 3600 * 1000);
      const diffTime = endDate.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      let effectiveStatus = user.subscription_status || 'TRIAL';
      if (daysRemaining <= 0 && effectiveStatus !== 'SUSPENDED') {
        effectiveStatus = 'EXPIRED';
      }

      return res.status(200).json({
        success: true,
        data: {
          subscriptionStatus: effectiveStatus,
          isTrial: user.is_trial ?? (effectiveStatus === 'TRIAL'),
          price: user.subscription_price || 500,
          currency: 'XOF',
          startDate: user.subscription_start_date || user.created_at,
          endDate: endDate.toISOString(),
          daysRemaining,
          planName: 'MoneyLink Premium',
          monthlyFeeFCFA: 500,
          trialPeriodDays: 30,
          supportedGateways: [
            { id: 'WAVE', name: 'Wave Sénégal', fee: 0, logo: 'wave' },
            { id: 'ORANGE_MONEY', name: 'Orange Money Sénégal', fee: 0, logo: 'orange_money' }
          ]
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Initialise un paiement d'abonnement de 500 FCFA via Wave ou Orange Money
   */
  static async initiatePayment(req, res, next) {
    try {
      const { payment_method = 'WAVE', phone } = req.body;
      let user = null;

      // 1. Recherche dans PostgreSQL si configuré
      if (pool) {
        try {
          const userRes = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [req.user.id]);
          if (userRes && userRes.rows && userRes.rows.length > 0) {
            user = userRes.rows[0];
          }
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      // 2. Fallback memoryStore
      if (!user) {
        user = memoryStore.users.find(u => u.id === req.user.id);
      }

      if (!user) {
        return res.status(404).json({ success: false, error: 'Utilisateur non trouvé.' });
      }

      const methodUpper = payment_method.toUpperCase();
      if (!['WAVE', 'ORANGE_MONEY'].includes(methodUpper)) {
        return res.status(400).json({
          success: false,
          error: 'Moyen de paiement non supporté. Veuillez choisir Wave ou Orange Money.'
        });
      }

      const paymentReference = `SUB-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;
      const amount = 500; // 500 FCFA

      // Structure de préparation d'intention de paiement sécurisée
      const paymentIntent = {
        id: uuidv4(),
        reference: paymentReference,
        userId: user.id,
        userPhone: phone || user.phone,
        userName: `${user.first_name} ${user.last_name}`,
        amount,
        currency: 'XOF',
        provider: methodUpper,
        status: 'PENDING_PROVIDER_VALIDATION',
        description: 'Renouvellement abonnement MoneyLink Premium (30 jours)',
        createdAt: new Date().toISOString(),
        metadata: {
          note: 'Architecture prête pour webhook passerelle Wave / Orange Money.',
          nextExpirationDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
        }
      };

      return res.status(200).json({
        success: true,
        message: `Intention de paiement de 500 FCFA initialisée via ${methodUpper === 'WAVE' ? 'Wave' : 'Orange Money'}.`,
        data: {
          paymentIntent,
          paymentUrl: methodUpper === 'WAVE' ? `https://pay.wave.com/c/moneylink-${paymentReference}` : `https://om.orange.sn/pay/moneylink-${paymentReference}`,
          instructions: methodUpper === 'WAVE'
            ? 'Ouvrez votre application Wave pour valider le paiement sécurisé de 500 FCFA.'
            : 'Composez le #144# ou validez la notification Orange Money Max pour confirmer le paiement de 500 FCFA.'
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Liste tous les abonnements pour la console d'administration
   */
  static async listAdminSubscriptions(req, res, next) {
    try {
      const { status, role, search } = req.query;
      const now = new Date();

      let allUsers = [];
      let allWallets = [];

      if (pool) {
        try {
          const usersRes = await query('SELECT * FROM users ORDER BY created_at DESC');
          const walletsRes = await query('SELECT * FROM wallets');
          if (usersRes && usersRes.rows && usersRes.rows.length > 0) {
            allUsers = usersRes.rows;
            allWallets = walletsRes?.rows || [];
          }
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      if (allUsers.length === 0) {
        allUsers = memoryStore.users;
        allWallets = memoryStore.wallets;
      }

      let subscribers = allUsers.map(u => {
        const endDate = u.subscription_end_date ? new Date(u.subscription_end_date) : new Date(Date.now() + 30 * 24 * 3600 * 1000);
        const diffTime = endDate.getTime() - now.getTime();
        const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

        let effectiveStatus = u.subscription_status || (u.is_trial ? 'TRIAL' : 'ACTIVE');
        if (daysRemaining <= 0 && effectiveStatus !== 'SUSPENDED') {
          effectiveStatus = 'EXPIRED';
        }

        const wallet = allWallets.find(w => w.user_id === u.id);

        return {
          id: u.id,
          phone: u.phone,
          email: u.email,
          fullName: `${u.first_name} ${u.last_name}`,
          role: u.role,
          subscriptionStatus: effectiveStatus,
          isTrial: u.is_trial ?? (effectiveStatus === 'TRIAL'),
          startDate: u.subscription_start_date || u.created_at,
          endDate: endDate.toISOString(),
          daysRemaining,
          price: u.subscription_price || 500,
          currency: 'XOF',
          walletBalance: wallet?.available_balance || 0,
          createdAt: u.created_at
        };
      });

      // Statistiques globales
      const stats = {
        totalUsers: subscribers.length,
        trialCount: subscribers.filter(s => s.subscriptionStatus === 'TRIAL').length,
        activeCount: subscribers.filter(s => s.subscriptionStatus === 'ACTIVE').length,
        expiredCount: subscribers.filter(s => s.subscriptionStatus === 'EXPIRED').length,
        suspendedCount: subscribers.filter(s => s.subscriptionStatus === 'SUSPENDED').length,
        estimatedMonthlyRevenueFCFA: subscribers.filter(s => s.subscriptionStatus === 'ACTIVE').length * 500,
        monthlySubscriptionPriceFCFA: 500
      };

      // Filtres
      if (status && status !== 'ALL') {
        subscribers = subscribers.filter(s => s.subscriptionStatus.toUpperCase() === status.toUpperCase());
      }
      if (role && role !== 'ALL') {
        subscribers = subscribers.filter(s => s.role.toUpperCase() === role.toUpperCase());
      }
      if (search) {
        const queryLower = search.toLowerCase();
        subscribers = subscribers.filter(s =>
          s.fullName.toLowerCase().includes(queryLower) ||
          s.phone.includes(queryLower) ||
          s.email.toLowerCase().includes(queryLower)
        );
      }

      return res.status(200).json({
        success: true,
        data: {
          stats,
          subscribers
        }
      });
    } catch (err) {
      next(err);
    }
  }
}
