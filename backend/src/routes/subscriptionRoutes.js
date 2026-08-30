/**
 * MoneyLink — Routes Abonnement (/api/subscription)
 */

import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscriptionController.js';
import { authenticateJWT } from '../middleware/auth.js';
import { requireRole, requireSuperAdmin } from '../middleware/roles.js';

const router = Router();

// Routes utilisateur connecté
router.get('/status', authenticateJWT, SubscriptionController.getStatus);
router.post('/pay', authenticateJWT, SubscriptionController.initiatePayment);

// Route administration (Strictement réservée au Super Admin)
router.get('/admin/all', authenticateJWT, requireSuperAdmin, SubscriptionController.listAdminSubscriptions);

export default router;
