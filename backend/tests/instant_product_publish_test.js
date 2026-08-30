/**
 * MoneyLink — Test Automatisé : Affichage Immédiat des Produits Marchands dans le Catalogue Public
 * Valide les 7 exigences fonctionnelles & sécuritaires :
 * 1. Marchand crée un produit -> 201 Created (is_active: true, status: APPROVED)
 * 2. Produit immédiatement présent dans GET /api/products (sans validation admin préalable)
 * 3. Produit désactivé -> absent du catalogue public
 * 4. Produit supprimé -> absent du catalogue public
 * 5. Marchand B tente de modifier le produit de Marchand A -> 403 Forbidden (IDOR)
 * 6. Client tente de créer un produit -> 403 Forbidden (RBAC)
 * 7. Non authentifié tente de créer un produit -> 401 Unauthorized
 */

import app from '../src/app.js';
import { memoryStore } from '../src/config/db.js';

let server;
const TEST_PORT = 5019;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

async function apiRequest(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined
  });

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = await res.json().catch(() => ({}));
    return { status: res.status, data: json, headers: res.headers };
  } else {
    const text = await res.text().catch(() => '');
    return { status: res.status, data: { text }, headers: res.headers };
  }
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ÉCHEC : ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`  ✓ ${message}`);
  }
}

