/**
 * MoneyLink — Gestionnaire d'Erreurs Centralisé
 */

export function errorHandler(err, req, res, next) {
  console.error('🔥 Erreur Serveur MoneyLink :', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Une erreur interne est survenue sur le serveur.';

  res.status(statusCode).json({
    success: false,
    error: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}
