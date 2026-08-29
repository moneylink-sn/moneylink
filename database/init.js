/**
 * MoneyLink — Script d'Initialisation & Migration Sécurisé de la Base de Données
 * Protège contre la suppression accidentelle des données existantes en production.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Résolution de pg et dotenv (workspace root ou backend)
let pg, dotenv;
try {
  pg = require('pg');
} catch {
  pg = require(path.join(__dirname, '..', 'backend', 'node_modules', 'pg'));
}

try {
  dotenv = require('dotenv');
} catch {
  dotenv = require(path.join(__dirname, '..', 'backend', 'node_modules', 'dotenv'));
}

// Chargement des variables d'environnement
dotenv.config({ path: path.join(__dirname, '..', 'backend', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Client } = pg;

async function runInit() {
  console.log('====================================================');
  console.log('  🐘 MoneyLink PostgreSQL Database Initializer');
  console.log('====================================================\n');

  const schemaPath = path.join(__dirname, 'schema.sql');
  const seedPath = path.join(__dirname, 'seeds', 'seed.sql');

  if (!fs.existsSync(schemaPath)) {
    console.error('❌ Erreur: Le fichier database/schema.sql est introuvable.');
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.log('ℹ️ Aucune variable DATABASE_URL détectée.');
    console.log('✅ Schéma PostgreSQL prêt : database/schema.sql');
    console.log('✅ Seeds de démo prêts    : database/seeds/seed.sql');
    const migrationsDir = path.join(__dirname, 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
      console.log(`✅ Migrations prêtes (${files.length}) : database/migrations/ [ ${files.join(', ')} ]\n`);
    }
    console.log('Pour exécuter manuellement :');
    console.log('  psql $DATABASE_URL -f database/schema.sql');
    console.log('  psql $DATABASE_URL -f database/migrations/001_create_analytics_events.sql\n');
    console.log('====================================================');
    return;
  }

  const isLocal = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
  const client = new Client({
    connectionString: databaseUrl,
    ssl: isLocal ? false : { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Connexion à la base PostgreSQL existante...');
    await client.connect();
    console.log('✅ Connexion établie avec succès.');

    // Vérification des tables existantes pour éviter toute écrasement accidentel
    const checkTablesRes = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
    );

    const existingTables = checkTablesRes.rows.map(r => r.table_name);
    const hasExistingTables = existingTables.length > 0;
    const forceSchema = process.argv.includes('--force-schema');

    if (hasExistingTables && !forceSchema) {
      console.log(`\n🛡️ PROTECTION DES DONNÉES : ${existingTables.length} table(s) existante(s) détectée(s) :`);
      console.log(`   [ ${existingTables.slice(0, 5).join(', ')}${existingTables.length > 5 ? '...' : ''} ]`);
      console.log('⚠️ Aucune modification destructive effectuée. Les données existantes sont préservées intactes.');
      console.log('ℹ️ Pour forcer l\'écrasement complet du schéma (développement uniquement), passez l\'option : --force-schema\n');

      // Exécution des migrations incrémentales non-destructives
      await applyMigrations(client);
    } else {
      console.log('📦 Application du schéma complet (database/schema.sql)...');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schemaSql);
      console.log('✅ Schéma PostgreSQL appliqué avec succès.');

      // Application des migrations pour cohérence
      await applyMigrations(client);

      const shouldSeed = process.argv.includes('--seed') || process.env.DATABASE_SEED === 'true';
      if (shouldSeed && fs.existsSync(seedPath)) {
        console.log('🌱 Injection des données de test initiales (seeds)...');
        const seedSql = fs.readFileSync(seedPath, 'utf8');
        await client.query(seedSql);
        console.log('✅ Seeds injectés.');
      }
    }

    console.log('🎉 Opération PostgreSQL MoneyLink terminée avec succès.');
  } catch (err) {
    console.error('❌ Erreur lors de l\'opération PostgreSQL :', err.message || err.code || err);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
    console.log('====================================================');
  }
}

/**
 * Exécute de façon séquentielle et non-destructive toutes les migrations SQL
 */
async function applyMigrations(client) {
  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    return;
  }

  console.log(`🔄 Vérification et application des migrations (${files.length} fichier(s) détecté(s))...`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    try {
      await client.query(sql);
      console.log(`  ✅ Migration [${file}] appliquée avec succès (non-destructive).`);
    } catch (migErr) {
      console.error(`  ⚠️ Erreur sur la migration [${file}] :`, migErr.message);
      throw migErr;
    }
  }
}

runInit();
