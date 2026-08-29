/**
 * MoneyLink — Script Frontend Public (Landing Page)
 * Configuration API & Interactivité
 */

// Configuration API Backend MoneyLink
const API_BASE_URL = window.MONEYLINK_API_URL || 'https://moneylink-kd6v.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
  initApiStatusCheck();
  initEscrowCalculator();
  initFaqAccordion();
});

/**
 * 1. Vérification automatique de l'état de l'API Backend
 */
async function initApiStatusCheck() {
  const statusDot = document.getElementById('api-status-dot');
  const statusText = document.getElementById('api-status-text');
  const statusLink = document.getElementById('api-status-link');

  if (statusLink) {
    statusLink.href = `${API_BASE_URL}/api/health`;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      if (statusDot) {
        statusDot.style.background = '#10B981'; // Vert
        statusDot.title = 'API Opérationnelle (En ligne)';
      }
      if (statusText) {
        statusText.textContent = 'API Opérationnelle';
      }
      console.log('🟢 [MoneyLink] API connectée :', API_BASE_URL);
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    if (statusDot) {
      statusDot.style.background = '#F59E0B'; // Orange/Jaune pour veille Render
      statusDot.title = 'API en veille ou démarrage';
    }
    if (statusText) {
      statusText.textContent = 'API Backend Status';
    }
    console.warn('🟡 [MoneyLink] Statut API :', error.message);
  }
}

/**
 * 2. Simulateur interactif de Séquestre & Frais (1%)
 */
function initEscrowCalculator() {
  const amountInput = document.getElementById('calc-amount');
  const feeDisplay = document.getElementById('calc-fee');
  const netDisplay = document.getElementById('calc-net');

  if (!amountInput || !feeDisplay || !netDisplay) return;

  function updateCalculation() {
    const rawVal = amountInput.value.replace(/\s+/g, '');
    const amount = parseFloat(rawVal) || 0;

    // Frais de séquestre : 1%
    const fee = Math.round(amount * 0.01);
    const net = Math.max(0, amount - fee);

    feeDisplay.textContent = formatFCFA(fee);
    netDisplay.textContent = formatFCFA(net);
  }

  amountInput.addEventListener('input', updateCalculation);
  updateCalculation();
}

/**
 * 3. Accordéon interactif pour la FAQ
 */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('h3');
    if (question) {
      question.style.cursor = 'pointer';
      question.addEventListener('click', () => {
        item.classList.toggle('active');
      });
    }
  });
}

/**
 * Utilitaire de formatage monétaire FCFA
 */
function formatFCFA(amount) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}
