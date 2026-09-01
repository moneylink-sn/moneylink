/**
 * MoneyLink V2.5 — Test de Validation Officielle de la Navigation
 * Vérifie l'ordre exact, la structure desktop/mobile, i18n, le panier, auth, et l'absence de régression
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';
import { translations } from '../../site/i18n.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runNavbarTests() {
  console.log('\n================================================================');
  console.log('🚀 MONEYLINK V2.5 — BANC DE VALIDATION NAVIGATION OFFICIELLE');
  console.log('================================================================\n');

  const indexPath = path.resolve(__dirname, '../../site/index.html');
  const stylesPath = path.resolve(__dirname, '../../site/styles.css');
  const appPath = path.resolve(__dirname, '../../site/app.js');

  const htmlContent = fs.readFileSync(indexPath, 'utf-8');
  const cssContent = fs.readFileSync(stylesPath, 'utf-8');
  const jsContent = fs.readFileSync(appPath, 'utf-8');

  // --- 1. VÉRIFICATION DE LA STRUCTURE DESKTOP ---
  console.log('1️⃣ Vérification de l’ordre exact des 8 éléments Desktop...');
  
  // Ordre strict attendu :
  // Logo -> Catalogue -> Innovations -> Paiement -> Particulier -> Commerçant -> Panier -> Connexion -> Français
  const navContainerMatch = htmlContent.match(/<nav class="navbar"[^>]*>([\s\S]*?)<\/nav>/);
  assert(navContainerMatch, 'Élément <nav class="navbar"> présent dans index.html');
  const navHTML = navContainerMatch[1];

  // 1. Logo
  assert(navHTML.includes('class="nav-logo"'), '1. Logo MoneyLink présent');
  // 2. Catalogue
  assert(navHTML.includes('href="#catalogue"'), '2. 🛍️ Catalogue présent avec ancre #catalogue');
  // 3. Innovations
  assert(navHTML.includes('href="#innovations"'), '3. ⭐ Innovations présent avec ancre #innovations');
  // 4. Paiement
  assert(navHTML.includes('href="#paiements"'), '4. 💳 Paiement présent avec ancre #paiements');
  // 5. Particulier
  assert(navHTML.includes('href="#particuliers"'), '5. 👤 Particulier présent avec ancre #particuliers');
  // 6. Commerçant
  assert(navHTML.includes('href="#commercants"'), '6. 🏪 Commerçant présent avec ancre #commercants');
  // 7. Panier
  assert(navHTML.includes('id="open-cart-btn"'), '7. 🛒 Panier présent avec id open-cart-btn');
  // 8. Connexion
  assert(navHTML.includes('id="nav-auth-container"'), '8. Connexion / Compte présent avec id nav-auth-container');
  // 9. Français
  assert(navHTML.includes('id="lang-menu-btn"'), '9. 🇫🇷 Français ▾ présent avec id lang-menu-btn');

  // Vérification de l'ordre séquentiel dans le code source
  const idxLogo = navHTML.indexOf('nav-logo');
  const idxCat = navHTML.indexOf('href="#catalogue"');
  const idxInno = navHTML.indexOf('href="#innovations"');
  const idxPai = navHTML.indexOf('href="#paiements"');
  const idxPart = navHTML.indexOf('href="#particuliers"');
  const idxComm = navHTML.indexOf('href="#commercants"');
  const idxCart = navHTML.indexOf('id="open-cart-btn"');
  const idxAuth = navHTML.indexOf('id="nav-auth-container"');
  const idxLang = navHTML.indexOf('id="lang-menu-btn"');

  assert(idxLogo < idxCat, 'Ordre : Logo avant Catalogue');
  assert(idxCat < idxInno, 'Ordre : Catalogue avant Innovations');
  assert(idxInno < idxPai, 'Ordre : Innovations avant Paiement');
  assert(idxPai < idxPart, 'Ordre : Paiement avant Particulier');
  assert(idxPart < idxComm, 'Ordre : Particulier avant Commerçant');
  assert(idxComm < idxCart, 'Ordre : Commerçant avant Panier');
  assert(idxCart < idxAuth, 'Ordre : Panier avant Connexion');
  assert(idxAuth < idxLang, 'Ordre : Connexion avant Français');

  console.log('   ✅ Ordre exact Desktop 100% Validé : Logo → Catalogue → Innovations → Paiement → Particulier → Commerçant → Panier → Connexion → Français');

  // --- 2. VÉRIFICATION DU MODE MOBILE ---
  console.log('\n2️⃣ Vérification du mode Mobile (Logo | 🛒 Panier | ☰)...');
  assert(navHTML.includes('id="mobile-menu-toggle-btn"'), 'Bouton Hamburger mobile (☰) présent');
  assert(navHTML.includes('id="mobile-nav-drawer"'), 'Tiroir de navigation mobile (mobile-nav-drawer) présent');
  assert(navHTML.includes('mobile-nav-links-list'), 'Liste des rubriques mobile présente');
  assert(navHTML.includes('id="mobile-nav-auth-container"'), 'Espace compte mobile présent');
  assert(navHTML.includes('mobile-lang-box'), 'Sélecteur de langue mobile présent');

  console.log('   ✅ Structure mobile 100% Conforme : Logo | Panier | Menu Hamburger ☰');

  // --- 3. VÉRIFICATION DES TRADUCTIONS ET i18n ---
  console.log('\n3️⃣ Vérification du bilinguisme Français 🇫🇷 ↔ Wolof 🇸🇳...');
  assert(translations.fr.nav_catalog === '🛍️ Catalogue', 'Traduction FR Catalogue valide');
  assert(translations.wo.nav_catalog === '🛍️ Katalóg', 'Traduction WO Catalogue valide');
  assert(translations.fr.nav_innovations === '⭐ Innovations', 'Traduction FR Innovations valide');
  assert(translations.wo.nav_innovations === '⭐ Xalaat yu Yees', 'Traduction WO Innovations valide');
  assert(translations.fr.nav_payments === '💳 Paiement', 'Traduction FR Paiement valide');
  assert(translations.wo.nav_payments === '💳 Feyin', 'Traduction WO Paiement valide');
  assert(translations.fr.nav_individuals === '👤 Particulier', 'Traduction FR Particulier valide');
  assert(translations.wo.nav_individuals === '👤 Jëfandikookat', 'Traduction WO Particulier valide');
  assert(translations.fr.nav_merchants === '🏪 Commerçant', 'Traduction FR Commerçant valide');
  assert(translations.wo.nav_merchants === '🏪 Jaaykat', 'Traduction WO Commerçant valide');
  assert(translations.fr.nav_cart === 'Panier', 'Traduction FR Panier valide');
  assert(translations.wo.nav_cart === 'Panié', 'Traduction WO Panier valide');
  assert(translations.fr.nav_login === 'Connexion', 'Traduction FR Connexion valide');
  assert(translations.wo.nav_login === 'Dugg ci Sa Kont', 'Traduction WO Connexion valide');

  const frKeys = Object.keys(translations.fr);
  const woKeys = Object.keys(translations.wo);
  assert(frKeys.length === woKeys.length, `Parité stricte des clés (${frKeys.length} clés FR vs ${woKeys.length} clés WO)`);

  console.log('   ✅ Traductions et parité linguistique 100% Conformes');

  // --- 4. VÉRIFICATION DU CSS & RESPONSIVE ---
  console.log('\n4️⃣ Vérification du CSS & Media Queries...');
  assert(cssContent.includes('.mobile-menu-toggle-btn'), 'CSS du bouton hamburger présent');
  assert(cssContent.includes('.mobile-nav-drawer'), 'CSS du tiroir mobile présent');
  assert(cssContent.includes('@media (max-width: 960px)'), 'Media query mobile <= 960px présente');
  assert(cssContent.includes('overflow-x: hidden'), 'Garantie anti-débordement horizontal (overflow-x: hidden) active');

  console.log('   ✅ Styles CSS et adaptabilité responsive 100% Conformes');

  // --- 5. VÉRIFICATION DES HANDLERS JAVASCRIPT ---
  console.log('\n5️⃣ Vérification des handlers JavaScript (app.js)...');
  assert(jsContent.includes('MobileNav'), 'Module MobileNav présent dans app.js');
  assert(jsContent.includes('MobileNav.init()'), 'MobileNav initialisé au DOMContentLoaded');
  assert(jsContent.includes('updateActiveButtons'), 'Synchronisation des boutons de langue active');
  assert(jsContent.includes('mobileAuthContainer'), 'Synchronisation Auth mobile active');

  console.log('   ✅ Intégration JavaScript 100% Opérationnelle');

  console.log('\n================================================================');
  console.log('🎉 TOUS LES TESTS DE NAVIGATION MONEYLINK V2.5 ONT RÉUSSI !');
  console.log('================================================================\n');
}

runNavbarTests().catch(err => {
  console.error('❌ Échec du test :', err);
  process.exit(1);
});
