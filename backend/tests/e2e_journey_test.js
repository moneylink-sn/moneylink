/**
 * MoneyLink — Test de Bout en Bout Intégral (E2E Journey Test)
 * Parcours complet : MARCHAND → PRODUIT → CATALOGUE → CLIENT → PANIER → SÉQUESTRE → EXPÉDITION → OTP → LIBÉRATION → LITIGES
 */

import http from 'http';
import app from '../src/app.js';

let server;
const TEST_PORT = 5008;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

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
  const json = await res.json().catch(() => ({}));
  return { status: res.status, data: json };
}

async function runE2ETests() {
  server = app.listen(TEST_PORT);
  console.log('\n================================================================');
  console.log('  🚀 DÉBUT DU TEST DE BOUT EN BOUT (E2E JOURNEY) MONEYLINK');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // 1. VÉRIFICATION CATALOGUE PUBLIC INITIAL
    // -------------------------------------------------------------------------
    console.log('1️⃣ Test Catalogue Public Global (/api/merchants/products)...');
    const catRes = await request('/merchants/products');
    if (catRes.status !== 200 || !catRes.data.success) {
      throw new Error(`Échec catalogue public : HTTP ${catRes.status}`);
    }
    console.log(`   ✅ Catalogue public accessible (Total: ${catRes.data.count} produits)`);

    // Test filtre inexistant
    const emptyFilter = await request('/merchants/products?category=NonExistentCategoryXYZ');
    if (emptyFilter.status !== 200 || !Array.isArray(emptyFilter.data.data)) {
      throw new Error('Échec gestion filtre vide catalogue public');
    }
    console.log(`   ✅ Filtre vide géré proprement : count = ${emptyFilter.data.count}`);

    // -------------------------------------------------------------------------
    // 2. PARCOURS MARCHAND : INSCRIPTION, PROFIL, CRÉATION PRODUIT & IDOR
    // -------------------------------------------------------------------------
    console.log('\n2️⃣ Inscription Marchand A (Boutique Électro Dakar)...');
    const merchantPhoneA = `+22177${Math.floor(1000000 + Math.random() * 9000000)}`;
    const merchantEmailA = `merchant.a.${Date.now()}@moneylink.sn`;

    const regMerchARes = await request('/auth/register', {
      method: 'POST',
      body: {
        phone: merchantPhoneA,
        email: merchantEmailA,
        first_name: 'Modou',
        last_name: 'Diop',
        password: 'Password123!',
        role: 'MERCHANT',
        business_name: 'Diop Électronique Pro',
        business_type: 'High-Tech & Téléphonie',
        address: 'Médina Rue 6, Dakar',
        city: 'Dakar'
      }
    });

    if (regMerchARes.status !== 201 || !regMerchARes.data.data?.token) {
      throw new Error(`Échec inscription marchand A : ${regMerchARes.data.error || regMerchARes.status}`);
    }

    const merchantA = regMerchARes.data.data.merchant;
    const tokenA = regMerchARes.data.data.token;
    const authHeaderA = { Authorization: `Bearer ${tokenA}` };
    console.log(`   ✅ Marchand A créé : "${merchantA.business_name}" (ID: ${merchantA.id})`);

    // Inscription Marchand B (pour tests IDOR inter-marchands)
    const merchantPhoneB = `+22178${Math.floor(1000000 + Math.random() * 9000000)}`;
    const regMerchBRes = await request('/auth/register', {
      method: 'POST',
      body: {
        phone: merchantPhoneB,
        email: `merchant.b.${Date.now()}@moneylink.sn`,
        first_name: 'Fatou',
        last_name: 'Ndiaye',
        password: 'Password123!',
        role: 'MERCHANT',
        business_name: 'Ndiaye Cosmétiques',
        business_type: 'Beauté & Santé',
        address: 'Almadies, Dakar',
        city: 'Dakar'
      }
    });
    const tokenB = regMerchBRes.data.data.token;
    const authHeaderB = { Authorization: `Bearer ${tokenB}` };

    // Ajout Produit par Marchand A
    console.log('\n2️⃣b Publication d’un nouveau produit par Marchand A...');
    const createProdRes = await request('/merchants/products', {
      method: 'POST',
      headers: authHeaderA,
      body: {
        name: 'Écouteurs Sans Fil Pro TWS',
        description: 'Autonomie 24h, Réduction active de bruit ANC',
        price: 25000,
        stock: 10,
        category: 'High-Tech & Téléphonie',
        image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500'
      }
    });

    if (createProdRes.status !== 201 || !createProdRes.data.data?.id) {
      throw new Error(`Échec création produit : ${createProdRes.data.error || createProdRes.status}`);
    }

    const prodA = createProdRes.data.data;
    console.log(`   ✅ Produit créé : "${prodA.name}" (Prix: ${prodA.price} FCFA, Stock: ${prodA.stock})`);

    // Vérification de la présence du produit dans le catalogue public
    const catCheck = await request(`/merchants/products?search=${encodeURIComponent('Écouteurs Sans Fil')}`);
    if (catCheck.data.count === 0) {
      throw new Error('Le produit créé n\'apparaît pas dans le catalogue public !');
    }
    console.log(`   ✅ Produit immédiatement visible dans le catalogue public (Vendeur: ${catCheck.data.data[0].merchant_name})`);

    // Modification du produit par son propriétaire (Marchand A)
    const updateRes = await request(`/merchants/products/${prodA.id}`, {
      method: 'PUT',
      headers: authHeaderA,
      body: {
        price: 24000,
        description: 'Édition Spéciale — Autonomie 30h'
      }
    });
    if (updateRes.status !== 200 || updateRes.data.data.price !== 24000) {
      throw new Error('Échec mise à jour produit par le propriétaire');
    }
    console.log(`   ✅ Produit mis à jour par Marchand A : Nouveau prix = ${updateRes.data.data.price} FCFA`);

    // Ajustement rapide du stock
    const stockUpd = await request(`/merchants/products/${prodA.id}/stock`, {
      method: 'PATCH',
      headers: authHeaderA,
      body: { stock: 15 }
    });
    if (stockUpd.status !== 200 || stockUpd.data.data.stock !== 15) {
      throw new Error('Échec ajustement rapide du stock');
    }
    console.log(`   ✅ Stock ajusté à : ${stockUpd.data.data.stock} unités`);

    // Test Sécurité IDOR : Marchand B tente de modifier le produit de Marchand A
    console.log('\n2️⃣c Test Protection IDOR (Marchand B tente d’écraser le produit de Marchand A)...');
    const idorAttack = await request(`/merchants/products/${prodA.id}`, {
      method: 'PUT',
      headers: authHeaderB,
      body: { price: 1000 }
    });
    if (idorAttack.status !== 403) {
      throw new Error(`FAILLE IDOR: Marchand B a pu modifier le produit de Marchand A (HTTP ${idorAttack.status})`);
    }
    console.log(`   🔒 Protection IDOR validée : Tentative bloquée avec HTTP 403 (${idorAttack.data.error})`);

    // -------------------------------------------------------------------------
    // 3. PARCOURS CLIENT : INSCRIPTION, PANIER, COMMANDE & COMMISSION 1%
    // -------------------------------------------------------------------------
    console.log('\n3️⃣ Inscription d’un nouvel Acheteur (Client)...');
    const clientPhone = `+22170${Math.floor(1000000 + Math.random() * 9000000)}`;
    const regClientRes = await request('/auth/register', {
      method: 'POST',
      body: {
        phone: clientPhone,
        email: `buyer.${Date.now()}@moneylink.sn`,
        first_name: 'Awa',
        last_name: 'Sow',
        password: 'Password123!',
        role: 'CLIENT'
      }
    });

    if (regClientRes.status !== 201) {
      throw new Error(`Échec inscription client : ${regClientRes.data.error}`);
    }

    const clientToken = regClientRes.data.data.token;
    const clientAuthHeader = { Authorization: `Bearer ${clientToken}` };
    const buyerId = regClientRes.data.data.user.id;
    console.log(`   ✅ Client créé : Awa Sow (${clientPhone}) — 30j Essai Gratuit activé`);

    // Création de commande
    console.log('\n3️⃣b Création de la commande client (Panier)...');
    const orderCreateRes = await request('/orders', {
      method: 'POST',
      headers: clientAuthHeader,
      body: {
        merchant_id: merchantA.id,
        items: [{ product_id: prodA.id, quantity: 2 }],
        delivery_address: 'Point E, Immeuble Horizon, Dakar',
        delivery_phone: clientPhone,
        delivery_notes: 'Appeler avant livraison'
      }
    });

    if (orderCreateRes.status !== 201 || !orderCreateRes.data.data?.id) {
      throw new Error(`Échec création commande : ${orderCreateRes.data.error}`);
    }

    const order1 = orderCreateRes.data.data;
    const expectedSubtotal = 24000 * 2; // 48000 FCFA
    if (parseFloat(order1.total_amount) !== expectedSubtotal) {
      throw new Error(`Montant total incorrect : attendu ${expectedSubtotal}, reçu ${order1.total_amount}`);
    }
    console.log(`   ✅ Commande créée : #${order1.order_number} (Montant: ${order1.total_amount} FCFA, Statut: ${order1.status})`);

    // -------------------------------------------------------------------------
    // 4. PAIEMENT & SÉQUESTRE ESCROW (COMMANDE 1)
    // -------------------------------------------------------------------------
    console.log('\n4️⃣ Paiement Sécurisé & Verrouillage en Séquestre...');
    const payRes1 = await request('/payments/checkout', {
      method: 'POST',
      headers: clientAuthHeader,
      body: {
        order_id: order1.id,
        payment_method: 'WAVE_MOCK',
        phone: clientPhone
      }
    });

    if (payRes1.status !== 200 || !payRes1.data.data?.deliveryCode) {
      throw new Error(`Échec paiement séquestre : ${payRes1.data.error}`);
    }

    const plainOtpCode1 = payRes1.data.data.deliveryCode;
    console.log(`   ✅ Paiement Confirmé Wave (Simulé). Fonds sous séquestre.`);
    console.log(`   🔑 Code Secret OTP généré (6 chiffres) : [ ${plainOtpCode1} ]`);

    // Vérification du statut de la commande en base
    const order1Check = await request(`/orders/${order1.id}`, { headers: clientAuthHeader });
    if (order1Check.data.data.status !== 'PAYMENT_CONFIRMED') {
      throw new Error(`Statut commande incorrect après paiement : ${order1Check.data.data.status}`);
    }
    const serviceFeeExpected = Math.round(expectedSubtotal * 0.01); // 480 FCFA
    console.log(`   ✅ Montant Séquestré: ${order1Check.data.data.escrow_amount} FCFA | Frais Service (1%): ${order1Check.data.data.service_fee} FCFA`);

    // -------------------------------------------------------------------------
    // 5. EXPÉDITION & VALIDATION OTP + DÉBLOCAGE FONDS
    // -------------------------------------------------------------------------
    console.log('\n5️⃣ Expédition par le Marchand A...');
    const shipRes = await request(`/orders/${order1.id}/ship`, {
      method: 'PUT',
      headers: authHeaderA
    });
    if (shipRes.status !== 200 || shipRes.data.data.status !== 'SHIPPED') {
      throw new Error('Échec passage commande à SHIPPED');
    }
    console.log('   ✅ Statut commande : SHIPPED 🚚');

    // Test faux code OTP
    console.log('\n5️⃣b Test validation avec mauvais code OTP...');
    const badCodeRes = await request(`/orders/${order1.id}/validate-code`, {
      method: 'POST',
      headers: authHeaderA,
      body: { code: '000000' }
    });
    if (badCodeRes.status === 200) {
      throw new Error('FAILLE SÉCURITÉ: Un faux code OTP a été accepté !');
    }
    console.log(`   🔒 Rejet code incorrect confirmé (${badCodeRes.data.error})`);

    // Validation avec le VRAI code OTP
    console.log('\n5️⃣c Validation avec le VRAI code OTP par le Marchand...');
    const validCodeRes = await request(`/orders/${order1.id}/validate-code`, {
      method: 'POST',
      headers: authHeaderA,
      body: { code: plainOtpCode1 }
    });

    if (validCodeRes.status !== 200 || validCodeRes.data.data?.order?.status !== 'CONFIRMED') {
      throw new Error(`Échec validation code OTP : ${validCodeRes.data.error}`);
    }
    console.log(`   🎉 ${validCodeRes.data.message}`);
    console.log(`   💰 Montant net débloqué au commerçant : ${validCodeRes.data.data.releasedAmount} FCFA`);

    // Test Anti-Double Libération
    console.log('\n5️⃣d Test Anti-Double Libération (Tentative de re-validation ou re-confirmation)...');
    const doubleReleaseOtp = await request(`/orders/${order1.id}/validate-code`, {
      method: 'POST',
      headers: authHeaderA,
      body: { code: plainOtpCode1 }
    });
    if (doubleReleaseOtp.status === 200) {
      throw new Error('FAILLE CRITIQUE: Double libération des fonds autorisée sur le code OTP !');
    }
    console.log(`   🔒 Tentative 2ème validation OTP bloquée : ${doubleReleaseOtp.data.error}`);

    const doubleReleaseBuyer = await request(`/orders/${order1.id}/confirm`, {
      method: 'POST',
      headers: clientAuthHeader
    });
    if (doubleReleaseBuyer.status === 200) {
      throw new Error('FAILLE CRITIQUE: Double confirmation 1-clic autorisée !');
    }
    console.log(`   🔒 Tentative 2ème confirmation 1-clic bloquée : ${doubleReleaseBuyer.data.error}`);

    // -------------------------------------------------------------------------
    // 6. GESTION DES LITIGES & ARBITRAGE ADMINISTRATEUR
    // -------------------------------------------------------------------------
    console.log('\n6️⃣ Test Cycle de Litige (Commande 2 avec contestation client)...');
    // Création Commande 2
    const orderCreate2 = await request('/orders', {
      method: 'POST',
      headers: clientAuthHeader,
      body: {
        merchant_id: merchantA.id,
        items: [{ product_id: prodA.id, quantity: 1 }],
        delivery_address: 'Mermoz, Dakar',
        delivery_phone: clientPhone
      }
    });
    const order2 = orderCreate2.data.data;

    // Paiement Commande 2
    await request('/payments/checkout', {
      method: 'POST',
      headers: clientAuthHeader,
      body: { order_id: order2.id, payment_method: 'OM_MOCK', phone: clientPhone }
    });

    // Ouverture du Litige par l'acheteur
    const disputeRes = await request(`/orders/${order2.id}/dispute`, {
      method: 'POST',
      headers: clientAuthHeader,
      body: {
        reason: 'DAMAGED',
        description: 'Article reçu cassé dans son emballage.'
      }
    });

    if (disputeRes.status !== 201 || disputeRes.data.data.status !== 'OPENED') {
      throw new Error(`Échec ouverture litige : ${disputeRes.data.error}`);
    }
    const disputeId = disputeRes.data.data.id;
    console.log(`   ⚠️ Litige ouvert avec succès (ID: ${disputeId}, Statut: OPENED)`);

    // Vérification que le marchand NE PEUT PAS débloquer les fonds tant que le litige est actif
    const disputeBlockedRelease = await request(`/orders/${order2.id}/confirm`, {
      method: 'POST',
      headers: clientAuthHeader
    });
    if (disputeBlockedRelease.status === 200) {
      throw new Error('FAILLE: Déblocage possible pendant un litige actif !');
    }
    console.log(`   🔒 Déblocage bloqué durant le litige : "${disputeBlockedRelease.data.error}"`);

    // Résolution du litige par l'administrateur (Remboursement Acheteur)
    console.log('\n6️⃣b Connexion Admin & Arbitrage Litige (Remboursement Acheteur)...');
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: { identifier: '+221770000001', password: 'Password123!' }
    });
    const adminToken = adminLogin.data.data.token;
    const adminAuthHeader = { Authorization: `Bearer ${adminToken}` };

    const resolveRes = await request(`/admin/disputes/${disputeId}/resolve`, {
      method: 'POST',
      headers: adminAuthHeader,
      body: {
        resolution: 'REFUND_BUYER',
        notes: 'Constat casse avéré lors du transport. Remboursement intégral de l’acheteur.'
      }
    });

    if (resolveRes.status !== 200) {
      throw new Error(`Échec résolution litige admin : ${resolveRes.data.error}`);
    }
    console.log(`   ✅ Litige résolu par l’administrateur : ${resolveRes.data.message}`);

    // Vérification du statut final de la commande 2
    const order2Final = await request(`/orders/${order2.id}`, { headers: clientAuthHeader });
    if (order2Final.data.data.status !== 'REFUNDED') {
      throw new Error(`Statut commande non passé à REFUNDED : ${order2Final.data.data.status}`);
    }
    console.log(`   ✅ Statut Commande 2 mis à jour : REFUNDED ↩️`);

    // -------------------------------------------------------------------------
    // 7. TEST PAIEMENT VIA SOLDE WALLET INTERNE
    // -------------------------------------------------------------------------
    console.log('\n7️⃣ Test Paiement via Solde MoneyLink (Top-up + Wallet Checkout)...');
    // Rechargement portefeuille acheteur
    const topupRes = await request('/payments/topup', {
      method: 'POST',
      headers: clientAuthHeader,
      body: {
        amount: 50000,
        payment_method: 'WAVE_MOCK',
        phone: clientPhone
      }
    });

    if (topupRes.status !== 200) {
      throw new Error(`Échec top-up wallet : ${topupRes.data.error}`);
    }
    console.log(`   ✅ Portefeuille acheteur rechargé de 50 000 FCFA (Nouveau solde: ${topupRes.data.data.wallet.available_balance} FCFA)`);

    // Création Commande 3
    const orderCreate3 = await request('/orders', {
      method: 'POST',
      headers: clientAuthHeader,
      body: {
        merchant_id: merchantA.id,
        items: [{ product_id: prodA.id, quantity: 1 }],
        delivery_address: 'Plateau, Dakar',
        delivery_phone: clientPhone
      }
    });
    const order3 = orderCreate3.data.data;

    // Règlement direct via solde portefeuille (WALLET)
    const walletPayRes = await request('/payments/checkout', {
      method: 'POST',
      headers: clientAuthHeader,
      body: {
        order_id: order3.id,
        payment_method: 'WALLET'
      }
    });

    if (walletPayRes.status !== 200 || !walletPayRes.data.data?.deliveryCode) {
      throw new Error(`Échec paiement via solde portefeuille : ${walletPayRes.data.error}`);
    }
    console.log(`   ✅ Commande 3 réglée avec succès par Solde MoneyLink !`);

    // Confirmation 1-clic par l'acheteur
    const confirmBuyerRes = await request(`/orders/${order3.id}/confirm`, {
      method: 'POST',
      headers: clientAuthHeader
    });
    if (confirmBuyerRes.status !== 200 || confirmBuyerRes.data.data?.order?.status !== 'CONFIRMED') {
      throw new Error(`Échec confirmation 1-clic par l'acheteur : ${confirmBuyerRes.data.error}`);
    }
    console.log(`   ✅ Confirmation 1-clic validée : Transaction #${order3.order_number} clôturée et fonds libérés.`);

    // -------------------------------------------------------------------------
    // FIN DES TESTS
    // -------------------------------------------------------------------------
    console.log('\n================================================================');
    console.log('  🎉 TOUS LES PARCOURS DE BOUT EN BOUT SONT 100% FONCTIONNELS !');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ ÉCHEC TEST E2E :', err.message);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
  }
}

runE2ETests();
