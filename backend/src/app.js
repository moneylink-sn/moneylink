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

// Sécurité HTTP Headers
app.use(helmet());

// Cross-Origin Resource Sharing (CORS)
const isProduction = process.env.NODE_ENV === 'production';
const defaultProdOrigins = [
  'https://moneylink.sn',
  'https://www.moneylink.sn',
  'https://admin.moneylink.sn'
];

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()).filter(Boolean)
  : (isProduction ? defaultProdOrigins : ['*']);

app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origine (applications mobiles natives, curl, health check, Postman)
    if (!origin) {
      return callback(null, true);
    }

    // En production, interdire formellement le wildcard '*'
    if (isProduction) {
      const isAllowedProd = allowedOrigins.includes(origin) || defaultProdOrigins.includes(origin);
      if (isAllowedProd) {
        return callback(null, true);
      }
      return callback(new Error(`Origine [${origin}] non autorisée par la politique CORS de production MoneyLink.`));
    }

    // En développement ou test, autoriser wildcard ou origine listée
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origine non autorisée par la politique CORS MoneyLink.'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'wave-signature', 'x-om-signature', 'X-Requested-With'],
  credentials: true
}));

// Rate Limiting : 300 requêtes par 15 minutes par IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    success: false,
    error: 'Trop de requêtes effectuées depuis cette adresse IP, veuillez réessayer plus tard.'
  }
});
app.use('/api', limiter);

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
