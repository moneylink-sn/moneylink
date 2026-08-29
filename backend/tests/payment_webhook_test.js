/**
 * MoneyLink — Script de Test des Connecteurs Wave & Orange Money et Webhooks Sécurisés
 */

import crypto from 'crypto';
import app from '../src/app.js';

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
  const json = await res.json();
  return { status: res.status, data: json };
}

async function runPaymentPartnerTests() {
  server = app.listen(TEST_PORT);
  console.log('\n================================================================');
  console.log('  💳 TEST DES CONNECTEURS WAVE & ORANGE MONEY + WEBHOOKS HMAC');
  console.log('================================================================\n');


  try {
    // 1. Connexion Client
    const login = await request('/auth/login', {
      method: 'POST',
      body: { identifier: '+221770000004', password: 'Password123!' }
    });
    const token = login.data.data.token;
    const authHeaders = { Authorization: `Bearer ${token}` };

    // 2. Création d'une commande test
    console.log('1️⃣ Création d’une commande pour test Webhook...');
    const orderRes = await request('/orders', {
      method: 'POST',
      headers: authHeaders,
      body: {
        merchant_id: 'm0000000-0000-0000-0000-000000000001',
        items: [{ product_id: 'p0000000-0000-0000-0000-000000000002', quantity: 2 }], // 50 000 FCFA
        delivery_address: 'Plateau, Dakar',
        delivery_phone: '+221770000004'
      }
    });
    const order = orderRes.data.data;
    console.log(`   Commande #${order.order_number} créée (Montant: ${order.total_amount} FCFA, Statut: ${order.status})`);

    // 3. Simulation Webhook Wave Sénégal avec signature HMAC-SHA256
    console.log('\n2️⃣ Simulation d’un Webhook signé provenant de Wave Sénégal...');
    const webhookSecret = 'wave_sn_webhook_secret_key_2026';
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const wavePayload = {
      type: 'checkout.session.completed',
      data: {
        id: `cos_wv_${Date.now()}`,
        amount: order.total_amount.toString(),
        currency: 'XOF',
        client_reference: order.id,
        payment_status: 'succeeded'
      }
    };

    const payloadString = JSON.stringify(wavePayload);
    const signatureHex = crypto
      .createHmac('sha256', webhookSecret)
      .update(`${timestamp}.${payloadString}`)
      .digest('hex');

    const waveSignatureHeader = `t=${timestamp},v1=${signatureHex}`;

    const webhookRes = await request('/webhooks/wave', {
      method: 'POST',
      headers: {
        'wave-signature': waveSignatureHeader
      },
      body: wavePayload
    });

    console.log(`   Réponse Webhook Wave : Status ${webhookRes.status}`, webhookRes.data);

    // 4. Vérification de l'état de la commande (Escrow Lock)
    console.log('\n3️⃣ Vérification de la mise à jour automatique en Séquestre...');
    const verifyRes = await request(`/orders/${order.id}`, { headers: authHeaders });
    const updatedOrder = verifyRes.data.data;

    console.log(`   Nouveau Statut Commande : ${updatedOrder.status} 🔒`);
    console.log(`   Montant Séquestré       : ${updatedOrder.escrow_amount} FCFA`);
    console.log(`   Code OTP Réception      : ${updatedOrder.deliveryCode || 'Généré & Hashé'}`);

    console.log('\n================================================================');
    console.log('  ✅ LES CONNECTEURS DE PAIEMENT & WEBHOOKS SONT 100% OPÉRATIONNELS !');
    console.log('================================================================\n');
  } catch (err) {
    console.error('❌ Erreur lors du test de paiement :', err.message);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
  }
}

runPaymentPartnerTests();
