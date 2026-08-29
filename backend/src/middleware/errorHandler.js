/**
 * MoneyLink — Gestionnaire d'Erreurs Centralisé
 */

export function errorHandler(err, req, res, next) {
  console.error('🔥 Erreur Serveur MoneyLink :', err);

  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  const message = (isProduction && statusCode === 500)
    ? 'Une erreur interne est survenue sur le serveur.'
    : (err.message || 'Une erreur interne est survenue sur le serveur.');

  res.status(statusCode).json({
    success: false,
    error: message,
    stack: !isProduction ? err.stack : undefined
  });
}