async function runInstantProductPublishTests() {
  server = app.listen(TEST_PORT);
  console.log('\n================================================================');
  console.log('  🛍️ MONEYLINK — TESTS AFFICHAGE IMMÉDIAT DES PRODUITS MARCHANDS');
  console.log('================================================================\n');

  try {
    let merchantTokenA;
    let merchantTokenB;
    let clientToken;
    let adminToken;
    let createdProductAId;

    // 0. Authentification des utilisateurs
    console.log('0️⃣ Connexion des acteurs (Marchand A, Marchand B, Client, Super Admin)...');
    
    const loginA = await apiRequest('/auth/login', {
      method: 'POST',
      body: { identifier: '+221770000002', password: 'Password123!' }
    });
    assert(loginA.status === 200 && loginA.data.data.token, 'Connexion Marchand A réussie');
    merchantTokenA = loginA.data.data.token;

    const loginB = await apiRequest('/auth/login', {
      method: 'POST',
      body: { identifier: '+221770000003', password: 'Password123!' }
    });
    assert(loginB.status === 200 && loginB.data.data.token, 'Connexion Marchand B réussie');
    merchantTokenB = loginB.data.data.token;

    const loginClient = await apiRequest('/auth/login', {
      method: 'POST',
      body: { identifier: '+221770000004', password: 'Password123!' }
    });
    assert(loginClient.status === 200 && loginClient.data.data.token, 'Connexion Client réussie');
    clientToken = loginClient.data.data.token;

    const loginAdmin = await apiRequest('/auth/login', {
      method: 'POST',
      body: { identifier: 'admin@moneylink.sn', password: 'Password123!' }
    });
    assert(loginAdmin.status === 200 && loginAdmin.data.data.token, 'Connexion Super Admin réussie');
    adminToken = loginAdmin.data.data.token;

    // TEST 1 : Marchand connecté crée un produit -> 201 Created
    console.log('\n1️⃣ Test 1 : Création de produit par le Marchand A (POST /api/merchants/products)...');
    const uniqueProdName = `Smartphone Pro Max 5G — ${Date.now()}`;
    const createRes = await apiRequest('/merchants/products', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${merchantTokenA}` },
      body: {
        name: uniqueProdName,
        description: 'Smartphone haut de gamme livré sous scellé avec garantie MoneyLink',
        price: 275000,
        stock: 5,
        category: 'Électronique & High-Tech',
        subcategory: 'Smartphones',
        city: 'Dakar',
        quartier: 'Plateau',
        location: 'Plateau, Dakar',
        image_url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500'
      }
    });

    assert(createRes.status === 201, 'Marchand crée produit -> Code HTTP 201 Created');
    assert(createRes.data.data?.id, 'ID du produit généré et retourné');
    assert(createRes.data.data?.is_active === true, 'Le produit est créé avec is_active = true');
    assert(createRes.data.data?.status === 'APPROVED', 'Le produit est créé avec status = APPROVED (prêt sans modération bloquante)');
    assert(createRes.data.data?.stock === 5, 'Le stock est initialisé à 5');
    createdProductAId = createRes.data.data.id;

    // TEST 2 : Produit nouvellement créé présent IMMÉDIATEMENT dans GET /api/products
    console.log('\n2️⃣ Test 2 : Présence immédiate du produit dans le catalogue public (GET /api/products)...');
    const catalogRes = await apiRequest(`/products?search=${encodeURIComponent(uniqueProdName)}`);
    assert(catalogRes.status === 200, 'GET /api/products retourne 200 OK');
    assert(Array.isArray(catalogRes.data.data), 'Format de données valide (tableau)');
    const foundInCatalog = catalogRes.data.data.find(p => p.id === createdProductAId || p.name === uniqueProdName);
    assert(Boolean(foundInCatalog), 'Produit nouvellement créé immédiatement visible dans GET /api/products sans validation admin');
    assert(foundInCatalog.is_active === true, 'Le produit est marqué actif dans le catalogue');
    assert(foundInCatalog.merchant_name, 'Les informations du marchand vendeur sont attachées');

    // Vérification également sur GET /api/merchants/products (alias de catalogue)
    const merchantCatalogRes = await apiRequest(`/merchants/products?search=${encodeURIComponent(uniqueProdName)}`);
    assert(merchantCatalogRes.status === 200, 'GET /api/merchants/products retourne 200 OK');
    const foundInMerchantCatalog = merchantCatalogRes.data.data.find(p => p.id === createdProductAId);
    assert(Boolean(foundInMerchantCatalog), 'Produit visible immédiatement dans GET /api/merchants/products');

    // TEST 3 : Produit désactivé -> absent du catalogue public
    console.log('\n3️⃣ Test 3 : Désactivation du produit et vérification d\'absence du catalogue...');
    const deactRes = await apiRequest(`/merchants/products/${createdProductAId}/status`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${merchantTokenA}` },
      body: { is_active: false, status: 'INACTIVE' }
    });
    assert(deactRes.status === 200, 'Marchand désactive son produit avec succès (200 OK)');
    assert(deactRes.data.data?.is_active === false, 'Statut is_active passé à false');

    const catalogAfterDeact = await apiRequest(`/products?search=${encodeURIComponent(uniqueProdName)}`);
    const foundAfterDeact = catalogAfterDeact.data.data?.find(p => p.id === createdProductAId);
    assert(!foundAfterDeact, 'Produit désactivé ABSENT du catalogue public GET /api/products');

    // Réactivation pour les tests suivants
    const reactRes = await apiRequest(`/merchants/products/${createdProductAId}/status`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${merchantTokenA}` },
      body: { is_active: true, status: 'APPROVED' }
    });
    assert(reactRes.status === 200, 'Marchand réactive son produit');

    // TEST 4 : Produit supprimé -> absent du catalogue public
    console.log('\n4️⃣ Test 4 : Suppression logique du produit et vérification du catalogue...');
    // Création d'un produit temporaire à supprimer
    const tempProdRes = await apiRequest('/merchants/products', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${merchantTokenA}` },
      body: {
        name: `Produit Éphémère — ${Date.now()}`,
        price: 15000,
        stock: 2,
        category: 'Divers'
      }
    });
    assert(tempProdRes.status === 201, 'Création produit temporaire');
    const tempProdId = tempProdRes.data.data.id;

    // Suppression
    const deleteRes = await apiRequest(`/merchants/products/${tempProdId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${merchantTokenA}` }
    });
    assert(deleteRes.status === 200, 'Marchand supprime son produit (200 OK)');

    const catalogAfterDelete = await apiRequest(`/products`);
    const foundAfterDelete = catalogAfterDelete.data.data?.find(p => p.id === tempProdId);
    assert(!foundAfterDelete, 'Produit supprimé ABSENT du catalogue public');

    // TEST 5 : Marchand A -> impossible de modifier produit B (IDOR)
    console.log('\n5️⃣ Test 5 : Sécurité IDOR multi-marchands (Marchand B tente de modifier le produit de Marchand A)...');
    const idorUpdate = await apiRequest(`/merchants/products/${createdProductAId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${merchantTokenB}` },
      body: { name: 'Tentative Piratage Prix', price: 100 }
    });
    assert(idorUpdate.status === 403, 'IDOR Bloqué (403 Forbidden) : Marchand B ne peut pas modifier le produit de Marchand A');

    const idorStock = await apiRequest(`/merchants/products/${createdProductAId}/stock`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${merchantTokenB}` },
      body: { stock: 0 }
    });
    assert(idorStock.status === 403, 'IDOR Bloqué (403 Forbidden) : Marchand B ne peut pas modifier le stock de Marchand A');

    const idorDelete = await apiRequest(`/merchants/products/${createdProductAId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${merchantTokenB}` }
    });
    assert(idorDelete.status === 403, 'IDOR Bloqué (403 Forbidden) : Marchand B ne peut pas supprimer le produit de Marchand A');

    // TEST 6 : Client -> impossible de créer un produit (RBAC)
    console.log('\n6️⃣ Test 6 : Contrôle de rôle RBAC (Un utilisateur CLIENT tente d\'ajouter un produit)...');
    const clientCreate = await apiRequest('/merchants/products', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${clientToken}` },
      body: { name: 'Vente Interdite Client', price: 50000, stock: 1 }
    });
    assert(clientCreate.status === 403, 'RBAC Bloqué (403 Forbidden) : Un client ne peut pas créer de produit');

    // TEST 7 : Non authentifié -> impossible de créer un produit (401)
    console.log('\n7️⃣ Test 7 : Sécurité Authentification (Tentative sans token JWT)...');
    const unauthCreate = await apiRequest('/merchants/products', {
      method: 'POST',
      body: { name: 'Produit Anonyme', price: 10000 }
    });
    assert(unauthCreate.status === 401, 'Non authentifié Bloqué (401 Unauthorized)');

    console.log('\n================================================================');
    console.log('  🎉 TOUS LES 7 TESTS D\'AFFICHAGE IMMÉDIAT ET DE SÉCURITÉ SONT VALIDÉS !');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ ERREUR LORS DE L\'EXÉCUTION DES TESTS :', err);
    process.exit(1);
  } finally {
    if (server) server.close();
  }
}

runInstantProductPublishTests();
