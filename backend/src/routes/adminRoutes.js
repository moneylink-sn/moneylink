/**
 * MoneyLink — Routes Administrateur (/api/admin)
 * STRICTEMENT PRIVÉ : Réservé au Super Administrateur (Codé Samb)
 */

import { Router } from 'express';
import { AdminController } from '../controllers/adminController.js';
import { SubscriptionController } from '../controllers/subscriptionController.js';
import { AnalyticsController } from '../controllers/analyticsController.js';
import { authenticateJWT } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/roles.js';
import { validate } from '../middleware/validate.js';
import { updateUserStatusSchema, resolveDisputeSchema } from '../validators/schemas.js';

const router = Router();

// Toutes les routes admin nécessitent une authentification et une identité stricte Super Admin
router.use(authenticateJWT, requireSuperAdmin);

router.get('/dashboard', AdminController.getDashboardStats);
router.get('/statistics', AnalyticsController.getAdminStatistics);
router.get('/users', AdminController.listUsers);
router.put('/users/:id/status', validate(updateUserStatusSchema), AdminController.updateUserStatus);
router.get('/disputes', AdminController.listDisputes);
router.post('/disputes/:id/resolve', validate(resolveDisputeSchema), AdminController.resolveDispute);
router.get('/subscriptions', SubscriptionController.listAdminSubscriptions);
router.get('/delivery-persons', AdminController.listDeliveryPersons);

export default router;
