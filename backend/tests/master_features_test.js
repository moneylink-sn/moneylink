/**
 * MoneyLink — Test Suite Master : Sécurité, Catalogue, WhatsApp, Commandes, Livraison & UX
 * Validation intégrale des 7 piliers du Master Prompt
 */

import http from 'http';
import app from '../src/app.js';

let server;
const TEST_PORT = 5020;
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
  let json = {};
  try {
    json = await res.json();
  } catch (e) {
    json = { raw: await res.text() };
  }
  return { status: res.status, data: json };
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ÉCHEC ASSERTION : ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`   ✅ ${message}`);
}

async function runMasterTests() {
  server = app.listen(TEST_PORT);
  console.log('\n================================================================');
  console.log('  🚀 DÉBUT DU TEST SUITE MASTER MONEYLINK (7 PILIERS PROMPT)');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // PILIER 1 : Health Check & Disponibilité du Système
    // -------------------------------------------------------------------------
    console.log('1️⃣ Test Health Check (/api/health)...');
    const health = await request('/health');
    assert(health.status === 200, 'Health check retourne HTTP 200');
    assert(health.data.service.includes('MoneyLink'), 'Service name identifié MoneyLink');
    assert(health.data.currency === 'XOF / FCFA', 'Devise XOF / FCFA configurée');

    // -------------------------------------------------------------------------
    // PILIER 2 : Sécurité Super Admin Strictement Privé & Isolation Téléphone
    // -------------------------------------------------------------------------
    console.log('\n2️⃣ Test Sécurité Super Admin (Codé Samb) & Isolation Numéro Personnel...');
    
    // Login Super Admin
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: { identifier: 'admin@moneylink.sn', password: 'Password123!' }
    });
    assert(adminLogin.status === 200, 'Connexion Super Admin Codé Samb réussie');
    const adminToken = adminLogin.data.data.token;
    assert(!!adminToken, 'Token JWT Super Admin généré');

    // Accès Dashboard Admin avec Super Admin Token -> 200
    const adminDash = await request('/admin/dashboard', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminDash.status === 200, 'Super Admin accède avec succès au dashboard (/api/admin/dashboard)');
    assert(adminDash.data.data.metrics !== undefined, 'KPIs dashboard retournés');

    // Inscription d'un Client
    const clientPhone = `+22177${Math.floor(1000000 + Math.random() * 9000000)}`;
    const clientReg = await request('/auth/register', {
      method: 'POST',
      body: {
        phone: clientPhone,
        email: `buyer.${Date.now()}@moneylink.sn`,
        first_name: 'Cheikh',
        last_name: 'Fall',
        password: 'Password123!',
        role: 'CLIENT'
      }
    });
    assert(clientReg.status === 201, 'Inscription Client réussie');
    const clientToken = clientReg.data.data.token;

    // Tentative d'accès Admin par un Client -> 403
    const clientAdminAttempt = await request('/admin/dashboard', {
      headers: { Authorization: `Bearer ${clientToken}` }
    });
    assert(clientAdminAttempt.status === 403, 'Accès Admin REFUSÉ (403) pour un utilisateur rôle CLIENT');

    // Inscription d'un Marchand
    const merchantPhone = `+22177${Math.floor(1000000 + Math.random() * 9000000)}`;
    const merchantReg = await request('/auth/register', {
      method: 'POST',
      body: {
        phone: merchantPhone,
        email: `merchant.${Date.now()}@moneylink.sn`,
        first_name: 'Amadou',
        last_name: 'Ba',
        password: 'Password123!',
        role: 'MERCHANT',
        business_name: 'Dakar High Tech Boutique',
        city: 'Dakar'
      }
    });
    assert(merchantReg.status === 201, 'Inscription Commerçant réussie');
    const merchantToken = merchantReg.data.data.token;
    const merchantData = merchantReg.data.data.merchant;

    // Tentative d'accès Admin par un Commerçant -> 403
    const merchantAdminAttempt = await request('/admin/dashboard', {
      headers: { Authorization: `Bearer ${merchantToken}` }
    });
    assert(merchantAdminAttempt.status === 403, 'Accès Admin REFUSÉ (403) pour un utilisateur rôle MERCHANT');

    // Accès sans token -> 401
    const noTokenAttempt = await request('/admin/dashboard');
    assert(noTokenAttempt.status === 401, 'Accès sans token REFUSÉ (401 Unauthorized)');

    // Accès avec token invalide -> 401
    const invalidTokenAttempt = await request('/admin/dashboard', {
      headers: { Authorization: 'Bearer token_completement_invalide_xyz' }
    });
    assert(invalidTokenAttempt.status === 401, 'Accès avec token invalide REFUSÉ (401)');

    // Vérification isolation numéro personnel (+221 70 608 21 20)
    const merchantsListRes = await request('/admin/users', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(merchantsListRes.status === 200, 'Liste des utilisateurs récupérée');
    const allUsers = merchantsListRes.data.data;
    const adminPersonalPhone = '706082120';
    const foundAdminAsMerchant = allUsers.some(u => u.role === 'MERCHANT' && (u.phone || '').replace(/[^0-9]/g, '').includes(adminPersonalPhone));
    assert(!foundAdminAsMerchant, 'Isolation stricte : Le numéro personnel de l’admin n’est JAMAIS utilisé comme numéro marchand');

    // -------------------------------------------------------------------------
    // PILIER 3 : Base de Données Livreurs & Relations
    // -------------------------------------------------------------------------
    console.log('\n3️⃣ Test Base de Données Livreurs (delivery_persons) & Relations...');
    const dpListRes = await request('/admin/delivery-persons', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(dpListRes.status === 200, 'Route GET /api/admin/delivery-persons accessible');
    assert(Array.isArray(dpListRes.data.data), 'Liste des livreurs retournée sous forme de tableau');
    assert(dpListRes.data.data.length >= 1, 'Au moins un livreur disponible présent dans le système');
    const firstDeliveryPerson = dpListRes.data.data[0];
    assert(firstDeliveryPerson.first_name !== undefined, 'Livreur possède un prénom');
    assert(firstDeliveryPerson.phone !== undefined, 'Livreur possède un téléphone');
    console.log(`   ℹ️ Livreur disponible détecté : ${firstDeliveryPerson.first_name} ${firstDeliveryPerson.last_name} (${firstDeliveryPerson.phone})`);

    // -------------------------------------------------------------------------
    // PILIER 4 : Synchronisation Catalogue Public & Boutiques Agréées
    // -------------------------------------------------------------------------
    console.log('\n4️⃣ Test Synchronisation Automatique Catalogue (/api/products & /api/merchants/products)...');
    
    // Test GET /api/products
    const publicProductsRes = await request('/products');
    assert(publicProductsRes.status === 200, 'GET /api/products public accessible');
    assert(Array.isArray(publicProductsRes.data.data), 'Catalogue renvoie une liste de produits');
    assert(publicProductsRes.data.data.length > 0, 'Produits initiaux présents dans le catalogue');
    
    const sampleProd = publicProductsRes.data.data[0];
    assert(sampleProd.merchant_name !== undefined, 'Produit inclut le nom de la boutique');
    assert(sampleProd.merchant_phone !== undefined, 'Produit inclut le téléphone marchand pour WhatsApp');
    assert(sampleProd.merchant_is_verified !== undefined, 'Produit inclut le statut vérifié de la boutique');

    // Test GET /api/products/:id
    const prodDetailRes = await request(`/products/${sampleProd.id}`);
    assert(prodDetailRes.status === 200, `GET /api/products/${sampleProd.id} retourne le détail du produit`);
    assert(prodDetailRes.data.data.name === sampleProd.name, 'Nom du produit conforme');

    // Ajout d'un nouveau produit par le commerçant connecté
    const newProdRes = await request('/merchants/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${merchantToken}` },
      body: {
        name: 'Casque Gaming Surround 7.1',
        description: 'Casque avec micro antibruit et rétroéclairage RGB.',
        price: 25000,
        stock: 15,
        category: 'Accessoires',
        image_url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500'
      }
    });
    assert(newProdRes.status === 201, 'POST /api/merchants/products crée le produit avec succès');
    const createdProd = newProdRes.data.data;
    assert(createdProd.is_active === true, 'Le nouveau produit est actif par défaut');

    // Vérification de l'apparition immédiate dans le catalogue public
    const updatedCatalogRes = await request('/products?search=Gaming');
    assert(updatedCatalogRes.status === 200, 'Recherche catalogue par mot-clé fonctionne');
    const foundNewProd = updatedCatalogRes.data.data.some(p => p.id === createdProd.id);
    assert(foundNewProd, 'Le nouveau produit est immédiatement synchronisé et visible dans le catalogue public');

    // -------------------------------------------------------------------------
    // PILIER 5 : Panier & Recalcul Strict des Prix / Contrôle de Stock
    // -------------------------------------------------------------------------
    console.log('\n5️⃣ Test Recalcul Serveur du Panier & Contrôle de Stock...');
    
    // Panier vide -> 400
    const emptyCartRes = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${clientToken}` },
      body: {
        merchant_id: sampleProd.merchant_id,
        items: [],
        delivery_address: 'Mermoz, Dakar'
      }
    });
    assert(emptyCartRes.status === 400, 'Création commande rejetée (400) si panier vide');

    // Quantité négative ou nulle -> 400
    const invalidQtyRes = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${clientToken}` },
      body: {
        merchant_id: sampleProd.merchant_id,
        items: [{ product_id: sampleProd.id, quantity: -2 }],
        delivery_address: 'Mermoz, Dakar'
      }
    });
    assert(invalidQtyRes.status === 400, 'Création commande rejetée (400) si quantité négative');

    // Dépassement de stock -> 400
    const excessStockRes = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${clientToken}` },
      body: {
        merchant_id: sampleProd.merchant_id,
        items: [{ product_id: sampleProd.id, quantity: 999999 }],
        delivery_address: 'Mermoz, Dakar'
      }
    });
    assert(excessStockRes.status === 400, 'Création commande rejetée (400) si quantité supérieure au stock');
    assert(excessStockRes.data.error.includes('Stock insuffisant'), 'Message d’erreur clair "Stock insuffisant"');

    // -------------------------------------------------------------------------
    // PILIER 6 : Parcours Commande WhatsApp & Statut Non-PAID
    // -------------------------------------------------------------------------
    console.log('\n6️⃣ Test Parcours Commande WhatsApp, Statut PENDING_PAYMENT & Code OTP...');
    
    const validOrderRes = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${clientToken}` },
      body: {
        merchant_id: sampleProd.merchant_id,
        items: [{ product_id: sampleProd.id, quantity: 1 }],
        delivery_address: 'Almadies, Zone 4, Villa 12, Dakar',
        delivery_phone: clientPhone,
        delivery_notes: 'Sonner à l’interphone'
      }
    });

    assert(validOrderRes.status === 201, 'Commande créée avec succès (HTTP 201)');
    const orderData = validOrderRes.data.data;
    
    // Vérification stricte : Statut NON-PAID
    assert(orderData.status === 'PENDING_PAYMENT', 'Statut de la commande initialisé à PENDING_PAYMENT (NON-PAID)');
    assert(orderData.status !== 'PAID' && orderData.status !== 'CONFIRMED', 'La commande n’est JAMAIS marquée PAID automatiquement');

    // Vérification du montant recalculé côté serveur
    assert(parseFloat(orderData.total_amount) === parseFloat(sampleProd.price), 'Total de la commande recalculé exactement depuis la base');

    // Vérification message et lien WhatsApp
    assert(orderData.whatsapp_message !== undefined, 'Message WhatsApp formaté généré');
    assert(orderData.whatsapp_message.includes('COMMANDE MONEYLINK'), 'En-tête officiel WhatsApp présent');
    assert(orderData.whatsapp_message.includes(orderData.order_number), 'Référence commande présente dans le message WhatsApp');
    assert(orderData.whatsapp_message.includes('Total :'), 'Total présent dans le message WhatsApp');
    assert(orderData.whatsapp_url !== undefined, 'URL WhatsApp générée');
    assert(orderData.whatsapp_url.startsWith('https://wa.me/'), 'Lien WhatsApp conforme wa.me');

    // Vérification Code OTP & Livreur
    assert(orderData.delivery_code !== undefined && orderData.delivery_code.length === 6, 'Code secret OTP de livraison à 6 chiffres généré');
    assert(orderData.delivery_person !== null, 'Livreur partenaire automatiquement assigné');
    console.log(`   ℹ️ Commande #${orderData.order_number} générée. OTP: ${orderData.delivery_code}. Livreur: ${orderData.delivery_person.first_name} ${orderData.delivery_person.last_name}`);

    // -------------------------------------------------------------------------
    // PILIER 7 : Consultation Commandes & Validation Livraison OTP
    // -------------------------------------------------------------------------
    console.log('\n7️⃣ Test Consultation des Commandes & Validation Finale OTP...');
    
    // Consultation par le client
    const clientOrdersRes = await request('/orders', {
      headers: { Authorization: `Bearer ${clientToken}` }
    });
    assert(clientOrdersRes.status === 200, 'GET /api/orders retourne les commandes du client');
    const myOrder = clientOrdersRes.data.data.find(o => o.id === orderData.id);
    assert(myOrder !== undefined, 'La commande créée est visible dans le compte client');
    assert(myOrder.delivery_person !== null, 'Détails du livreur accessibles pour le client');
    assert(myOrder.whatsapp_url !== null, 'Lien WhatsApp présent pour réouverture');

    // Simulation : Le client paie en séquestre
    const payRes = await request('/payments/checkout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${clientToken}` },
      body: {
        order_id: orderData.id,
        payment_method: 'WAVE_MOCK'
      }
    });
    assert(payRes.status === 200, 'Paiement Wave en Séquestre validé');

    // Expédition par le marchand
    // Trouvons le token du propriétaire de sampleProd
    const shipRes = await request(`/orders/${orderData.id}/ship`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` } // Admin ou propriétaire
    });
    assert(shipRes.status === 200, 'Commande marquée comme expédiée (SHIPPED)');

    // Validation avec Code OTP Erroné -> 400
    const wrongOtpRes = await request(`/orders/${orderData.id}/validate-delivery-code`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { code: '000000' }
    });
    assert(wrongOtpRes.status === 400, 'Validation avec mauvais code OTP refusée (400)');

    // Validation avec Bon Code OTP -> 200 & Déblocage des fonds
    const validOtpRes = await request(`/orders/${orderData.id}/validate-delivery-code`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { code: orderData.delivery_code }
    });
    assert(validOtpRes.status === 200, 'Code OTP validé avec succès (200 OK)');
    assert(validOtpRes.data.data.order.status === 'CONFIRMED', 'Statut de commande mis à jour à CONFIRMED');
    console.log('   🎉 Cycle complet de commande, livraison et séquestre validé avec succès !');

    console.log('\n================================================================');
    console.log('  🌟 TOUS LES TESTS MASTER SONT PASSÉS AVEC SUCCÈS (100%) !');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ ERREUR LORS DE L’EXÉCUTION DES TESTS MASTER :', err.message);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
  }
}

runMasterTests();
