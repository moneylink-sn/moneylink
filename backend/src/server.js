/**
 * MoneyLink — Point d'Entrée Serveur Backend
 */

import dotenv from 'dotenv';
import app from './app.js';

dotenv.config();

// Validation stricte des variables critiques en environnement de production
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'moneylink_super_secure_fintech_jwt_secret_key_2026_sn') {
    console.error('🚨 ERREUR CRITIQUE DE SÉCURITÉ PRODUCTION: JWT_SECRET doit être défini avec une clé cryptographique forte (ex: openssl rand -hex 32).');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('🚨 ERREUR CRITIQUE PRODUCTION: DATABASE_URL (PostgreSQL) doit être configuré.');
    process.exit(1);
  }
}

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log('\n===============================================================');
  console.log('  🚀 MONEYLINK FINTECH API CORE DÉMARRÉE SUR LE PORT ' + PORT);
  console.log('===============================================================');
  console.log(`  🌐 Health Check : http://localhost:${PORT}/api/health`);
  console.log(`  📱 Auth API     : http://localhost:${PORT}/api/auth`);
  console.log(`  🛍️ Orders API   : http://localhost:${PORT}/api/orders`);
  console.log(`  💳 Payments API : http://localhost:${PORT}/api/payments`);
  console.log(`  💰 Savings API  : http://localhost:${PORT}/api/savings`);
  console.log(`  🛡️ Admin API    : http://localhost:${PORT}/api/admin`);
  console.log('===============================================================\n');
});

// Gestion propre des erreurs de démarrage du serveur (ex: Port déjà utilisé)
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ ERREUR SERVEUR: Le port ${PORT} est déjà utilisé par une autre instance.`);
    console.error(`👉 Solution : Libérez le port ${PORT} ou définissez un autre port via PORT=xxxx dans votre .env.\n`);
    process.exit(1);
  } else {
    console.error('❌ Erreur inattendue du serveur HTTP :', err);
    process.exit(1);
  }
});

process.on('unhandledRejection', (err) => {
  console.error('🔥 Erreur Asynchrone Non Gérée :', err);
});

process.on('SIGTERM', () => {
  console.info('Signal SIGTERM reçu. Arrêt gracieux du serveur MoneyLink...');
  server.close(() => {
    console.info('Serveur MoneyLink arrêté.');
  });
});

export default server;
