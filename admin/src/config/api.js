/**
 * MoneyLink Admin — Configuration de l'API Backend
 * Utilise VITE_API_URL en production ou fallback sur http://localhost:5000/api en local
 */

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default API_BASE;
