/**
 * MoneyLink Admin — Configuration de l'API Backend
 * Détermine dynamiquement l'URL de l'API selon l'environnement d'exécution (Render, Localhost, Production .sn)
 */

function resolveApiBase() {
  const envUrl = import.meta.env.VITE_API_URL;

  // Si exécuté dans un navigateur
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';

    // Si une variable d'environnement explicite est fournie et n'est pas un localhost erroné sur domaine distant
    if (envUrl && !(envUrl.includes('localhost') && !isLocal)) {
      return envUrl.replace(/\/+$/, '');
    }

    // Déploiement Render (moneylink-1.onrender.com ou tout sous-domaine Render)
    if (hostname.includes('onrender.com')) {
      return 'https://moneylink-kd6v.onrender.com/api';
    }

    // Domaine officiel de production .sn
    if (hostname.endsWith('moneylink.sn')) {
      return 'https://api.moneylink.sn/api';
    }

    // Si on n'est pas sur localhost mais sur un autre domaine distant
    if (!isLocal) {
      return 'https://moneylink-kd6v.onrender.com/api';
    }
  }

  // Fallback avec variable d'environnement (si présente)
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  // Si mode production Vite mais sans window défini
  if (import.meta.env.PROD) {
    return 'https://moneylink-kd6v.onrender.com/api';
  }

  // Développement local par défaut
  return 'http://localhost:5000/api';
}

export const API_BASE = resolveApiBase();

/**
 * Résout les URLs d'images relatives (ex: /api/uploads/...) vers l'URL absolue du backend
 */
export function resolveImageUrl(url, fallback = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100') {
  if (!url || typeof url !== 'string' || !url.trim()) return fallback;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }
  const base = API_BASE.replace(/\/api$/, '');
  if (trimmed.startsWith('/')) {
    return `${base}${trimmed}`;
  }
  return `${base}/${trimmed}`;
}

export default API_BASE;

