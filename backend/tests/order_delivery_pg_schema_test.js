/**
 * MoneyLink — Test Dédié : Schéma PostgreSQL, Commandes, Livreurs & Sécurité
 * 
 * Vérifie spécifiquement les 10 points obligatoires :
 * 1. GET /api/orders avec JWT CLIENT → HTTP 200
 * 2. Aucun historique de commande → tableau vide [], pas d'erreur 500
 * 3. POST /api/orders → fonctionnement normal avec recalcul serveur
 * 4. Attribution d'un livreur disponible
 * 5. Affichage nom + téléphone du livreur
 * 6. Génération du code OTP à 6 chiffres
 * 7. Conservation du hash OTP
 * 8. Validation du code de livraison
 * 9. Flux WhatsApp
 * 10. Super Admin toujours strictement privé
 */

import http from 'http';
import assert from 'assert';
import app from '../src/app.js';
import { pool, checkDbHealth, ensureDeliveryPersonsTable } from '../src/config/db.js';

const TEST_PORT = 5099;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;
let server;

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
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runSchemaAndOrderTests() {
  console.log('\n================================================================');
  console.log('  🧪 TESTS DE VALIDATION : SCHÉMA POSTGRESQL, COMMANDES & LIVREURS');
  console.log('================================================================\n');

  try {
    server = app.listen(TEST_PORT);

    // -------------------------------------------------------------------------
    // ÉTAPE 0 : Diagnostic & Auto-réparation du Schéma
    // -------------------------------------------------------------------------
    console.log('0️⃣ Test Initialisation & Auto-Réparation Schéma DB...');
    const health = await checkDbHealth();
    assert(health !== null, 'checkDbHealth a répondu');
    console.log(`   Mode DB actif : ${health.mode || 'IN_MEMORY'}`);

    // -------------------------------------------------------------------------
    // CRITÈRE 10 : Super Admin Toujours Strictement Privé
    // -------------------------------------------------------------------------
    console.log('\n🔟 Test Isolation Stricte du Super Admin (RBAC & Identifiants)...');
    
    // 10a. Tentative d'accès à la route admin sans token -> 401
    const unauthAdmin = await request('/admin/stats');
    assert(unauthAdmin.status === 401, 'Accès /api/admin/stats sans token refusé avec HTTP 401');

    // 10b. Connexion Admin légitime (Codé Samb)
    const adminLoginRes = await request('/auth/login', {
      method: 'POST',
      body: { identifier: '+221770000001', password: 'Password123!' }
    });
    assert(adminLoginRes.status === 200, 'Connexion Admin légitime réussie');
    const adminToken = adminLoginRes.data.data.token;
    const adminUser = adminLoginRes.data.data.user;
    assert(adminUser.role === 'ADMIN', 'Le rôle de l’administrateur racine est ADMIN');

    // 10c. Vérification de la liste des livreurs via route Admin
    const adminDpRes = await request('/admin/delivery-persons', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminDpRes.status === 200, 'GET /api/admin/delivery-persons accessible par Admin (HTTP 200)');
    assert(Array.isArray(adminDpRes.data.data), 'Liste des livreurs renvoyée sous forme de tableau');
    assert(adminDpRes.data.data.length >= 2, 'Au moins 2 livreurs de référence présents dans le système');
    
    const mamadou = adminDpRes.data.data.find(d => (d.phone || '').replace(/[^0-9]/g, '').includes('778901234'));
    const ibrahima = adminDpRes.data.data.find(d => (d.phone || '').replace(/[^0-9]/g, '').includes('778901235'));
    assert(mamadou !== undefined, 'Livreur de référence Mamadou Diop (+221 77 890 12 34) présent');
    assert(ibrahima !== undefined, 'Livreur de référence Ibrahima Ndiaye (+221 77 890 12 35) présent');
    console.log(`   ✅ Livreurs vérifiés : ${mamadou.first_name} ${mamadou.last_name} & ${ibrahima.first_name} ${ibrahima.last_name}`);

    // -------------------------------------------------------------------------
    // CRITÈRE 1 & 2 : Inscription Nouveau Client & GET /api/orders (Tableau Vide)
    // -------------------------------------------------------------------------
    console.log('\n1️⃣ & 2️⃣ Inscription Nouveau Client & GET /api/orders à Vide...');
    const clientPhone = `+22177${Math.floor(1000000 + Math.random() * 9000000)}`;
    const regClientRes = await request('/auth/register', {
      method: 'POST',
      body: {
        phone: clientPhone,
        email: `schema.client.${Date.now()}@moneylink.sn`,
        first_name: 'Modou',
        last_name: 'Fall',
        password: 'Password123!',
        role: 'CLIENT'
      }
    });
    assert(regClientRes.status === 201, 'Inscription nouveau client réussie (HTTP 201)');
    const clientToken = regClientRes.data.data.token;
    const clientAuth = { Authorization: `Bearer ${clientToken}` };

    // Vérification du critère 1 & 2 : GET /api/orders avec JWT Client renvoie HTTP 200 et tableau vide [] sans erreur 500
    const emptyOrdersRes = await request('/orders', { headers: clientAuth });
    assert(emptyOrdersRes.status === 200, 'GET /api/orders avec JWT CLIENT retourne HTTP 200');
    assert(Array.isArray(emptyOrdersRes.data.data), 'data est un tableau');
    assert(emptyOrdersRes.data.data.length === 0, 'Aucun historique de commande → tableau vide [] (pas d’erreur 500)');
    console.log('   ✅ GET /api/orders sans historique = HTTP 200 et tableau vide [] validé');

    // 10d. Test Tentative Accès Admin par ce Client -> 403
    const clientAdminAccess = await request('/admin/stats', { headers: clientAuth });
    assert(clientAdminAccess.status === 403, 'Client non-admin bloqué sur route admin avec HTTP 403 (RBAC)');

    // -------------------------------------------------------------------------
    // CRITÈRE 3, 4, 5, 6, 7 & 9 : POST /api/orders (Création, Livreur, OTP, WhatsApp)
    // -------------------------------------------------------------------------
    console.log('\n3️⃣ à 7️⃣ & 9️⃣ Création Commande, Livreur, OTP & WhatsApp...');
    
    // Récupération d'un marchand et produit existants
    const prodRes = await request('/products');
    assert(prodRes.status === 200 && prodRes.data.data.length > 0, 'Catalogue produits accessible');
    const product = prodRes.data.data[0];

    // Création de la commande
    const newOrderPayload = {
      merchant_id: product.merchant_id,
      items: [
        { product_id: product.id, quantity: 2 }
      ],
      delivery_address: 'Mermoz, Rue 12, Immeuble Aïcha, Dakar',
      delivery_phone: clientPhone,
      delivery_notes: 'Appeler à l’arrivée'
    };

    const createOrderRes = await request('/orders', {
      method: 'POST',
      headers: clientAuth,
      body: newOrderPayload
    });

    // 3. POST /api/orders -> fonctionnement normal
    assert(createOrderRes.status === 201, 'POST /api/orders retourne HTTP 201');
    const order = createOrderRes.data.data;
    assert(order.id !== undefined, 'Commande possède un identifiant');
    assert(order.order_number.startsWith('ML-'), 'Numéro de commande formaté ML-');
    assert(parseFloat(order.total_amount) === parseFloat(product.price) * 2, 'Recalcul du montant total exact côté serveur');
    assert(order.status === 'PENDING_PAYMENT', 'Statut initial PENDING_PAYMENT');

    // 4. Attribution d'un livreur
    assert(order.delivery_person_id !== null && order.delivery_person_id !== undefined, 'Livreur assigné (delivery_person_id non null)');
    assert(order.delivery_person !== null, 'Objet delivery_person attaché à la commande');

    // 5. Affichage nom + téléphone du livreur
    assert(typeof order.delivery_person.first_name === 'string' && order.delivery_person.first_name.length > 0, 'Prénom du livreur affiché');
    assert(typeof order.delivery_person.last_name === 'string' && order.delivery_person.last_name.length > 0, 'Nom du livreur affiché');
    assert(typeof order.delivery_person.phone === 'string' && order.delivery_person.phone.length > 0, 'Téléphone du livreur affiché');
    console.log(`   ✅ Livreur assigné : ${order.delivery_person.first_name} ${order.delivery_person.last_name} (${order.delivery_person.phone})`);

    // 6. Génération du code OTP à 6 chiffres
    assert(typeof order.delivery_code === 'string' && order.delivery_code.length === 6, 'Code secret OTP à 6 chiffres généré');
    assert(/^\d{6}$/.test(order.delivery_code), 'Code OTP composé exactement de 6 chiffres');
    console.log(`   🔑 Code secret OTP généré : [ ${order.delivery_code} ]`);

    // 7. Conservation du hash OTP
    assert(order.delivery_code_hash !== undefined && order.delivery_code_hash !== null, 'Hash du code OTP présent');
    assert(order.delivery_code_hash.startsWith('$2'), 'Hash OTP conforme à un hash Bcrypt sécurisé ($2...)');

    // 9. Flux WhatsApp
    assert(order.whatsapp_message !== undefined, 'Message WhatsApp formaté généré');
    assert(order.whatsapp_message.includes('Bonjour, je souhaite passer une commande sur MoneyLink.'), 'Contenu officiel WhatsApp présent');
    assert(order.whatsapp_message.includes(order.order_number), 'Numéro de commande inclus dans le message WhatsApp');
    assert(order.whatsapp_url !== undefined && order.whatsapp_url.startsWith('https://wa.me/'), 'Lien wa.me généré pour échange direct');

    // -------------------------------------------------------------------------
    // VÉRIFICATION : GET /api/orders avec la commande créée
    // -------------------------------------------------------------------------
    console.log('\n📋 Vérification GET /api/orders avec commande active...');
    const userOrdersRes = await request('/orders', { headers: clientAuth });
    assert(userOrdersRes.status === 200, 'GET /api/orders retourne HTTP 200');
    assert(userOrdersRes.data.data.length >= 1, 'La commande créée apparaît dans la liste');
    const fetchedOrder = userOrdersRes.data.data.find(o => o.id === order.id);
    assert(fetchedOrder !== undefined, 'Commande trouvée par ID');
    assert(fetchedOrder.delivery_person !== null, 'Détails du livreur conservés dans la liste');
    assert(fetchedOrder.delivery_person.first_name === order.delivery_person.first_name, 'Prénom livreur cohérent');

    // -------------------------------------------------------------------------
    // CRITÈRE 8 : Validation du code de livraison
    // -------------------------------------------------------------------------
    console.log('\n8️⃣ Paiement, Expédition & Validation du Code de Livraison...');
    
    // Paiement de la commande en séquestre
    const payRes = await request('/payments/checkout', {
      method: 'POST',
      headers: clientAuth,
      body: { order_id: order.id, payment_method: 'WAVE_MOCK' }
    });
    assert(payRes.status === 200, 'Paiement Wave en séquestre validé');

    // Expédition (Marchand ou Admin)
    const shipRes = await request(`/orders/${order.id}/ship`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(shipRes.status === 200, 'Statut de la commande passé à SHIPPED');

    // Validation avec mauvais code OTP -> 400
    const badOtpRes = await request(`/orders/${order.id}/validate-delivery-code`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { code: '999999' }
    });
    assert(badOtpRes.status === 400, 'Tentative de validation avec mauvais code OTP rejetée (HTTP 400)');

    // Validation avec le BON code OTP -> 200
    const goodOtpRes = await request(`/orders/${order.id}/validate-delivery-code`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { code: order.delivery_code }
    });
    assert(goodOtpRes.status === 200, 'Validation avec le bon code OTP acceptée (HTTP 200)');
    assert(goodOtpRes.data.data.order.status === 'CONFIRMED', 'Commande passée au statut CONFIRMED et fonds libérés');
    console.log('   🎉 Code OTP validé et séquestre libéré avec succès !');

    console.log('\n================================================================');
    console.log('  🌟 LES 10 CRITÈRES SONT 100% VALIDÉS ET CONFORMES !');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ ÉCHEC DU TEST :', err.message);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
  }
}

runSchemaAndOrderTests();
