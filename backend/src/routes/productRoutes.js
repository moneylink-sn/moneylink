/**
 * MoneyLink — Routes Publiques Produits & Catalogue (/api/products)
 */

import { Router } from 'express';
import { MerchantController } from '../controllers/merchantController.js';

const router = Router();

// Routes publiques pour le catalogue e-commerce
router.get('/', MerchantController.listAllProducts);
router.get('/:id', MerchantController.getProductById);

export default router;
