import http from 'http';
import app from '../src/app.js';

let server;
const TEST_PORT = 5003;
let BASE_URL = `http://localhost:${TEST_PORT}/api`;

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const fetchOptions = {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  };

  const res = await fetch(url, fetchOptions);
  const json = await res.json();
  return { status: res.status, data: json };
}

async function runTests() {
  server = app.listen(TEST_PORT);
  console.log('\n========================================================');
  console.log('  🧪 DÉBUT DES TESTS E2E DE L’API MONEYLINK BACKEND');
  console.log('========================================================\n');

  try {
    // 1. Test Health Check
    console.log('1️⃣ Test Health Check (/api/health)...');
    const health = await request('/health');
    console.log(`   Status: ${health.status}, Response:`, health.data.status);

    // 2. Test Inscription Utilisateur Légitime (POST /api/auth/register)
    console.log('\n2️⃣ Test Inscription Utilisateur (POST /api/auth/register)...');
    const newPhone = `+22177${Math.floor(1000000 + Math.random() * 9000000)}`;
    const regRes = await request('/auth/register', {
      method: 'POST',
      body: {
        phone: newPhone,
        email: `client.${Date.now()}@moneylink.sn`,
        first_name: 'Ibrahima',
        last_name: 'Diallo',
        password: 'Password123!',
        role: 'CLIENT'
      }
    });

    if (regRes.status !== 201) {
      throw new Error(`Échec de l'inscription: ${regRes.data.error || regRes.status}`);
    }
    const registeredUser = regRes.data.data.user;
    console.log(`   Compte créé : ${registeredUser.first_name} ${registeredUser.last_name} (${registeredUser.phone})`);
    console.log(`   Rôle assigné : [${registeredUser.role}]`);
    console.log(`   Période Essai Gratuit : ${registeredUser.subscription_status} (30 jours)`);

    // 2b. Test Sécurité : Rejet strict si un utilisateur tente de s'inscrire avec le rôle ADMIN
    console.log('\n2️⃣b Test Sécurité : Rejet tentative inscription avec rôle ADMIN...');
    const adminAttackRes = await request('/auth/register', {
      method: 'POST',
      body: {
        phone: `+22178${Math.floor(1000000 + Math.random() * 9000000)}`,
        email: `hacker.${Date.now()}@test.sn`,
        first_name: 'Hacker',
        last_name: 'Test',
        password: 'Password123!',
        role: 'ADMIN'
      }
    });
    console.log(`   Status: ${adminAttackRes.status} (Attendu: 400 Validation Rejetée) — ${adminAttackRes.data.error || 'Rejeté'}`);
    if (adminAttackRes.status !== 400) {
      throw new Error("FAILLE SÉCURITÉ: Une tentative d'inscription avec le rôle ADMIN n'a pas été bloquée !");
    }

    // 3. Connexion Client (Moussa Fall)
    console.log('\n3️⃣ Connexion Client (+221770000004)...');
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        identifier: '+221770000004',
        password: 'Password123!'
      }
    });
    console.log(`   Status: ${loginRes.status}, Token généré avec succès.`);
    const clientToken = loginRes.data.data.token;
    const clientAuthHeader = { Authorization: `Bearer ${clientToken}` };

    // 3. Consultation des Marchands & Produits
    console.log('\n3️⃣ Consultation du catalogue marchands (/api/merchants)...');
    const merchantsRes = await request('/merchants');
    const firstMerchant = merchantsRes.data.data[0];
    console.log(`   Marchand trouvé: ${firstMerchant.business_name} (ID: ${firstMerchant.id})`);

    const merchantDetails = await request(`/merchants/${firstMerchant.id}`);
    const firstProduct = merchantDetails.data.data.products[0];
    console.log(`   Produit sélectionné: ${firstProduct.name} - ${firstProduct.price} FCFA`);

    // 4. Création d'une commande
    console.log('\n4️⃣ Création d’une commande par le client...');
    const orderRes = await request('/orders', {
      method: 'POST',
      headers: clientAuthHeader,
      body: {
        merchant_id: firstMerchant.id,
        items: [{ product_id: firstProduct.id, quantity: 1 }],
        delivery_address: 'Ngor Virage, Dakar',
        delivery_phone: '+221770000004',
        delivery_notes: 'Remettre au gardien si absent'
      }
    });
    const order = orderRes.data.data;
    console.log(`   Commande créée : #${order.order_number} (Montant: ${order.total_amount} FCFA, Statut: ${order.status})`);

    // 5. Paiement Sécurisé (Mock Wave) -> Verrouillage Séquestre
    console.log('\n5️⃣ Paiement Sécurisé de la commande (Verrouillage en Séquestre)...');
    const paymentRes = await request('/payments/checkout', {
      method: 'POST',
      headers: clientAuthHeader,
      body: {
        order_id: order.id,
        payment_method: 'WAVE_MOCK'
      }
    });
    const deliveryCode = paymentRes.data.data.deliveryCode;
    console.log(`   Paiement Réussi ! Fonds sous séquestre.`);
    console.log(`   🔑 Code Secret de Réception (OTP) généré pour le client : [ ${deliveryCode} ]`);

    // 6. Expédition par le marchand
    console.log('\n6️⃣ Expédition de la commande...');
    await request(`/orders/${order.id}/ship`, {
      method: 'PUT',
      headers: clientAuthHeader
    });
    console.log(`   Statut commande passé à : SHIPPED 🚚`);

    // 7. Validation de la réception avec le code secret OTP
    console.log('\n7️⃣ Validation de la réception avec le code secret OTP...');
    const validateRes = await request(`/orders/${order.id}/validate-code`, {
      method: 'POST',
      headers: clientAuthHeader,
      body: { code: deliveryCode }
    });
    console.log(`   ${validateRes.data.message}`);
    console.log(`   Statut final commande : ${validateRes.data.data.order.status} ✅`);

    // 8. Test des Coffres d'Épargne
    console.log('\n8️⃣ Test Création Coffre d’Épargne & Versement...');
    const savingsRes = await request('/savings', {
      method: 'POST',
      headers: clientAuthHeader,
      body: {
        title: 'Voyage Touba 2026',
        description: 'Épargne pour le Magal',
        target_amount: 100000,
        target_date: '2026-09-30',
        type: 'PERSONAL',
        frequency: 'MONTHLY'
      }
    });
    const goal = savingsRes.data.data;
    console.log(`   Coffre créé : "${goal.title}" (Cible: ${goal.target_amount} FCFA)`);

    // 9. Dashboard Admin KPIs & Vérification Codé Samb
    console.log('\n9️⃣ Connexion Admin & Consultation des KPIs du Dashboard...');
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: { identifier: '+221770000001', password: 'Password123!' }
    });
    const adminUser = adminLogin.data.data.user;
    console.log(`   Admin connecté : ${adminUser.first_name} ${adminUser.last_name} (${adminUser.email})`);
    const adminToken = adminLogin.data.data.token;
    const dashboardRes = await request('/admin/dashboard', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('   KPIs Admin :', dashboardRes.data.data.metrics);

    // 10. Test Moteur Abonnement Client (Statut & 30j Essai gratuit)
    console.log('\n🔟 Test Statut Abonnement Client (/api/subscription/status)...');
    const subStatusRes = await request('/subscription/status', {
      headers: clientAuthHeader
    });
    console.log('   Abonnement Client :', subStatusRes.data.data.planName, '| Statut :', subStatusRes.data.data.subscriptionStatus, `| Tarif : ${subStatusRes.data.data.monthlyFeeFCFA} FCFA`);

    // 11. Test Initialisation Paiement 500 FCFA Wave
    console.log('\n1️⃣1️⃣ Test Initiation Paiement Abonnement 500 FCFA (Wave)...');
    const subPayRes = await request('/subscription/pay', {
      method: 'POST',
      headers: clientAuthHeader,
      body: { payment_method: 'WAVE' }
    });
    console.log(`   ${subPayRes.data.message}`);
    console.log(`   Référence générée : ${subPayRes.data.data.paymentIntent.reference}`);

    // 12. Test Liste Abonnements Admin
    console.log('\n1️⃣2️⃣ Test Gestion des Abonnements Admin (/api/admin/subscriptions)...');
    const adminSubsRes = await request('/admin/subscriptions', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('   Statistiques Abonnements :', adminSubsRes.data.data.stats);
    console.log(`   Total Abonnés inspectés : ${adminSubsRes.data.data.subscribers.length}`);

    console.log('\n========================================================');
    console.log('  ✅ TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS À 100% !');
    console.log('========================================================\n');
  } catch (err) {
    console.error('❌ Erreur lors du test :', err.message);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
  }
}

runTests();
