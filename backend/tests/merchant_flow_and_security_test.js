/**
 * MoneyLink — Suite de Tests Automatisés Espace Marchand, Stockage Médias Persistant & Sécurité IDOR
 */

import app from '../src/app.js';
import { memoryStore } from '../src/config/db.js';

let server;
const TEST_PORT = 5015;
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
    const buffer = await res.arrayBuffer();
    return { status: res.status, buffer: Buffer.from(buffer), headers: res.headers };
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

async function runAllMerchantTests() {
  server = app.listen(TEST_PORT);
  console.log('\n================================================================');
  console.log('  🚀 MONEYLINK — TESTS AUTOMATISÉS ESPACE MARCHAND & SÉCURITÉ IDOR');
  console.log('================================================================\n');

  try {
    let merchantToken;
    let otherMerchantToken;
    let clientToken;
    let adminToken;
    let uploadedMediaId;
    let createdProductId;

    // 1x1 valid JPEG (magic bytes FF D8 FF)
    const validJpegBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

    console.log('1️⃣ Authentification des différents rôles...');
    const mRes = await apiRequest('/auth/login', {
      method: 'POST',
      body: { identifier: '+221770000002', password: 'Password123!' }
    });
    assert(mRes.status === 200 && mRes.data.data.token, 'Connexion Marchand A (Amadou Diop) réussie');
    merchantToken = mRes.data.data.token;

    const mBRes = await apiRequest('/auth/login', {
      method: 'POST',
      body: { identifier: '+221770000003', password: 'Password123!' }
    });
    assert(mBRes.status === 200 && mBRes.data.data.token, 'Connexion Marchand B (Fatou Ndiaye) réussie');
    otherMerchantToken = mBRes.data.data.token;

    const cRes = await apiRequest('/auth/login', {
      method: 'POST',
      body: { identifier: '+221770000004', password: 'Password123!' }
    });
    assert(cRes.status === 200 && cRes.data.data.token, 'Connexion Client (Moussa Fall) réussie');
    clientToken = cRes.data.data.token;

    const aRes = await apiRequest('/auth/login', {
      method: 'POST',
      body: { identifier: 'admin@moneylink.sn', password: 'Password123!' }
    });
    assert(aRes.status === 200 && aRes.data.data.token, 'Connexion Super Admin (Codé Samb) réussie');
    adminToken = aRes.data.data.token;

    console.log('\n2️⃣ Test Téléversement Persistant d\'Images (/api/upload & /api/uploads)...');
    // Faux fichier texte
    const fakeRes = await apiRequest('/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${merchantToken}` },
      body: { data_base64: Buffer.from('Texte brute non image').toString('base64'), filename: 'test.jpg' }
    });
    assert(fakeRes.status === 400, 'Rejette un faux fichier texte avec extension .jpg (Magic Bytes)');

    // Téléversement d'image valide
    const upRes = await apiRequest('/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${merchantToken}` },
      body: { data_base64: validJpegBase64, filename: 'logo_boutique.jpg', mime_type: 'image/jpeg' }
    });
    assert(upRes.status === 201 && upRes.data.data.url, 'Téléversement réussi d\'une image JPEG valide');
    uploadedMediaId = upRes.data.data.id;

    // Consultation publique
    const getImgRes = await apiRequest(`/uploads/${uploadedMediaId}`);
    assert(getImgRes.status === 200, 'Diffusion publique de l\'image binaire réussie');
    assert(getImgRes.headers.get('content-type').includes('image/jpeg'), 'En-tête Content-Type correct');
    assert(getImgRes.headers.get('x-content-type-options') === 'nosniff', 'En-tête X-Content-Type-Options: nosniff présent');

    console.log('\n3️⃣ Test Gestion Profil Marchand (/api/merchants/profile)...');
    const getProf = await apiRequest('/merchants/profile', {
      headers: { 'Authorization': `Bearer ${merchantToken}` }
    });
    assert(getProf.status === 200 && getProf.data.data.merchant, 'Récupération du profil marchand réussi');

    const updateProf = await apiRequest('/merchants/profile', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${merchantToken}` },
      body: {
        first_name: 'Aminata',
        last_name: 'Ba Pro',
        phone: '+221771234568',
        whatsapp_phone: '+221771234568',
        business_name: 'Ba Couture Dakar Pro',
        business_type: 'Mode & Chaussures',
        description: 'Boutique de haute couture sénégalaise certifiée.',
        address: 'Avenue Cheikh Anta Diop',
        quartier: 'Mermoz',
        city: 'Dakar',
        country: 'Sénégal',
        logo_url: `/api/uploads/${uploadedMediaId}`
      }
    });
    assert(updateProf.status === 200 && updateProf.data.data.merchant.business_name === 'Ba Couture Dakar Pro', 'Mise à jour du profil marchand avec logo et WhatsApp réussie');

    console.log('\n4️⃣ Test Ajout de Produit & Gestion des Stocks...');
    const createProd = await apiRequest('/merchants/products', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${merchantToken}` },
      body: {
        name: 'Robe Soie Cérémonie Gold',
        description: 'Robe soyeuse brodée main',
        price: 35000,
        stock: 10,
        category: 'Mode & Chaussures',
        subcategory: 'Robes & Cérémonie',
        city: 'Dakar',
        quartier: 'Mermoz',
        location: 'Mermoz, Dakar',
        image_url: `/api/uploads/${uploadedMediaId}`
      }
    });
    assert(createProd.status === 201 && createProd.data.data.id, 'Création du produit avec photo et localisation réussie');
    createdProductId = createProd.data.data.id;
    assert(createProd.data.data.price === 35000, 'Prix numérique pur 35000 vérifié côté serveur');

    // Modification du stock
    const updStock = await apiRequest(`/merchants/products/${createdProductId}/stock`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${merchantToken}` },
      body: { stock: 18 }
    });
    assert(updStock.status === 200 && updStock.data.data.stock === 18, 'Ajustement de stock via PATCH /stock réussi');

    // Toggle statut
    const toggleStat = await apiRequest(`/merchants/products/${createdProductId}/status`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${merchantToken}` },
      body: { is_active: true, status: 'APPROVED' }
    });
    assert(toggleStat.status === 200 && toggleStat.data.data.is_active === true, 'Activation du statut produit réussie');

    console.log('\n5️⃣ Test Sécurité Multi-Marchands & Protection IDOR...');
    // Marchand B tente d'éditer le produit de Marchand A
    const idorEdit = await apiRequest(`/merchants/products/${createdProductId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${otherMerchantToken}` },
      body: { name: 'Tentative Vol Produit', price: 100 }
    });
    assert(idorEdit.status === 403, 'IDOR Bloqué (403) : Marchand B ne peut pas modifier le produit de Marchand A');

    // Marchand B tente de modifier le stock de Marchand A
    const idorStock = await apiRequest(`/merchants/products/${createdProductId}/stock`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${otherMerchantToken}` },
      body: { stock: 0 }
    });
    assert(idorStock.status === 403, 'IDOR Bloqué (403) : Marchand B ne peut pas modifier le stock de Marchand A');

    // Marchand B tente de supprimer le produit de Marchand A
    const idorDel = await apiRequest(`/merchants/products/${createdProductId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${otherMerchantToken}` }
    });
    assert(idorDel.status === 403, 'IDOR Bloqué (403) : Marchand B ne peut pas supprimer le produit de Marchand A');

    // Client tente d'ajouter un produit
    const clientAdd = await apiRequest('/merchants/products', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${clientToken}` },
      body: { name: 'Produit Client Illégal', price: 1000 }
    });
    assert(clientAdd.status === 403, 'RBAC Bloqué (403) : Un simple Client ne peut pas créer de produit');

    console.log('\n6️⃣ Test Modération Admin & Catalogue Public...');
    const adminList = await apiRequest('/admin/products', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(adminList.status === 200 && Array.isArray(adminList.data.data), 'Super Admin peut lister tous les produits du catalogue');

    // Modération admin: Rejet
    const adminReject = await apiRequest(`/admin/products/${createdProductId}/status`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: { status: 'REJECTED', is_active: false }
    });
    assert(adminReject.status === 200 && adminReject.data.data.status === 'REJECTED', 'Admin peut modérer et rejeter un produit non conforme');

    // Vérification disparition du catalogue public
    const publicCat1 = await apiRequest('/merchants/products');
    const prodInPublic = publicCat1.data.data.find(p => p.id === createdProductId);
    assert(!prodInPublic, 'Produit REJECTED immédiatement retiré du catalogue public');

    // Modération admin: Réapprobation
    const adminApprove = await apiRequest(`/admin/products/${createdProductId}/status`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: { status: 'APPROVED', is_active: true }
    });
    assert(adminApprove.status === 200 && adminApprove.data.data.status === 'APPROVED', 'Admin réapprouve le produit');

    // Vérification réapparition dans catalogue public
    const publicCat2 = await apiRequest('/merchants/products');
    const prodInPublic2 = publicCat2.data.data.find(p => p.id === createdProductId);
    assert(Boolean(prodInPublic2), 'Produit APPROVED immédiatement réintégré dans le catalogue public');

    console.log('\n================================================================');
    console.log('  🎉 TOUS LES TESTS MARCHAND, UPLOADS & IDOR ONT RÉUSSI À 100% !');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ ERREUR LORS DE L\'EXÉCUTION DES TESTS :', err);
    process.exit(1);
  } finally {
    if (server) server.close();
  }
}

runAllMerchantTests();
