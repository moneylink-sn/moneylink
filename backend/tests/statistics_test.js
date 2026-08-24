/**
 * MoneyLink — Script de Test Automatisé du Module Statistiques & Analytics
 */

import http from 'http';
import app from '../src/app.js';

let server;
let port = 5002;
let BASE_URL = `http://localhost:${port}/api`;

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

async function runStatisticsTests() {
  console.log('\n================================================================');
  console.log('  📊 TEST AUTOMATISÉ DU MODULE DE STATISTIQUES MONEYLINK');
  console.log('================================================================\n');

  // Démarrer un serveur HTTP de test
  server = app.listen(port);

  try {
    // 1. Test Tracking d'événement public
    console.log('1️⃣ Test Enregistrement Événement Analytics (POST /api/analytics/events)...');
    const trackRes = await request('/analytics/events', {
      method: 'POST',
      body: {
        event_type: 'PAGE_VIEW',
        session_id: 'test-session-1234',
        platform: 'WEB_LANDING',
        metadata: { path: '/apropos', browser: 'Chrome' }
      }
    });
    console.log(`   Status: ${trackRes.status} — ${trackRes.data.message}`);
    if (trackRes.status !== 201) throw new Error('Échec du tracking analytics.');

    // 2. Test Protection Route Admin sans Token
    console.log('\n2️⃣ Test Sécurité : Accès sans Token (GET /api/admin/statistics)...');
    const unauthRes = await request('/admin/statistics');
    console.log(`   Status: ${unauthRes.status} (Attendu: 401) — ${unauthRes.data.error || 'Accès rejeté'}`);
    if (unauthRes.status !== 401) throw new Error('La route admin devrait être protégée par authentification.');

    // 3. Test Protection Route Admin avec Token Client (Rôle non-admin)
    console.log('\n3️⃣ Test Sécurité : Accès avec Token CLIENT (Moussa Fall)...');
    const clientLogin = await request('/auth/login', {
      method: 'POST',
      body: { identifier: '+221770000004', password: 'Password123!' }
    });
    const clientToken = clientLogin.data.data.token;
    const forbiddenRes = await request('/admin/statistics', {
      headers: { Authorization: `Bearer ${clientToken}` }
    });
    console.log(`   Status: ${forbiddenRes.status} (Attendu: 403) — ${forbiddenRes.data.error || 'Accès interdit'}`);
    if (forbiddenRes.status !== 403) throw new Error('Un utilisateur CLIENT ne doit pas pouvoir accéder aux statistiques.');

    // 4. Connexion Admin (Codé Samb)
    console.log('\n4️⃣ Connexion Administrateur Officiel (Codé Samb)...');
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: { identifier: '+221770000001', password: 'Password123!' }
    });
    const adminToken = adminLogin.data.data.token;
    const adminHeader = { Authorization: `Bearer ${adminToken}` };
    console.log(`   Admin connecté avec succès : ${adminLogin.data.data.user.first_name} ${adminLogin.data.data.user.last_name}`);

    // 5. Test Récupération des Statistiques Administrateur (Période: 30 jours par défaut)
    console.log('\n5️⃣ Récupération des Statistiques (GET /api/admin/statistics?period=30d)...');
    const statsRes = await request('/admin/statistics?period=30d', {
      headers: adminHeader
    });
    console.log(`   Status: ${statsRes.status}`);
    const stats = statsRes.data.data;

    console.log('   👥 Utilisateurs :', stats.users);
    console.log('   ⭐ Abonnements :', stats.subscriptions);
    console.log('   💰 Revenus Réels Confirmés :', stats.payments);
    console.log('   👁️ Visiteurs :', stats.visitors);
    console.log('   📈 Entonnoir de Conversion :', stats.conversion);
    console.log(`   📊 Séries Temporelles générées : ${stats.timeSeries.usersTimeline.length} points.`);

    // Validations d'intégrité
    if (typeof stats.users.total !== 'number' || stats.users.total <= 0) {
      throw new Error('Incohérence du compteur total d’utilisateurs.');
    }
    if (typeof stats.payments.revenue !== 'number') {
      throw new Error('Incohérence du calcul des revenus.');
    }
    if (!stats.disclaimer || !stats.disclaimer.includes('confirmés')) {
      throw new Error('Avertissement de transparence des revenus manquant.');
    }
    if (isNaN(parseFloat(stats.conversion.visitorToSignupRate))) {
      throw new Error('Erreur NaN dans le calcul du taux de conversion visiteur -> inscription.');
    }

    // 6. Test avec différents filtres temporels
    console.log('\n6️⃣ Test des filtres temporels (today, 7d, year)...');
    const todayRes = await request('/admin/statistics?period=today', { headers: adminHeader });
    const weekRes = await request('/admin/statistics?period=7d', { headers: adminHeader });
    const yearRes = await request('/admin/statistics?period=year', { headers: adminHeader });

    console.log(`   Aujourd'hui : ${todayRes.data.data.timeSeries.usersTimeline.length} créneaux horaires.`);
    console.log(`   7 Jours     : ${weekRes.data.data.timeSeries.usersTimeline.length} jours.`);
    console.log(`   Cette Année : ${yearRes.data.data.timeSeries.usersTimeline.length} périodes.`);

    console.log('\n================================================================');
    console.log('  ✅ TOUS LES TESTS DU MODULE STATISTIQUES SONT VALIDÉS À 100% !');
    console.log('================================================================\n');
  } catch (err) {
    console.error('❌ Erreur lors du test :', err.message);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
  }
}

runStatisticsTests();
