/**
 * MoneyLink — Routes Abonnement (/api/subscription)
 */

import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscriptionController.js';
import { authenticateJWT } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const router = Router();

// Routes utilisateur connecté
router.get('/status', authenticateJWT, SubscriptionController.getStatus);
router.post('/pay', authenticateJWT, SubscriptionController.initiatePayment);

// Route administration
router.get('/admin/all', authenticateJWT, requireRole('ADMIN'), SubscriptionController.listAdminSubscriptions);

export default router;
