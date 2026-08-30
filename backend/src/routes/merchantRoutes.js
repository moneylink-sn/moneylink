/**
 * MoneyLink — Routes Commerçants & Produits (/api/merchants)
 */

import { Router } from 'express';
import { MerchantController } from '../controllers/merchantController.js';
import { authenticateJWT } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validate } from '../middleware/validate.js';
import {
  merchantProfileSchema,
  productSchema,
  updateProductSchema,
  updateProductStatusSchema,
  updateStockSchema
} from '../validators/schemas.js';

const router = Router();

// 1. Profil Commerçant & Statistiques
router.get('/profile', authenticateJWT, requireRole('MERCHANT'), MerchantController.getMerchantProfile);
router.put('/profile', authenticateJWT, requireRole('MERCHANT'), validate(merchantProfileSchema), MerchantController.updateMerchantProfile);
router.get('/me', authenticateJWT, requireRole('MERCHANT'), MerchantController.getMerchantProfile);
router.get('/me/stats', authenticateJWT, requireRole('MERCHANT'), MerchantController.getMerchantStats);
router.get('/stats', authenticateJWT, requireRole('MERCHANT'), MerchantController.getMerchantStats);

// 2. Gestion des Produits par le Commerçant Connecté
router.get('/me/products', authenticateJWT, requireRole('MERCHANT'), MerchantController.getMerchantMyProducts);
router.post('/products', authenticateJWT, requireRole('MERCHANT'), validate(productSchema), MerchantController.createProduct);
router.put('/products/:id', authenticateJWT, requireRole('MERCHANT'), validate(updateProductSchema), MerchantController.updateProduct);
router.delete('/products/:id', authenticateJWT, requireRole('MERCHANT'), MerchantController.deleteProduct);
router.patch('/products/:id/stock', authenticateJWT, requireRole('MERCHANT'), validate(updateStockSchema), MerchantController.updateProductStock);
router.patch('/products/:id/status', authenticateJWT, requireRole('MERCHANT'), validate(updateProductStatusSchema), MerchantController.updateProductStatus);

// 3. Routes publiques
router.get('/products', MerchantController.listAllProducts);
router.get('/products/:id', MerchantController.getProductById);
router.get('/', MerchantController.listMerchants);
router.get('/:id', MerchantController.getMerchantDetails);

export default router;
