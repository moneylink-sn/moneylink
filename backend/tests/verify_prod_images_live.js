/**
 * MoneyLink — Script de Vérification en Direct des Images sur Render
 * Cible : https://moneylink-kd6v.onrender.com/api
 */

import assert from 'assert';

const BASE_URL = 'https://moneylink-kd6v.onrender.com/api';

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

async function runLiveImageVerification() {
  console.log('\n================================================================');
  console.log('  🌐 VÉRIFICATION EN DIRECT DES IMAGES SUR RENDER PRODUCTION');
  console.log(`     Cible : ${BASE_URL}`);
  console.log('================================================================\n');

  try {
    // 1. Health check & PostgreSQL
    console.log('1️⃣ Vérification Santé PostgreSQL (/api/health)...');
    const health = await request('/health');
    console.log(`   Statut: ${health.status} | Mode: ${health.data.database?.mode}`);
    assert.strictEqual(health.status, 200, 'Health check OK');
    assert(health.data.database?.connected, 'PostgreSQL connecté');

    // 2. Inscription Marchand Live
    console.log('\n2️⃣ Inscription Marchand Test Live...');
    const pMerchant = `+22177${Math.floor(1000000 + Math.random() * 9000000)}`;
    const regM = await request('/auth/register', {
      method: 'POST',
      body: {
        phone: pMerchant,
        email: `live.images.${Date.now()}@moneylink.sn`,
        first_name: 'Cheikh',
        last_name: 'Gueye',
        password: 'Password123!',
        role: 'MERCHANT',
        business_name: 'Gueye Tech & Fashion Dakar',
        business_type: 'High-Tech & Mode',
        address: 'Almadies, Dakar',
        city: 'Dakar'
      }
    });
    assert.strictEqual(regM.status, 201, 'Inscription Marchand réussie');
    const tokenM = regM.data.data.token;
    const authM = { Authorization: `Bearer ${tokenM}` };
    console.log(`   ✅ Marchand Live créé : Gueye Tech & Fashion Dakar (${pMerchant})`);

    // 3. Publication des 5 Produits Obligatoires
    console.log('\n3️⃣ Publication des 5 Produits Obligatoires sur Render...');

    const products = [
      {
        type: 'Chargeur',
        name: `Chargeur Ultra Fast 65W GaN Live ${Date.now()}`,
        category: 'High-Tech & Téléphonie',
        price: 18000,
        stock: 25,
        image_url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80',
        description: 'Chargeur mural USB-C haute vitesse.'
      },
      {
        type: 'Drone',
        name: `Drone 4K Pro Stabilisé Live ${Date.now()}`,
        category: 'High-Tech & Téléphonie',
        price: 220000,
        stock: 4,
        image_url: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=600&auto=format&fit=crop&q=80',
        description: 'Drone vidéo 4K UHD avec retour automatique.'
      },
      {
        type: 'Sac',
        name: `Sac Sport Étanche 40L Live ${Date.now()}`,
        category: 'Mode & Chaussures',
        price: 20000,
        stock: 15,
        image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80',
        description: 'Sac de voyage et sport multifonctionnel.'
      },
      {
        type: 'Casque Bluetooth',
        name: `Casque Audio ANC Pro Live ${Date.now()}`,
        category: 'High-Tech & Téléphonie',
        price: 32000,
        stock: 12,
        image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
        description: 'Casque audio sans fil réduction de bruit active.'
      },
      {
        type: 'Vêtement',
        name: `Ensemble Vêtements Sport Dakar Live ${Date.now()}`,
        category: 'Mode & Chaussures',
        price: 25000,
        stock: 30,
        image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80',
        description: 'Tenue complète sport respirante.'
      }
    ];

    const createdList = [];
    const usedImages = new Set();

    for (const p of products) {
      const createRes = await request('/merchants/products', {
        method: 'POST',
        headers: authM,
        body: p
      });

      assert.strictEqual(createRes.status, 201, `Création ${p.type} réussie`);
      const prod = createRes.data.data;
      createdList.push(prod);
      usedImages.add(prod.image_url);

      console.log(`   ✅ [${p.type}] ${prod.name}`);
      console.log(`      → ID: ${prod.id} | Image: ${prod.image_url}`);
      assert.strictEqual(prod.image_url, p.image_url, 'Image enregistrée avec exactitude');
    }

    assert.strictEqual(usedImages.size, 5, '5 images distinctes et uniques enregistrées en production');

    // 4. Consultation du Catalogue Public Live
    console.log('\n4️⃣ Vérification dans le Catalogue Public Live (/api/merchants/products)...');
    const catRes = await request('/merchants/products');
    assert.strictEqual(catRes.status, 200, 'Catalogue public accessible');
    const catalogData = catRes.data.data;

    for (const created of createdList) {
      const found = catalogData.find(p => p.id === created.id);
      assert(found, `Produit ${created.name} présent dans le catalogue public`);
      assert.strictEqual(found.image_url, created.image_url, `Image conforme pour ${created.name}`);
    }
    console.log('   ✅ Les 5 produits sont immédiatement visibles avec leurs images distinctes dans le catalogue public.');

    // 5. Test Modification d'Image Indépendante Live
    console.log('\n5️⃣ Test Modification Indépendante d\'Image en Production...');
    const targetDrone = createdList.find(p => p.name.includes('Drone'));
    const updatedDroneImg = 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=600&auto=format&fit=crop&q=80';
    
    const updateRes = await request(`/merchants/products/${targetDrone.id}`, {
      method: 'PUT',
      headers: authM,
      body: {
        image_url: updatedDroneImg
      }
    });
    assert.strictEqual(updateRes.status, 200, 'Mise à jour image réussie');
    assert.strictEqual(updateRes.data.data.image_url, updatedDroneImg, 'Nouvelle image appliquée au drone');

    // Re-vérifier l'espace marchand
    const myProdsRes = await request('/merchants/me/products', { headers: authM });
    const myProds = myProdsRes.data.data;

    const droneAfter = myProds.find(p => p.id === targetDrone.id);
    const chargerAfter = myProds.find(p => p.name.includes('Chargeur'));
    const bagAfter = myProds.find(p => p.name.includes('Sac'));
    const headphonesAfter = myProds.find(p => p.name.includes('Casque'));
    const clothingAfter = myProds.find(p => p.name.includes('Vêtements'));

    assert.strictEqual(droneAfter.image_url, updatedDroneImg, 'Drone mis à jour');
    assert.strictEqual(chargerAfter.image_url, products[0].image_url, 'Chargeur inchangé');
    assert.strictEqual(bagAfter.image_url, products[2].image_url, 'Sac inchangé');
    assert.strictEqual(headphonesAfter.image_url, products[3].image_url, 'Casque inchangé');
    assert.strictEqual(clothingAfter.image_url, products[4].image_url, 'Vêtement inchangé');
    console.log('   ✅ Modification indépendante confirmée sur le serveur de production.');

    // 6. Test Produit Sans Image (Pas de réutilisation d'un autre produit)
    console.log('\n6️⃣ Test Création Sans Image Live (Placeholder neutre)...');
    const noImgRes = await request('/merchants/products', {
      method: 'POST',
      headers: authM,
      body: {
        name: `Adaptateur Type-C Live ${Date.now()}`,
        category: 'High-Tech & Téléphonie',
        price: 5000,
        stock: 40,
        description: 'Adaptateur compact.'
      }
    });
    assert.strictEqual(noImgRes.status, 201, 'Création produit sans image');
    assert(
      noImgRes.data.data.image_url === null || noImgRes.data.data.image_url === '',
      'image_url doit être null/vide en production lorsqu\'aucune photo n\'est spécifiée'
    );
    console.log('   ✅ Le produit sans photo n\'hérite d\'aucune image parasite.');

    console.log('\n================================================================');
    console.log('  🎉 VÉRIFICATION EN DIRECT SUR RENDER PRODUCTION RÉUSSIE À 100% !');
    console.log('================================================================\n');
  } catch (err) {
    console.error('\n❌ Échec de la vérification de production :', err.message);
    process.exit(1);
  }
}

runLiveImageVerification();
