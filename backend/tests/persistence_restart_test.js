/**
 * MoneyLink — Test de Persistance Inter-Redémarrages du Serveur
 * Vérifie que les utilisateurs et données persistent après redémarrage du serveur
 */

import app from '../src/app.js';

const PORT_1 = 5011;
const PORT_2 = 5012;

async function request(baseUrl, path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const json = await res.json();
  return { status: res.status, data: json };
}

async function testPersistenceAcrossRestarts() {
  console.log('\n================================================================');
  console.log('  🔄 TEST DE PERSISTANCE DES DONNÉES APRÈS REDÉMARRAGE DU SERVEUR');
  console.log('================================================================\n');

  const clientPhone = `+22177${Math.floor(1000000 + Math.random() * 9000000)}`;
  const clientEmail = `restart.user.${Date.now()}@moneylink.sn`;
  const password = 'SecurePassword2026!';

  // --- ÉTAPE 1 : Démarrage Instance 1 & Inscription ---
  console.log('1️⃣ Démarrage de l\'Instance 1 du serveur API...');
  const server1 = app.listen(PORT_1);
  const baseUrl1 = `http://localhost:${PORT_1}/api`;

  let initialToken;
  try {
    console.log(`   Inscription d'un nouvel utilisateur : ${clientPhone} (${clientEmail})...`);
    const regRes = await request(baseUrl1, '/auth/register', {
      method: 'POST',
      body: {
        phone: clientPhone,
        email: clientEmail,
        first_name: 'Cheikh',
        last_name: 'Anta',
        password,
        role: 'CLIENT'
      }
    });

    if (regRes.status !== 201) {
      throw new Error(`Échec de l'inscription sur l'instance 1 : ${JSON.stringify(regRes.data)}`);
    }

    initialToken = regRes.data.data.token;
    console.log('   ✅ Utilisateur enregistré sur l\'Instance 1 avec succès.');
  } finally {
    // --- ÉTAPE 2 : Arrêt complet de l'Instance 1 (Simulation Crash / Redeploy) ---
    console.log('\n2️⃣ Arrêt complet de l\'Instance 1 (Simulation Redeploy / Redémarrage)...');
    await new Promise((resolve) => server1.close(resolve));
    console.log('   🛑 Instance 1 complètement arrêtée.');
  }

  // --- ÉTAPE 3 : Démarrage Instance 2 (Nouvelle instance) ---
  console.log('\n3️⃣ Démarrage d\'une NOUVELLE Instance 2 du serveur API...');
  const server2 = app.listen(PORT_2);
  const baseUrl2 = `http://localhost:${PORT_2}/api`;

  try {
    // Vérification Health Check sur la nouvelle instance
    console.log('   Vérification /api/health sur la nouvelle instance...');
    const health = await request(baseUrl2, '/health');
    if (health.status !== 200) {
      throw new Error('Health check sur la nouvelle instance a échoué');
    }
    console.log('   ✅ Nouvelle instance opérationnelle.');

    // Connexion sur la nouvelle instance
    console.log(`   Tentative de connexion de l'utilisateur ${clientPhone} sur la NOUVELLE instance...`);
    const loginRes = await request(baseUrl2, '/auth/login', {
      method: 'POST',
      body: {
        identifier: clientPhone,
        password
      }
    });

    if (loginRes.status !== 200 || !loginRes.data.data.token) {
      throw new Error(`Échec de la connexion sur la nouvelle instance : ${JSON.stringify(loginRes.data)}`);
    }
    const newToken = loginRes.data.data.token;
    console.log(`   ✅ Connexion réussie sur la NOUVELLE instance pour : ${loginRes.data.data.user.first_name} ${loginRes.data.data.user.last_name}`);

    // Récupération Profil sur la nouvelle instance
    console.log('   Consultation du profil (/api/auth/profile) sur la nouvelle instance...');
    const profileRes = await request(baseUrl2, '/auth/profile', {
      headers: { Authorization: `Bearer ${newToken}` }
    });

    if (profileRes.status !== 200 || profileRes.data.data.user.phone !== clientPhone) {
      throw new Error(`Profil non persistant : ${JSON.stringify(profileRes.data)}`);
    }

    console.log('   ✅ Profil complet et portefeuille récupérés avec succès :');
    console.log(`      - Nom complet : ${profileRes.data.data.user.first_name} ${profileRes.data.data.user.last_name}`);
    console.log(`      - Téléphone   : ${profileRes.data.data.user.phone}`);
    console.log(`      - Email       : ${profileRes.data.data.user.email}`);
    console.log(`      - Rôle        : ${profileRes.data.data.user.role}`);
    console.log(`      - Statut DB   : ${profileRes.data.data.user.status}`);
    console.log(`      - Wallet ID   : ${profileRes.data.data.wallet?.id}`);

    console.log('\n================================================================');
    console.log('  🎉 PERSISTANCE INTER-REDÉMARRAGES PARFAITEMENT VALIDÉE !');
    console.log('================================================================\n');
  } finally {
    await new Promise((resolve) => server2.close(resolve));
  }
}

testPersistenceAcrossRestarts().catch(err => {
  console.error('\n❌ ERREUR LORS DU TEST DE PERSISTANCE :', err.message);
  process.exit(1);
});
