/**
 * MoneyLink — Script de Vérification Réelle en Production sur Render
 * Teste le parcours marchand de création de produit avec upload d'image
 */

import fs from 'fs';
import path from 'path';

const SITE_URL = 'https://moneylink-site.onrender.com';
const API_URL = 'https://moneylink-kd6v.onrender.com/api';

async function runLiveProductionTest() {
  console.log('========================================================');
  console.log('🚀 TEST EN PRODUCTION RÉELLE SUR RENDER');
  console.log('========================================================\n');

  // 1. Vérification Frontend HTML & JS sur Render
  console.log(`1️⃣ Inspection du Frontend hébergé sur ${SITE_URL}...`);
  const htmlRes = await fetch(`${SITE_URL}/index.html?t=${Date.now()}`);
  const htmlText = await htmlRes.text();
  
  const hasOldUrlLabel = htmlText.includes("URL de l'image") || htmlText.includes("URL de l’image");
  const hasFileInput = htmlText.includes('id="prod-form-file-input"');
  const hasSelectDeviceBtn = htmlText.includes("Sélectionner depuis l'appareil / galerie");

  console.log(`   - Présence de champ visible "URL de l'image" : ${hasOldUrlLabel ? '❌ OUI (Erreur)' : '✅ NON (Corrigé)'}`);
  console.log(`   - Bouton de sélection appareil/galerie présent : ${hasSelectDeviceBtn ? '✅ OUI' : '❌ NON'}`);
  console.log(`   - Champ input type="file" présent : ${hasFileInput ? '✅ OUI' : '❌ NON'}`);

  const jsRes = await fetch(`${SITE_URL}/app.js?t=${Date.now()}`);
  const jsText = await jsRes.text();
  const hasResolveImageUrl = jsText.includes('resolveImageUrl');
  console.log(`   - Fonction resolveImageUrl active sur le CDN Render : ${hasResolveImageUrl ? '✅ OUI' : '❌ NON'}`);

  // 2. Création de session Compte Marchand de Test sur Render
  console.log('\n2️⃣ Inscription & Connexion Marchand de Test sur Render...');
  const testPhone = `+22177${Math.floor(1000000 + Math.random() * 9000000)}`;
  const testEmail = `marchand.live.${Date.now()}@moneylink.sn`;
  
  const regRes = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      first_name: 'Babacar',
      last_name: 'Ndiaye',
      email: testEmail,
      phone: testPhone,
      password: 'MarchandPass2026!',
      role: 'MERCHANT',
      business_name: 'Ndiaye Tech Dakar',
      business_type: 'High-Tech & Téléphonie'
    })
  });
  const regData = await regRes.json();
  if (!regData.success) {
    throw new Error(`Échec enregistrement marchand: ${JSON.stringify(regData)}`);
  }
  const token = regData.data.token;
  const merchant = regData.data.merchant;
  console.log(`   ✅ Marchand connecté : ${merchant.business_name} (${testPhone})`);

  // 3. Téléversement réel d'une image depuis l'appareil
  console.log('\n3️⃣ Téléversement d\'une image produit vers Render (/api/upload)...');
  const imgPath = path.resolve('site/assets/moneylink_logo.png');
  const imgBuf = fs.readFileSync(imgPath);
  const base64Data = `data:image/png;base64,${imgBuf.toString('base64')}`;

  const upRes = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      data_base64: base64Data,
      filename: 'drone_4k_pro.png',
      mime_type: 'image/png'
    })
  });
  const upData = await upRes.json();
  if (!upData.success) {
    throw new Error(`Échec upload image: ${JSON.stringify(upData)}`);
  }
  const uploadedUrl = upData.data.url;
  const uploadId = upData.data.id;
  console.log(`   ✅ Image téléversée avec succès (ID: ${uploadId})`);
  console.log(`   ✅ URL relative retournée : ${uploadedUrl}`);

  // 4. Test d'accessibilité immédiate de l'image
  console.log('\n4️⃣ Vérification de l\'accès public direct à l\'image téléversée...');
  const directImgUrl = `https://moneylink-kd6v.onrender.com${uploadedUrl}`;
  const imgFetchRes = await fetch(directImgUrl);
  console.log(`   - Code HTTP image : ${imgFetchRes.status} (${imgFetchRes.statusText})`);
  console.log(`   - Content-Type : ${imgFetchRes.headers.get('content-type')}`);
  console.log(`   - Cross-Origin-Resource-Policy : ${imgFetchRes.headers.get('cross-origin-resource-policy')}`);
  console.log(`   - Access-Control-Allow-Origin : ${imgFetchRes.headers.get('access-control-allow-origin')}`);
  if (imgFetchRes.status !== 200) {
    throw new Error(`L'image n'a pas pu être récupérée sur ${directImgUrl}`);
  }

  // 5. Ajout du Produit dans la boutique
  console.log('\n5️⃣ Publication du nouveau produit via API Marchand...');
  const prodRes = await fetch(`${API_URL}/merchants/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'Drone Caméra 4K Pro Sénégal',
      category: 'High-Tech & Téléphonie',
      subcategory: 'Drones & Accessoires',
      price: 85000,
      stock: 6,
      city: 'Dakar',
      quartier: 'Plateau',
      image_url: uploadedUrl,
      description: 'Drone vidéo 4K UHD avec caméra stabilisée 3 axes, capteur GPS et retour automatique.'
    })
  });
  const prodData = await prodRes.json();
  if (!prodData.success) {
    throw new Error(`Échec création produit: ${JSON.stringify(prodData)}`);
  }
  const createdProd = prodData.data;
  console.log('   ✅ Produit créé avec succès !');
  console.log(`      - ID : ${createdProd.id}`);
  console.log(`      - Nom : ${createdProd.name}`);
  console.log(`      - Prix : ${createdProd.price} FCFA`);
  console.log(`      - Image URL : ${createdProd.image_url}`);

  // 6. Vérification apparition immédiate dans le catalogue public
  console.log('\n6️⃣ Vérification apparition immédiate dans le Catalogue Public...');
  const catRes = await fetch(`${API_URL}/merchants/products`);
  const catData = await catRes.json();
  const foundInCatalog = catData.data.find(p => p.id === createdProd.id);
  if (!foundInCatalog) {
    throw new Error('Le produit n\'apparaît pas dans le catalogue public');
  }
  console.log('   ✅ Produit bien présent dans le catalogue public !');
  console.log(`      - Vendeur : ${foundInCatalog.merchant_name}`);
  console.log(`      - Image catalogue : ${foundInCatalog.image_url}`);

  // 7. Simulation de rechargement de page (Persistance)
  console.log('\n7️⃣ Simulation de rechargement de page / actualisation...');
  const reloadCatRes = await fetch(`${API_URL}/merchants/products?refresh=${Date.now()}`);
  const reloadData = await reloadCatRes.json();
  const persistedProd = reloadData.data.find(p => p.id === createdProd.id);
  if (!persistedProd) {
    throw new Error('Le produit a disparu après actualisation !');
  }
  
  // Vérification de la disponibilité continue de l'image
  const resolvedImgUrl = (persistedProd.image_url.startsWith('http') ? persistedProd.image_url : `https://moneylink-kd6v.onrender.com${persistedProd.image_url}`);
  const verifyImgAfterReload = await fetch(resolvedImgUrl);
  if (verifyImgAfterReload.status !== 200) {
    throw new Error(`L'image n'est plus accessible après actualisation (HTTP ${verifyImgAfterReload.status})`);
  }
  console.log('   ✅ Produit ET image restent 100% accessibles après actualisation !');
  console.log(`      - URL image finale : ${resolvedImgUrl}`);
  console.log(`      - Statut HTTP image : ${verifyImgAfterReload.status}`);

  console.log('\n========================================================');
  console.log('🎉 TOUTES LES VÉRIFICATIONS DE PRODUCTION SONT VALIDÉES !');
  console.log('========================================================');
}

runLiveProductionTest().catch(err => {
  console.error('❌ ERREUR TEST PRODUCTION :', err);
  process.exit(1);
});
