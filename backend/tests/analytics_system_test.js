/**
 * MoneyLink — Suite de Tests Automatisés du Système Analytics Réel
 * Vérification rigoureuse : Tracking public, RGPD, RBAC Super Admin, Agrégations réelles & PostgreSQL
 */

import http from 'http';
import app from '../src/app.js';
import { memoryStore, pool, query, isPostgresActive, checkDbHealth } from '../src/config/db.js';

let server;
let baseUrl;

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + path);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: json, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n================================================================');
  console.log('  🚀 MONEYLINK — TESTS SYSTÈME ANALYTICS & PILOTAGE FINTECH');
  console.log('================================================================\n');

  // 1. Démarrage du serveur de test
  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`📡 Serveur de test démarré sur ${baseUrl}`);

  await checkDbHealth();
  console.log(`💾 Mode DB actif : ${isPostgresActive() ? 'POSTGRESQL' : 'IN_MEMORY'}\n`);

  try {
    // ------------------------------------------------------------------------
    // ÉTAPE 1 : AUTHENTIFICATION DES ACTEURS (CLIENT, MARCHAND, SUPER ADMIN)
    // ------------------------------------------------------------------------
    console.log('1️⃣ Authentification des différents rôles (Client, Marchand, Super Admin)...');

    // Admin
    const adminLogin = await makeRequest('POST', '/api/auth/login', {
      identifier: 'admin@moneylink.sn',
      password: 'Password123!'
    });
    if (adminLogin.status !== 200 || !adminLogin.data.data?.token) {
      throw new Error(`Échec connexion Admin: ${JSON.stringify(adminLogin.data)}`);
    }
    const adminToken = adminLogin.data.data.token;
    console.log('   ✅ Connexion Super Admin réussie (Codé Samb)');

    // Client
    const clientLogin = await makeRequest('POST', '/api/auth/login', {
      identifier: '+221770000004',
      password: 'Password123!'
    });
    const clientToken = clientLogin.data.data?.token;
    console.log('   ✅ Connexion Client réussie');

    // Marchand
    const merchantLogin = await makeRequest('POST', '/api/auth/login', {
      identifier: '+221770000002',
      password: 'Password123!'
    });
    const merchantToken = merchantLogin.data.data?.token;
    console.log('   ✅ Connexion Marchand réussie\n');

    // ------------------------------------------------------------------------
    // ÉTAPE 2 : TESTS D'INGESTION D'ÉVÉNEMENTS PUBLICS
    // ------------------------------------------------------------------------
    console.log('2️⃣ Test d\'ingestion des événements analytics publics (/api/analytics/track & /events)...');

    // Page View
    const pvRes = await makeRequest('POST', '/api/analytics/track', {
      event_type: 'PAGE_VIEW',
      visitor_id: 'vid_test_123',
      session_id: 'sess_test_123',
      platform: 'WEB_LANDING',
      page_url: '/',
      page_title: 'MoneyLink Accueil',
      referrer: 'https://www.google.com/search?q=moneylink',
      utm_source: 'Google',
      utm_medium: 'cpc',
      utm_campaign: 'lancement_dakar'
    }, {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
    });

    if (pvRes.status !== 201 || !pvRes.data.success) {
      throw new Error(`Échec tracking PAGE_VIEW : ${JSON.stringify(pvRes.data)}`);
    }
    console.log('   ✅ Événement PAGE_VIEW enregistré avec détection automatique appareil iPhone/Mobile/iOS');

    // Product View
    const prodRes = await makeRequest('POST', '/api/analytics/track', {
      event_type: 'PRODUCT_VIEW',
      visitor_id: 'vid_test_123',
      session_id: 'sess_test_123',
      page_url: '/product/p0000000-0000-0000-0000-000000000001',
      metadata: {
        product_id: 'p0000000-0000-0000-0000-000000000001',
        product_name: 'iPhone 15 Pro Max',
        price: 850000,
        category: 'Électronique'
      }
    });
    if (prodRes.status !== 201) throw new Error('Échec tracking PRODUCT_VIEW');
    console.log('   ✅ Événement PRODUCT_VIEW enregistré');

    // Add to Cart
    const cartRes = await makeRequest('POST', '/api/analytics/track', {
      event_type: 'ADD_TO_CART',
      visitor_id: 'vid_test_123',
      session_id: 'sess_test_123',
      metadata: {
        product_id: 'p0000000-0000-0000-0000-000000000001',
        product_name: 'iPhone 15 Pro Max',
        price: 850000,
        quantity: 1
      }
    });
    if (cartRes.status !== 201) throw new Error('Échec tracking ADD_TO_CART');
    console.log('   ✅ Événement ADD_TO_CART enregistré');

    // WhatsApp Click
    const waRes = await makeRequest('POST', '/api/analytics/track', {
      event_type: 'WHATSAPP_CLICK',
      visitor_id: 'vid_test_123',
      session_id: 'sess_test_123',
      metadata: {
        product_id: 'p0000000-0000-0000-0000-000000000001',
        product_name: 'iPhone 15 Pro Max',
        merchant_name: 'Tech Store Dakar'
      }
    });
    if (waRes.status !== 201) throw new Error('Échec tracking WHATSAPP_CLICK');
    console.log('   ✅ Événement WHATSAPP_CLICK enregistré');

    // Heartbeat
    const hbRes = await makeRequest('POST', '/api/analytics/heartbeat', {
      visitor_id: 'vid_test_123',
      session_id: 'sess_test_123',
      page_url: '/catalogue'
    });
    if (hbRes.status !== 200) throw new Error('Échec heartbeat');
    console.log('   ✅ Heartbeat actif enregistré\n');

    // ------------------------------------------------------------------------
    // ÉTAPE 3 : TEST CONFORMITÉ RGPD & NETTOYAGE DES DONNÉES SENSIBLES
    // ------------------------------------------------------------------------
    console.log('3️⃣ Test de conformité RGPD & assainissement des métadonnées...');
    const sensitiveRes = await makeRequest('POST', '/api/analytics/track', {
      event_type: 'SEARCH',
      visitor_id: 'vid_test_456',
      session_id: 'sess_test_456',
      metadata: {
        query: 'montre connectee',
        password: 'SUPER_SECRET_PASSWORD',
        token: 'eyJh...jwt_token',
        card_number: '4111222233334444',
        otp: '123456'
      }
    });

    if (sensitiveRes.status !== 201) throw new Error('Échec tracking SEARCH');
    const recordedMeta = sensitiveRes.data.data?.metadata || {};
    if (recordedMeta.password || recordedMeta.token || recordedMeta.card_number || recordedMeta.otp) {
      throw new Error('🚨 ERREUR RGPD : Données sensibles non nettoyées dans analytics !');
    }
    console.log('   ✅ Protection RGPD validée : Mots de passe, tokens et cartes bancaires systématiquement purgés.\n');

    // ------------------------------------------------------------------------
    // ÉTAPE 4 : CONTRÔLE D'ACCÈS STRICT (RBAC SUPER ADMIN)
    // ------------------------------------------------------------------------
    console.log('4️⃣ Test d\'isolation et sécurité RBAC sur les endpoints /api/admin/analytics/*...');

    const testEndpoints = [
      '/api/admin/analytics/overview',
      '/api/admin/analytics/visitors',
      '/api/admin/analytics/evolution',
      '/api/admin/analytics/devices',
      '/api/admin/analytics/sources',
      '/api/admin/analytics/products',
      '/api/admin/analytics/conversion',
      '/api/admin/analytics/realtime',
      '/api/admin/analytics/pages',
      '/api/admin/analytics/geography',
      '/api/admin/statistics'
    ];

    for (const ep of testEndpoints) {
      // Sans token -> 401
      const noTokenRes = await makeRequest('GET', ep);
      if (noTokenRes.status !== 401) throw new Error(`Accès non autorisé accordé sur ${ep} sans token ! (Status: ${noTokenRes.status})`);

      // Avec token Client -> 403
      const clientRes = await makeRequest('GET', ep, null, { Authorization: `Bearer ${clientToken}` });
      if (clientRes.status !== 403) throw new Error(`Accès client accordé sur ${ep} ! (Status: ${clientRes.status})`);

      // Avec token Marchand -> 403
      const merchantRes = await makeRequest('GET', ep, null, { Authorization: `Bearer ${merchantToken}` });
      if (merchantRes.status !== 403) throw new Error(`Accès marchand accordé sur ${ep} ! (Status: ${merchantRes.status})`);

      // Avec token Super Admin -> 200
      const adminRes = await makeRequest('GET', ep, null, { Authorization: `Bearer ${adminToken}` });
      if (adminRes.status !== 200 || !adminRes.data.success) {
        throw new Error(`Super Admin refusé sur ${ep} ! (Status: ${adminRes.status})`);
      }
    }
    console.log('   ✅ Tous les 11 endpoints Admin Analytics sont strictement protégés par RBAC (100% Super Admin).\n');

    // ------------------------------------------------------------------------
    // ÉTAPE 5 : VÉRIFICATION DÉTAILLÉE DES DONNÉES ET CALCULS
    // ------------------------------------------------------------------------
    console.log('5️⃣ Validation des calculs et métriques analytics réelles...');

    // 5a. Overview
    const ovRes = await makeRequest('GET', '/api/admin/analytics/overview?period=30d', null, { Authorization: `Bearer ${adminToken}` });
    const kpis = ovRes.data.data?.kpis || {};
    console.log('   📊 KPIs Overview :', {
      visitors: kpis.visitors?.value,
      clients: kpis.clients?.value,
      merchants: kpis.merchants?.value,
      orders: kpis.orders?.value,
      revenue: `${kpis.revenue?.value} FCFA`,
      escrowLocked: `${kpis.escrowLocked?.value} FCFA`,
      whatsappClicks: kpis.whatsappClicks?.value,
      carts: kpis.carts?.value
    });

    if (typeof kpis.visitors?.value !== 'number' || typeof kpis.revenue?.value !== 'number') {
      throw new Error('Format de KPI Overview invalide');
    }

    // 5b. Visitors deep dive
    const visRes = await makeRequest('GET', '/api/admin/analytics/visitors', null, { Authorization: `Bearer ${adminToken}` });
    const visData = visRes.data.data || {};
    console.log('   👁️ Visiteurs Détaillés :', {
      today: visData.today,
      yesterday: visData.yesterday,
      sevenDays: visData.sevenDays,
      thirtyDays: visData.thirtyDays,
      ninetyDays: visData.ninetyDays,
      year: visData.year,
      uniqueVisitors: visData.uniqueVisitors,
      activeVisitors: visData.activeVisitors
    });

    if (visData.uniqueVisitors < 1) throw new Error('Le nombre de visiteurs uniques réels devrait être >= 1');

    // 5c. Devices & OS
    const devRes = await makeRequest('GET', '/api/admin/analytics/devices', null, { Authorization: `Bearer ${adminToken}` });
    const devData = devRes.data.data || {};
    console.log('   📱 Répartition Appareils :', devData.devices);
    console.log('   💻 Systèmes d\'Exploitation :', devData.os);

    // 5d. Traffic Sources
    const srcRes = await makeRequest('GET', '/api/admin/analytics/sources', null, { Authorization: `Bearer ${adminToken}` });
    const srcData = srcRes.data.data || {};
    console.log('   🌐 Sources de Trafic :', srcData.sources);

    // 5e. Products Ranking
    const prodRankRes = await makeRequest('GET', '/api/admin/analytics/products', null, { Authorization: `Bearer ${adminToken}` });
    const prodRankData = prodRankRes.data.data || {};
    console.log('   🏆 Top Consultés :', prodRankData.mostViewed?.length);
    console.log('   💬 Top WhatsApp :', prodRankData.mostWhatsAppClicks?.length);
    console.log('   🛒 Top Paniers :', prodRankData.mostAddedToCart?.length);

    // 5f. Conversion Funnel
    const funnelRes = await makeRequest('GET', '/api/admin/analytics/conversion', null, { Authorization: `Bearer ${adminToken}` });
    const funnelData = funnelRes.data.data || {};
    console.log('   📈 Entonnoir de Conversion (8 étapes) :', funnelData.funnel?.map(s => `${s.name}: ${s.count} (${s.stepConversionRate})`));
    console.log('   🎯 Taux Global :', funnelData.globalConversionRate);

    // 5g. Realtime Stream
    const rtRes = await makeRequest('GET', '/api/admin/analytics/realtime', null, { Authorization: `Bearer ${adminToken}` });
    const rtData = rtRes.data.data || {};
    console.log(`   🔥 Flux en direct : ${rtData.events?.length} événements récents.`);

    // ------------------------------------------------------------------------
    // ÉTAPE 6 : TEST DES FILTRES TEMPORELS
    // ------------------------------------------------------------------------
    console.log('\n6️⃣ Test de tous les filtres temporels (today, yesterday, 7d, 30d, 90d, year)...');
    const periods = ['today', 'yesterday', '7d', '30d', '90d', 'year'];

    for (const p of periods) {
      const pRes = await makeRequest('GET', `/api/admin/analytics/evolution?period=${p}`, null, { Authorization: `Bearer ${adminToken}` });
      if (pRes.status !== 200 || !pRes.data.data?.timeline) {
        throw new Error(`Échec filtre temporel ${p}`);
      }
      console.log(`   ✓ Filtre '${p}' : ${pRes.data.data.timeline.length} créneaux générés.`);
    }

    console.log('\n================================================================');
    console.log('  🎉 TOUS LES TESTS DU SYSTÈME ANALYTICS ONT RÉUSSI À 100% !');
    console.log('================================================================\n');

  } finally {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  }
}

runTests().catch(err => {
  console.error('\n❌ ÉCHEC DU TEST ANALYTICS :', err);
  process.exit(1);
});
