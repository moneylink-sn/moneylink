/**
 * MoneyLink V2 — Routes MoneyLink Business (/api/business)
 */

import { Router } from 'express';
import { BusinessController } from '../controllers/businessController.js';
import { authenticateJWT } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const router = Router();

// L'espace Business nécessite une authentification marchand ou admin
router.use(authenticateJWT, requireRole('MERCHANT', 'ADMIN'));

router.get('/dashboard', BusinessController.getDashboard);
router.get('/profile', BusinessController.getProfile);
router.put('/profile', BusinessController.updateProfile);

export default router;
