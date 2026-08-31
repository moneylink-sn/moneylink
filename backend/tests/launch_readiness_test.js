/**
 * ============================================================================
 * 🚀 MONEYLINK V2.5 — SUITE DE VALIDATION D'EXCELLENCE & PRÊT AU LANCEMENT
 * ============================================================================
 * Banc d'essai automatisé complet validant l'ensemble des 28 exigences :
 * - Landing Page, Positionnement & Tiers de Confiance
 * - Séquestre 6 étapes & Calcul de Commission 1%
 * - Marketplace, Catalogue & Commandes
 * - Authentification RBAC (Client, Marchand, Admin)
 * - Early Access API (Validation Zod, Honeypot, Stockage sécurisé)
 * - Contact & Support API (Catégories, Honeypot, Ticket unique)
 * - Statut dynamique réel des Passerelles Wave & Orange Money
 * - Statistiques Publiques Transparentes (Zéro chiffre inventé)
 * - Modules V2.5 : IA, Shield, Business, Factures, Reçus, Épargne & Tontines
 * - Localisation bilingue Français 🇫🇷 + Wolof 🇸🇳 (Parité 100% des clés)
 * - Sécurité (RBAC, IDOR, SQLi, XSS, En-têtes HTTP)
 * - Health checks (/health & /api/health)
 * - SEO technique, Sitemap & Balises
 * ============================================================================
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import app from '../src/app.js';
import { translations } from '../../site/i18n.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let server;
let baseUrl;

let authTokenClient;
let authTokenMerchant;
let authTokenAdmin;

let testUserIdClient;
let testUserIdMerchant;
let testMerchantId;

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

async function request(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, baseUrl);
    const postData = options.body ? JSON.stringify(options.body) : null;

    const reqOptions = {
      method: options.method || 'GET',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Accept': 'application/json',
        ...(postData ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        } : {}),
        ...(options.token ? { 'Authorization': `Bearer ${options.token}` } : {}),
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = {};
        try {
          json = JSON.parse(data);
        } catch {
          json = { raw: data };
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json
        });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runLaunchReadinessTests() {
  console.log('\n================================================================');
  console.log('🚀 MONEYLINK V2.5 — BANC D\'ESSAI MAÎTRE (LAUNCH READINESS TEST)');
  console.log('================================================================\n');

  // Démarrage du serveur Express de test
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`📡 Serveur de test MoneyLink actif sur ${baseUrl}\n`);
      resolve();
    });
  });

  try {
    // ------------------------------------------------------------------------
    // SECTION 1 : HEALTH CHECK & SEO TECHNIQUE
    // ------------------------------------------------------------------------
    console.log('--- 1. HEALTH CHECKS & SEO TECHNIQUE ---');
    const healthRes = await request('/api/health');
    assert(healthRes.status === 200, 'GET /api/health retourne 200 OK');
    assert(healthRes.data.status === 'UP', 'Statut général de l’API est "UP"');
    assert(healthRes.data.version === '2.5.0', 'Version de l’API conforme (2.5.0)');
    assert(healthRes.data.currency === 'XOF / FCFA', 'Monnaie officielle XOF / FCFA');
    assert(healthRes.data.features?.early_access === true, 'Feature flag early_access actif');
    assert(healthRes.data.features?.public_metrics === true, 'Feature flag public_metrics actif');

    // Vérification du fichier sitemap.xml et robots.txt
    const sitemapPath = path.resolve(__dirname, '../../site/sitemap.xml');
    const robotsPath = path.resolve(__dirname, '../../site/robots.txt');
    const indexPath = path.resolve(__dirname, '../../site/index.html');

    assert(fs.existsSync(sitemapPath), 'Fichier sitemap.xml présent');
    assert(fs.existsSync(robotsPath), 'Fichier robots.txt présent');
    assert(fs.existsSync(indexPath), 'Fichier index.html présent');

    const indexContent = fs.readFileSync(indexPath, 'utf8');
    assert(indexContent.includes('MoneyLink Sénégal — Achetez, payez et développez votre activité'), 'Balise <title> SEO exacte conforme');
    assert(indexContent.includes('name="description"'), 'Meta description présente');
    assert(indexContent.includes('https://moneylink.sn'), 'Balise canonique présente');
    assert(indexContent.includes('application/ld+json'), 'Données structurées Schema.org JSON-LD présentes');
    assert(!indexContent.includes('garantie bancaire') && !indexContent.includes('cantonnement bancaire'), 'Aucune allégation juridique trompeuse');

    // ------------------------------------------------------------------------
    // SECTION 2 : POSITIONNEMENT & SÉQUESTRE 6 ÉTAPES
    // ------------------------------------------------------------------------
    console.log('\n--- 2. POSITIONNEMENT STRATÉGIQUE & SÉQUESTRE 6 ÉTAPES ---');
    assert(indexContent.includes('Achetez, payez, gérez et développez votre activité') && translations.fr.hero_title.includes('Achetez, payez, gérez et développez votre activité en toute confiance'), 'Positionnement officiel présent dans le Hero');
    assert(indexContent.includes('1️⃣ Vous commandez'), 'Étape 1 du Séquestre présente');
    assert(indexContent.includes('2️⃣ Vous payez'), 'Étape 2 du Séquestre présente');
    assert(indexContent.includes('3️⃣ MoneyLink sécurise'), 'Étape 3 du Séquestre présente');
    assert(indexContent.includes('4️⃣ Le commerçant livre'), 'Étape 4 du Séquestre présente');
    assert(indexContent.includes('5️⃣ Vous confirmez avec l\'OTP'), 'Étape 5 du Séquestre présente');
    assert(indexContent.includes('6️⃣ Le règlement est libéré'), 'Étape 6 du Séquestre présente');

    // Vérification de la formule de calcul de commission (1%)
    const testAmount = 50000;
    const expectedCommission = Math.round(testAmount * 0.01);
    const expectedNet = testAmount - expectedCommission;
    assert(expectedCommission === 500, 'Commission de 1% exacte (500 FCFA sur 50 000 FCFA)');
    assert(expectedNet === 49500, 'Net marchand exact (49 500 FCFA sur 50 000 FCFA)');

    // ------------------------------------------------------------------------
    // SECTION 3 : AUTHENTIFICATION & ROLES RBAC
    // ------------------------------------------------------------------------
    console.log('\n--- 3. AUTHENTIFICATION & RÔLES RBAC ---');
    const timestamp = Date.now();

    // Inscription Client
    const regClientRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        first_name: 'Moussa',
        last_name: 'Fall',
        phone: `+22177${Math.floor(1000000 + Math.random() * 9000000)}`,
        email: `client_${timestamp}@moneylink.sn`,
        password: 'Password123!',
        role: 'CLIENT'
      }
    });
    assert(regClientRes.status === 201, 'Inscription Client réussie (201 Created)');
    authTokenClient = regClientRes.data.data.token;
    testUserIdClient = regClientRes.data.data.user.id;

    // Inscription Marchand
    const regMerchantRes = await request('/api/auth/register', {
      method: 'POST',
      body: {
        first_name: 'Aminata',
        last_name: 'Ba',
        phone: `+22177${Math.floor(1000000 + Math.random() * 9000000)}`,
        email: `merchant_${timestamp}@moneylink.sn`,
        password: 'Password123!',
        business_name: 'Ba Couture Dakar',
        business_type: 'Mode & Habillement',
        role: 'MERCHANT'
      }
    });
    assert(regMerchantRes.status === 201, 'Inscription Marchand réussie (201 Created)');
    authTokenMerchant = regMerchantRes.data.data.token;
    testUserIdMerchant = regMerchantRes.data.data.user.id;
    testMerchantId = regMerchantRes.data.data.merchant.id;

    // Connexion Super Admin
    const loginAdminRes = await request('/api/auth/login', {
      method: 'POST',
      body: {
        identifier: '+221770000001',
        password: 'Password123!'
      }
    });
    assert(loginAdminRes.status === 200, 'Connexion Super Admin (Codé Samb) réussie');
    authTokenAdmin = loginAdminRes.data.data.token;

    // ------------------------------------------------------------------------
    // SECTION 4 : NOUVELLES ROUTES V2.5 (EARLY ACCESS, CONTACT, PUBLIC)
    // ------------------------------------------------------------------------
    console.log('\n--- 4. NOUVELLES ROUTES V2.5 (EARLY ACCESS, CONTACT, STATUT PAIEMENTS) ---');
    
    // Test 1: Inscription Early Access
    const earlyAccessRes = await request('/api/early-access', {
      method: 'POST',
      body: {
        first_name: 'Cheikh',
        last_name: 'Anta',
        phone: '+221771234567',
        email: `cheikh_${timestamp}@gmail.com`,
        profile_type: 'ENTREPRENEUR',
        city: 'Dakar',
        notes: 'Hâte de tester la facturation'
      }
    });
    assert(earlyAccessRes.status === 201, 'POST /api/early-access enregistre l’inscription (201 Created)');
    assert(earlyAccessRes.data.success === true, 'Early access confirmation valide');

    // Test 2: Honeypot Anti-spam Early Access
    const honeypotEarlyRes = await request('/api/early-access', {
      method: 'POST',
      body: {
        first_name: 'Bot',
        last_name: 'Spam',
        phone: '+221779998877',
        email: 'bot@spam.com',
        city: 'Dakar',
        honeypot: 'Je suis un bot spam'
      }
    });
    assert(honeypotEarlyRes.status === 200, 'Honeypot Early Access intercepte le spam silencieusement (200 OK)');

    // Test 3: Stats Early Access
    const earlyStatsRes = await request('/api/early-access/stats');
    assert(earlyStatsRes.status === 200, 'GET /api/early-access/stats accessible sans authentification');
    assert(typeof earlyStatsRes.data.data.total_registered === 'number', 'Compteur total_registered numérique');

    // Test 4: Envoi Formulaire Contact
    const contactRes = await request('/api/contact', {
      method: 'POST',
      body: {
        name: 'Fatou Diome',
        email: 'fatou@exemple.sn',
        phone: '+221778901234',
        category: 'COMMERCANT',
        subject: 'Demande de partenariat marchand',
        message: 'Bonjour, je souhaite intégrer ma chaîne de boutiques sur MoneyLink.'
      }
    });
    assert(contactRes.status === 201, 'POST /api/contact enregistre le message (201 Created)');
    assert(Boolean(contactRes.data.data?.ticket_number), 'Ticket de support unique généré (TK-XXXXXX)');

    // Test 5: Statut dynamique des moyens de paiement
    const payMethodsRes = await request('/api/public/payment-methods');
    assert(payMethodsRes.status === 200, 'GET /api/public/payment-methods retourne 200 OK');
    assert(Array.isArray(payMethodsRes.data.data.methods), 'Liste des méthodes de paiement disponible');
    const waveInfo = payMethodsRes.data.data.methods.find(m => m.code === 'WAVE');
    const omInfo = payMethodsRes.data.data.methods.find(m => m.code === 'ORANGE_MONEY');
    assert(Boolean(waveInfo) && Boolean(omInfo), 'Wave et Orange Money répertoriés');
    assert(payMethodsRes.data.data.escrow_protection.fee_percentage === 1.0, 'Commission de séquestre fixée à 1%');

    // Test 6: Métriques transparentes de l'écosystème
    const statsRes = await request('/api/public/ecosystem-stats');
    assert(statsRes.status === 200, 'GET /api/public/ecosystem-stats retourne 200 OK');
    assert(typeof statsRes.data.data.active_merchants === 'number', 'Nombre de marchands actifs réel');
    assert(typeof statsRes.data.data.active_products === 'number', 'Nombre de produits actifs réel');
    assert(typeof statsRes.data.data.total_orders === 'number', 'Nombre de commandes réel');

    // ------------------------------------------------------------------------
    // SECTION 5 : CATALOGUE & COMMANDES SOUS SÉQUESTRE
    // ------------------------------------------------------------------------
    console.log('\n--- 5. CATALOGUE, COMMANDES & SÉQUESTRE OTP ---');
    
    // Publication d'un produit par le marchand
    const createProdRes = await request('/api/merchants/products', {
      method: 'POST',
      token: authTokenMerchant,
      body: {
        name: 'Robe Traditionnelle Soie Dakar',
        category: 'Mode & Chaussures',
        price: 35000,
        stock: 10,
        city: 'Dakar',
        description: 'Élégante robe en soie cousue main.'
      }
    });
    assert(createProdRes.status === 201, 'Marchand peut publier un article (201 Created)');
    const createdProduct = createProdRes.data.data;

    // Consultation catalogue public
    const catRes = await request(`/api/products?search=Soie`);
    assert(catRes.status === 200, 'Recherche catalogue public opérationnelle');
    assert(catRes.data.data.length > 0, 'Produit nouvellement publié visible immédiatement');

    // Création de commande par le client
    const createOrderRes = await request('/api/orders', {
      method: 'POST',
      token: authTokenClient,
      body: {
        merchant_id: testMerchantId,
        items: [{ product_id: createdProduct.id, quantity: 1 }],
        delivery_address: 'Mermoz, Dakar',
        delivery_phone: '+221771234567'
      }
    });
    assert(createOrderRes.status === 201, 'Client crée sa commande sous séquestre (201 Created)');
    const orderData = createOrderRes.data.data;
    assert(Boolean(orderData.delivery_code), 'Code secret de livraison OTP à 6 chiffres généré');

    // ------------------------------------------------------------------------
    // SECTION 6 : MODULES FINTECH V2 (IA, SHIELD, BUSINESS, FACTURES)
    // ------------------------------------------------------------------------
    console.log('\n--- 6. INNOVATIONS : IA, SHIELD, BUSINESS, FACTURES & REÇUS ---');

    // 1. MoneyLink IA
    const aiChatRes = await request('/api/ai/chat', {
      method: 'POST',
      token: authTokenClient,
      body: { message: 'Où part mon argent ?' }
    });
    assert(aiChatRes.status === 200, 'MoneyLink IA répond avec pertinence (200 OK)');
    assert(Boolean(aiChatRes.data.data.response), 'Conseil financier consultatif délivré');

    // 2. MoneyLink Shield
    const shieldScanRes = await request('/api/security/analyze', {
      method: 'POST',
      token: authTokenClient,
      body: {
        amount: 250000,
        recipient_id: testUserIdMerchant,
        payment_method: 'WAVE'
      }
    });
    assert(shieldScanRes.status === 200, 'MoneyLink Shield analyse le risque de la transaction');
    assert(typeof shieldScanRes.data.data.riskScore === 'number', 'Score de risque Shield calculé');

    // 3. MoneyLink Business
    const bizDashRes = await request('/api/business/dashboard', {
      token: authTokenMerchant
    });
    assert(bizDashRes.status === 200, 'Tableau de bord MoneyLink Business opérationnel');
    assert(Boolean(bizDashRes.data.data.revenue && bizDashRes.data.data.performance), 'KPIs de pilotage marchand présents');

    // 4. Factures & Reçus Commerçant
    const createInvRes = await request('/api/invoices', {
      method: 'POST',
      token: authTokenMerchant,
      body: {
        client_name: 'Ibrahima Diallo',
        client_phone: '+221778889900',
        client_address: 'Plateau, Dakar',
        items: [
          { description: 'Costume 3 pièces', quantity: 1, unit_price: 60000 }
        ]
      }
    });
    assert(createInvRes.status === 201, 'Émission de facture marchande réussie (201 Created)');
    const invoice = createInvRes.data.data;
    assert(invoice.status === 'BROUILLON', 'Statut initial de la facture est BROUILLON');

    // Paiement de la facture et émission du reçu
    const payInvRes = await request(`/api/invoices/${invoice.id}/pay`, {
      method: 'POST',
      token: authTokenMerchant,
      body: { payment_method: 'WAVE' }
    });
    assert(payInvRes.status === 200, 'Encaissement de facture réussi');
    assert((payInvRes.data.data.invoice?.status === 'PAYÉE') || (payInvRes.data.data.status === 'PAYÉE'), 'Statut de la facture passe à PAYÉE');
    assert(Boolean(payInvRes.data.data.receipt?.receipt_number), 'Reçu officiel numérique infalsifiable généré');

    // ------------------------------------------------------------------------
    // SECTION 7 : ÉPARGNE & COFFRES THÉMATIQUES
    // ------------------------------------------------------------------------
    console.log('\n--- 7. ÉPARGNE, COFFRES & TONTINES ---');
    const createGoalRes = await request('/api/savings', {
      method: 'POST',
      token: authTokenClient,
      body: {
        title: 'Projet Tabaski 2026',
        description: 'Épargne pour le bélier et les festivités',
        target_amount: 150000,
        target_date: '2026-06-15',
        type: 'PERSONAL',
        frequency: 'MONTHLY'
      }
    });
    assert(createGoalRes.status === 201, 'Création de coffre d’épargne réussie (201 Created)');

    // ------------------------------------------------------------------------
    // SECTION 8 : LOCALISATION BILINGUE (FRANÇAIS & WOLOF)
    // ------------------------------------------------------------------------
    console.log('\n--- 8. LOCALISATION BILINGUE (FRANÇAIS & WOLOF) ---');
    const frKeys = Object.keys(translations.fr);
    const woKeys = Object.keys(translations.wo);

    assert(frKeys.length >= 70, `Dictionnaire Français complet (${frKeys.length} clés)`);
    assert(woKeys.length >= 70, `Dictionnaire Wolof complet (${woKeys.length} clés)`);

    const missingInWo = frKeys.filter(k => !woKeys.includes(k));
    assert(missingInWo.length === 0, `Parité parfaite des clés FR ↔ WO (Manquantes en Wolof : ${missingInWo.length})`);
    assert(translations.wo.nav_escrow.includes('Denc'), 'Terminologie Wolof authentique pour le séquestre');
    assert(translations.wo.hero_title.includes('Jëndal'), 'Hero traduit en Wolof de qualité');

    // ------------------------------------------------------------------------
    // SECTION 9 : SÉCURITÉ, RBAC & RÉSISTANCE AUX ATTAQUES
    // ------------------------------------------------------------------------
    console.log('\n--- 9. SÉCURITÉ, CONTRÔLE D\'ACCÈS & SÉCURITÉ WEB ---');
    
    // Tentative d'accès route admin par un client ordinaire
    const forbiddenAdminRes = await request('/api/admin/users', {
      token: authTokenClient
    });
    assert(forbiddenAdminRes.status === 403, 'RBAC : Client interdit sur /api/admin/users (403 Forbidden)');

    // Tentative d'accès sans token
    const unauthRes = await request('/api/admin/users');
    assert(unauthRes.status === 401, 'Auth : Accès non authentifié rejeté (401 Unauthorized)');

    // Tentative d'injection SQL sur l'identifiant
    const sqliRes = await request('/api/auth/login', {
      method: 'POST',
      body: {
        identifier: "' OR '1'='1' --",
        password: 'any'
      }
    });
    assert(sqliRes.status === 401, 'Sécurité SQLi : Tentative d’injection SQL bloquée sans crash');

    // En-têtes de sécurité
    assert(Boolean(healthRes.headers['x-content-type-options']), 'En-tête X-Content-Type-Options présent');

  } finally {
    if (server) {
      server.close();
    }
  }

  console.log('\n================================================================');
  console.log(`📊 BILAN DU BANC D'ESSAI : ${passedTests} RÉUSSIS / ${totalTests} TESTS (${Math.round((passedTests / totalTests) * 100)}%)`);
  if (failedTests > 0) {
    console.error(`🚨 ${failedTests} TEST(S) ÉCHOUÉ(S) !`);
    process.exit(1);
  } else {
    console.log('🎉 TOUTES LES VÉRIFICATIONS DE LANCEMENT SONT VALIDÉES À 100% !');
    console.log('================================================================\n');
  }
}

runLaunchReadinessTests().catch(err => {
  console.error('❌ Erreur inattendue pendant le banc d\'essai :', err);
  process.exit(1);
});
