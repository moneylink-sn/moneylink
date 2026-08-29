/**
 * MoneyLink — Script d'Initialisation & Migration Sécurisé de la Base de Données
 * Protège contre la suppression accidentelle des données existantes en production.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    console.log('✅ Seeds de démo prêts    : database/seeds/seed.sql\n');
    console.log('Pour exécuter manuellement :');
    console.log('  psql $DATABASE_URL -f database/schema.sql\n');
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
    } else {
      console.log('📦 Application du schéma (database/schema.sql)...');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schemaSql);
      console.log('✅ Schéma PostgreSQL appliqué avec succès.');

      const shouldSeed = process.argv.includes('--seed') || process.env.DATABASE_SEED === 'true';
      if (shouldSeed && fs.existsSync(seedPath)) {
        console.log('🌱 Injection des données de test initiales (seeds)...');
        const seedSql = fs.readFileSync(seedPath, 'utf8');
        await client.query(seedSql);
        console.log('✅ Seeds injectés.');
      }
    }

    console.log('🎉 Diagnostic PostgreSQL MoneyLink terminé.');
  } catch (err) {
    console.error('❌ Erreur lors de l\'opération PostgreSQL :', err.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('====================================================');
  }
}

runInit();
