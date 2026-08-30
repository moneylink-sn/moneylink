/**
 * MoneyLink — Test Automatisé Spécifique : Non-Duplication et Intégrité du Catalogue Produits
 * Fichier : backend/tests/catalog_duplicate_products_test.js
 * 
 * Vérifie :
 * 1. Aucun doublon technique dans le catalogue public (/api/products & /api/merchants/products)
 * 2. Blocage strict des doublons créés par un même commerçant (code HTTP 409)
 * 3. Plusieurs vendeurs distincts peuvent vendre légitimement le même produit (prix/stock/image indépendants)
 * 4. Chaque produit conserve son image indépendante sans pollution
 * 5. Suppression / désactivation d'un produit par un vendeur sans impact sur les autres vendeurs
 * 6. Le catalogue public reste cohérent, ordonné et intègre après actualisation
 * 7. Endpoint d'assainissement admin (/api/admin/catalog/clean-duplicates)
 */

import http from 'http';
import assert from 'assert';
import app from '../src/app.js';
import { pool, query } from '../src/config/db.js';

let server;
let baseUrl;

async function apiRequest(path, options = {}) {
  const url = `${baseUrl}/api${path}`;
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

async function runDuplicateCatalogTest() {
  console.log('\n================================================================');
  console.log('  🛡️ TEST ANTI-DOUBLONS & INTÉGRITÉ CATALOGUE PRODUITS MONEYLINK');
  console.log('================================================================\n');

  const createdCleanup = {
    users: [],
    merchants: [],
    products: []
  };

  try {
    // 0. Démarrage du serveur sur un port dynamique
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // -------------------------------------------------------------------------
    // TEST 1 : Vérification initiale du catalogue public (aucun doublon technique)
    // -------------------------------------------------------------------------
    console.log('1️⃣ Test 1 : Vérification de base du catalogue public (/api/products)...');
    const initCatRes = await apiRequest('/products');
    assert.strictEqual(initCatRes.status, 200, 'GET /api/products doit retourner 200');
    assert(Array.isArray(initCatRes.data.data), 'data doit être un tableau');

    const productsList = initCatRes.data.data;
    const productIds = productsList.map(p => p.id);
    const uniqueIds = new Set(productIds);
    assert.strictEqual(productIds.length, uniqueIds.size, 'Aucun identifiant de produit ne doit être dupliqué');

    // Vérifier l'unicité par marchand
    const merchantProductKeys = new Set();
    for (const p of productsList) {
      const key = `${p.merchant_id}_${p.name.trim().toLowerCase()}`;
      assert(!merchantProductKeys.has(key), `Doublon technique détecté pour le marchand ${p.merchant_name} et produit ${p.name}`);
      merchantProductKeys.add(key);

      // Vérifier la conformité de chaque fiche
      assert(p.name && p.name.length > 0, `Nom valide requis pour ${p.id}`);
      assert(!isNaN(parseFloat(p.price)), `Prix valide requis pour ${p.name}`);
      assert(p.stock !== undefined && p.stock >= 0, `Stock valide requis pour ${p.name}`);
      assert(p.merchant_name, `Marchand valide requis pour ${p.name}`);
    }
    console.log(`   ✅ Catalogue initial intègre : ${productsList.length} produit(s) vérifié(s) sans aucun doublon technique.`);

    // -------------------------------------------------------------------------
    // TEST 2 : Inscription Marchand A et Marchand B
    // -------------------------------------------------------------------------
    console.log('\n2️⃣ Inscription de deux commerçants indépendants...');
    const phoneA = `+22177${Math.floor(1000000 + Math.random() * 9000000)}`;
    const regResA = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        phone: phoneA,
        email: `dup.test.a.${Date.now()}@moneylink.sn`,
        first_name: 'Amadou',
        last_name: 'Sarr',
        password: 'Password123!',
        role: 'MERCHANT',
        business_name: 'Sarr HighTech Plateau',
        business_type: 'Électronique',
        address: 'Avenue Pompidou, Dakar',
        city: 'Dakar'
      }
    });
    assert.strictEqual(regResA.status, 201, 'Inscription Marchand A réussie');
    const tokenA = regResA.data.data.token;
    const authA = { Authorization: `Bearer ${tokenA}` };
    const merchantIdA = regResA.data.data.merchant.id;
    createdCleanup.users.push(regResA.data.data.user.id);
    createdCleanup.merchants.push(merchantIdA);

    const phoneB = `+22177${Math.floor(1000000 + Math.random() * 9000000)}`;
    const regResB = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        phone: phoneB,
        email: `dup.test.b.${Date.now()}@moneylink.sn`,
        first_name: 'Khadija',
        last_name: 'Ba',
        password: 'Password123!',
        role: 'MERCHANT',
        business_name: 'Ba Digital Store Mermoz',
        business_type: 'High-Tech',
        address: 'Mermoz Pyrotechnie, Dakar',
        city: 'Dakar'
      }
    });
    assert.strictEqual(regResB.status, 201, 'Inscription Marchand B réussie');
    const tokenB = regResB.data.data.token;
    const authB = { Authorization: `Bearer ${tokenB}` };
    const merchantIdB = regResB.data.data.merchant.id;
    createdCleanup.users.push(regResB.data.data.user.id);
    createdCleanup.merchants.push(merchantIdB);

    console.log('   ✅ Marchand A (Sarr HighTech) et Marchand B (Ba Digital Store) créés avec succès.');

    // -------------------------------------------------------------------------
    // TEST 3 : Protection Anti-Doublon pour un même commerçant (HTTP 409)
    // -------------------------------------------------------------------------
    console.log('\n3️⃣ Test Protection Anti-Doublon pour un même commerçant (code 409)...');
    const imgA = 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80';
    const createProdA1 = await apiRequest('/merchants/products', {
      method: 'POST',
      headers: authA,
      body: {
        name: 'Chargeur Ultra Fast 65W GaN',
        category: 'High-Tech & Téléphonie',
        price: 15000,
        stock: 20,
        image_url: imgA,
        description: 'Chargeur mural haute puissance USB-C.'
      }
    });
    assert.strictEqual(createProdA1.status, 201, 'Création 1ère fiche produit réussie pour Marchand A');
    const prodA1 = createProdA1.data.data;
    createdCleanup.products.push(prodA1.id);

    // Tentative de re-création du même nom par le même marchand A
    const createProdA2Duplicate = await apiRequest('/merchants/products', {
      method: 'POST',
      headers: authA,
      body: {
        name: '  chargeur ultra fast 65w gan  ', // casse & espaces différents
        category: 'High-Tech & Téléphonie',
        price: 16000,
        stock: 10,
        image_url: imgA,
        description: 'Doublon accidentel.'
      }
    });
    assert.strictEqual(createProdA2Duplicate.status, 409, 'Le backend doit rejeter le doublon avec le code HTTP 409 Conflict');
    assert(createProdA2Duplicate.data.error.includes('déjà'), 'Message d\'erreur explicite sur le doublon');
    console.log('   ✅ Rejet confirmé (409 Conflict) : Le commerçant ne peut pas dupliquer son propre produit.');

    // -------------------------------------------------------------------------
    // TEST 4 : Multi-Vendeurs légitimes (Même nom de produit par Marchand B)
    // -------------------------------------------------------------------------
    console.log('\n4️⃣ Test Multi-Vendeurs : Marchand B vend aussi le même produit...');
    const imgB = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80';
    const createProdB = await apiRequest('/merchants/products', {
      method: 'POST',
      headers: authB,
      body: {
        name: 'Chargeur Ultra Fast 65W GaN',
        category: 'High-Tech & Téléphonie',
        price: 13500, // Prix différent
        stock: 8,     // Stock différent
        image_url: imgB, // Image différente
        description: 'Offre spéciale Ba Digital Store.'
      }
    });
    assert.strictEqual(createProdB.status, 201, 'Marchand B doit pouvoir publier le même produit avec ses propres conditions');
    const prodB = createProdB.data.data;
    createdCleanup.products.push(prodB.id);

    // Vérification dans le catalogue public
    const catCheck = await apiRequest('/products?search=Chargeur Ultra Fast 65W GaN');
    assert.strictEqual(catCheck.status, 200);
    const matchingProds = catCheck.data.data.filter(p => p.name.includes('Chargeur Ultra Fast 65W GaN'));

    assert.strictEqual(matchingProds.length, 2, 'Les 2 fiches indépendantes doivent apparaître dans le catalogue public');
    const itemA = matchingProds.find(p => p.merchant_id === merchantIdA);
    const itemB = matchingProds.find(p => p.merchant_id === merchantIdB);

    assert(itemA, 'Produit du Marchand A présent');
    assert(itemB, 'Produit du Marchand B présent');
    assert.strictEqual(parseFloat(itemA.price), 15000, 'Prix Marchand A conforme');
    assert.strictEqual(parseFloat(itemB.price), 13500, 'Prix Marchand B conforme');
    assert.strictEqual(itemA.image_url, imgA, 'Image Marchand A distincte');
    assert.strictEqual(itemB.image_url, imgB, 'Image Marchand B distincte');
    console.log('   ✅ Multi-vendeurs validé : 2 commerçants vendent le même produit avec prix, stock et images indépendants.');

    // -------------------------------------------------------------------------
    // TEST 5 : Indépendance et Isolation des Images
    // -------------------------------------------------------------------------
    console.log('\n5️⃣ Test Indépendance des Images lors des modifications...');
    const updatedImgA = 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=600&auto=format&fit=crop&q=80';
    const updateResA = await apiRequest(`/merchants/products/${prodA1.id}`, {
      method: 'PUT',
      headers: authA,
      body: { image_url: updatedImgA }
    });
    assert.strictEqual(updateResA.status, 200, 'Mise à jour image Marchand A réussie');

    // Vérification que le produit de Marchand B n'a pas été affecté
    const detailB = await apiRequest(`/products/${prodB.id}`);
    assert.strictEqual(detailB.status, 200);
    assert.strictEqual(detailB.data.data.image_url, imgB, 'L\'image du Marchand B reste strictement inchangée');
    console.log('   ✅ Isolation parfaite : La modification de l\'image de A n\'a aucun impact sur l\'image de B.');

    // -------------------------------------------------------------------------
    // TEST 6 : Suppression / Désactivation d'un produit sans impact sur l'autre
    // -------------------------------------------------------------------------
    console.log('\n6️⃣ Test Suppression d\'un produit par Marchand A (sans toucher Marchand B)...');
    const delResA = await apiRequest(`/merchants/products/${prodA1.id}`, {
      method: 'DELETE',
      headers: authA
    });
    assert.strictEqual(delResA.status, 200, 'Suppression du produit Marchand A réussie');

    // Vérifier dans le catalogue public
    const catAfterDel = await apiRequest('/products?search=Chargeur Ultra Fast 65W GaN');
    const prodsAfterDel = catAfterDel.data.data.filter(p => p.name.includes('Chargeur Ultra Fast 65W GaN'));
    assert.strictEqual(prodsAfterDel.length, 1, 'Seul le produit du Marchand B doit rester dans le catalogue public');
    assert.strictEqual(prodsAfterDel[0].id, prodB.id, 'Le produit restant est bien celui de Marchand B');
    console.log('   ✅ Suppression isolée : Le produit de A a disparu du catalogue public, le produit de B reste actif.');

    // -------------------------------------------------------------------------
    // TEST 7 : Endpoint Super Admin d'assainissement et déduplication
    // -------------------------------------------------------------------------
    console.log('\n7️⃣ Test Endpoint Admin d\'assainissement du catalogue (/api/admin/catalog/clean-duplicates)...');
    const adminLogin = await apiRequest('/auth/login', {
      method: 'POST',
      body: {
        identifier: 'admin@moneylink.sn',
        password: 'Password123!'
      }
    });
    assert.strictEqual(adminLogin.status, 200, 'Connexion Super Admin');
    const adminToken = adminLogin.data.data.token;

    const cleanRes = await apiRequest('/admin/catalog/clean-duplicates', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(cleanRes.status, 200, 'Endpoint clean-duplicates accessible');
    assert(cleanRes.data.data.productsKept >= 6, 'Les produits de référence sont conservés');
    console.log(`   ✅ Assainissement exécuté : ${cleanRes.data.data.productsKept} produits conservés.`);

    console.log('\n================================================================');
    console.log('  🎉 TOUS LES TESTS DE NON-DUPLICATION DU CATALOGUE ONT RÉUSSI !');
    console.log('================================================================\n');
  } catch (err) {
    console.error('\n❌ Échec du test des doublons du catalogue :', err.message);
    throw err;
  } finally {
    // Nettoyage des fixtures de test
    if (pool) {
      try {
        if (createdCleanup.products.length > 0) {
          await query('DELETE FROM products WHERE id = ANY($1::text[])', [createdCleanup.products]).catch(() => {});
        }
        if (createdCleanup.merchants.length > 0) {
          await query('DELETE FROM merchants WHERE id = ANY($1::text[])', [createdCleanup.merchants]).catch(() => {});
        }
        if (createdCleanup.users.length > 0) {
          await query('DELETE FROM users WHERE id = ANY($1::text[])', [createdCleanup.users]).catch(() => {});
        }
      } catch {}
    }

    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  }
}

runDuplicateCatalogTest();
