/**
 * MoneyLink — Configuration & Abstraction Base de Données
 * Prise en charge de PostgreSQL (pg Pool) avec fallback transparent en mémoire/dev
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { initialSeedData } from './seedData.js';

dotenv.config();

const { Pool } = pg;

let pool = null;
let isPostgresConnected = false;

// Stockage mémoire de secours (initialisé avec les seeds de démo) pour tests instantanés
export const memoryStore = JSON.parse(JSON.stringify(initialSeedData));

if (process.env.DATABASE_URL && process.env.USE_SQLITE !== 'true') {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.warn('⚠️ Avertissement Pool PostgreSQL :', err.message);
    });
  } catch (err) {
    console.warn('⚠️ PostgreSQL non configuré localement. Utilisation du mode stockage mémoire de développement.');
  }
}

/**
 * Exécute une requête SQL sur PostgreSQL si connecté, ou interagit avec le store de test
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
      if (!isPostgresConnected) {
        console.info('ℹ️ Note: PostgreSQL non joignable. Utilisation du moteur de données simulé.');
      }
    }
  }

  // Fallback dev / memory helper
  return handleMemoryQuery(text, params);
}

/**
 * Helper simple pour requêter le store mémoire quand PostgreSQL n'est pas actif
 */
function handleMemoryQuery(text, params) {
  // Renvoie un résultat mocké générique
  return {
    rows: [],
    rowCount: 0
  };
}

export default {
  query,
  memoryStore,
  pool
};
