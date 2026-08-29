/**
 * MoneyLink — Index Routeur Principal (/api)
 */

import { Router } from 'express';
import { checkDbHealth } from '../config/db.js';
import authRoutes from './authRoutes.js';
import merchantRoutes from './merchantRoutes.js';
import orderRoutes from './orderRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import savingsRoutes from './savingsRoutes.js';
import adminRoutes from './adminRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import webhookRoutes from './webhookRoutes.js';
import subscriptionRoutes from './subscriptionRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';

const router = Router();

// Health check endpoint
router.get('/health', async (req, res) => {
  const dbHealth = await checkDbHealth();
  const isHealthy = process.env.NODE_ENV === 'production' ? dbHealth.connected : true;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'UP' : 'DEGRADED',
    service: 'MoneyLink Fintech Core API',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    market: 'Sénégal (UEMOA)',
    currency: 'XOF / FCFA',
    database: dbHealth
  });
});

// Enregistrement des sous-routeurs
router.use('/auth', authRoutes);
router.use('/merchants', merchantRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/savings', savingsRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/subscription', subscriptionRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
