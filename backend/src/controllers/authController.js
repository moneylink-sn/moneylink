/**
 * MoneyLink — AuthController (Gestion Inscription, Connexion & Profil)
 * Support natif PostgreSQL avec transactions ACID et fallback sécurisé mémoire
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { memoryStore, query, withTransaction, pool, isPostgresActive } from '../config/db.js';
import { AnalyticsService } from '../services/analyticsService.js';

/**
 * Helper sécurisé pour récupérer le secret JWT sans fallback hardcodé en production
 */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('🚨 ERREUR CRITIQUE PRODUCTION: JWT_SECRET manquant.');
    }
    return 'moneylink_super_secure_fintech_jwt_secret_key_2026_sn';
  }
  return secret;
}

export class AuthController {
  /**
   * Inscription d'un nouvel utilisateur (Client ou Commerçant)
   */
  static async register(req, res, next) {
    try {
      const { phone, email, first_name, last_name, password, role = 'CLIENT' } = req.body;

      // Sécurité : Forcer le rôle à CLIENT ou MERCHANT (interdiction stricte du rôle ADMIN lors de l'inscription publique)
      const assignedRole = (role && role.toString().toUpperCase() === 'MERCHANT') ? 'MERCHANT' : 'CLIENT';
      const cleanPhone = phone.trim();
      const cleanEmail = email.toLowerCase().trim();
      const cleanFirstName = first_name.trim();
      const cleanLastName = last_name.trim();

      // 1. Vérification doublon en PostgreSQL ou store mémoire
      let existingUser = null;
      if (pool) {
        try {
          const checkRes = await query(
            'SELECT id, phone, email FROM users WHERE phone = $1 OR LOWER(email) = LOWER($2) LIMIT 1',
            [cleanPhone, cleanEmail]
          );
          if (checkRes && checkRes.rows && checkRes.rows.length > 0) {
            existingUser = checkRes.rows[0];
          }
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      if (!existingUser) {
        existingUser = memoryStore.users.find(u => u.phone === cleanPhone || u.email.toLowerCase() === cleanEmail);
      }

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Un compte avec ce numéro de téléphone ou cette adresse email existe déjà.'
        });
      }

      const password_hash = await bcrypt.hash(password, 10);
      const userId = uuidv4();
      const walletId = uuidv4();
      const merchantId = uuidv4();
      const startDate = new Date();
      const endDate = new Date(Date.now() + 30 * 24 * 3600 * 1000); // 30 jours d'essai gratuit
      const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${cleanFirstName} ${cleanLastName}`;

      let createdUser = null;
      let createdWallet = null;
      let createdMerchant = null;

      // 2. Insertion transactionnelle dans PostgreSQL
      if (pool) {
        try {
          await withTransaction(async (client) => {
            if (client) {
              // 2a. Insertion User
              const userInsertSql = `
                INSERT INTO users (
                  id, phone, email, first_name, last_name, password_hash, role, status,
                  avatar_url, subscription_status, subscription_start_date, subscription_end_date,
                  subscription_price, is_trial, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
                RETURNING id, phone, email, first_name, last_name, role, status, avatar_url,
                          subscription_status, subscription_start_date, subscription_end_date,
                          subscription_price, is_trial, created_at, updated_at
              `;
              const userRes = await client.query(userInsertSql, [
                userId,
                cleanPhone,
                cleanEmail,
                cleanFirstName,
                cleanLastName,
                password_hash,
                assignedRole,
                'ACTIVE',
                avatarUrl,
                'TRIAL',
                startDate.toISOString(),
                endDate.toISOString(),
                500.00,
                true
              ]);
              createdUser = userRes.rows[0];

              // 2b. Insertion Wallet
              const walletInsertSql = `
                INSERT INTO wallets (id, user_id, available_balance, locked_balance, currency, created_at, updated_at)
                VALUES ($1, $2, 0.00, 0.00, 'XOF', NOW(), NOW())
                RETURNING id, user_id, available_balance, locked_balance, currency, created_at, updated_at
              `;
              const walletRes = await client.query(walletInsertSql, [walletId, userId]);
              createdWallet = walletRes.rows[0];

              // 2c. Insertion Merchant (si rôle MERCHANT)
              if (assignedRole === 'MERCHANT') {
                const merchantInsertSql = `
                  INSERT INTO merchants (
                    id, user_id, business_name, business_type, description, address, city,
                    phone, logo_url, is_verified, status, created_at, updated_at
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, 'ACTIVE', NOW(), NOW())
                  RETURNING id, user_id, business_name, business_type, description, address, city,
                            phone, logo_url, is_verified, status, created_at, updated_at
                `;
                const merchantRes = await client.query(merchantInsertSql, [
                  merchantId,
                  userId,
                  req.body.business_name || `${cleanFirstName} Store`,
                  req.body.business_type || 'Commerce Général',
                  req.body.business_description || '',
                  req.body.address || 'Dakar, Sénégal',
                  req.body.city || 'Dakar',
                  cleanPhone,
                  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200'
                ]);
                createdMerchant = merchantRes.rows[0];
              }

              // 2d. Insertion Abonnement Initial (Trial 30j)
              const subscriptionId = uuidv4();
              await client.query(`
                INSERT INTO subscriptions (
                  id, user_id, plan_name, amount, currency, status, is_trial, start_date, end_date, created_at, updated_at
                ) VALUES ($1, $2, 'MoneyLink Premium', 500.00, 'XOF', 'TRIAL', true, $3, $4, NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
              `, [subscriptionId, userId, startDate.toISOString(), endDate.toISOString()]);
            }
          });
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
          createdUser = null;
        }
      }

      // 3. Fallback mémoire pour développement / tests locaux autonomes
      if (!createdUser) {
        createdUser = {
          id: userId,
          phone: cleanPhone,
          email: cleanEmail,
          first_name: cleanFirstName,
          last_name: cleanLastName,
          password_hash,
          role: assignedRole,
          status: 'ACTIVE',
          avatar_url: avatarUrl,
          subscription_status: 'TRIAL',
          subscription_start_date: startDate.toISOString(),
          subscription_end_date: endDate.toISOString(),
          subscription_price: 500,
          is_trial: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        createdWallet = {
          id: walletId,
          user_id: userId,
          available_balance: 0.00,
          locked_balance: 0.00,
          currency: 'XOF'
        };
        if (assignedRole === 'MERCHANT') {
          createdMerchant = {
            id: merchantId,
            user_id: userId,
            business_name: req.body.business_name || `${cleanFirstName} Store`,
            business_type: req.body.business_type || 'Commerce Général',
            description: req.body.business_description || '',
            address: req.body.address || 'Dakar, Sénégal',
            city: req.body.city || 'Dakar',
            phone: cleanPhone,
            logo_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200',
            is_verified: false,
            status: 'ACTIVE'
          };
        }
      }

      // Miroir en mémoire pour tests et fallback
      if (!memoryStore.users.some(u => u.id === createdUser.id)) {
        memoryStore.users.push(createdUser);
      }
      if (createdWallet && !memoryStore.wallets.some(w => w.id === createdWallet.id)) {
        memoryStore.wallets.push(createdWallet);
      }
      if (createdMerchant && !memoryStore.merchants.some(m => m.id === createdMerchant.id)) {
        memoryStore.merchants.push(createdMerchant);
      }

      // 4. Génération Token JWT
      const jwtSecret = getJwtSecret();
      const token = jwt.sign(
        { id: createdUser.id, role: createdUser.role, phone: createdUser.phone },
        jwtSecret,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // 5. Traçage automatique dans les analytics (non bloquant)
      AnalyticsService.recordEvent({
        event_type: 'REGISTER',
        user_id: createdUser.id,
        platform: createdUser.role === 'MERCHANT' ? 'WEB_ADMIN' : 'MOBILE_APP',
        metadata: { role: createdUser.role, email: createdUser.email }
      });

      return res.status(201).json({
        success: true,
        message: 'Compte MoneyLink créé avec succès. Votre 1er mois d’essai gratuit (30 jours) est activé !',
        data: {
          user: {
            id: createdUser.id,
            phone: createdUser.phone,
            email: createdUser.email,
            first_name: createdUser.first_name,
            last_name: createdUser.last_name,
            role: createdUser.role,
            avatar_url: createdUser.avatar_url,
            subscription_status: createdUser.subscription_status,
            subscription_start_date: createdUser.subscription_start_date,
            subscription_end_date: createdUser.subscription_end_date,
            subscription_price: parseFloat(createdUser.subscription_price) || 500,
            is_trial: createdUser.is_trial
          },
          wallet: createdWallet,
          merchant: createdMerchant,
          token
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Connexion
   */
  static async login(req, res, next) {
    try {
      const { identifier, password } = req.body; // identifier = phone ou email

      if (!identifier || !password) {
        return res.status(400).json({
          success: false,
          error: 'Identifiant (téléphone ou email) et mot de passe obligatoires.'
        });
      }

      const cleanIdentifier = identifier.trim();
      let user = null;
      let wallet = null;
      let merchant = null;

      // 1. Recherche dans PostgreSQL si configuré
      if (pool) {
        try {
          const userRes = await query(
            'SELECT * FROM users WHERE phone = $1 OR LOWER(email) = LOWER($1) LIMIT 1',
            [cleanIdentifier]
          );
          if (userRes && userRes.rows && userRes.rows.length > 0) {
            user = userRes.rows[0];
            const walletRes = await query('SELECT * FROM wallets WHERE user_id = $1 LIMIT 1', [user.id]);
            wallet = walletRes?.rows?.[0] || null;

            if (user.role === 'MERCHANT') {
              const merchantRes = await query('SELECT * FROM merchants WHERE user_id = $1 LIMIT 1', [user.id]);
              merchant = merchantRes?.rows?.[0] || null;
            }
          }
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      // 2. Fallback memoryStore si non trouvé en base (mode dev / tests)
      if (!user) {
        user = memoryStore.users.find(u =>
          u.phone === cleanIdentifier ||
          u.email.toLowerCase() === cleanIdentifier.toLowerCase()
        );
        if (user) {
          wallet = memoryStore.wallets.find(w => w.user_id === user.id) || null;
          merchant = user.role === 'MERCHANT' ? memoryStore.merchants.find(m => m.user_id === user.id) || null : null;
        }
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Identifiants invalides.'
        });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Identifiants invalides.'
        });
      }

      if (String(user.status || '').trim().toUpperCase() !== 'ACTIVE') {
        return res.status(403).json({
          success: false,
          error: 'Ce compte est actuellement suspendu ou en cours de vérification.'
        });
      }

      // 3. Génération Token JWT
      const jwtSecret = getJwtSecret();
      const token = jwt.sign(
        { id: user.id, role: user.role, phone: user.phone },
        jwtSecret,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // 4. Traçage automatique dans les analytics (non bloquant)
      AnalyticsService.recordEvent({
        event_type: 'LOGIN',
        user_id: user.id,
        platform: user.role === 'ADMIN' ? 'WEB_ADMIN' : 'MOBILE_APP',
        metadata: { role: user.role, email: user.email }
      });

      return res.status(200).json({
        success: true,
        message: 'Connexion réussie.',
        data: {
          user: {
            id: user.id,
            phone: user.phone,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            avatar_url: user.avatar_url,
            subscription_status: user.subscription_status || 'TRIAL',
            subscription_start_date: user.subscription_start_date,
            subscription_end_date: user.subscription_end_date,
            subscription_price: parseFloat(user.subscription_price) || 500,
            is_trial: user.is_trial ?? true
          },
          wallet,
          merchant,
          token
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Profil de l'utilisateur connecté
   */
  static async getProfile(req, res, next) {
    try {
      let user = null;
      let wallet = null;
      let merchant = null;

      // 1. Recherche dans PostgreSQL si configuré
      if (pool) {
        try {
          const userRes = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [req.user.id]);
          if (userRes && userRes.rows && userRes.rows.length > 0) {
            user = userRes.rows[0];
            const walletRes = await query('SELECT * FROM wallets WHERE user_id = $1 LIMIT 1', [req.user.id]);
            wallet = walletRes?.rows?.[0] || null;

            if (user.role === 'MERCHANT') {
              const merchantRes = await query('SELECT * FROM merchants WHERE user_id = $1 LIMIT 1', [req.user.id]);
              merchant = merchantRes?.rows?.[0] || null;
            }
          }
        } catch (dbErr) {
          if (process.env.NODE_ENV === 'production') throw dbErr;
        }
      }

      // 2. Fallback memoryStore si non trouvé en base (mode dev / tests)
      if (!user) {
        user = memoryStore.users.find(u => u.id === req.user.id);
        wallet = memoryStore.wallets.find(w => w.user_id === req.user.id) || null;
        merchant = user?.role === 'MERCHANT' ? memoryStore.merchants.find(m => m.user_id === req.user.id) || null : null;
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Utilisateur introuvable.'
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            phone: user.phone,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            status: user.status,
            avatar_url: user.avatar_url,
            subscription_status: user.subscription_status || 'TRIAL',
            subscription_start_date: user.subscription_start_date,
            subscription_end_date: user.subscription_end_date,
            subscription_price: parseFloat(user.subscription_price) || 500,
            is_trial: user.is_trial ?? true,
            created_at: user.created_at
          },
          wallet,
          merchant
        }
      });
    } catch (err) {
      next(err);
    }
  }
}
