/**
 * ============================================================================
 * MONEYLINK V2.5 — PRODUCTION READINESS TEST SUITE
 * Test complet de certification de production (Sécurité, Paiements, KYC, IA, Shield, Business, i18n, Notifications)
 * ============================================================================
 */

import http from 'http';
import crypto from 'crypto';
import app from '../src/app.js';
import { memoryStore, pool } from '../src/config/db.js';
import { SUPER_ADMIN_CONFIG } from '../src/middleware/roles.js';
import { NotificationDispatcher, NotificationTemplates, NotificationChannels } from '../src/services/notificationDispatcher.js';
import { ShieldService } from '../src/services/security/shieldService.js';
import { AiProviderAdapter } from '../src/services/ai/aiProvider.js';
import { AiService } from '../src/services/ai/aiService.js';
import { PaymentManager } from '../src/services/payment/paymentManager.js';
import { EscrowService } from '../src/services/escrowService.js';

let server;
let baseUrl;
let totalPassed = 0;
let totalFailed = 0;

function assert(condition, message) {
  if (!condition) {
    totalFailed++;
    console.error(`  ❌ ÉCHEC : ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    totalPassed++;
    console.log(`  ✅ ${message}`);
  }
}

async function request(endpoint, options = {}) {
  const url = `${baseUrl}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers || {})
  };

  const fetchOptions = {
    method: options.method || 'GET',
    headers
  };

  if (options.body) {
    fetchOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  const res = await fetch(url, fetchOptions);
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  return {
    status: res.status,
    headers: res.headers,
    body: json
  };
}

async function runProductionTestSuite() {
  console.log('\n===============================================================');
  console.log('  🚀 MONEYLINK V2.5 — PRODUCTION READINESS CERTIFICATION TEST');
  console.log('===============================================================');

  // Démarrage serveur sur port aléatoire de test
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`  🌐 Serveur de test actif sur : ${baseUrl}\n`);
      resolve();
    });
  });

  try {
    // ------------------------------------------------------------------------
    // TEST 1 : Démarrage & Health Check
    // ------------------------------------------------------------------------
    console.log('📋 [1/14] TEST : DÉMARRAGE SERVEUR & HEALTH CHECKS');
    const rootHealth = await request('/health');
    assert(rootHealth.status === 200, 'Root /health répond HTTP 200');
    assert(rootHealth.body?.status === 'UP', 'Service status est "UP"');

    const apiHealth = await request('/api/health');
    assert(apiHealth.status === 200, 'Endpoint /api/health répond HTTP 200');
    assert(apiHealth.body?.features?.shield_security === true, 'Feature Shield activée');
    assert(apiHealth.body?.features?.ai_assistant === true, 'Feature IA Assistant activée');
    assert(apiHealth.body?.features?.invoicing_and_receipts === true, 'Feature Facturation & Reçus activée');

    // ------------------------------------------------------------------------
    // TEST 2 : Sécurité des En-têtes HTTP (Helmet, CORS)
    // ------------------------------------------------------------------------
    console.log('\n📋 [2/14] TEST : SÉCURITÉ EN-TÊTES & HEADERS HTTP (HELMET / CORS)');
    assert(apiHealth.headers.get('x-content-type-options') === 'nosniff', 'Header X-Content-Type-Options: nosniff présent');
    assert(apiHealth.headers.get('x-frame-options') === 'SAMEORIGIN' || apiHealth.headers.get('x-frame-options') === 'DENY', 'Header X-Frame-Options configuré');

    // ------------------------------------------------------------------------
    // TEST 3 : Authentification & Sécurité Mots de Passe / Rôles
    // ------------------------------------------------------------------------
    console.log('\n📋 [3/14] TEST : AUTHENTIFICATION, HASHAGE BCRYPT & RBAC');
    const testBuyerPhone = `+22177${Math.floor(1000000 + Math.random() * 9000000)}`;
    const testBuyerEmail = `buyer_${Date.now()}@moneylink.sn`;

    const registerBuyerRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        phone: testBuyerPhone,
        email: testBuyerEmail,
        first_name: 'Fatou',
        last_name: 'Sow',
        password: 'SecurePassword2026!',
        role: 'CLIENT'
      }
    });

    assert(registerBuyerRes.status === 201, 'Inscription client répond HTTP 201');
    assert(registerBuyerRes.body?.data?.token !== undefined, 'Token JWT généré à l’inscription');
    assert(registerBuyerRes.body?.data?.user?.password_hash === undefined, 'Le password_hash n\'est JAMAIS exposé');
    assert(registerBuyerRes.body?.data?.user?.role === 'CLIENT', 'Rôle CLIENT correctement assigné');

    const buyerToken = registerBuyerRes.body?.data?.token;
    const buyerId = registerBuyerRes.body?.data?.user?.id;

    // Tentative d'élévation de privilèges via register avec role=ADMIN
    const hackerPhone = `+22177${Math.floor(1000000 + Math.random() * 9000000)}`;
    const hackerRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        phone: hackerPhone,
        email: `hacker_${Date.now()}@test.sn`,
        first_name: 'Evil',
        last_name: 'User',
        password: 'HackerPassword123!',
        role: 'ADMIN' // Tentative de devenir admin publiquement
      }
    });
    assert(hackerRes.body?.data?.user?.role !== 'ADMIN', 'Protection anti-élévation : Inscription publique refuse le rôle ADMIN');

    // Inscription Commerçant
    const testMerchantPhone = `+22178${Math.floor(1000000 + Math.random() * 9000000)}`;
    const testMerchantEmail = `merchant_${Date.now()}@moneylink.sn`;

    const registerMerchantRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        phone: testMerchantPhone,
        email: testMerchantEmail,
        first_name: 'Moussa',
        last_name: 'Diallo',
        password: 'MerchantPass2026!',
        role: 'MERCHANT',
        business_name: 'Diallo Tech Dakar',
        business_type: 'High Tech & Électronique'
      }
    });

    assert(registerMerchantRes.status === 201, 'Inscription commerçant répond HTTP 201');
    assert(registerMerchantRes.body?.data?.merchant?.business_name === 'Diallo Tech Dakar', 'Profil commerçant initialisé');

    const merchantToken = registerMerchantRes.body?.data?.token;
    const merchantId = registerMerchantRes.body?.data?.merchant?.id;

    // Connexion
    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      body: {
        identifier: testMerchantPhone,
        password: 'MerchantPass2026!'
      }
    });
    assert(loginRes.status === 200, 'Connexion par téléphone réussie');
    assert(loginRes.body?.data?.token !== undefined, 'Token de session renvoyé');

    // Connexion avec mot de passe erroné
    const badLoginRes = await request('/api/auth/login', {
      method: 'POST',
      body: {
        identifier: testMerchantPhone,
        password: 'WrongPassword999!'
      }
    });
    assert(badLoginRes.status === 401, 'Rejet des identifiants invalides (HTTP 401)');

    // ------------------------------------------------------------------------
    // TEST 4 : Isolation Super Admin Stricte & Contrôle des Permissions
    // ------------------------------------------------------------------------
    console.log('\n📋 [4/14] TEST : ISOLATION SUPER ADMIN (CODÉ SAMB) & CONTRÔLE D\'ACCÈS');
    // Client simple tente d'accéder au dashboard admin
    const buyerAdminAttempt = await request('/api/admin/dashboard', {
      headers: { 'Authorization': `Bearer ${buyerToken}` }
    });
    assert(buyerAdminAttempt.status === 403, 'Client non-admin bloqué sur /api/admin/* (HTTP 403)');

    // Commerçant tente d'accéder au dashboard admin
    const merchantAdminAttempt = await request('/api/admin/dashboard', {
      headers: { 'Authorization': `Bearer ${merchantToken}` }
    });
    assert(merchantAdminAttempt.status === 403, 'Commerçant bloqué sur /api/admin/* (HTTP 403)');

    // Génération token pour le Super Administrateur Codé Samb
    const jwt = (await import('jsonwebtoken')).default;
    const jwtSecret = process.env.JWT_SECRET || 'moneylink_super_secure_fintech_jwt_secret_key_2026_sn';
    const superAdminToken = jwt.sign(
      { id: SUPER_ADMIN_CONFIG.id, role: 'ADMIN', phone: SUPER_ADMIN_CONFIG.phone },
      jwtSecret,
      { expiresIn: '1h' }
    );

    const adminDashboardRes = await request('/api/admin/dashboard', {
      headers: { 'Authorization': `Bearer ${superAdminToken}` }
    });
    assert(adminDashboardRes.status === 200, 'Super Administrateur authentifié accède à /api/admin/dashboard');
    assert(adminDashboardRes.body?.data?.metrics !== undefined, 'Métriques KPIs complètes reçues');

    // ------------------------------------------------------------------------
    // TEST 5 : Onboarding & Progression des Tiers KYC
    // (USER -> CUSTOMER -> MERCHANT -> VERIFIED MERCHANT)
    // ------------------------------------------------------------------------
    console.log('\n📋 [5/14] TEST : ONBOARDING & ARCHITECTURE KYC PAR TIERS');
    // Statut KYC initial du commerçant
    const initialKycRes = await request('/api/merchants/kyc/status', {
      headers: { 'Authorization': `Bearer ${merchantToken}` }
    });
    assert(initialKycRes.status === 200, 'Consultation statut KYC marchand');
    assert(initialKycRes.body?.data?.tier === 'MERCHANT', 'Niveau initial : MERCHANT');
    assert(initialKycRes.body?.data?.is_verified === false, 'Commerçant non vérifié initialement');

    // Soumission de la demande de vérification KYC
    const submitKycRes = await request('/api/merchants/kyc/submit', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${merchantToken}` },
      body: {
        legal_business_name: 'Diallo Tech SARL',
        registration_number_ninea: '009876543-2026',
        document_type: 'COMMERCE_REGISTER',
        document_url: 'https://moneylink.sn/uploads/rc_diallo_tech.pdf'
      }
    });
    assert(submitKycRes.status === 201, 'Soumission KYC acceptée (HTTP 201)');
    assert(submitKycRes.body?.data?.currentStatus === 'PENDING', 'Statut demande : PENDING');
    assert(submitKycRes.body?.data?.transparency_notice !== undefined, 'Avertissement de transparence KYC présent');

    const verificationId = submitKycRes.body?.data?.verification?.id;

    // Super Admin consulte les demandes KYC
    const adminKycListRes = await request('/api/admin/kyc/requests', {
      headers: { 'Authorization': `Bearer ${superAdminToken}` }
    });
    assert(adminKycListRes.status === 200, 'Admin liste les demandes KYC');
    assert(adminKycListRes.body?.data?.some(k => k.id === verificationId), 'Demande soumise présente dans la liste admin');

    // Super Admin approuve la vérification KYC
    const reviewKycRes = await request(`/api/admin/kyc/requests/${verificationId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${superAdminToken}` },
      body: {
        status: 'VERIFIED'
      }
    });
    assert(reviewKycRes.status === 200, 'Admin valide la demande KYC');
    assert(reviewKycRes.body?.data?.tier === 'VERIFIED_MERCHANT', 'Commerçant promu au rang VERIFIED_MERCHANT');
    assert(reviewKycRes.body?.data?.merchant?.is_verified === true, 'Drapeau is_verified passé à true');

    // ------------------------------------------------------------------------
    // TEST 6 : Produits, Commandes & Séquestre (Escrow)
    // ------------------------------------------------------------------------
    console.log('\n📋 [6/14] TEST : CATALOGUE PRODUITS, SÉQUESTRE & CODE OTP');
    // Publication d'un produit
    const createProdRes = await request('/api/merchants/products', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${merchantToken}` },
      body: {
        name: 'Smartphone Dakar Pro 5G',
        description: 'Téléphone dernière génération garantie 1 an',
        price: 150000,
        stock: 10,
        category: 'High Tech',
        city: 'Dakar'
      }
    });
    assert(createProdRes.status === 201, 'Produit créé avec succès');
    const productId = createProdRes.body?.data?.id;

    // Création de commande par l'acheteur
    const createOrderRes = await request('/api/orders', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${buyerToken}` },
      body: {
        merchant_id: merchantId,
        items: [{ product_id: productId, quantity: 1 }],
        delivery_address: 'Almadies, Dakar, Sénégal',
        delivery_phone: testBuyerPhone
      }
    });
    assert(createOrderRes.status === 201, 'Commande créée (HTTP 201)');
    const orderData = createOrderRes.body?.data?.order || createOrderRes.body?.data;
    assert(orderData?.status === 'PENDING_PAYMENT', 'Statut initial : PENDING_PAYMENT');
    const orderId = orderData?.id;
    const orderNumber = orderData?.order_number;

    // ------------------------------------------------------------------------
    // TEST 7 : Passerelles de Paiement Sandbox (Wave & Orange Money)
    // ------------------------------------------------------------------------
    console.log('\n📋 [7/14] TEST : PASSERELLES PAIEMENT WAVE & ORANGE MONEY');
    const waveSession = await PaymentManager.createSession('WAVE', {
      orderId,
      orderNumber,
      amount: 150000,
      currency: 'XOF'
    });
    assert(waveSession.success === true, 'Création session Wave Checkout Sandbox');
    assert(waveSession.checkoutUrl.includes('wave.com'), 'URL de checkout Wave valide');

    const omSession = await PaymentManager.createSession('ORANGE_MONEY', {
      orderId,
      orderNumber,
      amount: 150000,
      currency: 'OUV'
    });
    assert(omSession.success === true, 'Création session Orange Money WebPay Sandbox');
    assert(omSession.checkoutUrl.includes('orange-money'), 'URL de checkout Orange Money valide');

    // ------------------------------------------------------------------------
    // TEST 8 : Webhooks & Validation Signatures HMAC
    // ------------------------------------------------------------------------
    console.log('\n📋 [8/14] TEST : SÉCURITÉ DES WEBHOOKS & SIGNATURES HMAC');
    // Test Wave Webhook avec signature HMAC valide
    const wavePayload = {
      type: 'checkout.session.completed',
      data: {
        id: `wave_tx_${Date.now()}`,
        client_reference: orderId,
        amount: '150000',
        currency: 'XOF',
        payment_status: 'succeeded'
      }
    };
    const waveSecret = process.env.WAVE_WEBHOOK_SECRET || 'wave_sn_webhook_secret_key_2026';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const wavePayloadStr = JSON.stringify(wavePayload);
    const waveSig = crypto.createHmac('sha256', waveSecret).update(`${timestamp}.${wavePayloadStr}`).digest('hex');
    const waveSigHeader = `t=${timestamp},v1=${waveSig}`;

    const waveWebhookRes = await request('/api/webhooks/wave', {
      method: 'POST',
      headers: {
        'wave-signature': waveSigHeader
      },
      body: wavePayload
    });
    assert(waveWebhookRes.status === 200, 'Webhook Wave authentifié traité (HTTP 200)');

    // Vérification que les fonds sont maintenant verrouillés en séquestre
    const checkOrderRes = await request(`/api/orders/${orderId}`, {
      headers: { 'Authorization': `Bearer ${buyerToken}` }
    });
    assert(checkOrderRes.body?.data?.status === 'PAYMENT_CONFIRMED', 'Commande passée en PAYMENT_CONFIRMED suite au Webhook Wave');
    assert(checkOrderRes.body?.data?.delivery_code !== undefined, 'Code secret OTP généré pour la livraison');

    // Test Webhook avec fausse signature -> Doit être rejeté si signature fournie
    const badWaveWebhookRes = await request('/api/webhooks/wave', {
      method: 'POST',
      headers: { 'wave-signature': 't=123456,v1=bad_signature_hex_hacker_test' },
      body: wavePayload
    });
    assert(badWaveWebhookRes.status === 401, 'Rejet immédiat des webhooks à signature invalide (HTTP 401)');

    // ------------------------------------------------------------------------
    // TEST 9 : Factures & Reçus Numériques
    // ------------------------------------------------------------------------
    console.log('\n📋 [9/14] TEST : SYSTÈME DE FACTURATION & REÇUS NUMÉRIQUES');
    const createInvoiceRes = await request('/api/invoices', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${merchantToken}` },
      body: {
        client_name: 'Cabinet Médical Dakar',
        client_phone: '+221771234567',
        client_email: 'contact@cabinetdakar.sn',
        client_address: 'Plateau, Dakar',
        discount_amount: 5000,
        due_date: '2026-09-30',
        items: [
          { description: 'Installation Réseau Wi-Fi Pro', quantity: 1, unit_price: 100000 },
          { description: 'Routeur Cisco Professionnel', quantity: 2, unit_price: 50000 }
        ]
      }
    });

    assert(createInvoiceRes.status === 201, 'Facture créée avec succès (HTTP 201)');
    const invoice = createInvoiceRes.body?.data;
    assert(invoice.subtotal === 200000, 'Sous-total calculé correctement (200 000 FCFA)');
    assert(invoice.total_amount === 195000, 'Total net calculé avec remise (195 000 FCFA)');
    assert(invoice.share_token !== undefined, 'Lien de partage public sécurisé généré');

    // Consultation publique de la facture via son share_token
    const publicInvoiceRes = await request(`/api/invoices/public/${invoice.share_token}`);
    assert(publicInvoiceRes.status === 200, 'Consultation publique de la facture via token');
    assert(publicInvoiceRes.body?.data?.invoice_number === invoice.invoice_number, 'Facture publique correspondante');

    // Règlement de la facture et génération du reçu
    const payInvoiceRes = await request(`/api/invoices/${invoice.id}/pay`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${buyerToken}` },
      body: {
        payment_method: 'WAVE',
        client_phone: '+221771234567'
      }
    });
    assert(payInvoiceRes.status === 200, 'Règlement de la facture validé');
    assert(payInvoiceRes.body?.data?.receipt !== undefined, 'Reçu officiel numérique généré');
    assert(payInvoiceRes.body?.data?.invoice?.status === 'PAYÉE', 'Statut facture mis à jour : PAYÉE');

    // ------------------------------------------------------------------------
    // TEST 10 : MoneyLink Shield (Sécurité & Scoring Fraude)
    // ------------------------------------------------------------------------
    console.log('\n📋 [10/14] TEST : MONEYLINK SHIELD (ANALYSE DE RISQUE & SCORING)');
    const safeTxAssessment = await ShieldService.analyzeTransaction({
      userId: buyerId,
      amount: 15000,
      paymentMethod: 'WAVE',
      ipAddress: '196.207.200.10'
    });
    assert(safeTxAssessment.riskLevel === 'LOW', 'Transaction standard évaluée LOW risk');
    assert(safeTxAssessment.requiresConfirmation === false, 'Transaction standard autorisée sans blocage');

    const highRiskTxAssessment = await ShieldService.analyzeTransaction({
      userId: buyerId,
      amount: 25000000, // Montant très anormal (25 millions FCFA)
      paymentMethod: 'UNKNOWN_METHOD',
      ipAddress: '185.220.101.5' // IP suspecte
    });
    assert(highRiskTxAssessment.riskScore > 30, 'Scoring de risque généré sur montant anormal');
    assert(highRiskTxAssessment.reasons.length > 0, 'Motifs de risque détaillés fournis');

    // ------------------------------------------------------------------------
    // TEST 11 : MoneyLink IA (Assistant Financier Déterministe & Adaptatif)
    // ------------------------------------------------------------------------
    console.log('\n📋 [11/14] TEST : ASSISTANT FINANCIER IA & MOTEUR CONSULTATIF');
    const aiProvider = AiProviderAdapter.getActiveProvider();
    assert(aiProvider !== undefined, `Fournisseur IA actif identifié : ${aiProvider}`);

    const aiFrenchResponse = await AiService.askQuestion(
      buyerId,
      'Combien ai-je dépensé ce mois-ci et comment épargner ?',
      'fr'
    );
    assert(aiFrenchResponse && aiFrenchResponse.response !== undefined, 'Réponse IA en français générée avec succès');
    assert(aiFrenchResponse.intent !== undefined, 'Intention financière classifiée');

    const aiWolofResponse = await AiService.askQuestion(
      buyerId,
      'Naka la mëna dencé sama xaalis ci tontine ?',
      'wo'
    );
    assert(aiWolofResponse && aiWolofResponse.response !== undefined, 'Réponse IA en Wolof générée avec succès');

    // ------------------------------------------------------------------------
    // TEST 12 : MoneyLink Business (Analytics Commerçant)
    // ------------------------------------------------------------------------
    console.log('\n📋 [12/14] TEST : ESPACE BUSINESS & SUIVI D\'OBJECTIF MENSUEL');
    const businessStatsRes = await request('/api/business/dashboard', {
      headers: { 'Authorization': `Bearer ${merchantToken}` }
    });
    assert(businessStatsRes.status === 200, 'Tableau de bord Business accessible');
    assert(businessStatsRes.body?.data?.monthlyTarget !== undefined, 'Objectif de vente mensuel présent');
    assert(businessStatsRes.body?.data?.performance?.invoicesCount !== undefined, 'Synthèse facturation consolidée');

    // ------------------------------------------------------------------------
    // TEST 13 : Moteur de Notifications Multi-Canal (8 Événements Requis)
    // ------------------------------------------------------------------------
    console.log('\n📋 [13/14] TEST : MOTEUR DE NOTIFICATIONS MULTI-CANAL (8 ÉVÉNEMENTS)');
    const requiredEvents = [
      { key: 'PAYMENT_RECEIVED', params: [50000, 'Fatou Sow', 'TRX-9872'] },
      { key: 'PAYMENT_SENT', params: [50000, 'Diallo Tech', 'TRX-9872'] },
      { key: 'INVOICE_CREATED', params: ['FACT-2026-001', 'Client Test', 195000, 'https://moneylink.sn/i/token'] },
      { key: 'INVOICE_PAID', params: ['FACT-2026-001', 195000, 'Cabinet Médical'] },
      { key: 'INVOICE_CANCELLED', params: ['FACT-2026-001', 'Demande client'] },
      { key: 'SHIELD_ALERT', params: ['Connexion suspecte', 'Tentative IP étrangère', 'MEDIUM'] },
      { key: 'UNUSUAL_ACTIVITY', params: ['Changement de mot de passe', '41.82.1.20', 'Dakar'] },
      { key: 'BUSINESS_TARGET_REACHED', params: ['Août 2026', 1500000, 1000000] }
    ];

    for (const evt of requiredEvents) {
      const dispatchRes = await NotificationDispatcher.dispatch({
        userId: buyerId,
        phone: testBuyerPhone,
        email: testBuyerEmail,
        templateKey: evt.key,
        params: evt.params,
        channels: [NotificationChannels.IN_APP, NotificationChannels.PUSH, NotificationChannels.SMS, NotificationChannels.WHATSAPP, NotificationChannels.EMAIL]
      });

      assert(dispatchRes !== null, `Événement de notification ${evt.key} validé`);
      assert(dispatchRes.dispatchedLogs.some(l => l.channel === 'IN_APP'), `Canal IN_APP présent pour ${evt.key}`);
      assert(dispatchRes.dispatchedLogs.some(l => l.channel === 'EMAIL'), `Canal EMAIL présent pour ${evt.key}`);
      assert(dispatchRes.dispatchedLogs.some(l => l.channel === 'SMS'), `Canal SMS présent pour ${evt.key}`);
    }

    // ------------------------------------------------------------------------
    // TEST 14 : Bilinguisme & Sécurité Finale sans Fuite de Secrets
    // ------------------------------------------------------------------------
    console.log('\n📋 [14/14] TEST : BILINGUISME FRANÇAIS/WOLOF & AUDIT FUITE SECRETS');
    const userNotifsRes = await request('/api/notifications', {
      headers: { 'Authorization': `Bearer ${buyerToken}` }
    });
    assert(userNotifsRes.status === 200, 'Récupération de la boîte de réception notifications');
    assert(userNotifsRes.body?.data?.length >= requiredEvents.length, 'Toutes les notifications ont été journalisées');

    // Vérification finale qu'aucun token ou secret n'est apparu dans le corps des réponses
    const dumpStr = JSON.stringify(userNotifsRes.body);
    assert(!dumpStr.includes('password_hash'), 'Zero fuite : password_hash absent des notifications');
    assert(!dumpStr.includes('JWT_SECRET'), 'Zero fuite : JWT_SECRET absent');

    console.log('\n===============================================================');
    console.log(`  🎉 TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS : ${totalPassed} SUCCÈS / ${totalFailed} ÉCHECS`);
    console.log('===============================================================\n');
  } catch (err) {
    console.error('\n🚨 ERREUR CRITIQUE PENDANT LA SUITE DE TESTS :', err);
  } finally {
    if (server) {
      server.close();
    }
  }
}

runProductionTestSuite();
