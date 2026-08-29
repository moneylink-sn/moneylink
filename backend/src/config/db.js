/**
 * MoneyLink — Configuration & Abstraction Base de Données
 * Prise en charge de PostgreSQL (pg Pool) avec fallback sécurisé
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { initialSeedData } from './seedData.js';

dotenv.config();

const { Pool } = pg;

let pool = null;
let isPostgresConnected = false;

// Stockage mémoire de secours (initialisé avec les seeds de démo) pour tests et développement local autonome
export const memoryStore = JSON.parse(JSON.stringify(initialSeedData));

if (process.env.DATABASE_URL && process.env.USE_SQLITE !== 'true') {
  try {
    const isLocalDb = process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ...(isLocalDb ? {} : { ssl: { rejectUnauthorized: false } })
    });

    pool.on('error', (err) => {
      console.error('⚠️ Avertissement Pool PostgreSQL :', err.message);
    });
  } catch (err) {
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 ERREUR CRITIQUE: Échec d\'initialisation du Pool PostgreSQL en production :', err.message);
      throw err;
    } else {
      console.warn('⚠️ PostgreSQL non configuré localement. Utilisation du mode stockage mémoire de développement.');
    }
  }
}

/**
 * Vérifie activement l'état et la disponibilité de la connexion PostgreSQL (Lecture seule, non destructif)
 */
export async function checkDbHealth() {
  if (!pool) {
    return {
      connected: false,
      mode: process.env.NODE_ENV === 'production' ? 'DISCONNECTED' : 'IN_MEMORY',
      message: process.env.NODE_ENV === 'production'
        ? 'DATABASE_URL manquant ou pool non initialisé'
        : 'Stockage mémoire de développement actif'
    };
  }

  try {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT NOW() as server_time, current_database() as database');
      isPostgresConnected = true;
      return {
        connected: true,
        mode: 'POSTGRESQL',
        database: res.rows[0]?.database || 'moneylink',
        serverTime: res.rows[0]?.server_time
      };
    } finally {
      client.release();
    }
  } catch (err) {
    isPostgresConnected = false;
    return {
      connected: false,
      mode: process.env.NODE_ENV === 'production' ? 'ERROR' : 'IN_MEMORY',
      error: err.message
    };
  }
}

/**
 * Exécute une requête SQL sur PostgreSQL si configuré, ou interagit avec le store de test
 */
export async function query(text, params = []) {
  if (pool) {
    try {
      const client = await pool.connect();
      try {
        const res = await client.query(text, params);
        isPostgresConnected = true;
        return res;
      } finally {
        client.release();
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'production') {
        console.error('🚨 ERREUR REQUÊTE SQL POSTGRESQL (PRODUCTION) :', err.message, { query: text });
        throw err; // En production, ne jamais étouffer les erreurs PostgreSQL silencieusement
      }

      if (!isPostgresConnected) {
        console.info('ℹ️ Note: PostgreSQL non joignable. Utilisation du moteur de données simulé.');
      }
    }
  } else if (process.env.NODE_ENV === 'production') {
    throw new Error('🚨 ERREUR CRITIQUE: PostgreSQL non initialisé en environnement de production.');
  }

  // Fallback dev / memory helper
  return handleMemoryQuery(text, params);
}

/**
 * Helper simple pour requêter le store mémoire quand PostgreSQL n'est pas actif (environnement de dev/test)
 */
function handleMemoryQuery(text, params) {
  return {
    rows: [],
    rowCount: 0
  };
}

export default {
  query,
  checkDbHealth,
  memoryStore,
  pool
};
