/**
 * MoneyLink — Test E2E Complet du Module Authentification (PostgreSQL & Fallback)
 */

import app from '../src/app.js';

let server;
const TEST_PORT = 5005;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
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

async function runAuthTests() {
  server = app.listen(TEST_PORT);
  console.log('\n================================================================');
  console.log('  🔐 TEST APPROFONDI DU MODULE D’AUTHENTIFICATION MONEYLINK');
  console.log('================================================================\n');

  try {
    // 1. Health Check
    console.log('1️⃣ Test Health Check (/api/health)...');
    const health = await request('/health');
    if (health.status !== 200) throw new Error('Health check a échoué');
    console.log('   ✅ Health check OK');

    // 2. Inscription Client
    console.log('\n2️⃣ Test Inscription CLIENT...');
    const clientPhone = `+22177${Math.floor(1000000 + Math.random() * 9000000)}`;
    const clientEmail = `client.test.${Date.now()}@moneylink.sn`;
    const regClient = await request('/auth/register', {
      method: 'POST',
      body: {
        phone: clientPhone,
        email: clientEmail,
        first_name: 'Modou',
        last_name: 'Gueye',
        password: 'Password123!',
        role: 'CLIENT'
      }
    });

    if (regClient.status !== 201 || !regClient.data.data.token) {
      throw new Error(`Échec inscription client: ${JSON.stringify(regClient.data)}`);
    }
    const clientData = regClient.data.data;
    console.log(`   ✅ Client créé : ${clientData.user.first_name} ${clientData.user.last_name} (${clientData.user.phone})`);
    console.log(`   ✅ Wallet initialisé : ID ${clientData.wallet.id} (Solde: ${clientData.wallet.available_balance} ${clientData.wallet.currency || 'XOF'})`);

    // 3. Inscription Marchand (MERCHANT)
    console.log('\n3️⃣ Test Inscription MERCHANT avec profil commercial...');
    const merchantPhone = `+22177${Math.floor(1000000 + Math.random() * 9000000)}`;
    const merchantEmail = `merchant.test.${Date.now()}@moneylink.sn`;
    const regMerchant = await request('/auth/register', {
      method: 'POST',
      body: {
        phone: merchantPhone,
        email: merchantEmail,
        first_name: 'Aminata',
        last_name: 'Ba',
        password: 'Password123!',
        role: 'MERCHANT',
        business_name: 'Ba Couture Dakar',
        business_type: 'Mode & Habillement'
      }
    });

    if (regMerchant.status !== 201 || !regMerchant.data.data.token) {
      throw new Error(`Échec inscription marchand: ${JSON.stringify(regMerchant.data)}`);
    }
    const merchantData = regMerchant.data.data;
    console.log(`   ✅ Marchand créé : ${merchantData.user.first_name} ${merchantData.user.last_name} (${merchantData.user.phone})`);
    console.log(`   ✅ Profil boutique : ${merchantData.merchant?.business_name || 'Boutique'} (${merchantData.merchant?.business_type})`);

    // 4. Test Rejet Doublon (Email et Téléphone)
    console.log('\n4️⃣ Test Rejet Doublon Téléphone/Email existant...');
    const dupRes = await request('/auth/register', {
      method: 'POST',
      body: {
        phone: clientPhone,
        email: `another.${Date.now()}@moneylink.sn`,
        first_name: 'Clone',
        last_name: 'Test',
        password: 'Password123!'
      }
    });
    if (dupRes.status !== 400) {
      throw new Error(`Le doublon de téléphone n'a pas été rejeté (status: ${dupRes.status})`);
    }
    console.log(`   ✅ Doublon correctement rejeté avec code 400 : "${dupRes.data.error}"`);

    // 5. Test Rejet Rôle ADMIN à l'inscription publique
    console.log('\n5️⃣ Test Sécurité : Rejet strict rôle ADMIN à l\'inscription...');
    const adminAttack = await request('/auth/register', {
      method: 'POST',
      body: {
        phone: `+22176${Math.floor(1000000 + Math.random() * 9000000)}`,
        email: `hacker.${Date.now()}@test.sn`,
        first_name: 'Attacker',
        last_name: 'Root',
        password: 'Password123!',
        role: 'ADMIN'
      }
    });
    if (adminAttack.status !== 400) {
      throw new Error(`Tentative d'inscription ADMIN non bloquée (status: ${adminAttack.status})`);
    }
    console.log('   ✅ Tentative d\'usurpation de rôle ADMIN rejetée avec succès');

    // 6. Connexion avec Téléphone
    console.log('\n6️⃣ Test Connexion via numéro de téléphone...');
    const loginPhone = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: clientPhone,
        password: 'Password123!'
      }
    });
    if (loginPhone.status !== 200 || !loginPhone.data.data.token) {
      throw new Error(`Échec connexion téléphone: ${JSON.stringify(loginPhone.data)}`);
    }
    const token = loginPhone.data.data.token;
    console.log(`   ✅ Connexion téléphone réussie pour ${loginPhone.data.data.user.first_name}`);

    // 7. Connexion avec Email
    console.log('\n7️⃣ Test Connexion via adresse email...');
    const loginEmail = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: merchantEmail,
        password: 'Password123!'
      }
    });
    if (loginEmail.status !== 200 || !loginEmail.data.data.token) {
      throw new Error(`Échec connexion email: ${JSON.stringify(loginEmail.data)}`);
    }
    console.log(`   ✅ Connexion email réussie pour ${loginEmail.data.data.user.first_name}`);

    // 8. Test Mauvais Mot de Passe
    console.log('\n8️⃣ Test Connexion avec mauvais mot de passe...');
    const badPass = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: clientPhone,
        password: 'WrongPassword999!'
      }
    });
    if (badPass.status !== 401) {
      throw new Error(`Mauvais mot de passe non rejeté (status: ${badPass.status})`);
    }
    console.log('   ✅ Mauvais identifiants correctement rejetés avec code 401');

    // 9. Test Récupération Profil (/api/auth/profile)
    console.log('\n9️⃣ Test Consultation Profil Connecté (/api/auth/profile)...');
    const profileRes = await request('/auth/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (profileRes.status !== 200 || profileRes.data.data.user.phone !== clientPhone) {
      throw new Error(`Échec récupération profil: ${JSON.stringify(profileRes.data)}`);
    }
    console.log(`   ✅ Profil récupéré avec succès pour : ${profileRes.data.data.user.first_name} ${profileRes.data.data.user.last_name}`);
    console.log(`   ✅ Solde portefeuille associé : ${profileRes.data.data.wallet?.available_balance || 0} FCFA`);

    // 10. Test Sécurité Token Invalide
    console.log('\n🔟 Test Accès avec Token Falsifié / Invalide...');
    const fakeTokenRes = await request('/auth/profile', {
      headers: { Authorization: 'Bearer fake_invalid_jwt_token_12345' }
    });
    if (fakeTokenRes.status !== 401 && fakeTokenRes.status !== 403) {
      throw new Error(`Token invalide non rejeté (status: ${fakeTokenRes.status})`);
    }
    console.log(`   ✅ Token falsifié correctement bloqué avec code ${fakeTokenRes.status}`);

    console.log('\n================================================================');
    console.log('  🎉 TOUS LES TESTS D’AUTHENTIFICATION ONT RÉUSSI À 100% !');
    console.log('================================================================\n');
  } finally {
    server.close();
  }
}

runAuthTests().catch(err => {
  console.error('\n❌ ERREUR LORS DU TEST AUTHENTIFICATION :', err.message);
  process.exit(1);
});
