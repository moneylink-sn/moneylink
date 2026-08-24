/**
 * MoneyLink — Routes Commerçants (/api/merchants)
 */

import { Router } from 'express';
import { MerchantController } from '../controllers/merchantController.js';
import { authenticateJWT } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validate } from '../middleware/validate.js';
import { productSchema } from '../validators/schemas.js';

const router = Router();

router.get('/', MerchantController.listMerchants);
router.get('/:id', MerchantController.getMerchantDetails);

// Espace pro commerçant
router.get('/me/stats', authenticateJWT, requireRole('MERCHANT'), MerchantController.getMerchantStats);
router.post('/products', authenticateJWT, requireRole('MERCHANT'), validate(productSchema), MerchantController.createProduct);

export default router;
