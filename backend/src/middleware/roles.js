/**
 * MoneyLink — Middleware de Contrôle des Rôles (RBAC)
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
