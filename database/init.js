/**
 * MoneyLink — Script d'initialisation de la base de données
 * Initialise les tables et injecte les seeds de démonstration
 */

const fs = require('fs');
const path = require('path');

async function runInit() {
    console.log('====================================================');
    console.log('  MoneyLink Database Initializer (PostgreSQL / SQLite)');
    console.log('====================================================\n');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const seedPath = path.join(__dirname, 'seeds', 'seed.sql');

    if (!fs.existsSync(schemaPath) || !fs.existsSync(seedPath)) {
        console.error('❌ Erreur: Les fichiers schema.sql ou seeds/seed.sql sont introuvables.');
        process.exit(1);
    }

    console.log('✅ Schéma PostgreSQL prêt : database/schema.sql');
    console.log('✅ Schéma SQLite prêt     : database/sqlite_schema.sql');
    console.log('✅ Seeds de démo prêts    : database/seeds/seed.sql');
    console.log('\nPour charger les données dans PostgreSQL :');
    console.log('  psql -U postgres -d moneylink_db -f database/schema.sql');
    console.log('  psql -U postgres -d moneylink_db -f database/seeds/seed.sql');
    console.log('\nPour SQLite en local :');
    console.log('  sqlite3 database/moneylink.db < database/sqlite_schema.sql');
    console.log('  sqlite3 database/moneylink.db < database/seeds/sqlite_seed.sql');
    console.log('====================================================');
}

runInit();
