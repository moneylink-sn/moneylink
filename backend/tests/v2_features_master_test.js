/**
 * MoneyLink V2 — Suite Complète de Tests Automatisés FinTech V2
 * Teste exhaustivement :
 * 1. 🤖 MoneyLink IA
 * 2. 🛡️ MoneyLink Shield
 * 3. 📊 MoneyLink Business
 * 4. 🧾 MoneyLink Factures & Reçus
 * 5. 🇸🇳 MoneyLink Local (Français & Wolof)
 */

import http from 'http';
import app from '../src/app.js';
import { initialSeedData } from '../src/config/seedData.js';

let server;
let baseUrl;

const ADMIN_TOKEN_PAYLOAD = {
  identifier: '+221770000001',
  password: 'Password123!'
};

const MERCHANT_TOKEN_PAYLOAD = {
  identifier: '+221770000002',
  password: 'Password123!'
};

const CLIENT_TOKEN_PAYLOAD = {
  identifier: '+221770000004',
  password: 'Password123!'
};

let adminToken = '';
let merchantToken = '';
let clientToken = '';

let createdInvoiceId = '';
let createdInvoiceShareToken = '';
let generatedReceiptNumber = '';

async function request(endpoint, options = {}) {
  const url = `${baseUrl}/api${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers || {})
  };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await res.text();
  let json = {};
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  return { status: res.status, ok: res.ok, data: json };
}

async function runTests() {
  console.log('================================================================');
  console.log('🚀 MONEYLINK V2 — SUITE DE TESTS MAÎTRE FINTECH INNOVATIONS');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 0. Initialisation du Serveur de Test
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    console.log(`📡 Serveur de test MoneyLink actif sur ${baseUrl}\n`);

    // 0b. Authentification des acteurs
    console.log('--- 0. AUTHENTIFICATION DES ACTEURS ---');
    const authAdmin = await request('/auth/login', { method: 'POST', body: ADMIN_TOKEN_PAYLOAD });
    assert(authAdmin.status === 200 && authAdmin.data?.data?.token, 'Connexion Super Admin (Codé Samb)');
    adminToken = authAdmin.data?.data?.token;

    const authMerchant = await request('/auth/login', { method: 'POST', body: MERCHANT_TOKEN_PAYLOAD });
    assert(authMerchant.status === 200 && authMerchant.data?.data?.token, 'Connexion Marchand (Diop Sports Pro)');
    merchantToken = authMerchant.data?.data?.token;

    const authClient = await request('/auth/login', { method: 'POST', body: CLIENT_TOKEN_PAYLOAD });
    assert(authClient.status === 200 && authClient.data?.data?.token, 'Connexion Client (Moussa Fall)');
    clientToken = authClient.data?.data?.token;
    console.log('');

    // ========================================================================
    // 1. TESTS MONEYLINK IA
    // ========================================================================
    console.log('--- 1. 🤖 TESTS MONEYLINK IA ---');
    
    // 1a. Synthèse & Insights financiers
    const aiInsights = await request('/ai/insights?lang=fr', {
      headers: { Authorization: `Bearer ${clientToken}` }
    });
    assert(aiInsights.status === 200 && aiInsights.data.success, 'GET /api/ai/insights renvoie un statut 200');
    assert(aiInsights.data.data.summary.currency === 'XOF', 'Devise en FCFA (XOF)');
    assert(typeof aiInsights.data.data.summary.spentThisWeek === 'number', 'Calcul réel des dépenses hebdomadaires');
    assert(typeof aiInsights.data.data.summary.estimatedSavingsCapacity === 'number', 'Calcul de la capacité d\'épargne');

    // 1b. Chat en Français
    const aiChatFr = await request('/ai/chat', {
      method: 'POST',
      headers: { Authorization: `Bearer ${clientToken}` },
      body: { message: 'Combien ai-je dépensé cette semaine ?', language: 'fr' }
    });
    assert(aiChatFr.status === 200 && aiChatFr.data.success, 'POST /api/ai/chat (Français) renvoie un statut 200');
    assert(aiChatFr.data.data.response.includes('FCFA'), 'La réponse IA contient les montants réels en FCFA');
    assert(aiChatFr.data.data.intent === 'EXPENSE_ANALYSIS', 'Classification d\'intention EXPENSE_ANALYSIS correcte');

    // 1c. Chat en Wolof
    const aiChatWo = await request('/ai/chat', {
      method: 'POST',
      headers: { Authorization: `Bearer ${clientToken}` },
      body: { message: 'Ñaata laa mën a denc ci weer wi ?', language: 'wo' }
    });
    assert(aiChatWo.status === 200 && aiChatWo.data.success, 'POST /api/ai/chat (Wolof) renvoie un statut 200');
    assert(aiChatWo.data.data.response.length > 10, 'Réponse IA générée en Wolof naturel');

    // 1d. Historique des conversations
    const aiHistory = await request('/ai/conversations', {
      headers: { Authorization: `Bearer ${clientToken}` }
    });
    assert(aiHistory.status === 200 && Array.isArray(aiHistory.data.data), 'GET /api/ai/conversations renvoie l\'historique');
    assert(aiHistory.data.data.length >= 2, 'Historique contient au moins 2 messages échangés');
    console.log('');

    // ========================================================================
    // 2. TESTS MONEYLINK SHIELD
    // ========================================================================
    console.log('--- 2. 🛡️ TESTS MONEYLINK SHIELD ---');

    // 2a. Analyse de risque transaction normale
    const shieldNormal = await request('/security/analyze', {
      method: 'POST',
      headers: { Authorization: `Bearer ${clientToken}` },
      body: { amount: 15000, payment_method: 'WAVE', recipient_id: 'b0000000-0000-0000-0000-000000000002' }
    });
    assert(shieldNormal.status === 200 && shieldNormal.data.success, 'POST /api/security/analyze renvoie 200');
    assert(shieldNormal.data.data.riskLevel === 'LOW', 'Niveau de risque LOW pour montant standard');
    assert(!shieldNormal.data.data.requiresConfirmation, 'Pas de blocage requis pour risque faible');
    assert(Array.isArray(shieldNormal.data.data.factors), 'Facteurs de risque explicables structurés renvoyés');

    // 2b. Analyse de risque transaction à montant très élevé (> 250 000 FCFA)
    const shieldHigh = await request('/security/analyze', {
      method: 'POST',
      headers: { Authorization: `Bearer ${clientToken}` },
      body: { amount: 450000, payment_method: 'WAVE', recipient_id: 'new_recipient_999' }
    });
    assert(shieldHigh.status === 200 && shieldHigh.data.success, 'Analyse transaction à montant très élevé');
    assert(shieldHigh.data.data.riskScore >= 70, `Score de risque élevé calculé (${shieldHigh.data.data.riskScore}/100)`);
    assert(shieldHigh.data.data.requiresConfirmation === true, 'Confirmation explicite demandée');
    assert(shieldHigh.data.data.explanationSummary.includes('élevé'), 'Synthèse explicative claire présente');

    const highAlertId = shieldHigh.data.data.alertId;

    // 2c. Consultation des alertes
    const shieldAlerts = await request('/security/alerts', {
      headers: { Authorization: `Bearer ${clientToken}` }
    });
    assert(shieldAlerts.status === 200 && Array.isArray(shieldAlerts.data.data), 'GET /api/security/alerts renvoie la liste');

    // 2d. Confirmation explicite d'une alerte
    if (highAlertId) {
      const confirmRes = await request('/security/confirm', {
        method: 'POST',
        headers: { Authorization: `Bearer ${clientToken}` },
        body: { alert_id: highAlertId, decision: 'CONFIRMED' }
      });
      assert(confirmRes.status === 200 && confirmRes.data.success, 'POST /api/security/confirm valide la décision de l\'utilisateur');
    }
    console.log('');

    // ========================================================================
    // 3. TESTS MONEYLINK BUSINESS
    // ========================================================================
    console.log('--- 3. 📊 TESTS MONEYLINK BUSINESS ---');

    // 3a. Dashboard Marchand
    const bizDashboard = await request('/business/dashboard', {
      headers: { Authorization: `Bearer ${merchantToken}` }
    });
    assert(bizDashboard.status === 200 && bizDashboard.data.success, 'GET /api/business/dashboard renvoie 200 pour un marchand');
    assert(bizDashboard.data.data.revenue && typeof bizDashboard.data.data.revenue.month === 'number', 'Calcul du CA mensuel réel');
    assert(bizDashboard.data.data.performance && typeof bizDashboard.data.data.performance.avgOrderValue === 'number', 'Calcul du Panier Moyen');
    assert(Array.isArray(bizDashboard.data.data.aiAnalysis), 'Analyse intelligente IA marchande générée');

    // 3b. Profil Business (GET & PUT)
    const bizProfile = await request('/business/profile', {
      headers: { Authorization: `Bearer ${merchantToken}` }
    });
    assert(bizProfile.status === 200 && bizProfile.data.success, 'GET /api/business/profile');

    const updateBiz = await request('/business/profile', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${merchantToken}` },
      body: { monthly_target: 2500000, tax_id: 'NINEA-2026-DKR' }
    });
    assert(updateBiz.status === 200 && updateBiz.data.success, 'PUT /api/business/profile met à jour l\'objectif mensuel');
    assert(updateBiz.data.data.monthly_target == 2500000, 'Nouvel objectif de 2 500 000 FCFA enregistré');

    // 3c. Contrôle de rôle : un client ne peut pas accéder à l'espace Business marchand
    const clientBizCheck = await request('/business/dashboard', {
      headers: { Authorization: `Bearer ${clientToken}` }
    });
    assert(clientBizCheck.status === 403, 'Accès refusé (403) à l\'espace Business pour un compte CLIENT');
    console.log('');

    // ========================================================================
    // 4. TESTS MONEYLINK FACTURES & REÇUS
    // ========================================================================
    console.log('--- 4. 🧾 TESTS MONEYLINK FACTURES & REÇUS ---');

    // 4a. Création d'une facture marchande avec calcul serveur
    const createInv = await request('/invoices', {
      method: 'POST',
      headers: { Authorization: `Bearer ${merchantToken}` },
      body: {
        client_name: 'Mamadou Ndiaye',
        client_phone: '+221771234567',
        client_email: 'mamadou@ndiaye.sn',
        client_address: 'Plateau, Dakar',
        discount_amount: 5000,
        due_date: '2026-09-15',
        notes: 'Matériel de sport compétition',
        items: [
          { description: 'Ballon de football officiel', quantity: 2, unit_price: 15000 },
          { description: 'Chaussettes de sport pro', quantity: 4, unit_price: 2500 }
        ]
      }
    });

    assert(createInv.status === 201 && createInv.data.success, 'POST /api/invoices crée la facture (201)');
    const inv = createInv.data.data;
    assert(inv.invoice_number.startsWith('ML-2026-'), `Numérotation séquentielle conforme (${inv.invoice_number})`);
    assert(inv.subtotal === 40000, `Sous-total vérifié côté serveur (40 000 FCFA, obtenu: ${inv.subtotal})`);
    assert(inv.total_amount === 35000, `Total net vérifié après remise (35 000 FCFA, obtenu: ${inv.total_amount})`);
    assert(inv.share_token && inv.share_token.startsWith('tok_inv_'), 'Token sécurisé de partage généré');
    createdInvoiceId = inv.id;
    createdInvoiceShareToken = inv.share_token;

    // 4b. Envoi de facture (génération du lien WhatsApp)
    const sendInv = await request(`/invoices/${createdInvoiceId}/send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${merchantToken}` }
    });
    assert(sendInv.status === 200 && sendInv.data.success, 'POST /api/invoices/:id/send marque ENVOYÉE');
    assert(sendInv.data.data.whatsappLink.includes('wa.me'), 'Lien de partage direct WhatsApp préformaté');

    // 4c. Consultation publique sécurisée via token
    const publicInv = await request(`/invoices/public/${createdInvoiceShareToken}`);
    assert(publicInv.status === 200 && publicInv.data.success, 'GET /api/invoices/public/:token accessible sans mot de passe');
    assert(publicInv.data.data.total_amount == 35000, 'Montant de facture vérifiable publiquement');

    // 4d. Règlement de la facture et émission du reçu numérique officiel
    const payInv = await request(`/invoices/${createdInvoiceId}/pay`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${clientToken}` },
      body: { payment_method: 'WAVE' }
    });
    assert(payInv.status === 200 && payInv.data.success, 'POST /api/invoices/:id/pay valide le règlement');
    assert(payInv.data.data.invoice.status === 'PAYÉE', 'Statut facture mis à jour : PAYÉE');
    assert(payInv.data.data.receipt.receipt_number.startsWith('REC-2026-'), `Numéro de reçu officiel généré (${payInv.data.data.receipt.receipt_number})`);
    generatedReceiptNumber = payInv.data.data.receipt.receipt_number;

    // 4e. Consultation du reçu officiel
    const getRec = await request(`/receipts/${generatedReceiptNumber}`);
    assert(getRec.status === 200 && getRec.data.success, `GET /api/receipts/${generatedReceiptNumber} renvoie le reçu certifié`);
    assert(getRec.data.data.amount == 35000, 'Montant du reçu conforme (35 000 FCFA)');
    console.log('');

    // ========================================================================
    // 5. TESTS MONEYLINK LOCAL (FRANÇAIS + WOLOF)
    // ========================================================================
    console.log('--- 5. 🇸🇳 TESTS MONEYLINK LOCAL (FRANÇAIS + WOLOF) ---');
    
    // Test des dictionnaires
    const { translations } = await import('../../site/i18n.js');
    assert(translations.fr && translations.wo, 'Dictionnaires FR et WO présents et chargés');
    assert(translations.wo.hero_title.includes('wóor'), 'Terminologie wolof authentique pour le tiers de confiance');
    assert(translations.wo.ai_title.includes('Ndaje') || translations.wo.ai_title.includes('MoneyLink'), 'Libellé Wolof de l\'assistant IA conforme');
    assert(translations.wo.shield_title.includes('MoneyLink Shield'), 'Nom de marque préservé');
    assert(translations.wo.invoice_title.includes('Faktir'), 'Terminologie wolof pour les factures (Faktir & Resi)');
    assert(translations.wo.biz_tab_analytics.includes('Tableau de Bord') || translations.wo.biz_tab_analytics.includes('Saytu'), 'Tableau de bord Business en Wolof');
    console.log('');

    // ========================================================================
    // 6. TEST DE NON-RÉGRESSION DES FONCTIONNALITÉS EXISTANTES
    // ========================================================================
    console.log('--- 6. 🔒 TESTS DE NON-RÉGRESSION API & CATALOGUE ---');
    const health = await request('/health');
    assert(health.status === 200 && health.data.status === 'UP', 'GET /api/health opérationnel');
    assert(health.data.features.ai_assistant === true, 'Feature flag IA actif');
    assert(health.data.features.shield_security === true, 'Feature flag Shield actif');

    const cat = await request('/products');
    assert(cat.status === 200 && Array.isArray(cat.data.data), 'Catalogue public opérationnel');

    const orders = await request('/orders', {
      headers: { Authorization: `Bearer ${clientToken}` }
    });
    assert(orders.status === 200 && Array.isArray(orders.data.data), 'Commandes client opérationnelles');
    console.log('');

    console.log('================================================================');
    console.log(`📊 RÉSULTATS DES TESTS : ${passed} RÉUSSIS, ${failed} ÉCHECS`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Erreur inattendue pendant les tests :', err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
  }
}

runTests();
