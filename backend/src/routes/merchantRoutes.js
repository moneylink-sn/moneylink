/**
 * MoneyLink — Routes Commerçants & Produits (/api/merchants)
 */

import { Router } from 'express';
import { MerchantController } from '../controllers/merchantController.js';
import { authenticateJWT } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validate } from '../middleware/validate.js';
import { productSchema, updateProductSchema, updateStockSchema } from '../validators/schemas.js';

const router = Router();

// Routes publiques
router.get('/products', MerchantController.listAllProducts);
router.get('/', MerchantController.listMerchants);
router.get('/:id', MerchantController.getMerchantDetails);

// Espace pro commerçant (authentifié + rôle MERCHANT)
router.get('/me/stats', authenticateJWT, requireRole('MERCHANT'), MerchantController.getMerchantStats);
router.get('/me/products', authenticateJWT, requireRole('MERCHANT'), MerchantController.getMerchantMyProducts);
router.post('/products', authenticateJWT, requireRole('MERCHANT'), validate(productSchema), MerchantController.createProduct);
router.put('/products/:id', authenticateJWT, requireRole('MERCHANT'), validate(updateProductSchema), MerchantController.updateProduct);
router.delete('/products/:id', authenticateJWT, requireRole('MERCHANT'), MerchantController.deleteProduct);
router.patch('/products/:id/stock', authenticateJWT, requireRole('MERCHANT'), validate(updateStockSchema), MerchantController.updateProductStock);

export default router;
