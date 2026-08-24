/**
 * MoneyLink — AuthController (Gestion Inscription, Connexion & Profil)
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { memoryStore } from '../config/db.js';
import { AnalyticsService } from '../services/analyticsService.js';

export class AuthController {
  /**
   * Inscription d'un nouvel utilisateur (Client ou Commerçant)
   */
  static async register(req, res, next) {
    try {
      const { phone, email, first_name, last_name, password, role = 'CLIENT' } = req.body;

      // Sécurité : Forcer le rôle à CLIENT ou MERCHANT (interdiction stricte du rôle ADMIN lors de l'inscription publique)
      const assignedRole = (role && role.toString().toUpperCase() === 'MERCHANT') ? 'MERCHANT' : 'CLIENT';

      // Vérification doublon
      const existingUser = memoryStore.users.find(u => u.phone === phone.trim() || u.email.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Un compte avec ce numéro de téléphone ou cette adresse email existe déjà.'
        });
      }

      const password_hash = await bcrypt.hash(password, 10);
      const userId = uuidv4();

      const startDate = new Date();
      const endDate = new Date(Date.now() + 30 * 24 * 3600 * 1000); // 30 jours d'essai gratuit

      const newUser = {
        id: userId,
        phone: phone.trim(),
        email: email.toLowerCase().trim(),
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        password_hash,
        role: assignedRole,
        status: 'ACTIVE',
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${first_name} ${last_name}`,
        subscription_status: 'TRIAL',
        subscription_start_date: startDate.toISOString(),
        subscription_end_date: endDate.toISOString(),
        subscription_price: 500,
        is_trial: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      memoryStore.users.push(newUser);

      // Création automatique du portefeuille (Solde de départ: 0 FCFA)
      const walletId = uuidv4();
      const newWallet = {
        id: walletId,
        user_id: userId,
        available_balance: 0.00,
        locked_balance: 0.00,
        currency: 'XOF'
      };
      memoryStore.wallets.push(newWallet);

      // Si Commerçant, initialisation profil marchand
      if (newUser.role === 'MERCHANT') {
        const merchantId = uuidv4();
        memoryStore.merchants.push({
          id: merchantId,
          user_id: userId,
          business_name: req.body.business_name || `${first_name} Store`,
          business_type: req.body.business_type || 'Commerce Général',
          description: req.body.business_description || '',
          address: req.body.address || 'Dakar, Sénégal',
          city: req.body.city || 'Dakar',
          phone: phone.trim(),
          logo_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200',
          is_verified: false,
          status: 'ACTIVE'
        });
      }

      // Génération Token JWT
      const token = jwt.sign(
        { id: newUser.id, role: newUser.role, phone: newUser.phone },
        process.env.JWT_SECRET || 'moneylink_super_secure_fintech_jwt_secret_key_2026_sn',
        { expiresIn: '7d' }
      );

      // Traçage automatique de l'inscription dans les analytics
      AnalyticsService.recordEvent({
        event_type: 'REGISTER',
        user_id: newUser.id,
        platform: newUser.role === 'MERCHANT' ? 'WEB_ADMIN' : 'MOBILE_APP',
        metadata: { role: newUser.role, email: newUser.email }
      });

      return res.status(201).json({
        success: true,
        message: 'Compte MoneyLink créé avec succès. Votre 1er mois d’essai gratuit (30 jours) est activé !',
        data: {
          user: {
            id: newUser.id,
            phone: newUser.phone,
            email: newUser.email,
            first_name: newUser.first_name,
            last_name: newUser.last_name,
            role: newUser.role,
            avatar_url: newUser.avatar_url,
            subscription_status: newUser.subscription_status,
            subscription_start_date: newUser.subscription_start_date,
            subscription_end_date: newUser.subscription_end_date,
            subscription_price: newUser.subscription_price,
            is_trial: newUser.is_trial
          },
          wallet: newWallet,
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

      const user = memoryStore.users.find(u => 
        u.phone === identifier.trim() || 
        u.email.toLowerCase() === identifier.toLowerCase().trim()
      );

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

      if (user.status !== 'ACTIVE') {
        return res.status(403).json({
          success: false,
          error: 'Ce compte est actuellement suspendu ou en cours de vérification.'
        });
      }

      const wallet = memoryStore.wallets.find(w => w.user_id === user.id);
      const merchant = user.role === 'MERCHANT' ? memoryStore.merchants.find(m => m.user_id === user.id) : null;

      const token = jwt.sign(
        { id: user.id, role: user.role, phone: user.phone },
        process.env.JWT_SECRET || 'moneylink_super_secure_fintech_jwt_secret_key_2026_sn',
        { expiresIn: '7d' }
      );

      // Traçage automatique de la connexion dans les analytics
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
            subscription_price: user.subscription_price || 500,
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
      const user = memoryStore.users.find(u => u.id === req.user.id);
      const wallet = memoryStore.wallets.find(w => w.user_id === req.user.id);
      const merchant = user?.role === 'MERCHANT' ? memoryStore.merchants.find(m => m.user_id === req.user.id) : null;

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
            subscription_price: user.subscription_price || 500,
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
