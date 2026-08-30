/**
 * MoneyLink — Middleware de Contrôle des Rôles (RBAC) & Sécurité Super Admin
 */

export const SUPER_ADMIN_CONFIG = {
  id: 'a0000000-0000-0000-0000-000000000001',
  email: 'admin@moneylink.sn',
  phone: '+221770000001',
  personalPhone: '+221 76 611 12 39',
  name: 'Codé Samb',
  role: 'ADMIN'
};

/**
 * Middleware RBAC standard
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Utilisateur non authentifié.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Accès interdit. Rôle requis : [${allowedRoles.join(', ')}]. Votre rôle : ${req.user.role}`
      });
    }

    next();
  };
}

/**
 * Middleware Strict Super Admin
 * L'accès à /admin et /api/admin/* est STRICTEMENT PRIVÉ et réservé à Codé Samb.
 * Un simple rôle ADMIN ne suffit pas. Vérification stricte de l'identité côté backend.
 */
export function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Accès non autorisé. Authentification requise.'
    });
  }

  // 1. Contrôle du rôle ADMIN
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Accès strictement interdit. La console d’administration est réservée au Super Administrateur.'
    });
  }

  // 2. Vérification de l'identité du Super Administrateur Codé Samb
  const isSuperAdminId = req.user.id === SUPER_ADMIN_CONFIG.id;
  const isSuperAdminEmail = req.user.email && req.user.email.trim().toLowerCase() === SUPER_ADMIN_CONFIG.email.toLowerCase();
  
  const cleanUserPhone = (req.user.phone || '').replace(/[\s+-]/g, '');
  const cleanAdminPhone = SUPER_ADMIN_CONFIG.phone.replace(/[\s+-]/g, '');
  const isSuperAdminPhone = cleanUserPhone === cleanAdminPhone || cleanUserPhone.endsWith('770000001');

  if (!isSuperAdminId && !isSuperAdminEmail && !isSuperAdminPhone) {
    return res.status(403).json({
      success: false,
      error: 'Accès refusé. Seul le Super Administrateur autorisé (Codé Samb) peut accéder à cette ressource.'
    });
  }

  next();
}
