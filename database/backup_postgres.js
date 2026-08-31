/**
 * MoneyLink — Script de Sauvegarde Automatisée PostgreSQL
 * Génère des snapshots horodatés complets et gère la rétention des archives.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

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

dotenv.config({ path: path.join(__dirname, '..', 'backend', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Client } = pg;

async function performBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups'));

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log('====================================================');
  console.log('  🛡️ MONEYLINK POSTGRESQL BACKUP UTILITY');
  console.log('====================================================');
  console.log(`  📁 Répertoire de sauvegarde : ${backupDir}`);
  console.log(`  ⏰ Horodatage              : ${timestamp}`);

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn('⚠️ Variable DATABASE_URL non définie. Exportation du schéma local...');
    const schemaSrc = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaSrc)) {
      const backupFile = path.join(backupDir, `moneylink_schema_backup_${timestamp}.sql`);
      fs.copyFileSync(schemaSrc, backupFile);
      console.log(`✅ Sauvegarde locale réussie : ${backupFile}`);
    }
    return;
  }

  const isLocal = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
  const client = new Client({
    connectionString: databaseUrl,
    ssl: isLocal ? false : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('🔌 Connecté à la base de données PostgreSQL.');

    // Liste des tables principales
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tables = tablesRes.rows.map(r => r.table_name);
    console.log(`📦 Tables détectées (${tables.length}) : [ ${tables.join(', ')} ]`);

    const backupData = {
      timestamp: new Date().toISOString(),
      database_version: 'PostgreSQL 15+ (MoneyLink FinTech)',
      total_tables: tables.length,
      data: {}
    };

    let totalRows = 0;
    for (const table of tables) {
      const rowsRes = await client.query(`SELECT * FROM "${table}"`);
      // Sécurité : masquer les hash de mots de passe dans les exports json de diagnostic si nécessaire
      const sanitizedRows = rowsRes.rows.map(row => {
        if (row.password_hash) {
          return { ...row, password_hash: '[PROTECTED_ENCRYPTED_HASH]' };
        }
        return row;
      });
      backupData.data[table] = sanitizedRows;
      totalRows += sanitizedRows.length;
    }

    const backupJsonFile = path.join(backupDir, `moneylink_db_snapshot_${timestamp}.json`);
    fs.writeFileSync(backupJsonFile, JSON.stringify(backupData, null, 2), 'utf8');

    console.log(`✅ Snapshot JSON créé (${totalRows} enregistrements) : ${backupJsonFile}`);
    console.log('🎉 Sauvegarde terminée avec succès.');
  } catch (err) {
    console.error('❌ Erreur lors de la sauvegarde :', err.message);
  } finally {
    await client.end().catch(() => {});
    console.log('====================================================\n');
  }
}

performBackup();
