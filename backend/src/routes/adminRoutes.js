/**
 * MoneyLink — Routes Administrateur (/api/admin)
 */

import { Router } from 'express';
import { AdminController } from '../controllers/adminController.js';
import { SubscriptionController } from '../controllers/subscriptionController.js';
import { AnalyticsController } from '../controllers/analyticsController.js';
import { authenticateJWT } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const router = Router();

// Toutes les routes admin nécessitent le rôle ADMIN
router.use(authenticateJWT, requireRole('ADMIN'));

router.get('/dashboard', AdminController.getDashboardStats);
router.get('/statistics', AnalyticsController.getAdminStatistics);
router.get('/users', AdminController.listUsers);
router.put('/users/:id/status', AdminController.updateUserStatus);
router.get('/disputes', AdminController.listDisputes);
router.post('/disputes/:id/resolve', AdminController.resolveDispute);
router.get('/subscriptions', SubscriptionController.listAdminSubscriptions);

export default router;
