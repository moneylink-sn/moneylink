/**
 * MoneyLink — Middleware d'Authentification JWT
 */

import jwt from 'jsonwebtoken';
import { memoryStore } from '../config/db.js';

export function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Accès non autorisé. Token d’authentification manquant.'
    });
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET || 'moneylink_super_secure_fintech_jwt_secret_key_2026_sn';

  try {
    const decoded = jwt.verify(token, secret);
    
    // Recherche utilisateur dans le store
    const user = memoryStore.users.find(u => u.id === decoded.id && u.status === 'ACTIVE');
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
