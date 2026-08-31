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

// Dashboard & Statistiques Générales
router.get('/dashboard', AdminController.getDashboardStats);
router.get('/statistics', AnalyticsController.getAdminStatistics);

// Nouveaux Endpoints Spécialisés Analytics Super Admin
router.get('/analytics/overview', AnalyticsController.getOverview);
router.get('/analytics/visitors', AnalyticsController.getVisitors);
router.get('/analytics/evolution', AnalyticsController.getEvolution);
router.get('/analytics/devices', AnalyticsController.getDevices);
router.get('/analytics/sources', AnalyticsController.getSources);
router.get('/analytics/products', AnalyticsController.getProducts);
router.get('/analytics/conversion', AnalyticsController.getConversion);
router.get('/analytics/realtime', AnalyticsController.getRealtime);
router.get('/analytics/pages', AnalyticsController.getPages);
router.get('/analytics/geography', AnalyticsController.getGeography);

// Utilisateurs, Commerçants, Litiges, Abonnements & Catalogue
router.get('/users', AdminController.listUsers);
router.put('/users/:id/status', validate(updateUserStatusSchema), AdminController.updateUserStatus);
router.get('/merchants', AdminController.listMerchantsDetailed);
router.get('/disputes', AdminController.listDisputes);
router.post('/disputes/:id/resolve', validate(resolveDisputeSchema), AdminController.resolveDispute);
router.get('/subscriptions', SubscriptionController.listAdminSubscriptions);
router.get('/delivery-persons', AdminController.listDeliveryPersons);
router.get('/products', AdminController.listProducts);
router.put('/products/:id/status', AdminController.updateProductStatus);
router.delete('/products/:id', AdminController.deleteProduct);
router.post('/catalog/clean-duplicates', AdminController.cleanCatalogDuplicates);

export default router;
