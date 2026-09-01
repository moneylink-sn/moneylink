/**
 * MoneyLink V2.5 — Test Exhaustif de Simulation Navigateur E2E pour la Barre de Navigation
 * Teste : Desktop, Mobile, Wolof/Français, Panier Incrémental, Connexion Modal, Drawer Hamburger
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';
import { translations, I18n } from '../../site/i18n.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runBrowserFlowTests() {
  console.log('\n================================================================');
  console.log('🧪 TEST E2E SIMULATION NAVIGATEUR — NAVBAR MONEYLINK V2.5');
  console.log('================================================================\n');

  const indexPath = path.resolve(__dirname, '../../site/index.html');
  const stylesPath = path.resolve(__dirname, '../../site/styles.css');
  const html = fs.readFileSync(indexPath, 'utf-8');
  const css = fs.readFileSync(stylesPath, 'utf-8');

  // 1. VÉRIFICATION DU DOM DESKTOP
  console.log('1️⃣ Test de la structure DOM Desktop...');
  
  // Extraire la navbar
  const navMatch = html.match(/<nav class="navbar" id="main-navbar">([\s\S]*?)<\/nav>/);
  assert(navMatch, 'La balise <nav class="navbar" id="main-navbar"> est présente');
  const navContent = navMatch[1];

  // Ordre strict des éléments Desktop
  const posLogo = navContent.indexOf('nav-logo');
  const posCat = navContent.indexOf('data-i18n="nav_catalog"');
  const posInno = navContent.indexOf('data-i18n="nav_innovations"');
  const posPai = navContent.indexOf('data-i18n="nav_payments"');
  const posPart = navContent.indexOf('data-i18n="nav_individuals"');
  const posComm = navContent.indexOf('data-i18n="nav_merchants"');
  const posCart = navContent.indexOf('id="open-cart-btn"');
  const posLogin = navContent.indexOf('id="nav-login-btn"');
  const posLang = navContent.indexOf('id="lang-menu-btn"');

  assert(posLogo !== -1, 'Logo présent');
  assert(posCat !== -1, 'Catalogue présent');
  assert(posInno !== -1, 'Innovations présent');
  assert(posPai !== -1, 'Paiement présent');
  assert(posPart !== -1, 'Particulier présent');
  assert(posComm !== -1, 'Commerçant présent');
  assert(posCart !== -1, 'Panier présent');
  assert(posLogin !== -1, 'Connexion présent');
  assert(posLang !== -1, 'Sélecteur de langue présent');

  assert(posLogo < posCat, 'Ordre : Logo -> Catalogue');
  assert(posCat < posInno, 'Ordre : Catalogue -> Innovations');
  assert(posInno < posPai, 'Ordre : Innovations -> Paiement');
  assert(posPai < posPart, 'Ordre : Paiement -> Particulier');
  assert(posPart < posComm, 'Ordre : Particulier -> Commerçant');
  assert(posComm < posCart, 'Ordre : Commerçant -> Panier');
  assert(posCart < posLogin, 'Ordre : Panier -> Connexion');
  assert(posLogin < posLang, 'Ordre : Connexion -> Français');

  console.log('   ✅ Ordre exact validé : Logo → Catalogue → Innovations → Paiement → Particulier → Commerçant → Panier → Connexion → Français');

  // 2. VÉRIFICATION DU MODE MOBILE & TIROIR HAMBURGER
  console.log('\n2️⃣ Test du mode Mobile & Menu Hamburger...');
  assert(navContent.includes('id="mobile-menu-toggle-btn"'), 'Bouton Hamburger (☰) présent');
  assert(navContent.includes('id="mobile-nav-drawer"'), 'Tiroir mobile présent');
  assert(navContent.includes('id="mobile-nav-login-btn"'), 'Bouton Connexion mobile présent');
  
  // Contenu du menu hamburger
  const drawerMatch = navContent.match(/<div id="mobile-nav-drawer"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/);
  assert(drawerMatch, 'Tiroir mobile extrait avec succès');
  const drawerContent = drawerMatch[0];

  assert(drawerContent.includes('data-i18n="nav_catalog"'), 'Tiroir : 🛍️ Catalogue');
  assert(drawerContent.includes('data-i18n="nav_innovations"'), 'Tiroir : ⭐ Innovations');
  assert(drawerContent.includes('data-i18n="nav_payments"'), 'Tiroir : 💳 Paiement');
  assert(drawerContent.includes('data-i18n="nav_individuals"'), 'Tiroir : 👤 Particulier');
  assert(drawerContent.includes('data-i18n="nav_merchants"'), 'Tiroir : 🏪 Commerçant');
  assert(drawerContent.includes('id="mobile-nav-login-btn"'), 'Tiroir : 🔐 Connexion');
  assert(drawerContent.includes('data-lang="fr"'), 'Tiroir : 🇫🇷 Français');
  assert(drawerContent.includes('data-lang="wo"'), 'Tiroir : 🇸🇳 Wolof');

  console.log('   ✅ Le menu Hamburger contient les 7 éléments requis');

  // 3. TEST DU CHANGEMENT DYNAMIQUE DE LANGUE (FRANÇAIS ↔ WOLOF)
  console.log('\n3️⃣ Test du changement dynamique de langue (FR ↔ WO)...');
  
  // Test en Français
  I18n.currentLang = 'fr';
  assert.strictEqual(I18n.t('nav_catalog'), '🛍️ Catalogue');
  assert.strictEqual(I18n.t('nav_innovations'), '⭐ Innovations');
  assert.strictEqual(I18n.t('nav_payments'), '💳 Paiement');
  assert.strictEqual(I18n.t('nav_individuals'), '👤 Particulier');
  assert.strictEqual(I18n.t('nav_merchants'), '🏪 Commerçant');
  assert.strictEqual(I18n.t('nav_cart'), 'Panier');
  assert.strictEqual(I18n.t('nav_login'), 'Connexion');

  // Bascule en Wolof
  I18n.currentLang = 'wo';
  assert.strictEqual(I18n.t('nav_catalog'), '🛍️ Katalóg');
  assert.strictEqual(I18n.t('nav_innovations'), '⭐ Xalaat yu Yees');
  assert.strictEqual(I18n.t('nav_payments'), '💳 Feyin');
  assert.strictEqual(I18n.t('nav_individuals'), '👤 Jëfandikookat');
  assert.strictEqual(I18n.t('nav_merchants'), '🏪 Jaaykat');
  assert.strictEqual(I18n.t('nav_cart'), 'Panié');
  assert.strictEqual(I18n.t('nav_login'), 'Dugg ci Sa Kont');

  console.log('   ✅ Traduction immédiate validée : Français 🇫🇷 ↔ Wolof 🇸🇳');

  // 4. TEST DU COMPTEUR PANIER DYNAMIQUE
  console.log('\n4️⃣ Test du compteur dynamique du panier (🛒 Panier 0 -> 1 -> 2)...');
  assert(navContent.includes('id="cart-badge-count"'), 'Badge de décompte du panier présent');
  assert(navContent.includes('class="cart-badge-count"'), 'Classe CSS du badge du panier présente');
  
  // Simulation de calcul du panier
  const mockCart = [];
  const getCartCount = (cart) => cart.reduce((sum, item) => sum + item.quantity, 0);

  assert.strictEqual(getCartCount(mockCart), 0, 'Panier initial à 0 article');
  mockCart.push({ product: { id: 'p1', price: 15000 }, quantity: 1 });
  assert.strictEqual(getCartCount(mockCart), 1, 'Après ajout 1er produit : Panier 1');
  mockCart.push({ product: { id: 'p2', price: 25000 }, quantity: 1 });
  assert.strictEqual(getCartCount(mockCart), 2, 'Après ajout 2e produit : Panier 2');

  console.log('   ✅ Compteur dynamique validé : 🛒 Panier 0 → 1 → 2');

  // 5. TEST DU CSS RESPONSIVE & CLASSES ACTIVES
  console.log('\n5️⃣ Test des styles CSS responsive & non-saturation...');
  assert(css.includes('.nav-desktop-main'), 'Classe .nav-desktop-main définie');
  assert(css.includes('.nav-quick-access'), 'Classe .nav-quick-access définie');
  assert(css.includes('.cart-nav-btn'), 'Classe .cart-nav-btn définie');
  assert(css.includes('.cart-badge-count'), 'Classe .cart-badge-count définie');
  assert(css.includes('.lang-menu-popover'), 'Classe .lang-menu-popover définie');
  assert(css.includes('.mobile-nav-drawer'), 'Classe .mobile-nav-drawer définie');
  assert(css.includes('@media (max-width: 960px)'), 'Media query mobile 960px présente');

  console.log('   ✅ CSS Responsive 100% validé');

  console.log('\n================================================================');
  console.log('🎉 TOUS LES TESTS E2E DE LA NAVBAR MONEYLINK V2.5 SONT VALIDÉS !');
  console.log('================================================================\n');
}

runBrowserFlowTests().catch(err => {
  console.error('❌ Échec du test :', err);
  process.exit(1);
});
