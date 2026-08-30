/**
 * MoneyLink — Test Automatisé Exhaustif : Cohérence et Isolation des Images du Catalogue
 * 
 * Vérifie :
 * 1. 5 produits distincts (Chargeur, Drone, Sac, Casque Bluetooth, Vêtement) avec images dédiées et distinctes
 * 2. Absence de réutilisation ou mélange d'images entre produits
 * 3. Upload d'image dédié par produit et isolation stricte
 * 4. Gestion du placeholder neutre lorsqu'aucune image n'est fournie
 * 5. Modification indépendante de l'image d'un produit sans impact sur les autres
 * 6. Protection IDOR sur les modifications de produits/images
 * 7. Affichage et persistance dans le catalogue public et l'espace marchand
 */

import http from 'http';
import assert from 'assert';
import app from '../src/app.js';
import { AUTHENTIC_PRODUCT_IMAGES, getAuthenticImageForProduct } from '../src/config/db.js';

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

async function runCatalogImagesTest() {
  console.log('\n================================================================');
  console.log('  🖼️ TEST COMPLET COHÉRENCE DES IMAGES DU CATALOGUE MONEYLINK');
  console.log('================================================================\n');

  try {
    // 0. Démarrage du serveur de test sur port dynamique
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // 1. Inscription Marchand A
    console.log('1️⃣ Création du profil Marchand Principal...');
    const merchantPhoneA = `+22177${Math.floor(1000000 + Math.random() * 9000000)}`;
    const regResA = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        phone: merchantPhoneA,
        email: `merchant.images.${Date.now()}@moneylink.sn`,
        first_name: 'Amadou',
        last_name: 'Ba',
        password: 'Password123!',
        role: 'MERCHANT',
        business_name: 'Dakar High-Tech & Mode',
        business_type: 'Électronique & Mode',
        address: 'Rue 12 x Corniche, Dakar',
        city: 'Dakar'
      }
    });
    assert.strictEqual(regResA.status, 201, 'Inscription Marchand A réussie');
    const tokenA = regResA.data.data.token;
    const authA = { Authorization: `Bearer ${tokenA}` };

    // 2. Publication des 5 Produits Obligatoires avec leurs images respectives
    console.log('\n2️⃣ Publication des 5 produits obligatoires avec images dédiées...');

    const productsToCreate = [
      {
        key: 'CHARGER',
        name: 'Chargeur Rapide GaN 65W 3 Ports',
        category: 'High-Tech & Téléphonie',
        subcategory: 'Accessoires de Charge',
        price: 15000,
        stock: 20,
        expectedImage: AUTHENTIC_PRODUCT_IMAGES.CHARGER,
        description: 'Chargeur ultra-rapide 65W compatible MacBook, iPhone et Android.'
      },
      {
        key: 'DRONE',
        name: 'Drone Professionnel 4K Ultra HD',
        category: 'High-Tech & Téléphonie',
        subcategory: 'Drones & Caméras',
        price: 180000,
        stock: 5,
        expectedImage: AUTHENTIC_PRODUCT_IMAGES.DRONE,
        description: 'Drone 4K avec nacelle 3 axes stabilisée et autonomie de 35 min.'
      },
      {
        key: 'BAG',
        name: 'Sac de Sport & Voyage Étanche 45L',
        category: 'Mode & Chaussures',
        subcategory: 'Sacs & Bagages',
        price: 22000,
        stock: 15,
        expectedImage: AUTHENTIC_PRODUCT_IMAGES.BAG,
        description: 'Sac imperméable avec compartiment chaussures et bretelles ergonomiques.'
      },
      {
        key: 'HEADPHONES',
        name: 'Casque Audio Sans Fil ANC Pro',
        category: 'High-Tech & Téléphonie',
        subcategory: 'Audio & Casques',
        price: 35000,
        stock: 10,
        expectedImage: AUTHENTIC_PRODUCT_IMAGES.HEADPHONES,
        description: 'Casque circum-aural avec réduction active du bruit et autonomie 30h.'
      },
      {
        key: 'CLOTHING',
        name: 'Ensemble Vêtements Sport Lions du Sénégal',
        category: 'Mode & Chaussures',
        subcategory: 'Vêtements de Sport',
        price: 28000,
        stock: 25,
        expectedImage: AUTHENTIC_PRODUCT_IMAGES.CLOTHING,
        description: 'Ensemble officiel respirant aux couleurs nationales du Sénégal.'
      }
    ];

    const createdProductMap = {};
    const usedImageUrls = new Set();

    for (const item of productsToCreate) {
      const createRes = await apiRequest('/merchants/products', {
        method: 'POST',
        headers: authA,
        body: {
          name: item.name,
          category: item.category,
          subcategory: item.subcategory,
          price: item.price,
          stock: item.stock,
          image_url: item.expectedImage,
          description: item.description
        }
      });

      assert.strictEqual(createRes.status, 201, `Création réussie pour ${item.name}`);
      const prodData = createRes.data.data;
      createdProductMap[item.key] = prodData;

      console.log(`   ✅ [${item.key}] ${item.name}`);
      console.log(`      → Image URL : ${prodData.image_url}`);

      // Vérifier que chaque produit a une image différente et non vide
      assert(prodData.image_url, `L'image de ${item.name} ne doit pas être vide`);
      assert(!usedImageUrls.has(prodData.image_url), `Chaque produit doit avoir une image unique (collision sur ${prodData.image_url})`);
      usedImageUrls.add(prodData.image_url);

      // Vérifier la correspondance exacte
      assert.strictEqual(prodData.image_url, item.expectedImage, `L'image de ${item.name} doit correspondre exactement à son type`);
    }

    assert.strictEqual(usedImageUrls.size, 5, 'Les 5 produits possèdent 5 images distinctes');

    // 3. Vérification dans le Catalogue Public (/api/merchants/products et /api/products)
    console.log('\n3️⃣ Vérification du catalogue public global...');
    const pubRes = await apiRequest('/merchants/products');
    assert.strictEqual(pubRes.status, 200, 'Catalogue public accessible');
    const catalogList = pubRes.data.data;

    for (const item of productsToCreate) {
      const found = catalogList.find(p => p.id === createdProductMap[item.key].id);
      assert(found, `Produit ${item.name} trouvé dans le catalogue public`);
      assert.strictEqual(found.image_url, item.expectedImage, `Image conforme dans le catalogue public pour ${item.name}`);
    }
    console.log('   ✅ Tous les 5 produits affichent leur propre image dans le catalogue public.');

    // 4. Test Téléversement d'image personnalisée pour un nouveau produit
    console.log('\n4️⃣ Test Téléversement Image Dédiée via /api/upload...');
    const fake1x1JpegBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
    const uploadRes = await apiRequest('/upload', {
      method: 'POST',
      headers: authA,
      body: {
        data_base64: fake1x1JpegBase64,
        filename: 'montre_luxe_dakar.jpg',
        mime_type: 'image/jpeg'
      }
    });
    assert.strictEqual(uploadRes.status, 201, 'Upload réussi');
    const uploadedMediaUrl = uploadRes.data.data.url;
    console.log(`   ✅ Image téléversée avec succès (URL: ${uploadedMediaUrl})`);

    // Création d'un 6ème produit avec cette image téléversée
    const createResCustom = await apiRequest('/merchants/products', {
      method: 'POST',
      headers: authA,
      body: {
        name: 'Montre Chronographe Édition Dakar',
        category: 'Objets Connectés',
        price: 65000,
        stock: 7,
        image_url: uploadedMediaUrl,
        description: 'Montre de prestige avec boîtier acier brossé.'
      }
    });
    assert.strictEqual(createResCustom.status, 201, 'Création produit avec upload');
    const customProd = createResCustom.data.data;
    assert.strictEqual(customProd.image_url, uploadedMediaUrl, 'Image personnalisée associée au produit');

    // 5. Test Création de Produit SANS image : Doit être null / vide et JAMAIS l'image d'un autre produit
    console.log('\n5️⃣ Test Création Produit Sans Image (Comportement Neutre / Placeholder)...');
    const noImgRes = await apiRequest('/merchants/products', {
      method: 'POST',
      headers: authA,
      body: {
        name: 'Câble USB-C Tressé 2M',
        category: 'High-Tech & Téléphonie',
        price: 3500,
        stock: 50,
        description: 'Câble robuste de charge et synchronisation.'
      }
    });
    assert.strictEqual(noImgRes.status, 201, 'Création produit sans image');
    const noImgProd = noImgRes.data.data;
    assert(
      noImgProd.image_url === null || noImgProd.image_url === '' || noImgProd.image_url === undefined,
      `Un produit créé sans image doit avoir image_url null (reçu: ${noImgProd.image_url}) et ne jamais emprunter l'image d'un autre produit`
    );
    console.log('   ✅ Le produit sans photo ne réutilise pas automatiquement l\'image d\'un autre article.');

    // 6. Test Modification Indépendante de l'Image d'un Produit
    console.log('\n6️⃣ Test Remplacement Indépendant de l\'Image (Produit A sans toucher Produit B)...');
    const newDroneImage = 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=600&auto=format&fit=crop&q=80';
    const updateRes = await apiRequest(`/merchants/products/${createdProductMap.DRONE.id}`, {
      method: 'PUT',
      headers: authA,
      body: {
        image_url: newDroneImage
      }
    });
    assert.strictEqual(updateRes.status, 200, 'Mise à jour réussie');
    assert.strictEqual(updateRes.data.data.image_url, newDroneImage, 'Nouvelle image appliquée au drone');

    // Vérifier que le Chargeur, le Sac, le Casque et le Vêtement n'ont PAS été modifiés
    const myProdsRes = await apiRequest('/merchants/me/products', { headers: authA });
    const myProds = myProdsRes.data.data;

    const chargerAfter = myProds.find(p => p.id === createdProductMap.CHARGER.id);
    const bagAfter = myProds.find(p => p.id === createdProductMap.BAG.id);
    const headphonesAfter = myProds.find(p => p.id === createdProductMap.HEADPHONES.id);
    const clothingAfter = myProds.find(p => p.id === createdProductMap.CLOTHING.id);

    assert.strictEqual(chargerAfter.image_url, AUTHENTIC_PRODUCT_IMAGES.CHARGER, 'Image Chargeur inchangée');
    assert.strictEqual(bagAfter.image_url, AUTHENTIC_PRODUCT_IMAGES.BAG, 'Image Sac inchangée');
    assert.strictEqual(headphonesAfter.image_url, AUTHENTIC_PRODUCT_IMAGES.HEADPHONES, 'Image Casque inchangée');
    assert.strictEqual(clothingAfter.image_url, AUTHENTIC_PRODUCT_IMAGES.CLOTHING, 'Image Vêtement inchangée');
    console.log('   ✅ L\'image du drone a été mise à jour indépendamment sans affecter les autres produits.');

    // 7. Test de Sécurité IDOR sur la Modification d'Image par un Autre Marchand
    console.log('\n7️⃣ Test Sécurité IDOR : Marchand B ne peut pas modifier l\'image du Marchand A...');
    const merchantPhoneB = `+22177${Math.floor(1000000 + Math.random() * 9000000)}`;
    const regResB = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        phone: merchantPhoneB,
        email: `merchant.idor.${Date.now()}@moneylink.sn`,
        first_name: 'Fatou',
        last_name: 'Sall',
        password: 'Password123!',
        role: 'MERCHANT',
        business_name: 'Boutique Sall Dakar',
        business_type: 'Mode',
        address: 'Médina, Dakar',
        city: 'Dakar'
      }
    });
    const tokenB = regResB.data.data.token;
    const authB = { Authorization: `Bearer ${tokenB}` };

    const idorTry = await apiRequest(`/merchants/products/${createdProductMap.CHARGER.id}`, {
      method: 'PUT',
      headers: authB,
      body: {
        image_url: 'https://images.unsplash.com/photo-malicious?w=500'
      }
    });
    assert.strictEqual(idorTry.status, 403, 'IDOR bloqué : 403 Forbidden');
    console.log('   ✅ IDOR bloqué : Marchand B ne peut pas altérer les photos du Marchand A.');

    // 8. Test Helper de Détection d'Image Automatique
    console.log('\n8️⃣ Vérification unitaire du moteur de catégorisation d\'images...');
    assert.strictEqual(getAuthenticImageForProduct('Chargeur Rapide USB-C'), AUTHENTIC_PRODUCT_IMAGES.CHARGER);
    assert.strictEqual(getAuthenticImageForProduct('Drone Caméra 4K'), AUTHENTIC_PRODUCT_IMAGES.DRONE);
    assert.strictEqual(getAuthenticImageForProduct('Sac de voyage'), AUTHENTIC_PRODUCT_IMAGES.BAG);
    assert.strictEqual(getAuthenticImageForProduct('Casque Bluetooth'), AUTHENTIC_PRODUCT_IMAGES.HEADPHONES);
    assert.strictEqual(getAuthenticImageForProduct('Maillot football'), AUTHENTIC_PRODUCT_IMAGES.CLOTHING);
    assert.strictEqual(getAuthenticImageForProduct('Smartphone 5G'), AUTHENTIC_PRODUCT_IMAGES.PHONE);
    assert.strictEqual(getAuthenticImageForProduct('MacBook Pro M3'), AUTHENTIC_PRODUCT_IMAGES.LAPTOP);
    assert.strictEqual(getAuthenticImageForProduct('Montre Connectée'), AUTHENTIC_PRODUCT_IMAGES.WATCH);
    console.log('   ✅ Moteur de reconnaissance et attribution d\'images 100% conforme.');

    console.log('\n================================================================');
    console.log('  🎉 TOUS LES TESTS DE COHÉRENCE DES IMAGES ONT RÉUSSI À 100% !');
    console.log('================================================================\n');
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }
}

runCatalogImagesTest().catch((err) => {
  console.error('\n❌ ÉCHEC DU TEST DES IMAGES DU CATALOGUE :', err);
  process.exit(1);
});
