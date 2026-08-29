/**
 * MoneyLink — Test E2E Automatisé de l'Authentification Administrateur et de la Console Sécurité
 */

import app from '../src/app.js';
import { memoryStore } from '../src/config/db.js';
import bcrypt from 'bcryptjs';

let server;
const TEST_PORT = 5006;
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

  const json = await res.json().catch(() => ({}));
  return { status: res.status, data: json };
}

async function runAdminAuthTests() {
  server = app.listen(TEST_PORT);
  console.log('\n================================================================');
  console.log('  🛡️ TEST E2E VALIDATION AUTHENTIFICATION ADMIN MONEYLINK');
  console.log('================================================================\n');

  try {
    // 1. Health check
    console.log('1️⃣ Vérification Health Check (/api/health)...');
    const health = await request('/health');
    if (health.status !== 200) throw new Error(`Health check invalide: HTTP ${health.status}`);
    console.log('   ✅ Health check OK');

    // 2. Connexion Administrateur avec Email
    console.log('\n2️⃣ Connexion Administrateur via Email (admin@moneylink.sn)...');
    const adminEmailLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: 'admin@moneylink.sn',
        password: 'Password123!'
      }
    });

    if (adminEmailLogin.status !== 200) {
      throw new Error(`Échec connexion admin (HTTP ${adminEmailLogin.status}): ${JSON.stringify(adminEmailLogin.data)}`);
    }
    const adminToken = adminEmailLogin.data.data?.token;
    const adminUser = adminEmailLogin.data.data?.user;
    if (!adminToken || adminUser?.role !== 'ADMIN') {
      throw new Error(`Token ou Rôle ADMIN manquant: ${JSON.stringify(adminEmailLogin.data)}`);
    }
    console.log(`   ✅ Connexion réussie (HTTP 200)`);
    console.log(`   ✅ Administrateur : ${adminUser.first_name} ${adminUser.last_name} (${adminUser.email})`);
    console.log(`   ✅ Rôle : ${adminUser.role} | Token JWT généré.`);

    // 3. Connexion Administrateur avec Numéro de Téléphone (+221770000001)
    console.log('\n3️⃣ Connexion Administrateur via Téléphone (+221770000001)...');
    const adminPhoneLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: '+221770000001',
        password: 'Password123!'
      }
    });
    if (adminPhoneLogin.status !== 200 || !adminPhoneLogin.data.data?.token) {
      throw new Error(`Échec connexion admin téléphone: ${JSON.stringify(adminPhoneLogin.data)}`);
    }
    console.log('   ✅ Connexion téléphone admin réussie (HTTP 200)');

    // 4. Accès au Dashboard Admin avec le JWT Admin
    console.log('\n4️⃣ Test Accès Console Admin (/api/admin/dashboard)...');
    const dashRes = await request('/admin/dashboard', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (dashRes.status !== 200 || !dashRes.data.data?.metrics) {
      throw new Error(`Échec accès dashboard admin (HTTP ${dashRes.status}): ${JSON.stringify(dashRes.data)}`);
    }
    console.log('   ✅ Accès accordé avec JWT ADMIN (HTTP 200)');
    console.log(`   📊 Utilisateurs : ${dashRes.data.data.metrics.usersCount} | Commerçants : ${dashRes.data.data.metrics.merchantsCount} | Commandes : ${dashRes.data.data.metrics.ordersCount}`);

    // 5. Test Mauvais Mot de Passe Admin (doit retourner 401)
    console.log('\n5️⃣ Test Mauvais Mot de Passe Admin...');
    const badPassRes = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: 'admin@moneylink.sn',
        password: 'WrongPassword999!'
      }
    });
    if (badPassRes.status !== 401) {
      throw new Error(`Mauvais mot de passe n'a pas retourné 401 (reçu HTTP ${badPassRes.status})`);
    }
    console.log('   ✅ Mauvais identifiants correctement rejetés avec HTTP 401');

    // 6. Test Compte Suspendu (doit retourner 403)
    console.log('\n6️⃣ Test Connexion Compte Suspendu (sécurité status !== ACTIVE)...');
    const suspendedUser = {
      id: 's0000000-0000-0000-0000-000000000099',
      phone: '+221779999999',
      email: 'suspended.test@moneylink.sn',
      first_name: 'Bloqué',
      last_name: 'Test',
      password_hash: bcrypt.hashSync('Password123!', 10),
      role: 'CLIENT',
      status: 'SUSPENDED',
      created_at: new Date().toISOString()
    };
    memoryStore.users.push(suspendedUser);

    const suspLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: 'suspended.test@moneylink.sn',
        password: 'Password123!'
      }
    });
    if (suspLogin.status !== 403) {
      throw new Error(`Compte suspendu n'a pas été bloqué avec 403 (reçu HTTP ${suspLogin.status})`);
    }
    console.log(`   ✅ Compte suspendu correctement bloqué avec HTTP 403 : "${suspLogin.data.error}"`);

    // 7. Test Accès Dashboard Admin avec Token Utilisateur Standard (doit retourner 403)
    console.log('\n7️⃣ Test Sécurité RBAC : Client accédant au Dashboard Admin...');
    const clientLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: 'moussa@gmail.com',
        password: 'Password123!'
      }
    });
    const clientToken = clientLogin.data.data?.token;
    if (!clientToken) throw new Error('Échec login client pour test RBAC');

    const unauthorizedAdminAccess = await request('/admin/dashboard', {
      headers: { Authorization: `Bearer ${clientToken}` }
    });
    if (unauthorizedAdminAccess.status !== 403) {
      throw new Error(`Utilisateur CLIENT a pu accéder aux routes ADMIN (reçu HTTP ${unauthorizedAdminAccess.status})`);
    }
    console.log(`   ✅ Accès refusé pour rôle CLIENT avec HTTP 403 : "${unauthorizedAdminAccess.data.error}"`);

    // 8. Test Accès Dashboard Admin sans Token (doit retourner 401)
    console.log('\n8️⃣ Test Sécurité : Accès Admin sans Token JWT...');
    const noTokenAccess = await request('/admin/dashboard');
    if (noTokenAccess.status !== 401) {
      throw new Error(`Accès non authentifié n'a pas retourné 401 (reçu HTTP ${noTokenAccess.status})`);
    }
    console.log('   ✅ Requête sans token correctement bloquée avec HTTP 401');

    console.log('\n================================================================');
    console.log('  🎉 TOUS LES TESTS D\'AUTHENTIFICATION ADMIN ONT RÉUSSI (100%) !');
    console.log('================================================================\n');
  } finally {
    server.close();
  }
}

runAdminAuthTests().catch(err => {
  console.error('\n❌ ERREUR LORS DU TEST ADMIN AUTH :', err.message);
  process.exit(1);
});
