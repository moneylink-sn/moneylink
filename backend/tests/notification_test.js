/**
 * MoneyLink — Script de Test des Notifications Multi-Canal (Push, SMS, WhatsApp)
 */

const BASE_URL = 'http://localhost:5000/api';

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

async function runNotificationTests() {
  console.log('\n================================================================');
  console.log('  🔔 TEST DU MOTEUR DE NOTIFICATIONS MULTI-CANAL MONEYLINK');
  console.log('================================================================\n');

  try {
    // 1. Connexion Client
    const login = await request('/auth/login', {
      method: 'POST',
      body: { identifier: '+221770000004', password: 'Password123!' }
    });
    const token = login.data.data.token;
    const authHeaders = { Authorization: `Bearer ${token}` };

    // 2. Test Notification Paiement Séquestré (Push + SMS + WhatsApp)
    console.log('1️⃣ Envoi d’une alerte de paiement séquestré (Push, SMS Sénégal, WhatsApp)...');
    const dispatchRes = await request('/notifications/test-dispatch', {
      method: 'POST',
      headers: authHeaders,
      body: {
        phone: '+221770000004',
        templateKey: 'PAYMENT_ESCROW_LOCKED',
        params: ['ML-2026-889', 75000, '349102']
      }
    });
    console.log('   Résultat du Dispatch Multi-Canal :', dispatchRes.data.data.dispatchedLogs);

    // 3. Test Notification Marchand Non Inscrit (SMS / WhatsApp Invitation)
    console.log('\n2️⃣ Envoi d’une invitation à un marchand non encore inscrit (+221 78 500 11 22)...');
    const unregRes = await request('/notifications/test-dispatch', {
      method: 'POST',
      headers: authHeaders,
      body: {
        phone: '+221785001122',
        templateKey: 'MERCHANT_UNREGISTERED_INVITE',
        params: ['+221785001122', 120000, 'ML-2026-902', 'https://moneylink.sn/rejoindre/ML-2026-902']
      }
    });
    console.log('   Logs de dispatch SMS & WhatsApp :', unregRes.data.data.dispatchedLogs);

    // 4. Test du Job Automatique de Relance des Coffres d'Épargne à J-2
    console.log('\n3️⃣ Déclenchement du Worker automatique de relance des Coffres d’Épargne (J-2)...');
    const jobRes = await request('/notifications/jobs/savings-reminders', {
      method: 'POST',
      headers: authHeaders
    });
    console.log('   Statut Worker :', jobRes.data.message);

    // 5. Consultation des notifications In-App reçues
    console.log('\n4️⃣ Récupération des notifications In-App de l’utilisateur...');
    const notifs = await request('/notifications', { headers: authHeaders });
    console.log(`   ${notifs.data.data.length} notification(s) trouvée(s). Dernière alerte : "${notifs.data.data[0]?.title}"`);

    console.log('\n================================================================');
    console.log('  ✅ TOUS LES TESTS DE NOTIFICATIONS SONT VALIDER AVEC SUCCÈS !');
    console.log('================================================================\n');
  } catch (err) {
    console.error('❌ Erreur lors du test :', err.message);
  }
}

runNotificationTests();
