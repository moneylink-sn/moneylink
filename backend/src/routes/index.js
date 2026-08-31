/**
 * MoneyLink — Index Routeur Principal (/api)
 */

import { Router } from 'express';
import { checkDbHealth } from '../config/db.js';
import authRoutes from './authRoutes.js';
import merchantRoutes from './merchantRoutes.js';
import productRoutes from './productRoutes.js';
import orderRoutes from './orderRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import savingsRoutes from './savingsRoutes.js';
import adminRoutes from './adminRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import webhookRoutes from './webhookRoutes.js';
import subscriptionRoutes from './subscriptionRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import aiRoutes from './aiRoutes.js';
import securityRoutes from './securityRoutes.js';
import businessRoutes from './businessRoutes.js';
import invoiceRoutes, { receiptRouter } from './invoiceRoutes.js';
import earlyAccessRoutes from './earlyAccessRoutes.js';
import contactRoutes from './contactRoutes.js';
import publicRoutes from './publicRoutes.js';

const router = Router();

// Health check endpoint
router.get('/health', async (req, res) => {
  const dbHealth = await checkDbHealth();
  const isHealthy = process.env.NODE_ENV === 'production' ? dbHealth.connected : true;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'UP' : 'DEGRADED',
    service: 'MoneyLink Fintech Core API',
    timestamp: new Date().toISOString(),
    version: '2.5.0',
    market: 'Sénégal (UEMOA)',
    currency: 'XOF / FCFA',
    database: dbHealth,
    features: {
      ai_assistant: true,
      shield_security: true,
      business_dashboard: true,
      invoicing_and_receipts: true,
      localization_wolof_french: true,
      early_access: true,
      public_metrics: true
    }
  });
});

// Enregistrement des sous-routeurs
router.use('/', uploadRoutes);
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/merchants', merchantRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/savings', savingsRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/subscription', subscriptionRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/ai', aiRoutes);
router.use('/security', securityRoutes);
router.use('/business', businessRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/receipts', receiptRouter);
router.use('/early-access', earlyAccessRoutes);
router.use('/contact', contactRoutes);
router.use('/public', publicRoutes);

export default router;
