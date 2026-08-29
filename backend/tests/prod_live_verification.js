/**
 * MoneyLink — Script de Vérification en Direct de l'API de Production Render
 * URL cible : https://moneylink-kd6v.onrender.com/api
 */

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

async function runProdVerification() {
  console.log('\n================================================================');
  console.log('  🌐 VÉRIFICATION EN DIRECT SUR LE SERVEUR DE PRODUCTION RENDER');
  console.log(`     Cible : ${BASE_URL}`);
  console.log('================================================================\n');

  try {
    // 1. Health check
    console.log('1️⃣ Vérification Santé & PostgreSQL (/api/health)...');
    const health = await request('/health');
    console.log(`   Statut: ${health.status} (${health.data.status}) | Base: ${health.data.database?.mode}`);
    if (health.status !== 200 || !health.data.database?.connected) {
      throw new Error('Échec Health check production');
    }

    // 2. Catalogue public
    console.log('\n2️⃣ Vérification Catalogue Public (/api/merchants/products)...');
    const cat = await request('/merchants/products');
    console.log(`   Statut: ${cat.status} | Total Produits: ${cat.data.count}`);
    if (cat.status !== 200 || !Array.isArray(cat.data.data)) {
      throw new Error('Échec catalogue public production');
    }

    // 3. Inscription Marchand en Production
    console.log('\n3️⃣ Inscription Marchand Live...');
    const pMerchant = `+22177${Math.floor(1000000 + Math.random() * 9000000)}`;
    const regM = await request('/auth/register', {
      method: 'POST',
      body: {
        phone: pMerchant,
        email: `prod.merchant.${Date.now()}@moneylink.sn`,
        first_name: 'Babacar',
        last_name: 'Seck',
        password: 'Password123!',
        role: 'MERCHANT',
        business_name: 'Seck Electronics Dakar',
        business_type: 'High-Tech',
        address: 'Sandaga, Dakar',
        city: 'Dakar'
      }
    });
    if (regM.status !== 201) throw new Error(`Échec inscription marchand prod: ${regM.data.error}`);
    const tokenM = regM.data.data.token;
    const authM = { Authorization: `Bearer ${tokenM}` };
    const merchantId = regM.data.data.merchant.id;
    console.log(`   ✅ Marchand Live créé : Seck Electronics Dakar (${pMerchant})`);

    // 4. Publication Produit Live
    console.log('\n4️⃣ Publication Produit Live...');
    const createP = await request('/merchants/products', {
      method: 'POST',
      headers: authM,
      body: {
        name: 'Chargeur Solaire Fast 65W',
        description: 'Charge rapide universelle USB-C étanche',
        price: 20000,
        stock: 8,
        category: 'High-Tech & Téléphonie'
      }
    });
    if (createP.status !== 201) throw new Error(`Échec publication produit: ${createP.data.error}`);
    const prodId = createP.data.data.id;
    console.log(`   ✅ Produit Live publié : ${createP.data.data.name} (ID: ${prodId})`);

    // 5. Inscription Client Live
    console.log('\n5️⃣ Inscription Client Live...');
    const pClient = `+22176${Math.floor(1000000 + Math.random() * 9000000)}`;
    const regC = await request('/auth/register', {
      method: 'POST',
      body: {
        phone: pClient,
        email: `prod.buyer.${Date.now()}@moneylink.sn`,
        first_name: 'Coumba',
        last_name: 'Gueye',
        password: 'Password123!',
        role: 'CLIENT'
      }
    });
    if (regC.status !== 201) throw new Error(`Échec inscription client prod: ${regC.data.error}`);
    const tokenC = regC.data.data.token;
    const authC = { Authorization: `Bearer ${tokenC}` };
    console.log(`   ✅ Client Live créé : Coumba Gueye (${pClient})`);

    // 6. Commande Client Live
    console.log('\n6️⃣ Création Commande Panier Live...');
    const ord = await request('/orders', {
      method: 'POST',
      headers: authC,
      body: {
        merchant_id: merchantId,
        items: [{ product_id: prodId, quantity: 1 }],
        delivery_address: 'Fann Résidence, Dakar',
        delivery_phone: pClient
      }
    });
    if (ord.status !== 201) throw new Error(`Échec création commande prod: ${ord.data.error}`);
    const orderId = ord.data.data.id;
    console.log(`   ✅ Commande Live créée : #${ord.data.data.order_number} (${ord.data.data.total_amount} FCFA)`);

    // 7. Paiement & Séquestre Live
    console.log('\n7️⃣ Paiement Sécurisé & Verrouillage Séquestre Live...');
    const pay = await request('/payments/checkout', {
      method: 'POST',
      headers: authC,
      body: { order_id: orderId, payment_method: 'WAVE_MOCK', phone: pClient }
    });
    if (pay.status !== 200) throw new Error(`Échec paiement live: ${pay.data.error}`);
    const otpCode = pay.data.data.deliveryCode;
    console.log(`   ✅ Paiement Live Confirmé. Code OTP 6 chiffres : [ ${otpCode} ]`);

    // 8. Expédition Live
    console.log('\n8️⃣ Expédition Live...');
    const ship = await request(`/orders/${orderId}/ship`, { method: 'PUT', headers: authM });
    if (ship.status !== 200) throw new Error(`Échec expédition: ${ship.data.error}`);
    console.log('   ✅ Statut commande Live : SHIPPED 🚚');

    // 9. Validation OTP Live & Libération des fonds
    console.log('\n9️⃣ Validation OTP Live par le Commerçant...');
    const valOtp = await request(`/orders/${orderId}/validate-code`, {
      method: 'POST',
      headers: authM,
      body: { code: otpCode }
    });
    if (valOtp.status !== 200) throw new Error(`Échec validation OTP prod: ${valOtp.data.error}`);
    console.log(`   🎉 ${valOtp.data.message}`);
    console.log(`   💰 Montant crédité au commerçant : ${valOtp.data.data.releasedAmount} FCFA`);

    console.log('\n================================================================');
    console.log('  🎉 LA PRODUCTION RENDER EST 100% OPÉRATIONNELLE ET TESTÉE !');
    console.log('================================================================\n');
  } catch (err) {
    console.error('❌ ERREUR PRODUCTION :', err.message);
    process.exitCode = 1;
  }
}

runProdVerification();
