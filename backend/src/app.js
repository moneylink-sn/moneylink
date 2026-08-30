/**
 * MoneyLink — Configuration Application Express
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Sécurité HTTP Headers (avec autorisation de chargement cross-origin des médias téléversés)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Cross-Origin Resource Sharing (CORS)
const isProduction = process.env.NODE_ENV === 'production';
const defaultAllowedOrigins = [
  'https://moneylink-1.onrender.com',
  'https://moneylink-kd6v.onrender.com',
  'https://moneylink.sn',
  'https://www.moneylink.sn',
  'https://admin.moneylink.sn',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5000'
];

const envAllowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()).filter(Boolean)
  : [];

const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...envAllowedOrigins])];

const isOriginAllowed = (origin) => {
  // Autoriser les requêtes sans origine (applications mobiles natives, curl, health check, Postman)
  if (!origin) {
    return true;
  }

  // Origines explicites ou wildcard autorisé en dev / explicitement en prod
  if ((!isProduction && allowedOrigins.includes('*')) || (isProduction && process.env.CORS_ORIGIN === '*')) {
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Autoriser tous les sous-domaines Render de MoneyLink (*.onrender.com)
  if (/^https:\/\/[a-zA-Z0-9-]+\.onrender\.com$/.test(origin)) {
    return true;
  }

  // Autoriser tous les sous-domaines moneylink.sn
  if (/^https:\/\/([a-zA-Z0-9-]+\.)?moneylink\.sn$/.test(origin)) {
    return true;
  }

  return false;
};

app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'wave-signature', 'x-om-signature', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Rate Limiting Général : 300 requêtes par 15 minutes par IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    success: false,
    error: 'Trop de requêtes effectuées depuis cette adresse IP, veuillez réessayer plus tard.'
  }
});
app.use('/api', limiter);

// Rate Limiting Spécifique Authentification : 60 tentatives par 15 minutes par IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: {
    success: false,
    error: 'Trop de tentatives de connexion ou inscription, veuillez patienter 15 minutes.'
  }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);


// Parsing JSON & URL-encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logs HTTP
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Point d'accueil
app.get('/', (req, res) => {
  res.json({
    message: 'Bienvenue sur l’API MoneyLink — Tiers de confiance et paiement sécurisé au Sénégal.',
    docs: '/api/health',
    version: '1.0.0'
  });
});

// Endpoint Santé Racine (pour load balancers et orchestrateurs type Cloud Run, Render, Kubernetes)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'MoneyLink Fintech Core API',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Enregistrement des routes API
app.use('/api', apiRouter);

// Route 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route introuvable : ${req.method} ${req.originalUrl}`
  });
});

// Gestionnaire d'erreurs centralisé
app.use(errorHandler);

export default app;
