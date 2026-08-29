/**
 * MoneyLink — Middleware d'Authentification JWT
 * Vérification sur PostgreSQL avec fallback sécurisé mémoire
 */

import jwt from 'jsonwebtoken';
import { memoryStore, query, pool } from '../config/db.js';

/**
 * Helper de récupération sécurisée du secret JWT
 */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || (process.env.NODE_ENV === 'production' && secret === 'moneylink_super_secure_fintech_jwt_secret_key_2026_sn')) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('🚨 ERREUR CRITIQUE PRODUCTION: JWT_SECRET manquant ou non sécurisé.');
    }
    return 'moneylink_super_secure_fintech_jwt_secret_key_2026_sn';
  }
  return secret;
}

export async function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Accès non autorisé. Token d’authentification manquant.'
    });
  }

  const token = authHeader.split(' ')[1];

  let secret;
  try {
    secret = getJwtSecret();
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Erreur interne de configuration de sécurité.'
    });
  }

  try {
    const decoded = jwt.verify(token, secret);
    let user = null;

    // 1. Recherche dans PostgreSQL si configuré
    if (pool) {
      try {
        const userRes = await query(
          'SELECT id, phone, email, first_name, last_name, role, status FROM users WHERE id = $1 AND UPPER(TRIM(status)) = $2 LIMIT 1',
          [decoded.id, 'ACTIVE']
        );
        if (userRes && userRes.rows && userRes.rows.length > 0) {
          user = userRes.rows[0];
        }
      } catch (dbErr) {
        if (process.env.NODE_ENV === 'production') throw dbErr;
      }
    }

    // 2. Fallback memoryStore si non trouvé en base (mode dev / tests)
    if (!user) {
      user = memoryStore.users.find(u => u.id === decoded.id && String(u.status || '').trim().toUpperCase() === 'ACTIVE');
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Utilisateur introuvable ou compte suspendu.'
      });
    }

    req.user = {
      id: user.id,
      phone: user.phone,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role
    };

    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      error: 'Token invalide ou expiré.'
    });
  }
}
